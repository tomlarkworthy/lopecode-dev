// bun lite/infer/diff.ts [--rounds R] [--control] [--hits] [--only <key part>] [--file f]... [--show N] [--out file]: the real Checker
// and the port on the same cell, over the corpus of lite/soundscript/.scratch/checker-port/collect.ts. The port
// runs inside the real checker's top-level fnExpr call (the cell's), on the same registry, injected types and
// parse; the registry's memos are put back before the real call. Per cell: SAME, DIFFERENT, NOT COVERED (the port
// met something it does not implement) or REAL CRASH (both threw the same message; a different throw is DIFFERENT).
// Compared: every diagnostic and every unsupported item, each list in order, as rule, line, node span and message,
// and the function type. Type variables are renumbered by first appearance on each side (the real counter is
// module state). Run from tools/lang-experiment; the corpus includes the git-ignored lite/soundscript/.scratch/
// checker-port/probes, so a clean checkout counts fewer cells.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { Glob } from "bun";
import * as acorn from "acorn";
import { checkSources } from "../core.ts";
import { Checker } from "../infer.ts";
import { parse, type Parsed } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { show, type Ty } from "../types.ts";
import { ALLOWED_GLOBALS } from "../intrinsics.ts";
import { linkAcorn } from "../acorn/index.ts";
import { linkIx, runIx, IX_FILES, IX_CELLS, type IxLinked, type CompileHook } from "./index.ts";
import type { AstNode, Ast } from "../acorn/acorn-types.ss.ts";
import type { IxOutput } from "./ix-types.ss.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 1), ONLY = arg("--only"), SHOW = Number(arg("--show") ?? 10);
const OUT = arg("--out") ?? join(import.meta.dir, "../soundscript/.scratch/infer-port/diff.json");
const ROOT = resolve(import.meta.dir, "../..");
const A = linkAcorn();

// ---- the corpus (collect.ts's jobs; ss sections split as ts-cells.ts ssCellTexts does) ----
type Job = { key: string; run: () => unknown };
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const ssTexts = (rel: string) => { const s = readFileSync(join(ROOT, "lite", rel), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
let curTsx = true;
const run = (tsx: boolean, f: () => unknown) => () => { curTsx = tsx; return f(); };
function jobs(): Job[] {
  const out: Job[] = [];
  const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const dirs = new Set<string>();
  for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
    for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
  for (const d of [...dirs].sort()) {
    const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
    const src = { cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read(d, "foreign.d.ts"), shell: read(d, "shell.ts"), name: d };
    out.push({ key: `port:${d.slice(ROOT.length + 1)}`, run: run(tsx, () => checkSources(src, {})) });
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
      const cells = readFileSync(join(ROOT, f), "utf8"), tsx = f.endsWith(".tsx");
      out.push({ key: `file:${f}`, run: run(tsx, () => checkSources({ cells, tsx, name: f })) });
    }
  // checkCells (stdlib/runtime.ts) without its fallback for a text that does not parse: such a source is skipped
  const cellsJob = (texts: string[], tsx: boolean) => run(tsx, () => checkSources({ cells: texts.join("\n\n"), tsx }));
  for (const g of ["lite/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts"]) for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push({ key: `ss${tsx ? "x" : ""}:${f}`, run: () => cellsJob(splitCells(text, tsx), tsx)() });
  }
  const ACORN_WITH: Record<string, string[]> = { "acorn/acorn-kids.ss.ts": ["acorn/acorn-types.ss.ts"], "acorn/acorn.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts"], "acorn/syntax.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "messages.ss.ts"] };
  const ACORN_SHELL: Record<string, string> = { "acorn/acorn.ss.ts": "acorn/acorn-shell.ts", "acorn/syntax.ss.ts": "acorn/acorn-shell.ts" };
  for (const f of [...new Glob("lite/acorn/*.ss.ts").scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push({ key: `ss${tsx ? "x" : ""}:${f}`, run: () => cellsJob(splitCells(text, tsx), tsx)() });
    const rel = f.slice("lite/".length);
    const shell = ACORN_SHELL[rel] ? readFileSync(join(ROOT, "lite", ACORN_SHELL[rel]), "utf8") : null;
    out.push({ key: `sswith:${f}`, run: run(true, () => checkSources({ cells: [...(ACORN_WITH[rel] ?? []), rel].flatMap(ssTexts).join("\n\n"), tsx: true, shell, name: rel })) });
  }
  for (const [i, c] of specRejects().entries())
    out.push({ key: `reject:${c.statement}#${i}`, run: run(true, () => checkSources({ cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" })) });
  // collect.ts's inline jobs: code held in string literals of the .ojs files, chosen as collect.ts chooses them
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
        if (s && /=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) {
          const text = s;
          out.push({ key: `inline:${f}#${Bun.hash(text).toString(36)}`, run: run(true, () => checkSources({ cells: text, tsx: true, name: "i" })) });
        }
        for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
      })(ast);
    }
  }
  // --file f: one more source, checked as a cells file (the repros under repro/)
  for (const f of process.argv.flatMap((a, i) => (process.argv[i - 1] === "--file" ? [a] : []))) {
    const cells = readFileSync(f, "utf8"), tsx = f.endsWith(".tsx");
    out.push({ key: `extra:${f}`, run: run(tsx, () => checkSources({ cells, tsx, name: f })) });
  }
  return ONLY ? out.filter((j) => j.key.includes(ONLY)) : out;
}

// ---- the seam ----
type Side = { diags: string[]; unsup: string[]; fn: string | null };
type Rec = { job: string; at: number; bucket: "SAME" | "DIFFERENT" | "NOT COVERED" | "REAL CRASH"; why?: string; real?: Side; port?: Side; portUs: number; runUs: number; realUs: number };
// type variables renumbered by first appearance on each side, so two distinct ones stay distinct
function renumber(s: Side): Side {
  const ids = new Map<string, number>();
  const one = (x: string) => x.replace(/'\d+/g, (m) => { if (!ids.has(m)) ids.set(m, ids.size + 1); return `'${ids.get(m)}`; });
  return { diags: s.diags.map(one), unsup: s.unsup.map(one), fn: s.fn === null ? null : one(s.fn) };
}
const trees = new WeakMap<Parsed, { ast: Ast; fns: Map<string, AstNode> }>();
function treeOf(P: Parsed, tsx: boolean) {
  const hit = trees.get(P);
  if (hit) return hit;
  const r = A.parseTree(P.src, tsx);
  if (!r.ok) throw new Error(`parseTree: ${r.message}`);
  const fns = new Map<string, AstNode>();
  const walk = (n: AstNode) => { if (A.isFnNode(n)) fns.set(`${n.start}:${n.end}:${n.type}`, n); for (const k of A.childrenOf(n)) walk(k.node); };
  walk(r.ast.program);
  const t = { ast: r.ast, fns };
  trees.set(P, t);
  return t;
}
// core.ts's hook closes over the real checker; for the port's call its three methods are the port's, for that call only
const lend = (ch: Checker): CompileHook | null => {
  const h = ch.compileHook;
  if (!h) return null;
  return (e, lent) => {
    const self = ch as unknown as Record<string, unknown>;
    self.infer = lent.infer; self.err = lent.err; self.unsupported = lent.unsupported;
    try { return h(e, null as never); } finally { delete self.infer; delete self.err; delete self.unsupported; }
  };
};
let L: IxLinked = linkIx();
let job = "", active = true;
let records: Rec[] = [];
const orig = Checker.prototype.fnExpr;
Checker.prototype.fnExpr = function (this: Checker, e: any, env: any, expected: any, cell?: { injected: Ty[] }) {
  if (!active || !cell || env !== null) return orig.call(this, e, env, expected, cell);
  const reg = this.reg, P = this.parsed;
  const memo = [new Map(reg.expandMemo), new Map(reg.ifaceMemo), new Set(reg.quietKeys)] as const;
  let port: IxOutput | null = null, portCrash: string | null = null, portMsg: string | null = null;
  const t0 = performance.now();
  let runUs = 0;
  try {
    const { ast, fns } = treeOf(P, curTsx);
    const fn = fns.get(`${e.start}:${e.end}:${e.type}`);
    if (!fn) throw new Error("no typed node for the cell's function");
    const tr = performance.now();
    port = runIx(L, reg, P, { fn, injected: cell.injected, src: P.src, count: ast.count, cellNames: this.cellNames, allowed: ALLOWED_GLOBALS }, lend(this));
    runUs = (performance.now() - tr) * 1000;
  } catch (x) { portMsg = (x as Error).message; portCrash = (x as Error).stack?.split("\n").slice(0, 3).join(" | ") ?? String(x); }
  const portUs = (performance.now() - t0) * 1000;
  reg.expandMemo.clear(); for (const [k, v] of memo[0]) reg.expandMemo.set(k, v);
  reg.ifaceMemo.clear(); for (const [k, v] of memo[1]) reg.ifaceMemo.set(k, v);
  reg.quietKeys.clear(); for (const k of memo[2]) reg.quietKeys.add(k);
  const d0 = this.diags.length, u0 = this.unsup.length;
  const t1 = performance.now();
  let res: Ty | undefined, realCrash: unknown = null;
  try { res = orig.call(this, e, env, expected, cell); } catch (x) { realCrash = x; }
  const realUs = (performance.now() - t1) * 1000;
  const fmt = (d: { rule: string; msg: string }, start: number, end: number) => `${d.rule} L${P.line(start)} @${start}-${end} ${d.msg}`;
  const rec: Rec = { job, at: e.start, bucket: "SAME", portUs, runUs, realUs };
  // a real crash is matched only by the port throwing the same message
  if (realCrash) {
    const same = portMsg === (realCrash as Error).message;
    rec.bucket = same ? "REAL CRASH" : "DIFFERENT";
    rec.why = same ? "port crashed the same" : `real crashed: ${(realCrash as Error).message}; port: ${portMsg ?? "no crash"}`;
  }
  else {
    const real: Side = { diags: this.diags.slice(d0).map((d) => fmt(d, d.node.start, d.node.end)), unsup: this.unsup.slice(u0).map((d) => fmt(d, d.node.start, d.node.end)), fn: res ? show(res) : null };
    rec.real = renumber(real);
    if (portCrash !== null || port === null) { rec.bucket = "DIFFERENT"; rec.why = `port crashed: ${portCrash}`; }
    else if (port.gap !== null) { rec.bucket = "NOT COVERED"; rec.why = port.gap; }
    else {
      const ps: Side = { diags: port.diags.map((d) => fmt(d, d.start, d.end)), unsup: port.unsup.map((d) => fmt(d, d.start, d.end)), fn: show(port.fn) };
      rec.port = renumber(ps);
      if (JSON.stringify(rec.port) !== JSON.stringify(rec.real)) rec.bucket = "DIFFERENT";
    }
  }
  records.push(rec);
  if (realCrash) throw realCrash;
  return res;
} as typeof orig;

// a source's whole result as collect.ts prints it
const summ = (r: any): string[] => [
  ...r.module.map((e: any) => `module [${e.rule}] L${e.line} ${e.msg}`),
  ...r.cells.map((c: any) => [`${c.name}: ${c.status} L${c.line} : ${c.value ?? "-"} ${(c.blockedBy ?? []).join(",")}`,
    ...c.errors.map((e: any) => `  [${e.rule}] L${e.line} ${e.msg}`), ...(c.unsupported ?? []).map((u: any) => `  [unsupported] L${u.line} ${u.msg}`)].join("\n")),
];
function pass(js: Job[]): { recs: Rec[]; jobCrash: string[]; ms: number; results: Map<string, string> } {
  records = [];
  const jobCrash: string[] = [], results = new Map<string, string>();
  const t0 = performance.now();
  for (const j of js) {
    job = j.key;
    try { results.set(j.key, summ(j.run()).join("\n")); } catch (x) { jobCrash.push(`${j.key}: ${(x as Error).message.slice(0, 120)}`); results.set(j.key, "threw"); }
  }
  return { recs: records, jobCrash, ms: performance.now() - t0, results };
}
const count = (rs: Rec[]) => { const c: Record<string, number> = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0, "REAL CRASH": 0 }; for (const r of rs) c[r.bucket] = (c[r.bucket] ?? 0) + 1; return c; };
const tally = (xs: string[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

const files = IX_FILES.map((f) => `${f}:${Bun.hash(readFileSync(join(import.meta.dir, f), "utf8")).toString(36)}`);
console.log(`ix files ${files.join(" ")}`);
console.log(`infer.ts ${Bun.hash(readFileSync(join(ROOT, "lite/infer.ts"), "utf8")).toString(36)} core.ts ${Bun.hash(readFileSync(join(ROOT, "lite/core.ts"), "utf8")).toString(36)}`);
const JOBS = jobs();
// the real checker alone first: what core.ts gives with no port run, to hold the wrapped pass's results against
active = false;
const alone = pass(JOBS);
active = true;
const first = pass(JOBS);
// type variable numbers come from infer.ts's module counter, which the earlier pass advanced
const tvs = (x: string | undefined) => (x ?? "").replace(/'\d+/g, "'");
const changed = [...alone.results].filter(([k, v]) => tvs(first.results.get(k)) !== tvs(v)).map(([k]) => k);
const digest = Bun.hash([...alone.results].map(([k, v]) => `${k}\n${tvs(v)}`).join("\n\n")).toString(36);
if (process.argv.includes("--residue")) for (const k of changed) {
  const a = tvs(alone.results.get(k)).split("\n"), b = tvs(first.results.get(k)).split("\n");
  console.log(`residue ${k}\n  alone   ${a.filter((x) => !b.includes(x)).join(" / ")}\n  wrapped ${b.filter((x) => !a.includes(x)).join(" / ")}`);
}
console.log(`corpus results digest ${digest} (real checker alone); sources whose result the port's run changed: ${changed.length}${changed.length ? " " + changed.slice(0, 5).join(" ") : ""}`);
const c = count(first.recs);
console.log(`${JOBS.length} sources, ${first.recs.length} cells: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]} REAL CRASH ${c["REAL CRASH"]}; sources that threw ${first.jobCrash.length}`);
for (const x of first.jobCrash.slice(0, 5)) console.log(`  threw ${x}`);
for (const [k, n] of tally(first.recs.filter((r) => r.bucket === "REAL CRASH").map((r) => r.why ?? ""))) console.log(`  real crash ${n}: ${k}`);
console.log("not covered, by construct:");
for (const [k, n] of tally(first.recs.filter((r) => r.bucket === "NOT COVERED").map((r) => r.why ?? "")).slice(0, 15)) console.log(`  ${String(n).padStart(5)} ${k}`);
const diffs = first.recs.filter((r) => r.bucket === "DIFFERENT");
for (const r of diffs.slice(0, SHOW)) {
  console.log(`DIFFERENT ${r.job} @${r.at}${r.why ? " " + r.why : ""}`);
  if (!r.port || !r.real) continue;
  const rp = r.port, rr = r.real;
  for (const k of ["diags", "unsup"] as const) {
    const a = rr[k].filter((x) => !rp[k].includes(x)), b = rp[k].filter((x) => !rr[k].includes(x));
    if (a.length || b.length || rr[k].join() !== rp[k].join()) console.log(`  ${k} real-only ${JSON.stringify(a)} port-only ${JSON.stringify(b)}${!a.length && !b.length ? " (order)" : ""}`);
  }
  if (rr.fn !== rp.fn) console.log(`  fn real ${rr.fn}\n     port ${rp.fn}`);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(first.recs, null, 1));

if (ROUNDS > 1) {
  const port: number[] = [], run: number[] = [], real: number[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const p = pass(JOBS).recs.filter((r) => r.bucket === "SAME");
    port.push(p.reduce((s, r) => s + r.portUs, 0) / p.length);
    run.push(p.reduce((s, r) => s + r.runUs, 0) / p.length);
    real.push(p.reduce((s, r) => s + r.realUs, 0) / p.length);
  }
  const mm = (xs: number[]) => `${Math.min(...xs).toFixed(1)}–${Math.max(...xs).toFixed(1)}`;
  console.log(`µs per SAME cell over ${ROUNDS} rounds: port with typed parse ${mm(port)}, port (runIx) ${mm(run)}, real ${mm(real)}; the port runs first`);
}
if (process.argv.includes("--control")) {
  // the control: ixArity without its "at most" check, in a linked copy; the shipped cell is not touched
  L = linkIx({
    ixArity: (ixErr: any) => (K: any, C: any, e: any, args: any[], sig: any) => {
      const required = sig.ps.filter((p: any) => !p.opt).length;
      if (args.length < required && !args.some((a: any) => a.type === "SpreadElement")) ixErr(K, C, e, "arity", `expected at least ${required} arguments, got ${args.length}`);
    },
  });
  const m = pass(JOBS), mc = count(m.recs);
  console.log(`control (ixArity without the at-most check): SAME ${mc.SAME} DIFFERENT ${mc.DIFFERENT} NOT COVERED ${mc["NOT COVERED"]}`);
  for (const r of m.recs.filter((r) => r.bucket === "DIFFERENT").slice(0, 3)) console.log(`  ${r.job} @${r.at} real ${JSON.stringify(r.real?.diags.filter((x) => !r.port?.diags.includes(x)))}`);
}
if (process.argv.includes("--hits")) {
  // which ix cells the corpus calls: each cell's value, when a function, wrapped to mark a call
  const hit = new Set<string>();
  (globalThis as Record<string, unknown>).__ixHit = hit;
  const over: Record<string, (...a: never[]) => unknown> = {};
  for (const [name, f] of Object.entries(IX_CELLS)) {
    const params = (acorn.parseExpressionAt(`(${String(f)})`, 0, { ecmaVersion: "latest" }) as any).params.map((p: any) => p.name).join(", ");
    over[name] = new Function(`return (${params}) => { const v = (${String(f)})(${params}); return typeof v === "function" ? (...a) => (globalThis.__ixHit.add(${JSON.stringify(name)}), v(...a)) : v; };`)();
  }
  L = linkIx(over);
  const h = pass(JOBS), hc = count(h.recs);
  const fns = Object.entries(L).filter(([, v]) => typeof v === "function").map(([k]) => k);
  const never = fns.filter((k) => !hit.has(k));
  console.log(`hits: SAME ${hc.SAME} DIFFERENT ${hc.DIFFERENT}; function cells ${fns.length}, called ${fns.length - never.length}, never called ${never.length}: ${never.join(" ")}`);
}
