// The flow check (lite/own.ts flowCheck): no use of a Mut after freeze, no use of a Borrowed (or of an async
// function's loaned Mut) after an await or a yield. A state is the set of bindings used up so far; loops run to a
// fixpoint; a call of a helper uses every Mut it captures.

export const owUnion = () => (a: OwSt, b: Iterable<number>): OwSt => new Set([...a, ...b]);
export const owJoin = (owUnion) => (ss: (OwSt | null)[]): OwSt | null => {
  let out: OwSt | null = null;
  for (const s of ss) if (s !== null) out = out === null ? s : owUnion(out, s);
  return out;
};
// the bindings f tracks: its own Borrowed parameters and Muts, and, when async, the Muts it did not make
export const owTracked = (owIsMut, owIsBor, ixFnParts) => (O: OwCtx, caps: Map<number, OwCap>, f: AstNode): OwFlowFn => {
  const tracked: Mut<Set<number>> = mut(new Set()), loaned: Mut<Set<number>> = mut(new Set());
  const capMut = caps.get(f.nid)?.mut ?? [], at = (id: number) => O.F.bindings.get(id);
  for (const id of O.T.refs.keys()) { const b = at(id); if (b !== undefined && b.fi === f.nid && owIsBor(b) && b.kind === "param") tracked.add(id); }
  for (const id of O.F.bindingOf.values()) { const b = at(id); if (b !== undefined && b.fi === f.nid && owIsMut(b) && b.mutOwned) tracked.add(id); }
  if (ixFnParts(f)?.async) for (const id of [...O.T.refs.keys(), ...capMut]) {
    const b = at(id);
    if (b !== undefined && owIsMut(b) && !(b.fi === f.nid && b.mutOwned) && (b.fi === f.nid || capMut.includes(id))) { tracked.add(id); loaned.add(id); }
  }
  const tr = freeze(tracked), lo = freeze(loaned);
  const borrowed = [...tr].filter((id) => { const b = at(id); return b !== undefined && (owIsBor(b) || lo.has(id)); });
  return { f, tracked: tr, loaned: lo, borrowed, caps };
};
export const owUse = (owIsBor, owErr) => (O: OwCtx, W: OwW, P: OwFlowFn, id: number, at: AstNode, st: OwSt): void => {
  const b = O.F.bindings.get(id);
  if (!st.has(id) || b === undefined) return;
  if (owIsBor(b)) owErr(W, at, "borrowed-await", `Borrowed ${b.name} used after an await/yield (it may be reused by its owner)`);
  else if (P.loaned.has(id)) owErr(W, at, "borrowed-await", `Mut ${b.name} used after an await: this async function did not make it, and its caller runs at the first await and may change or freeze it`);
  else owErr(W, at, "mut-after-freeze", `Mut ${b.name} used after freeze(${b.name})`);
};
// inside a try block every state met is one the handler may start from
export const owSeen = (owUnion) => (X: OwX, st: OwSt): void => {
  const acc = X.acc;
  if (acc !== null) X.acc = owUnion(acc, st);
};
export const owCallFlow = (owUse, owPrelude, owBindingAt, owUnion, kidsOf) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, n: CallExpression, st0: OwSt): OwSt => {
  let st = st0;
  for (const c of kidsOf(n)) st = K.expr(K, O, W, X, P, c, st);
  const h = O.F.calls.get(n.nid)?.helper ?? null, hb = h === null ? undefined : O.F.bindings.get(h);
  if (hb !== undefined && hb.fnNode >= 0) for (const id of P.caps.get(hb.fnNode)?.mut ?? []) if (P.tracked.has(id)) owUse(O, W, P, id, n, st);
  const a = n.arguments[0];
  if (owPrelude(O, n) === "freeze" && a !== undefined && a.type === "Identifier") {
    const b = owBindingAt(O, a);
    if (b !== undefined && P.tracked.has(b.id)) st = owUnion(st, [b.id]);
  }
  return st;
};
export const owExpr = (owSeen, owUse, owBindingAt, owJoin, owCallFlow, owUnion, isFnNode, kidsOf) => (K: OwK, O: OwCtx, W: OwW, X: OwX, P: OwFlowFn, n: AstNode, st0: OwSt): OwSt => {
  if (isFnNode(n)) return st0;
  owSeen(X, st0);
  let st = st0;
  switch (n.type) {
    case "Identifier": {
      const b = owBindingAt(O, n);
      if (b !== undefined && P.tracked.has(b.id) && b.nid !== n.nid) owUse(O, W, P, b.id, n, st);
      return st;
    }
    case "LogicalExpression": { const a = K.expr(K, O, W, X, P, n.left, st); return owJoin([a, K.expr(K, O, W, X, P, n.right, a)]) ?? a; }
    case "ConditionalExpression": {
      const t = K.expr(K, O, W, X, P, n.test, st);
      return owJoin([K.expr(K, O, W, X, P, n.consequent, t), K.expr(K, O, W, X, P, n.alternate, t)]) ?? t;
    }
    case "ChainExpression": return owJoin([st, K.expr(K, O, W, X, P, n.expression, st)]) ?? st;
    case "CallExpression": return owCallFlow(K, O, W, X, P, n, st);
    case "AwaitExpression": case "YieldExpression":
      for (const c of kidsOf(n)) st = K.expr(K, O, W, X, P, c, st);
      return P.borrowed.length ? owUnion(st, P.borrowed) : st;
    default:
      for (const c of kidsOf(n)) st = K.expr(K, O, W, X, P, c, st);
      return st;
  }
};
