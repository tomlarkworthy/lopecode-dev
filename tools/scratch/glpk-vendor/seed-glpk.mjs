// One-off: upload the vendored glpk.js bundle to @tomlarkworthy/glpk-js and seed its cells.
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { API, cookieHeader, loadCookiesFromFile, fetchNotebook } from '../../observable-auth.js';

const SLUG = '@tomlarkworthy/glpk-js';
const GZ = 'tools/scratch/glpk-vendor/glpk-5.0.0.js.gz';
const NAME = 'glpk-5.0.0.js.gz';
const log = (m) => process.stderr.write(`[seed] ${m}\n`);

const cookies = await loadCookiesFromFile('tools/.observable-cookies.json', log);
const doc = await fetchNotebook(SLUG, cookies);
log(`doc ${doc.id} version ${doc.latest_version}, ${doc.nodes.length} node(s), files: ${JSON.stringify((doc.files||[]).map(f=>f.name))}`);

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
  const err = text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)).find((e) => e.type === 'error');
  if (err) throw new Error(`upload: ${err.message || JSON.stringify(err)}`);
  log(`uploaded ${NAME} (${fs.statSync(GZ).size} bytes)`);
} else log(`${NAME} already uploaded`);

const CELLS = [
  ['js', `md\`# glpk.js

[glpk.js](https://github.com/jvail/glpk.js) 5.0.0 — GLPK 5.0 compiled to WebAssembly — vendored as
a file attachment so notebooks that depend on it keep working with the network unplugged, and do
not change underneath us when a CDN moves.

~~~js
import { glpk } from '@tomlarkworthy/glpk-js'
~~~

The attachment is the \\\`dist/index.js\\\` browser bundle glpk.js publishes, gzipped. That bundle
carries the WebAssembly binary and the solver worker inside itself (both deflated), so importing
it makes no further network requests. It is an ES module, so it is imported from a blob URL rather
than evaluated as CommonJS.\``],
  ['js', `unzip = async (attachment) =>
  await new Response(
    (await attachment.stream()).pipeThrough(new DecompressionStream("gzip"))
  ).blob()`],
  ['js', `GLPK = {
  const src = await (await unzip(FileAttachment("glpk-5.0.0.js.gz"))).text();
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  try {
    return (await import(url)).default;
  } finally {
    URL.revokeObjectURL(url);
  }
}`],
  ['js', `glpk = {
  // one worker for everything downstream; GLPK() is also exported for callers wanting their own
  const instance = await GLPK();
  invalidation.then(() => instance.terminate());
  return instance;
}`],
  ['js', `md\`## Tests\``],
  ['js', `test_glpk_version = {
  if (glpk.version !== "5.0") throw new Error(\`expected GLPK 5.0, got \${glpk.version}\`);
  return glpk.version;
}`],
  ['js', `test_glpk_solves_an_lp = {
  const result = await glpk.solve({
    name: "LP",
    objective: {
      direction: glpk.GLP_MAX,
      name: "obj",
      vars: [{ name: "x1", coef: 0.6 }, { name: "x2", coef: 0.5 }]
    },
    subjectTo: [
      {
        name: "c1",
        vars: [{ name: "x1", coef: 1 }, { name: "x2", coef: 2 }],
        bnds: { type: glpk.GLP_UP, ub: 1, lb: 0 }
      },
      {
        name: "c2",
        vars: [{ name: "x1", coef: 3 }, { name: "x2", coef: 1 }],
        bnds: { type: glpk.GLP_UP, ub: 2, lb: 0 }
      }
    ]
  });
  if (result.result.status !== glpk.GLP_OPT)
    throw new Error(\`expected an optimal solution, got status \${result.result.status}\`);
  if (Math.abs(result.result.z - 0.46) > 1e-9)
    throw new Error(\`expected z = 0.46, got \${result.result.z}\`);
  return result.result.vars;
}`],
  ['js', `test_glpk_writes_cplex_lp = {
  const lp = await glpk.write({
    name: "LP",
    objective: {
      direction: glpk.GLP_MIN,
      name: "obj",
      vars: [{ name: "x1", coef: 1 }]
    },
    subjectTo: [
      {
        name: "c1",
        vars: [{ name: "x1", coef: 1 }],
        bnds: { type: glpk.GLP_LO, ub: 0, lb: 2 }
      }
    ]
  });
  if (!lp.includes("Minimize")) throw new Error(\`not CPLEX LP format: \${lp.slice(0, 80)}\`);
  return lp.length;
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
