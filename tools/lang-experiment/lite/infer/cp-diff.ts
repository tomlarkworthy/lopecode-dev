// bun lite/infer/cp-diff.ts: the shipped lite/complete.ts and lite/facts.ts (the cp cells, linked here so a control can
// replace one) against the frozen copies of complete.ts and facts.ts (lite/infer/frozen/ts/, 2026-11-22).
// Completion: at complete-diff.ts's 6475 positions, and at positions it does not reach (type annotations, JSX, parameter
// lists, the cell cut at the cursor, offset 0, the end, cp-probes.ts, with cells in another language, tsx off), the
// result as JSON and the module checks and cells counted. Facts: cellsOf on each source of diff.ts's corpus (its job
// list, copied: diff.ts runs on import), and preludeCalls / globalRefs on each cell for each name it holds.
// --quick: every 7th position; --only-probes; --controls: one cell broken per cp file; --no-facts; --no-complete; --show N; --out f
import { Glob } from "bun";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import * as acorn from "acorn";
import { parse, kids, type Node } from "./frozen/ts/parse.ts";
import * as live from "./frozen/ts/complete.ts";
import * as liveFacts from "./frozen/ts/facts.ts";
import { splitCells } from "./frozen/ts/toolchain/ss-toolchain.ts";
import { lowerJsx } from "./frozen/ts/jsx/lower.ts";
import { checkSources, type Outside, type Sources, type CheckOpts } from "../core.ts";
import { linkAcorn } from "../acorn/index.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { PRELUDE_FNS, OJS_INPUT_GLOBALS } from "../intrinsics.ts";
import { linkCp, type CpLinked } from "./cp-index.ts";
import { completionsAtWith, addParameter, annotationOf, completionWork as cpWork } from "../complete.ts";
import { cellsOf, factsOf as cpFactsOf, preludeCalls, globalRefs } from "../facts.ts";
import { PROBES } from "./cp-probes.ts";
import { reviewedClass } from "./cp-reviewed.ts";
import type { AstNode } from "../acorn/acorn-types.ss.ts";
import type { Ty } from "../types.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const has = (k: string) => process.argv.includes(k);
const SHOW = Number(arg("--show") ?? 5), QUICK = has("--quick");
const OUT = arg("--out") ?? join(import.meta.dir, "../soundscript/.scratch/cp-port/cp-diff.json");
const ROOT = resolve(import.meta.dir, "../..");
const A = linkAcorn();
const L0 = linkCp();

// ---- completion positions ----
type Pos = { file: string; cells: string[]; at: number; off: number; tsx: boolean; tags: string[]; outside?: Outside[] };
const TYPE_KEYS = new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
// every node with the type positions, each with whether it sits in one
function allNodes(n: Node, inType: boolean, out: { n: Node; inType: boolean; parent: Node | null; key: string }[], parent: Node | null = null, key = "") {
  out.push({ n, inType, parent, key });
  for (const k in n) {
    if (k === "loc") continue;
    const v = n[k], t = inType || TYPE_KEYS.has(k) || (typeof n.type === "string" && n.type.startsWith("TS") && n.type !== "TSAsExpression" && n.type !== "TSSatisfiesExpression" && n.type !== "TSNonNullExpression" && k !== "expression");
    if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") allNodes(x, t, out, n, k); }
    else if (v && typeof v === "object" && typeof v.type === "string") allNodes(v, t, out, n, k);
  }
}
function positions(): Pos[] {
  const files = [...new Glob("lite/notebook/examples/*.ts*").scanSync(ROOT), ...new Glob("fixtures/*/*/cells.ts*").scanSync(ROOT)].sort();
  const out: Pos[] = [];
  let corpus = 0;
  const add = (p: Pos) => out.push(p);
  for (const f of files) {
    const tsx = f.endsWith("x");
    const cells = splitCells(readFileSync(join(ROOT, f), "utf8"), tsx);
    for (let at = 0; at < cells.length; at++) {
      const t = cells[at];
      // complete-diff.ts's positions, by the same walk
      const ends = new Set<number>(), optional = new Set<number>();
      const walk = (n: Node) => {
        if (n.type === "Identifier") { ends.add(n.end); ends.add(n.start + 1); }
        if (n.type === "MemberExpression" && !n.computed) { ends.add(n.property.start); if (n.optional) optional.add(n.property.start); }
        kids(n).forEach(walk);
      };
      let P: ReturnType<typeof parse> | null = null;
      try { P = parse(t, { jsx: tsx }); walk(P.program); } catch {}
      for (const off of ends) {
        corpus++;
        add({ file: f, cells, at, off, tsx, tags: ["corpus", ...(optional.has(off) ? ["optional-chain"] : [])] });
        add({ file: f, cells: cells.map((c, i) => (i === at ? c.slice(0, off) : c)), at, off, tsx, tags: ["cut", ...(optional.has(off) ? ["optional-chain"] : [])] });
      }
      add({ file: f, cells, at, off: 0, tsx, tags: ["offset-0"] });
      add({ file: f, cells, at, off: t.length, tsx, tags: ["end"] });
      if (!P) continue;
      const nodes: { n: Node; inType: boolean; parent: Node | null; key: string }[] = [];
      allNodes(P.program, false, nodes);
      const extra = new Map<number, string>();
      for (const { n, inType, parent, key } of nodes) {
        if (inType && n.type === "Identifier") { extra.set(n.end, "type-ann"); extra.set(n.start + 1, "type-ann"); }
        if (n.type === "JSXAttribute") { extra.set(n.start, "jsx-attr"); extra.set(n.name.end, "jsx-attr"); }
        if (n.type === "JSXText" || n.type === "JSXExpressionContainer") { extra.set(n.start + (n.type === "JSXText" ? 0 : 1), "jsx-child"); extra.set(n.end, "jsx-child"); }
        if (parent && key === "params" && (parent.type === "ArrowFunctionExpression" || parent.type === "FunctionExpression" || parent.type === "FunctionDeclaration")) extra.set(n.start, "param-list");
      }
      for (const [off, tag] of extra) if (!ends.has(off)) add({ file: f, cells, at, off, tsx, tags: [tag] });
    }
  }
  for (const p of PROBES) {
    for (const c of p.cells) {
      const off = c.indexOf("‸");
      add({ file: `probe:${p.kind}`, cells: [...p.base, c.split("‸").join("")], at: p.base.length, off, tsx: p.tsx, tags: ["probe", `probe:${p.kind}`] });
    }
  }
  if (corpus !== 6475) console.log(`note: complete-diff.ts's positions are ${corpus} here, not 6475`);
  console.log(`complete-diff.ts positions ${corpus}`);
  return out;
}

// ---- running one position on both sides ----
type Side = { json: string; checks: number; cells: number };
const OUTSIDE: Outside[] = [{ name: "o_num" }, { name: "o_list", view: true }, { name: "o_obj" }, { name: "o_fn" }, { name: "o_throws" }, { name: "now" }, { name: "count" }, { name: "o_empty" }, { name: "o_undef" }];
const VALUES: Record<string, unknown> = { o_num: 3, o_list: [{ item: "tea", qty: 2 }], o_obj: { a: 1, b: "x" }, o_fn: () => 1, count: 2 };
const annotate = (n: string) => { if (n === "o_throws") throw new Error("no value"); if (n === "o_empty") return ""; if (n === "o_undef") return undefined as unknown as null; return live.annotationOf(VALUES[n]); };
function liveSide(p: Pos, tsx: boolean, outside: Outside[] | null): Side {
  const c0 = live.completionWork.checks, k0 = live.completionWork.cells;
  let json: string;
  try { json = JSON.stringify(live.completionsAt(p.cells, p.at, p.off, tsx, outside, outside ? annotate : null)); } catch (x) { json = `threw ${(x as Error).message}`; }
  return { json, checks: live.completionWork.checks - c0, cells: live.completionWork.cells - k0 };
}
// the cp side, with what the probe found (for the kind of the position) and how many copies it checked
// probes: the copies checked; answered: which of them (from 1) the probe was found in, 0 for none
type Seen = { found: unknown; probes: number; answered: number; expand: ((t: Ty) => Ty) | null };
function cpSide(L: CpLinked, p: Pos, tsx: boolean, outside: Outside[] | null, seen: Seen | null = null): Side {
  const c0 = cpWork.checks, k0 = cpWork.cells;
  const check = (src: Sources, opts: CheckOpts) => {
    if (seen && opts.probe) seen.probes++;
    const r = checkSources(src, opts);
    const pr = r.probe;
    if (seen && opts.probe && pr?.found) { seen.found = pr.found; seen.answered = seen.probes; seen.expand = (t) => pr.reg.expand(t); }
    return r;
  };
  let json: string;
  try { json = JSON.stringify(completionsAtWith(L, p.cells, p.at, p.off, tsx, outside, outside ? annotate : null, check)); } catch (x) { json = `threw ${(x as Error).message}`; }
  return { json, checks: cpWork.checks - c0, cells: cpWork.cells - k0 };
}
const HANDLES = ["State", "Events", "Mut", "Borrowed", "StateCell", "Action", "Listener", "Promise", "Map", "Set"];
// the receiver's type: a handle or wrapper by name, an alias or interface by what it expands to
const recvKind = (t: Ty, expand: ((t: Ty) => Ty) | null): string => {
  if (t.k !== "named") return t.k;
  if (HANDLES.includes(t.n)) return `named:${t.n}`;
  const x = expand ? expand(t) : t;
  return x.k === "named" ? (HANDLES.includes(x.n) ? `named:${x.n}` : "interface") : x.k;
};
function kindsOf(p: Pos, res: string, seen: Seen, withOutside: boolean, tsxOff: boolean): string[] {
  const ks = withOutside ? ["rerun:param+outside"] : tsxOff ? ["rerun:tsx-off"] : [...p.tags];
  if (res.startsWith("threw")) return [...ks, "threw"];
  const r = JSON.parse(res);
  ks.push(`mode:${r.mode}`);
  const f = seen.found as { k: string; t?: Ty; names?: { name: string; kind: string }[]; inAction?: boolean } | null;
  if (r.mode === "member" && f && f.k === "member" && f.t) ks.push(`member:${recvKind(f.t, seen.expand)}`);
  if (r.mode === "name" && f && f.k === "name") {
    const offered = new Set(r.options.map((o: { label: string }) => o.label));
    for (const k of new Set((f.names ?? []).filter((b) => offered.has(b.name)).map((b) => b.kind))) ks.push(`name:${k}`);
    if (f.inAction) ks.push("name:in-action");
  }
  if (r.mode === "name" || r.mode === "member") ks.push(seen.probes === 0 ? "copy:none checked" : seen.answered === 0 ? `copy:none of ${seen.probes} answered` : `copy:${seen.answered} answered`);
  if (r.mode === "param") for (const o of r.options) ks.push(`param:${String(o.detail).split(":")[0]}`);
  return [...new Set(ks)];
}

type Tally = Map<string, { same: number; diff: number; withOptions: number; notProbe: number }>;
const bump = (t: Tally, k: string, same: boolean, withOptions: boolean, probe: boolean) => { const e = t.get(k) ?? { same: 0, diff: 0, withOptions: 0, notProbe: 0 }; if (same) e.same++; else e.diff++; if (withOptions) e.withOptions++; if (!probe) e.notProbe++; t.set(k, e); };
function completionPass(L: CpLinked, ps: Pos[], label: string, withKinds: boolean): { same: number; diff: number; reviewed: Map<string, number>; tally: Tally; shown: string[] } {
  let same = 0, diff = 0;
  const reviewed = new Map<string, number>();
  const tally: Tally = new Map(), shown: string[] = [];
  const one = (p: Pos, tsx: boolean, outside: Outside[] | null) => {
    const seen: Seen = { found: null, probes: 0, answered: 0, expand: null };
    const a = liveSide(p, tsx, outside), b = cpSide(L, p, tsx, outside, seen);
    const ok = a.json === b.json && a.checks === b.checks && a.cells === b.cells;
    const rc = ok ? null : reviewedClass(p.cells[p.at], p.off, tsx, p.tsx, a.json, b.json);
    if (rc !== null) reviewed.set(rc, (reviewed.get(rc) ?? 0) + 1);
    else if (ok) same++; else { diff++; if (shown.length < SHOW) shown.push(`${label} ${p.file} cell ${p.at} @${p.off} [${p.tags}] tsx ${tsx} outside ${!!outside}\n  complete.ts ${a.json.slice(0, 400)} checks ${a.checks} cells ${a.cells}\n  cp          ${b.json.slice(0, 400)} checks ${b.checks} cells ${b.cells}`); }
    const n = a.json.startsWith("threw") ? 0 : JSON.parse(a.json).options.length;
    if (withKinds) for (const k of kindsOf(p, a.json, seen, !!outside, !tsx && p.tsx)) bump(tally, k, ok, n > 0, p.tags.includes("probe"));
    return a.json;
  };
  for (const p of ps) {
    const res = one(p, p.tsx, null);
    if (!res.startsWith("threw") && JSON.parse(res).mode === "param") one(p, p.tsx, OUTSIDE);
    if (p.tsx && p.tags.some((t) => t.startsWith("jsx"))) one(p, false, null);
  }
  return { same, diff, reviewed, tally, shown };
}

// addParameter and annotationOf on their own inputs: every cell text with each name it reads, a fresh name, annotated or not
function editPass(L: CpLinked, ps: Pos[]): { same: number; diff: number; shown: string[] } {
  const cp = { add: (s: string, n: string, a: string | null) => addParameter(s, n, a, L), ann: (v: unknown) => annotationOf(v, L) };
  let same = 0, diff = 0;
  const shown: string[] = [];
  const cmp = (what: string, a: unknown, b: unknown) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x === y) same++; else { diff++; if (shown.length < SHOW) shown.push(`${what}\n  complete.ts ${x}\n  cp          ${y}`); } };
  const texts = [...new Set(ps.map((p) => p.cells[p.at]))];
  for (const t of texts) {
    let names = ["w", "fresh_name"];
    try { const P = parse(t, { jsx: true }); const ns: { n: Node; inType: boolean; parent: Node | null; key: string }[] = []; allNodes(P.program, false, ns); names = [...names, ...new Set(ns.filter((x) => x.n.type === "Identifier").map((x) => x.n.name as string))].slice(0, 12); } catch {}
    for (const n of names) for (const a of [null, "", "number", "{ a: string }[]"]) cmp(`addParameter ${JSON.stringify(t.slice(0, 80))} ${n} ${a}`, live.addParameter(t, n, a), cp.add(t, n, a));
  }
  const cls = new (class K { x = 1; })();
  const zoo: unknown[] = [1.5, "a", false, [1, 2], [["a"], ["b"]], { x: 1, y: "b" }, [{ x: 1 }, { x: 2 }], [], [1, "a"], null, undefined, () => 1, new Map(), new Date(), {}, { "a-b": 1 },
    Promise.resolve(1), { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 }, Object.create(null), Object.assign(Object.create(null), { a: 1 }), cls, [[[[1]]]], [[[1]]], { a: { b: { c: 1 } } }, { a: { b: { c: { d: 1 } } } },
    Array.from({ length: 1001 }, () => 1), Array.from({ length: 1000 }, () => 1), { abcdefghijklmnopqrst: "x".repeat(10), b: [{ c: 1, d: "e", f: true, g: 1, h: 2, i: 3, j: 4, k: 5 }] }, [undefined], [null], 1n, Symbol("s"), new Float64Array(2), { $a: 1, _b: 2 }, { "1a": 1 }, [{ a: 1 }, { a: "x" }], [true, false], NaN];
  for (const v of zoo) cmp(`annotationOf ${String(typeof v === "symbol" ? "symbol" : typeof v === "bigint" ? "bigint" : JSON.stringify(v))?.slice(0, 60)}`, live.annotationOf(v), cp.ann(v));
  return { same, diff, shown };
}

// ---- facts: diff.ts's corpus, the sources only ----
function headerEnd(src: string): number { let at = 0; for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; } return at; }
function corpusSources(): { key: string; text: string; tsx: boolean }[] {
  const out: { key: string; text: string; tsx: boolean }[] = [];
  const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const dirs = new Set<string>();
  for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
    for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
  for (const d of [...dirs].sort()) {
    const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
    out.push({ key: `port:${d.slice(ROOT.length + 1)}`, text: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx });
    for (const f of ["foreign.d.ts", "shell.ts"]) { const s = read(d, f); if (s !== null) out.push({ key: `port:${d.slice(ROOT.length + 1)}/${f}`, text: s, tsx: false }); }
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) out.push({ key: `file:${f}`, text: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx") });
  for (const g of ["lite/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts", "lite/acorn/*.ss.ts", "lite/infer/*.ss.ts"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
      const text = readFileSync(join(ROOT, f), "utf8");
      out.push({ key: `ss:${f}`, text, tsx: false });
      try { for (const [i, c] of splitCells(text.slice(headerEnd(text)).trimStart(), false).entries()) out.push({ key: `cell:${f}#${i}`, text: c, tsx: false }); } catch {}
    }
  for (const [i, c] of specRejects().entries()) out.push({ key: `reject:${c.statement}#${i}`, text: c.source, tsx: true });
  for (const f of ["spec.ojs", "tutorial.ojs", "checker-tests.ojs", "runtime-tests.ojs", "core.ojs", ...readdirSync(join(ROOT, "lite/soundscript/sections")).map((x) => "sections/" + x)]) {
    const p = join(ROOT, "lite/soundscript", f);
    if (!existsSync(p) || !statSync(p).isFile()) continue;
    for (const cell of readFileSync(p, "utf8").split(/^\/\/ %%$/m)) {
      let ast: any;
      try { ast = acorn.parse(cell.replace(/^\s*viewof\s+/m, "").replace(/^\s*mutable\s+/m, ""), { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true }); } catch { continue; }
      (function walk(n: any) {
        if (!n || typeof n.type !== "string") return;
        let s: string | null = null;
        if (n.type === "TemplateLiteral" && n.expressions.length === 0) s = n.quasis[0].value.cooked;
        if (n.type === "Literal" && typeof n.value === "string") s = n.value;
        if (s && /=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) out.push({ key: `inline:${f}#${Bun.hash(s).toString(36)}`, text: s, tsx: true });
        for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
      })(ast);
    }
  }
  const tut = join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json");
  if (existsSync(tut)) for (const [i, t] of (JSON.parse(readFileSync(tut, "utf8")).texts as string[]).entries()) out.push({ key: `tutorial#${i}`, text: t, tsx: true });
  // ss-toolchain.ts reads the facts of a lowered JSX text
  const lowered = out.filter((s) => s.tsx).flatMap((s) => { try { return [{ key: `lowered:${s.key}`, text: lowerJsx(s.text), tsx: false }]; } catch { return []; } });
  return [...out, ...lowered];
}
type FactTally = { sources: number; same: number; diff: number; bothThrew: number; cells: number; calls: { same: number; diff: number; sets: number; entries: number }; factsOf: { same: number; diff: number }; shown: string[] };
function factsPass(L: CpLinked, srcs: { key: string; text: string }[]): FactTally {
  const T: FactTally = { sources: 0, same: 0, diff: 0, bothThrew: 0, cells: 0, calls: { same: 0, diff: 0, sets: 0, entries: 0 }, factsOf: { same: 0, diff: 0 }, shown: [] };
  const note = (s: string) => { if (T.shown.length < SHOW) T.shown.push(s); };
  for (const s of srcs) {
    T.sources++;
    let a: string, b: string, P: ReturnType<typeof parse> | null = null;
    try { P = parse(s.text); a = JSON.stringify(liveFacts.cellsOf(s.text)); } catch (x) { a = `threw ${(x as Error).message}`; }
    try { b = JSON.stringify(cellsOf(s.text, L)); } catch (x) { b = `threw ${(x as Error).message}`; }
    if (a === b) { if (a.startsWith("threw")) T.bothThrew++; else T.same++; } else { T.diff++; note(`cellsOf ${s.key}\n  facts.ts ${a.slice(0, 300)}\n  cp       ${b.slice(0, 300)}`); }
    if (!P) continue;
    // preludeCalls and globalRefs: the same cells on both trees, by order
    const tp = A.parseTree(s.text, false);
    if (!tp.ok) continue;
    const pFns: Node[] = [], tFns: AstNode[] = [];
    for (const st of P.program.body as Node[]) { const d = st.type === "ExportNamedDeclaration" ? st.declaration : st; if (d?.type === "FunctionDeclaration") pFns.push(d); else if (d?.type === "VariableDeclaration") for (const x of d.declarations) if (x.id.type === "Identifier" && x.init && /^(Arrow)?FunctionExpression$/.test(x.init.type)) pFns.push(x.init); }
    const byNid = A.byNid(tp.ast);
    const prog = tp.ast.program;
    const tDefs = prog.type === "Program" ? prog.body.flatMap((st) => L.cpStatementDefs(st)) : [];
    for (const d of tDefs) tFns.push(d.fn);
    if (pFns.length !== tFns.length) { T.calls.diff++; note(`${s.key}: ${pFns.length} cells on parse.ts, ${tFns.length} on the typed tree`); continue; }
    T.cells += pFns.length;
    for (let i = 0; i < pFns.length; i++) {
      // factsOf alone, without its statement (no span) and with it
      const name = tDefs[i].name;
      const fa = JSON.stringify(liveFacts.factsOf(name, pFns[i])), fb = JSON.stringify(cpFactsOf(name, tDefs[i].fn, undefined, L));
      if (fa === fb) T.factsOf.same++; else { T.factsOf.diff++; note(`factsOf ${s.key} ${name}\n  facts.ts ${fa}\n  cp       ${fb}`); }
      const idents = new Set<string>();
      const w = (n: Node) => { if (n.type === "Identifier") idents.add(n.name); for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && w(x)); else if (v && typeof v === "object" && typeof v.type === "string") w(v); } };
      w(pFns[i]);
      for (const name of new Set([...PRELUDE_FNS, ...OJS_INPUT_GLOBALS, "h", "compile", ...idents])) {
        for (const [what, x, y] of [["preludeCalls", liveFacts.preludeCalls(pFns[i], name), preludeCalls(tFns[i], name, L)], ["globalRefs", liveFacts.globalRefs(pFns[i], name), globalRefs(tFns[i], name, L)]] as const) {
          T.calls.sets++;
          const pa = [...(x as Set<Node>)].map((n) => `${n.start}:${n.end}:${n.type}`).join(" ");
          const pb = [...(y as Set<number>)].map((nid) => { const n = byNid[nid]; return n ? `${n.start}:${n.end}:${n.type}` : `nid${nid}`; }).join(" ");
          T.calls.entries += (x as Set<Node>).size;
          if (pa === pb) T.calls.same++; else { T.calls.diff++; note(`${what} ${s.key} cell ${i} ${name}\n  facts.ts ${pa}\n  cp       ${pb}`); }
        }
      }
    }
  }
  return T;
}

// ---- controls: one cell replaced per cp file, in a separate link ----
const CONTROLS: { file: string; what: string; over: Record<string, (...inputs: never[]) => unknown>; on: "complete" | "edit" | "facts" }[] = [
  { file: "cp-text", what: "cpNoOffer never stops", over: { cpNoOffer: () => () => false }, on: "complete" },
  { file: "cp-members", what: "cpKindOf always property", over: { cpKindOf: () => () => "property" }, on: "complete" },
  { file: "cp-modes", what: "cpByLabel does not sort", over: { cpByLabel: () => (xs: unknown) => xs }, on: "complete" },
  { file: "cp-param", what: "cpAddParameter without the already-there check", over: { cpAddParameter: (cpHeadOf: (at: unknown, s: string) => { list: { from: number; kids: { name: string; from: number; to: number }[] } } | null) => (at: unknown, source: string, name: string, annotation: string | null) => {
    const head = cpHeadOf(at, source);
    const close = head?.list.kids.find((k) => k.name === ")");
    if (!head || !close) return null;
    const param = annotation !== null && annotation !== "" ? `${name}: ${annotation}` : name;
    const last = head.list.kids.filter((k) => k.to <= close.from && k.name !== "⚠").at(-1);
    if (last === undefined || last.name === "(") return { from: head.list.from + 1, to: close.from, insert: param };
    return { from: last.to, to: last.to, insert: last.name === "," ? ` ${param}` : `, ${param}` };
  } } as never, on: "edit" },
  { file: "cp-facts", what: "cpStatementDefs without function declarations", over: { cpStatementDefs: () => (st: { type: string; declaration?: { type: string; declarations: { type: string; id: { type: string; name: string }; init: { type: string } | null }[] } | null }) => {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration ?? null : st as never;
    if (d === null || d.type !== "VariableDeclaration") return [];
    return d.declarations.flatMap((x) => (x.type === "VariableDeclarator" && x.id.type === "Identifier" && x.init !== null && (x.init.type === "ArrowFunctionExpression" || x.init.type === "FunctionExpression") ? [{ name: x.id.name, fn: x.init, stmt: st }] : []));
  } } as never, on: "facts" },
];

// ---- main ----
const report: Record<string, unknown> = {};
const lines: string[] = [];
const say = (s: string) => { lines.push(s); console.log(s); };
let all: Pos[] = [];
if (!has("--no-complete")) {
  all = positions();
  const ps = has("--only-probes") ? all.filter((p) => p.tags.includes("probe")) : QUICK ? all.filter((_, i) => i % 7 === 0) : all;
  const t0 = performance.now();
  const r = completionPass(L0, ps, "complete", true);
  say(r.shown.join("\n"));
  const rv = [...r.reviewed];
  say(`completion: ${ps.length} positions (and their reruns with outside cells / tsx off): SAME ${r.same} DIFFERENT ${r.diff} REVIEWED ${rv.reduce((x, [, k]) => x + k, 0)}${rv.length ? ` (${rv.map(([c, k]) => `${c} ${k}`).join("; ")})` : ""}; ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  const rows = [...r.tally].sort((a, b) => a[0].localeCompare(b[0]));
  say(`by kind (a position counts under each kind it has): kind SAME DIFFERENT, positions with at least one option, positions not from cp-probes.ts`);
  for (const [k, v] of rows) say(`  ${k.padEnd(30)} ${String(v.same).padStart(6)} ${String(v.diff).padStart(4)} ${String(v.withOptions).padStart(6)} ${String(v.notProbe).padStart(6)}${v.same + v.diff < 20 ? "   (fewer than 20)" : ""}`);
  const e = editPass(L0, all);
  say(e.shown.join("\n"));
  say(`addParameter / annotationOf: SAME ${e.same} DIFFERENT ${e.diff}`);
  report.completion = { same: r.same, different: r.diff, kinds: Object.fromEntries(rows), edits: { same: e.same, different: e.diff } };
}
let srcs: { key: string; text: string; tsx: boolean }[] = [];
if (!has("--no-facts")) {
  srcs = corpusSources();
  const f = factsPass(L0, srcs);
  say(f.shown.join("\n"));
  say(`facts: ${f.sources} sources: cellsOf SAME ${f.same} DIFFERENT ${f.diff} (both threw ${f.bothThrew}); ${f.cells} cells, preludeCalls/globalRefs sets SAME ${f.calls.same} DIFFERENT ${f.calls.diff} (${f.calls.sets} sets, ${f.calls.entries} entries); factsOf without a statement SAME ${f.factsOf.same} DIFFERENT ${f.factsOf.diff}`);
  report.facts = f;
}
if (has("--controls")) {
  const cps = (all.length ? all : positions()).filter((_, i) => i % 11 === 0);
  const fs = (srcs.length ? srcs : corpusSources()).filter((_, i) => i % 5 === 0);
  for (const c of CONTROLS) {
    const L = linkCp(c.over);
    const d = c.on === "complete" ? completionPass(L, cps, "control", false).diff : c.on === "edit" ? editPass(L, cps).diff : (() => { const t = factsPass(L, fs); return t.diff + t.calls.diff + t.factsOf.diff; })();
    say(`control ${c.file} (${c.what}): DIFFERENT ${d} on ${c.on === "facts" ? `${fs.length} sources` : `${cps.length} positions`}`);
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1));
writeFileSync(OUT.replace(/\.json$/, ".txt"), lines.join("\n") + "\n");
