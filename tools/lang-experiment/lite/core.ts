// The lite checker without file access. checkSources runs mdCheckSources, the SoundScript cells of lite/infer (module
// shape, syntax bans, injection, the per-cell type check, the ownership rules, the captures and the value rules), on a
// registry made from the registry cells (lite/infer/rg-*.ss.ts, infer/rg-registry.ts), which read the same typed tree the check reads,
// so a module is parsed once. Each cell ends ok, rejected, unsupported (a construct lite does not model) or blocked (a
// dependency has no usable type).
// The glue left in TypeScript: the registry (infer/rg-registry.ts) as the record each cell's check is handed; which load
// or cell each report goes to; a form the registry cells do not read (a gap) as a rejection; and the result as
// LiteResult.
import { cloneProblemWith, type Ty } from "./types.ts";
import { CAPABILITIES, ALLOWED_GLOBALS, PRELUDE_FNS } from "./intrinsics.ts";
import { parseTree } from "./acorn/index.ts";
import {
  mdCheckSources, rgFreshCtl, rgConvert, rgExpand, rgIfaceRec, rgSig, rgLiteral, rgQuietGo, rgSub, rgFresh, rgPeekOpen, rgPeekClose, rgLoad, rgTake,
  rgIsTypedArray, rgOriginOf, rgHasTypeQuery, rgBuiltin, rgGlobals, rgRestOf, rgForeignValues, rgSkip, rgPeekType, rgMayHide,
} from "./infer-ss.ts";
import type { CellInfo } from "./facts.ts";
import type { Shape } from "./boundary.ts";
import type { Ast, AstNode, Parse } from "./acorn/acorn-types.ss.ts";
import type { IxReg, IxRegCore, IxDiag, IxProbe, IxProbeAsk } from "./infer/ix-types.ss.ts";
import type { MdReg, MdResult, MdReport, MdCompiled, MdForeign, MdSources } from "./infer/md-types.ss.ts";
import type { RgCtx, RgReport, RgOrigin } from "./infer/rg-types.ss.ts";
import { rgRegistryOf, declTreesOf, type RgCells, type RgRegistry } from "./infer/rg-registry.ts";

export type LiteError = { rule: string; line: number; msg: string };
export type LiteCell = {
  name: string; status: "ok" | "rejected" | "unsupported" | "blocked"; line: number;
  errors: LiteError[]; unsupported: LiteError[]; blockedBy: string[]; value?: string;
};
// facts: per cell, what the compiler needs (facts.ts), from this check's parse. probe: what opts.probe asked for, with
// the registry its types belong to. Neither is enumerable, so a result prints and compares as before.
export type LiteResult = {
  port: string; file: string; ok: boolean; module: LiteError[]; cells: LiteCell[]; ms: number;
  readonly facts?: ReadonlyMap<string, CellInfo>; readonly probe?: { found: IxProbe | null; reg: RgRegistry };
};

// outside: the module's cells in other languages (Observable JavaScript, raw), by name; view when the
// module also has `viewof <name>` (an Observable JavaScript view, or a SoundScript state cell imported with its
// viewof). A SoundScript cell takes one through an annotated parameter (boundary.ts).
export type Outside = { name: string; view?: boolean };
export type Sources = { cells: string; tsx?: boolean; foreign?: string | null; shell?: string | null; name?: string; outside?: readonly Outside[] | null };
// per parameter that names an outside cell: its value's shape, and whether it is taken as State (its viewof)
export type Boundary = { shape: Shape; ref: boolean };
// strictIndex: an index read may be undefined. onCell: called once per cell checked. probe: completion's question, a
// name whose first read (or, member, whose first read as a member) records what complete.ts offers there
export type CheckOpts = { strictIndex?: boolean; onCell?: () => void; probe?: IxProbeAsk | null };
type Entry = (R: MdReg, S: MdSources) => MdResult;
// gap: what the md cells met that they do not implement; rgGap: the first form the registry cells do not read
export type CheckRun = { result: LiteResult; gap: string | null; rgGap: string | null; spans: { at: number; ch: string[]; chUnsup: string[] }[] };

// the registry cells and the parser of declaration texts, as one record (lite/infer/rg-diff.ts hands a copy with one
// cell replaced, rg.test.ts one whose parser holds an Other node)
export const RG = {
  parseTree, rgFreshCtl, rgConvert, rgExpand, rgIfaceRec, rgSig, rgLiteral, rgQuietGo, rgSub, rgFresh, rgPeekOpen, rgPeekClose, rgLoad, rgTake,
  rgIsTypedArray, rgOriginOf, rgHasTypeQuery, rgBuiltin, rgGlobals, rgRestOf, rgForeignValues, rgSkip, rgPeekType, rgMayHide,
};
export type { RgCells, RgRegistry };

// Browser-safe: no file system. check.ts checkPort reads a port directory and calls this.
export function checkSources(src: Sources, opts: CheckOpts = {}): LiteResult {
  return runCheck(mdCheckSources, src, opts).result;
}

const mustParse = (p: Parse): Ast => { if (!p.ok) throw new Error(p.message); return p.ast; };
// the declaration texts are constants, so they are parsed once
let DECL_TREES: [Ast, RgOrigin][] | null = null;
const declTrees = (): [Ast, RgOrigin][] => (DECL_TREES ??= declTreesOf(parseTree));
// a registry over the cells L (the shipped ones by default), the three declaration texts loaded
export const rgRegistry = (L: RgCells = RG, strictIndex = true): RgRegistry => rgRegistryOf(L, strictIndex, declTrees());
// the type names the registry knows before a module's own declarations, sorted (registry.ts's until 2026-11-22)
export const builtinTypeNames = (): string[] => [...RG.rgBuiltin(rgRegistry().types)].sort();

// core with each method run inside around
function regAround(core: IxRegCore, around: <X>(f: () => X) => X): IxRegCore {
  return {
    isAlias: (n) => around(() => core.isAlias(n)), expand: (t) => around(() => core.expand(t)), member: (t, k) => around(() => core.member(t, k)),
    sub: (a, b) => around(() => core.sub(a, b)), callSigs: (t) => around(() => core.callSigs(t)), iterElem: (t) => around(() => core.iterElem(t)),
    unify: (p, a, m, tvs) => around(() => core.unify(p, a, m, tvs)), isTypedArray: (t) => around(() => core.isTypedArray(t)), mayHide: core.mayHide,
  };
}
const toDiag = (r: RgReport): IxDiag => ({ start: r.start, end: r.end, rule: r.rule, msg: r.msg });
const toReport = (r: RgReport): MdReport => ({ rule: r.rule, line: r.line, msg: r.msg });

// a sink for reports: a load's list (with lines) or a cell view's buffer
type Sink = { load: RgReport[] } | { diag: IxDiag[] } | null;
// a gap the registry met, and the cell whose view was current (its function's start), null while loading
export type RgGapAt = { at: number | null; what: string };
// The Registry as the record mdCheckSources is handed. foreign.d.ts's reports and the user declarations' are kept with
// their lines; each cell gets its own view. onCell: called for each cell's view. gaps: every gap, where it was met.
export type MdRegGlue = MdReg & { finish: () => void; R: RgRegistry; gaps: RgGapAt[]; order: number[] };
export function mdRegistry(strictIndex = true, onCell: (() => void) | null = null, L: RgCells = RG): MdRegGlue {
  const R = rgRegistry(L, strictIndex);
  const gaps: RgGapAt[] = [], order: number[] = [];
  let user: Ast | null = null, sink: Sink = null, cur: number | null = null;
  // the registry keeps its first gap only; each is taken here, so the next one is seen too
  const noteGap = () => { const g = R.Q.gap; if (g !== null) { gaps.push({ at: cur, what: g }); R.Q.gap = null; } };
  const flush = () => { noteGap(); const rs = R.take(); if (sink !== null) { if ("load" in sink) sink.load.push(...rs); else sink.diag.push(...rs.map(toDiag)); } };
  const swap = (s: Sink) => { flush(); sink = s; };
  const userAst = (): Ast => user ?? missingUser();
  const ctx = (tps: string[], look: Map<string, Ty> | null): RgCtx => ({ tps: new Set(tps), look, ast: userAst(), origin: "user" });
  const view = (): IxReg & { requeue: (ds: IxDiag[]) => void } => {
    const buf: IxDiag[] = [];
    swap({ diag: buf });
    const core = R.core();
    const cloneProblem = cloneProblemWith(R.ops);
    return {
      ...core, quiet: regAround(core, R.peek), lax: regAround(core, R.lax), strictIndex: R.Q.strict, same: (a, b) => a === b,
      origin: (n) => L.rgOriginOf(R.types, n),
      convert: (n, tps, look) => R.convert(n, ctx(tps, look)),
      sig: (params, ret, tps, look) => L.rgSig(R.G, R.types, R.expandMemo, R.ifaceMemo, R.Q, params, ret, null, ctx(tps, look), null),
      hasTypeQuery: (n) => L.rgHasTypeQuery(n), cloneProblem: (t) => cloneProblem(t, 0),
      drain: () => { flush(); return buf.splice(0); }, compile: null,
      requeue: (ds) => { flush(); buf.push(...ds); },
    };
  };
  const loadInto = (f: () => void): RgReport[] => { swap(null); cur = null; const got: RgReport[] = []; sink = { load: got }; f(); flush(); sink = { load: [] }; return got; };
  return {
    R, gaps, order, builtin: L.rgBuiltin(R.types), ops: R.ops, globals: L.rgGlobals(R.values, PRELUDE_FNS, ALLOWED_GLOBALS), allowed: ALLOWED_GLOBALS, capabilities: new Map(Object.entries(CAPABILITIES)),
    loadForeign: (text): MdForeign => {
      const ast = mustParse(L.parseTree(text, false));
      let rest: AstNode[] = [];
      const reports = loadInto(() => { rest = R.load(ast, "foreign"); });
      return { reports: reports.map(toReport), rest: L.rgRestOf(rest), values: L.rgForeignValues(R.values) };
    },
    loadUser: (ast, _jsx, clash) => {
      user = ast;
      return loadInto(() => { R.load(ast, "user", true, L.rgSkip(ast, clash)); }).map(toReport);
    },
    cell: (at) => {
      onCell?.();
      flush();
      cur = at;
      order.push(at);
      const ix = view();
      return { ix, withHook: (hook: (e: AstNode, options: Ty | null) => MdCompiled) => ({ ...ix, compile: (e: AstNode, options: Ty | null) => { const r = hook(e, options); ix.requeue(r.out); return r.res; } }) };
    },
    peekType: (n) => R.peek(() => L.rgPeekType(R.G, R.types, R.expandMemo, R.ifaceMemo, R.Q, n, userAst())),
    finish: () => swap(null),
  };
}
const missingUser = (): never => { throw new Error("the user's declarations are not loaded"); };

export const GAP_RULE = "registry-gap";
// A gap is a form the registry cells do not read; its type is the error type, which hides later reports, and a memo
// keeps it for the cells after. So the cell it was met in and every cell checked after it is rejected, and a gap met
// while loading declarations is a module error with every cell rejected.
function rejectAfterGaps(cells: LiteCell[], ats: number[], order: number[], gaps: RgGapAt[], module: LiteError[]): void {
  const first = gaps[0];
  if (first === undefined) return;
  const atLoad = gaps.find((g) => g.at === null);
  if (atLoad !== undefined) module.push({ rule: GAP_RULE, line: 0, msg: `the checker cannot read a declaration (${atLoad.what}), so no cell of this module is checked` });
  const from = atLoad !== undefined ? 0 : Math.max(0, order.indexOf(first.at ?? -1));
  const after = new Set(atLoad !== undefined ? ats : order.slice(from));
  const where = cells[ats.indexOf(first.at ?? -1)]?.name ?? null;
  cells.forEach((c, i) => {
    const at = ats[i];
    if (at === undefined || !after.has(at)) return;
    const own = gaps.find((g) => g.at === at);
    const msg = own !== undefined ? `the checker cannot read a type here (${own.what}), so this cell is not checked`
      : atLoad !== undefined ? `not checked: the checker cannot read a declaration of this module (${atLoad.what})`
      : `not checked: it is checked after ${where ?? "a cell"}, where the checker could not read a type (${first.what})`;
    c.status = "rejected";
    c.errors.push({ rule: GAP_RULE, line: c.line, msg });
  });
}

// checkSources by entry (mdCheckSources, or a copy with cells replaced: lite/infer/diff.ts's controls) and the registry
// cells L. spans: each cell's Checker lists with positions, for the differential
export function runCheck(entry: Entry, src: Sources, opts: CheckOpts = {}, L: RgCells = RG): CheckRun {
  const t0 = performance.now();
  const R = mdRegistry(opts.strictIndex ?? true, opts.onCell ?? null, L);
  let r: MdResult;
  const S: MdSources = { cells: src.cells, tsx: !!src.tsx, foreign: src.foreign ?? null, shell: src.shell ?? null, name: src.name ?? null, outside: (src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })), probe: opts.probe ?? null };
  try { r = entry(R, S); } finally { R.finish(); }
  const cells: LiteCell[] = r.cells.map((c) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors.map((e) => ({ ...e })), unsupported: c.unsupported.map((e) => ({ ...e })), blockedBy: [...c.blockedBy], ...(c.value === null ? {} : { value: c.value }) }));
  const module = r.module.map((e) => ({ ...e }));
  rejectAfterGaps(cells, r.cells.map((c) => c.at), R.order, R.gaps, module);
  const result: LiteResult = { port: r.port, file: r.file, ok: module.length === 0 && cells.every((c) => c.status === "ok"), module, cells, ms: performance.now() - t0 };
  const facts = new Map<string, CellInfo>(r.facts.map((f) => [f.name, {
    name: f.name, span: [f.span[0] ?? 0, f.span[1] ?? 0], returnsRef: f.returnsRef, generator: f.generator, compiles: f.compiles.map((c) => ({ ...c })),
    params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, ...(p.boundary ? { boundary: p.boundary } : {}) })),
  }]));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  if (opts.probe) Object.defineProperty(result, "probe", { value: { found: r.probe, reg: R.R }, enumerable: false });
  const fmt = (d: IxDiag) => `${d.rule} @${d.start}-${d.end} ${d.msg}`;
  return { result, gap: r.gap, rgGap: R.gaps[0]?.what ?? null, spans: r.cells.map((c) => ({ at: c.at, ch: c.ch.map(fmt), chUnsup: c.chUnsup.map(fmt) })) };
}
