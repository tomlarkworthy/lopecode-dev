// Owned groups (S4): `const g = mut({ f: mut(fresh), ... })` owns the containers its fields hold, one level. A group is a
// Mut whose record holds a Mut. Its name follows the Mut rules (ow-pos); a field that is or may be a Mut stands where a
// Mut name may (owFieldOf, in owMutSource). Here: a group is not spread, borrowed whole or given to a function other
// than a parameter declared as a group with each owned field Mut<…>, freeze, equals or messageOf; one call is not lent a
// group or a field of it twice; an owned field is not assigned or deleted.

// a group: a Mut whose record (or a member of its union) holds a Mut, through aliases
export const owIsGroup = (owMut, unwrap, isNamed) => (R: IxRegCore, t: Ty): boolean => isNamed(t, "Mut") && owMut(R, unwrap(t)) !== null;
// a group, or a union with a group member (a conditional or a logical expression around one)
export const owGroupTy = (owIsGroup) => (R: IxRegCore, t: Ty | undefined): boolean =>
  t !== undefined && (owIsGroup(R, t) || (t.k === "union" && t.ts.some((m) => owIsGroup(R, m))));
// a Mut, or a union with a Mut member (an optional or nullable field), through aliases
export const owTopMut = (isNamed) => (R: IxRegCore, t: Ty): boolean => {
  const x = R.expand(t);
  return isNamed(x, "Mut") || (x.k === "union" && x.ts.some((m) => isNamed(R.expand(m), "Mut")));
};
// the name a member reads: a dot name or a string literal key; null for any other key
export const owFieldName = () => (n: MemberExpression): string | null =>
  !n.computed && n.property.type === "Identifier" ? n.property.name : n.property.type === "Literal" && typeof n.property.value === "string" ? n.property.value : null;
// o.f is a field that is or may be a Mut: by its recorded type, by f's declared type in o's record (narrowing does not
// change it), or a member of a group with no recorded type (fail closed)
export const owFieldOf = (owTopMut, owGroupTy, owFieldName, ixUm, unwrap) => (O: OwCtx, n: MemberExpression): boolean => {
  const t = O.F.types.get(n.nid), o = O.F.types.get(n.object.nid), k = owFieldName(n);
  if (t !== undefined && owTopMut(O.R, t)) return true;
  if (o === undefined) return false;
  if (t === undefined && owGroupTy(O.R, o)) return true;
  return k !== null && ixUm(O.R, o).some((m) => {
    const r = O.R.expand(unwrap(m)), p = r.k === "rec" ? r.props.get(k) : undefined;
    return p !== undefined && owTopMut(O.R, p.t);
  });
};
// a group lent to a parameter: its declared type (aliases expanded) is a Mut of a record that declares each field the
// group owns Mut<…>, and no field a type variable (a callee would see the field as another type: B4)
export const owGroupParam = (owTopMut, unwrap, isNamed) => (R: IxRegCore, dp: Ty, at: Ty): boolean => {
  if (!isNamed(dp, "Mut") || !isNamed(at, "Mut")) return false;
  const d = R.expand(unwrap(dp)), a = R.expand(unwrap(at));
  if (d.k !== "rec" || a.k !== "rec" || d.index !== undefined) return false;
  for (const p of d.props.values()) if (R.expand(p.t).k === "tv") return false;
  for (const [k, p] of a.props) {
    const q = d.props.get(k);
    if (owTopMut(R, p.t) && (q === undefined || !isNamed(R.expand(q.t), "Mut"))) return false;
  }
  return true;
};
// a group as an argument: lent to a parameter owGroupParam takes, frozen or compared; borrow and every other function
// (Object.values gives the fields back) would not; a call with no resolved signature does not take one
export const owGroupArg = (owPrelude, owArgIndex, owDeclParam, owGroupParam) => (O: OwCtx, p: CallExpression | NewExpression, n: AstNode, at: Ty | undefined): string | null => {
  const i = owArgIndex(p.arguments, n), pre = owPrelude(O, p);
  if (pre === "freeze" || pre === "equals" || pre === "messageOf") return null;
  const dp = pre === null && i >= 0 ? owDeclParam(O, p, i, false) : undefined;
  if (dp !== undefined && at !== undefined && owGroupParam(O.R, dp, at)) return null;
  if (pre === "borrow") return "borrowed whole: a reader could write its fields";
  return "passed where its fields could come back out: a group goes only to a parameter declared as a group whose owned fields are each Mut<…>, or to freeze, equals or messageOf";
};
// a group (by its recorded type, or a name's binding) spread, or given to a function it may not be given to
export const owGroupRef = (owGroupTy, owGroupArg, owBindingAt, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  const p = O.T.parent.get(n.nid), b = n.type === "Identifier" ? owBindingAt(O, n) : undefined, t = O.F.types.get(n.nid);
  if (p === undefined || !(owGroupTy(O.R, t) || (b !== undefined && owGroupTy(O.R, b.t)))) return;
  const what = n.type === "Identifier" ? `group ${n.name}` : "a group";
  if (p.type === "SpreadElement") { owErr(W, n, "mut-escape", `${what} spread: its fields would have a second name`); return; }
  if ((p.type !== "CallExpression" && p.type !== "NewExpression") || p.callee.nid === n.nid) return;
  const why = owGroupArg(O, p, n, b !== undefined ? b.t : t);
  if (why !== null) owErr(W, n, "mut-escape", `${what} ${why}`);
};
// what an argument lends of a group: "<id>" for the group's name (or a field read by a key not known), "<id>.<f>" for
// a field; through conditionals, logicals, chains and spreads
export const owLent = (owBindingAt, owGroupTy, owFieldName) => {
  function lent(O: OwCtx, n: AstNode, out: Mut<string[]>): void {
    if (n.type === "ConditionalExpression") { lent(O, n.consequent, out); lent(O, n.alternate, out); return; }
    if (n.type === "LogicalExpression") { lent(O, n.left, out); lent(O, n.right, out); return; }
    if (n.type === "ChainExpression") { lent(O, n.expression, out); return; }
    if (n.type === "SpreadElement") { lent(O, n.argument, out); return; }
    const g = n.type === "MemberExpression" ? n.object : n;
    const b = g.type === "Identifier" ? owBindingAt(O, g) : undefined;
    if (b === undefined || !(owGroupTy(O.R, b.t) || owGroupTy(O.R, O.F.types.get(g.nid)))) return;
    const k = n.type === "MemberExpression" ? owFieldName(n) : null;
    out.push(k === null ? `${b.id}` : `${b.id}.${k}`);
  }
  return lent;
};
// one call is not lent a group twice, a group and a field of it, or a field twice; a local helper the call names lends
// the groups it captures (one name writes: two parameters, or a parameter and a capture, would name one container)
export const owLendTwice = (owLent, owBindingAt, owErr) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, n: AstNode): void => {
  if (n.type !== "CallExpression" && n.type !== "NewExpression") return;
  const cb = n.callee.type === "Identifier" ? owBindingAt(O, n.callee) : undefined;
  const cap = cb !== undefined && cb.fnNode >= 0 ? caps.get(cb.fnNode) : undefined;
  const held: Mut<string[]> = mut((cap?.mut ?? []).map((id) => `${id}`));
  const clash = (a: string, b: string): boolean => a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);
  for (const a of n.arguments) {
    const ks: Mut<string[]> = mut([]);
    owLent(O, a, ks);
    let twice = false;
    for (const k of ks) for (const h of held) if (clash(k, h)) twice = true;
    if (twice) owErr(W, a, "mut-escape", "a group or its field lent twice in one call (two arguments, or an argument of a helper that captures the group): two names would write one container");
    for (const k of ks) held.push(k);
  }
};
// n is an owned field written: an assignment's target or delete's operand, a field that is or may be a Mut, of a Mut
export const owFieldWritten = (owFieldOf, isNamed) => (O: OwCtx, n: AstNode): boolean => {
  const p = O.T.parent.get(n.nid), o = n.type === "MemberExpression" ? O.F.types.get(n.object.nid) : undefined;
  if (p === undefined || o === undefined || n.type !== "MemberExpression" || !isNamed(o, "Mut") || !owFieldOf(O, n)) return false;
  return (p.type === "AssignmentExpression" && p.left.nid === n.nid) || (p.type === "UnaryExpression" && p.operator === "delete");
};
// an owned field is made once, by the mut(...) in its group's literal: it is not assigned or deleted
export const owFieldAssign = (owFieldWritten, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  if (owFieldWritten(O, n)) owErr(W, n, "mut-field-assign", "an owned field of a group is made once, by mut(...) in the group's literal; it is not assigned or deleted");
};
export const owGroupEscapes = (owGroupRef, owLendTwice, owFieldAssign) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>): void => {
  for (const n of O.T.all) {
    owGroupRef(O, W, n);
    owLendTwice(O, W, caps, n);
    owFieldAssign(O, W, n);
  }
};
