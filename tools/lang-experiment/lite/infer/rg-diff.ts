// bun lite/infer/rg-diff.ts [--only <key part>] [--file f]... [--rounds R] [--controls] [--skip-big] [--show N] [--out f]
// The registry cells (rg-*.ss.ts, built into a registry by core.ts rgRegistry) against the frozen lite/registry.ts
// (lite/infer/frozen/ts/, 2026-11-22) on the corpus of lite/infer/diff.ts.
// (1) registry level, per source, the same calls in the same order on both: the three declaration loads, foreign.d.ts,
//     the user's declarations; every type node whose parent is not a type converted; every function's signature;
//     every declared name expanded, with its type parameters and with none; every interface's record; sub of each
//     converted type with itself and with the next one; then the memo tables. Each call compares the Ty (a
//     structural print), the reports in order (rule, message, span, line) and a throw's message.
// (2) end to end: the frozen core.ts runCheck (registry.ts, two parses) against the shipped core.ts runCheck (the rg
//     cells, one parse) per module: every module error, cell record, fact and each cell's span lists.
// SAME / DIFFERENT / NOT COVERED (the rg cells met a gap) / BOTH THREW (the same message). Run from tools/lang-experiment.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { Glob } from "bun";
import * as acorn from "acorn";
import { runCheck, globalsOf, type Sources } from "./frozen/ts/core.ts";
import { PRELUDE_FNS, ALLOWED_GLOBALS } from "../intrinsics.ts";
import { mdCheckSources } from "../infer-ss.ts";
import { Registry } from "./frozen/ts/registry.ts";
import { parse, TS, TSX, type Parsed, type Node } from "./frozen/ts/parse.ts";
import { splitCells } from "./frozen/ts/toolchain/ss-toolchain.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { named } from "../types.ts";
import { linkAcorn } from "../acorn/index.ts";
import { IX_FILES, OW_FILES, MD_FILES } from "../infer-ss.ts";
import { MODULE_PROBES } from "./probes/module.ts";
import { REGISTRY_PROBES } from "./probes/registry.ts";
import { linkRg, rgRegistry, RG_FILES, RG, type RgLinked, type RgRegistry, type RgCells } from "./rg-index.ts";
import { runCheck as shippedRunCheck } from "../core.ts";
import { TS as LIVE_TS, TSX as LIVE_TSX } from "../parse.ts";
import type { Ty } from "../types.ts";
import type { Ast, AstNode } from "../acorn/acorn-types.ss.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ONLY = arg("--only"), SHOW = Number(arg("--show") ?? 8), ROUNDS = Number(arg("--rounds") ?? 1);
const OUT = arg("--out") ?? join(import.meta.dir, "../soundscript/.scratch/rg-port/rg-diff.json");
const ROOT = resolve(import.meta.dir, "../..");
const A = linkAcorn();

// ---- the corpus: diff.ts jobs() and moduleJobs(), copied (diff.ts runs on import) ----
type Job = { key: string; src: Sources | null; opts: { strictIndex?: boolean } };
const mkJob = (key: string, src: Sources, opts: { strictIndex?: boolean } = {}): Job => ({ key, src, opts });
function headerEnd(src: string): number {
  let at = 0;
  for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; }
  return at;
}
const ssTexts = (rel: string) => { const s = readFileSync(join(ROOT, "lite", rel), "utf8"); return splitCells(s.slice(headerEnd(s)).trimStart(), false); };
const ssJob = (key: string, text: string, tsx: boolean): Job => { try { return mkJob(key, { cells: splitCells(text, tsx).join("\n\n"), tsx }); } catch { return { key, src: null, opts: {} }; } };
function jobs(): Job[] {
  const out: Job[] = [];
  const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const dirs = new Set<string>();
  for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
    for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
  for (const d of [...dirs].sort()) {
    const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
    out.push(mkJob(`port:${d.slice(ROOT.length + 1)}`, { cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx, foreign: read(d, "foreign.d.ts"), shell: read(d, "shell.ts"), name: d }));
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) out.push(mkJob(`file:${f}`, { cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx"), name: f }));
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
  for (const [i, c] of specRejects().entries()) out.push(mkJob(`reject:${c.statement}#${i}`, { cells: c.source, tsx: true, shell: c.shell ?? null, outside: c.outside ?? null, name: "r" }));
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
        if (s && /=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) out.push(mkJob(`inline:${f}#${Bun.hash(s).toString(36)}`, { cells: s, tsx: true, name: "i" }));
        for (const key in n) { if (key === "loc") continue; const v = n[key]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
      })(ast);
    }
  }
  for (const f of process.argv.flatMap((a, i) => (process.argv[i - 1] === "--file" ? [a] : []))) out.push(mkJob(`extra:${f}`, { cells: readFileSync(f, "utf8"), tsx: f.endsWith(".tsx"), name: f }));
  return out;
}
const SS_WITH: Record<string, string[]> = { "shape.ss.ts": ["types.ss.ts"], "store.ss.ts": ["events.ss.ts"], "render.ss.ts": ["runtime.ss.ts"], "cross.ss.ts": ["runtime.ss.ts"], "subtype.ss.ts": ["types.ss.ts"], "walks.ss.ts": ["types.ss.ts", "subtype.ss.ts"] };
const INFER_WITH = ["types.ss.ts", "subtype.ss.ts", "walks.ss.ts", "island.ss.ts", "shape.ss.ts", "messages.ss.ts", "acorn/acorn-types.ss.ts", "acorn/acorn-kids.ss.ts", "acorn/acorn.ss.ts", "acorn/syntax.ss.ts"];
function moduleJobs(base: Job[]): Job[] {
  const out = [...base];
  for (const [f, w] of Object.entries(SS_WITH)) out.push(mkJob(`sswith:lite/${f}`, { cells: [...w, f].flatMap(ssTexts).join("\n\n"), tsx: true, name: f }));
  if (!process.argv.includes("--skip-big")) {
    const infer = [...INFER_WITH, ...[...IX_FILES, ...OW_FILES, ...MD_FILES].map((f) => `infer/${f}`)];
    out.push(mkJob("module:lite/infer", { cells: infer.flatMap(ssTexts).join("\n\n"), tsx: true, shell: readFileSync(join(ROOT, "lite/acorn/acorn-shell.ts"), "utf8"), name: "infer" }));
  }
  const tut = join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json");
  if (existsSync(tut)) { const j = JSON.parse(readFileSync(tut, "utf8")); out.push(mkJob("module:tutorial", { cells: j.texts.join("\n\n"), tsx: true, outside: j.outside })); }
  for (const j of base.filter((x) => x.key.startsWith("file:") || x.key.startsWith("port:"))) if (j.src) out.push(mkJob(`lax:${j.key}`, j.src, { strictIndex: false }));
  for (const p of MODULE_PROBES) out.push(mkJob(`probe:${p.key}`, p.src, p.opts ?? {}));
  for (const p of REGISTRY_PROBES) out.push(mkJob(`rgprobe:${p.key}`, p.src, p.opts ?? {}));
  const rgInfer = [...INFER_WITH, ...RG_FILES.map((f) => `infer/${f}`)];
  out.push(mkJob("module:rg", { cells: rgInfer.flatMap(ssTexts).join("\n\n"), tsx: true, shell: readFileSync(join(ROOT, "lite/acorn/acorn-shell.ts"), "utf8"), name: "rg" }));
  return ONLY ? out.filter((j) => j.key.includes(ONLY)) : out;
}

// ---- printing ----
// a value as structure: Maps and Sets as their entries in order, object keys sorted, undefined left out
const sp = (x: unknown): string => JSON.stringify(x, (_k, v) => {
  if (v instanceof Map) return { $map: [...v] };
  if (v instanceof Set) return { $set: [...v] };
  if (v && typeof v === "object" && !Array.isArray(v)) return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, v[k]]));
  return v;
});
// fresh alpha names come from two counters (registry.ts's module counter, the rg registry's own): renumbered by first appearance
const alpha = (xs: string[]) => { const ids = new Map<string, number>(); return xs.map((x) => x.replace(/\$a\d+/g, (m) => { if (!ids.has(m)) ids.set(m, ids.size + 1); return `$a#${ids.get(m)}`; })); };
type Rep = { start: number; end: number; line: number; rule: string; msg: string };
const repLine = (r: Rep) => `[${r.rule}] ${r.start}-${r.end} L${r.line} ${r.msg}`;

// ---- (1) the registry level ----
type Unit = { job: string; what: string; bucket: "SAME" | "DIFFERENT" | "NOT COVERED" | "BOTH THREW"; old: string[]; neu: string[] };
const spanKey = (n: { start: number; end: number; type: string }) => `${n.start}:${n.end}:${n.type}`;
function nodeIndex(P: Parsed): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (n: Node) => {
    if (!out.has(spanKey(n))) out.set(spanKey(n), n);
    for (const k in n) {
      if (k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === "string") walk(x); }
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v);
    }
  };
  walk(P.program);
  return out;
}
const isTypeKind = (k: string) => k.startsWith("TS") && (k.endsWith("Type") || k.endsWith("Keyword") || k === "TSTypeReference" || k === "TSTypeLiteral" || k === "TSTypeQuery" || k === "TSTypeOperator" || k === "TSTypePredicate");
const kindOf = (n: AstNode) => A.nodeKind(n);
// both registries, one handler each; old reports carry the parse.ts line
class Pair {
  old: Registry; neu: RgRegistry; L: RgLinked; oldReps: Rep[] = [];
  constructor(L: RgLinked, strict: boolean) {
    this.L = L;
    this.old = new Registry(); this.old.strictIndex = strict;
    this.old.onErr = (n, rule, msg) => void this.oldReps.push({ start: n.start, end: n.end, line: n.loc?.start.line ?? 0, rule, msg });
    this.old.onUnsup = (n, what) => void this.oldReps.push({ start: n.start, end: n.end, line: n.loc?.start.line ?? 0, rule: "unsupported", msg: what });
    this.neu = rgRegistry(cellsOf(L), strict);
  }
}
function unit(units: Unit[], P: Pair, job: string, what: string, fo: () => string[], fn: () => string[]) {
  let old: string[], neu: string[], oe: string | null = null, ne: string | null = null;
  const gap0 = P.neu.gap();
  P.oldReps.length = 0;
  try { old = fo(); } catch (x) { oe = (x as Error).message; old = []; }
  old = [...old, ...P.oldReps.map(repLine)];
  try { neu = fn(); } catch (x) { ne = (x as Error).message; neu = []; }
  neu = [...neu, ...P.neu.take().map(repLine)];
  if (oe !== null) old.push(`threw ${oe}`);
  if (ne !== null) neu.push(`threw ${ne}`);
  old = alpha(old); neu = alpha(neu);
  const bucket: Unit["bucket"] = P.neu.gap() !== null || gap0 !== null ? "NOT COVERED" : oe !== null && oe === ne && sp(old) === sp(neu) ? "BOTH THREW" : sp(old) === sp(neu) ? "SAME" : "DIFFERENT";
  units.push({ job, what, bucket, old, neu });
}
const tyLines = (t: Ty | undefined | null) => [t === undefined ? "undefined" : t === null ? "null" : sp(t)];
function tables(P: Pair, names: (o: string) => boolean): { old: string[]; neu: string[] } {
  const o = P.old, n = P.neu;
  const decl = (k: string, kind: string, tps: string[], origin: string, nodes: { start: number; end: number }[]) => `${k} ${kind} <${tps.join(",")}> ${origin} @${nodes.map((x) => `${x.start}-${x.end}`).join(",")}`;
  const val = (k: string, t: Ty, origin: string, marker: string | null, node: { start: number; end: number }, flags: unknown) => `${k} = ${sp(t)} ${origin} ${marker ?? "-"} @${node.start}-${node.end} ${sp(flags ?? null)}`;
  return {
    old: [...[...o.types].filter(([, d]) => names(d.origin)).map(([k, d]) => decl(k, d.kind, d.tps, d.origin, d.nodes)), ...[...o.values].filter(([, v]) => names(v.origin)).map(([k, v]) => val(k, v.t, v.origin, v.marker, v.node, v.flags))],
    neu: [...[...n.types].filter(([, d]) => names(d.origin)).map(([k, d]) => decl(k, d.kind, d.tps, d.origin, d.nodes)), ...[...n.values].filter(([, v]) => names(v.origin)).map(([k, v]) => val(k, v.t, v.origin, v.marker, v.node, v.flags))],
  };
}
const memos = (P: Pair) => ({
  old: [...[...P.old.expandMemo].map(([k, v]) => `E ${k} = ${sp(v)}`), ...[...P.old.ifaceMemo].map(([k, v]) => `I ${k} = ${sp(v)}`), ...[...P.old.quietKeys].map((k) => `Q ${k}`)],
  neu: [...[...P.neu.expandMemo].map(([k, v]) => `E ${k} = ${sp(v)}`), ...[...P.neu.ifaceMemo].map(([k, v]) => `I ${k} = ${sp(v)}`), ...[...P.neu.quietKeys].map((k) => `Q ${k}`)],
});
// the type parameter names declared by n's ancestors and n
function tpsAt(n: AstNode, parent: number[], byNid: (AstNode | null)[]): string[] {
  const out: string[] = [];
  for (let x: AstNode | null = n; x !== null; x = parent[x.nid] === undefined || parent[x.nid]! < 0 ? null : byNid[parent[x.nid]!] ?? null) {
    const tp = (x as any).typeParameters as AstNode | null | undefined;
    if (tp && tp.type === "TSTypeParameterDeclaration") for (const p of tp.params) if (p.type === "TSTypeParameter") out.push(p.name);
  }
  return out;
}
const timing = { old: 0, neu: 0, sources: 0 , lcOld: 0, lcNeu: 0};
function registryPass(L: RgLinked, js: Job[], units: Unit[]) {
  let builtinsDone = false;
  for (const j of js) {
    if (j.src === null) continue;
    const tsx = !!j.src.tsx;
    const P = new Pair(L, j.opts.strictIndex ?? true);
    const key = j.key;
    if (!builtinsDone) {
      builtinsDone = true;
      unit(units, P, key, "constructor: declarations", () => tables(P, () => true).old, () => tables(P, () => true).neu);
      unit(units, P, key, "constructor: memos", () => memos(P).old, () => memos(P).neu);
      unit(units, P, key, "constructor: globals", () => globalsOf(P.old).map((g) => `${g.name} ${g.kind} ${sp(g.t)}`), () => P.L.rgGlobals(P.neu.values, PRELUDE_FNS, ALLOWED_GLOBALS).map((g) => `${g.name} ${g.kind} ${sp(g.t)}`));
      unit(units, P, key, "builtin names", () => [...P.old.builtinTypeNames()].sort(), () => [...P.L.rgBuiltin(P.neu.types)].sort());
    }
    let ast: Ast, Pp: Parsed;
    try { Pp = parse(j.src.cells, { jsx: tsx }); } catch { continue; }
    const pt = A.parseTree(j.src.cells, tsx);
    if (!pt.ok) continue;
    ast = pt.ast;
    const idx = nodeIndex(Pp);
    const toP = (n: AstNode): Node => { const x = idx.get(spanKey({ start: n.start, end: n.end, type: kindOf(n) })); if (!x) throw new Error(`no parse.ts node at ${spanKey(n)}`); return x; };
    timing.sources++;
    const tOld = (f: () => string[]) => () => { const t0 = performance.now(); try { return f(); } finally { timing.old += performance.now() - t0; } };
    const tNeu = (f: () => string[]) => () => { const t0 = performance.now(); try { return f(); } finally { timing.neu += performance.now() - t0; } };
    const tOldLC = (f: () => string[]) => tOld(() => { const t0 = performance.now(); try { return f(); } finally { timing.lcOld += performance.now() - t0; } });
    const tNeuLC = (f: () => string[]) => tNeu(() => { const t0 = performance.now(); try { return f(); } finally { timing.lcNeu += performance.now() - t0; } });
    if (j.src.foreign) {
      const FP = parse(j.src.foreign), ft = A.parseTree(j.src.foreign, false);
      if (ft.ok) unit(units, P, key, "load foreign", tOldLC(() => P.old.load(FP, "foreign").map((s) => `rest ${s.type} L${FP.line(s.start)}`).concat(tables(P, (o) => o === "foreign").old)),
        tNeuLC(() => P.neu.load(ft.ast, "foreign").map((s) => `rest ${kindOf(s)} L${s.line}`).concat(tables(P, (o) => o === "foreign").neu)));
    }
    const shape = A.moduleShape(ast.program, P.L.rgBuiltin(P.neu.types), new Set());
    const clash = shape.clashes.map((c) => c.at.start);
    unit(units, P, key, "load user", tOldLC(() => {
      const at = new Set(clash), skip = new Set<Node>();
      for (const st of Pp.program.body as Node[]) { const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st; if (at.has(d.start)) skip.add(d); }
      return P.old.load(Pp, "user", true, skip).map((s) => `rest ${s.type}@${s.start}`).concat(tables(P, (o) => o === "user").old);
    }), tNeuLC(() => P.neu.load(ast, "user", true, P.L.rgSkip(ast, clash)).map((s) => `rest ${kindOf(s)}@${s.start}`).concat(tables(P, (o) => o === "user").neu)));
    // quiet on each declared name before anything expands it: the trial's expansion is the first
    for (const [k] of [...P.old.types].filter(([, d]) => d.origin === "user" || d.origin === "foreign"))
      unit(units, P, key, `quiet ${k}`, tOld(() => [`${P.old.quiet(named(k))}`]), tNeu(() => [`${P.L.rgQuiet(P.neu.G, P.neu.types, P.neu.expandMemo, P.neu.ifaceMemo, P.neu.Q, P.neu.quietKeys, named(k))}`]));
    const parent = A.parentNids(ast), byNid = A.byNid(ast);
    const roots: AstNode[] = [], fns: AstNode[] = [];
    for (const n of byNid) {
      if (n === null) continue;
      const p = parent[n.nid] ?? -1, pn = p >= 0 ? byNid[p] : null;
      if (isTypeKind(kindOf(n)) && !(pn && isTypeKind(kindOf(pn)))) roots.push(n);
      if (A.isFnNode(n)) fns.push(n);
    }
    const convOld: Ty[] = [], conv: Ty[] = [];
    for (const n of roots) {
      const tps = tpsAt(n, parent, byNid);
      let to: Ty | null = null, tn: Ty | null = null;
      unit(units, P, key, `convert ${spanKey({ start: n.start, end: n.end, type: kindOf(n) })}`,
        tOldLC(() => tyLines((to = P.old.convert(toP(n), { tps: new Set(tps) }, Pp)))),
        tNeuLC(() => tyLines((tn = P.neu.convert(n, { tps: new Set(tps), look: null, ast, origin: "user" })))));
      if (to !== null && tn !== null) { convOld.push(to); conv.push(tn); }
    }
    for (const f of fns) {
      const fp = f as any;
      const ret: AstNode | null = fp.returnType && fp.returnType.type === "TSTypeAnnotation" ? fp.returnType.typeAnnotation : null;
      if (ret === null) continue;
      const tps = tpsAt(f, parent, byNid);
      unit(units, P, key, `sig ${spanKey(f)}`,
        tOld(() => tyLines(P.old.sig((fp.params as AstNode[]).map(toP), toP(ret), undefined, { tps: new Set(tps) }, Pp, "user"))),
        tNeu(() => tyLines(P.L.rgSig(P.neu.G, P.neu.types, P.neu.expandMemo, P.neu.ifaceMemo, P.neu.Q, fp.params, ret, null, { tps: new Set(tps), look: null, ast, origin: "user" }, null))));
    }
    const olds = convOld;
    for (let i = 0; i < conv.length && i < olds.length; i++) {
      const a0 = olds[i]!, b0 = olds[i + 1] ?? olds[i]!, a1 = conv[i]!, b1 = conv[i + 1] ?? conv[i]!;
      unit(units, P, key, `sub #${i}`, tOld(() => [`${P.old.sub(a0, a0)} ${P.old.sub(a0, b0)} ${P.old.sub(b0, a0)} ${P.old.quiet(a0)}`]), tNeu(() => [`${P.neu.sub(a1, a1)} ${P.neu.sub(a1, b1)} ${P.neu.sub(b1, a1)} ${P.L.rgQuiet(P.neu.G, P.neu.types, P.neu.expandMemo, P.neu.ifaceMemo, P.neu.Q, P.neu.quietKeys, a1)}`]));
    }
    const names = [...P.old.types].filter(([, d]) => d.origin === "user" || d.origin === "foreign").map(([k, d]) => [k, d.tps] as const);
    for (const [k, tps] of names) {
      unit(units, P, key, `expand ${k}<${tps.join(",")}>`, tOld(() => tyLines(P.old.expand(named(k, ...tps.map((n): Ty => ({ k: "tv", n })))))), tNeu(() => tyLines(P.neu.expand(named(k, ...tps.map((n): Ty => ({ k: "tv", n })))))));
      unit(units, P, key, `expand ${k} bare`, tOld(() => tyLines(P.old.expand(named(k)))), tNeu(() => tyLines(P.neu.expand(named(k)))));
      if (P.old.types.get(k)?.kind === "iface") unit(units, P, key, `ifaceRec ${k}`, tOld(() => tyLines(P.old.ifaceRec(k))), tNeu(() => tyLines(P.neu.ifaceRec(k))));
      unit(units, P, key, `peeked expand ${k}`, tOld(() => tyLines(P.old.peek(() => P.old.expand(named(k))))), tNeu(() => tyLines(P.neu.peek(() => P.neu.expand(named(k))))));
    }
    unit(units, P, key, "memos at the end", () => memos(P).old, () => memos(P).neu);
  }
}
function unitReport(us: Unit[], label: string, show = SHOW) {
  const c: Record<string, number> = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0, "BOTH THREW": 0 };
  for (const u of us) c[u.bucket]++;
  const kinds = new Map<string, Record<string, number>>();
  for (const u of us) { const k = u.what.split(" ")[0]!; const m = kinds.get(k) ?? { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0, "BOTH THREW": 0 }; m[u.bucket]++; kinds.set(k, m); }
  console.log(`${label}: ${us.length} units in ${new Set(us.map((u) => u.job)).size} sources: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]} BOTH THREW ${c["BOTH THREW"]}`);
  if (show > 1) for (const [k, m] of kinds) console.log(`  ${k.padEnd(12)} SAME ${m.SAME} DIFFERENT ${m.DIFFERENT} NOT COVERED ${m["NOT COVERED"]} BOTH THREW ${m["BOTH THREW"]}`);
  for (const u of us.filter((u) => u.bucket === "DIFFERENT").slice(0, show)) {
    console.log(`DIFFERENT ${u.job} ${u.what}`);
    console.log(`  old-only ${JSON.stringify(u.old.filter((x) => !u.neu.includes(x)).slice(0, 3)).slice(0, 600)}\n  rg-only  ${JSON.stringify(u.neu.filter((x) => !u.old.includes(x)).slice(0, 3)).slice(0, 600)}`);
  }
  return c;
}

// ---- (2) end to end ----
type ModRec = { key: string; bucket: "SAME" | "DIFFERENT" | "NOT COVERED" | "BOTH THREW"; why?: string; real: string[]; port: string[]; realMs: number; portMs: number };
function modLines(r: any, spans: { ch: string[]; chUnsup: string[] }[]): string[] {
  const e = (x: any) => `[${x.rule}] L${x.line} ${x.msg}`;
  return [
    `head ${r.port} ${r.file} ok ${r.ok}`, ...r.module.map((x: any) => "module " + e(x)),
    ...r.cells.flatMap((c: any) => [`cell ${c.name}: ${c.status} L${c.line} : ${"value" in c ? c.value : "(no value)"} by ${JSON.stringify(c.blockedBy)} keys ${Object.keys(c).join(",")}`, ...c.errors.map((x: any) => "  " + e(x)), ...c.unsupported.map((x: any) => "  u " + e(x))]),
    ...[...(r.facts ?? new Map()).entries()].map(([k, f]: [string, unknown]) => `fact ${k} ${JSON.stringify(f)}`),
    ...spans.flatMap((s, i) => [`span #${i}`, ...s.ch.map((x) => "  d " + x), ...s.chUnsup.map((x) => "  u " + x)]),
  ];
}
const parses = { n: 0 };
// the frozen parse.ts (registry.ts's second parse) and the live one (acornParse's parsers, both sides' typed trees)
for (const C of [TS, TSX, LIVE_TS, LIVE_TSX] as any[]) { const p = C.parse.bind(C); C.parse = (...a: unknown[]) => { parses.n++; return p(...a); }; }
// the shipped glue's record of cells: the linked copy's cells in place of the shipped ones
const cellsOf = (L: RgLinked): RgCells => ({ ...RG, ...L });
const parseCount = { real: 0, port: 0 };
function e2ePass(L: RgLinked, js: Job[]): ModRec[] {
  const recs: ModRec[] = [], C = cellsOf(L);
  for (const j of js) {
    if (j.src === null) continue;
    let real: string[] = [], port: string[] = [], realErr: string | null = null, portErr: string | null = null, gap: string | null = null;
    let p0 = parses.n, t0 = performance.now();
    try { const a = runCheck(mdCheckSources, j.src, j.opts); real = modLines(a.result, a.spans); } catch (x) { realErr = (x as Error).message; }
    const realMs = performance.now() - t0;
    parseCount.real += parses.n - p0;
    p0 = parses.n; t0 = performance.now();
    try { const b = shippedRunCheck(mdCheckSources, j.src, j.opts, C); port = modLines(b.result, b.spans); gap = b.rgGap; } catch (x) { portErr = (x as Error).message; }
    const portMs = performance.now() - t0;
    parseCount.port += parses.n - p0;
    real = alpha(real); port = alpha(port);
    let bucket: ModRec["bucket"], why: string | undefined;
    if (gap !== null) { bucket = "NOT COVERED"; why = gap; }
    else if (realErr !== null || portErr !== null) { bucket = realErr === portErr ? "BOTH THREW" : "DIFFERENT"; why = `real ${realErr ?? "no throw"}; port ${portErr ?? "no throw"}`; }
    else bucket = JSON.stringify(real) === JSON.stringify(port) ? "SAME" : "DIFFERENT";
    recs.push({ key: j.key, bucket, why, real, port, realMs, portMs });
  }
  return recs;
}
function modReport(recs: ModRec[], label: string, show = SHOW) {
  const c: Record<string, number> = { SAME: 0, DIFFERENT: 0, "NOT COVERED": 0, "BOTH THREW": 0 };
  for (const r of recs) c[r.bucket]++;
  console.log(`${label}: ${recs.length} sources: SAME ${c.SAME} DIFFERENT ${c.DIFFERENT} NOT COVERED ${c["NOT COVERED"]} BOTH THREW ${c["BOTH THREW"]}`);
  const tally = new Map<string, number>();
  for (const r of recs.filter((r) => r.bucket === "NOT COVERED" || r.bucket === "BOTH THREW")) tally.set(`${r.bucket}: ${r.why}`, (tally.get(`${r.bucket}: ${r.why}`) ?? 0) + 1);
  for (const [k, n] of tally) console.log(`  ${n} ${k}`);
  for (const r of recs.filter((r) => r.bucket === "DIFFERENT").slice(0, show)) {
    console.log(`MODULE DIFFERENT ${r.key}${r.why ? " " + r.why : ""}`);
    console.log(`  real-only ${JSON.stringify(r.real.filter((x) => !r.port.includes(x)).slice(0, 3)).slice(0, 600)}\n  port-only ${JSON.stringify(r.port.filter((x) => !r.real.includes(x)).slice(0, 3)).slice(0, 600)}`);
  }
  return c;
}

// ---- controls: one cell broken per rg file ----
const CONTROLS: [string, string, string][] = [
  ["rg-ctl: rgPeekClose keeps the peek's memo entries", "rgPeekClose", "() => (E, I, Q, was) => { Q.mode = was.mode; Q.loud = was.loud; Q.peeks = was.peeks; Q.undo = was.undo; }"],
  ["rg-convert: rgTuple reads a rest element as its type", "rgTuple", "(nodeKind, ERR, rgUnsup) => (G, Y, E, I, Q, n, c) => { const els = []; for (const e of n.elementTypes) els.push(G.convert(G, Y, E, I, Q, e, c)); return { k: 'tup', els }; }"],
  ["rg-sig: rgSigParam, no parameter optional", "rgSigParam", "(rgParamAnn, rgUnsup, rgGap, RG_PARAMS, nodeKind, UNKNOWN, ERR) => (G, Y, E, I, Q, q, c) => { if (q.type === 'RestElement') { const a = rgParamAnn(Q, q) ?? rgParamAnn(Q, q.argument); const t = a !== null ? G.convert(G, Y, E, I, Q, a, c) : UNKNOWN; return { k: 'rest', t: t.k === 'arr' ? t.el : rgUnsup(Q, q, 'rest parameter type') }; } const id = q.type === 'AssignmentPattern' ? q.left : q; const a = rgParamAnn(Q, id); const t = a !== null ? G.convert(G, Y, E, I, Q, a, c) : rgUnsup(Q, q, 'untyped parameter in a signature'); return { k: 'param', p: { n: id.type === 'Identifier' ? id.name : '_', t, opt: false } }; }"],
  ["rg-expand: rgIfaceExtends ignores extends", "rgIfaceExtends", "() => (G, Y, E, I, Q, name, node, r0) => r0"],
  ["rg-load: rgDeclType never merges an interface", "rgDeclType", "(rgTpNames) => (Y, Q, d, ast, origin) => { if (d.type !== 'TSTypeAliasDeclaration' && d.type !== 'TSInterfaceDeclaration') return; Y.set(d.id.name, { kind: d.type === 'TSTypeAliasDeclaration' ? 'alias' : 'iface', tps: rgTpNames(Q, d.typeParameters), nodes: [d], origin, ast }); }"],
  ["rg-view: rgGlobals without the equals/messageOf types", "rgGlobals", "(ERR, UNDEF) => (V, preludeFns, allowed) => { const out = new Map(); for (const name of preludeFns) out.set(name, { name, t: ERR, kind: 'prelude' }); for (const name of allowed) { const v = V.get(name); if (name === 'undefined') out.set(name, { name, t: UNDEF, kind: 'global' }); else if (v !== undefined && v.origin === 'intrinsic') out.set(name, { name, t: v.t, kind: 'global' }); } return [...out.values()]; }"],
  ["rg-expand: rgLiveSet does nothing (a record read while it is built stays empty)", "rgLiveSet", "() => () => {}"],
  ["rg-ctl: rgTrial never loud", "rgTrial", "(rgPeekOpen, rgPeekClose) => (G, Y, E, I, Q, t) => { const was = rgPeekOpen(Q); const e = G.expand(G, Y, E, I, Q, t); rgPeekClose(E, I, Q, was); return e; }"],
];

// ---- census (--census): uses per declaration form over the corpus sources, on the typed tree ----
function census(js: Job[]) {
  const c = new Map<string, number>();
  const add = (k: string, n = 1) => c.set(k, (c.get(k) ?? 0) + n);
  for (const j of js) {
    if (j.src === null) continue;
    for (const [text, tsx] of [[j.src.cells, !!j.src.tsx], ...(j.src.foreign ? [[j.src.foreign, false]] : [])] as [string, boolean][]) {
      const p = A.parseTree(text, tsx);
      if (!p.ok) continue;
      const ast = p.ast, byNid = A.byNid(ast);
      const ifaces = new Map<string, number>(), fnDecls = new Map<string, number>();
      for (const n of byNid) {
        if (n === null) continue;
        const k = kindOf(n);
        if (n.type === "TSTypeParameter") { if (n.constraint) add("type parameter with constraint"); if (n.default) add("type parameter with default"); }
        if (n.type === "TSInterfaceDeclaration") { add("interface"); if (n.extends.length) add("interface with extends"); if (n.id.type === "Identifier") ifaces.set(n.id.name, (ifaces.get(n.id.name) ?? 0) + 1); if (n.typeParameters) add("generic interface"); }
        if (n.type === "TSTypeAliasDeclaration") {
          add("type alias"); if (n.typeParameters) add("generic alias");
          const name = n.id.type === "Identifier" ? n.id.name : "";
          const inside = (x: AstNode): boolean => (x.type === "TSTypeReference" && x.typeName.type === "Identifier" && x.typeName.name === name) || A.childrenOf(x).some((y) => inside(y.node));
          if (inside(n.typeAnnotation)) add("recursive alias");
          if (n.typeAnnotation.type === "TSTypeReference") add("alias of a type reference");
        }
        if (n.type === "TSDeclareFunction" && n.id.type === "Identifier") fnDecls.set(n.id.name, (fnDecls.get(n.id.name) ?? 0) + 1);
        if (n.type === "VariableDeclaration" && n.declare) add("declare const/let");
        if (n.type === "TSIndexSignature") add("index signature");
        if (n.type === "TSTupleType") { add("tuple"); for (const e of n.elementTypes) if (["TSNamedTupleMember", "TSOptionalType", "TSRestType"].includes(kindOf(e))) add(`tuple element ${kindOf(e)}`); }
        if (n.type === "TSTypeOperator") add(`type operator ${n.operator}`);
        if (n.type === "TSUnionType" && n.types.every((x) => x.type === "TSLiteralType")) add("union of literals");
        if (n.type === "TSFunctionType") add("function type");
        if (n.type === "TSMethodSignature") add(`method signature${n.kind !== "method" ? " " + n.kind : ""}`);
        if (n.type === "TSCallSignatureDeclaration") add("call signature");
        if (n.type === "TSConstructSignatureDeclaration") add("construct signature");
        if (n.type === "TSTypeQuery") add("typeof query");
        if (n.type === "ClassDeclaration") add("class");
        if (n.type === "TSQualifiedName") add("qualified name");
        if (n.type === "TSLiteralType") add(`literal type ${kindOf(n.literal)}`);
        if (n.type === "TSPropertySignature" && n.computed) add("computed property signature");
        if (n.type === "TSTypeReference" && n.typeName.type === "Identifier" && ["Record", "Action", "Js", "ValueOf", "ReadonlyArray"].includes(n.typeName.name)) add(`reference ${n.typeName.name}`);
        if (!["TSTypeAnnotation"].includes(k) && isTypeKind(k) && !["TSTypeReference", "TSTypeLiteral", "TSUnionType", "TSArrayType", "TSTupleType", "TSFunctionType", "TSLiteralType", "TSParenthesizedType", "TSTypeOperator", "TSTypeQuery"].includes(k) && !k.endsWith("Keyword")) add(`other type node ${k}`);
        if (n.type === "Other") add(`Other ${n.kind}`);
      }
      for (const [, v] of ifaces) if (v > 1) add("interface declared twice");
      for (const [, v] of fnDecls) if (v > 1) add("overloaded declare function");
      const leading = ast.comments.filter((x) => /@(mutates|fresh|view|retains|banned)\b/.test(x.text)).length;
      if (leading) add("@flag comments", leading);
    }
  }
  for (const [k, n] of [...c].sort()) console.log(`${String(n).padStart(6)} ${k}`);
}
// ---- run ----
const L = linkRg();
const MJ = moduleJobs(jobs());
if (process.argv.includes("--census")) { census(MJ); process.exit(0); }
console.log(`rg files ${RG_FILES.map((f) => `${f}:${Bun.hash(readFileSync(join(import.meta.dir, f), "utf8")).toString(36)}`).join(" ")}`);
console.log(`frozen registry.ts ${Bun.hash(readFileSync(join(import.meta.dir, "frozen/ts/registry.ts"), "utf8")).toString(36)} core.ts ${Bun.hash(readFileSync(join(import.meta.dir, "frozen/ts/core.ts"), "utf8")).toString(36)}`);
const units: Unit[] = [];
registryPass(L, MJ, units);
const uc = unitReport(units, "registry level");
console.log(`  load+convert only µs per source (${timing.sources} sources): registry.ts ${(timing.lcOld * 1000 / timing.sources).toFixed(1)} rg ${(timing.lcNeu * 1000 / timing.sources).toFixed(1)}`);
console.log(`  all units µs per source (${timing.sources} sources, the units' calls): registry.ts ${(timing.old * 1000 / timing.sources).toFixed(1)} rg ${(timing.neu * 1000 / timing.sources).toFixed(1)}`);
const recs = e2ePass(L, MJ);
const mc = modReport(recs, "end to end");
console.log(`  parser runs: checkSources ${parseCount.real}, rg ${parseCount.port} (${recs.length} sources)`);
const sum = (k: "realMs" | "portMs", f: (r: ModRec) => boolean) => recs.filter(f).reduce((s, r) => s + r[k], 0);
const notBig = (r: ModRec) => r.key !== "module:lite/infer";
console.log(`  ms, corpus without module:lite/infer: checkSources ${sum("realMs", notBig).toFixed(0)} rg ${sum("portMs", notBig).toFixed(0)}; module:lite/infer ${sum("realMs", (r) => !notBig(r)).toFixed(0)} / ${sum("portMs", (r) => !notBig(r)).toFixed(0)}`);
if (ROUNDS > 1) {
  const CJ = MJ.filter((j) => j.key !== "module:lite/infer" && j.src !== null);
  const C = cellsOf(L);
  for (let i = 0; i < ROUNDS; i++) {
    let t0 = performance.now();
    for (const j of CJ) { try { runCheck(mdCheckSources, j.src!, j.opts); } catch {} }
    const a = performance.now() - t0;
    t0 = performance.now();
    for (const j of CJ) { try { shippedRunCheck(mdCheckSources, j.src!, j.opts, C); } catch {} }
    const b = performance.now() - t0;
    const us = (ms: number) => (ms * 1000 / CJ.length).toFixed(1);
    const tm = (f: () => void) => { const t = performance.now(); f(); return performance.now() - t; };
    const po: unknown[] = [], pn: unknown[] = [];
    const parseOld = tm(() => { for (const j of CJ) { try { po.push(parse(j.src!.cells, { jsx: !!j.src!.tsx })); } catch { po.push(null); } } });
    const parseNeu = tm(() => { for (const j of CJ) { const t = A.parseTree(j.src!.cells, !!j.src!.tsx); pn.push(t.ok ? t.ast : null); } });
    const ro: Registry[] = [], rn: RgRegistry[] = [];
    const ctorOld = tm(() => { for (const _ of CJ) { const r = new Registry(); r.onErr = () => {}; r.onUnsup = () => {}; ro.push(r); } });
    const ctorNeu = tm(() => { for (const _ of CJ) rn.push(rgRegistry(C, true)); });
    const loadOld = tm(() => { po.forEach((p, k) => { if (p) try { ro[k]!.load(p as any, "user", true); } catch {} }); });
    const loadNeu = tm(() => { pn.forEach((p, k) => { if (p) try { rn[k]!.load(p as any, "user", true); } catch {} }); });
    const c = parseOld + ctorOld + loadOld, d = parseNeu + ctorNeu + loadNeu;
    console.log(`round ${i + 1}: ${CJ.length} modules: checkSources ${a.toFixed(0)} ms, rgRunCheck ${b.toFixed(0)} ms; µs per module registry.ts/rg: parse ${us(parseOld)}/${us(parseNeu)}, construct ${us(ctorOld)}/${us(ctorNeu)}, load ${us(loadOld)}/${us(loadNeu)}, all ${us(c)}/${us(d)}`);
  }
}
if (process.argv.includes("--controls")) {
  const CJ = MJ.filter((j) => j.key !== "module:lite/infer");
  for (const [what, name, text] of CONTROLS) {
    const LC = linkRg({ [name]: new Function(`return (${text});`)() });
    const us: Unit[] = [];
    registryPass(LC, CJ, us);
    const a = unitReport(us, `control (${what}) registry level`, 0);
    const b = modReport(e2ePass(LC, CJ), `control (${what}) end to end`, 0);
    if (a.DIFFERENT === 0 && b.DIFFERENT === 0) console.log(`  CONTROL NOT DETECTED: ${what}`);
  }
}
mkdirSync(dirname(OUT), { recursive: true });
if (process.argv.includes("--dump")) for (const u of units) console.log(u.bucket, u.what, JSON.stringify(u.neu).slice(0, 300));
writeFileSync(OUT, JSON.stringify({ units: units.filter((u) => u.bucket !== "SAME"), recs: recs.filter((r) => r.bucket !== "SAME").map((r) => ({ key: r.key, bucket: r.bucket, why: r.why })) }, null, 1));
if (uc.DIFFERENT > 0 || mc.DIFFERENT > 0) process.exitCode = 1;
