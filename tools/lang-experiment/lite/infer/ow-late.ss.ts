// Rule set R (2026-11-22, the owner's decision): code that runs after a function has given a value may not use what the
// cell can still write. R-Y: in a generator, a Mut-typed local, or a let whose type is not primitive, declared before a
// yield is not used after it ([mut-yield]). R-A: the same across an await, in a function whose values may be seen before
// it ends ([mut-await]). R-K, a function the cell keeps captures no Mut and no let, is in owCaptureErrs. "After" is as
// selfhost/late-code measured it: later in the text, a write whose expression holds the point, or inside a loop around
// the point when the binding is not declared in that loop's body; a call of a function whose captures read the binding
// is a use of it at the call.

// a binding R-Y and R-A follow: a local typed Mut, or a let whose type is not primitive (a cell input, a global, a
// prelude name and a function declaration are not)
export const owLateCand = (isNamed, isPrimitive) => (b: IxBinding): boolean =>
  !b.cellParam && b.kind !== "global" && b.kind !== "prelude" && b.kind !== "fn" && (isNamed(b.t, "Mut") || (b.kind === "let" && !isPrimitive(b.t)));
// g's values may be seen before g ends: g is a generator or a function the cell keeps; or g is nested and its encloser
// is not async (it returns before g ends) or is itself visible. A plain async cell is not visible
export const owVisibleFn = (owEncl, owKept, ixFnParts) => {
  function visible(O: OwCtx, byFn: Map<number, number>, g: AstNode): boolean {
    const fp = ixFnParts(g);
    if (fp !== null && fp.generator) return true;
    if (g.nid === O.T.fn.nid) return false;
    if (owKept(O, byFn, g)) return true;
    const ep = ixFnParts(owEncl(O, g));
    return ep === null || !ep.async || visible(O, byFn, owEncl(O, g));
  }
  return visible;
};
// the points of g after which its values may have been seen: its yields, and its awaits when g is visible
export const owLatePoints = (owEncl, owVisibleFn, ixFnParts) => (O: OwCtx, byFn: Map<number, number>, g: AstNode): AstNode[] => {
  const fp = ixFnParts(g);
  if (fp === null || (!fp.async && !fp.generator)) return [];
  const aw = fp.async && owVisibleFn(O, byFn, g);
  return O.T.all.filter((n) => owEncl(O, n).nid === g.nid && (n.type === "YieldExpression" || (aw && (n.type === "AwaitExpression" || (n.type === "ForOfStatement" && n.await)))));
};
export type OwUse = { readonly at: AstNode; readonly write: boolean };
// b's uses: its references, then each call of a function whose captures read b (write: that function writes b)
export const owUsesOf = (owAssignedRef, owWriteRef, owIsCallee) => (O: OwCtx, caps: Map<number, OwCap>, byFn: Map<number, number>, b: IxBinding): OwUse[] => {
  const direct = (O.T.refs.get(b.id) ?? []).map((r): OwUse => ({ at: r, write: owAssignedRef(O, r) || owWriteRef(O, r) }));
  const calls = [...caps].flatMap(([fnid, c]): OwUse[] => {
    const hid = c.read.includes(b.id) ? byFn.get(fnid) : undefined, hb = hid === undefined ? undefined : O.F.bindings.get(hid);
    if (hb === undefined) return [];
    return (O.T.refs.get(hb.id) ?? []).flatMap((r): OwUse[] => {
      const p = O.T.parent.get(r.nid);
      return p !== undefined && owIsCallee(O, r) ? [{ at: p, write: c.wmut.includes(b.id) || c.let.includes(b.id) }] : [];
    });
  });
  return [...direct, ...calls];
};
// the call, assignment, update or delete a write through r is made by: up through members, patterns and properties
export const owWriteAt = () => (O: OwCtx, r: AstNode): AstNode | null => {
  let cur = r;
  for (let p = O.T.parent.get(cur.nid); p !== undefined; p = O.T.parent.get(cur.nid)) {
    if (p.type === "CallExpression" || p.type === "AssignmentExpression" || p.type === "UpdateExpression" || (p.type === "UnaryExpression" && p.operator === "delete")) return p;
    const up = (p.type === "MemberExpression" && p.object.nid === cur.nid) || p.type === "ArrayPattern" || p.type === "ObjectPattern" || p.type === "Property" || p.type === "AssignmentPattern";
    if (!up) return null;
    cur = p;
  }
  return null;
};
// a loop's body
export const owLoopBody = () => (l: AstNode): AstNode | null => {
  switch (l.type) {
    case "ForStatement": case "ForOfStatement": case "ForInStatement": case "WhileStatement": case "DoWhileStatement": return l.body;
    default: return null;
  }
};
// the loops around n inside g, innermost first (not through a function)
export const owLoopsOut = (isFnNode, owLoopBody) => (O: OwCtx, n: AstNode, g: AstNode): AstNode[] => {
  const out: Mut<AstNode[]> = [];
  for (let p = O.T.parent.get(n.nid); p !== undefined && p.nid !== g.nid && !isFnNode(p); p = O.T.parent.get(p.nid)) if (owLoopBody(p) !== null) out.push(p);
  return out;
};
// a use u of a binding declared at d is after the point p of g: later in the text (a for await's iterable is before it),
// a write whose expression holds p, or in a loop around p whose body does not declare it (captured: d is outside g)
export const owAfter = (owWriteAt, owLoopsOut, owLoopBody) => (O: OwCtx, g: AstNode, d: AstNode, captured: boolean, u: OwUse, p: AstNode): boolean => {
  if (!captured && d.start >= p.start) return false;
  const r = u.at, inside = (a: AstNode, b: AstNode) => a.start >= b.start && a.end <= b.end;
  const right = p.type === "ForOfStatement" ? p.right : null, inRight = right !== null && inside(r, right);
  if (r.start >= (right === null ? p.end : right.end) && !inRight) return true;
  const we = u.write ? owWriteAt(O, r) : null;
  if (we !== null && inside(p, we)) return true;
  const l = [...(right === null ? [] : [p]), ...owLoopsOut(O, p, g)].find((x) => inside(r, x) && !(x.nid === p.nid && inRight));
  const body = l === undefined ? null : owLoopBody(l);
  return l !== undefined && (captured || body === null || !inside(d, body));
};
// what to do instead, by what the binding holds
export const owLateMsg = (show, isNamed, unwrap) => (b: IxBinding, p: AstNode): string => {
  const what = isNamed(b.t, "Mut") ? `Mut ${b.name}` : `let ${b.name} of type ${show(b.t)}`;
  const at = p.type === "YieldExpression" ? "a yield" : "an await in a function whose values may be seen before it ends";
  const w = p.type === "YieldExpression" ? "yield" : "await";
  return `${what} is declared before ${at} and used after it, and the code after it runs once a value has been given; declare it in the loop body that holds the ${w}, or build the value in a helper call (const v = make(k)); to only read it there, bind it under its plain type before the ${w} (const c: ${show(unwrap(b.t))} = ...) and read c${isNamed(b.t, "Mut") ? "" : "; a let of a primitive type may be used across it"}`;
};
// R-Y and R-A over every function of the cell with a point, each binding owLateCand takes, declared in g before a
// point or read by g from an encloser (then only uses inside g count); one report per binding and g, at its first use after
export const owLateUses = (owLatePoints, owLateCand, owUsesOf, owAfter, owLateMsg, owEncl, owErr) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  for (const g of O.T.fns) {
    const ps: AstNode[] = owLatePoints(O, byFn, g);
    if (!ps.length) continue;
    for (const id of O.T.refs.keys()) {
      const b = O.F.bindings.get(id), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
      if (b === undefined || d === undefined || !owLateCand(b)) continue;
      const captured = owEncl(O, d).nid !== g.nid;
      if (captured && !(caps.get(g.nid)?.read ?? []).includes(b.id)) continue;
      for (const u of owUsesOf(O, caps, byFn, b)) {
        if (u.at.nid === b.nid || (captured && !(u.at.start >= g.start && u.at.end <= g.end))) continue;
        const p = ps.find((x) => owAfter(O, g, d, captured, u, x));
        if (p === undefined) continue;
        owErr(W, u.at, p.type === "YieldExpression" ? "mut-yield" : "mut-await", owLateMsg(b, p));
        break;
      }
    }
  }
};
