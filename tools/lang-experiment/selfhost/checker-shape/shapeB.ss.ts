// uses: ast, types, common, tablesB
// Shape B: each state-writing Checker method is its own cell, a pure function of the state: it takes St and
// returns the next St with its result. St holds what the Checker's fields and env.flow held, as immutable tables
// keyed by node, by "<scope>:<name>" and by scope id; the two tables keyed by node are behind the cells of
// tablesB.ss.ts (copied maps) or tablesB2.ss.ts (persistent logs), one of which is linked in front of this file. A method that calls back into the cycle (infer, check, cond,
// stmts) takes R, a record of those four, which the cell knotB ties; no cell takes a cell that takes it.
export type Res = { readonly st: St; readonly t: Ty };
export type CondRes = { readonly st: St; readonly c: Cond };
export type Live = { readonly st: St; readonly live: boolean };
export type RecurB = {
  infer: (st: St, env: Env, e: Node) => Res;
  check: (st: St, env: Env, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean) => Res;
  cond: (st: St, env: Env, e: Node) => CondRes;
  stmts: (st: St, env: Env, list: Node[]) => Live;
};

export const errB = () => (st: St, node: Node, rule: string, msg: string): St => ({ ...st, diags: [...st.diags, { node, rule, msg }] });
export const unsupB = (errB) => (st: St, node: Node, what: string): St => errB(st, node, "unsupported", what);
export const newScopeB = (setIn) => (st: St, p: number): { st: St; scope: number } => {
  const scope = st.nextScope + 1;
  return { st: { ...st, nextScope: scope, parent: setIn(st.parent, scope, p) }, scope };
};
// Scope.get
export const lookupB = () => (st: St, scope0: number, n: string): Binding | undefined => {
  for (let s: number | undefined = scope0; s !== undefined; s = st.parent.get(s)) {
    const b = st.vars.get(`${s}:${n}`);
    if (b) return b;
  }
  return undefined;
};
export const declareB = (setIn, bindB) => (st: St, env: Env, name: string, t: Ty, kind: BKind, node: Node | null): St => {
  const b: Binding = { id: st.nextId + 1, name, t, kind, node };
  const vars = setIn(st.vars, `${env.scope}:${name}`, b);
  const st1: St = { ...st, nextId: b.id, vars };
  return node ? bindB(st1, node, b) : st1;
};
export const pathKeyB = (lookupB, memberPath, isNamed) => {
  function pathKey(st: St, env: Env, n: Node): string | null {
    if (n.type === "Identifier") {
      const b = lookupB(st, env.scope, n.name);
      if (!b || b.kind === "global" || b.kind === "prelude" || isNamed(b.t, "Mut")) return null;
      return "#" + b.id;
    }
    if (n.type === "MemberExpression" && !n.optional) {
      const base = pathKey(st, env, n.object), tail = memberPath(n);
      return base && tail ? base + tail : null;
    }
    return null;
  }
  return pathKey;
};
export const memberMissingB = (errB, unsupB, intrinsicName, show) => (st: St, m: Ty, k: string, at: Node, all: Ty): St => {
  if (m.k === "null" || m.k === "undef" || m.k === "void") return errB(st, at, "possibly-undefined", `property ${k} of a value that may be ${show(all)}`);
  if (m.k === "unknown") return errB(st, at, "no-member", `property ${k} on Js/unknown; narrow it first`);
  const i = intrinsicName(m);
  return i ? unsupB(st, at, `intrinsic member ${i}.${k}`) : errB(st, at, "no-member", `no property ${k} on ${show(m)}`);
};
export const expectB = (regView, errB, nonUndef, members, isNamed, show) => (st: St, at: Node, t: Ty, expected: Ty): St => {
  if (regView.sub(t, expected)) return st;
  const rule = regView.sub(nonUndef(t), expected) ? "possibly-undefined"
    : members(t).some((m) => isNamed(m, "Action")) && !members(expected).some((m) => isNamed(m, "Action")) ? "action-pass" : "type";
  return errB(st, at, rule, `${show(t)} is not assignable to ${show(expected)}`);
};
export const numericB = (regView, errB, nonUndef, filter, show, NUM) => (st: St, at: Node, t: Ty): St => {
  if (t.k === "err" || regView.sub(t, NUM)) return st;
  if (regView.sub(nonUndef(filter(t, (m) => m.k !== "null")), NUM)) return errB(st, at, "possibly-undefined", `${show(t)} used as a number`);
  return errB(st, at, "type", `${show(t)} used as a number`);
};

export const checkB = (check1B) => (R: RecurB, st: St, env: Env, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean): Res => {
  const q = soft || ctx || st.quiet > 0;
  const quiet = q && (e.type === "ObjectExpression" || e.type === "ArrayExpression" || e.type === "ConditionalExpression" || e.type === "LogicalExpression") ? 1 : 0;
  const r = check1B(R, { ...st, quiet }, env, e, expected, soft);
  return { st: { ...r.st, quiet: st.quiet }, t: r.t };
};
export const check1B = (conditionalB, callB, recB, typeOfB, expectB, logicalType, join2, ctxSensitive, ERR) => (R: RecurB, st: St, env: Env, e: Node, expected: Ty | undefined, soft: boolean): Res => {
  if (!expected) return R.infer(st, env, e);
  if (expected.k === "unknown" && !ctxSensitive(e)) return R.infer(st, env, e);
  if (e.type === "ConditionalExpression") { const r = conditionalB(R, st, env, e, expected); return recB(r.st, e, r.t); }
  if (e.type === "LogicalExpression" && e.operator !== "&&") {
    const c = R.cond(st, env, e.left);
    const lt = typeOfB(c.st, e.left) ?? ERR;
    const r = R.check({ ...c.st, flow: e.operator === "||" ? c.c.f : c.st.flow }, env, e.right, expected, false, false);
    return recB({ ...r.st, flow: join2(c.c.t, c.c.f) }, e, logicalType(e.operator, lt, r.t));
  }
  const r = e.type === "CallExpression" ? callB(R, st, env, e, expected) : R.infer(st, env, e);
  const s = recB(r.st, e, r.t).st;
  return { st: soft ? s : expectB(s, e, r.t, expected), t: r.t };
};
export const inferB = (infer1B, recB) => (R: RecurB, st: St, env: Env, e: Node): Res => {
  const r = infer1B(R, { ...st, quiet: 0 }, env, e);
  return recB({ ...r.st, quiet: st.quiet }, e, r.t);
};
export const literalT = (named, lit, NULL) => (e: Literal): Ty => (e.regex ? named("RegExp") : e.value === null ? NULL : lit(e.value));
export const infer1B = (literalT, identB, memberB, callB, unaryB, binaryB, logicalB, conditionalB, unsupB, ERR) => (R: RecurB, st: St, env: Env, e: Node): Res => {
  switch (e.type) {
    case "Literal": return { st, t: literalT(e) };
    case "Identifier": return identB(st, env, e);
    case "MemberExpression": return memberB(R, st, env, e);
    case "CallExpression": return callB(R, st, env, e, undefined);
    case "UnaryExpression": return unaryB(R, st, env, e);
    case "BinaryExpression": return binaryB(R, st, env, e);
    case "LogicalExpression": return logicalB(R, st, env, e);
    case "ConditionalExpression": return conditionalB(R, st, env, e, undefined);
    default: return { st: unsupB(st, e, e.type), t: ERR };
  }
};
export const logicalB = (typeOfB, logicalType, join2, ERR) => (R: RecurB, st: St, env: Env, e: LogicalExpression): Res => {
  const c = R.cond(st, env, e.left);
  const lt = typeOfB(c.st, e.left) ?? ERR;
  const before = c.st.flow;
  const r = R.infer({ ...c.st, flow: e.operator === "&&" ? c.c.t : e.operator === "||" ? c.c.f : before }, env, e.right);
  const flow = join2(e.operator === "&&" ? c.c.f : e.operator === "||" ? c.c.t : before, r.st.flow);
  return { st: { ...r.st, flow }, t: logicalType(e.operator, lt, r.t) };
};
export const identB = (lookupB, errB, bindB, ERR) => (st: St, env: Env, e: Identifier): Res => {
  const b = lookupB(st, env.scope, e.name);
  if (!b) return { st: e.name === "arguments" ? st : errB(st, e, "free-name", `free name ${e.name}`), t: ERR };
  const s = bindB(st, e, b);
  return { st: s, t: b.kind === "prelude" ? b.t : st.flow.get("#" + b.id) ?? b.t };
};
export const memberB = (regView, pathKeyB, memberMissingB, errB, unsupB, collapseArrays, um, union, show, propT, memberless, intrinsicName, ERR) => (R: RecurB, st0: St, env: Env, e: MemberExpression): Res => {
  const o = R.infer(st0, env, e.object);
  let st = o.st;
  const k = pathKeyB(st, env, e);
  const nt = k ? st.flow.get(k) : undefined;
  const prop = e.property;
  if (e.computed || prop.type !== "Identifier") return { st: unsupB(st, e, "computed member (cut from the slice)"), t: ERR };
  const name = prop.name;
  const out: Mut<Ty[]> = mut([]), missing: Mut<Ty[]> = mut([]);
  let bad = false;
  for (const m of um(collapseArrays(o.t))) {
    if (m.k === "err") { bad = true; out.push(ERR); continue; }
    if (memberless(m)) { st = errB(st, e, "type", `${show(m)} has no members`); bad = true; continue; }
    if (regView.expand(m).k === "err") { bad = true; out.push(ERR); continue; }
    const p = regView.member(m, name);
    if (!p) { missing.push(m); bad = true; out.push(ERR); continue; }
    out.push(propT(p));
  }
  const nullish = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
  const kinds = [missing.filter(nullish), missing.filter((m) => m.k === "unknown"), missing.filter((m) => !nullish(m) && m.k !== "unknown" && intrinsicName(m)), missing.filter((m) => !nullish(m) && m.k !== "unknown" && !intrinsicName(m))];
  for (const g of kinds) {
    const g0 = g[0];
    if (g0 !== undefined) st = memberMissingB(st, g.length === 1 || nullish(g0) ? g0 : union(g), name, prop, union(g));
  }
  return { st, t: nt ?? (bad && out.length === 0 ? ERR : union(freeze(out))) };
};
export const bailB = (ERR) => (R: RecurB, st0: St, env: Env, e: CallExpression): Res => {
  let st = st0;
  for (const a of e.arguments) st = R.infer(st, env, a).st;
  return { st, t: ERR };
};
export const callB = (regView, applyB, bailB, errB, um, show, ERR) => (R: RecurB, st0: St, env: Env, e: CallExpression, expected: Ty | undefined): Res => {
  const c = R.infer(st0, env, e.callee);
  const st = c.st;
  if (c.t.k === "err") return bailB(R, st, env, e);
  const ms = um(c.t), m0 = ms[0];
  if (ms.length !== 1 || m0 === undefined) return bailB(R, errB(st, e, "type", `call of ${show(c.t)}`), env, e);
  const sigs = regView.callSigs(m0);
  if (!sigs.length) return bailB(R, errB(st, e, m0.k === "null" || m0.k === "undef" ? "possibly-undefined" : "type", m0.k === "null" || m0.k === "undef" ? `call of a value that may be ${show(m0)}` : `${show(m0)} is not callable`), env, e);
  // overloads: the first that adds no diagnostic; a failed try keeps its recorded types and counters, as the original did
  let r: Res = { st, t: ERR };
  for (const [i, sig] of sigs.entries()) {
    r = applyB(R, r.st, env, e, sig, expected);
    if (r.st.diags.length === st.diags.length || i === sigs.length - 1) return r;
    r = { st: { ...r.st, diags: st.diags, flow: st.flow }, t: r.t };
  }
  return r;
};
// one argument checked against its parameter; a parameter with type variables of the call adds to the substitution m
export const applyArgB = (regView, unsupB, union, subst, hasTv, ctxOnly, ERR, UNDEF) => (R: RecurB, st: St, env: Env, a: Node, p: Ty | undefined, opt: boolean, tvSet: Set<string>, m: Mut<Map<string, Ty>>, fromRet: Mut<Map<string, Ty>>): { st: St; t: Ty | undefined } => {
  if (a.type === "SpreadElement") return { st: unsupB(st, a, "spread argument (cut from the slice)"), t: ERR };
  if (!p) return { st: R.infer(st, env, a).st, t: undefined };
  const pc = subst(p, new Map(m));
  if (!hasTv(pc, tvSet)) return R.check(st, env, a, opt ? union([pc, UNDEF]) : pc, false, false);
  const cm: Mut<Map<string, Ty>> = mut(new Map(m));
  for (const [k, v] of fromRet) if (!cm.has(k)) cm.set(k, v);
  const r = R.check(st, env, a, ctxOnly(subst(p, freeze(cm)), tvSet), true, false);
  regView.unify(p, r.t, m, tvSet);
  return r;
};
// what each of the call's type variables is solved to, once every argument was seen
export const solveB = (widen, UNKNOWN) => (m: Mut<Map<string, Ty>>, fromRet: Mut<Map<string, Ty>>, tvs: string[]): void => {
  for (const [k, v] of [...m]) m.set(k, widen(v));
  for (const n of tvs) {
    const c = m.get(n) ?? fromRet.get(n);
    m.set(n, c ? (m.has(n) ? widen(c) : c) : UNKNOWN);
  }
};
export const arityB = (errB) => (st: St, e: CallExpression, sig: Fn): St => {
  const n = e.arguments.length, required = sig.ps.filter((p) => !p.opt).length;
  const st1 = n < required ? errB(st, e, "arity", `expected at least ${required} arguments, got ${n}`) : st;
  return n > sig.ps.length && !sig.rest ? errB(st1, e, "arity", `expected at most ${sig.ps.length} arguments, got ${n}`) : st1;
};
export const applyB = (regView, arityB, applyArgB, solveB, expectB, subst, instantiate, hasTv, settled) => (R: RecurB, st0: St, env: Env, e: CallExpression, sig0: Fn, expected: Ty | undefined): Res => {
  const inst = instantiate(sig0, st0.fresh);
  const sig = inst.f, tvs = inst.tvs, tvSet = new Set(tvs);
  let st = arityB({ ...st0, fresh: st0.fresh + sig0.tps.length }, e, sig);
  const paramAt = (i: number): Ty | undefined => sig.ps[i]?.t ?? sig.rest;
  const m: Mut<Map<string, Ty>> = mut(new Map()), fromRet: Mut<Map<string, Ty>> = mut(new Map());
  if (expected && hasTv(sig.ret, tvSet)) regView.unify(sig.ret, expected, fromRet, tvSet);
  const argT: Mut<(Ty | undefined)[]> = mut([]);
  for (const [i, a] of e.arguments.entries()) {
    const r = applyArgB(R, st, env, a, paramAt(i), sig.ps[i]?.opt ?? false, tvSet, m, fromRet);
    st = r.st;
    argT.push(r.t);
  }
  solveB(m, fromRet, tvs);
  for (const [i, a] of e.arguments.entries()) {
    const p = paramAt(i), t = argT[i];
    if (p && t && a.type !== "SpreadElement" && hasTv(p, tvSet)) st = expectB(st, a, t, subst(p, new Map(m)));
  }
  return { st, t: settled(subst(sig.ret, new Map(m))) };
};
export const conditionalB = (join2, union) => (R: RecurB, st: St, env: Env, e: ConditionalExpression, expected: Ty | undefined): Res => {
  const c = R.cond(st, env, e.test);
  const a = R.check({ ...c.st, flow: c.c.t }, env, e.consequent, expected, false, false);
  const b = R.check({ ...a.st, flow: c.c.f }, env, e.alternate, expected, false, false);
  return { st: { ...b.st, flow: join2(c.c.t, c.c.f) }, t: union([a.t, b.t]) };
};
// cond's narrowing of one path key on both branches; was a closure over the two working flows
export const narrowSides = (filter, exclusion, NULL, UNDEF, NEVER) => (T: Mut<Flow>, F: Mut<Flow>, k: string, nt: Ty, by: (t: Ty, branch: boolean) => Ty): void => {
  function side(M: Mut<Flow>, br: boolean): void {
    for (const x of [NULL, UNDEF]) if (by(x, br).k === "never") M.set(exclusion(x.k, k), NEVER);
    const noNull = M.has(exclusion("null", k)), noUndef = M.has(exclusion("undef", k));
    M.set(k, filter(by(nt, br), (m) => !(m.k === "null" ? noNull : (m.k === "undef" || m.k === "void") && noUndef)));
  }
  side(T, true);
  side(F, false);
};
// one path narrowed on both branches, when it is a path and its type is known
export const narrowPathB = (pathKeyB, narrowSides) => (st: St, env: Env, T: Mut<Flow>, F: Mut<Flow>, n: Node, nt: Ty | undefined, by: (t: Ty, branch: boolean) => Ty): void => {
  const k = pathKeyB(st, env, n);
  if (k && nt) narrowSides(T, F, k, nt, by);
};
// P.f's test also narrows P to the members whose f can pass it
export const discriminantB = (narrowPathB, typeOfB, narrowByProp) => (st: St, env: Env, T: Mut<Flow>, F: Mut<Flow>, m: Node, can: (pt: Ty, branch: boolean) => boolean): void => {
  if (m.type !== "MemberExpression" || m.computed || m.property.type !== "Identifier") return;
  const name = m.property.name;
  narrowPathB(st, env, T, F, m.object, typeOfB(st, m.object), (ot, branch) => narrowByProp(ot, name, (pt) => can(pt, branch)));
};
// a === / !== test: typeof x against a string, or a side against a literal, null or undefined
export const narrowCompareB = (narrowPathB, discriminantB, typeOfB, narrowTypeof, narrowEq, typeofTest) => (st: St, env: Env, T: Mut<Flow>, F: Mut<Flow>, e: BinaryExpression): void => {
  const pos = e.operator === "===" || e.operator === "==", loose = e.operator.length === 2;
  const tag = typeofTest(e.left, e.right) ?? typeofTest(e.right, e.left);
  if (tag) return narrowPathB(st, env, T, F, tag.arg, typeOfB(st, tag.arg), (pt, br) => narrowTypeof(pt, tag.tag, br === pos));
  const sides: [Node, Node][] = [[e.left, e.right], [e.right, e.left]];
  for (const [a, b] of sides) {
    const bt = typeOfB(st, b);
    if (!bt || (bt.k !== "lit" && bt.k !== "null" && bt.k !== "undef")) continue;
    narrowPathB(st, env, T, F, a, typeOfB(st, a), (at, br) => narrowEq(at, bt, br === pos, loose));
    discriminantB(st, env, T, F, a, (pt, br) => narrowEq(pt, bt, br === pos, loose).k !== "never");
    return;
  }
};
// a test that is not !, && or ||: the flows on its true and false branches, from the flow after it
export const narrowLeafB = (narrowPathB, discriminantB, narrowCompareB, truthy, falsy) => (st: St, env: Env, e: Node, t: Ty): Cond => {
  const T: Mut<Flow> = mut(new Map(st.flow)), F: Mut<Flow> = mut(new Map(st.flow));
  if (e.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(e.operator)) narrowCompareB(st, env, T, F, e);
  else {
    narrowPathB(st, env, T, F, e, t, (x, br) => (br ? truthy(x) : falsy(x)));
    discriminantB(st, env, T, F, e, (pt, br) => (br ? truthy(pt) : falsy(pt)).k !== "never");
  }
  return { t: freeze(T), f: freeze(F) };
};
export const condB = (narrowLeafB, recB, typeOfB, logicalType, join2, BOOL, ERR) => (R: RecurB, st0: St, env: Env, e: Node): CondRes => {
  if (e.type === "UnaryExpression" && e.operator === "!") {
    const c = R.cond(st0, env, e.argument);
    return { st: recB(c.st, e, BOOL).st, c: { t: c.c.f, f: c.c.t } };
  }
  if (e.type === "LogicalExpression" && (e.operator === "&&" || e.operator === "||")) {
    const l = R.cond(st0, env, e.left);
    const r = R.cond({ ...l.st, flow: e.operator === "&&" ? l.c.t : l.c.f }, env, e.right);
    const st = recB({ ...r.st, flow: l.st.flow }, e, logicalType(e.operator, typeOfB(r.st, e.left) ?? ERR, typeOfB(r.st, e.right) ?? ERR)).st;
    return { st, c: e.operator === "&&" ? { t: r.c.t, f: join2(l.c.f, r.c.f) } : { t: join2(l.c.t, r.c.t), f: r.c.f } };
  }
  const { st, t } = R.infer(st0, env, e);
  return { st, c: narrowLeafB(st, env, e, t) };
};
// < > <= >=: strings or bigints compare as themselves, anything else as numbers
export const orderB = (regView, errB, numericB, nonUndef, show, STR, BIGINT) => (st: St, e: BinaryExpression, a: Ty, b: Ty): St => {
  const na = nonUndef(a), nb = nonUndef(b);
  const dom = [STR, BIGINT].find((d) => regView.sub(na, d) && regView.sub(nb, d));
  if (!dom) return numericB(numericB(st, e.left, a), e.right, b);
  let s = st;
  const ops: [Node, Ty][] = [[e.left, a], [e.right, b]];
  for (const [x, t] of ops) if (!regView.sub(t, dom)) s = errB(s, x, "possibly-undefined", `${show(t)} compared with ${e.operator}`);
  return s;
};
export const binaryB = (regView, errB, unsupB, numericB, orderB, noOverlap, isPrimitive, show, BOOL, STR, NUM, BIGINT, ERR) => (R: RecurB, st0: St, env: Env, e: BinaryExpression): Res => {
  const op = e.operator;
  if (op === "instanceof" || op === "in") return { st: unsupB(st0, e, op === "in" ? "in (cut from the slice)" : "instanceof"), t: BOOL };
  const ra = R.infer(st0, env, e.left), rb = R.infer(ra.st, env, e.right);
  const a = ra.t, b = rb.t, st = rb.st;
  if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">="].includes(op)) return { st, t: ERR };
  const both = (s: St): St => numericB(numericB(s, e.left, a), e.right, b);
  switch (op) {
    case "===": case "!==": case "==": case "!=":
      if (!isPrimitive(a) && !isPrimitive(b)) return { st: errB(st, e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`), t: BOOL };
      if (noOverlap(a, b)) return { st: errB(st, e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`), t: BOOL };
      return { st, t: BOOL };
    case "+":
      if (regView.sub(a, STR) || regView.sub(b, STR)) return { st, t: STR };
      if (regView.sub(a, BIGINT) && regView.sub(b, BIGINT)) return { st, t: BIGINT };
      return { st: both(st), t: NUM };
    case "<": case ">": case "<=": case ">=": return { st: orderB(st, e, a, b), t: BOOL };
    default:
      if (regView.sub(a, BIGINT) && regView.sub(b, BIGINT)) return { st, t: BIGINT };
      return { st: both(st), t: NUM };
  }
};
export const unaryB = (regView, numericB, unsupB, lit, BOOL, STR, UNDEF, NUM, BIGINT, ERR) => (R: RecurB, st0: St, env: Env, e: UnaryExpression): Res => {
  if (e.operator === "delete") return { st: unsupB(st0, e, "delete (cut from the slice)"), t: BOOL };
  if (e.operator === "!") return { st: R.cond(st0, env, e.argument).st, t: BOOL };
  const { st, t } = R.infer(st0, env, e.argument);
  if (t.k === "err" && e.operator !== "typeof") return { st, t: ERR };
  const a = e.argument;
  switch (e.operator) {
    case "typeof": return { st, t: STR };
    case "void": return { st, t: UNDEF };
    case "-": case "+": case "~":
      if (e.operator === "-" && a.type === "Literal" && typeof a.value === "number") return { st, t: lit(-a.value) };
      if (e.operator !== "+" && regView.sub(t, BIGINT)) return { st, t: BIGINT };
      return { st: e.operator !== "+" ? numericB(st, a, t) : st, t: NUM };
  }
  return { st: unsupB(st, e, `unary ${e.operator}`), t: ERR };
};
export const stmtsB = (stmtB) => (R: RecurB, st0: St, env: Env, list: Node[]): Live => {
  let live = true, st = st0;
  for (const s of list) {
    if (!live) { st = { ...stmtB(R, st, { ...env, dead: true }, s).st, flow: st.flow }; continue; }
    const r = stmtB(R, st, env, s);
    st = r.st;
    live = r.live;
  }
  return { st, live };
};
export const blockB = (newScopeB) => (R: RecurB, st: St, env: Env, list: Node[]): Live => {
  const s = newScopeB(st, env.scope);
  return R.stmts(s.st, { ...env, scope: s.scope }, list);
};
export const stmtB = (regView, blockB, varDeclB, errB, unsupB, show, UNDEF) => (R: RecurB, st: St, env: Env, s: Node): Live => {
  switch (s.type) {
    case "BlockStatement": return blockB(R, st, env, s.body);
    case "ExpressionStatement": { const r = R.infer(st, env, s.expression); return { st: r.st, live: r.t.k !== "never" }; }
    case "VariableDeclaration": {
      let st1 = st;
      for (const d of s.declarations) st1 = varDeclB(R, st1, env, d, s.kind);
      return { st: st1, live: true };
    }
    case "ReturnStatement": {
      const r = s.argument ? R.check(st, env, s.argument, env.retCtx, false, false) : { st, t: UNDEF };
      const st1 = !s.argument && env.retCtx && !regView.sub(UNDEF, env.retCtx) ? errB(r.st, s, "type", `return without a value from a function returning ${show(env.retCtx)}`) : r.st;
      return { st: { ...st1, rets: [...st1.rets, r.t] }, live: false };
    }
    default: return { st: unsupB(st, s, s.type), live: true };
  }
};
export const varDeclB = (declareB, errB, unsupB, widen, ERR) => (R: RecurB, st: St, env: Env, d: VariableDeclarator, kind: string): St => {
  const k: BKind = kind === "const" ? "const" : "let";
  const id = d.id, init = d.init;
  if (id.type !== "Identifier") return unsupB(st, d, "destructuring (cut from the slice)");
  if (!init) {
    const st1 = k === "const" ? errB(st, d, "type", "const without initializer") : st;
    return declareB(unsupB(st1, d, "let without a type or initializer"), env, id.name, ERR, k, id);
  }
  const r = R.check(st, env, init, undefined, false, false);
  return declareB(r.st, env, id.name, k === "let" ? widen(r.t) : r.t, k, id);
};

// the knot: the record first, then the functions it holds (hoisted), each giving its cell the record
export const knotB = (inferB, checkB, condB, stmtsB) => {
  const R: RecurB = { infer, check, cond, stmts };
  function infer(st: St, env: Env, e: Node): Res { return inferB(R, st, env, e); }
  function check(st: St, env: Env, e: Node, expected: Ty | undefined, soft: boolean, ctx: boolean): Res { return checkB(R, st, env, e, expected, soft, ctx); }
  function cond(st: St, env: Env, e: Node): CondRes { return condB(R, st, env, e); }
  function stmts(st: St, env: Env, list: Node[]): Live { return stmtsB(R, st, env, list); }
  return R;
};
export const checkerB = (knotB, declareB, newScopeB, emptyB, typesOutB) => (input: Input): Output => {
  let st = emptyB;
  for (const g of input.globals) st = declareB(st, { scope: 0, dead: false, retCtx: undefined }, g.name, g.t, g.kind, null);
  const s = newScopeB(st, 0);
  const env: Env = { scope: s.scope, dead: false, retCtx: undefined };
  st = s.st;
  for (const p of input.params) st = declareB(st, env, p.name, p.t, "param", p.node);
  const out = knotB.stmts(st, env, input.body).st;
  return { types: typesOutB(out), diags: [...out.diags], rets: [...out.rets] };
};
