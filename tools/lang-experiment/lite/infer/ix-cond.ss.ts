// Conditions (lite/infer.ts cond): a test checked for the flows where it is true and where it is false. The two
// flows are built in place as local tables, then become new flow objects.

export type IxBy = (t: Ty, branch: boolean) => Ty;
export const ixCond = (ixCondLeaf, ixCondLogical, BOOL) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): IxCond => {
  if (e.type === "UnaryExpression" && e.operator === "!") {
    const c = K.cond(K, T, V, W, C, env, e.argument);
    T.set(e.nid, BOOL);
    return { t: c.f, f: c.t };
  }
  if (e.type === "LogicalExpression" && (e.operator === "&&" || e.operator === "||")) return ixCondLogical(K, T, V, W, C, env, e);
  const t = K.infer(K, T, V, W, C, env, e);
  return ixCondLeaf(K, T, V, W, C, env, e, t);
};
export const ixCondLogical = (ixLogicalType, ixJoin2, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: LogicalExpression): IxCond => {
  const l = K.cond(K, T, V, W, C, env, e.left);
  const own = C.cur;
  C.cur = e.operator === "&&" ? l.t : l.f;
  const r = K.cond(K, T, V, W, C, env, e.right);
  C.cur = own;
  T.set(e.nid, ixLogicalType(K.reg, e.operator, T.get(e.left.nid) ?? ERR, T.get(e.right.nid) ?? ERR));
  return e.operator === "&&" ? { t: r.t, f: ixJoin2(W, C, l.f, r.f) } : { t: ixJoin2(W, C, l.t, r.t), f: r.f };
};
// where an optional chain's value cannot be undefined on this branch, no ?. link short-circuited
export const ixChainLinks = (ixPathKey, ixExclusion, ixNonNullish, NEVER) => (K: IxK, T: IxTypes, V: IxVars, env: IxEnv, M: Mut<IxFlow>, n: ChainExpression): void => {
  for (let x = n.expression; x.type === "MemberExpression" || x.type === "CallExpression"; x = x.type === "MemberExpression" ? x.object : x.callee) {
    const o = x.optional ? (x.type === "MemberExpression" ? x.object : x.callee) : null;
    const ok = o === null ? null : ixPathKey(V, env, o, true);
    const ot = o === null || ok === null ? undefined : M.get(ok) ?? T.get(o.nid);
    if (ok === null || ot === undefined) continue;
    M.set(ixExclusion("null", ok), NEVER);
    M.set(ixExclusion("undef", ok), NEVER);
    M.set(ok, ixNonNullish(K.reg, ot));
  }
};
// one branch's narrowing of path k: what the test cannot pass on is excluded, then the path's type is narrowed
export const ixNarrowSide = (ixExclusion, ixFilter, NULL, UNDEF, NEVER) => (K: IxK, M: Mut<IxFlow>, k: string, nt: Ty, by: IxBy, br: boolean): void => {
  for (const x of [NULL, UNDEF]) if (by(x, br).k === "never") M.set(ixExclusion(x.k, k), NEVER);
  const noNull = M.has(ixExclusion("null", k)), noUndef = M.has(ixExclusion("undef", k));
  M.set(k, ixFilter(K.reg, by(nt, br), (m) => !(m.k === "null" ? noNull : (m.k === "undef" || m.k === "void") && noUndef)));
};
export const ixNarrow = (ixChainLinks, ixNarrowSide, ixPathKey, UNDEF) => (K: IxK, T: IxTypes, V: IxVars, env: IxEnv, TT: Mut<IxFlow>, FF: Mut<IxFlow>, n: AstNode, nt: Ty | undefined, by: IxBy): void => {
  if (n.type === "ChainExpression") {
    if (by(UNDEF, true).k === "never") ixChainLinks(K, T, V, env, TT, n);
    if (by(UNDEF, false).k === "never") ixChainLinks(K, T, V, env, FF, n);
  }
  const k = ixPathKey(V, env, n, false);
  if (k === null || nt === undefined) return;
  ixNarrowSide(K, TT, k, nt, by, true);
  ixNarrowSide(K, FF, k, nt, by, false);
};
// P.f's test also narrows P to the members whose f can pass it
export const ixDiscriminant = (ixNarrow, ixNarrowByProp) => (K: IxK, T: IxTypes, V: IxVars, env: IxEnv, TT: Mut<IxFlow>, FF: Mut<IxFlow>, m0: AstNode, can: (pt: Ty, branch: boolean) => boolean): void => {
  const m = m0.type === "ChainExpression" ? m0.expression : m0;
  if (m.type !== "MemberExpression" || m.computed || m.property.type !== "Identifier") return;
  const name = m.property.name;
  ixNarrow(K, T, V, env, TT, FF, m.object, T.get(m.object.nid), (ot, branch) => ixNarrowByProp(K.reg, ot, name, (pt) => can(pt, branch)));
};
// typeof x === "tag", in either order
export const ixTypeofTest = () => (a: AstNode, b: AstNode): { arg: AstNode; tag: string } | null =>
  a.type === "UnaryExpression" && a.operator === "typeof" && b.type === "Literal" && typeof b.value === "string" ? { arg: a.argument, tag: b.value } : null;
export const ixNarrowCompare = (ixNarrow, ixDiscriminant, ixNarrowTypeof, ixNarrowEq, ixTypeofTest) => (K: IxK, T: IxTypes, V: IxVars, env: IxEnv, TT: Mut<IxFlow>, FF: Mut<IxFlow>, e: BinaryExpression): void => {
  const pos = e.operator === "===" || e.operator === "==", loose = e.operator.length === 2;
  const tag = ixTypeofTest(e.left, e.right) ?? ixTypeofTest(e.right, e.left);
  if (tag) return ixNarrow(K, T, V, env, TT, FF, tag.arg, T.get(tag.arg.nid), (pt, br) => ixNarrowTypeof(K.reg, pt, tag.tag, br === pos));
  const sides: [AstNode, AstNode][] = [[e.left, e.right], [e.right, e.left]];
  for (const [a, b] of sides) {
    const bt = T.get(b.nid);
    if (!bt || (bt.k !== "lit" && bt.k !== "null" && bt.k !== "undef")) continue;
    ixNarrow(K, T, V, env, TT, FF, a, T.get(a.nid), (at, br) => ixNarrowEq(K.reg, at, bt, br === pos, loose));
    ixDiscriminant(K, T, V, env, TT, FF, a, (pt, br) => ixNarrowEq(K.reg, pt, bt, br === pos, loose).k !== "never");
    return;
  }
};
// Array.isArray(x), where Array is the global
export const ixIsArrayTest = (ixLookup) => (V: IxVars, env: IxEnv, e: AstNode): AstNode | null => {
  if (e.type !== "CallExpression" || e.arguments.length !== 1) return null;
  const c = e.callee;
  if (c.type !== "MemberExpression" || c.computed || c.object.type !== "Identifier" || c.object.name !== "Array") return null;
  if (c.property.type !== "Identifier" || c.property.name !== "isArray" || ixLookup(V, env, "Array")?.kind !== "global") return null;
  return e.arguments[0] ?? null;
};
export const ixCondLeaf = (ixNarrow, ixDiscriminant, ixNarrowCompare, ixIsArrayTest, ixNarrowIn, ixNarrowArray, ixTruthy, ixFalsy, ixFlowOf, ixNewFlow) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode, t: Ty): IxCond => {
  const TT: Mut<IxFlow> = new Map(ixFlowOf(W, C.cur)), FF: Mut<IxFlow> = new Map(ixFlowOf(W, C.cur));
  const arrayArg = ixIsArrayTest(V, env, e);
  if (e.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(e.operator)) ixNarrowCompare(K, T, V, env, TT, FF, e);
  else if (e.type === "BinaryExpression" && e.operator === "in" && e.left.type === "Literal" && typeof e.left.value === "string") {
    const key = e.left.value;
    ixNarrow(K, T, V, env, TT, FF, e.right, T.get(e.right.nid), (rt, br) => ixNarrowIn(K.reg, rt, key, br));
  } else if (arrayArg !== null) ixNarrow(K, T, V, env, TT, FF, arrayArg, T.get(arrayArg.nid), (at, br) => ixNarrowArray(K.reg, at, br));
  else {
    ixNarrow(K, T, V, env, TT, FF, e, t, (x, br) => (br ? ixTruthy(K.reg, x) : ixFalsy(K.reg, x)));
    ixDiscriminant(K, T, V, env, TT, FF, e, (pt, br) => (br ? ixTruthy(K.reg, pt) : ixFalsy(K.reg, pt)).k !== "never");
  }
  return { t: ixNewFlow(W, C, TT), f: ixNewFlow(W, C, FF) };
};
