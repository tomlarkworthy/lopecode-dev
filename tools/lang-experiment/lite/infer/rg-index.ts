// The registry cells (rg-*.ss.ts) linked for bun, and the glue that makes them the records the other cells take:
// RegOps/DeclOps for the subtype cells, IxReg for one cell's check, MdReg for the module check. The glue holds the
// tables (Maps under bun), binds the subtype cells to them, brackets peek and lax with try/finally, and routes the
// report log to the load or cell that was current when each report was made. Not switched on: core.ts still uses
// registry.ts. rgCheckSources is checkSources with this registry and one parse of the module text.
import * as ctlCells from "./rg-ctl.ss.ts";
import * as convertCells from "./rg-convert.ss.ts";
import * as sigCells from "./rg-sig.ss.ts";
import * as expandCells from "./rg-expand.ss.ts";
import * as loadCells from "./rg-load.ss.ts";
import * as viewCells from "./rg-view.ss.ts";
import "./rg-types.ss.ts";
import { link } from "../link.ts";
import * as T from "../types.ts";
import { linkAcorn } from "../acorn/index.ts";
import { INTRINSIC_DECLS, PRELUDE_DECLS, JSX_DECLS, TYPED_ARRAYS, PRELUDE_FNS, ALLOWED_GLOBALS, CAPABILITIES } from "../intrinsics.ts";
import { linkMd } from "../infer-ss.ts";
import * as prelude from "../../prelude.runtime.ts";
import type { Ty, Rec, RegOps, DeclOps, Fn, Prop } from "../types.ts";
import type { Ast, AstNode, Parse } from "../acorn/acorn-types.ss.ts";
import type { IxReg, IxRegCore, IxDiag, IxInput } from "./ix-types.ss.ts";
import type { MdReg, MdReport, MdForeign, MdCompiled, MdResult, MdSources } from "./md-types.ss.ts";
import type { RgK, RgDecl, RgValue, RgCtl, RgCtx, RgReport, RgOrigin, RgPeek } from "./rg-types.ss.ts";
import type { LiteResult, LiteCell, CheckOpts, CheckRun, Sources } from "../core.ts";
import type { CellInfo } from "../facts.ts";

export const RG_FILES = ["types", "ctl", "convert", "sig", "expand", "load", "view"].map((x) => `rg-${x}.ss.ts`);
export const RG_CELLS = { ...ctlCells, ...convertCells, ...sigCells, ...expandCells, ...loadCells, ...viewCells };
const A = linkAcorn();
export const RG_GIVEN = {
  NUM: T.NUM, STR: T.STR, BIGINT: T.BIGINT, NULL: T.NULL, UNDEF: T.UNDEF, VOID: T.VOID, NEVER: T.NEVER, UNKNOWN: T.UNKNOWN,
  OBJECT: T.OBJECT, ERR: T.ERR, SYMBOL: T.SYMBOL, BOOL: T.BOOL, lit: T.lit, arr: T.arr, named: T.named, union: T.union,
  show: T.show, subst: T.subst, isNamed: T.isNamed, WRAPPERS: T.WRAPPERS, builtinNamesOf: T.builtinNamesOf,
  leadingComments: A.leadingComments, nodeKind: A.nodeKind, childrenOf: A.childrenOf,
};
// over: cells in place of the port's (rg-diff.ts's controls)
export const linkRg = (over: Record<string, (...inputs: never[]) => unknown> = {}) => link({ ...RG_CELLS, ...over } as typeof RG_CELLS, prelude, RG_GIVEN);
export type RgLinked = ReturnType<typeof linkRg>;

const mustParse = (p: Parse): Ast => { if (!p.ok) throw new Error(p.message); return p.ast; };
// the declaration texts are constants, so they are parsed once
let DECL_TREES: [Ast, RgOrigin][] | null = null;
const declTrees = () => (DECL_TREES ??= [[mustParse(A.parseTree(INTRINSIC_DECLS, false)), "intrinsic"], [mustParse(A.parseTree(PRELUDE_DECLS, false)), "prelude"], [mustParse(A.parseTree(JSX_DECLS, false)), "jsx"]]);

// a sink for reports: a load's list (with lines) or a cell view's buffer
type Sink = { load: RgReport[] } | { diag: IxDiag[] } | null;
export type RgRegistry = {
  L: RgLinked; G: RgK; Q: RgCtl;
  types: Map<string, RgDecl>; values: Map<string, RgValue>; expandMemo: Map<string, Ty>; ifaceMemo: Map<string, Rec>; quietKeys: Set<string>;
  ops: RegOps; decls: DeclOps; core: () => IxRegCore; peek: <X>(f: () => X) => X; lax: <X>(f: () => X) => X;
  isAlias: (n: string) => boolean; expand: (t: Ty) => Ty; ifaceRec: (n: string) => Rec; member: (t: Ty, k: string) => Prop | undefined;
  callSigs: (t: Ty) => Fn[]; iterElem: (t: Ty) => Ty | undefined; sub: (a: Ty, b: Ty) => boolean;
  unify: (p: Ty, a: Ty, m: Map<string, Ty>, tvs: Set<string>) => void; isTypedArray: (t: Ty) => boolean;
  convert: (n: AstNode, c: RgCtx) => Ty; load: (ast: Ast, origin: RgOrigin, typesOnly?: boolean, skip?: Set<number>) => AstNode[];
  take: () => RgReport[]; gap: () => string | null;
};
// a Registry: the three declaration texts loaded, their reports dropped (the constructor's handlers are no-ops)
export function rgRegistry(L: RgLinked = linkRg(), strictIndex = true): RgRegistry {
  const Y = new Map<string, RgDecl>(), V = new Map<string, RgValue>(), E = new Map<string, Ty>(), I = new Map<string, Rec>(), K = new Set<string>();
  const Q: RgCtl = L.rgFreshCtl(strictIndex);
  const at = (ts: Ty[], i: number): Ty => ts[i] as Ty;
  const expand = (t: Ty) => L.rgExpand(G, Y, E, I, Q, t), ifaceRec = (n: string) => L.rgIfaceRec(G, Y, E, I, Q, n);
  const decls: DeclOps = { decl: (n) => Y.get(n), expand, ifaceRec, strictIndex: () => Q.strict, at };
  const isAlias = T.isAliasWith(decls), member = T.memberWith(decls);
  const isTypedArray = (t: Ty) => L.rgIsTypedArray(t, TYPED_ARRAYS);
  const ops: RegOps = { expand, isAlias, member, isTypedArray, same: (a, b) => a === b, at, fresh: () => L.rgFresh(Q) };
  const callSigs = T.callSigsWith(ops), iterElem = T.iterElemWith(ops), subOps = T.subWith(ops, iterElem, callSigs);
  const unifyOps = T.unifyWith(ops, subOps, iterElem, callSigs), memberOf = T.memberOfWith(ops);
  const G: RgK = { convert: L.rgConvert, expand: L.rgExpand, ifaceRec: L.rgIfaceRec, sig: L.rgSig, literal: L.rgLiteral, quietGo: L.rgQuietGo, isAlias, memberOf, subOps, at };
  const sub = (a: Ty, b: Ty) => L.rgSub(G, Y, E, I, Q, K, a, b);
  const unify = (p: Ty, a: Ty, m: Map<string, Ty>, tvs: Set<string>) => unifyOps(p, a, m, tvs, 0);
  const peek = <X>(f: () => X): X => { const was: RgPeek = L.rgPeekOpen(Q); try { return f(); } finally { L.rgPeekClose(E, I, Q, was); } };
  const lax = <X>(f: () => X): X => { const s = Q.strict; Q.strict = false; try { return f(); } finally { Q.strict = s; } };
  const core = (): IxRegCore => ({ isAlias, expand, member, sub, callSigs, iterElem, unify, isTypedArray, mayHideMemo: new Map() });
  const load = (ast: Ast, origin: RgOrigin, typesOnly = false, skip: Set<number> = new Set()) => L.rgLoad(G, Y, V, E, I, Q, ast, origin, typesOnly, skip);
  for (const [ast, origin] of declTrees()) load(ast, origin);
  L.rgTake(Q);
  return {
    L, G, Q, types: Y, values: V, expandMemo: E, ifaceMemo: I, quietKeys: K, ops, decls, core, peek, lax,
    isAlias, expand, ifaceRec, member, callSigs, iterElem, sub, unify, isTypedArray,
    convert: (n, c) => L.rgConvert(G, Y, E, I, Q, n, c), load, take: () => L.rgTake(Q), gap: () => Q.gap,
  };
}

// core with each method run inside around (core.ts regAround)
function regAround(core: IxRegCore, around: <X>(f: () => X) => X): IxRegCore {
  return {
    ...(Object.fromEntries(Object.entries(core).flatMap(([k, f]) => typeof f === "function" ? [[k, (...a: unknown[]) => around(() => (f as (...a: unknown[]) => unknown)(...a))]] : [])) as IxRegCore),
    mayHideMemo: core.mayHideMemo,
  };
}
const toDiag = (r: RgReport): IxDiag => ({ start: r.start, end: r.end, rule: r.rule, msg: r.msg });
const toReport = (r: RgReport): MdReport => ({ rule: r.rule, line: r.line, msg: r.msg });

// core.ts mdRegistry over the cells. parsed: the module check's own parses of a text, so the user's declarations are
// read from the tree the cells check (one parse). onCell: called for each cell's view.
export type RgMdReg = MdReg & { finish: () => void; R: RgRegistry };
export function rgMdRegistry(parsed: (text: string, jsx: boolean) => Parse, L: RgLinked = linkRg(), strictIndex = true, onCell: (() => void) | null = null): RgMdReg {
  const R = rgRegistry(L, strictIndex);
  let user: Ast | null = null, sink: Sink = null;
  const flush = () => { const rs = R.take(); if (sink !== null) { if ("load" in sink) sink.load.push(...rs); else sink.diag.push(...rs.map(toDiag)); } };
  const swap = (s: Sink) => { flush(); sink = s; };
  const userAst = (): Ast => user ?? missingUser();
  const ctx = (tps: string[], look: Map<string, Ty> | null): RgCtx => ({ tps: new Set(tps), look, ast: userAst(), origin: "user" });
  const view = (): IxReg & { requeue: (ds: IxDiag[]) => void } => {
    const buf: IxDiag[] = [];
    swap({ diag: buf });
    const core = R.core(), memo = new Map<number, boolean>();
    const cloneProblem = T.cloneProblemWith(R.ops);
    return {
      ...core, quiet: regAround(core, R.peek), lax: regAround(core, R.lax), strictIndex: R.Q.strict, same: (a, b) => a === b,
      origin: (n) => L.rgOriginOf(R.types, n),
      convert: (n, tps, look) => R.convert(n, ctx(tps, look)),
      sig: (params, ret, tps, look) => L.rgSig(R.G, R.types, R.expandMemo, R.ifaceMemo, R.Q, params, ret, null, ctx(tps, look), null),
      hasTypeQuery: (n) => L.rgHasTypeQuery(memo, n), cloneProblem: (t) => cloneProblem(t, 0),
      drain: () => { flush(); return buf.splice(0); }, compile: null,
      requeue: (ds) => { flush(); buf.push(...ds); },
    };
  };
  const loadInto = (f: () => void): RgReport[] => { swap(null); const got: RgReport[] = []; sink = { load: got }; f(); flush(); sink = { load: [] }; return got; };
  return {
    R, builtin: L.rgBuiltin(R.types), ops: R.ops, globals: L.rgGlobals(R.values, PRELUDE_FNS, ALLOWED_GLOBALS), allowed: ALLOWED_GLOBALS, capabilities: new Map(Object.entries(CAPABILITIES)),
    loadForeign: (text): MdForeign => {
      const ast = mustParse(A.parseTree(text, false));
      let rest: AstNode[] = [];
      const reports = loadInto(() => { rest = R.load(ast, "foreign"); });
      return { reports: reports.map(toReport), rest: L.rgRestOf(rest), values: L.rgForeignValues(R.values) };
    },
    loadUser: (text, jsx, clash) => {
      const ast = mustParse(parsed(text, jsx));
      user = ast;
      return loadInto(() => { R.load(ast, "user", true, L.rgSkip(ast, clash)); }).map(toReport);
    },
    cell: () => {
      onCell?.();
      const ix = view();
      return { ix, withHook: (hook: (e: AstNode, options: Ty | null) => MdCompiled) => ({ ...ix, compile: (e: AstNode, options: Ty | null) => { const r = hook(e, options); ix.requeue(r.out); return r.res; } }) };
    },
    peekType: (n) => R.peek(() => L.rgPeekType(R.G, R.types, R.expandMemo, R.ifaceMemo, R.Q, n, userAst())),
    finish: () => swap(null),
  };
}
const missingUser = (): never => { throw new Error("the user's declarations are not loaded"); };

// the md cells linked with a parseTree that remembers its parses of this check, so loadUser reads the same tree
export function rgLinkMd(over: Record<string, (...inputs: never[]) => unknown> = {}) {
  const seen = new Map<string, Parse>();
  const parseTree = (text: string, jsx: boolean): Parse => {
    const k = (jsx ? "x" : "t") + text;
    const hit = seen.get(k);
    if (hit) return hit;
    const p = A.parseTree(text, jsx);
    seen.set(k, p);
    return p;
  };
  const M = linkMd(over, { parseTree });
  return { mdCheckSources: M.mdCheckSources, parsed: parseTree, reset: () => seen.clear() };
}
export type RgMd = ReturnType<typeof rgLinkMd>;

// core.ts runCheck with this registry: the same LiteResult, gap set when the registry or the cells met a gap
export function rgRunCheck(M: RgMd, L: RgLinked, src: Sources, opts: CheckOpts = {}): CheckRun & { rgGap: string | null } {
  const t0 = performance.now();
  M.reset();
  const R = rgMdRegistry(M.parsed, L, opts.strictIndex ?? true, opts.onCell ?? null);
  let r: MdResult;
  const S: MdSources = { cells: src.cells, tsx: !!src.tsx, foreign: src.foreign ?? null, shell: src.shell ?? null, name: src.name ?? null, outside: (src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })), probe: opts.probe ?? null };
  try { r = M.mdCheckSources(R, S); } finally { R.finish(); M.reset(); }
  const cells: LiteCell[] = r.cells.map((c) => ({ name: c.name, status: c.status, line: c.line, errors: c.errors.map((e) => ({ ...e })), unsupported: c.unsupported.map((e) => ({ ...e })), blockedBy: [...c.blockedBy], ...(c.value === null ? {} : { value: c.value }) }));
  const result: LiteResult = { port: r.port, file: r.file, ok: r.ok, module: r.module.map((e) => ({ ...e })), cells, ms: performance.now() - t0 };
  const facts = new Map<string, CellInfo>(r.facts.map((f) => [f.name, {
    name: f.name, span: [f.span[0] ?? 0, f.span[1] ?? 0], returnsRef: f.returnsRef, generator: f.generator, compiles: f.compiles.map((c) => ({ ...c })),
    params: f.params.map((p) => ({ name: p.name, refTyped: p.refTyped, eventsTyped: p.eventsTyped, ...(p.boundary ? { boundary: p.boundary } : {}) })),
  }]));
  Object.defineProperty(result, "facts", { value: facts, enumerable: false });
  if (opts.probe) Object.defineProperty(result, "probe", { value: { found: r.probe, reg: R.R }, enumerable: false });
  const fmt = (d: IxDiag) => `${d.rule} @${d.start}-${d.end} ${d.msg}`;
  return { result, gap: r.gap, rgGap: R.R.gap(), spans: r.cells.map((c) => ({ at: c.at, ch: c.ch.map(fmt), chUnsup: c.chUnsup.map(fmt) })) };
}
export type { IxInput };
