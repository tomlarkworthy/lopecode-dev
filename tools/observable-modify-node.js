#!/usr/bin/env node
// One-off: modify a single node's value on an Observable notebook via WS.
// Usage: node tools/observable-modify-node.js --slug @user/notebook --node 169 --value "new source" --cookies-file path

import { WebSocket } from 'ws';
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--slug') opt.slug = args[++i];
  else if (a === '--node') opt.nodeId = parseInt(args[++i], 10);
  else if (a === '--value') opt.value = args[++i];
  else if (a === '--value-file') opt.value = fs.readFileSync(args[++i], 'utf8');
  else if (a === '--cookies-file') opt.cookiesFile = args[++i];
}
if (!opt.slug || !opt.nodeId || opt.value == null || !opt.cookiesFile) {
  console.error('usage: --slug --node --value|--value-file --cookies-file');
  process.exit(1);
}

const cookies = JSON.parse(fs.readFileSync(opt.cookiesFile, 'utf8'));
if (!cookies.T || !cookies.I) throw new Error('cookies file missing T or I');

const headers = {
  Origin: 'https://observablehq.com',
  Cookie: `T=${cookies.T}; I=${cookies.I}`,
};

const docResp = await fetch(`https://api.observablehq.com/document/${opt.slug}`, { headers });
if (!docResp.ok) throw new Error(`fetch doc: ${docResp.status}`);
const doc = await docResp.json();
console.log(`doc ${doc.id} version=${doc.version} nodes=${doc.nodes.length}`);
const target = doc.nodes.find(n => n.id === opt.nodeId);
if (!target) throw new Error(`node ${opt.nodeId} not found`);
console.log('current value:', JSON.stringify(target.value));
console.log('new     value:', JSON.stringify(opt.value));
if (target.value === opt.value) {
  console.log('unchanged — nothing to do');
  process.exit(0);
}

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, { headers });
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: doc.version, next: true }));
});
let version = doc.version, subversion = 0;
let stage = 'await-load';
const newVersion = doc.version + 1;

ws.on('message', data => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'error') {
    console.error('ws error', msg);
    process.exit(2);
  }
  if (msg.type === 'load' && stage === 'await-load') {
    version = msg.version;
    subversion = msg.subversion;
    stage = 'await-confirm';
    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version: newVersion, type: 'modify_node', node_id: opt.nodeId, new_node_value: opt.value }],
      edits: [],
      version,
      subversion,
    }));
  } else if (msg.type === 'saveconfirm' && msg.version === newVersion) {
    console.log(`saveconfirm v${msg.version} sub${msg.subversion} — done`);
    ws.close();
    process.exit(0);
  }
});
ws.on('error', e => { console.error('ws error', e); process.exit(3); });
setTimeout(() => { console.error('timeout'); process.exit(4); }, 30000);
