// One-off: turn exporter-3's getFileAttachments cell into
//   import {fileAttachmentEntries as getFileAttachments} from "@tomlarkworthy/fileattachments"
// with a single modify_node (--cells drops imports; modify avoids remove_node + insert_node).
import { readFileSync } from 'fs';
import WebSocket from 'ws';
const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const value = 'import {fileAttachmentEntries as getFileAttachments} from "@tomlarkworthy/fileattachments"';
const cookie = `I=${I}; T=${T}`;
const doc = await (await fetch('https://api.observablehq.com/document/@tomlarkworthy/exporter-3', {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie } })).json();
const hits = doc.nodes.filter((n) => /^\s*getFileAttachments\s*=/.test(String(n.value)) || String(n.value) === value);
console.log('version', doc.version, 'matches', hits.map((n) => [n.id, String(n.value).slice(0, 80)]));
if (hits.length !== 1) throw new Error('expected exactly one getFileAttachments node');
const node = hits[0];
if (String(node.value) === value) { console.log('already up to date'); process.exit(0); }
if (process.argv.includes('--dry-run')) { console.log('DRY RUN — would modify node', node.id); process.exit(0); }
const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, { headers: { Origin: 'https://observablehq.com', Cookie: cookie } });
await new Promise((res, rej) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') ws.send(JSON.stringify({ type: 'save', events: [{ version: m.version + 1, type: 'modify_node', node_id: node.id, new_node_value: value }], edits: [], version: m.version, subversion: m.subversion }));
    else if (m.type === 'saveconfirm') { console.log('saved — version', m.version); ws.close(); res(); }
    else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 30000);
});
