// The placement rules (lite/own.ts ownership, the loop after the positions): on and read only called, mut(...) as
// a local const's fresh initializer, borrow under yield, state(...) and on(...) as the cell's value.

// a name, not a value: a callee, a member's or a key's name, or in a type
export const owNamePlace = (nodeKind) => (O: OwCtx, n: AstNode): boolean => {
  const p = O.T.parent.get(n.nid);
  if (p === undefined) return true;
  if (p.type === "CallExpression") return p.callee.nid === n.nid;
  if (p.type === "MemberExpression") return p.property.nid === n.nid && !p.computed;
  if (p.type === "Property") return p.key.nid === n.nid && !p.computed && !p.shorthand;
  return nodeKind(p).startsWith("TS");
};
export const owOnRead = (owNamePlace, owBindingAt, owErr) => (O: OwCtx, W: OwW, n: AstNode): void => {
  if (n.type !== "Identifier" || (n.name !== "on" && n.name !== "read")) return;
  const b = owBindingAt(O, n);
  if ((b !== undefined && b.kind !== "prelude") || owNamePlace(O, n)) return;
  if (n.name === "on") owErr(W, n, "listener-placement", "on is only called, as the whole value of a cell; it is not a value");
  else owErr(W, n, "read-outside-action", "read is only called, in an action body; it is not a value");
};
// a literal, a spread copy, new on an intrinsic, or an intrinsic marked @fresh
export const owFresh = () => {
  function fresh(O: OwCtx, a: AstNode): boolean {
    switch (a.type) {
      case "ArrayExpression": case "ObjectExpression": return true;
      case "ConditionalExpression": return fresh(O, a.consequent) && fresh(O, a.alternate);
      case "NewExpression": case "CallExpression": {
        const s = O.F.calls.get(a.nid)?.sig ?? null;
        return s !== null && !!s.flags?.intrinsic && !!s.flags.fresh && !s.flags.view;
      }
      default: return false;
    }
  }
  return fresh;
};
export const owMutPlace = (owFresh, owErr) => (O: OwCtx, W: OwW, n: CallExpression): void => {
  const p = O.T.parent.get(n.nid), decl = p === undefined ? undefined : O.T.parent.get(p.nid);
  const bound = p !== undefined && p.type === "VariableDeclarator" && p.init !== null && p.init.nid === n.nid && p.id.type === "Identifier";
  if (!(bound && decl !== undefined && decl.type === "VariableDeclaration" && decl.kind === "const")) owErr(W, n, "mut-bind", "mut(...) must be the initializer of a local const");
  const a = n.arguments[0];
  if (a !== undefined && !owFresh(O, a)) owErr(W, a, "mut-not-fresh", "mut(e) needs a fresh value: a literal, a spread copy, new on an intrinsic, or an intrinsic marked @fresh");
};
// on(...): the cell's whole value, through parentheses and the branches of a conditional
export const owOnWhole = (owEncl) => (O: OwCtx, body: AstNode, n: AstNode): boolean => {
  let cur = n, p = O.T.parent.get(n.nid);
  while (p !== undefined && (p.type === "ParenthesizedExpression" || (p.type === "ConditionalExpression" && p.test.nid !== cur.nid))) { cur = p; p = O.T.parent.get(p.nid); }
  return body.nid === cur.nid || (p !== undefined && p.type === "ReturnStatement" && owEncl(O, p).nid === O.T.fn.nid);
};
export const owCellPlace = (owEncl, owOnWhole, owErr, ixFnParts) => (O: OwCtx, W: OwW, n: AstNode, pre: string): void => {
  const f = ixFnParts(O.T.fn), p = O.T.parent.get(n.nid);
  if (f === null) return;
  if (pre === "borrow") {
    if (!(p !== undefined && p.type === "YieldExpression" && owEncl(O, n).nid === O.T.fn.nid && f.generator)) owErr(W, n, "borrow-placement", "borrow(x) only as the operand of yield in a generator cell");
  } else if (pre === "state") {
    const okRet = p !== undefined && p.type === "ReturnStatement" && O.T.parent.get(p.nid)?.nid === f.body.nid;
    if (!(f.body.nid === n.nid || okRet) || f.async || f.generator) owErr(W, n, "state-placement", "state(...) only as the returned value of a sync, non-generator cell");
  } else if (pre === "on") {
    if (!owOnWhole(O, f.body, n) || f.async || f.generator) owErr(W, n, "listener-placement", "on(...) only as the whole value of a sync, non-generator cell (what it returns, or a branch of a conditional that it returns)");
  }
};
export const owPlacement = (owOnRead, owMutPlace, owCellPlace, owPrelude) => (O: OwCtx, W: OwW): void => {
  for (const n of O.T.all) {
    owOnRead(O, W, n);
    if (n.type !== "CallExpression") continue;
    const pre = owPrelude(O, n);
    if (pre === "mut") owMutPlace(O, W, n);
    else if (pre !== null) owCellPlace(O, W, n, pre);
  }
};
