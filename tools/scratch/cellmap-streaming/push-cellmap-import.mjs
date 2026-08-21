// One-off: add cell-map's `import {currentModules} from "@tomlarkworthy/modules"` node on
// Observable. `--cells` drops imports, so this needs the raw WS protocol. Idempotent: exits
// if an equivalent import is already present. Event shape copied from lope-push-ws.js.
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const IMPORT = 'import {currentModules} from "@tomlarkworthy/modules"';
const AFTER_MATCH = /from\s+"@tomlarkworthy\/module-map"/; // place it next to the module-map import

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const headers = {
  Origin: 'https://observablehq.com',
  'User-Agent': 'Mozilla/5.0',
  Cookie: `I=${I}; T=${T}`
};

const doc = await (
  await fetch('https://api.observablehq.com/document/@tomlarkworthy/cell-map', { headers })
).json();
console.log(`remote version ${doc.version}, ${doc.nodes.length} nodes`);

if (doc.nodes.some((n) => /currentModules/.test(String(n.value)) && /^\s*import/.test(String(n.value)))) {
  console.log('import already present — nothing to do');
  process.exit(0);
}

const anchorIdx = doc.nodes.findIndex((n) => AFTER_MATCH.test(String(n.value)));
if (anchorIdx < 0) throw new Error('module-map import anchor not found');
// insert immediately after the anchor => new_next_node_id is the node following it
const nextNode = doc.nodes[anchorIdx + 1];
console.log(`inserting after node ${doc.nodes[anchorIdx].id}, before ${nextNode ? nextNode.id : '(end)'}`);
if (process.argv.includes('--dry-run')) { console.log('DRY RUN'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, { headers });
await new Promise((resolve, reject) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') {
      const nv = m.version + 1;
      ws.send(JSON.stringify({
        type: 'save',
        events: [{
          version: nv,
          type: 'insert_node',
          node_id: nv,
          new_next_node_id: nextNode ? nextNode.id : null,
          new_node_value: IMPORT,
          new_node_pinned: false,
          new_node_mode: 'js',
          new_node_data: null,
          new_node_name: null
        }],
        edits: [],
        version: m.version,
        subversion: m.subversion
      }));
    } else if (m.type === 'saveconfirm') {
      console.log('saved — version', m.version);
      ws.close();
      resolve();
    } else if (m.type === 'error') {
      ws.close();
      reject(new Error(JSON.stringify(m)));
    }
  });
  ws.on('error', reject);
  setTimeout(() => reject(new Error('timeout')), 60000);
});
