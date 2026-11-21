// Captures to a fixpoint through helper calls, and what one may not capture (lite/own.ts iterIn and the captures
// part of ownership): iterator-capture, borrowed-escape, mut-capture, let-capture.

// what in t may be a one-shot iterator; none: per alias without type arguments, the least depth its walk found nothing from
// the member types iterIn looks into, in own.ts's order
export const owTyKids = () => (t: Ty): Ty[] => {
  switch (t.k) {
    case "arr": return [t.el];
    case "tup": return t.els;
    case "union": return t.ts;
    case "rec": return [...[...t.props.values()].map((p) => p.t), ...(t.index ? [t.index] : [])];
    default: return [];
  }
};
export const owIterIn = (show, owTyKids) => {
  function iterIn(R: IxRegCore, t: Ty, depth: number, none: Mut<Map<string, number>>): string | null {
    if (depth > 12) return null;
    switch (t.k) {
      case "tv": return `the type parameter ${show(t)}`;
      case "arr": case "tup": case "union": case "rec": return inner(R, owTyKids(t), depth, none);
      case "named": {
        if (t.n === "Iterable" || t.n === "Generator") return show(t);
        if (t.n === "Action" || t.n === "State" || t.n === "Events") return null;
        if (!R.isAlias(t.n)) return inner(R, t.args, depth, none);
        const plain = !t.args.length, at = none.get(t.n);
        if (plain && at !== undefined && at <= depth) return null;
        const w = iterIn(R, R.expand(t), depth + 1, none);
        if (!w && plain) none.set(t.n, depth);
        return w;
      }
      default: return null;
    }
  }
  function inner(R: IxRegCore, ts: Ty[], depth: number, none: Mut<Map<string, number>>): string | null {
    for (const x of ts) { const w = iterIn(R, x, depth + 1, none); if (w) return w; }
    return null;
  }
  return iterIn;
};
export const owIter = (owIterIn) => (R: IxRegCore, t: Ty): string | null => {
  const none: Mut<Map<string, number>> = mut(new Map());
  return owIterIn(R, t, 0, none);
};
// r is written: an assignment's or update's target, or a destructuring target
export const owAssignedRef = () => (O: OwCtx, r: AstNode): boolean => {
  const p = O.T.parent.get(r.nid);
  if (p === undefined) return false;
  if (p.type === "AssignmentExpression") return p.left.nid === r.nid;
  if (p.type === "UpdateExpression") return p.argument.nid === r.nid;
  if (p.type === "ArrayPattern") return true;
  if (p.type === "Property") return O.T.parent.get(p.nid)?.type === "ObjectPattern";
  return p.type === "AssignmentPattern" && p.left.nid === r.nid;
};
export const owAdd = () => (xs: number[], id: number): number[] => (xs.includes(id) ? xs : [...xs, id]);
// one reference, for each function from the innermost out to the first that declares the binding
export const owCaptureRef = (owEncl, owInside, owIsMut, owIsBor, owIter, owErr, owAssignedRef, owIsCallee, owAdd) => (O: OwCtx, W: OwW, caps: OwCaps, b: IxBinding, r: AstNode): void => {
  for (let f = owEncl(O, r); f.nid !== O.T.fn.nid; f = owEncl(O, f)) {
    if (owInside(O, b, f)) break;
    const c = caps.get(f.nid) ?? { mut: [], let: [], calls: [] };
    const it = b.kind !== "global" && b.kind !== "prelude" ? owIter(O.R, b.t) : null;
    if (it) owErr(W, r, "iterator-capture", `${b.name} may hold an iterator (${it}), which reading uses up, so a function that captures it may give a different result for the same call; copy it into an array where it is made ([...${b.name}]) and capture the array`);
    const lets = owAssignedRef(O, r) && (b.kind === "let" || b.kind === "param");
    caps.set(f.nid, {
      mut: owIsMut(b) || owIsBor(b) ? owAdd(c.mut, b.id) : c.mut,
      let: lets ? owAdd(c.let, b.id) : c.let,
      calls: b.fnNode >= 0 && owIsCallee(O, r) ? owAdd(c.calls, b.id) : c.calls,
    });
  }
};
// a helper's captures are its caller's, except what the caller declares; one pass over the functions
export const owCapPass = (owInside) => (O: OwCtx, caps: OwCaps): boolean => {
  let changed = false;
  for (const f of O.T.fns) for (const h of caps.get(f.nid)?.calls ?? []) {
    const hb = O.F.bindings.get(h), hc = hb === undefined ? undefined : caps.get(hb.fnNode);
    if (hb === undefined || hb.fnNode < 0 || hc === undefined) continue;
    const fc = caps.get(f.nid) ?? { mut: [], let: [], calls: [] };
    const take = (from: number[], into: number[]): number[] => [...into, ...from.filter((id) => {
      const b = O.F.bindings.get(id);
      return b !== undefined && !owInside(O, b, f) && !into.includes(id);
    })];
    const mutT = take(hc.mut, fc.mut), letT = take(hc.let, fc.let);
    if (mutT.length !== fc.mut.length || letT.length !== fc.let.length) { changed = true; caps.set(f.nid, { mut: mutT, let: letT, calls: fc.calls }); }
  }
  return changed;
};
export const owCaptures = (owCaptureRef, owCapPass) => (O: OwCtx, W: OwW): Map<number, OwCap> => {
  const caps: OwCaps = mut(new Map());
  for (const f of O.T.fns) caps.set(f.nid, { mut: [], let: [], calls: [] });
  for (const [id, rs] of O.T.refs) {
    const b = O.F.bindings.get(id);
    if (b !== undefined) for (const r of rs) owCaptureRef(O, W, caps, b, r);
  }
  for (let changed = true; changed; ) changed = owCapPass(O, caps);
  return freeze(caps);
};
export const owCaptureErrs = (owHelper, owIsBor, owErr) => (O: OwCtx, W: OwW, caps: Map<number, OwCap>, byFn: Map<number, number>): void => {
  for (const f of O.T.fns) {
    if (f.nid === O.T.fn.nid) continue;
    const h = owHelper(O, byFn, f), c = caps.get(f.nid);
    if (c === undefined) continue;
    for (const b of c.mut.flatMap((id) => O.F.bindings.get(id) ?? [])) {
      if (owIsBor(b)) owErr(W, f, "borrowed-escape", `Borrowed ${b.name} captured by a nested function`);
      else if (!h) owErr(W, f, "mut-capture", `Mut ${b.name} captured by a function that escapes (not a local helper that is only called)`);
    }
    for (const b of c.let.flatMap((id) => O.F.bindings.get(id) ?? [])) if (!h) owErr(W, f, "let-capture", `${b.kind} ${b.name} assigned from a function that escapes`);
  }
};
