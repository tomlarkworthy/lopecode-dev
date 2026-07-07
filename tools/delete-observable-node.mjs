// One-off: remove a node from an Observable notebook via the WS editing protocol.
// Usage: node tools/delete-observable-node.mjs <notebookId> <nodeId>
import WebSocket from 'ws';
import fs from 'node:fs';

const [notebookId, nodeIdArg] = process.argv.slice(2);
const nodeId = Number(nodeIdArg);
const c = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const doc = await (await fetch(`https://api.observablehq.com/document/${notebookId}`, {
  headers: { Cookie: `I=${c.I}; T=${c.T}`, Origin: 'https://observablehq.com', 'User-Agent': UA },
})).json();
console.log(`doc version ${doc.version}; nodes ${doc.nodes.map(n => n.id).join(',')}`);
if (!doc.nodes.some(n => n.id === nodeId)) { console.log(`node ${nodeId} not present — nothing to do`); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${notebookId}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `T=${c.T}; I=${c.I}` },
});
const done = new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), 30000);
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: c.T, version: doc.version, next: true })));
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'load') {
      let version = msg.version;
      for (const e of msg.events || []) if (e.version) version = e.version;
      ws.send(JSON.stringify({
        type: 'save',
        events: [{ version: version + 1, type: 'remove_node', node_id: nodeId }],
        edits: [], version, subversion: msg.subversion,
      }));
    } else if (msg.type === 'saveconfirm') {
      clearTimeout(t); resolve(msg.version);
    } else if (msg.type === 'error') {
      clearTimeout(t); reject(new Error(`${msg.message} (status ${msg.status})`));
    }
  });
  ws.on('error', reject);
});
const v = await done;
ws.close();
console.log(`removed node ${nodeId}; new version ${v}`);
