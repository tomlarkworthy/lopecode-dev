// One-off: teach a published notebook's `@tomlarkworthy/lopepage-urls` import to also bring in
// `navigate`. `lope-push-ws --cells` drops imports (they round-trip badly), so an import edit needs
// the raw WS protocol: modify_node on the existing import, or insert_node when there is none.
//
//   node tools/push-navigate-import.mjs @tomlarkworthy/command-palette [--dry-run]
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const slug = process.argv[2];
if (!slug) { console.error('usage: push-navigate-import.mjs <@user/slug> [--dry-run]'); process.exit(1); }
const dry = process.argv.includes('--dry-run');

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const cookie = `I=${I}; T=${T}`;
const doc = await (await fetch(`https://api.observablehq.com/document/${slug}`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
})).json();
if (!doc.nodes) { console.error('no nodes — auth or slug problem:', JSON.stringify(doc).slice(0, 200)); process.exit(1); }

const IMPORT = /^\s*import\s*\{([\s\S]*?)\}\s*from\s*["']@tomlarkworthy\/lopepage-urls["']/;
const node = doc.nodes.find((n) => IMPORT.test(String(n.value || '')));

let event;
if (node) {
  const names = IMPORT.exec(String(node.value))[1].split(',').map((s) => s.trim()).filter(Boolean);
  if (names.includes('navigate')) { console.log(`${slug}: import already has navigate`); process.exit(0); }
  const value = `import {${[...names, 'navigate'].join(', ')}} from "@tomlarkworthy/lopepage-urls"`;
  console.log(`${slug}: modify node ${node.id}\n  ${String(node.value).replace(/\n/g, ' ')}\n  → ${value}`);
  event = { type: 'modify_node', node_id: node.id, new_node_value: value };
} else {
  const value = 'import {navigate} from "@tomlarkworthy/lopepage-urls"';
  console.log(`${slug}: no lopepage-urls import — inserting "${value}"`);
  event = { type: 'insert_node', new_next_node_id: null, new_node_value: value,
    new_node_pinned: false, new_node_mode: 'js', new_node_data: null, new_node_name: null };
}
if (dry) { console.log('DRY RUN'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
});
await new Promise((res, rej) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') {
      const v = m.version;
      // insert_node's node_id must equal the event version
      const ev = { version: v + 1, ...event, ...(event.type === 'insert_node' ? { node_id: v + 1 } : {}) };
      ws.send(JSON.stringify({ type: 'save', events: [ev], edits: [], version: v, subversion: m.subversion }));
    } else if (m.type === 'saveconfirm') { console.log('saved — version', m.version); ws.close(); res(); }
    else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 30000);
});
