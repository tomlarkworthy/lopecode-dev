// One-off: modify_node the anonymous md docs cell (node 5) of @tomlarkworthy/command-palette.
// `--cells` can only address named cells, so an anonymous md cell needs the raw WS protocol.
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const src = readFileSync('modules/@tomlarkworthy/command-palette.js', 'utf8');
const start = src.indexOf('const _tku1if = function _1(md){return(');
const bodyStart = src.indexOf('\n', start) + 1;
const bodyEnd = src.indexOf('\n)};', bodyStart);
const value = src.slice(bodyStart, bodyEnd);
if (!/^md`# Command Palette/.test(value)) throw new Error('unexpected cell body: ' + value.slice(0, 60));
console.log('local value bytes:', value.length);

const cookie = `I=${I}; T=${T}`;
const doc = await (await fetch('https://api.observablehq.com/document/@tomlarkworthy/command-palette', {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
})).json();
const node = doc.nodes.find((n) => n.id === 5);
if (String(node.value) === value) { console.log('already up to date'); process.exit(0); }
console.log('remote version', doc.version, 'node 5 bytes', String(node.value).length);
if (process.argv.includes('--dry-run')) { console.log('DRY RUN — would modify node 5'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
});
const done = new Promise((res, rej) => {
  let version = null, sub = null;
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') {
      version = m.version; sub = m.subversion;
      ws.send(JSON.stringify({
        type: 'save',
        events: [{ version: version + 1, type: 'modify_node', node_id: 5, new_node_value: value }],
        edits: [], version, subversion: sub
      }));
    } else if (m.type === 'saveconfirm') {
      console.log('saved — version', m.version); ws.close(); res();
    } else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 30000);
});
await done;
