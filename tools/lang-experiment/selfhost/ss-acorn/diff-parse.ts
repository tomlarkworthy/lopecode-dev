// parse through the module (M.parse: the shell under FN CROSSING) against base/lite/parse.ts (the same file as
// lite/parse.ts, 714c3a2b9ea9) on the census inputs (gen/census.ts inputs()) and on held-out TypeScript (the repo's
// tools/*.ts, not in the census): every node in acorn's pre-order against the node with that nid (kind, start, end,
// line, every value field, every child by nid), the comments, and on 30/50/70% truncations the error as a value
// against the thrown SyntaxError. A control mutates the copy and must differ. Run: bun diff-parse.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./base/lite/parse.ts";
import { M } from "./mod.ts";
import { inputs } from "./gen/census.ts";

const DROP = new Set(["type", "start", "end", "loc", "extra"]);
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const norm = (v: any) => JSON.stringify(v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v);
// acorn's nodes in pre-order, each visit with the pre-order index of each child it reached (an object two fields share,
// ImportSpecifier's imported and local, is visited once per field, as the shell numbers it)
const acornOrder = (program: any): { node: any; kids: Map<string, number | (number | null)[]> }[] => {
  const out: { node: any; kids: Map<string, number | (number | null)[]> }[] = [];
  const visit = (n: any): number => {
    const e = { node: n, kids: new Map<string, number | (number | null)[]>() };
    const i = out.push(e) - 1;
    for (const k in n) { if (DROP.has(k)) continue; const v = n[k]; if (isNode(v)) e.kids.set(k, visit(v)); else if (Array.isArray(v) && v.some(isNode)) e.kids.set(k, v.map((x) => (isNode(x) ? visit(x) : null))); }
    return i;
  };
  visit(program);
  return out;
};
// the differences between one acorn node and the node of the same nid
function nodeDiff(e: { node: any; kids: Map<string, any> }, n: any): string | null {
  const a = e.node;
  if (!n) return "no node at this nid";
  const kind = n.type === "Other" ? n.kind : n.type;
  if (kind !== a.type || n.start !== a.start || n.end !== a.end || n.line !== a.loc.start.line) return `head ${kind} ${n.start}-${n.end} L${n.line}`;
  for (const k of Object.keys(a)) {
    if (DROP.has(k)) continue;
    const v = a[k];
    const got = n.type === "Other" ? (n.fields.find((f: any) => f.key === k)?.nodes ?? n.props.find((p: any) => p.key === k)?.value) : n[k];
    const field = n.type === "Other" ? n.fields.find((f: any) => f.key === k) : null;
    if (isNode(v)) { const g = field ? got[0] : got; if (!g || g.nid !== e.kids.get(k)) return `${k}: child`; }
    else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) {
      const want = (e.kids.get(k) ?? v.map(() => null)) as (number | null)[];
      if (!Array.isArray(got) || got.length !== v.length || want.some((x, i) => (x === null ? got[i] !== null : got[i]?.nid !== x))) return `${k}: list`;
    } else if (norm(v) !== JSON.stringify(got ?? null)) return `${k}: ${norm(v)} vs ${JSON.stringify(got)}`;
  }
  return null;
}
export function compare(texts: { id: string; src: string; tsx: boolean }[], label: string, mutate?: (ast: any) => any) {
  const t = { inputs: 0, parsed: 0, nodes: 0, nodeDiff: 0, commentDiff: 0, other: 0, otherKinds: new Map<string, number>(), cut: 0, thrown: 0, errSame: 0, errDiff: 0, okMismatch: 0, refused: 0 };
  const shown: string[] = [];
  for (const c of texts) {
    t.inputs++;
    let P: any = null, thrown: any = null;
    try { P = parse(c.src, { jsx: c.tsx }); } catch (e) { thrown = e; }
    let v: any;
    try { v = M.parse(c.src, c.tsx); } catch (e: any) { t.refused++; if (shown.length < 5) shown.push(`${c.id}: parse threw ${e.message.slice(0, 200)}`); continue; }
    if (!P) { t.okMismatch += v.ok ? 1 : 0; continue; }
    if (!v.ok) { t.okMismatch++; continue; }
    t.parsed++;
    const ast = mutate ? mutate(v.ast) : v.ast;
    const acorn = acornOrder(P.program);
    const nodes = M.byNid(ast);
    if (nodes.length !== acorn.length) { t.nodeDiff++; shown.push(`${c.id}: ${nodes.length} nodes vs ${acorn.length}`); continue; }
    for (let i = 0; i < acorn.length; i++) {
      t.nodes++;
      if (nodes[i]?.type === "Other") { t.other++; t.otherKinds.set(nodes[i].kind, (t.otherKinds.get(nodes[i].kind) ?? 0) + 1); }
      const d = nodeDiff(acorn[i]!, nodes[i]);
      if (d) { t.nodeDiff++; if (shown.length < 5) shown.push(`${c.id} nid ${i} ${acorn[i]!.node.type}: ${d}`); }
    }
    if (JSON.stringify(P.comments) !== JSON.stringify(ast.comments)) t.commentDiff++;
  }
  for (const c of texts) for (const f of [0.3, 0.5, 0.7]) {
    const s = c.src.slice(0, Math.floor(c.src.length * f));
    t.cut++;
    let thrown: any = null;
    try { parse(s, { jsx: c.tsx }); } catch (e) { thrown = e; }
    let v: any;
    try { v = M.parse(s, c.tsx); } catch { t.errDiff++; continue; }
    if (!thrown) { if (!v.ok) t.errDiff++; continue; }
    t.thrown++;
    if (!v.ok && v.message === thrown.message && v.pos === thrown.pos && v.line === thrown.loc.line && v.column === thrown.loc.column) t.errSame++; else t.errDiff++;
  }
  console.log(`${label}: ${t.inputs} inputs, ${t.parsed} parse (${t.okMismatch} where parse.ts and the module disagree on ok, ${t.refused} where the module's parse threw); ${t.nodes} nodes, ${t.nodeDiff} differ; comments differ on ${t.commentDiff}; Other nodes ${t.other}${t.other ? ` (${[...t.otherKinds].map(([k, n]) => `${k} ${n}`).join(", ")})` : ""}`);
  console.log(`  truncations: ${t.cut}, ${t.thrown} throw in parse.ts; error value equal (message, pos, line, column) ${t.errSame}, differ ${t.errDiff}`);
  for (const s of shown) console.log(`  ${s.slice(0, 300)}`);
  return t;
}
if (import.meta.main) {
  const census = inputs();
  compare(census, "census inputs");
  const TOOLS = join(import.meta.dir, "../../..");
  const held = readdirSync(TOOLS).filter((f) => /\.tsx?$/.test(f)).sort().map((f) => ({ id: `tools/${f}`, src: readFileSync(join(TOOLS, f), "utf8"), tsx: f.endsWith("x") }));
  compare(held, `held out (${held.length} files of tools/)`);
  // control: the copy's first Identifier renamed must be seen as a difference
  const rename = (ast: any) => { const s = JSON.parse(JSON.stringify(ast)); const go = (n: any): boolean => { if (n && typeof n === "object") { if (n.type === "Identifier") { n.name += "_"; return true; } for (const k in n) if (go(n[k])) return true; } return false; }; go(s.program); return s; };
  compare(census.slice(300, 320), "control (first Identifier renamed in the copy)", rename);
}
