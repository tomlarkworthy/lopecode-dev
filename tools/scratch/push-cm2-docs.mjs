// One-off: insert cell-map-2's six anonymous md cells before GLUE on Observable, then remove the
// stub "# cell-map-2" md-mode node the seed left behind. `--cells` cannot insert anonymous cells, and
// modifying the md-mode stub would keep md mode and render `md\`…\`` literally.
// Sources are push-ws's own decompilation (`--dry-run --dump`), not re-derived here.
// run: node tools/scratch/push-cm2-docs.mjs <dump.json> [--dry-run]
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const dumpPath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const cookie = `I=${I}; T=${T}`;
const SLUG = '@tomlarkworthy/cell-map-2';
const BEFORE = 5; // GLUE
const STUB = 0;

const dump = JSON.parse(readFileSync(dumpPath, 'utf8'));
const docs = dump.slice(0, 6).map((c) => String(c.source));
if (!docs.every((s) => s.startsWith('md`'))) throw new Error('dump[0..5] are not all md cells');
if (!docs[0].startsWith('md`# cell-map-2')) throw new Error('dump[0] is not the title cell');

const fetchDoc = async () =>
  (await fetch(`https://api.observablehq.com/document/${SLUG}`, {
    headers: { Origin: 'https://observablehq.com', Cookie: cookie }
  })).json();

const doc = await fetchDoc();
console.log('remote version', doc.version, 'nodes', doc.nodes.length);
const before = doc.nodes.find((n) => n.id === BEFORE);
if (!before || !String(before.value).startsWith('GLUE = [')) throw new Error(`node ${BEFORE} is not GLUE`);
const stub = doc.nodes.find((n) => n.id === STUB);
const present = docs.filter((s) => doc.nodes.some((n) => n.value === s));
if (present.length) throw new Error(`${present.length} md cell(s) already present — not re-inserting`);
console.log('stub node', STUB, stub ? `mode=${stub.mode} value=${JSON.stringify(stub.value)}` : 'absent');
if (dryRun) {
  console.log(`DRY RUN — would insert ${docs.length} md cells before node ${BEFORE}` + (stub ? `, then remove node ${STUB}` : ''));
  process.exit(0);
}

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie }
});
const pending = new Map();
let loaded;
const ready = new Promise((r) => (loaded = r));
ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString());
  if (m.type === 'load') loaded(m);
  else if (m.type === 'saveconfirm') pending.get(m.version)?.res(m);
  else if (m.type === 'error') for (const p of pending.values()) p.rej(new Error(`status ${m.status} ${m.message}`));
});
ws.on('error', (e) => { console.error(e); process.exit(1); });

const load = await ready;
let version = load.version;
let subversion = load.subversion;
for (const e of load.events || []) if (e.version) version = e.version;

const save = async (makeEvent, label) => {
  let delay = 1500;
  for (let attempt = 1; ; attempt++) {
    const v = version + 1;
    const confirm = new Promise((res, rej) => {
      pending.set(v, { res, rej });
      setTimeout(() => rej(new Error(`timeout v${v}`)), 30000);
    });
    ws.send(JSON.stringify({ type: 'save', events: [makeEvent(v)], edits: [], version, subversion }));
    try {
      const m = await confirm;
      pending.delete(v);
      version = m.version;
      subversion = m.subversion;
      console.log(`  ${label} -> v${version}`);
      await new Promise((r) => setTimeout(r, 150));
      return;
    } catch (err) {
      pending.delete(v);
      if (attempt >= 6 || !/status (404|409|429|50\d)/.test(err.message)) throw err;
      console.log(`  ${label}: ${err.message}, retry ${attempt}/6 in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

for (const [i, value] of docs.entries()) {
  await save((v) => ({
    version: v, type: 'insert_node', node_id: v, new_next_node_id: BEFORE,
    new_node_value: value, new_node_pinned: false, new_node_mode: 'js',
    new_node_data: null, new_node_name: null
  }), `insert md ${i + 1}/${docs.length}`);
}
if (stub) await save((v) => ({ version: v, type: 'remove_node', node_id: STUB }), `remove stub node ${STUB}`);
ws.close();
const after = await fetchDoc();
console.log('final version', after.version, 'nodes', after.nodes.length);
