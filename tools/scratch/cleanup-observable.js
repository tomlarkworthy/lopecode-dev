// Delete duplicate cells from Observable notebook
// Keeps only the most recently inserted batch of cells

import { chromium } from 'playwright';
import WebSocket from 'ws';
import fs from 'fs';

const PROFILE = process.env.HOME + '/.claude/lope-push-browser-profile';
const TARGET = 'https://observablehq.com/@tomlarkworthy/observablejs-toolchain';
const TIMEOUT = 10000; // per-operation timeout

async function extractCookies() {
  const browser = await chromium.launchPersistentContext(PROFILE, { headless: true });
  const page = await browser.newPage();
  await page.goto('https://observablehq.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.close();
  const cookies = await browser.cookies();
  await browser.close();
  const T = cookies.find(c => c.name === 'T' && c.domain.includes('observablehq'));
  const I = cookies.find(c => c.name === 'I' && c.domain.includes('observablehq'));
  if (!T || !I) throw new Error('No auth cookies');
  return { T: T.value, I: I.value };
}

async function main() {
  const cookies = await extractCookies();
  console.log('Authenticated');

  // Fetch notebook
  const slug = '@tomlarkworthy/observablejs-toolchain';
  const resp = await fetch(`https://api.observablehq.com/document/${slug}`, {
    headers: { 'Cookie': `I=${cookies.I}; T=${cookies.T}`, 'Origin': 'https://observablehq.com' }
  });
  const doc = await resp.json();
  console.log(`Notebook ${doc.id}: ${doc.nodes.length} cells, version ${doc.version}`);

  // Find duplicates: group by value, keep last occurrence
  const byValue = new Map();
  for (const node of doc.nodes) {
    const key = node.value?.trim();
    if (!byValue.has(key)) byValue.set(key, []);
    byValue.get(key).push(node.id);
  }

  const toDelete = [];
  for (const [value, ids] of byValue) {
    if (ids.length > 1) {
      // Keep the last one (most recently inserted), delete the rest
      const dups = ids.slice(0, -1);
      toDelete.push(...dups);
      console.log(`Duplicate (${ids.length}x): "${value?.substring(0, 60)}..." — deleting ${dups.length}`);
    }
  }

  console.log(`\nTotal cells to delete: ${toDelete.length}`);
  if (toDelete.length === 0) {
    console.log('Nothing to clean up!');
    return;
  }

  // Connect WS and delete in batches
  const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
    headers: { 'Origin': 'https://observablehq.com', 'Cookie': `T=${cookies.T}; I=${cookies.I}` }
  });

  let version = doc.version;
  let subversion = 0;

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version, next: true }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'load') {
        version = msg.version;
        subversion = msg.subversion;
        resolve();
      } else if (msg.type === 'error') reject(new Error(msg.message));
    });
    setTimeout(() => reject(new Error('WS connect timeout')), 15000);
  });

  console.log(`Connected at version ${version}`);

  // Delete one at a time with delay
  for (let i = 0; i < toDelete.length; i++) {
    const nodeId = toDelete[i];
    const nextVersion = version + 1;

    const confirmed = new Promise((resolve, reject) => {
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'saveconfirm') {
          ws.off('message', handler);
          resolve(msg);
        } else if (msg.type === 'error') {
          ws.off('message', handler);
          reject(new Error(msg.message));
        }
      };
      ws.on('message', handler);
      setTimeout(() => { ws.off('message', handler); reject(new Error(`Timeout deleting node ${nodeId}`)); }, TIMEOUT);
    });

    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version: nextVersion, type: 'remove_node', node_id: nodeId }],
      edits: [],
      version,
      subversion
    }));

    const conf = await confirmed;
    version = conf.version;
    subversion = conf.subversion;

    if ((i + 1) % 10 === 0) console.log(`  Deleted ${i + 1}/${toDelete.length}...`);
  }

  console.log(`Done! Deleted ${toDelete.length} duplicate cells. Final version: ${version}`);
  ws.close();
}

main().catch(e => { console.error(e); process.exit(1); });
