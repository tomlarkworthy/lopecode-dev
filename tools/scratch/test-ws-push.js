#!/usr/bin/env node
/**
 * Quick test of the WS push mechanism.
 * Modifies the blank notebook's only cell and restores it.
 */
import { chromium } from 'playwright';
import WebSocket from 'ws';
import path from 'path';

const profile = path.join(process.env.HOME, '.claude/lope-push-browser-profile');

// Extract cookies from browser profile — visit page first to refresh session
const browser = await chromium.launchPersistentContext(profile, { headless: true });
const page = await browser.newPage();
await page.goto('https://observablehq.com/@tomlarkworthy/blank-notebook', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
const cookies = await browser.cookies();
const T = cookies.find(c => c.name === 'T' && c.domain.includes('observablehq'))?.value;
const I = cookies.find(c => c.name === 'I' && c.domain.includes('observablehq'))?.value;
await browser.close();

if (!T || !I) {
  console.error('No auth cookies found. Login first.');
  process.exit(1);
}
console.log('Got cookies from push profile');

// Fetch current notebook state via REST API
const resp = await fetch('https://api.observablehq.com/document/@tomlarkworthy/blank-notebook', {
  headers: { Cookie: `T=${T}; I=${I}` }
});
const doc = await resp.json();
const notebookId = doc.id;
const originalValue = doc.nodes[0].value;
console.log(`Notebook: ${notebookId}, version: ${doc.version || doc.latest_version}, cells: ${doc.nodes.length}`);
console.log(`Original cell value (first 80 chars): ${originalValue.slice(0, 80)}...`);

// Connect to WebSocket
const ws = new WebSocket(`wss://ws.observablehq.com/document/${notebookId}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `T=${T}; I=${I}` }
});

let step = 0;
ws.on('open', () => {
  console.log('WS connected. Sending hello with token:', T.slice(0, 10) + '...');
  const hello = { type: 'hello', token: T, version: 0, next: true };
  console.log('Hello msg:', JSON.stringify(hello));
  ws.send(JSON.stringify(hello));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('<<', JSON.stringify(msg).slice(0, 200));

  if (msg.type === 'load' && step === 0) {
    step = 1;
    const v = msg.version;
    console.log(`Connected at version ${v}`);

    // Test: add a comment, then revert
    const testValue = originalValue + '\n// WS push test ' + new Date().toISOString();
    console.log('Sending modify_node...');
    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version: v + 1, type: 'modify_node', node_id: doc.nodes[0].id, new_node_value: testValue }],
      edits: [],
      version: v,
      subversion: 0
    }));
  }

  if (msg.type === 'saveconfirm' && step === 1) {
    step = 2;
    console.log(`Modify confirmed at version ${msg.version}. Reverting...`);
    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version: msg.version + 1, type: 'modify_node', node_id: doc.nodes[0].id, new_node_value: originalValue }],
      edits: [],
      version: msg.version,
      subversion: msg.subversion
    }));
  }

  if (msg.type === 'saveconfirm' && step === 2) {
    console.log(`Reverted at version ${msg.version}. SUCCESS!`);
    ws.close();
    process.exit(0);
  }

  if (msg.type === 'error') {
    console.error('ERROR:', msg);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('WS error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout!');
  ws.close();
  process.exit(1);
}, 15000);
