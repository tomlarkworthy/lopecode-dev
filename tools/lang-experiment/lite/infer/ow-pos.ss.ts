// Positions: where a Mut, a Borrowed or a view of a Mut buffer may stand (lite/own.ts position and the loops over
// it), and the placement rules of mut, borrow, state, on and read.

export const owPosMember = () => (O: OwCtx, p: MemberExpression, x: AstNode, kind: OwKind): string | null => {
  if (p.object.nid !== x.nid) return "computed key";
  if (kind !== "view") return null;
  const pp = O.T.parent.get(p.nid);
  return pp !== undefined && pp.type === "CallExpression" && pp.callee.nid === p.nid && O.F.memberFlags.get(p.nid)?.mutates ? "write through a view" : null;
};
export const owPosFreeze = (owErr, owEncl) => (O: OwCtx, W: OwW, p: AstNode, x: AstNode, kind: OwKind, b: IxBinding | null): string | null => {
  if (kind !== "mut" || x.type !== "Identifier" || b === null) return "freeze of a non-binding";
  // an alias: reported where it was bound
  if (!b.mutOwned && b.kind !== "param") return null;
  if (!b.mutOwned) { owErr(W, p, "mut-freeze-param", `freeze(${b.name}): only a Mut created by mut() in this function can be frozen, not a Mut parameter`); return null; }
  if (owEncl(O, p).nid !== b.fi) owErr(W, p, "mut-capture", `freeze of captured Mut ${b.name} inside a nested function`);
  return null;
};
export const owPosCall = (owPrelude, owPosFreeze, owArgIndex, owMutParamArg, owNonRetainingArg) => (O: OwCtx, W: OwW, p: CallExpression | NewExpression, x: AstNode, kind: OwKind, b: IxBinding | null): string | null => {
  if (p.callee.nid === x.nid) return "callee";
  const i = owArgIndex(p.arguments, x), pre = owPrelude(O, p);
  if (pre === "freeze") return owPosFreeze(O, W, p, x, kind, b);
  if (pre === "borrow") return kind === "mut" ? null : "borrow of a non-Mut";
  if (pre === "snapshot") return kind === "mut" ? "snapshot of a Mut" : null;
  if (pre === "equals" || pre === "messageOf") return null;
  if (pre) return `argument of ${pre}()`;
  if (kind === "mut" && owMutParamArg(O, p, i)) return null;
  if (owNonRetainingArg(O, p, i)) return null;
  return kind === "mut" ? "argument to a parameter not typed Mut<…>" : "argument to a parameter that may keep it";
};
export const owPosSpread = (owArgIndex, owNonRetainingArg) => (O: OwCtx, p: AstNode): string | null => {
  const pp = O.T.parent.get(p.nid);
  if (pp === undefined) return "spread";
  if (pp.type === "ArrayExpression" || pp.type === "ObjectExpression") return null;
  if (pp.type === "CallExpression" || pp.type === "NewExpression") return owNonRetainingArg(O, pp, owArgIndex(pp.arguments, p)) ? null : "spread into a call that may keep it";
  return "spread";
};
// the positions that need neither the parent's parent nor the kind; undefined for the others
export const owPosPlain = (nodeKind) => (p: AstNode, x: AstNode): string | null | undefined => {
  const is = (n: AstNode | null) => n !== null && n.nid === x.nid;
  switch (p.type) {
    case "ForOfStatement": return is(p.right) ? null : "for...of target";
    case "TemplateLiteral": case "ExpressionStatement": case "UnaryExpression": case "BinaryExpression": return null;
    case "IfStatement": case "WhileStatement": case "DoWhileStatement": case "ForStatement": case "SwitchCase": return is(p.test) ? null : "statement";
    case "SwitchStatement": return is(p.discriminant) ? null : "statement";
    case "VariableDeclarator": return "bound to a second name";
    case "AssignmentExpression": return is(p.right) ? "assigned to a binding" : "assignment target";
    case "ReturnStatement": case "ArrowFunctionExpression": return "returned";
    case "YieldExpression": return "yielded";
    case "AwaitExpression": return "awaited";
    case "ArrayExpression": return "placed in an array literal";
    case "Property": return "placed in an object literal";
    case "ThrowStatement": return "thrown";
    case "JSXExpressionContainer": return "placed in JSX";
    case "MemberExpression": case "CallExpression": case "NewExpression": case "SpreadElement": case "ConditionalExpression": case "LogicalExpression": case "ChainExpression": return undefined;
    default: return nodeKind(p);
  }
};
// Is x (of kind) in an allowed position? A description of the position when it is not
export const owPosition = (owPosPlain, owPosMember, owPosCall, owPosSpread) => {
  function position(O: OwCtx, W: OwW, x: AstNode, kind: OwKind, b: IxBinding | null): string | null {
    const p = O.T.parent.get(x.nid);
    if (p === undefined) return "cell body";
    const plain = owPosPlain(p, x);
    if (plain !== undefined) return plain;
    switch (p.type) {
      case "MemberExpression": return owPosMember(O, p, x, kind);
      case "CallExpression": case "NewExpression": return owPosCall(O, W, p, x, kind, b);
      case "SpreadElement": return owPosSpread(O, p);
      case "ConditionalExpression": return p.test.nid === x.nid ? null : position(O, W, p, kind, null);
      default: return position(O, W, p, kind, null);
    }
  }
  return position;
};
// views of a Mut buffer: a member read flagged view of a Mut (or of such a view), or the call of one
export const owViews = (isNamed) => (O: OwCtx): AstNode[] => {
  const out: Mut<Map<number, AstNode>> = mut(new Map());
  for (const n of O.T.all) {
    if (n.type !== "MemberExpression" || !O.F.memberFlags.get(n.nid)?.view) continue;
    const rt = O.F.types.get(n.object.nid);
    if (rt === undefined || !(isNamed(rt, "Mut") || out.has(n.object.nid))) continue;
    const p = O.T.parent.get(n.nid);
    const v = p !== undefined && p.type === "CallExpression" && p.callee.nid === n.nid ? p : n;
    out.set(v.nid, v);
  }
  return [...out.values()];
};
export const owEscapes = (owPosition, owViews, owPrelude, owIsMut, owIsBor, owErr, isNamed) => (O: OwCtx, W: OwW): void => {
  for (const [id, rs] of O.T.refs) {
    const b = O.F.bindings.get(id);
    const kind = b === undefined ? null : owIsMut(b) ? "mut" : owIsBor(b) ? "borrowed" : null;
    if (b === undefined || kind === null) continue;
    for (const r of rs) {
      const pos = owPosition(O, W, r, kind, b);
      if (pos) owErr(W, r, kind === "mut" ? "mut-escape" : "borrowed-escape", `${kind === "mut" ? "Mut" : "Borrowed"} ${b.name} ${pos}`);
    }
  }
  for (const n of O.T.all) {
    if ((n.type !== "CallExpression" && n.type !== "MemberExpression") || owPrelude(O, n) === "borrow") continue;
    const t = O.F.types.get(n.nid);
    const pos = t !== undefined && isNamed(t, "Borrowed") ? owPosition(O, W, n, "borrowed", null) : null;
    if (pos) owErr(W, n, "borrowed-escape", `a view of a Borrowed, ${pos}`);
  }
  for (const v of owViews(O)) {
    const pos = owPosition(O, W, v, "view", null);
    if (pos) owErr(W, v, "mut-view", `a view aliasing a Mut buffer, ${pos}; consume it immediately as an argument of a non-retaining intrinsic`);
  }
};
