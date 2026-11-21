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
import { checkSources, type Sources } from "../core.ts";
import { Checker } from "../infer.ts";
import { parse, type Parsed } from "../parse.ts";
import { splitCells } from "../toolchain/ss-toolchain.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { show, type Ty } from "../types.ts";
import { ALLOWED_GLOBALS } from "../intrinsics.ts";
import { linkAcorn } from "../acorn/index.ts";
import { linkIx, runIx, regCore, IX_FILES, OW_FILES, IX_CELLS, MD_FILES, linkMd, runMd, type IxLinked, type CompileHook, type MdLinked } from "./index.ts";
import { ownership, actionEscapes } from "../own.ts";
import { captures, opaqueCaptures } from "../capture.ts";
import type { AstNode, Ast } from "../acorn/acorn-types.ss.ts";
import { MODULE_PROBES } from "./probes/module.ts";
import type { IxOutput, IxFacts, IxBinding } from "./ix-types.ss.ts";
import type { Checker as RealChecker, Binding } from "../infer.ts";
import type { Fn, Flags } from "../types.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 1), ONLY = arg("--only"), SHOW = Number(arg("--show") ?? 10);
const OUT = arg("--out") ?? join(import.meta.dir, "../soundscript/.scratch/infer-port/diff.json");
const ROOT = resolve(import.meta.dir, "../..");
const A = linkAcorn();

// ---- the corpus (collect.ts's jobs; ss sections split as ts-cells.ts ssCellTexts does) ----
type Job = { key: string; run: () => unknown; src: Sources | null; opts: { strictIndex?: boolean } };
const mkJob = (key: string, src: Sources, opts: { strictIndex?: boolean } = {}): Job => ({ key, src, opts, run: run(!!src.tsx, () => checkSources(src, opts)) });
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const ssTexts = (rel: string) => { const s = readFileSync(join(ROOT, "lite", rel), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
let curTsx = true;
// a section split into cells; a text that does not split throws when its job runs, as it did before jobs were data
const ssJob = (key: string, text: string, tsx: boolean): Job => {
  try { return mkJob(key, { cells: splitCells(text, tsx).join("\n\n"), tsx }); } catch (x) { return { key, src: null, opts: {}, run: () => { throw x; } }; }
};
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
    out.push(mkJob(`port:${d.slice(ROOT.length + 1)}`, src));
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
      const cells = readFileSync(join(ROOT, f), "utf8"), tsx = f.endsWith(".tsx");
      out.push(mkJob(`file:${f}`, { cells, tsx, name: f }));
    }
  // checkCells (stdlib/runtime.ts) without its fallback for a text that does not parse: such a source is skipped
  for (const g of ["lite/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts"]) for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx));
  }
  const ACORN_WITH: Record<string, string[]> = { "acorn/acorn-kids.ss.ts": ["acorn/acorn-types.ss.ts"], "acorn/acorn.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts"], "acorn/syntax.ss.ts": ["acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "messages.ss.ts"] };
  const ACORN_SHELL: Record<string, string> = { "acorn/acorn.ss.ts": "acorn/acorn-shell.ts", "acorn/syntax.ss.ts": "acorn/acorn-shell.ts" };
  for (const f of [...new Glob("lite/acorn/*.ss.ts").scanSync(ROOT)].sort()) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const tsx of [false, true]) out.push(ssJob(`ss${tsx ? "x" : ""}:${f}`, text, tsx));
    const rel = f.slice("lite/".length);
    const shell = ACORN_SHELL[rel] ? readFileSync(join(ROOT, "lite", ACORN_SHELL[rel]), "utf8") : null;
    out.push(mkJob(`sswith:${f}`, { cells: [...(ACORN_WITH[rel] ?? []), rel].flatMap(ssTexts).join("\n\n"), tsx: true, shell, name: rel }));
  }
  for (const [i, c] of specRejects().entries())
    out.push(mkJob(`reject:${c.statement}#${i}`, { cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" }));
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
          out.push(mkJob(`inline:${f}#${Bun.hash(text).toString(36)}`, { cells: text, tsx: true, name: "i" }));
        }
        for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
      })(ast);
    }
  }
  // --file f: one more source, checked as a cells file (the repros under repro/)
  for (const f of process.argv.flatMap((a, i) => (process.argv[i - 1] === "--file" ? [a] : []))) {
    const cells = readFileSync(f, "utf8"), tsx = f.endsWith(".tsx");
    out.push(mkJob(`extra:${f}`, { cells, tsx, name: f }));
  }
  return ONLY ? out.filter((j) => j.key.includes(ONLY)) : out;
}

// ---- the ownership pass (stage 2): own.ts on the real Checker, run again here, against the ow cells on the port's
// facts; what own.ts reports through ch.unsupported is taken back, so core.ts's own call is the only one that counts ----
function ownDiff(ch: RealChecker, e: any, fn: AstNode, port: IxOutput, P: Parsed): NonNullable<Rec["own"]> {
  const fmt = (rule: string, start: number, end: number, msg: string) => `${rule} L${P.line(start)} @${start}-${end} ${msg}`;
  const u0 = ch.unsup.length, d0 = ch.diags.length;
  const t0 = performance.now();
  const rs = [...ownership(e, ch), ...actionEscapes(e, ch)];
  const realUs = (performance.now() - t0) * 1000;
  const real = [...rs.map((r) => fmt(r.rule, r.node.start, r.node.end, r.msg)), ...ch.unsup.slice(u0).map((u) => fmt("unsupported", u.node.start, u.node.end, u.msg))];
  ch.unsup.length = u0;
  if (ch.diags.length !== d0) throw new Error("own.ts wrote a diagnostic");
  const rules = rs.map((r) => r.rule);
  let out: ReturnType<typeof L.owCheck>;
  const t1 = performance.now();
  try { out = L.owCheck(regCore(ch.reg), port.facts, fn); } catch (x) { return { bucket: "DIFFERENT", why: `port crashed: ${(x as Error).stack?.split("\n").slice(0, 3).join(" | ")}`, real, port: [], rules, realUs, portUs: 0 }; }
  const portUs = (performance.now() - t1) * 1000;
  const pl = [...out.diags, ...out.actions].map((d) => fmt(d.rule, d.start, d.end, d.msg)).concat(out.unsup.map((u) => fmt("unsupported", u.start, u.end, u.msg)));
  if (port.gap !== null || out.gap !== null) return { bucket: "NOT COVERED", why: port.gap ?? out.gap ?? "", real, port: pl, rules, realUs, portUs };
  return { bucket: JSON.stringify(real) === JSON.stringify(pl) ? "SAME" : "DIFFERENT", real, port: pl, rules, realUs, portUs };
}
// ---- captures (stage 3): capture.ts's captures and opaqueCaptures against the ow cells, under two taint maps made
// here, since core.ts's (from the module's cell graph) is not reachable from the seam: none, and every parameter ----
function capDiff(ch: RealChecker, e: any, fn: AstNode, port: IxOutput): NonNullable<Rec["cap"]> {
  const all = new Map<string, string>((e.params as any[]).filter((p) => p.type === "Identifier").map((p) => [p.name, `the value of the state cell ${p.name}`]));
  const fmt = (k: string, c: { name: string; why: string; opaque?: boolean }, s: number, en: number) => `${k} @${s}-${en} ${c.name} | ${c.why} | ${c.opaque ? "opaque" : "named"}`;
  const real: string[] = [], pl: string[] = [];
  let realUs = 0, portUs = 0, gap: string | null = port.gap;
  for (const [k, tainted] of [["none", new Map<string, string>()], ["params", all]] as const) {
    const t0 = performance.now();
    const via = captures(e, tainted);
    const op = opaqueCaptures(e, ch, tainted, new Set(via.map((x) => x.node)));
    realUs += (performance.now() - t0) * 1000;
    real.push(...via.map((c) => fmt(`${k} name`, c, c.node.start, c.node.end)), ...op.map((c) => fmt(`${k} binding`, c, c.node.start, c.node.end)));
    let out: ReturnType<typeof L.owCaptureCheck>;
    const t1 = performance.now();
    try { out = L.owCaptureCheck(regCore(ch.reg), port.facts, fn, tainted); } catch (x) { return { bucket: "DIFFERENT", why: `port crashed: ${(x as Error).message}`, real, port: pl, realUs, portUs }; }
    portUs += (performance.now() - t1) * 1000;
    gap = gap ?? out.gap;
    pl.push(...out.byName.map((c) => fmt(`${k} name`, c, c.at.start, c.at.end)), ...out.opaque.map((c) => fmt(`${k} binding`, c, c.at.start, c.at.end)));
  }
  if (gap !== null) return { bucket: "NOT COVERED", why: gap, real, port: pl, realUs, portUs };
  return { bucket: JSON.stringify(real) === JSON.stringify(pl) ? "SAME" : "DIFFERENT", real, port: pl, realUs, portUs };
}
// the fed rule: core.ts's lines (value type, then fnKept) are its glue and are restated here as the oracle; the
// Checker's part is ch.mayHide. Every cell is checked as if fed, with one fedBy text
const FED_BY = "takes f, a function from another language";
function fedDiff(ch: RealChecker, e: any, fnT: Ty, fn: AstNode, port: IxOutput): NonNullable<Rec["fed"]> {
  const real: string[] = [];
  const kept = (what: string, t: Ty, then: string) => { if (ch.mayHide(t)) real.push(`${what} ${show(t)}, which may be or hold a function from another language (c ${FED_BY}); ${then}`); };
  let ret: Ty = fnT.k === "fn" ? fnT.ret : ({ k: "err" } as Ty);
  if (e.async && ret.k === "named" && ret.n === "Promise") ret = ret.args[0];
  if (e.generator && ret.k === "named" && ret.n === "Generator") ret = ret.args[0];
  if (e.generator && !e.async) kept("an events cell yields", ret, "a listener's action would receive it");
  if (ret.k === "named" && ret.n === "StateCell") kept("a state cell holds", ret.args[0], "an action that reads the state cell could call it");
  const pl = L.owFedKept(regCore(ch.reg), fn, port.fn, "c", FED_BY);
  return { same: JSON.stringify(renumberList(real)) === JSON.stringify(renumberList(pl)), real, port: pl };
}
const renumberList = (xs: string[]) => renumber({ diags: xs, unsup: [], fn: null }).diags;
function fedReport(rs: Rec[], label = "fed rule") {
  const fs = rs.filter((r) => r.fed), d = fs.filter((r) => !r.fed!.same);
  console.log(`${label}: ${fs.length} cells: SAME ${fs.length - d.length} DIFFERENT ${d.length}; cells reported (as if fed) ${fs.filter((r) => r.fed!.real.length).length}, reports ${fs.reduce((s, r) => s + r.fed!.real.length, 0)}`);
  for (const r of d.slice(0, 3)) console.log(`FED DIFFERENT ${r.job} @${r.at}\n  real ${JSON.stringify(r.fed!.real)}\n  port ${JSON.stringify(r.fed!.port)}`);
}
function capReport(rs: Rec[], show: number, label = "captures") {
  const cs = rs.filter((r) => r.cap);
  const c = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0 } as Record<string, number>;
  for (const r of cs) c[r.cap!.bucket]++;
  const kinds = tally(cs.flatMap((r) => r.cap!.real.map((x) => x.split(" @")[0] + (x.endsWith("opaque") ? " opaque" : ""))));
  console.log(`${label}: ${cs.length} cells: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]}; reports ${kinds.map(([k, n]) => `${k} ${n}`).join(", ")}; cells with any ${cs.filter((r) => r.cap!.real.length).length}`);
  for (const r of cs.filter((r) => r.cap!.bucket === "DIFFERENT").slice(0, show)) {
    const o = r.cap!;
    console.log(`CAP DIFFERENT ${r.job} @${r.at}${o.why ? " " + o.why : ""}\n  real-only ${JSON.stringify(o.real.filter((x) => !o.port.includes(x)).slice(0, 3))}\n  port-only ${JSON.stringify(o.port.filter((x) => !o.real.includes(x)).slice(0, 3))}`);
  }
  return c;
}
function ownReport(rs: Rec[], show: number, label = "ownership", brief = false) {
  const os = rs.filter((r) => r.own);
  const c = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0 } as Record<string, number>;
  for (const r of os) c[r.own!.bucket]++;
  console.log(`${label}: ${os.length} cells: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]}`);
  const byRule = new Map<string, { cells: number; reports: number }>();
  for (const r of os) {
    const rules = r.own!.real.map((x) => x.split(" ")[0]);
    for (const k of new Set(rules)) { const e = byRule.get(k) ?? { cells: 0, reports: 0 }; e.cells++; byRule.set(k, e); }
    for (const k of rules) byRule.get(k)!.reports++;
  }
  if (!brief) for (const [k, v] of [...byRule].sort()) console.log(`  ${k.padEnd(22)} cells ${String(v.cells).padStart(4)} reports ${v.reports}`);
  for (const [k, n] of tally(os.filter((r) => r.own!.bucket === "NOT COVERED").map((r) => r.own!.why ?? ""))) console.log(`  not covered ${n}: ${k}`);
  for (const r of os.filter((r) => r.own!.bucket === "DIFFERENT").slice(0, show)) {
    const o = r.own!;
    console.log(`OWN DIFFERENT ${r.job} @${r.at}${o.why ? " " + o.why : ""}\n  real-only ${JSON.stringify(o.real.filter((x) => !o.port.includes(x)))}\n  port-only ${JSON.stringify(o.port.filter((x) => !o.real.includes(x)))}`);
  }
  return c;
}
// ---- the seam ----
type Side = { diags: string[]; unsup: string[]; fn: string | null };
type Rec = { job: string; at: number; bucket: "SAME" | "DIFFERENT" | "NOT COVERED" | "REAL CRASH"; why?: string; real?: Side; port?: Side; portUs: number; runUs: number; realUs: number;
  facts?: { same: boolean; real: FactSide; port: FactSide }; factsThrew?: string;
  fed?: { same: boolean; real: string[]; port: string[] };
  cap?: { bucket: "SAME" | "DIFFERENT" | "NOT COVERED"; why?: string; real: string[]; port: string[]; realUs: number; portUs: number };
  own?: { bucket: "SAME" | "DIFFERENT" | "NOT COVERED"; why?: string; real: string[]; port: string[]; rules: string[]; realUs: number; portUs: number } };

// ---- the facts (stage 1): what own.ts, capture.ts and core.ts read from the Checker after fnExpr, per table, keyed
// by span and type; only nodes of the cell's own tree (synthetic JSX nodes are counted as excluded) ----
const FACT_TABLES = ["types", "bindingOf", "calls", "memberFlags", "actionBodies", "inActionUses", "stateProps"] as const;
type FactSide = { tables: Record<string, string[]>; excluded: Record<string, number>; dupKeys: number };
// show() throws on a Map with no type argument (repro/map-no-type-args.ts); such a type is printed as its structure
const showT = (t: Ty): string => { try { return show(t); } catch { return "struct " + JSON.stringify(t, (_k, v) => (v instanceof Map ? [...v] : v)); } };
const flagsJson = (f: Flags | undefined | null) => (f ? JSON.stringify(Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined).sort())) : "none");
const sigOf = (s: Fn) => `${showT(s)} decl ${showT(s.decl ?? s)} flags ${flagsJson(s.flags)}`;
// type variables renumbered over the tables in order, as renumber does for the diagnostics
function renumberFacts(f: FactSide): FactSide {
  const ids = new Map<string, number>();
  const one = (x: string) => x.replace(/'\d+/g, (m) => { if (!ids.has(m)) ids.set(m, ids.size + 1); return `'${ids.get(m)}`; });
  return { ...f, tables: Object.fromEntries(FACT_TABLES.map((t) => [t, f.tables[t].map(one)])) };
}
function realFacts(ch: RealChecker, cellFn: any): FactSide {
  const key = new Map<any, string>(), seen = new Set<string>();
  let dupKeys = 0;
  (function walk(n: any, field: string) {
    const k = `${n.start}:${n.end}:${n.type}${field}`;
    if (seen.has(k)) dupKeys++; else seen.add(k);
    key.set(n, k);
    for (const f in n) {
      if (f === "loc") continue;
      const v = n[f];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") walk(x, "." + f); }
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v, "." + f);
    }
  })(cellFn, "");
  const excluded: Record<string, number> = Object.fromEntries(FACT_TABLES.map((t) => [t, 0]));
  const K = (n: any) => (n ? key.get(n) ?? "outside" : "-");
  const desc = (b: Binding) => b.kind === "global" || b.kind === "prelude" ? `${b.kind} ${b.name} : ${showT(b.t)}`
    : `${b.kind} ${b.name} @${K(b.node)} fi ${K(b.fi?.node)} fn ${K(b.fnNode)} mut ${!!b.mutOwned} cp ${!!b.cellParam} as ${!!b.assigned} : ${showT(b.t)}`;
  const F = ch.facts, tables: Record<string, string[]> = Object.fromEntries(FACT_TABLES.map((t) => [t, []]));
  const put = (t: string, n: any, v: string) => { const k = key.get(n); if (k === undefined) excluded[t]++; else tables[t].push(`${k} ${v}`); };
  for (const [n, t] of F.types) put("types", n, showT(t));
  for (const [n, b] of F.bindingOf) put("bindingOf", n, desc(b));
  for (const [n, c] of F.calls) put("calls", n, `helper ${c.helper ? desc(c.helper) : "-"} prelude ${c.prelude ?? "-"} sig ${c.sig ? sigOf(c.sig) : "-"}`);
  for (const [n, f] of F.memberFlags) put("memberFlags", n, flagsJson(f));
  for (const n of ch.actionBodies) put("actionBodies", n, "");
  for (const u of ch.inActionUses) put("inActionUses", u.node, `fi ${K(u.fi.node)} [${u.rule}] ${u.msg}`);
  for (const n of ch.stateProps) put("stateProps", n, "");
  for (const t of ["types", "calls", "memberFlags", "actionBodies", "stateProps"]) tables[t].sort();
  return renumberFacts({ tables, excluded, dupKeys });
}
function portFacts(fn: AstNode, F: IxFacts): FactSide {
  const key = new Map<number, string>(), seen = new Set<string>();
  let dupKeys = 0;
  (function walk(n: AstNode, field: string) {
    const k = `${n.start}:${n.end}:${n.type === "Other" ? n.kind : n.type}${field}`;
    if (seen.has(k)) dupKeys++; else seen.add(k);
    key.set(n.nid, k);
    for (const c of A.childrenOf(n)) walk(c.node, "." + c.key);
  })(fn, "");
  const excluded: Record<string, number> = Object.fromEntries(FACT_TABLES.map((t) => [t, 0]));
  const K = (nid: number) => (nid < 0 ? "-" : key.get(nid) ?? "outside");
  const desc = (id: number) => {
    const b: IxBinding | undefined = F.bindings.get(id);
    if (!b) return `binding ${id} not kept`;
    return b.kind === "global" || b.kind === "prelude" ? `${b.kind} ${b.name} : ${showT(b.t)}`
      : `${b.kind} ${b.name} @${K(b.nid)} fi ${K(b.fi)} fn ${K(b.fnNode)} mut ${b.mutOwned} cp ${b.cellParam} as ${b.assigned} : ${showT(b.t)}`;
  };
  const tables: Record<string, string[]> = Object.fromEntries(FACT_TABLES.map((t) => [t, []]));
  const put = (t: string, nid: number, v: string) => { const k = key.get(nid); if (k === undefined) excluded[t]++; else tables[t].push(`${k} ${v}`); };
  for (const [n, t] of F.types) put("types", n, showT(t));
  for (const [n, id] of F.bindingOf) put("bindingOf", n, desc(id));
  for (const [n, c] of F.calls) put("calls", n, `helper ${c.helper !== null ? desc(c.helper) : "-"} prelude ${c.prelude ?? "-"} sig ${c.sig ? sigOf(c.sig) : "-"}`);
  for (const [n, f] of F.memberFlags) put("memberFlags", n, flagsJson(f));
  for (const n of F.actionBodies) put("actionBodies", n, "");
  for (const u of F.inActionUses) put("inActionUses", u.at, `fi ${K(u.fi)} [${u.rule}] ${u.msg}`);
  for (const n of F.stateProps) put("stateProps", n, "");
  for (const t of ["types", "calls", "memberFlags", "actionBodies", "stateProps"]) tables[t].sort();
  return renumberFacts({ tables, excluded, dupKeys });
}
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
  let port: IxOutput | null = null, portCrash: string | null = null, portMsg: string | null = null, portFn: AstNode | null = null;
  const t0 = performance.now();
  let runUs = 0;
  try {
    const { ast, fns } = treeOf(P, curTsx);
    const fn = fns.get(`${e.start}:${e.end}:${e.type}`);
    if (!fn) throw new Error("no typed node for the cell's function");
    portFn = fn;
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
      // a fact show() cannot print (Map with no type argument) is counted, and must not reach the checked source
      try {
        const rf = realFacts(this, e), pf = portFacts(portFn!, port.facts);
        rec.facts = { same: JSON.stringify(rf.tables) === JSON.stringify(pf.tables), real: rf, port: pf };
      } catch (x) { rec.factsThrew = (x as Error).message; }
      rec.own = ownDiff(this, e, portFn!, port, P);
      rec.cap = capDiff(this, e, portFn!, port);
      rec.fed = fedDiff(this, e, res!, portFn!, port);
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

// ---- the whole module (--module, --module-only): checkSources against the md cells' entry (runMd), per source: every
// module error, every cell record field in order, the facts, and the Checker's two lists with their spans ----
// ts-cells.ts SS_CHECKED_WITH, copied (that file is another agent's): a section is checked with these in front
const SS_WITH: Record<string, string[]> = { "shape.ss.ts": ["types.ss.ts"], "store.ss.ts": ["events.ss.ts"], "render.ss.ts": ["runtime.ss.ts"], "cross.ss.ts": ["runtime.ss.ts"], "subtype.ss.ts": ["types.ss.ts"], "walks.ss.ts": ["types.ss.ts", "subtype.ss.ts"] };
export const INFER_WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
function moduleJobs(base: Job[]): Job[] {
  const out = [...base];
  for (const [f, w] of Object.entries(SS_WITH)) out.push(mkJob(`sswith:lite/${f}`, { cells: [...w, f].flatMap(ssTexts).join("\n\n"), tsx: true, name: f }));
  const infer = [...INFER_WITH, ...[...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`)];
  out.push(mkJob("module:lite/infer", { cells: infer.flatMap(ssTexts).join("\n\n"), tsx: true, shell: readFileSync(join(ROOT, "lite/acorn/acorn-shell.ts"), "utf8"), name: "infer" }));
  // the 47-cell tutorial module as the built notebook held it (a dump of 2026-11-21 14:17)
  const tut = join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json");
  if (existsSync(tut)) { const j = JSON.parse(readFileSync(tut, "utf8")); out.push(mkJob("module:tutorial", { cells: j.texts.join("\n\n"), tsx: true, outside: j.outside })); }
  for (const j of base.filter((x) => x.key.startsWith("file:") || x.key.startsWith("port:"))) if (j.src) out.push(mkJob(`lax:${j.key}`, j.src, { strictIndex: false }));
  for (const p of MODULE_PROBES) out.push(mkJob(`probe:${p.key}`, p.src, p.opts ?? {}));
  return ONLY ? out.filter((j) => j.key.includes(ONLY)) : out;
}
type ModRec = { key: string; bucket: "SAME" | "DIFFERENT" | "NOT COVERED" | "BOTH THREW"; why?: string; real: string[]; port: string[]; realMs: number; portMs: number; parts?: Record<string, boolean> };
const tvAll = (xs: string[]) => { const ids = new Map<string, number>(); return xs.map((x) => x.replace(/'\d+/g, (m) => { if (!ids.has(m)) ids.set(m, ids.size + 1); return `'${ids.get(m)}`; })); };
// a result as lines, by part; spans: per result cell, the Checker's lists
function modLines(r: any, spans: { ch: string[]; chUnsup: string[] }[] | null): Record<string, string[]> {
  const e = (x: any) => `[${x.rule}] L${x.line} ${x.msg}`;
  return {
    head: [`${r.port} ${r.file} ok ${r.ok}`],
    module: r.module.map(e),
    cells: r.cells.flatMap((c: any) => [`${c.name}: ${c.status} L${c.line} : ${"value" in c ? c.value : "(no value)"} by ${JSON.stringify(c.blockedBy)} keys ${Object.keys(c).join(",")}`,
      ...c.errors.map((x: any) => "  " + e(x)), ...c.unsupported.map((x: any) => "  u " + e(x))]),
    facts: [...(r.facts ?? new Map()).entries()].map(([k, f]: [string, unknown]) => `${k} ${JSON.stringify(f)}`),
    spans: (spans ?? []).flatMap((s, i) => [`#${i}`, ...s.ch.map((x) => "  d " + x), ...s.chUnsup.map((x) => "  u " + x)]),
  };
}
let LM: MdLinked = linkMd();
function modulePass(js: Job[]): ModRec[] {
  const recs: ModRec[] = [];
  active = false;
  for (const j of js) {
    if (j.src === null) continue;
    curTsx = !!j.src.tsx;
    const chs = new Map<number, Checker>();
    let real: Record<string, string[]> | null = null, realErr: string | null = null, port: Record<string, string[]> | null = null, portErr: string | null = null, gap: string | null = null;
    let realR: any = null;
    const t0 = performance.now();
    try { realR = checkSources(j.src, { ...j.opts, onCell: (_n, ch, fn) => void chs.set(fn.start, ch) }); } catch (x) { realErr = (x as Error).message; }
    const realMs = performance.now() - t0;
    const t1 = performance.now();
    let pr: ReturnType<typeof runMd> | null = null;
    try { pr = runMd(LM, j.src, j.opts); } catch (x) { portErr = (x as Error).message ?? String(x); if (process.argv.includes("--stacks")) console.log((x as Error).stack); }
    const portMs = performance.now() - t1;
    if (pr) { port = modLines(pr.result, pr.spans); gap = pr.gap; }
    if (realR) {
      const fmt = (d: { rule: string; msg: string; node: { start: number; end: number } }) => `${d.rule} @${d.node.start}-${d.node.end} ${d.msg}`;
      real = modLines(realR, (pr?.spans ?? []).map((s) => { const ch = chs.get(s.at); return { ch: ch ? ch.diags.map(fmt) : ["(no Checker)"], chUnsup: ch ? ch.unsup.map(fmt) : [] }; }));
    }
    const flat = (x: Record<string, string[]> | null) => (x ? tvAll(Object.entries(x).flatMap(([k, v]) => v.map((l) => `${k} ${l}`))) : []);
    const rl = flat(real), pl = flat(port);
    let bucket: ModRec["bucket"];
    let why: string | undefined;
    if (realErr !== null || portErr !== null) { bucket = realErr === portErr ? "BOTH THREW" : "DIFFERENT"; why = `real ${realErr ?? "no throw"}; port ${portErr ?? "no throw"}`; }
    else if (gap !== null) { bucket = "NOT COVERED"; why = gap; }
    else bucket = JSON.stringify(rl) === JSON.stringify(pl) ? "SAME" : "DIFFERENT";
    const parts = real && port ? Object.fromEntries(Object.keys(real).map((k) => [k, JSON.stringify(tvAll(real![k])) === JSON.stringify(tvAll(port![k]))])) : undefined;
    recs.push({ key: j.key, bucket, why, real: rl, port: pl, realMs, portMs, parts });
  }
  active = true;
  return recs;
}
function moduleReport(recs: ModRec[], label = "whole module", show = SHOW) {
  const c: Record<string, number> = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0, "BOTH THREW": 0 };
  for (const r of recs) c[r.bucket]++;
  const partDiff = tally(recs.filter((r) => r.bucket === "DIFFERENT" && r.parts).flatMap((r) => Object.entries(r.parts!).filter(([, v]) => !v).map(([k]) => k)));
  console.log(`${label}: ${recs.length} sources: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]} BOTH THREW ${c["BOTH THREW"]}${partDiff.length ? `; parts that differ: ${partDiff.map(([k, n]) => `${k} ${n}`).join(", ")}` : ""}`);
  for (const [k, n] of tally(recs.filter((r) => r.bucket === "NOT COVERED").map((r) => r.why ?? ""))) console.log(`  not covered ${n}: ${k}`);
  for (const [k, n] of tally(recs.filter((r) => r.bucket === "BOTH THREW").map((r) => r.why ?? "")).slice(0, 5)) console.log(`  both threw ${n}: ${k}`);
  for (const r of recs.filter((r) => r.bucket === "DIFFERENT").slice(0, show)) {
    console.log(`MODULE DIFFERENT ${r.key}${r.why ? " " + r.why : ""}`);
    console.log(`  real-only ${JSON.stringify(r.real.filter((x) => !r.port.includes(x)).slice(0, 4))}\n  port-only ${JSON.stringify(r.port.filter((x) => !r.real.includes(x)).slice(0, 4))}`);
  }
  return c;
}
if (process.argv.includes("--module") || process.argv.includes("--module-only")) {
  const MJ = moduleJobs(jobs());
  console.log(`md files ${MD_FILES.map((f) => `${f}:${Bun.hash(readFileSync(join(import.meta.dir, f), "utf8")).toString(36)}`).join(" ")}`);
  console.log(`core.ts ${Bun.hash(readFileSync(join(ROOT, "lite/core.ts"), "utf8")).toString(36)}`);
  const mr = modulePass(MJ);
  moduleReport(mr);
  const rules = tally(mr.filter((r) => r.bucket === "SAME").flatMap((r) => r.real.filter((l) => /^(module|cells) +\[/.test(l)).map((l) => l.split("[")[1].split("]")[0])));
  console.log(`rules met on SAME sources (lines): ${rules.map(([k, n]) => `${k} ${n}`).join(", ")}`);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT.replace(/\.json$/, "-module.json"), JSON.stringify(mr, null, 1));
  // the sources, for module-time.ts
  if (!ONLY) writeFileSync(join(dirname(OUT), "module-sources.json"), JSON.stringify(MJ.filter((j) => j.src !== null && j.key !== "module:lite/infer").map((j) => ({ key: j.key, src: j.src, opts: j.opts }))));
  if (process.argv.includes("--control-module")) {
    // one cell broken per md file, each in a linked copy; the module of lite/infer is left out (its check takes a minute)
    const overs: [string, string, string][] = [
      ["md-shape: mdTsIgnore never matches", "mdTsIgnore", "() => () => false"],
      ["md-graph: mdVisit reports no cycle", "mdVisit", "() => { function visit(S, deps, byName, lines, n, stack) { const st = S.state.get(n); if (st === 2 || st === 1) return; S.state = new Map([...S.state, [n, 1]]); for (const d of deps.get(n) ?? []) visit(S, deps, byName, lines, d, [...stack, n]); S.state = new Map([...S.state, [n, 2]]); const def = byName.get(n); if (def !== undefined) S.order = [...S.order, def]; } return visit; }"],
      ["md-inject: mdInjectAnn without inject-type", "mdInjectAnn", "(mdDiag, ixHides) => (K, C, X, L, p, ann, vt) => ann === null ? vt : K.reg.convert(ann, [], null)"],
      ["md-taint: mdTaintOf without capabilities", "mdTaintOf", "(mdAnn, mdRefName, isNamed) => (X, M, p) => { if (p.type !== 'Identifier') return null; const w = mdRefName(mdAnn(p)); if (w === 'State' || w === 'Events') return null; const name = p.name; if (X.cellNames.has(name)) { const t = M.value.get(name); if (t && t.k === 'named' && isNamed(t, 'Action')) return null; if (M.refInner.has(name)) return `the value of the state cell ${name}`; if (X.byName.get(name)?.fn.generator === true) return `the latest value of the events cell ${name}`; const why = M.stateful.get(name); return why === undefined ? null : `${name} ${why}`; } if (X.shellNames.has(name)) return `a shell cell's value`; return null; }"],
      ["md-compile: mdIslandSide without compile-boundary", "mdIslandSide", "(mdHookErr) => (S, R, H, e, names) => { const props = new Map(); let bad = false; for (const n of names) { const t = S.value.get(n); if (t === null || t === undefined) { if (S.X.cellNames.has(n)) mdHookErr(R, H, e, 'compile-island', `${n} has no usable type`); bad = true; continue; } props.set(n, { t, opt: false }); } return { t: { k: 'rec', props }, bad }; }"],
      ["md-value: mdStateRules without state-undefined", "mdStateRules", "(mdKept, admitsUndefinedWith, holdsWith, show) => (R, X, name, fedBy, line, inner) => { const nested = holdsWith(X.R.ops)(inner, ['State', 'StateCell']); return [...(nested ? [{ rule: 'state-in-state', line, msg: `a state cell holds ${show(inner)}, which contains ${nested}; a state cell's content may not contain a State or StateCell` }] : []), ...mdKept(R, name, fedBy, line, 'a state cell holds', inner, 'an action that reads the state cell could call it')]; }"],
      ["md-run: mdDedupe keeps every copy", "mdDedupe", "() => (es) => es"],
      ["md-cell: mdKeep, every value usable", "mdKeep", "(hasErrWith, show) => (X, M, d, rec, v) => { const errors = [...rec.errors, ...v.errors]; M.value = new Map([...M.value, [d.name, v.value]]); if (v.events !== null) M.eventsInner = new Map([...M.eventsInner, [d.name, v.events]]); if (v.ref !== null) { M.refInner = new Map([...M.refInner, [d.name, v.ref]]); M.stateful = new Map([...M.stateful, [d.name, 'is a state cell']]); } if (v.listener) M.listeners = new Set([...M.listeners, d.name]); const status = errors.length ? 'rejected' : rec.unsupported.length ? 'unsupported' : rec.blockedBy.length ? 'blocked' : 'ok'; return { ...rec, errors, value: show(v.value), status }; }"],
      ["md-facts: mdReturnsRef always false", "mdReturnsRef", "() => () => false"],
      ["md-entry: mdShownNames counts from 3", "mdShownNames", "() => (dups, out, cellNames) => { const shown = new Map(); for (const d of dups) { if (!out.has(d.ph)) continue; let k = 3; while (cellNames.has(`${d.name} (${k})`) || [...shown.values()].includes(`${d.name} (${k})`)) k++; shown.set(d.ph, `${d.name} (${k})`); } return shown; }"],
    ];
    const CJ = MJ.filter((j) => j.key !== "module:lite/infer");
    for (const [what, name, text] of overs) {
      LM = linkMd({ [name]: new Function(`return (${text});`)() });
      moduleReport(modulePass(CJ), `control module (${what})`, 1);
    }
    LM = linkMd();
  }
  if (process.argv.includes("--module-only")) process.exit(0);
}

const files = [...IX_FILES, ...OW_FILES].map((f) => `${f}:${Bun.hash(readFileSync(join(import.meta.dir, f), "utf8")).toString(36)}`);
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
function factReport(rs: Rec[], show: number): { same: number; different: number } {
  const fr = rs.filter((r) => r.facts);
  const fd = fr.filter((r) => !r.facts!.same);
  const sum = (side: "real" | "port", f: (x: FactSide) => number) => fr.reduce((s, r) => s + f(r.facts![side]), 0);
  const threw = rs.filter((r) => r.factsThrew !== undefined);
  console.log(`facts: ${fr.length} cells compared (inference SAME or DIFFERENT): SAME ${fr.length - fd.length} DIFFERENT ${fd.length}; comparison threw ${threw.length}${threw.length ? ": " + threw[0].factsThrew : ""}`);
  for (const t of FACT_TABLES) console.log(`  ${t.padEnd(13)} entries real ${sum("real", (x) => x.tables[t].length)} port ${sum("port", (x) => x.tables[t].length)}; excluded (not in the cell's tree) real ${sum("real", (x) => x.excluded[t])} port ${sum("port", (x) => x.excluded[t])}`);
  console.log(`  node keys met twice in one cell's tree: real ${sum("real", (x) => x.dupKeys)} port ${sum("port", (x) => x.dupKeys)}`);
  for (const r of fd.slice(0, show)) {
    console.log(`FACTS DIFFERENT ${r.job} @${r.at}`);
    for (const t of FACT_TABLES) {
      const a = r.facts!.real.tables[t], b = r.facts!.port.tables[t];
      if (a.join("\n") === b.join("\n")) continue;
      const ra = a.filter((x) => !b.includes(x)), pb = b.filter((x) => !a.includes(x));
      console.log(`  ${t} real-only ${JSON.stringify(ra.slice(0, 4))} port-only ${JSON.stringify(pb.slice(0, 4))}${!ra.length && !pb.length ? " (order)" : ""}`);
    }
  }
  return { same: fr.length - fd.length, different: fd.length + threw.length };
}
factReport(first.recs, SHOW);
ownReport(first.recs, SHOW);
capReport(first.recs, SHOW);
fedReport(first.recs);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(first.recs, null, 1));

if (ROUNDS > 1) {
  const port: number[] = [], run: number[] = [], real: number[] = [], ownPort: number[] = [], ownReal: number[] = [], capPort: number[] = [], capReal: number[] = [];
  for (let i = 0; i < ROUNDS; i++) {
    const p = pass(JOBS).recs.filter((r) => r.bucket === "SAME");
    port.push(p.reduce((s, r) => s + r.portUs, 0) / p.length);
    run.push(p.reduce((s, r) => s + r.runUs, 0) / p.length);
    real.push(p.reduce((s, r) => s + r.realUs, 0) / p.length);
    const cp = p.filter((r) => r.cap?.bucket === "SAME");
    capPort.push(cp.reduce((s, r) => s + r.cap!.portUs, 0) / cp.length);
    capReal.push(cp.reduce((s, r) => s + r.cap!.realUs, 0) / cp.length);
    const o = p.filter((r) => r.own?.bucket === "SAME");
    ownPort.push(o.reduce((s, r) => s + r.own!.portUs, 0) / o.length);
    ownReal.push(o.reduce((s, r) => s + r.own!.realUs, 0) / o.length);
  }
  const mm = (xs: number[]) => `${Math.min(...xs).toFixed(1)}–${Math.max(...xs).toFixed(1)}`;
  console.log(`µs per SAME cell over ${ROUNDS} rounds: port with typed parse ${mm(port)}, port (runIx) ${mm(run)}, real ${mm(real)}; the port runs first`);
  console.log(`captures µs per SAME cell (both taint maps) over ${ROUNDS} rounds: port ${mm(capPort)}, real ${mm(capReal)}`);
  console.log(`ownership µs per SAME cell over ${ROUNDS} rounds: port (owCheck) ${mm(ownPort)}, real (ownership + actionEscapes) ${mm(ownReal)}; the real runs first`);
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
if (process.argv.includes("--control-facts")) {
  // one control per table: the port with one kind of fact write dropped (ixFact filtered), or the type write of ixInfer
  const kinds = ["binding", "bind", "helper", "sig", "prelude", "flags", "action", "use", "stateProp"];
  // link.ts evaluates a cell's text again, so the kind is written into the text, not closed over
  const overs: [string, Record<string, (...a: never[]) => unknown>][] = kinds.map((k) => [`ixFact without "${k}"`, {
    ixFact: new Function(`return () => (C, f) => { if (f.k !== ${JSON.stringify(k)}) C.facts = { f, next: C.facts }; };`)(),
  }]);
  overs.push(["ixInfer without its type write", {
    ixInfer: ((ixInfer1: any) => (K: any, T: any, V: any, W: any, C: any, env: any, e: any) => { const q = C.quiet; C.quiet = 0; try { return ixInfer1(K, T, V, W, C, env, e); } finally { C.quiet = q; } }) as never,
  }]);
  for (const [what, over] of overs) {
    L = linkIx(over);
    const m = pass(JOBS), fr = m.recs.filter((r) => r.facts), fd = fr.filter((r) => !r.facts!.same);
    const tables = FACT_TABLES.filter((t) => fd.some((r) => r.facts!.real.tables[t].join("\n") !== r.facts!.port.tables[t].join("\n")));
    console.log(`control facts (${what}): facts SAME ${fr.length - fd.length} DIFFERENT ${fd.length}; tables that differ: ${tables.join(" ") || "none"}`);
  }
}
if (process.argv.includes("--control-own")) {
  // ownership controls: each a linked copy with one rule of own.ts broken; the shipped cells are not touched
  const overs: [string, string, string][] = [
    ["owLoop, one iteration instead of the fixpoint", "owLoop", "(owLoopParts, owLoopEntry, owLoopOnce) => (K, O, W, X, P, s, st) => { const L = owLoopParts(s); if (L === null) return st; const entry = owLoopEntry(K, O, W, X, P, s, st); return owLoopOnce(K, O, W, X, P, s, L, entry, entry).exit; }"],
    ["owErr without the first-report-wins dedupe", "owErr", "(ixPush) => (W, at, rule, msg) => { W.errs = ixPush(W.errs, { start: at.start, end: at.end, rule, msg }); }"],
    ["owHelper, no function is a helper", "owHelper", "() => () => undefined"],
    ["owPosSpread, every spread allowed", "owPosSpread", "() => () => null"],
  ];
  for (const [what, name, text] of overs) {
    L = linkIx({ [name]: new Function(`return (${text});`)() });
    const m = pass(JOBS);
    ownReport(m.recs, 2, `control own (${what})`, true);
  }
}
if (process.argv.includes("--control-cap")) {
  const overs: [string, string, string][] = [
    ["owTaintPass, one pass instead of the fixpoint", "owTaintPass", "(owFirstTainted) => (taint, locals) => { for (const l of locals) { let all = true; for (const x of l.names) if (!taint.has(x)) all = false; const hit = all ? null : owFirstTainted(taint, l.from); if (hit === null) continue; for (const x of l.names) if (!taint.has(x)) taint.set(x, `computed from ${hit}`); } return false; }"],
    ["owOpaqueWhy1 without following free references", "owOpaqueWhy1", "(owSpanOf) => (K, O, Q, B, b) => { if (b.kind === 'param') return 'is a parameter of an enclosing function, so a caller may pass it a value that depends on state'; if (b.kind === 'let') return 'is a let or a catch binding, so its value is not fixed where it is declared'; if (b.mutOwned) return 'is a Mut, which the cell may change after the action is made'; return owSpanOf(O, b) === null ? 'is bound where the checker does not follow its value' : null; }"],
    ["owNotARef, property names read as references", "owNotARef", "() => () => false"],
  ];
  for (const [what, name, text] of overs) {
    L = linkIx({ [name]: new Function(`return (${text});`)() });
    capReport(pass(JOBS).recs, 2, `control cap (${what})`);
  }
}
if (process.argv.includes("--control-fed")) {
  const text = "(ixMayHide, ixFnParts, isNamed, show, ERR) => (R, fn, fnT, name, fedBy) => { const parts = ixFnParts(fn); if (parts === null) return []; const ret = fnT.k === 'fn' ? fnT.ret : ERR; const msg = (what, t, then) => `${what} ${show(t)}, which may be or hold a function from another language (${name} ${fedBy}); ${then}`; const out = []; if (parts.generator && !parts.async && ixMayHide(R, ret)) out.push(msg('an events cell yields', ret, \"a listener's action would receive it\")); const held = ret.k === 'named' && isNamed(ret, 'StateCell') ? ret.args[0] ?? ERR : null; if (held !== null && ixMayHide(R, held)) out.push(msg('a state cell holds', held, 'an action that reads the state cell could call it')); return out; }";
  L = linkIx({ owFedKept: new Function(`return (${text});`)() });
  const m = pass(JOBS);
  fedReport(m.recs, "control fed (owFedKept without taking Generator<T> to T)");
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
