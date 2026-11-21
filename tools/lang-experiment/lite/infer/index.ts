// The ix cells (the port of lite/infer.ts Checker) linked for bun, and the registry view they are handed: the
// Registry stays TypeScript, so its methods come in as a record of functions over the typed tree's nodes, each
// mapped to the parse.ts node of the same span and type. Nothing here is used by the shipped checker.
import "./ix-types.ss.ts";
import * as core from "./ix-core.ss.ts";
import * as hides from "./ix-hides.ss.ts";
import * as expr from "./ix-expr.ss.ts";
import * as ops from "./ix-ops.ss.ts";
import * as cond from "./ix-cond.ss.ts";
import * as fn from "./ix-fn.ss.ts";
import * as stmt from "./ix-stmt.ss.ts";
import * as flow from "./ix-flow.ss.ts";
import * as lit from "./ix-lit.ss.ts";
import * as call from "./ix-call.ss.ts";
import * as apply from "./ix-apply.ss.ts";
import * as prelude from "./ix-prelude.ss.ts";
import * as jsx from "./ix-jsx.ss.ts";
import * as entry from "./ix-entry.ss.ts";
import * as facts from "./ix-facts.ss.ts";
import "./ow-types.ss.ts";
import * as owTree from "./ow-tree.ss.ts";
import * as owCapture from "./ow-capture.ss.ts";
import * as owPos from "./ow-pos.ss.ts";
import * as owPlace from "./ow-place.ss.ts";
import * as owFlow from "./ow-flow.ss.ts";
import * as owStmt from "./ow-stmt.ss.ts";
import * as owLoop from "./ow-loop.ss.ts";
import * as owAction from "./ow-action.ss.ts";
import * as owTaint from "./ow-taint.ss.ts";
import * as owOpaque from "./ow-opaque.ss.ts";
import * as owEntry from "./ow-entry.ss.ts";
import "./md-types.ss.ts";
import * as mdShape from "./md-shape.ss.ts";
import * as mdGraph from "./md-graph.ss.ts";
import * as mdInject from "./md-inject.ss.ts";
import * as mdTaint from "./md-taint.ss.ts";
import * as mdCompile from "./md-compile.ss.ts";
import * as mdValue from "./md-value.ss.ts";
import * as mdRun from "./md-run.ss.ts";
import * as mdCell from "./md-cell.ss.ts";
import * as mdFacts from "./md-facts.ss.ts";
import * as mdEntry from "./md-entry.ss.ts";
import { linkShape } from "../shape-ss.ts";
import { Registry as RegistryClass } from "../registry.ts";
import { parse } from "../parse.ts";
import { CAPABILITIES } from "../intrinsics.ts";
import type { Sources, LiteResult, LiteCell } from "../core.ts";
import type { CellInfo } from "../facts.ts";
import type { MdReg, MdResult, MdReport, MdCompiled } from "./md-types.ss.ts";
import * as runtimePrelude from "../../prelude.runtime.ts";
import { link } from "../link.ts";
import * as T from "../types.ts";
import { linkAcorn } from "../acorn/index.ts";
import { ALLOWED_GLOBALS, PRELUDE_FNS } from "../intrinsics.ts";
import { kids, type Node, type Parsed } from "../parse.ts";
import type { Registry } from "../registry.ts";
import type { AstNode } from "../acorn/acorn-types.ss.ts";
import type { IxReg, IxRegCore, IxDiag, IxInput, IxOutput, IxKind } from "./ix-types.ss.ts";
import type { Ty } from "../types.ss.ts";

export const IX_FILES = ["types", "core", "hides", "expr", "ops", "cond", "fn", "stmt", "flow", "lit", "call", "apply", "prelude", "jsx", "entry", "facts"].map((x) => `ix-${x}.ss.ts`);
// the ownership port (lite/own.ts), linked with the ix cells it reads
export const OW_FILES = ["types", "tree", "capture", "pos", "place", "flow", "stmt", "loop", "action", "taint", "opaque", "entry"].map((x) => `ow-${x}.ss.ts`);
export const OW_CELLS = { ...owTree, ...owCapture, ...owPos, ...owPlace, ...owFlow, ...owStmt, ...owLoop, ...owAction, ...owTaint, ...owOpaque, ...owEntry };
// the module check port (lite/core.ts checkSources)
export const MD_FILES = ["types", "shape", "graph", "inject", "taint", "compile", "value", "run", "cell", "facts", "entry"].map((x) => `md-${x}.ss.ts`);
export const MD_CELLS = { ...mdShape, ...mdGraph, ...mdInject, ...mdTaint, ...mdCompile, ...mdValue, ...mdRun, ...mdCell, ...mdFacts, ...mdEntry };
export const IX_CELLS = { ...core, ...hides, ...expr, ...ops, ...cond, ...fn, ...stmt, ...flow, ...lit, ...call, ...apply, ...prelude, ...jsx, ...entry, ...facts, ...OW_CELLS };
const A = linkAcorn();
const GIVEN = {
  NUM: T.NUM, STR: T.STR, BIGINT: T.BIGINT, NULL: T.NULL, UNDEF: T.UNDEF, VOID: T.VOID, NEVER: T.NEVER, UNKNOWN: T.UNKNOWN,
  OBJECT: T.OBJECT, ERR: T.ERR, SYMBOL: T.SYMBOL, BOOL: T.BOOL, lit: T.lit, arr: T.arr, named: T.named, unwrap: T.unwrap,
  propT: T.propT, union: T.union, members: T.members, show: T.show, subst: T.subst, hasTv: T.hasTv, instantiate: T.instantiate,
  widen: T.widen, isPrimitive: T.isPrimitive, isNamed: T.isNamed, kidsOf: A.kidsOf, nodeKind: A.nodeKind, isFnNode: A.isFnNode, childrenOf: A.childrenOf, TYPE_FIELDS: A.TYPE_FIELDS,
};
// over: cells to put in place of the port's (diff.ts's control)
export const linkIx = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...IX_CELLS, ...over } as typeof IX_CELLS, runtimePrelude, GIVEN);
const SHAPE = linkShape();
// the cells of other sections the md cells take
const MD_GIVEN = {
  ...GIVEN, parseTree: A.parseTree, nameAt: A.nameAt, standIn: A.standIn, moduleShape: A.moduleShape, syntaxBans: A.syntaxBans, lineAt: A.lineAt,
  hasErrWith: T.hasErrWith, uncloneableWith: T.uncloneableWith, admitsUndefinedWith: T.admitsUndefinedWith, holdsWith: T.holdsWith, islandWith: T.islandWith,
  reservedName: T.reservedName, RESERVED_MSG: T.RESERVED_MSG, captureMessage: T.captureMessage, boundaryShapeAt: SHAPE.boundaryShapeAt,
};
// over: cells in place of the port's; given: values in place of other sections' cells (the timing's wrappers)
export const linkMd = (over: Record<string, (...inputs: never[]) => unknown> = {}, given: Record<string, unknown> = {}) =>
  link({ ...IX_CELLS, ...MD_CELLS, ...over } as typeof IX_CELLS & typeof MD_CELLS, runtimePrelude, { ...MD_GIVEN, ...given });
export { MD_GIVEN };

const keyOf = (n: { start: number; end: number; type: string }) => `${n.start}:${n.end}:${n.type}`;
// every parse.ts node of P, by span and type (type positions included)
function nodeIndex(P: Parsed): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (n: Node) => {
    if (!out.has(keyOf(n))) out.set(keyOf(n), n);
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
const pIndex = new WeakMap<Parsed, Map<string, Node>>();

// the registry as the port sees it; drain gives what onErr and onUnsup received since the last drain
// core.ts's compile hook, called with the checker methods it uses (diff.ts lends it the real checker's)
export type CompileCh = { infer: (n: Node) => Ty; err: (n: Node, rule: string, msg: string) => void; unsupported: (n: Node, what: string) => void };
export type CompileHook = (e: Node, ch: CompileCh) => Ty;
const STOP = new Error("ix: the compile hook asked for a type");
function findIn(n: AstNode, key: string): AstNode | null {
  if (keyOf(n) === key) return n;
  for (const k of A.childrenOf(n)) { const x = findIn(k.node, key); if (x) return x; }
  return null;
}
export function makeReg(reg: Registry, P: Parsed, hook: CompileHook | null = null): IxReg & { restore: () => void; requeue: (ds: IxDiag[]) => void } {
  let idx = pIndex.get(P);
  if (!idx) pIndex.set(P, (idx = nodeIndex(P)));
  const index = idx;
  const toP = (n: AstNode): Node => {
    const x = index.get(keyOf(n));
    if (!x) throw new Error(`ix: no parse.ts node at ${keyOf(n)}`);
    return x;
  };
  const buf: IxDiag[] = [];
  const requeue = (ds: IxDiag[]) => void buf.push(...ds);
  const was = [reg.onErr, reg.onUnsup] as const;
  reg.onErr = (n, rule, msg) => void buf.push({ start: n.start, end: n.end, rule, msg });
  reg.onUnsup = (n, what) => void buf.push({ start: n.start, end: n.end, rule: "unsupported", msg: what });
  const core: IxRegCore = {
    isAlias: (n) => reg.isAlias(n), expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), sub: (a, b) => reg.sub(a, b),
    callSigs: (t) => reg.callSigs(t), iterElem: (t) => reg.iterElem(t), unify: (p, a, m, tvs) => reg.unify(p, a, m, tvs), isTypedArray: (t) => reg.isTypedArray(t),
    mayHideMemo: new Map(),
  };
  const wrap = (around: <X>(f: () => X) => X): IxRegCore => ({
    ...(Object.fromEntries(Object.entries(core).flatMap(([k, f]) => typeof f === "function" ? [[k, (...a: unknown[]) => around(() => (f as (...a: unknown[]) => unknown)(...a))]] : [])) as IxRegCore),
    mayHideMemo: core.mayHideMemo,
  });
  const lax = <X>(f: () => X): X => { const s = reg.strictIndex; reg.strictIndex = false; try { return f(); } finally { reg.strictIndex = s; } };
  const ctx = (tps: string[], look: Map<string, Ty> | null) => ({ tps: new Set(tps), typeofLookup: (name: string) => look?.get(name) });
  const tq = new Map<number, boolean>();
  const hasTypeQuery = (n: AstNode): boolean => {
    const hit = tq.get(n.nid);
    if (hit !== undefined) return hit;
    const r = n.type === "TSTypeQuery" || A.childrenOf(n).some((k: { node: AstNode }) => hasTypeQuery(k.node));
    tq.set(n.nid, r);
    return r;
  };
  return {
    ...core,
    quiet: wrap((f) => reg.peek(f)), lax: wrap(lax), strictIndex: reg.strictIndex, same: (a, b) => a === b,
    origin: (n) => reg.types.get(n)?.origin ?? null,
    convert: (n, tps, look) => reg.convert(toP(n), ctx(tps, look), P),
    sig: (params, ret, tps, look) => reg.sig(params.map(toP), toP(ret), undefined, ctx(tps, look), P, "user"),
    hasTypeQuery, cloneProblem: (t) => T.cloneProblemWith(reg.ops)(t, 0),
    drain: () => buf.splice(0),
    compile: hook && ((e, options) => {
      const asked: { n: Node | null } = { n: null }, mark = buf.length;
      const ch: CompileCh = {
        infer: (n) => { if (options === null) { asked.n = n; throw STOP; } return options; },
        err: (n, rule, msg) => void buf.push({ start: n.start, end: n.end, rule, msg }),
        unsupported: (n, what) => void buf.push({ start: n.start, end: n.end, rule: "unsupported", msg: what }),
      };
      try { return { k: "done" as const, t: hook(toP(e), ch) }; } catch (x) { if (x !== STOP) throw x; }
      buf.length = mark;
      const at = asked.n && findIn(e, keyOf(asked.n));
      if (!at) throw new Error("ix: the compile hook asked for a node outside the call");
      return { k: "options" as const, at };
    }),
    restore: () => { [reg.onErr, reg.onUnsup] = was; },
    requeue,
  };
}
// the globals the Checker constructor binds
export function globalsOf(reg: Registry): IxInput["globals"] {
  const out = new Map<string, { name: string; t: Ty; kind: IxKind }>();
  for (const name of PRELUDE_FNS) out.set(name, { name, t: T.ERR, kind: "prelude" });
  for (const name of ALLOWED_GLOBALS) {
    const v = reg.values.get(name);
    if (name === "undefined") out.set(name, { name, t: T.UNDEF, kind: "global" });
    else if (v && v.origin === "intrinsic") out.set(name, { name, t: v.t, kind: "global" });
  }
  const eq = reg.values.get("equals"), b = out.get("equals");
  if (eq && b) b.t = eq.t;
  return [...out.values()];
}
export type IxLinked = ReturnType<typeof linkIx>;
export function runIx(L: IxLinked, reg: Registry, P: Parsed, input: Omit<IxInput, "globals">, hook: CompileHook | null = null): IxOutput {
  const R = makeReg(reg, P, hook);
  try { return L.ixCheckFn(R, { ...input, globals: globalsOf(reg) }); } finally { R.restore(); }
}
// the registry's methods as the ownership port calls them, outside any check (own.ts runs after fnExpr)
export function regCore(reg: Registry): IxRegCore {
  return { isAlias: (n) => reg.isAlias(n), expand: (t) => reg.expand(t), member: (t, k) => reg.member(t, k), sub: (a, b) => reg.sub(a, b),
    callSigs: (t) => reg.callSigs(t), iterElem: (t) => reg.iterElem(t), unify: (p, a, m, tvs) => reg.unify(p, a, m, tvs), isTypedArray: (t) => reg.isTypedArray(t), mayHideMemo: new Map() };
}
export { kids };

// ---- the module check (md cells): the Registry as the record they are handed, and checkSources's result made of theirs ----
// Glue: the Registry and its parse.ts parse (convert, sig and load take parse.ts nodes), the loads' reports with their
// lines, one IxReg per cell, the compile hook's reports put back in that IxReg's buffer, `in` on CAPABILITIES.
export type MdRegGlue = MdReg & { finish: () => void; reg: Registry };
export function mdRegistry(strictIndex = true): MdRegGlue {
  const reg = new RegistryClass();
  reg.strictIndex = strictIndex;
  let P: Parsed | null = null, cur: ReturnType<typeof makeReg> | null = null;
  const got: MdReport[] = [];
  reg.onUnsup = (n, what) => void got.push({ rule: "unsupported", line: n.loc?.start.line ?? 0, msg: what });
  reg.onErr = (n, rule, msg) => void got.push({ rule, line: n.loc?.start.line ?? 0, msg });
  const parsed = (): Parsed => { if (!P) throw new Error("md: the user's declarations are not loaded"); return P; };
  const toP = (n: AstNode): Node => {
    const p = parsed();
    let idx = pIndex.get(p);
    if (!idx) pIndex.set(p, (idx = nodeIndex(p)));
    const x = idx.get(keyOf(n));
    if (!x) throw new Error(`md: no parse.ts node at ${keyOf(n)}`);
    return x;
  };
  return {
    reg, builtin: reg.builtinTypeNames(), ops: reg.ops, globals: globalsOf(reg), allowed: ALLOWED_GLOBALS,
    capabilities: new Map(Object.entries(CAPABILITIES)),
    inherited: new Set(Object.getOwnPropertyNames(Object.prototype).filter((n) => !Object.hasOwn(CAPABILITIES, n))),
    thrown: (e) => String((e as Error).message),
    loadForeign: (text) => {
      const FP = parse(text);
      got.length = 0;
      const rest = reg.load(FP, "foreign");
      const values = [...reg.values].filter(([, v]) => v.origin === "foreign").map(([name, v]) => ({ name, marker: v.marker || null, line: FP.line(v.node.start), t: v.t }));
      return { reports: got.splice(0), rest: rest.map((st) => ({ kind: st.type as string, line: FP.line(st.start) })), values };
    },
    loadUser: (text, jsx, clash) => {
      P = parse(text, { jsx });
      const at = new Set(clash), skip = new Set<Node>();
      for (const st of P.program.body as Node[]) { const d = st.type === "ExportNamedDeclaration" && st.declaration ? st.declaration : st; if (at.has(d.start)) skip.add(d); }
      got.length = 0;
      reg.load(P, "user", true, skip);
      return got.splice(0);
    },
    cell: () => {
      cur?.restore();
      const ix = (cur = makeReg(reg, parsed(), null));
      return { ix, withHook: (hook: (e: AstNode, options: Ty | null) => MdCompiled) => ({ ...ix, compile: (e: AstNode, options: Ty | null) => { const r = hook(e, options); ix.requeue(r.out); return r.res; } }) };
    },
    peekType: (n) => reg.peek(() => { const t = reg.convert(toP(n), { tps: new Set() }, parsed()); return t.k === "named" && reg.isAlias(t.n) ? reg.expand(t) : t; }),
    finish: () => { cur?.restore(); cur = null; },
  };
}
export type MdLinked = ReturnType<typeof linkMd>;
export type MdRun = { result: LiteResult; gap: string | null; spans: { at: number; ch: string[]; chUnsup: string[] }[] };
// checkSources by the md cells; onCell (completion's hook on each Checker) has no port
export function runMd(L: MdLinked, src: Sources, opts: { strictIndex?: boolean; onCell?: unknown } = {}): MdRun {
  if (opts.onCell) throw new Error("md: onCell is not ported");
  const t0 = performance.now();
  const R = mdRegistry(opts.strictIndex ?? true);
  let r: MdResult;
  try {
    r = L.mdCheckSources(R, { cells: src.cells, tsx: !!src.tsx, foreign: src.foreign ?? null, shell: src.shell ?? null, name: src.name ?? null, outside: (src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })) });
  } finally { R.finish(); }
  const cells: LiteCell[] = r.cells.map((c) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors.map((e) => ({ ...e })), unsupported: c.unsupported.map((e) => ({ ...e })), blockedBy: [...c.blockedBy], ...(c.value === null ? {} : { value: c.value }) }));
  const result: LiteResult = { port: r.port, file: r.file, ok: r.ok, module: r.module.map((e) => ({ ...e })), cells, ms: performance.now() - t0 };
  const facts = new Map<string, CellInfo>(r.facts.map((f) => [f.name, {
    name: f.name, span: [f.span[0] ?? 0, f.span[1] ?? 0], returnsRef: f.returnsRef, generator: f.generator, compiles: f.compiles.map((c) => ({ ...c })),
    params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, ...(p.boundary ? { boundary: p.boundary } : {}) })),
  }]));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  const fmt = (d: IxDiag) => `${d.rule} @${d.start}-${d.end} ${d.msg}`;
  return { result, gap: r.gap, spans: r.cells.map((c) => ({ at: c.at, ch: c.ch.map(fmt), chUnsup: c.chUnsup.map(fmt) })) };
}
