// One-off: add `exportModuleJS` to lopepage-2's existing @tomlarkworthy/exporter-3
// import on Observable. `lope-push-ws --cells` drops all imports (byte-exact matching
// vs Observable's reformatting would duplicate them), so an import change is a raw
// modify_node keyed on the node id.
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const SLUG = '@tomlarkworthy/lopepage-2';
const OLD = 'import { disk_svg, downloadAnchor, forkAnchor } from "@tomlarkworthy/exporter-3"';
const NEW = 'import { disk_svg, downloadAnchor, forkAnchor, exportModuleJS } from "@tomlarkworthy/exporter-3"';

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const cookie = `I=${I}; T=${T}`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const doc = await (await fetch(`https://api.observablehq.com/document/${SLUG}`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie, 'User-Agent': UA }
})).json();

const already = doc.nodes.find((n) => String(n.value).trim() === NEW);
if (already) { console.log(`already up to date (node ${already.id})`); process.exit(0); }

const node = doc.nodes.find((n) => String(n.value).trim() === OLD);
if (!node) throw new Error('exporter-3 import node not found in its expected form — inspect before forcing');
console.log(`remote version ${doc.version}; node ${node.id}:\n  ${OLD}\n->\n  ${NEW}`);
if (process.argv.includes('--dry-run')) { console.log('DRY RUN — no write'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
});
await new Promise((res, rej) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'load') {
      ws.send(JSON.stringify({
        type: 'save',
        events: [{ version: m.version + 1, type: 'modify_node', node_id: node.id, new_node_value: NEW }],
        edits: [], version: m.version, subversion: m.subversion
      }));
    } else if (m.type === 'saveconfirm') {
      console.log('saved — version', m.version); ws.close(); res();
    } else if (m.type === 'error') { ws.close(); rej(new Error(JSON.stringify(m))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 30000);
});
