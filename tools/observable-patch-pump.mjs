// Surgically fix the Generators.observe pump in named cells of an Observable notebook, in place.
// Replaces `await <ident>.next().value` -> `await (await <ident>.next()).value` (legacy -> universal),
// touching ONLY the named cells and ONLY that substring, so concurrent prose/format edits are preserved.
//
// Usage: node tools/observable-patch-pump.mjs <notebookSlugOrId> <cellName>[,<cellName>...]
import WebSocket from 'ws';
import fs from 'node:fs';

const [slug, cellsArg] = process.argv.slice(2);
const cellNames = new Set((cellsArg || '').split(',').map((s) => s.trim()).filter(Boolean));
const c = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';

const fixPump = (src) => src.replace(/await\s+(\w+)\.next\(\)\.value/g, 'await (await $1.next()).value');
const nameOf = (value) => (value.match(/^\s*(\w+)\s*=/) || [])[1];

const doc = await (await fetch(`https://api.observablehq.com/document/${slug}`, {
  headers: { Cookie: `I=${c.I}; T=${c.T}`, Origin: 'https://observablehq.com', 'User-Agent': UA },
})).json();
console.log(`doc "${slug}" version ${doc.version}, ${doc.nodes.length} nodes`);

const patches = [];
for (const n of doc.nodes) {
  if (!cellNames.has(nameOf(n.value))) continue;
  const next = fixPump(n.value);
  if (next === n.value) { console.log(`  ${nameOf(n.value)} (node ${n.id}) — no pump to fix, skipping`); continue; }
  console.log(`  ${nameOf(n.value)} (node ${n.id}) — ${(n.value.match(/\.next\(\)\.value/g) || []).length} pump site(s) to fix`);
  patches.push({ id: n.id, value: next });
}
const missing = [...cellNames].filter((cn) => !doc.nodes.some((n) => nameOf(n.value) === cn));
if (missing.length) console.log(`  WARNING: cells not found: ${missing.join(', ')}`);
if (patches.length === 0) { console.log('Nothing to patch.'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `T=${c.T}; I=${c.I}` },
});
const result = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), 30000);
  let version, subversion, queue = [...patches], inflight = null;
  const sendNext = () => {
    if (queue.length === 0) { clearTimeout(t); resolve(version); return; }
    inflight = queue.shift();
    version += 1;
    ws.send(JSON.stringify({
      type: 'save',
      events: [{ version, type: 'modify_node', node_id: inflight.id, new_node_value: inflight.value }],
      edits: [], version: version - 1, subversion,
    }));
  };
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: c.T, version: doc.version, next: true })));
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'load') {
      version = msg.version;
      for (const e of msg.events || []) if (e.version) version = e.version;
      subversion = msg.subversion;
      sendNext();
    } else if (msg.type === 'saveconfirm') {
      subversion = msg.subversion ?? subversion;
      console.log(`  saved node ${inflight.id} -> version ${msg.version}`);
      version = msg.version;
      sendNext();
    } else if (msg.type === 'error') {
      clearTimeout(t); reject(new Error(`${msg.message} (status ${msg.status})`));
    }
  });
  ws.on('error', reject);
});
ws.close();
console.log(`Done. Final version ${result}.`);
process.exit(0);
