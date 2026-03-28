#!/usr/bin/env node
/**
 * Live test of the WS push mechanism using the dev-browser profile.
 * Inserts a test cell into blank-notebook, verifies, then removes it.
 */
import { chromium } from 'playwright';
import WebSocket from 'ws';
import path from 'path';

const profile = path.join(
  process.env.HOME,
  '.claude/plugins/cache/dev-browser-marketplace/dev-browser/66682fb0513a/skills/dev-browser/.browser-data'
);

// Extract cookies (with page visit to refresh)
console.log('Extracting cookies...');
const browser = await chromium.launchPersistentContext(profile, { headless: true });
const page = await browser.newPage();
await page.goto('https://observablehq.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);
await page.close();

const cookies = await browser.cookies();
const T = cookies.find(c => c.name === 'T' && c.domain.includes('observablehq'))?.value;
const I = cookies.find(c => c.name === 'I' && c.domain.includes('observablehq'))?.value;
await browser.close();

if (!T || !I) { console.error('No cookies'); process.exit(1); }

// Verify auth
const userResp = await fetch('https://api.observablehq.com/user', {
  headers: { Cookie: `I=${I}; T=${T}`, Origin: 'https://observablehq.com' }
});
const user = await userResp.json();
console.log(`Authenticated as: ${user?.login || 'FAILED'}`);
if (!user?.login) process.exit(1);

// Fetch notebook
const docResp = await fetch('https://api.observablehq.com/document/@tomlarkworthy/blank-notebook', {
  headers: { Cookie: `I=${I}; T=${T}`, Origin: 'https://observablehq.com' }
});
const doc = await docResp.json();
const docVersion = doc.version || doc.latest_version;
console.log(`Notebook: ${doc.id}, version: ${docVersion}, cells: ${doc.nodes.length}`);
console.log(`Roles: ${doc.roles}`);

// Connect WS
console.log('Connecting WebSocket...');
const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `I=${I}; T=${T}` }
});

function waitForConfirm(expectedVersion) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'saveconfirm') {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(msg);
      }
      if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        reject(new Error(`WS error: ${JSON.stringify(msg)}`));
      }
    };
    ws.on('message', handler);
  });
}

function waitForLoad() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'load') {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve(msg);
      }
      if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        reject(new Error(`WS error: ${JSON.stringify(msg)}`));
      }
    };
    ws.on('message', handler);
  });
}

await new Promise((resolve, reject) => {
  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'hello', token: T, version: docVersion, next: true }));
    resolve();
  });
  ws.on('error', reject);
});

const loadMsg = await waitForLoad();
let v = loadMsg.version;
let sv = loadMsg.subversion;
console.log(`Connected at version ${v}`);

// Step 1: Insert a test cell
console.log('\n--- Step 1: Insert test cell ---');
ws.send(JSON.stringify({
  type: 'save',
  events: [{
    version: v + 1,
    type: 'insert_node',
    node_id: v + 1,
    new_next_node_id: null,
    new_node_value: 'wsApiTestCell = "Hello from WS push tool!"',
    new_node_pinned: true,
    new_node_mode: 'js',
    new_node_data: null,
    new_node_name: null,
  }],
  edits: [],
  version: v,
  subversion: sv,
}));

let confirm = await waitForConfirm(v + 1);
const insertedNodeId = v + 1;
v = confirm.version;
sv = confirm.subversion;
console.log(`Insert confirmed! Node ${insertedNodeId}, version ${v}`);

// Verify via API
const verifyResp = await fetch(`https://api.observablehq.com/document/${doc.id}`, {
  headers: { Cookie: `I=${I}; T=${T}`, Origin: 'https://observablehq.com' }
});
const verifyDoc = await verifyResp.json();
console.log(`Verified: ${verifyDoc.nodes.length} cells, version ${verifyDoc.version || verifyDoc.latest_version}`);
const testCell = verifyDoc.nodes.find(n => n.value?.includes('wsApiTestCell'));
console.log(`Test cell found: ${!!testCell}`);

// Step 2: Modify the test cell
console.log('\n--- Step 2: Modify test cell ---');
ws.send(JSON.stringify({
  type: 'save',
  events: [{
    version: v + 1,
    type: 'modify_node',
    node_id: insertedNodeId,
    new_node_value: 'wsApiTestCell = "Modified via WS!"',
  }],
  edits: [],
  version: v,
  subversion: sv,
}));

confirm = await waitForConfirm(v + 1);
v = confirm.version;
sv = confirm.subversion;
console.log(`Modify confirmed! Version ${v}`);

// Step 3: Delete the test cell
console.log('\n--- Step 3: Delete test cell ---');
ws.send(JSON.stringify({
  type: 'save',
  events: [{
    version: v + 1,
    type: 'remove_node',
    node_id: insertedNodeId,
  }],
  edits: [],
  version: v,
  subversion: sv,
}));

confirm = await waitForConfirm(v + 1);
v = confirm.version;
sv = confirm.subversion;
console.log(`Delete confirmed! Version ${v}`);

// Final verification
const finalResp = await fetch(`https://api.observablehq.com/document/${doc.id}`, {
  headers: { Cookie: `I=${I}; T=${T}`, Origin: 'https://observablehq.com' }
});
const finalDoc = await finalResp.json();
console.log(`\nFinal state: ${finalDoc.nodes.length} cells, version ${finalDoc.version || finalDoc.latest_version}`);

ws.close();
console.log('\n✓ All operations successful! WS push tool works.');
process.exit(0);
