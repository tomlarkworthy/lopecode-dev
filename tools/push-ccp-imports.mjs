// One-off: fix @tomlarkworthy/claude-code-pairing's import cells on Observable.
// `--cells` drops imports (byte-exact matching duplicates them), so these two need raw WS:
//   1. modify the file-sync import to stop importing fileSyncTools (a name file-sync never defined)
//   2. insert the plugin-registry import that supplies `plugins`
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const SLUG = '@tomlarkworthy/claude-code-pairing';
const FILE_SYNC_IMPORT =
  'import { viewof directory, viewof disassemble, viewof syncEnabled, syncStatus } from "@tomlarkworthy/file-sync"';
const REGISTRY_IMPORT = 'import { plugins } from "@tomlarkworthy/plugin-registry"';

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const cookie = `I=${I}; T=${T}`;
const doc = await (
  await fetch(`https://api.observablehq.com/document/${SLUG}`, {
    headers: { Origin: 'https://observablehq.com', Cookie: cookie },
  })
).json();

const fsNode = doc.nodes.find(
  (n) => typeof n.value === 'string' && /from "@tomlarkworthy\/file-sync"/.test(n.value)
);
if (!fsNode) throw new Error('file-sync import node not found');
const hasRegistry = doc.nodes.some(
  (n) => typeof n.value === 'string' && /from "@tomlarkworthy\/plugin-registry"/.test(n.value)
);

const ops = [];
if (String(fsNode.value) !== FILE_SYNC_IMPORT)
  ops.push({ kind: 'modify', node_id: fsNode.id, value: FILE_SYNC_IMPORT });
else console.log('file-sync import already correct');
if (!hasRegistry) ops.push({ kind: 'insert', value: REGISTRY_IMPORT });
else console.log('plugin-registry import already present');

console.log(`remote version ${doc.version}; ${ops.length} op(s)`);
for (const o of ops) console.log(`  ${o.kind} ${o.node_id ?? '(new)'}: ${o.value}`);
if (!ops.length) process.exit(0);
if (process.argv.includes('--dry-run')) { console.log('DRY RUN'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie },
});
await new Promise((res, rej) => {
  let version = null, sub = null, i = 0;
  const sendNext = () => {
    if (i >= ops.length) { console.log('all ops confirmed'); ws.close(); return res(); }
    const o = ops[i];
    const v = version + 1;
    // insert_node requires node_id === event version
    const event = o.kind === 'modify'
      ? { version: v, type: 'modify_node', node_id: o.node_id, new_node_value: o.value }
      : { version: v, type: 'insert_node', node_id: v, new_next_node_id: null,
          new_node_value: o.value, new_node_pinned: false, new_node_mode: 'js',
          new_node_data: null, new_node_name: null };
    ws.send(JSON.stringify({ type: 'save', events: [event], edits: [], version, subversion: sub }));
  };
  ws.on('open', () =>
    ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') { version = m.version; sub = m.subversion; sendNext(); }
    else if (m.type === 'saveconfirm') {
      console.log(`  confirmed ${ops[i].kind} — version ${m.version}`);
      version = m.version; sub = m.subversion; i++;
      setTimeout(sendNext, 200); // the save endpoint 404s on back-to-back writes
    } else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 60000);
});
