// One signature applied to a call (lite/infer.ts apply): rank-1 inference over the arguments, callbacks after the
// arguments that fix their parameters, then each argument checked against its solved parameter. The substitution
// is a local table; a read of it is a copy, since subst takes a plain map.

export type IxApp = { sig: Fn; tvs: string[]; tvSet: Set<string>; opaque: Set<string> | null; fixed: Set<string> };
export const ixParamAt = () => (sig: Fn, i: number): Ty | undefined => sig.ps[i]?.t ?? sig.rest;
// the substitution so far with what the expected return type gave for the variables it has not solved
export const ixCtxSubst = (subst) => (t: Ty, m: Map<string, Ty>, fromRet: Map<string, Ty>): Ty => {
  const cm: Mut<Map<string, Ty>> = new Map(m);
  for (const [k, v] of fromRet) if (!cm.has(k)) cm.set(k, v);
  return subst(t, cm);
};
// a contextual type with unresolved variables replaced by unknown (keeps tuple and record shape for literals)
export const ixCtxOnly = (subst, UNKNOWN) => (t: Ty, tvs: Set<string>): Ty | null => {
  const r = subst(t, new Map([...tvs].map((n): [string, Ty] => [n, UNKNOWN])));
  return r.k === "unknown" ? null : r;
};
export const ixWidenFree = (widen) => (m: Mut<Map<string, Ty>>, fixed: Set<string>): void => {
  for (const [k, v] of [...m]) if (!fixed.has(k)) m.set(k, widen(v));
};
export const ixArity = (ixErr) => (K: IxK, C: IxCtls, e: AstNode, args: AstNode[], sig: Fn): void => {
  const required = sig.ps.filter((p) => !p.opt).length;
  // e1 (2026-11-23), B4: reduce takes its start value as a required argument (ergonomics1 30)
  const c = e.type === "CallExpression" ? e.callee : null, m = c !== null && c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier" ? c.property.name : "";
  const reduce = m === "reduce" && args.length === 1 ? "; a start value is required as reduce's second argument (xs.reduce((acc, v) => acc + v, 0)): with none, reduce throws on an empty array" : "";
  if (args.length < required && !args.some((a) => a.type === "SpreadElement")) ixErr(K, C, e, "arity", `expected at least ${required} arguments, got ${args.length}${reduce}`);
  if (args.length > sig.ps.length && !sig.rest) ixErr(K, C, e, "arity", `expected at most ${sig.ps.length} arguments, got ${args.length}`);
};
export const ixSpreadArg = (ixErr, ixUnsup, ixHides, subst, show) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, A: IxApp, a: SpreadElement, i: number, m: Map<string, Ty>): void => {
  const st = K.infer(K, T, V, W, C, env, a.argument), el = K.reg.iterElem(st), rest = A.sig.rest;
  if (!el) ixErr(K, C, a, "type", `spread of non-iterable ${show(st)}`);
  else if (rest === undefined || i < A.sig.ps.length) ixUnsup(K, C, a, "spread argument to a non-rest parameter");
  else if (!K.reg.sub(el, subst(rest, m))) ixErr(K, C, a, "type", `spread element ${show(el)} is not assignable to ${show(subst(rest, m))}`);
  else ixHides(K, C, a, el, rest, A.opaque);
};
// the first pass over one argument: its type, or "defer" for a callback whose parameters wait on type variables
export const ixFirstArg = (ixSpreadArg, ixParamAt, ixCtxSubst, ixCtxOnly, ixAnnOf, subst, hasTv, union, UNDEF, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, A: IxApp, a: AstNode, i: number, m: Mut<Map<string, Ty>>, fromRet: Map<string, Ty>): Ty | "defer" | null => {
  const p = ixParamAt(A.sig, i);
  if (a.type === "SpreadElement") { ixSpreadArg(K, T, V, W, C, env, A, a, i, new Map(m)); return ERR; }
  if (p === undefined) { K.infer(K, T, V, W, C, env, a); return null; }
  const fnArg = a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression";
  const lam = (a.type === "ArrowFunctionExpression" || a.type === "FunctionExpression") && a.params.some((q) => ixAnnOf(q) === null);
  const pc = subst(p, new Map(m));
  if (lam && hasTv(pc, A.tvSet)) return "defer";
  // e1 (2026-11-23), B4: a callback with every parameter annotated gives the type variables of its parameters itself
  if (fnArg && hasTv(pc, A.tvSet) && K.reg.callSigs(pc).some((s) => s.ps.some((q) => hasTv(q.t, A.tvSet)))) { const t = K.infer(K, T, V, W, C, env, a); K.reg.unify(p, t, m, A.tvSet); return t; }
  if (!hasTv(pc, A.tvSet)) return K.check(K, T, V, W, C, env, a, A.sig.ps[i]?.opt && !fnArg ? union([pc, UNDEF]) : pc, false, false);
  const t = K.check(K, T, V, W, C, env, a, ixCtxOnly(ixCtxSubst(p, new Map(m), fromRet), A.tvSet), true, false);
  K.reg.unify(p, t, m, A.tvSet);
  return t;
};
// a deferred callback, checked once the arguments before it fixed its parameters' types
export const ixDeferredArg = (ixParamAt, ixCtxSubst, ixUnsup, ixWidenFree, hasTv, UNKNOWN, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, A: IxApp, a: AstNode, i: number, m: Mut<Map<string, Ty>>, fromRet: Map<string, Ty>): Ty => {
  const p = ixParamAt(A.sig, i) ?? ERR;
  const pc = ixCtxSubst(p, new Map(m), fromRet);
  const ps = K.reg.callSigs(pc)[0];
  if (ps && ps.ps.some((q) => hasTv(q.t, A.tvSet))) { ixUnsup(K, C, a, "callback whose parameter types are not inferred before it"); return ERR; }
  const ctx: Ty = ps ? { ...ps, ret: !hasTv(ps.ret, A.tvSet) ? ps.ret : UNKNOWN } : pc;
  const t = K.fnExpr(K, T, V, W, C, env, a, ctx, null);
  T.set(a.nid, t);
  K.reg.unify(p, t, m, A.tvSet);
  ixWidenFree(m, A.fixed);
  return t;
};
// each argument against its parameter under the solved substitution
export const ixFinalArgs = (ixParamAt, ixExpect, ixHides, subst, hasTv) => (K: IxK, C: IxCtls, A: IxApp, args: AstNode[], argT: (Ty | null)[], deferred: number[], m: Map<string, Ty>): void => {
  for (const [i, a] of args.entries()) {
    const p = ixParamAt(A.sig, i), t = argT[i] ?? null;
    if (p === undefined || t === null || a.type === "SpreadElement") continue;
    const pc = subst(p, m);
    if ((hasTv(p, A.tvSet) || deferred.includes(i)) && ixExpect(K, C, a, t, pc, false) && A.opaque && hasTv(p, A.tvSet)) ixHides(K, C, a, t, p, A.opaque);
  }
};
export const ixSolve = (widen, UNKNOWN) => (m: Mut<Map<string, Ty>>, fromRet: Map<string, Ty>, A: IxApp): void => {
  for (const n of A.tvs) {
    if (A.fixed.has(n)) continue;
    const c = m.get(n) ?? fromRet.get(n);
    m.set(n, c ? (m.has(n) ? widen(c) : c) : UNKNOWN);
  }
};
// the explicit type arguments into the substitution, with the arity check
export const ixExplicit = (ixErr) => (K: IxK, C: IxCtls, e: AstNode, tvs: string[], explicit: Ty[] | null, m: Mut<Map<string, Ty>>): void => {
  if (explicit === null) return;
  if (explicit.length !== tvs.length) ixErr(K, C, e, "type", `expected ${tvs.length} type arguments, got ${explicit.length}`);
  for (const [i, n] of tvs.entries()) { const x = explicit[i]; if (x) m.set(n, x); }
};
export const ixApply = (ixArity, ixExplicit, ixFirstArg, ixDeferredArg, ixWidenFree, ixSolve, ixFinalArgs, ixSettled, ixFact, instantiate, subst, hasTv) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: CallExpression | NewExpression, sig0: Fn, expected: Ty | null, explicit: Ty[] | null): Ty => {
  const inst = instantiate(sig0, C.fresh);
  C.fresh += sig0.tps.length;
  const tvSet = new Set(inst.tvs), m: Mut<Map<string, Ty>> = new Map(), fromRet: Mut<Map<string, Ty>> = new Map();
  ixExplicit(K, C, e, inst.tvs, explicit, m);
  const A: IxApp = { sig: inst.f, tvs: inst.tvs, tvSet, opaque: sig0.flags?.intrinsic ? null : tvSet, fixed: new Set(m.keys()) };
  ixArity(K, C, e, e.arguments, A.sig);
  const decl = sig0.decl ?? sig0, fl = sig0.flags;
  ixFact(C, { k: "sig", at: e.nid, sig: fl ? { ...inst.f, decl, flags: fl } : { ...inst.f, decl } });
  if (expected !== null && hasTv(A.sig.ret, tvSet)) K.reg.unify(A.sig.ret, expected, fromRet, tvSet);
  const ret = new Map(fromRet), argT: Mut<(Ty | null)[]> = [], deferred: Mut<number[]> = [];
  for (const [i, a] of e.arguments.entries()) {
    const t = ixFirstArg(K, T, V, W, C, env, A, a, i, m, ret);
    if (t === "defer") deferred.push(i);
    argT.push(t === "defer" ? null : t);
  }
  ixWidenFree(m, A.fixed);
  for (const i of deferred) { const a = e.arguments[i]; if (a !== undefined) argT[i] = ixDeferredArg(K, T, V, W, C, env, A, a, i, m, ret); }
  ixSolve(m, ret, A);
  ixFinalArgs(K, C, A, e.arguments, argT, deferred, new Map(m));
  return ixSettled(K.reg, subst(A.sig.ret, new Map(m)));
};
// a promise never fulfils with a promise-like: resolving with one adopts what it settles to
export const ixSettled = (ixUm, ixAwaited, union, named, isNamed) => (R: IxRegCore, t: Ty): Ty => {
  const deep = (x: Ty, d: number): Ty => (d > 10 ? x : union(ixUm(R, x).map((m) => (m.k === "named" && m.n === "Promise" ? deep(m.args[0] ?? m, d + 1) : ixAwaited(R, m, false)))));
  return t.k === "union" || isNamed(t, "Promise") ? union(ixUm(R, t).map((m) => (m.k === "named" && m.n === "Promise" ? named("Promise", deep(m.args[0] ?? m, 0)) : m))) : t;
};
