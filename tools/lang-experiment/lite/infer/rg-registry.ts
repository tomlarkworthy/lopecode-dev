// A registry of declarations made from the registry cells (rg-*.ss.ts): the tables (Maps) they read and write, the
// records of functions the subtype cells take, peek and lax as try/finally, and the three declaration texts loaded.
// The cells come in as a record, so ../core.ts (the shipped cells) and ../acorn/index.ts (the cells linked with a
// parser that has not crossed the boundary yet, for parseTree's own shape) make one the same way.
import { isAliasWith, memberWith, callSigsWith, iterElemWith, subWith, unifyWith, memberOfWith, type Ty, type Rec, type RegOps, type DeclOps, type Fn, type Prop } from "../types.ts";
import { INTRINSIC_DECLS, PRELUDE_DECLS, JSX_DECLS, TYPED_ARRAYS } from "../intrinsics.ts";
import type { Ast, AstNode, Parse } from "../acorn/acorn-types.ss.ts";
import type { IxRegCore } from "./ix-types.ss.ts";
import { memo } from "../../prelude.runtime.ts";
import type { RgK, RgDecl, RgValue, RgCtl, RgCtx, RgReport, RgOrigin, RgPeek } from "./rg-types.ss.ts";
import type { linkRg } from "../infer-ss.ts";

// the registry cells and the parser of declaration texts
export type RgCells = Pick<ReturnType<typeof linkRg>, "rgFreshCtl" | "rgConvert" | "rgExpand" | "rgIfaceRec" | "rgSig" | "rgLiteral" | "rgQuietGo" | "rgSub" | "rgFresh" |
  "rgPeekOpen" | "rgPeekClose" | "rgLoad" | "rgTake" | "rgIsTypedArray" | "rgOriginOf" | "rgHasTypeQuery" | "rgBuiltin" | "rgGlobals" | "rgRestOf" | "rgForeignValues" | "rgSkip" | "rgPeekType" | "rgMayHide">
  & { parseTree: (text: string, jsx: boolean) => Parse };
export type RgRegistry = {
  G: RgK; Q: RgCtl;
  types: Map<string, RgDecl>; values: Map<string, RgValue>; expandMemo: Map<string, Ty>; ifaceMemo: Map<string, Rec>; quietKeys: Set<string>;
  ops: RegOps; decls: DeclOps; core: () => IxRegCore; peek: <X>(f: () => X) => X; lax: <X>(f: () => X) => X;
  isAlias: (n: string) => boolean; expand: (t: Ty) => Ty; ifaceRec: (n: string) => Rec; member: (t: Ty, k: string) => Prop | undefined;
  callSigs: (t: Ty) => Fn[]; iterElem: (t: Ty) => Ty | undefined; sub: (a: Ty, b: Ty) => boolean;
  unify: (p: Ty, a: Ty, m: Map<string, Ty>, tvs: Set<string>) => void; isTypedArray: (t: Ty) => boolean;
  convert: (n: AstNode, c: RgCtx) => Ty; load: (ast: Ast, origin: RgOrigin, typesOnly?: boolean, skip?: Set<number>) => AstNode[];
  take: () => RgReport[]; gap: () => string | null;
};
const declTree = (p: Parse): Ast => { if (!p.ok) throw new Error(p.message); return p.ast; };
// the three declaration texts' trees, by a parser
export const declTreesOf = (parseTree: (text: string, jsx: boolean) => Parse): [Ast, RgOrigin][] =>
  [[declTree(parseTree(INTRINSIC_DECLS, false)), "intrinsic"], [declTree(parseTree(PRELUDE_DECLS, false)), "prelude"], [declTree(parseTree(JSX_DECLS, false)), "jsx"]];
// a registry with the declaration trees loaded, their reports dropped
export function rgRegistryOf(L: RgCells, strictIndex: boolean, declTrees: [Ast, RgOrigin][]): RgRegistry {
  const Y = new Map<string, RgDecl>(), V = new Map<string, RgValue>(), E = new Map<string, Ty>(), I = new Map<string, Rec>(), K = new Set<string>();
  const Q: RgCtl = L.rgFreshCtl(strictIndex);
  const at = (ts: Ty[], i: number): Ty => ts[i] as Ty;
  const expand = (t: Ty) => L.rgExpand(G, Y, E, I, Q, t), ifaceRec = (n: string) => L.rgIfaceRec(G, Y, E, I, Q, n);
  const decls: DeclOps = { decl: (n) => Y.get(n), expand, ifaceRec, strictIndex: () => Q.strict, at };
  const isAlias = isAliasWith(decls), member = memberWith(decls);
  const isTypedArray = (t: Ty) => L.rgIsTypedArray(t, TYPED_ARRAYS);
  const ops: RegOps = { expand, isAlias, member, isTypedArray, same: (a, b) => a === b, at, fresh: () => L.rgFresh(Q) };
  const callSigs = callSigsWith(ops), iterElem = iterElemWith(ops), subOps = subWith(ops, iterElem, callSigs);
  const unifyOps = unifyWith(ops, subOps, iterElem, callSigs), memberOf = memberOfWith(ops);
  const G: RgK = { convert: L.rgConvert, expand: L.rgExpand, ifaceRec: L.rgIfaceRec, sig: L.rgSig, literal: L.rgLiteral, quietGo: L.rgQuietGo, isAlias, memberOf, subOps, at };
  const sub = (a: Ty, b: Ty) => L.rgSub(G, Y, E, I, Q, K, a, b);
  const unify = (p: Ty, a: Ty, m: Map<string, Ty>, tvs: Set<string>) => unifyOps(p, a, m, tvs, 0);
  const peek = <X>(f: () => X): X => { const was: RgPeek = L.rgPeekOpen(Q); try { return f(); } finally { L.rgPeekClose(E, I, Q, was); } };
  const lax = <X>(f: () => X): X => { const s = Q.strict; Q.strict = false; try { return f(); } finally { Q.strict = s; } };
  // rgMayHide memoised per core (Checker.mayHideMemo); memo here, not in a cell, since the walk's key, the core, holds functions
  const core = (): IxRegCore => {
    const c = { isAlias, expand, member, sub, callSigs, iterElem, unify, isTypedArray };
    // t1 (2026-11-24): mayHideAny also counts a record that takes any object (A-1); a separate memo, so mayHide's users keep its answer
    return { ...c, mayHide: memo((t: Ty) => peek(() => L.rgMayHide(c, t, false))), mayHideAny: memo((t: Ty) => peek(() => L.rgMayHide(c, t, true))) };
  };
  const load = (ast: Ast, origin: RgOrigin, typesOnly = false, skip: Set<number> = new Set()) => L.rgLoad(G, Y, V, E, I, Q, ast, origin, typesOnly, skip);
  for (const [ast, origin] of declTrees) load(ast, origin);
  L.rgTake(Q);
  return {
    G, Q, types: Y, values: V, expandMemo: E, ifaceMemo: I, quietKeys: K, ops, decls, core, peek, lax,
    isAlias, expand, ifaceRec, member, callSigs, iterElem, sub, unify, isTypedArray,
    convert: (n, c) => L.rgConvert(G, Y, E, I, Q, n, c), load, take: () => L.rgTake(Q), gap: () => Q.gap,
  };
}
