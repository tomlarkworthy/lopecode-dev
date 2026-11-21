// bun lite/acorn.test.ts: the acorn cells (acorn/).
//  1. gen.ts --check: regenerating acorn-types.ss.ts, acorn-kids.ss.ts and acorn-rows.ts gives the same files.
//  2. the shape acorn/index.ts gives acornParse is the shape the checker gives parseTree's parameter.
//  3. parseTree (through the boundary) against parse.ts on the census inputs (acorn/census.ts) and on held-out
//     TypeScript (the .ts files at the top of tools/): every node in acorn's pre-order against the node of that nid
//     (kind, start, end, line, every value field, every child by nid), the comments, preorder(); on 30/50/70%
//     truncations, the error value against the SyntaxError parse.ts throws. A control changes the copy and must differ.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./parse.ts";
import { checkSources } from "./core.ts";
import { inputs, type Input } from "./acorn/census.ts";
import * as A from "./acorn/index.ts";

let pass = 0, fail = 0;
const ok = (c: boolean, what: string, detail?: unknown) => { console.log(`${c ? "pass" : "FAIL"} ${what}${c || detail === undefined ? "" : `: ${JSON.stringify(detail).slice(0, 400)}`}`); c ? pass++ : fail++; };
const HERE = import.meta.dir;

{
  const r = Bun.spawnSync(["bun", join(HERE, "acorn/gen.ts"), "--check"], { stdout: "pipe" });
  const out = r.stdout.toString().trim().split("\n");
  ok(r.exitCode === 0, `gen.ts --check: ${out[out.length - 1]}`, out);
}
{
  const read = (f: string) => readFileSync(join(HERE, "acorn", f), "utf8");
  const r = checkSources({ cells: ["acorn-types.ss.ts", "acorn-kids.ss.ts", "acorn.ss.ts"].map(read).join("\n\n"), tsx: true, shell: read("acorn-shell.ts") });
  const b = r.facts!.get("parseTree")!.params.find((p) => p.name === "acornParse")?.boundary;
  ok(!!b && !b.ref && JSON.stringify(b.shape) === JSON.stringify(A.parseTreeShape()), "the shape index.ts gives acornParse is the checker's shape of parseTree's parameter");
  ok(r.cells.every((c) => c.status === "ok"), `the checker accepts the ${r.cells.length} cells of acorn-kids.ss.ts and acorn.ss.ts`, r.cells.filter((c) => c.status !== "ok").map((c) => c.name));
}

const DROP = new Set(["type", "start", "end", "loc", "extra"]);
const isNode = (v: any) => !!v && typeof v === "object" && typeof v.type === "string";
const norm = (v: any) => JSON.stringify(v === undefined || v instanceof RegExp || typeof v === "bigint" ? null : v);
// acorn's nodes in pre-order, each visit with the pre-order index of each child it reached (an object two fields share,
// ImportSpecifier's imported and local, is visited once per field, as the shell numbers it)
const acornOrder = (program: any) => {
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
function nodeDiff(e: { node: any; kids: Map<string, any> }, n: any): string | null {
  const a = e.node;
  if (!n) return "no node at this nid";
  const kind = A.nodeKind(n);
  if (kind !== a.type || n.start !== a.start || n.end !== a.end || n.line !== a.loc.start.line) return `head ${kind} ${n.start}-${n.end} L${n.line}`;
  for (const k of Object.keys(a)) {
    if (DROP.has(k)) continue;
    const v = a[k];
    const field = n.type === "Other" ? n.fields.find((f: any) => f.key === k) : null;
    const got = n.type === "Other" ? (field?.nodes ?? n.props.find((p: any) => p.key === k)?.value) : n[k];
    if (isNode(v)) { const g = field ? got[0] : got; if (!g || g.nid !== e.kids.get(k)) return `${k}: child`; }
    else if (Array.isArray(v) && v.every((x) => x === null || isNode(x))) {
      const want = (e.kids.get(k) ?? v.map(() => null)) as (number | null)[];
      if (!Array.isArray(got) || got.length !== v.length || want.some((x, i) => (x === null ? got[i] !== null : got[i]?.nid !== x))) return `${k}: list`;
    } else if (norm(v) !== JSON.stringify(got ?? null)) return `${k}: ${norm(v)} vs ${JSON.stringify(got)}`;
  }
  return null;
}
function compare(texts: Input[], label: string, mutate?: (ast: any) => any) {
  const t = { parsed: 0, nodes: 0, nodeDiff: 0, commentDiff: 0, other: 0, okMismatch: 0, threw: 0, notPreorder: 0, cut: 0, thrown: 0, errSame: 0, errDiff: 0 };
  const shown: string[] = [];
  for (const c of texts) {
    let P: any = null;
    try { P = parse(c.src, { jsx: c.tsx }); } catch {}
    let v: any;
    try { v = A.parseTree(c.src, c.tsx); } catch (e: any) { t.threw++; shown.push(`${c.id}: parseTree threw ${e.message}`); continue; }
    if (!P || !v.ok) { if (!P !== !v.ok) t.okMismatch++; continue; }
    t.parsed++;
    const ast = mutate ? mutate(v.ast) : v.ast;
    if (!A.preorder(ast)) t.notPreorder++;
    const acorn = acornOrder(P.program), nodes = A.byNid(ast);
    if (nodes.length !== acorn.length) { t.nodeDiff++; shown.push(`${c.id}: ${nodes.length} nodes vs ${acorn.length}`); continue; }
    for (let i = 0; i < acorn.length; i++) {
      t.nodes++;
      if (nodes[i]?.type === "Other") t.other++;
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
    try { v = A.parseTree(s, c.tsx); } catch { t.errDiff++; continue; }
    if (!thrown) { if (!v.ok) t.errDiff++; continue; }
    t.thrown++;
    if (!v.ok && v.message === thrown.message && v.pos === thrown.pos && v.line === thrown.loc.line && v.column === thrown.loc.column) t.errSame++; else t.errDiff++;
  }
  console.log(`  ${label}: ${texts.length} inputs, ${t.parsed} parse; ${t.nodes} nodes, ${t.nodeDiff} differ; comments differ on ${t.commentDiff}; Other ${t.other}; not preorder ${t.notPreorder}; ok differs ${t.okMismatch}; parseTree threw ${t.threw}; truncations ${t.cut}, ${t.thrown} throw in parse.ts, error value equal ${t.errSame}, differ ${t.errDiff}`);
  for (const s of shown.slice(0, 5)) console.log(`    ${s.slice(0, 300)}`);
  return t;
}
const census = inputs();
const c = compare(census, "census inputs");
ok(c.nodeDiff === 0 && c.commentDiff === 0 && c.other === 0 && c.notPreorder === 0 && c.okMismatch === 0 && c.threw === 0 && c.errDiff === 0 && c.nodes > 0 && c.thrown > 0, `census inputs: ${c.nodes} nodes, 0 differ; ${c.thrown} failing truncations, error values equal`);
const TOOLS = join(HERE, "../..");
const held = readdirSync(TOOLS).filter((f) => /\.tsx?$/.test(f)).sort().map((f) => ({ id: `tools/${f}`, src: readFileSync(join(TOOLS, f), "utf8"), tsx: f.endsWith("x") }));
const h = compare(held, `held out (${held.length} files of tools/)`);
ok(h.nodeDiff === 0 && h.commentDiff === 0 && h.other === 0 && h.notPreorder === 0 && h.okMismatch === 0 && h.threw === 0 && h.errDiff === 0 && h.nodes > 0, `held out: ${h.nodes} nodes, 0 differ; ${h.thrown} failing truncations, error values equal`);
// controls: the copy's first Identifier renamed; one Literal's value changed; a comment dropped
const edit = (f: (s: any) => boolean) => (ast: any) => { const s = JSON.parse(JSON.stringify(ast)); const go = (n: any): boolean => { if (n && typeof n === "object") { if (f(n)) return true; for (const k in n) if (go(n[k])) return true; } return false; }; go(s.program); return s; };
const some = census.slice(300, 320);
const k1 = compare(some, "control: first Identifier renamed", edit((n) => n.type === "Identifier" && ((n.name += "_"), true)));
const k2 = compare(some, "control: first number Literal changed", edit((n) => n.type === "Literal" && typeof n.value === "number" && ((n.value += 1), true)));
ok(k1.nodeDiff === k1.parsed && k1.parsed > 0 && k2.nodeDiff > 0, `controls: a renamed Identifier differs on ${k1.nodeDiff} of ${k1.parsed} inputs, a changed Literal on ${k2.nodeDiff}`);
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
