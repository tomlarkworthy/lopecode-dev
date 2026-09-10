// One-off: insert_node the anonymous md doc cell lp2_doc_add_module into
// @tomlarkworthy/lopepage-2. `--cells` cannot address an anonymous cell, and
// `--cells-match-body` only modifies one that already exists upstream.
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const src = readFileSync('modules/@tomlarkworthy/lopepage-2.js', 'utf8');
const start = src.indexOf('const _1add0doc = function _lp2_doc_add_module(md){return(');
if (start < 0) throw new Error('cell not found');
const bodyStart = src.indexOf('\n', start) + 1;
const bodyEnd = src.indexOf('\n)};', bodyStart);
const value = src.slice(bodyStart, bodyEnd);
if (!/^md`### Add module/.test(value)) throw new Error('unexpected body: ' + value.slice(0, 60));
console.log('local value bytes:', value.length);

const cookie = `I=${I}; T=${T}`;
const doc = await (await fetch('https://api.observablehq.com/document/@tomlarkworthy/lopepage-2', {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
})).json();
if (doc.nodes.some((n) => String(n.value) === value)) { console.log('already present'); process.exit(0); }
// place it directly before lp2_add_module, the cell it documents
const idx = doc.nodes.findIndex((n) => /^\s*lp2_add_module\s*=/.test(String(n.value)));
if (idx < 0) throw new Error('lp2_add_module not found upstream');
const anchor = doc.nodes[idx].id;
console.log('remote version', doc.version, '- inserting before node', anchor);
if (process.argv.includes('--dry-run')) process.exit(0);

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
});
await new Promise((res, rej) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') {
      const v = m.version + 1;
      ws.send(JSON.stringify({
        type: 'save',
        events: [{ version: v, type: 'insert_node', node_id: v, new_next_node_id: anchor,
                   new_node_value: value, new_node_pinned: false, new_node_mode: 'js',
                   new_node_data: null, new_node_name: null }],
        edits: [], version: m.version, subversion: m.subversion
      }));
    } else if (m.type === 'saveconfirm') { console.log('inserted — version', m.version); ws.close(); res(); }
    else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 30000);
});
