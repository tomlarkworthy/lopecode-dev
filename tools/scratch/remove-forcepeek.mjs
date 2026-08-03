import WebSocket from 'ws';
import fs from 'fs';

const { T, I } = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
const NOTEBOOK_ID = '8ce43ed1b06178ba';
const REMOVE_NODE_ID = 34; // forcePeek

const res = await fetch(`https://api.observablehq.com/document/@tomlarkworthy/modules`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `I=${I}; T=${T}` }
});
const doc = await res.json();
const version = doc.version;
const exists = (doc.nodes || []).some(n => n.id === REMOVE_NODE_ID);
console.log(`doc version ${version}; node ${REMOVE_NODE_ID} present: ${exists}`);
if (!exists) { console.log('Nothing to remove.'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${NOTEBOOK_ID}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `I=${I}; T=${T}` }
});

const done = (code, msg) => { console.log(msg); ws.close(); process.exit(code); };
const timer = setTimeout(() => done(1, 'Timeout'), 20000);

ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version, next: true })));
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'load') {
    const V = msg.version, S = msg.subversion;
    console.log(`loaded v${V} s${S}; sending remove_node ${REMOVE_NODE_ID}`);
    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version: V + 1, type: 'remove_node', node_id: REMOVE_NODE_ID }],
      edits: [], version: V, subversion: S
    }));
  } else if (msg.type === 'saveconfirm') {
    clearTimeout(timer);
    done(0, `Removed. Final version: ${msg.version}`);
  } else if (msg.type === 'error') {
    clearTimeout(timer);
    done(1, `Error ${msg.status}: ${msg.message}`);
  }
});
ws.on('error', (e) => done(1, 'WS error: ' + e.message));
