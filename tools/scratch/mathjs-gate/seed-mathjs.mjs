// One-off: upload the vendored mathjs bundle to @tomlarkworthy/mathjs and seed its cells.
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { API, cookieHeader, loadCookiesFromFile, fetchNotebook } from '../../observable-auth.js';

const SLUG = '@tomlarkworthy/mathjs';
const GZ = 'tools/scratch/mathjs-gate/math-15.2.0.js.gz';
const NAME = 'math-15.2.0.js.gz';
const log = (m) => process.stderr.write(`[seed] ${m}\n`);

const cookies = await loadCookiesFromFile('tools/.observable-cookies.json', log);
const doc = await fetchNotebook(SLUG, cookies);
log(`doc ${doc.id} version ${doc.latest_version}, ${doc.nodes.length} node(s), files: ${JSON.stringify((doc.files||[]).map(f=>f.name))}`);

// --- 1. upload the attachment (names are one-shot per document) ---
if (!(doc.files || []).some((f) => f.name === NAME)) {
  const form = new FormData();
  form.append('token', cookies.T);
  form.append('client_name', NAME);
  form.append('file', new Blob([fs.readFileSync(GZ)], { type: 'application/gzip' }), NAME);
  const resp = await fetch(`${API}/document/${doc.id}/file`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(cookies), Origin: 'https://observablehq.com' },
    body: form,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`upload: HTTP ${resp.status} ${text.slice(0, 300)}`);
  const events = text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
  const err = events.find((e) => e.type === 'error');
  if (err) throw new Error(`upload: ${err.message || JSON.stringify(err)}`);
  log(`uploaded ${NAME} (${fs.statSync(GZ).size} bytes)`);
} else log(`${NAME} already uploaded`);

// --- 2. seed the cells ---
const CELLS = [
  ['js', `md\`# mathjs

[mathjs](https://mathjs.org) 15.2.0, vendored as a file attachment so notebooks that depend on it
keep working with the network unplugged, and do not change underneath us when a CDN moves.

~~~js
import { math } from '@tomlarkworthy/mathjs'
~~~

The attachment is the lib/browser/math.js UMD bundle mathjs itself publishes, gzipped. It is
evaluated as CommonJS rather than imported: a UMD bundle yields no exports through import(), and
running it as a plain script would take the AMD branch on any page carrying a module loader.\``],
  ['js', `unzip = async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()`],
  ['js', `math = {
  const src = await (await unzip(FileAttachment("math-15.2.0.js.gz"))).text();
  const mod = { exports: {} };
  new Function("module", "exports", src)(mod, mod.exports);
  return mod.exports;
}`],
  ['js', `test_math_version = {
  if (math.version !== "15.2.0")
    throw new Error(\`expected mathjs 15.2.0, got \${math.version}\`);
  return math.version;
}`],
  ['js', `test_math_simplify = {
  const out = math
    .simplify("2 * (x + 2)", math.simplify.rules, {}, { exactFractions: false })
    .toString();
  if (out !== "2 * x + 4") throw new Error(\`expected "2 * x + 4", got "\${out}"\`);
  return out;
}`],
  ['js', `test_math_is_self_contained = {
  if (typeof math.simplifyCore !== "function")
    throw new Error("simplifyCore missing — wrong build?");
  return Object.keys(math).length + " exports";
}`],
];

const fresh = await fetchNotebook(SLUG, cookies);
const existing = new Set(fresh.nodes.map((n) => n.value.trim()));
const todo = CELLS.filter(([, v]) => !existing.has(v.trim()));
if (!todo.length) { log('all cells already present'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `T=${cookies.T}; I=${cookies.I}` },
});
const conn = await new Promise((resolve, reject) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: fresh.latest_version, next: true })));
  ws.on('error', reject);
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'load') resolve({ version: m.version, subversion: m.subversion });
    else if (m.type === 'error') reject(new Error(`${m.message} (status ${m.status})`));
  });
});
let { version, subversion } = conn;
const confirm = (v) => new Promise((resolve, reject) => {
  const h = (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'saveconfirm' && m.version === v) { ws.off('message', h); resolve(m); }
    else if (m.type === 'error') { ws.off('message', h); reject(new Error(`${m.message} (status ${m.status})`)); }
  };
  ws.on('message', h);
  setTimeout(() => { ws.off('message', h); reject(new Error(`timeout waiting for v${v}`)); }, 30000);
});
for (const [mode, value] of todo) {
  const next = version + 1;
  ws.send(JSON.stringify({
    type: 'save', edits: [], version, subversion,
    events: [{ version: next, type: 'insert_node', node_id: next, new_next_node_id: null,
               new_node_value: value, new_node_pinned: false, new_node_mode: mode,
               new_node_data: null, new_node_name: null }],
  }));
  const c = await confirm(next);
  version = c.version; subversion = c.subversion;
  log(`inserted ${mode} node ${next}: ${value.slice(0, 40).replace(/\n/g, ' ')}…`);
  await new Promise((r) => setTimeout(r, 200));
}
ws.close();
log(`done, version ${version}`);
