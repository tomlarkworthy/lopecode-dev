// One-off: insert the `linkTo` import from @tomlarkworthy/lopepage-urls into the
// Observable @tomlarkworthy/exporter-3 notebook (the two pushed cells depend on it,
// and --cells drops imports). Idempotent: bails if the import already exists.
import fs from 'fs';
import WebSocket from 'ws';

const { T, I } = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
const COOKIE = `I=${I}; T=${T}`;
const ORIGIN = 'https://observablehq.com';
const IMPORT = 'import {linkTo} from "@tomlarkworthy/lopepage-urls"';

const doc = await (await fetch('https://api.observablehq.com/document/@tomlarkworthy/exporter-3', {
  headers: { Origin: ORIGIN, Cookie: COOKIE },
})).json();

if (doc.nodes.some(n => /lopepage-urls/.test(n.value || ''))) {
  console.log('lopepage-urls import already present — nothing to do');
  process.exit(0);
}
const firstImport = doc.nodes.find(n => /^\s*import\b/.test(n.value || ''));
const nextNodeId = firstImport ? firstImport.id : null;
const notebookId = doc.id;
const docVersion = doc.version;
console.log(`notebook ${notebookId} v${docVersion}, inserting import before node ${nextNodeId}`);

const ws = new WebSocket(`wss://ws.observablehq.com/document/${notebookId}/edit`, {
  headers: { Origin: ORIGIN, Cookie: COOKIE },
});

const done = new Promise((resolve, reject) => {
  const to = setTimeout(() => reject(new Error('timeout')), 30000);
  let version, subversion, sent = false;
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: docVersion, next: true })));
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'load') {
      version = msg.version; subversion = msg.subversion;
      for (const evt of msg.events || []) if (evt.version) version = evt.version;
      const V = version;
      ws.send(JSON.stringify({
        type: 'save',
        events: [{
          version: V + 1,
          type: 'insert_node',
          node_id: V + 1,
          new_next_node_id: nextNodeId,
          new_node_value: IMPORT,
          new_node_pinned: false,
          new_node_mode: 'js',
          new_node_data: null,
          new_node_name: null,
        }],
        edits: [],
        version: V,
        subversion,
      }));
      sent = true;
    } else if (msg.type === 'saveconfirm' && sent) {
      clearTimeout(to); resolve(msg);
    } else if (msg.type === 'error') {
      clearTimeout(to); reject(new Error(`${msg.message} (status ${msg.status})`));
    }
  });
  ws.on('error', e => { clearTimeout(to); reject(e); });
});

const res = await done;
console.log('saveconfirm', JSON.stringify(res));
ws.close();
process.exit(0);
