// Targeted node edits on @tomlarkworthy/glpk-canonicalization that --cells cannot address.
import { WebSocket } from 'ws';
import { loadCookiesFromFile, fetchNotebook } from '../../observable-auth.js';
const log = (m) => process.stderr.write(`[patch] ${m}\n`);
const cookies = await loadCookiesFromFile('tools/.observable-cookies.json', log);
const doc = await fetchNotebook('@tomlarkworthy/glpk-canonicalization', cookies);

const MODIFY = [
  [5, `import { math } from "@tomlarkworthy/mathjs"`],
  [1718, `// New simplify rules get confused with comparisons. So its better to do each half seperately
check(simplify2, "- 1 + 1 + y < 0", "y < 0")`],
  [1420, `canonicalExample("1 == x1 + x2 + x3", "-x1 - x2 - x3 == -1")`],
  [2346, `canonicalExample("(-1+1*(2+y+x))*-2 <= y", "-2 * y - 2 * x - y <= 2")`],
];
const INSERT = [
  [1993, `checkExtract("(-1+1*(2+y+x))*-2 <= y", {
  vars: [{ coef: -3, name: "y" }, { coef: -2, name: "x" }],
  bounds: { upper: 2 }
})`],
];

const byId = new Map(doc.nodes.map((n) => [n.id, n]));
for (const [id] of MODIFY) if (!byId.has(id)) throw new Error(`node ${id} missing`);
const alreadyInserted = INSERT.filter(([, v]) => doc.nodes.some((n) => n.value.trim() === v.trim()));
const todoInsert = INSERT.filter((x) => !alreadyInserted.includes(x));

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: `T=${cookies.T}; I=${cookies.I}` },
});
const conn = await new Promise((res, rej) => {
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: doc.latest_version, next: true })));
  ws.on('error', rej);
  ws.on('message', (d) => { const m = JSON.parse(d.toString());
    if (m.type === 'load') res(m); else if (m.type === 'error') rej(new Error(`${m.message} (${m.status})`)); });
});
let { version, subversion } = conn;
const save = (event) => {
  const next = version + 1;
  const done = new Promise((res, rej) => {
    const h = (d) => { const m = JSON.parse(d.toString());
      if (m.type === 'saveconfirm' && m.version === next) { ws.off('message', h); res(m); }
      else if (m.type === 'error') { ws.off('message', h); rej(new Error(`${m.message} (${m.status})`)); } };
    ws.on('message', h);
    setTimeout(() => { ws.off('message', h); rej(new Error(`timeout v${next}`)); }, 30000);
  });
  ws.send(JSON.stringify({ type: 'save', edits: [], version, subversion, events: [event(next)] }));
  return done.then((m) => { version = m.version; subversion = m.subversion; return next; });
};

for (const [id, value] of MODIFY) {
  if (byId.get(id).value === value) { log(`node ${id} already current`); continue; }
  await save((v) => ({ version: v, type: 'modify_node', node_id: id, new_node_value: value }));
  log(`modified node ${id}`);
  await new Promise((r) => setTimeout(r, 200));
}
for (const [before, value] of todoInsert) {
  const id = await save((v) => ({ version: v, type: 'insert_node', node_id: v, new_next_node_id: before,
    new_node_value: value, new_node_pinned: false, new_node_mode: 'js', new_node_data: null, new_node_name: null }));
  log(`inserted node ${id} before ${before}`);
  await new Promise((r) => setTimeout(r, 200));
}
ws.close();
log(`done, version ${version}`);
