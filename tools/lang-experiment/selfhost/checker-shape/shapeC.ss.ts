// uses: ast, types, common
// Shape C: each state-writing Checker method is its own cell, as in B, but the state is working tables the methods
// write in place (events.ss.ts's handlers): Mut parameters, made by checkerC and frozen when it returns. A Mut
// cannot be placed in a record ([mut-escape]), so the four tables are four parameters of every method: T the
// expression types, B the binding of each identifier, V the bindings by "<scope>:<name>", C the counters, the
// current flow, the diagnostics and the returned types. R is the knot, as in B.
// diags: a persistent log, newest first, with its length (a write is one record, a rollback restores the pointer).
// The scope chain is in EnvC (up), as the original's Scope.parent, so a new scope copies nothing.
export type DLog = { readonly d: Diag; readonly n: number; readonly next: DLog | null };
export type Chain = { readonly id: number; readonly up: Chain | null };
export type EnvC = { scope: number; up: Chain | null; dead: boolean; retCtx: Ty | undefined };
export type Ctl = {
  flow: Flow; diags: DLog | null; rets: readonly Ty[];
  nextId: number; nextScope: number; fresh: number; quiet: number;
};
export type Types = Mut<Map<Node, Ty>>;
export type Bound = Mut<Map<Node, Binding>>;
export type Vars = Mut<Map<string, Binding>>;
export type Ctls = Mut<Ctl>;
export type RecurC = {
  infer: (T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node) => Ty;
  check: (T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean) => Ty;
  cond: (T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node) => Cond;
  stmts: (T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, list: Node[]) => boolean;
};

export const errC = () => (C: Ctls, node: Node, rule: string, msg: string): void => { C.diags = { d: { node, rule, msg }, n: (C.diags?.n ?? 0) + 1, next: C.diags }; };
export const unsupC = (errC) => (C: Ctls, node: Node, what: string): void => errC(C, node, "unsupported", what);
export const newScopeC = () => (C: Ctls, env: EnvC): EnvC => {
  C.nextScope += 1;
  return { ...env, scope: C.nextScope, up: { id: env.scope, up: env.up } };
};
export const lookupC = () => (V: Vars, env: EnvC, n: string): Binding | undefined => {
  const here = V.get(`${env.scope}:${n}`);
  if (here) return here;
  for (let c = env.up; c; c = c.up) {
    const b = V.get(`${c.id}:${n}`);
    if (b) return b;
  }
  return undefined;
};
export const declareC = () => (B: Bound, V: Vars, C: Ctls, env: EnvC, name: string, t: Ty, kind: BKind, node: Node | null): Binding => {
  C.nextId += 1;
  const b: Binding = { id: C.nextId, name, t, kind, node };
  V.set(`${env.scope}:${name}`, b);
  if (node) B.set(node, b);
  return b;
};
export const pathKeyC = (lookupC, memberPath, isNamed) => {
  function pathKey(V: Vars, env: EnvC, n: Node): string | null {
    if (n.type === "Identifier") {
      const b = lookupC(V, env, n.name);
      if (!b || b.kind === "global" || b.kind === "prelude" || isNamed(b.t, "Mut")) return null;
      return "#" + b.id;
    }
    if (n.type === "MemberExpression" && !n.optional) {
      const base = pathKey(V, env, n.object), tail = memberPath(n);
      return base && tail ? base + tail : null;
    }
    return null;
  }
  return pathKey;
};
export const memberMissingC = (errC, unsupC, intrinsicName, show) => (C: Ctls, m: Ty, k: string, at: Node, all: Ty): void => {
  if (m.k === "null" || m.k === "undef" || m.k === "void") return errC(C, at, "possibly-undefined", `property ${k} of a value that may be ${show(all)}`);
  if (m.k === "unknown") return errC(C, at, "no-member", `property ${k} on Js/unknown; narrow it first`);
  const i = intrinsicName(m);
  if (i) unsupC(C, at, `intrinsic member ${i}.${k}`);
  else errC(C, at, "no-member", `no property ${k} on ${show(m)}`);
};
export const expectC = (regView, errC, nonUndef, members, isNamed, show) => (C: Ctls, at: Node, t: Ty, expected: Ty): boolean => {
  if (regView.sub(t, expected)) return true;
  let rule = "type";
  if (regView.sub(nonUndef(t), expected)) rule = "possibly-undefined";
  else if (members(t).some((m) => isNamed(m, "Action")) && !members(expected).some((m) => isNamed(m, "Action"))) rule = "action-pass";
  errC(C, at, rule, `${show(t)} is not assignable to ${show(expected)}`);
  return false;
};
export const numericC = (regView, errC, nonUndef, filter, show, NUM) => (C: Ctls, at: Node, t: Ty): boolean => {
  if (t.k === "err" || regView.sub(t, NUM)) return true;
  if (regView.sub(nonUndef(filter(t, (m) => m.k !== "null")), NUM)) errC(C, at, "possibly-undefined", `${show(t)} used as a number`);
  else errC(C, at, "type", `${show(t)} used as a number`);
  return false;
};

export const checkC = (check1C) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean): Ty => {
  const outer = C.quiet;
  const q = soft || ctx || outer > 0;
  C.quiet = q && (e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ConditionalExpression" || e.type === "LogicalExpression") ? 1 : 0;
  try { return check1C(R, T, B, V, C, env, e, expected, soft); } finally { C.quiet = outer; }
};
export const check1C = (conditionalC, callC, expectC, logicalType, join2, ctxSensitive, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node, expected: Ty | undefined, soft: boolean): Ty => {
  if (!expected) return R.infer(T, B, V, C, env, e);
  if (expected.k === "unknown" && !ctxSensitive(e)) return R.infer(T, B, V, C, env, e);
  if (e.type === "ConditionalExpression") { const t = conditionalC(R, T, B, V, C, env, e, expected); T.set(e, t); return t; }
  if (e.type === "LogicalExpression" && e.operator !== "&&") {
    const c = R.cond(T, B, V, C, env, e.left);
    const lt = T.get(e.left) ?? ERR;
    if (e.operator === "||") C.flow = c.f;
    const r = R.check(T, B, V, C, env, e.right, expected, false, false);
    C.flow = join2(c.t, c.f);
    const t = logicalType(e.operator, lt, r);
    T.set(e, t);
    return t;
  }
  const t = e.type === "CallExpression" ? callC(R, T, B, V, C, env, e, expected) : R.infer(T, B, V, C, env, e);
  T.set(e, t);
  if (!soft) expectC(C, e, t, expected);
  return t;
};
export const inferC = (infer1C) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node): Ty => {
  const q = C.quiet;
  C.quiet = 0;
  try {
    const t = infer1C(R, T, B, V, C, env, e);
    T.set(e, t);
    return t;
  } finally { C.quiet = q; }
};
export const literalTC = (named, lit, NULL) => (e: Literal): Ty => (e.regex ? named("RegExp") : e.value === null ? NULL : lit(e.value));
export const infer1C = (literalTC, identC, memberC, callC, unaryC, binaryC, logicalC, conditionalC, unsupC, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node): Ty => {
  switch (e.type) {
    case "Literal": return literalTC(e);
    case "Identifier": return identC(B, V, C, env, e);
    case "MemberExpression": return memberC(R, T, B, V, C, env, e);
    case "CallExpression": return callC(R, T, B, V, C, env, e, undefined);
    case "UnaryExpression": return unaryC(R, T, B, V, C, env, e);
    case "BinaryExpression": return binaryC(R, T, B, V, C, env, e);
    case "LogicalExpression": return logicalC(R, T, B, V, C, env, e);
    case "ConditionalExpression": return conditionalC(R, T, B, V, C, env, e, undefined);
    default: unsupC(C, e, e.type); return ERR;
  }
};
export const logicalC = (logicalType, join2, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: LogicalExpression): Ty => {
  const c = R.cond(T, B, V, C, env, e.left);
  const lt = T.get(e.left) ?? ERR;
  const before = C.flow;
  C.flow = e.operator === "&&" ? c.t : e.operator === "||" ? c.f : before;
  const rt = R.infer(T, B, V, C, env, e.right);
  C.flow = join2(e.operator === "&&" ? c.f : e.operator === "||" ? c.t : before, C.flow);
  return logicalType(e.operator, lt, rt);
};
export const identC = (lookupC, errC, ERR) => (B: Bound, V: Vars, C: Ctls, env: EnvC, e: Identifier): Ty => {
  const b = lookupC(V, env, e.name);
  if (!b) {
    if (e.name !== "arguments") errC(C, e, "free-name", `free name ${e.name}`);
    return ERR;
  }
  B.set(e, b);
  return b.kind === "prelude" ? b.t : C.flow.get("#" + b.id) ?? b.t;
};
export const memberC = (regView, pathKeyC, memberMissingC, errC, unsupC, collapseArrays, um, union, show, propT, memberless, intrinsicName, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: MemberExpression): Ty => {
  const ot = collapseArrays(R.infer(T, B, V, C, env, e.object));
  const k = pathKeyC(V, env, e);
  const nt = k ? C.flow.get(k) : undefined;
  const prop = e.property;
  if (e.computed || prop.type !== "Identifier") { unsupC(C, e, "computed member (cut from the slice)"); return ERR; }
  const name = prop.name;
  const out: Mut<Ty[]> = mut([]), missing: Mut<Ty[]> = mut([]);
  let bad = false;
  for (const m of um(ot)) {
    if (m.k === "err") { bad = true; out.push(ERR); continue; }
    if (memberless(m)) { errC(C, e, "type", `${show(m)} has no members`); bad = true; continue; }
    if (regView.expand(m).k === "err") { bad = true; out.push(ERR); continue; }
    const p = regView.member(m, name);
    if (!p) { missing.push(m); bad = true; out.push(ERR); continue; }
    out.push(propT(p));
  }
  const nullish = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
  const kinds = [missing.filter(nullish), missing.filter((m) => m.k === "unknown"), missing.filter((m) => !nullish(m) && m.k !== "unknown" && intrinsicName(m)), missing.filter((m) => !nullish(m) && m.k !== "unknown" && !intrinsicName(m))];
  for (const g of kinds) {
    const g0 = g[0];
    if (g0 !== undefined) memberMissingC(C, g.length === 1 || nullish(g0) ? g0 : union(g), name, prop, union(g));
  }
  return nt ?? (bad && out.length === 0 ? ERR : union(freeze(out)));
};
export const bailC = (ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: CallExpression): Ty => {
  for (const a of e.arguments) R.infer(T, B, V, C, env, a);
  return ERR;
};
export const callC = (regView, applyC, bailC, errC, um, show, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: CallExpression, expected: Ty | undefined): Ty => {
  const calleeT = R.infer(T, B, V, C, env, e.callee);
  if (calleeT.k === "err") return bailC(R, T, B, V, C, env, e);
  const ms = um(calleeT), m0 = ms[0];
  if (ms.length !== 1 || m0 === undefined) { errC(C, e, "type", `call of ${show(calleeT)}`); return bailC(R, T, B, V, C, env, e); }
  const sigs = regView.callSigs(m0);
  if (!sigs.length) {
    if (m0.k === "null" || m0.k === "undef") errC(C, e, "possibly-undefined", `call of a value that may be ${show(m0)}`);
    else errC(C, e, "type", `${show(m0)} is not callable`);
    return bailC(R, T, B, V, C, env, e);
  }
  let t: Ty = ERR;
  for (const [i, sig] of sigs.entries()) {
    const d = C.diags, saved = C.flow;
    t = applyC(R, T, B, V, C, env, e, sig, expected);
    if ((C.diags?.n ?? 0) === (d?.n ?? 0) || i === sigs.length - 1) return t;
    C.diags = d;
    C.flow = saved;
  }
  return t;
};
export const applyArgC = (regView, unsupC, union, subst, hasTv, ctxOnly, ERR, UNDEF) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, a: Node, p: Ty | undefined, opt: boolean, tvSet: Set<string>, m: Mut<Map<string, Ty>>, fromRet: Mut<Map<string, Ty>>): Ty | undefined => {
  if (a.type === "SpreadElement") { unsupC(C, a, "spread argument (cut from the slice)"); return ERR; }
  if (!p) { R.infer(T, B, V, C, env, a); return undefined; }
  const pc = subst(p, new Map(m));
  if (!hasTv(pc, tvSet)) return R.check(T, B, V, C, env, a, opt ? union([pc, UNDEF]) : pc, false, false);
  const cm: Mut<Map<string, Ty>> = mut(new Map(m));
  for (const [k, v] of fromRet) if (!cm.has(k)) cm.set(k, v);
  const t = R.check(T, B, V, C, env, a, ctxOnly(subst(p, freeze(cm)), tvSet), true, false);
  regView.unify(p, t, m, tvSet);
  return t;
};
export const solveC = (widen, UNKNOWN) => (m: Mut<Map<string, Ty>>, fromRet: Mut<Map<string, Ty>>, tvs: string[]): void => {
  for (const [k, v] of [...m]) m.set(k, widen(v));
  for (const n of tvs) {
    const c = m.get(n) ?? fromRet.get(n);
    m.set(n, c ? (m.has(n) ? widen(c) : c) : UNKNOWN);
  }
};
export const arityC = (errC) => (C: Ctls, e: CallExpression, sig: Fn): void => {
  const n = e.arguments.length, required = sig.ps.filter((p) => !p.opt).length;
  if (n < required) errC(C, e, "arity", `expected at least ${required} arguments, got ${n}`);
  if (n > sig.ps.length && !sig.rest) errC(C, e, "arity", `expected at most ${sig.ps.length} arguments, got ${n}`);
};
export const applyC = (regView, arityC, applyArgC, solveC, expectC, subst, instantiate, hasTv, settled) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: CallExpression, sig0: Fn, expected: Ty | undefined): Ty => {
  const inst = instantiate(sig0, C.fresh);
  const sig = inst.f, tvs = inst.tvs, tvSet = new Set(tvs);
  C.fresh += sig0.tps.length;
  arityC(C, e, sig);
  const paramAt = (i: number): Ty | undefined => sig.ps[i]?.t ?? sig.rest;
  const m: Mut<Map<string, Ty>> = mut(new Map()), fromRet: Mut<Map<string, Ty>> = mut(new Map());
  if (expected && hasTv(sig.ret, tvSet)) regView.unify(sig.ret, expected, fromRet, tvSet);
  const argT: Mut<(Ty | undefined)[]> = mut([]);
  for (const [i, a] of e.arguments.entries()) argT.push(applyArgC(R, T, B, V, C, env, a, paramAt(i), sig.ps[i]?.opt ?? false, tvSet, m, fromRet));
  solveC(m, fromRet, tvs);
  for (const [i, a] of e.arguments.entries()) {
    const p = paramAt(i), t = argT[i];
    if (p && t && a.type !== "SpreadElement" && hasTv(p, tvSet)) expectC(C, a, t, subst(p, new Map(m)));
  }
  return settled(subst(sig.ret, new Map(m)));
};
export const conditionalC = (join2, union) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: ConditionalExpression, expected: Ty | undefined): Ty => {
  const c = R.cond(T, B, V, C, env, e.test);
  C.flow = c.t;
  const a = R.check(T, B, V, C, env, e.consequent, expected, false, false);
  C.flow = c.f;
  const b = R.check(T, B, V, C, env, e.alternate, expected, false, false);
  C.flow = join2(c.t, c.f);
  return union([a, b]);
};
export const narrowSidesC = (filter, exclusion, NULL, UNDEF, NEVER) => (TT: Mut<Flow>, FF: Mut<Flow>, k: string, nt: Ty, by: (t: Ty, branch: boolean) => Ty): void => {
  function side(M: Mut<Flow>, br: boolean): void {
    for (const x of [NULL, UNDEF]) if (by(x, br).k === "never") M.set(exclusion(x.k, k), NEVER);
    const noNull = M.has(exclusion("null", k)), noUndef = M.has(exclusion("undef", k));
    M.set(k, filter(by(nt, br), (m) => !(m.k === "null" ? noNull : (m.k === "undef" || m.k === "void") && noUndef)));
  }
  side(TT, true);
  side(FF, false);
};
export const narrowPathC = (pathKeyC, narrowSidesC) => (V: Vars, C: Ctls, env: EnvC, TT: Mut<Flow>, FF: Mut<Flow>, n: Node, nt: Ty | undefined, by: (t: Ty, branch: boolean) => Ty): void => {
  const k = pathKeyC(V, env, n);
  if (k && nt) narrowSidesC(TT, FF, k, nt, by);
};
export const discriminantC = (narrowPathC, narrowByProp) => (T: Types, V: Vars, C: Ctls, env: EnvC, TT: Mut<Flow>, FF: Mut<Flow>, m: Node, can: (pt: Ty, branch: boolean) => boolean): void => {
  if (m.type !== "MemberExpression" || m.computed || m.property.type !== "Identifier") return;
  const name = m.property.name;
  narrowPathC(V, C, env, TT, FF, m.object, T.get(m.object), (ot, branch) => narrowByProp(ot, name, (pt) => can(pt, branch)));
};
export const narrowCompareC = (narrowPathC, discriminantC, narrowTypeof, narrowEq, typeofTest) => (T: Types, V: Vars, C: Ctls, env: EnvC, TT: Mut<Flow>, FF: Mut<Flow>, e: BinaryExpression): void => {
  const pos = e.operator === "===" || e.operator === "==", loose = e.operator.length === 2;
  const tag = typeofTest(e.left, e.right) ?? typeofTest(e.right, e.left);
  if (tag) return narrowPathC(V, C, env, TT, FF, tag.arg, T.get(tag.arg), (pt, br) => narrowTypeof(pt, tag.tag, br === pos));
  const sides: [Node, Node][] = [[e.left, e.right], [e.right, e.left]];
  for (const [a, b] of sides) {
    const bt = T.get(b);
    if (!bt || (bt.k !== "lit" && bt.k !== "null" && bt.k !== "undef")) continue;
    narrowPathC(V, C, env, TT, FF, a, T.get(a), (at, br) => narrowEq(at, bt, br === pos, loose));
    discriminantC(T, V, C, env, TT, FF, a, (pt, br) => narrowEq(pt, bt, br === pos, loose).k !== "never");
    return;
  }
};
export const narrowLeafC = (narrowPathC, discriminantC, narrowCompareC, truthy, falsy) => (T: Types, V: Vars, C: Ctls, env: EnvC, e: Node, t: Ty): Cond => {
  const TT: Mut<Flow> = mut(new Map(C.flow)), FF: Mut<Flow> = mut(new Map(C.flow));
  if (e.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(e.operator)) narrowCompareC(T, V, C, env, TT, FF, e);
  else {
    narrowPathC(V, C, env, TT, FF, e, t, (x, br) => (br ? truthy(x) : falsy(x)));
    discriminantC(T, V, C, env, TT, FF, e, (pt, br) => (br ? truthy(pt) : falsy(pt)).k !== "never");
  }
  return { t: freeze(TT), f: freeze(FF) };
};
export const condC = (narrowLeafC, logicalType, join2, BOOL, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node): Cond => {
  if (e.type === "UnaryExpression" && e.operator === "!") {
    const c = R.cond(T, B, V, C, env, e.argument);
    T.set(e, BOOL);
    return { t: c.f, f: c.t };
  }
  if (e.type === "LogicalExpression" && (e.operator === "&&" || e.operator === "||")) {
    const l = R.cond(T, B, V, C, env, e.left);
    const before = C.flow;
    C.flow = e.operator === "&&" ? l.t : l.f;
    const r = R.cond(T, B, V, C, env, e.right);
    C.flow = before;
    T.set(e, logicalType(e.operator, T.get(e.left) ?? ERR, T.get(e.right) ?? ERR));
    return e.operator === "&&" ? { t: r.t, f: join2(l.f, r.f) } : { t: join2(l.t, r.t), f: r.f };
  }
  const t = R.infer(T, B, V, C, env, e);
  return narrowLeafC(T, V, C, env, e, t);
};
export const orderC = (regView, errC, numericC, nonUndef, show, STR, BIGINT) => (C: Ctls, e: BinaryExpression, a: Ty, b: Ty): void => {
  const na = nonUndef(a), nb = nonUndef(b);
  const dom = [STR, BIGINT].find((d) => regView.sub(na, d) && regView.sub(nb, d));
  if (!dom) { numericC(C, e.left, a); numericC(C, e.right, b); return; }
  const ops: [Node, Ty][] = [[e.left, a], [e.right, b]];
  for (const [x, t] of ops) if (!regView.sub(t, dom)) errC(C, x, "possibly-undefined", `${show(t)} compared with ${e.operator}`);
};
export const binaryC = (regView, errC, unsupC, numericC, orderC, noOverlap, isPrimitive, show, BOOL, STR, NUM, BIGINT, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: BinaryExpression): Ty => {
  const op = e.operator;
  if (op === "instanceof") { unsupC(C, e, "instanceof"); return BOOL; }
  if (op === "in") { unsupC(C, e, "in (cut from the slice)"); return BOOL; }
  const a = R.infer(T, B, V, C, env, e.left), b = R.infer(T, B, V, C, env, e.right);
  if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">="].includes(op)) return ERR;
  switch (op) {
    case "===": case "!==": case "==": case "!=":
      if (!isPrimitive(a) && !isPrimitive(b)) errC(C, e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`);
      else if (noOverlap(a, b)) errC(C, e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`);
      return BOOL;
    case "+":
      if (regView.sub(a, STR) || regView.sub(b, STR)) return STR;
      if (regView.sub(a, BIGINT) && regView.sub(b, BIGINT)) return BIGINT;
      numericC(C, e.left, a); numericC(C, e.right, b);
      return NUM;
    case "<": case ">": case "<=": case ">=": orderC(C, e, a, b); return BOOL;
    default:
      if (regView.sub(a, BIGINT) && regView.sub(b, BIGINT)) return BIGINT;
      numericC(C, e.left, a); numericC(C, e.right, b);
      return NUM;
  }
};
export const unaryC = (regView, numericC, unsupC, lit, BOOL, STR, UNDEF, NUM, BIGINT, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: UnaryExpression): Ty => {
  if (e.operator === "delete") { unsupC(C, e, "delete (cut from the slice)"); return BOOL; }
  if (e.operator === "!") { R.cond(T, B, V, C, env, e.argument); return BOOL; }
  const t = R.infer(T, B, V, C, env, e.argument);
  if (t.k === "err" && e.operator !== "typeof") return ERR;
  const a = e.argument;
  switch (e.operator) {
    case "typeof": return STR;
    case "void": return UNDEF;
    case "-": case "+": case "~":
      if (e.operator === "-" && a.type === "Literal" && typeof a.value === "number") return lit(-a.value);
      if (e.operator !== "+" && regView.sub(t, BIGINT)) return BIGINT;
      if (e.operator !== "+") numericC(C, a, t);
      return NUM;
  }
  unsupC(C, e, `unary ${e.operator}`);
  return ERR;
};
export const stmtsC = (stmtC) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, list: Node[]): boolean => {
  let live = true;
  for (const s of list) {
    if (!live) { const saved = C.flow; stmtC(R, T, B, V, C, { ...env, dead: true }, s); C.flow = saved; continue; }
    live = stmtC(R, T, B, V, C, env, s);
  }
  return live;
};
export const blockC = (newScopeC) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, list: Node[]): boolean =>
  R.stmts(T, B, V, C, newScopeC(C, env), list);
export const stmtC = (regView, blockC, varDeclC, errC, unsupC, show, UNDEF) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, s: Node): boolean => {
  switch (s.type) {
    case "BlockStatement": return blockC(R, T, B, V, C, env, s.body);
    case "ExpressionStatement": return R.infer(T, B, V, C, env, s.expression).k !== "never";
    case "VariableDeclaration": for (const d of s.declarations) varDeclC(R, T, B, V, C, env, d, s.kind); return true;
    case "ReturnStatement": {
      const t = s.argument ? R.check(T, B, V, C, env, s.argument, env.retCtx, false, false) : UNDEF;
      if (!s.argument && env.retCtx && !regView.sub(UNDEF, env.retCtx)) errC(C, s, "type", `return without a value from a function returning ${show(env.retCtx)}`);
      C.rets = [...C.rets, t];
      return false;
    }
    default: unsupC(C, s, s.type); return true;
  }
};
export const varDeclC = (declareC, errC, unsupC, widen, ERR) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, d: VariableDeclarator, kind: string): void => {
  const k: BKind = kind === "const" ? "const" : "let";
  const id = d.id, init = d.init;
  if (id.type !== "Identifier") return unsupC(C, d, "destructuring (cut from the slice)");
  if (!init) {
    if (k === "const") errC(C, d, "type", "const without initializer");
    unsupC(C, d, "let without a type or initializer");
    declareC(B, V, C, env, id.name, ERR, k, id);
    return;
  }
  const t = R.check(T, B, V, C, env, init, undefined, false, false);
  declareC(B, V, C, env, id.name, k === "let" ? widen(t) : t, k, id);
};

export const knotC = (inferC, checkC, condC, stmtsC) => {
  const R: RecurC = { infer, check, cond, stmts };
  function infer(T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node): Ty { return inferC(R, T, B, V, C, env, e); }
  function check(T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean): Ty { return checkC(R, T, B, V, C, env, e, expected, soft, ctx); }
  function cond(T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: Node): Cond { return condC(R, T, B, V, C, env, e); }
  function stmts(T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, list: Node[]): boolean { return stmtsC(R, T, B, V, C, env, list); }
  return R;
};
// owns the working tables: made here, written by the method cells, frozen into the output
export const diagsOut = () => (log: DLog | null): Diag[] => {
  const newest: Mut<Diag[]> = mut([]);
  for (let l = log; l; l = l.next) newest.push(l.d);
  return freeze(newest).toReversed();
};
// owns the working tables: made here, written by the method cells, frozen into the output
export const checkerC = (knotC, declareC, newScopeC, diagsOut) => (input: Input): Output => {
  const T: Types = mut(new Map()), B: Bound = mut(new Map()), V: Vars = mut(new Map());
  const C: Ctls = mut({ flow: new Map(), diags: null, rets: [], nextId: 0, nextScope: 0, fresh: 0, quiet: 0 });
  const root: EnvC = { scope: 0, up: null, dead: false, retCtx: undefined };
  for (const g of input.globals) declareC(B, V, C, root, g.name, g.t, g.kind, null);
  const env = newScopeC(C, root);
  for (const p of input.params) declareC(B, V, C, env, p.name, p.t, "param", p.node);
  knotC.stmts(T, B, V, C, env, input.body);
  return { types: freeze(T), diags: diagsOut(C.diags), rets: [...C.rets] };
};
