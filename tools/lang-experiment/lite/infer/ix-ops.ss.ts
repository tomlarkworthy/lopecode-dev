// Operators and assignments (lite/infer.ts unary, binary, the logical and conditional cases, assign, lvalue).

export const ixInferOp = (ixUnary, ixBinary, ixUpdateExpr, ixLogical, ixConditional, ixAssign) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode): Ty | null => {
  switch (e.type) {
    case "UnaryExpression": return ixUnary(K, T, V, W, C, env, e);
    case "UpdateExpression": return ixUpdateExpr(K, T, V, W, C, env, e);
    case "BinaryExpression": return ixBinary(K, T, V, W, C, env, e);
    case "LogicalExpression": return ixLogical(K, T, V, W, C, env, e);
    case "ConditionalExpression": return ixConditional(K, T, V, W, C, env, e, null);
    case "AssignmentExpression": return ixAssign(K, T, V, W, C, env, e);
    default: return null;
  }
};
// As TypeScript: when the left operand decides the result on every value, the right one adds nothing
export const ixLogicalType = (ixTruthy, ixFalsy, ixNonNullish, ixUm, union) => (R: IxRegCore, op: string, lt: Ty, rt: Ty): Ty => {
  if (op === "&&") return ixTruthy(R, lt).k === "never" ? lt : union([ixFalsy(R, lt), rt]);
  if (op === "||") return ixFalsy(R, lt).k === "never" ? lt : union([ixTruthy(R, lt), rt]);
  return ixUm(R, lt).some((m) => ["null", "undef", "void", "unknown", "tv", "err"].includes(m.k)) ? union([ixNonNullish(R, lt), rt]) : lt;
};
export const ixLogical = (ixLogicalType, ixCopyFlow, ixJoin2, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: LogicalExpression): Ty => {
  const c = K.cond(K, T, V, W, C, env, e.left);
  const own = C.cur, lt = T.get(e.left.nid) ?? ERR;
  C.cur = e.operator === "&&" ? c.t : e.operator === "||" ? c.f : ixCopyFlow(W, C, own);
  const rt = K.infer(K, T, V, W, C, env, e.right);
  C.cur = ixJoin2(W, C, e.operator === "&&" ? c.f : e.operator === "||" ? c.t : own, C.cur);
  return ixLogicalType(K.reg, e.operator, lt, rt);
};
// check1's || and ??: the right side against the expected type, in the flow where it runs, and the part of the left
// side that can be the result (its truthy part, or its non-nullish part)
export const ixCheckLogical = (ixLogicalType, ixExpect, ixCopyFlow, ixJoin2, ERR, NEVER) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: LogicalExpression, expected: Ty, soft: boolean, q: boolean): Ty => {
  const c = K.cond(K, T, V, W, C, env, e.left);
  const lt = T.get(e.left.nid) ?? ERR, kept = ixLogicalType(K.reg, e.operator, lt, NEVER);
  if (!soft && kept.k !== "never") ixExpect(K, C, e.left, kept, expected, q);
  C.cur = e.operator === "||" ? c.f : ixCopyFlow(W, C, C.cur);
  const r = K.check(K, T, V, W, C, env, e.right, expected, false, false);
  C.cur = ixJoin2(W, C, c.t, c.f);
  return ixLogicalType(K.reg, e.operator, lt, r);
};
export const ixConditional = (ixJoin2, union) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: ConditionalExpression, expected: Ty | null): Ty => {
  const c = K.cond(K, T, V, W, C, env, e.test);
  C.cur = c.t;
  const a = K.check(K, T, V, W, C, env, e.consequent, expected, false, false);
  C.cur = c.f;
  const b = K.check(K, T, V, W, C, env, e.alternate, expected, false, false);
  C.cur = ixJoin2(W, C, c.t, c.f);
  return union([a, b]);
};
export const ixNumeric = (ixErr, ixNonUndef, ixFilter, show, NUM) => (K: IxK, C: IxCtls, at: AstNode, t: Ty): boolean => {
  if (t.k === "err" || K.reg.sub(t, NUM)) return true;
  if (K.reg.sub(ixNonUndef(K.reg, ixFilter(K.reg, t, (m) => m.k !== "null")), NUM)) ixErr(K, C, at, "possibly-undefined", `${show(t)} used as a number`);
  else ixErr(K, C, at, "type", `${show(t)} used as a number`);
  return false;
};
export const ixUnary = (ixNumeric, ixUnsup, ixErr, isNamed, lit, BOOL, STR, UNDEF, NUM, BIGINT, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: UnaryExpression): Ty => {
  const a = e.argument;
  if (e.operator === "delete") {
    if (a.type !== "MemberExpression") { ixErr(K, C, e, "no-delete", "delete"); return BOOL; }
    const ot = K.infer(K, T, V, W, C, env, a.object);
    if (!isNamed(ot, "Mut")) ixErr(K, C, e, "no-delete", "delete on a value that is not Mut");
    else K.infer(K, T, V, W, C, env, a);
    return BOOL;
  }
  if (e.operator === "!") { K.cond(K, T, V, W, C, env, a); return BOOL; }
  const t = K.infer(K, T, V, W, C, env, a);
  if (t.k === "err" && e.operator !== "typeof") return ERR;
  switch (e.operator) {
    case "typeof": return STR;
    case "void": return UNDEF;
    case "-": case "+": case "~":
      if (e.operator === "-" && a.type === "Literal" && typeof a.value === "number") return lit(-a.value);
      if (e.operator !== "+" && K.reg.sub(t, BIGINT)) return BIGINT;
      if (e.operator !== "+") ixNumeric(K, C, a, t);
      return NUM;
  }
  ixUnsup(K, C, e, `unary ${e.operator}`);
  return ERR;
};
export const ixUpdateExpr = (ixLvalue, ixLookup, ixDropRoot, ixErr, show, NUM) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: UpdateExpression): Ty => {
  const t = ixLvalue(K, T, V, W, C, env, e.argument, e);
  const a = e.argument;
  if (a.type === "Identifier") { const b = ixLookup(V, env, a.name); if (b) ixDropRoot(W, C.cur, b); }
  if (t.k !== "err" && !K.reg.sub(t, NUM)) ixErr(K, C, e, "type", `${e.operator} on ${show(t)}`);
  return NUM;
};
// TypeScript's "no overlap" comparison error, for operands that are unions of primitives only
export const ixNoOverlap = (ixUm) => (R: IxRegCore, a: Ty, b: Ty): boolean => {
  const prim = (m: Ty) => ["num", "str", "bigint", "null", "undef", "void", "lit"].includes(m.k);
  const ma = ixUm(R, a).map((m) => R.expand(m)), mb = ixUm(R, b).map((m) => R.expand(m));
  if (!ma.every(prim) || !mb.every(prim)) return false;
  const nul = (m: Ty) => m.k === "null" || m.k === "undef" || m.k === "void";
  if (ma.some(nul) || mb.some(nul)) return false;
  return !ma.some((x) => mb.some((y) => R.sub(x, y) || R.sub(y, x)));
};
export const ixOrder = (ixErr, ixNumeric, ixNonUndef, show, STR, BIGINT) => (K: IxK, C: IxCtls, e: BinaryExpression, a: Ty, b: Ty): void => {
  const na = ixNonUndef(K.reg, a), nb = ixNonUndef(K.reg, b);
  const dom = [STR, BIGINT].find((d) => K.reg.sub(na, d) && K.reg.sub(nb, d));
  if (!dom) { ixNumeric(K, C, e.left, a); ixNumeric(K, C, e.right, b); return; }
  const sides: [AstNode, Ty][] = [[e.left, a], [e.right, b]];
  for (const [x, t] of sides) if (!K.reg.sub(t, dom)) ixErr(K, C, x, "possibly-undefined", `${show(t)} compared with ${e.operator}`);
};
export const ixInOp = (ixErr, ixUm, isPrimitive, show, STR) => (K: IxK, C: IxCtls, e: BinaryExpression, a: Ty, b: Ty): void => {
  if (!K.reg.sub(a, STR)) ixErr(K, C, e.left, "type", `in with a ${show(a)} key`);
  for (const m of ixUm(K.reg, b)) {
    if (m.k === "unknown" || m.k === "tv") { ixErr(K, C, e.right, "type", `in on ${show(m)}, which may be a primitive; narrow it with typeof first`); return; }
    if (isPrimitive(m) && m.k !== "err") { ixErr(K, C, e.right, m.k === "null" || m.k === "undef" ? "possibly-undefined" : "type", `in on a value that may be ${show(m)}`); return; }
  }
};
export const ixBinary = (ixErr, ixUnsup, ixNumeric, ixOrder, ixInOp, ixNoOverlap, ixUm, isPrimitive, show, BOOL, STR, NUM, BIGINT, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: BinaryExpression): Ty => {
  const op = e.operator;
  if (op === "instanceof") { ixUnsup(K, C, e, "instanceof"); return BOOL; }
  const a = K.infer(K, T, V, W, C, env, e.left), b = K.infer(K, T, V, W, C, env, e.right);
  if ((a.k === "err" || b.k === "err") && !["===", "!==", "==", "!=", "<", ">", "<=", ">=", "in"].includes(op)) return ERR;
  switch (op) {
    case "===": case "!==": case "==": case "!=":
      if (!ixUm(K.reg, a).every((m) => isPrimitive(m)) && !ixUm(K.reg, b).every((m) => isPrimitive(m))) ixErr(K, C, e, "strict-eq-object", `${op} on two non-primitive operands; use equals(a, b)`);
      else if (ixNoOverlap(K.reg, a, b)) ixErr(K, C, e, "type", `${op} between ${show(a)} and ${show(b)}, which have no value in common`);
      return BOOL;
    case "+":
      if (K.reg.sub(a, STR) || K.reg.sub(b, STR)) return STR;
      if (K.reg.sub(a, BIGINT) && K.reg.sub(b, BIGINT)) return BIGINT;
      ixNumeric(K, C, e.left, a); ixNumeric(K, C, e.right, b);
      return NUM;
    case "<": case ">": case "<=": case ">=": ixOrder(K, C, e, a, b); return BOOL;
    case "in": ixInOp(K, C, e, a, b); return BOOL;
    default:
      if (K.reg.sub(a, BIGINT) && K.reg.sub(b, BIGINT)) return BIGINT;
      ixNumeric(K, C, e.left, a); ixNumeric(K, C, e.right, b);
      return NUM;
  }
};
// a write to obj.x / obj[i] / obj.method(): obj must have type Mut<T>
export const ixWriteRule = (ixErr, isNamed, show) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, obj: AstNode, at: AstNode, rule: string): void => {
  const ot = K.infer(K, T, V, W, C, env, obj);
  if (ot.k === "err" || isNamed(ot, "Mut")) return;
  ixErr(K, C, at, rule, `write to a ${show(ot)}, which is not Mut`);
};
export const ixPropOf = (ixUm, ixMemberless, ixMemberMissing, ixErr, propT, union, show, ERR) => (K: IxK, C: IxCtls, t: Ty, k: string, at: AstNode): Ty => {
  const out: Mut<Ty[]> = [];
  for (const m of ixUm(K.reg, t)) {
    if (m.k === "err") return ERR;
    if (ixMemberless(m)) { ixErr(K, C, at, "type", `${show(m)} has no members`); return ERR; }
    const p = K.reg.member(m, k);
    if (!p) { ixMemberMissing(K, C, m, k, at, m); return ERR; }
    out.push(propT(p));
  }
  return union(out);
};
// an assignment target: its declared type, with the write rules applied
export const ixLvalue = (ixLookup, ixIdent, ixErr, ixUnsup, ixLvalueMember, ixFact, nodeKind, ERR) => {
  function lvalue(K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, t: AstNode, at: AstNode): Ty {
    if (t.type === "Identifier") {
      const b = ixLookup(V, env, t.name);
      if (!b) { ixIdent(K, T, V, W, C, env, t); return ERR; }
      ixFact(C, { k: "bind", at: t.nid, id: b.id });
      if (b.kind !== "let" && b.kind !== "param") { ixErr(K, C, at, "const-assign", `assignment to ${b.kind} ${t.name}`); return ERR; }
      return b.t;
    }
    if (t.type === "MemberExpression") return ixLvalueMember(K, T, V, W, C, env, t, at);
    if (t.type === "ArrayPattern" || t.type === "ObjectPattern") {
      const parts = t.type === "ArrayPattern" ? t.elements : t.properties.map((p) => (p.type === "Property" ? p.value : p));
      for (const p of parts) if (p !== null) lvalue(K, T, V, W, C, env, p.type === "AssignmentPattern" ? p.left : p, at);
      ixUnsup(K, C, t, "destructuring assignment");
      return ERR;
    }
    ixUnsup(K, C, t, `assignment target ${nodeKind(t)}`);
    return ERR;
  }
  return lvalue;
};
export const ixLvalueMember = (ixWriteRule, ixIndex, ixPropOf, ixGap, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, t: MemberExpression, at: AstNode): Ty => {
  ixWriteRule(K, T, V, W, C, env, t.object, at, "member-write");
  const ot = T.get(t.object.nid) ?? ERR, p = t.property;
  let r: Ty;
  if (t.computed && !(p.type === "Literal" && typeof p.value === "string")) r = ixIndex(K, C, ot, K.infer(K, T, V, W, C, env, p), t, false);
  else if (p.type === "Literal") r = ixPropOf(K, C, ot, String(p.value), p);
  else if (p.type === "Identifier") r = ixPropOf(K, C, ot, p.name, p);
  else r = ixGap(C, "assignment to a member that is not named");
  T.set(t.nid, r);
  return r;
};
export const ixCompound = (ixUnsup, ixNumeric, STR, NUM, ERR) => (K: IxK, C: IxCtls, e: AssignmentExpression, cur: Ty, r: Ty): Ty => {
  const op = e.operator.slice(0, -1);
  if (op === "+" && (K.reg.sub(cur, STR) || K.reg.sub(r, STR))) return STR;
  if (op === "&&" || op === "||" || op === "??") { ixUnsup(K, C, e, `logical assignment ${e.operator}`); return ERR; }
  ixNumeric(K, C, e.left, cur); ixNumeric(K, C, e.right, r);
  return NUM;
};
export const ixAssign = (IX_MUTATING_OPS, ixLookup, ixLvalue, ixIdent, ixCompound, ixExpect, ixDropRoot, ixFlowSet, ixUnsup, ERR) => (K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AssignmentExpression): Ty => {
  if (!IX_MUTATING_OPS.has(e.operator)) { ixUnsup(K, C, e, `assignment ${e.operator}`); return ERR; }
  const l = e.left, b = l.type === "Identifier" ? ixLookup(V, env, l.name) : undefined;
  const decl = ixLvalue(K, T, V, W, C, env, l, e);
  let v: Ty;
  if (e.operator === "=") v = K.check(K, T, V, W, C, env, e.right, decl.k === "err" ? null : decl, false, false);
  else {
    const cur = l.type === "Identifier" ? ixIdent(K, T, V, W, C, env, l) : decl;
    v = ixCompound(K, C, e, cur, K.infer(K, T, V, W, C, env, e.right));
    if (decl.k !== "err") ixExpect(K, C, e, v, decl, false);
  }
  if (b && decl.k !== "err") {
    ixDropRoot(W, C.cur, b);
    ixFlowSet(W, C.cur, "#" + b.id, K.reg.sub(v, decl) ? v : decl);
  }
  return v;
};
