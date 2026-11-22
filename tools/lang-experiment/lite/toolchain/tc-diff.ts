// bun lite/toolchain/tc-diff.ts [--controls] [--rounds R] [--only <key part>] [--show N] [--no-ojs]: today's toolchain
// (ss-toolchain.ts, comment-types.ts, module-js.ts, erase.ts, frozen in lite/infer/frozen/ts/ on 2026-11-22) against
// the shipped files, which are the tc cells (ss-toolchain.ts toolchainOf; a control's linked copy), call by call, over
// the corpus of lite/infer/diff.ts (sources, cells and the .ojs inline strings), the string literals of the toolchain's
// test files, every cell of the shipped .ojs files (compiled by the standard Observable compiler) and every variable
// of the built notebook. Per call: SAME (equal value, or the same thrown message), DIFFERENT, NOT COVERED (the port
// threw "tc-gap: ..."), TODAY TYPEERROR (today's threw a TypeError and the port did not match it).
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { Glob } from "bun";
import * as acorn from "acorn";
import * as orig from "../infer/frozen/ts/toolchain/ss-toolchain.ts";
import * as ct from "../infer/frozen/ts/toolchain/comment-types.ts";
import * as mj from "../infer/frozen/ts/toolchain/module-js.ts";
import { erase } from "../infer/frozen/ts/browser/erase.ts";
import { lowerJsx } from "../infer/frozen/ts/jsx/lower.ts";
import { checkSources } from "../core.ts";
import { parse } from "../infer/frozen/ts/parse.ts";
import { specRejects } from "../soundscript/spec-cases.ts";
import { linkTc, TC_FILES, type TcLinked } from "./tc-index.ts";
import { toolchainOf, TOOLCHAIN, TC as SHIPPED } from "./ss-toolchain.ts";
import { blocks, blockContent } from "../../../lib/notebook-blocks.ts";
import { CORPUS, EXTRA, OUTSIDE } from "../../ojs-roundtrip/corpus.ts";
import { checkCells } from "../stdlib/runtime.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 0), ONLY = arg("--only"), SHOW = Number(arg("--show") ?? 5);
const ROOT = resolve(import.meta.dir, "../..");
const LITE = join(ROOT, "lite");
const OUT = join(LITE, "soundscript/.scratch/tc-port");
mkdirSync(OUT, { recursive: true });

// ---- the tree this ran on ----
const stamp = (f: string) => `${f}:${Bun.hash(readFileSync(join(LITE, f), "utf8")).toString(36)}`;
console.log("today (frozen)", ["toolchain/ss-toolchain.ts", "toolchain/comment-types.ts", "toolchain/module-js.ts", "browser/erase.ts", "facts.ts", "jsx/lower.ts"].map((f) => stamp(`infer/frozen/ts/${f}`)).join(" "));
console.log("tc", [...TC_FILES, "tc-shell.ts", "tc-index.ts"].map((f) => stamp(`toolchain/${f}`)).join(" "));

// ---- the corpus: module sources (lite/infer/diff.ts's jobs, copied: that file runs when imported) ----
type Src = { key: string; cells: string; tsx: boolean };
function headerEnd(src: string): number { let at = 0; for (const c of parse(src).comments) { if (src.slice(at, c.start).trim()) break; at = c.end; } return at; }
function sources(): Src[] {
  const out: Src[] = [];
  const read = (dir: string, f: string) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : null);
  const dirs = new Set<string>();
  for (const g of ["ports/*/cells.ts*", "fixtures/*/cells.ts*", "fixtures/*/*/cells.ts*", "port-editor5/*/cells.ts*", "horde/*/cells.ts*", "horde/cells.ts", "lite/browser/cells.ts"])
    for (const f of new Glob(g).scanSync(ROOT)) dirs.add(join(ROOT, f, ".."));
  for (const d of [...dirs].sort()) {
    const tsx = !existsSync(join(d, "cells.ts")) && existsSync(join(d, "cells.tsx"));
    out.push({ key: `port:${d.slice(ROOT.length + 1)}`, cells: read(d, tsx ? "cells.tsx" : "cells.ts") ?? "", tsx });
  }
  for (const g of ["lite/notebook/examples/*.ts*", "lite/soundscript/spec-[0-9]*.ts*", "lite/soundscript/core-example.ts", "lite/soundscript/tutorial-*.tsx"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) out.push({ key: `file:${f}`, cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith(".tsx") });
  for (const g of ["lite/*.ss.ts", "lite/acorn/*.ss.ts", "lite/infer/*.ss.ts", "lite/toolchain/*.ss.ts", "selfhost/*.ss.ts", "selfhost/rt/*.ss.ts", "lite/soundscript/.scratch/checker-port/probes/*.ss.ts"])
    for (const f of [...new Glob(g).scanSync(ROOT)].sort()) {
      const s = readFileSync(join(ROOT, f), "utf8");
      let body = s;
      try { body = s.slice(headerEnd(s)).trimStart(); } catch {}
      for (const tsx of [false, true]) out.push({ key: `ss${tsx ? "x" : ""}:${f}`, cells: body, tsx });
    }
  for (const [i, c] of specRejects().entries()) out.push({ key: `reject:${c.statement}#${i}`, cells: c.source, tsx: true });
  for (const f of ojsFiles()) for (const s of ojsStrings(readFileSync(f, "utf8"))) out.push({ key: `inline:${f.slice(ROOT.length + 1)}#${Bun.hash(s).toString(36)}`, cells: s, tsx: true });
  for (const f of TEST_FILES) for (const s of literals(readFileSync(join(LITE, f), "utf8"))) for (const tsx of [false, true]) out.push({ key: `test${tsx ? "x" : ""}:${f}#${Bun.hash(s).toString(36)}`, cells: s, tsx });
  for (const f of new Glob("lite/toolchain/repro/*.ts*").scanSync(ROOT)) out.push({ key: `repro:${f}`, cells: readFileSync(join(ROOT, f), "utf8"), tsx: f.endsWith("x") });
  return ONLY ? out.filter((s) => s.key.includes(ONLY)) : out;
}
const TEST_FILES = ["toolchain/ss-toolchain.test.ts", "toolchain/roundtrip-edge.test.ts", "toolchain/ojs-roundtrip.test.ts", "toolchain/translate.test.ts", "toolchain/comment-types.test.ts", "browser/erase.test.ts"];
const ojsFiles = () => ["spec.ojs", "tutorial.ojs", "checker-tests.ojs", "runtime-tests.ojs", "core.ojs", "raw-cells.ojs", ...readdirSync(join(LITE, "soundscript/sections")).map((x) => "sections/" + x)]
  .map((f) => join(LITE, "soundscript", f)).filter((p) => existsSync(p) && statSync(p).isFile() && p.endsWith(".ojs"));
// every string literal and expression-free template of a source, from its parse
function literals(src: string): string[] {
  const out = new Set<string>();
  const walk = (n: any) => {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "TemplateLiteral" && n.expressions.length === 0 && typeof n.quasis[0].value.cooked === "string") out.add(n.quasis[0].value.cooked);
    if (n.type === "Literal" && typeof n.value === "string" && n.value.length > 3) out.add(n.value);
    for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); }
  };
  try { walk(parse(src).program); } catch {}
  return [...out];
}
// collect.ts's inline selection, as lite/infer/diff.ts copies it
function ojsStrings(text: string): string[] {
  const out: string[] = [];
  for (const cell of text.split(/^\/\/ %%$/m)) {
    let ast: any;
    try { ast = acorn.parse(cell.replace(/^\s*viewof\s+/m, "").replace(/^\s*mutable\s+/m, ""), { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true }); } catch { continue; }
    for (const s of literals(cell.replace(/^\s*viewof\s+/m, "").replace(/^\s*mutable\s+/m, ""))) if (/=>/.test(s) && /^\s*(const|type|interface|\/\/|function)/.test(s)) out.push(s);
    void ast;
  }
  return out;
}

// ---- comparing ----
type Got = { ok: true; v: string } | { ok: false; msg: string; type: string };
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (x instanceof Set ? { set: [...x] } : x instanceof Map ? { map: [...x] } : x));
const run = (f: () => unknown): Got => { try { return { ok: true, v: json(f()) }; } catch (e) { return { ok: false, msg: String((e as Error)?.message ?? e), type: (e as Error)?.constructor?.name ?? "?" }; } };
type Tally = Record<string, number>;
const BUCKETS = ["SAME", "SAME THROW", "DIFFERENT", "NOT COVERED", "TODAY TYPEERROR"] as const;
class Diff {
  per = new Map<string, Tally>();
  shown = new Map<string, string[]>();
  record(fn0: string, key: string, a: Got, b: Got) {
    const fn = key.startsWith("repro:") ? `${fn0} (repro)` : fn0;
    const bucket = !b.ok && b.msg.startsWith("tc-gap:") ? "NOT COVERED"
      : a.ok && b.ok ? (a.v === b.v ? "SAME" : "DIFFERENT")
      : !a.ok && !b.ok && a.msg === b.msg ? "SAME THROW"
      : !a.ok && a.type === "TypeError" ? "TODAY TYPEERROR" : "DIFFERENT";
    const t = this.per.get(fn) ?? Object.fromEntries(BUCKETS.map((x) => [x, 0]));
    t[bucket]++;
    this.per.set(fn, t);
    if (bucket !== "SAME" && bucket !== "SAME THROW") {
      const s = this.shown.get(`${fn} ${bucket}`) ?? [];
      if (s.length < SHOW) s.push(`${key}\n      today ${(a.ok ? a.v : "THROWS " + a.msg).slice(0, 300)}\n      port  ${(b.ok ? b.v : "THROWS " + b.msg).slice(0, 300)}`);
      this.shown.set(`${fn} ${bucket}`, s);
    }
  }
  total(repro = true) { const t: Tally = Object.fromEntries(BUCKETS.map((x) => [x, 0])); for (const [f, x] of this.per) if (repro || !f.endsWith("(repro)")) for (const b of BUCKETS) t[b] += x[b]; return t; }
}
const line = (t: Tally) => BUCKETS.map((b) => `${b} ${t[b]}`).join(" ");

// ---- one pass of the corpus through both ----
// the shipped glue over a linked copy of the cells (a control replaces one)
const api = (L: TcLinked) => toolchainOf({ ...SHIPPED, ...L });
type Api = ReturnType<typeof toolchainOf>;
const checks = new Map<string, any>();
const checked = (s: Src) => {
  if (!checks.has(s.key)) { let r: any = null; try { r = checkSources({ cells: s.cells, tsx: s.tsx }); } catch {} checks.set(s.key, r); }
  return checks.get(s.key);
};
const shapes = new Map<string, number>();
const shape = (k: string) => shapes.set(k, (shapes.get(k) ?? 0) + 1);
type Ojs = { key: string; vars: { name: string | null; inputs: string[]; definition: string }[] };

function pass(T: Api, srcs: Src[], ojsCells: Ojs[], defs: { key: string; definition: string }[], modules: { key: string; src: string }[], count: boolean): Diff {
  const D = new Diff();
  const cmp = (fn: string, key: string, a: () => unknown, b: () => unknown) => D.record(fn, key, run(a), run(b));
  for (const s of srcs) {
    const k = s.key;
    cmp("splitCells", k, () => orig.splitCells(s.cells, s.tsx), () => T.splitCells(s.cells, s.tsx));
    cmp("erase", k, () => erase(s.cells), () => T.erase(s.cells));
    const lowered = run(() => (s.tsx ? lowerJsx(s.cells) : s.cells));
    if (lowered.ok) {
      const l = JSON.parse(lowered.v);
      cmp("commentTypes", k, () => ct.commentTypes(l), () => T.commentTypes(l));
      const c = run(() => ct.compile(l));
      if (c.ok) { const js = JSON.parse(c.v); cmp("decompile (comment-types)", k, () => ct.decompile(js), () => T.decompile(js)); cmp("uncommentTypes", k, () => ct.uncommentTypes(js), () => T.uncommentTypes(js)); }
      cmp("langOf", k, () => ct.langOf(l), () => T.langOf(l));
    }
    let texts: string[];
    try { texts = orig.splitCells(s.cells, s.tsx); } catch { texts = []; }
    if (!texts.length) continue;
    const r = checked(s);
    cmp("contextOf", k, () => orig.contextOf(texts, s.tsx), () => T.contextOf(texts, s.tsx));
    const cfg: [string, orig.Context | undefined][] = [["none", undefined]];
    if (r) {
      cmp("acceptedOf", k, () => orig.acceptedOf(r), () => T.acceptedOf(r));
      cmp("contextFromCheck", k, () => orig.contextFromCheck(r), () => T.contextFromCheck(r));
      cmp("cellStates", k, () => orig.cellStates(r), () => T.cellStates(r));
      for (const c of r.cells) {
        cmp("whyOf", `${k} ${c.name}`, () => orig.whyOf(r, c), () => T.whyOf(r, c));
        for (const n of [c.name, orig.variableName(c.name), orig.handleName(c.name)]) {
          cmp("variableName", n, () => orig.variableName(n), () => T.variableName(n));
          cmp("keyOfVariable", n, () => orig.keyOfVariable(n), () => T.keyOfVariable(n));
          cmp("isDuplicateKey", n, () => orig.isDuplicateKey(n), () => T.isDuplicateKey(n));
          cmp("handleName", n, () => orig.handleName(n), () => T.handleName(n));
          cmp("cellOfVariable", n, () => orig.cellOfVariable(n), () => T.cellOfVariable(n));
        }
      }
      const fromCheck = orig.contextFromCheck(r);
      const viaContextOf = { ...orig.contextOf(texts, s.tsx, orig.acceptedOf(r)), why: fromCheck.why };
      cfg.push(["contextOf+check", viaContextOf], ["contextFromCheck", fromCheck], ["module", { ...fromCheck, module: "@a/m" }], ["runtime module", { ...fromCheck, inputs: orig.inputsIn(true) }]);
    }
    const seen = new Map<string, number>();
    for (const t of texts) {
      const d = orig.declaredName(t);
      const n = d ? (seen.get(d) ?? 0) + 1 : 0;
      if (d) seen.set(d, n);
      const hint = n > 1 ? `${d} (${n})` : null;
      for (const [label, c] of cfg) {
        const key = `${k} [${label}${hint ? " " + hint : ""}] ${t.slice(0, 60)}`;
        const a = run(() => orig.compileCell(t, s.tsx, c, hint)), b = run(() => T.compileCell(t, s.tsx, c, hint));
        D.record("compileCell", key, a, b);
        cmp("compileCellText", key, () => orig.compileCellText(t, s.tsx, c, hint), () => T.compileCellText(t, s.tsx, c, hint));
        if (count && a.ok) for (const v of JSON.parse(a.v) as orig.Variable[]) {
          const kind = orig.compiledKind(v.definition);
          shape(`${label}: ${v.definition === orig.STATE_VALUE ? "state value" : v.name.startsWith("$ss$type$") ? "type cell" : kind?.callee ?? "not ss"}`);
          for (const i of ["ss_cross", "ss_viewRef", "ss_compileFor", "structuredClone", "URLSearchParams", "invalidation"]) if (v.inputs.includes(i)) shape(`${label}: input ${i}`);
          if (s.tsx && kind) shape(`${label}: tsx`);
        }
        if (a.ok) for (const v of JSON.parse(a.v) as orig.Variable[]) defs.push({ key: `${key} ${v.name}`, definition: v.definition });
      }
    }
    cmp("compileModule", k, () => orig.compileModule(s.cells, s.tsx), () => T.compileModule(s.cells, s.tsx));
    if (r) cmp("compileModule+accepted", k, () => orig.compileModule(s.cells, s.tsx, orig.acceptedOf(r)), () => T.compileModule(s.cells, s.tsx, T.acceptedOf(r)));
    const mod = run(() => orig.compileModule(s.cells, s.tsx).map((v) => v.definition));
    if (mod.ok) { const ds = JSON.parse(mod.v); cmp("decompileModule", k, () => orig.decompileModule(ds), () => T.decompileModule(ds)); }
  }
  for (const d of defs) {
    cmp("langOf", d.key, () => orig.langOf(d.definition), () => T.langOf(d.definition));
    cmp("parseCompiled", d.key, () => summary(orig.parseCompiled(d.definition)), () => summaryTc(T.parseCompiled(d.definition)));
    cmp("compiledKind", d.key, () => orig.compiledKind(d.definition), () => T.compiledKind(d.definition));
    cmp("decompileVariable", d.key, () => orig.decompileVariable(d.definition), () => T.decompileVariable(d.definition));
    if (count) shape(`decompileVariable (today's): ${orig.decompileVariable(d.definition) === null ? "null" : "source"}`);
    cmp("syntaxStub", d.key, () => mj.syntaxStub(d.definition), () => T.syntaxStub(d.definition));
  }
  for (const o of ojsCells) for (const expression of [undefined, true, false]) {
    const vs = o.vars;
    if (count) { const r = orig.fromObservableVariables(vs, expression === undefined ? {} : { expression }); shape(`fromObservableVariables (today's): ${"text" in r ? "text" : "reason"}`); }
    cmp("fromObservableVariables", `${o.key} ${expression}`, () => orig.fromObservableVariables(vs, expression === undefined ? {} : { expression }), () => tcTranslate(T, vs, expression));
  }
  for (const m of modules) cmp("moduleJs", m.key, () => mj.moduleJs(m.src), () => T.moduleJs(m.src));
  for (const n of [false, true]) cmp("inputsIn", String(n), () => orig.inputsIn(n), () => T.inputsIn(n));
  cmp("INPUTS", "-", () => orig.INPUTS, () => T.INPUTS);
  cmp("RUNTIME_CELLS", "-", () => orig.RUNTIME_CELLS, () => T.RUNTIME_CELLS);
  return D;
}
const tcTranslate = (T: Api, vs: Ojs["vars"], expression: boolean | undefined) => T.fromObservableVariables(vs, expression === undefined ? {} : { expression });
// what parseCompiled decides, in plain data, from each side
const str = (x: unknown) => (typeof x === "string" ? x : null);
const summary = (p: orig.Compiled | null) => p && { header: { d: str(p.header.d), h: str(p.header.h), t: str(p.header.t) }, headerEnd: p.headerEnd, callee: p.callee, name: p.name, refs: p.refs, fnEnd: p.fn ? p.fn.end : -1, comments: p.comments.map((c) => [c.type === "Block", c.value, c.start, c.end]) };
const summaryTc = (p: ReturnType<Api["parseCompiled"]>) => p && { header: { d: p.header.d, h: p.header.h, t: p.header.t }, headerEnd: p.headerEnd, callee: p.callee, name: p.name, refs: p.refs, fnEnd: p.fnEnd, comments: p.comments.map((c) => [c.block, c.text, c.start, c.end]) };

// ---- the notebook's variables and the .ojs cells (the standard compiler) ----
const NB = join(ROOT, "../../lopebooks/notebooks/soundscript.html");
function notebook(): { defs: { key: string; definition: string }[]; ojs: Ojs[]; modules: { key: string; src: string }[] } {
  if (!existsSync(NB)) return { defs: [], ojs: [], modules: [] };
  const html = readFileSync(NB, "utf8");
  const ids = blocks(html).filter((b: any) => /^@tomlarkworthy\/soundscript(-[\w-]+)?$/.test(b.id) && b.attrs.includes('data-mime="application/javascript"')).map((b: any) => b.id);
  const defs: { key: string; definition: string }[] = [], ojs: Ojs[] = [], modules: { key: string; src: string }[] = [];
  for (const id of ids) {
    const src = blockContent(html, id)!;
    modules.push({ key: id, src });
    for (const v of mj.moduleJs(src).variables) {
      defs.push({ key: `${id} ${v.name}`, definition: v.definition });
      if (orig.langOf(v.definition) !== "ss") ojs.push({ key: `${id} ${v.name}`, vars: [{ name: v.name, inputs: v.inputs, definition: v.definition }] });
    }
  }
  return { defs, ojs, modules };
}
async function ojsCompiled(): Promise<Ojs[]> {
  if (process.argv.includes("--no-ojs")) return [];
  const { loadOjs } = await import("../../ojs-roundtrip/ojs.ts");
  const log = console.log; console.log = () => {};
  const o = await loadOjs();
  console.log = log;
  const out: Ojs[] = [];
  for (const f of ojsFiles()) for (const [i, cell] of readFileSync(f, "utf8").split(/^\/\/ %%$/m).entries()) {
    let vs: any[];
    try { vs = o.compile(cell.trim()); } catch { continue; }
    out.push({ key: `${f.slice(LITE.length + 1)}#${i}`, vars: vs.map((v) => ({ name: v._name ?? null, inputs: v._inputs ?? [], definition: String(v._definition) })) });
  }
  o.dispose();
  return out;
}

const srcs = sources();
const TIME_ONLY = process.argv.includes("--time-only");
const nb = notebook();
const ojsCells = TIME_ONLY ? [] : [...(await ojsCompiled()), ...nb.ojs];
const t0 = performance.now();
const main = TIME_ONLY ? new Diff() : pass(TOOLCHAIN, srcs, ojsCells, [...nb.defs], nb.modules, true);
// cells that take cells of another language (OUTSIDE), as ojs-roundtrip.test.ts compiles the study: the boundary params
function boundaryPass(T: Api, D: Diff) {
  const study = [...CORPUS, ...EXTRA];
  const ctx = orig.contextFromCheck(checkCells(study.map((c) => c[1]), true, OUTSIDE).result);
  const seen = new Map<string, number>();
  for (const [label, text] of study) {
    const d = orig.declaredName(text);
    const k = d ? (seen.get(d) ?? 0) + 1 : 0;
    if (d) seen.set(d, k);
    const hint = k > 1 ? `${d} (${k})` : null;
    const a = run(() => orig.compileCell(text, true, ctx, hint)), b = run(() => T.compileCell(text, true, ctx, hint));
    D.record("compileCell (boundary)", `study ${label}`, a, b);
    D.record("compileCellText (boundary)", `study ${label}`, run(() => orig.compileCellText(text, true, ctx, hint)), run(() => T.compileCellText(text, true, ctx, hint)));
    if (a.ok) for (const v of JSON.parse(a.v) as orig.Variable[]) {
      D.record("decompileVariable (boundary)", `study ${label} ${v.name}`, run(() => orig.decompileVariable(v.definition)), run(() => T.decompileVariable(v.definition)));
      if (T === TC0) for (const i of ["ss_cross", "ss_viewRef"]) if (v.inputs.includes(i)) shape(`boundary study: input ${i}`);
    }
  }
}
const TC0 = TOOLCHAIN;
if (!TIME_ONLY) boundaryPass(TC0, main);
console.log(`corpus: ${srcs.length} sources, ${ojsCells.length} OJS cells, ${nb.defs.length} notebook definitions, ${nb.modules.length} notebook modules; ${((performance.now() - t0) / 1000).toFixed(1)} s`);
console.log(`all calls: ${line(main.total())}` + " (SAME THROW: both threw the same message)");
console.log(`corpus calls, repro rows left out: ${line(main.total(false))}`);
for (const [fn, t] of [...main.per].sort()) console.log(`  ${fn.padEnd(26)} ${line(t)}`);
for (const [k, xs] of main.shown) { console.log(`--- ${k}`); for (const x of xs) console.log("    " + x); }
console.log("shapes compiled (today's), per context:");
for (const [k, n] of [...shapes].sort()) console.log(`  ${k}: ${n}`);
writeFileSync(join(OUT, "diff.json"), JSON.stringify({ per: Object.fromEntries(main.per), shown: Object.fromEntries(main.shown), shapes: Object.fromEntries(shapes) }, null, 1));

// ---- controls: one cell per tc file replaced (self-contained text: link.ts evaluates a cell's text again) ----
if (process.argv.includes("--controls")) {
  const CONTROLS: [string, string, Record<string, any>][] = [
    ["tc-text", "tcEsc without the escape", { tcEsc: () => (s: string) => s }],
    ["tc-cuts", "tcOptionalCut cuts nothing", { tcOptionalCut: () => () => [] }],
    ["tc-cuts", "tcWholeType: no node is a whole type", { tcWholeType: () => () => false }],
    ["tc-free", "tcNotARef: every identifier is a reference", { tcNotARef: () => () => false }],
    ["tc-build", "tcArgsParts joins arguments with \",\"", { tcArgsParts: (tcArgParts: any, tcT: any) => (info: any, refs: any, IN: any, mod: any) => info.params.flatMap((p: any, i: number) => [...(i > 0 ? [tcT(",")] : []), ...tcArgParts(p, info.name, refs, IN, mod)]) }],
    ["tc-ctx", "tcAcceptedOf accepts every cell", { tcAcceptedOf: () => (r: any) => new Set(r.cells.map((c: any) => c.name)) }],
    ["tc-decomp", "tcOutside reads no runtime cell", { tcOutside: () => () => ({ ss: false, refs: [] }) }],
    ["tc-modjs", "tcOwnThis finds no this", { tcOwnThis: () => () => null }],
    ["tc-build", "tcArgParts: a boundary param crosses as a plain input", { tcArgParts: (tcCaps: any, tcIn: any, tcT: any, tcR: any) => (p: any, cell: any, refs: any, IN: any) => [tcR(p.refTyped ? `viewof ${p.name}` : tcCaps.includes(p.name) ? tcIn(IN, p.name) : p.name)] }],
  ];
  for (const [file, what, over] of CONTROLS) {
    const D = pass(api(linkTc(over)), srcs, ojsCells, [...nb.defs], nb.modules, false);
    boundaryPass(api(linkTc(over)), D);
    const fns = [...D.per].filter(([, t]) => t.DIFFERENT > 0).map(([f, t]) => `${f} ${t.DIFFERENT}`);
    console.log(`control ${file} (${what}): ${line(D.total(false))} (repro rows left out); differs in ${fns.join(", ") || "nothing"}`);
  }
}

// ---- timing: µs per cell compiled with its check's context, today's against the port (crossed and plain shell) ----
if (ROUNDS > 0) {
  const sh = (c: string) => Bun.spawnSync(["sh", "-c", c]).stdout.toString().trim();
  const work: [string, boolean, orig.Context][] = [];
  for (const s of srcs) {
    const r = checked(s);
    if (!r) continue;
    let texts: string[];
    try { texts = orig.splitCells(s.cells, s.tsx); } catch { continue; }
    const c = orig.contextFromCheck(r);
    for (const t of texts) if (run(() => orig.compileCell(t, s.tsx, c)).ok) work.push([t, s.tsx, c]);
  }
  const arms: [string, (t: string, tsx: boolean, c: orig.Context) => unknown][] = [["today", orig.compileCell], ["port", api(linkTc()).compileCell], ["port, shell not crossed", api(linkTc({}, true)).compileCell]];
  const defsAll = work.flatMap(([t, tsx, c]) => orig.compileCell(t, tsx, c).map((v) => v.definition));
  for (let round = 0; round < ROUNDS; round++) {
    const ctx = `${sh("pmset -g batt | head -1")} | ${sh("uptime | sed 's/.*load averages*: //'")}`;
    const row: string[] = [];
    for (const [name, f] of arms) {
      const t = performance.now();
      for (const [x, tsx, c] of work) f(x, tsx, c);
      row.push(`${name} ${(((performance.now() - t) * 1000) / work.length).toFixed(1)}`);
    }
    // decompile: texts no earlier call has seen (a trailing space per round), so neither side's memo is warm
    const P = api(linkTc());
    const fresh = defsAll.map((d) => d + " ".repeat(round + 1));
    let t = performance.now();
    for (const d of fresh) orig.decompileVariable(d);
    const today = ((performance.now() - t) * 1000) / defsAll.length;
    t = performance.now();
    for (const d of fresh) P.decompileVariable(d);
    const port = ((performance.now() - t) * 1000) / defsAll.length;
    console.log(`round ${round + 1}: µs per cell compiled (${work.length} cells): ${row.join(", ")}; µs per decompileVariable (${defsAll.length}, cold memo): today ${today.toFixed(1)}, port ${port.toFixed(1)} | ${ctx}`);
  }
}
process.exit(0);
