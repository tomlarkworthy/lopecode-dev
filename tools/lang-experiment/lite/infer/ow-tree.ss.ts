// The tree own.ts walks and the lookups over it and the facts (lite/own.ts ownership, its first lines and helpers).

// preorder in parse.ts kids order; an Other node is recorded, since own.ts reads node types the typed tree lacks there
export const owIndex = (kidsOf, isFnNode) => (F: IxFacts, cellFn: AstNode): OwTree => {
  const parent: Mut<Map<number, AstNode>> = mut(new Map()), byNid: Mut<Map<number, AstNode>> = mut(new Map());
  const all: Mut<AstNode[]> = mut([]), fns: Mut<AstNode[]> = mut([]), refs: Mut<Map<number, AstNode[]>> = mut(new Map());
  const todo: Mut<AstNode[]> = mut([cellFn]);
  let other: string | null = null;
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    all.push(n);
    byNid.set(n.nid, n);
    if (n.type === "Other" && other === null) other = `node ${n.kind} (Other)`;
    if (isFnNode(n)) fns.push(n);
    const id = n.type === "Identifier" ? F.bindingOf.get(n.nid) : undefined;
    const b = id === undefined ? undefined : F.bindings.get(id);
    if (b !== undefined && b.nid !== n.nid) refs.set(b.id, [...(refs.get(b.id) ?? []), n]);
    const ks = kidsOf(n);
    for (const k of ks) parent.set(k.nid, n);
    for (const k of ks.toReversed()) todo.push(k);
  }
  return { fn: cellFn, parent: freeze(parent), byNid: freeze(byNid), all: freeze(all), fns: freeze(fns), refs: freeze(refs), other };
};
export const owParent = () => (O: OwCtx, n: AstNode): AstNode | undefined => O.T.parent.get(n.nid);
// the function around n, or the cell's
export const owEncl = (isFnNode) => (O: OwCtx, n: AstNode): AstNode => {
  let p = O.T.parent.get(n.nid);
  while (p !== undefined && !isFnNode(p)) p = O.T.parent.get(p.nid);
  return p ?? O.T.fn;
};
export const owBindingAt = () => (O: OwCtx, n: AstNode): IxBinding | undefined => {
  const id = O.F.bindingOf.get(n.nid);
  return id === undefined ? undefined : O.F.bindings.get(id);
};
// a global's declaration is in another source; no use of inside can tell it from one outside f
export const owInside = () => (O: OwCtx, b: IxBinding, f: AstNode): boolean => {
  const d = O.T.byNid.get(b.nid);
  return d !== undefined && d.start >= f.start && d.end <= f.end;
};
export const owIsMut = (isNamed) => (b: IxBinding): boolean => isNamed(b.t, "Mut");
export const owIsBor = (isNamed) => (b: IxBinding): boolean => isNamed(b.t, "Borrowed");
export const owIsCallee = () => (O: OwCtx, r: AstNode): boolean => {
  const p = O.T.parent.get(r.nid);
  return p !== undefined && p.type === "CallExpression" && p.callee.nid === r.nid;
};
export const owPrelude = () => (O: OwCtx, c: AstNode): string | null => (c.type === "CallExpression" ? O.F.calls.get(c.nid)?.prelude ?? null : null);
// bindingOfFn: over the bindings bindingOf holds, in the order first met, the last naming each function
export const owBindingOfFn = () => (F: IxFacts): Map<number, number> => {
  const seen: Mut<Set<number>> = mut(new Set()), out: Mut<Map<number, number>> = mut(new Map());
  for (const id of F.bindingOf.values()) {
    if (seen.has(id)) continue;
    seen.add(id);
    const b = F.bindings.get(id);
    if (b !== undefined && b.fnNode >= 0) out.set(b.fnNode, id);
  }
  return freeze(out);
};
// the binding of a function that is a const or a function declaration and only called
export const owHelper = (owIsCallee) => (O: OwCtx, byFn: Map<number, number>, f: AstNode): IxBinding | undefined => {
  const id = byFn.get(f.nid), b = id === undefined ? undefined : O.F.bindings.get(id);
  if (b === undefined || (b.kind !== "const" && b.kind !== "fn")) return undefined;
  return (O.T.refs.get(b.id) ?? []).every((r) => owIsCallee(O, r)) ? b : undefined;
};
export const owErr = (ixPush) => (W: OwW, at: AstNode, rule: string, msg: string): void => {
  const k = `${at.start}:${rule}`;
  if (W.seen.has(k)) return;
  W.seen = new Set([...W.seen, k]);
  W.errs = ixPush(W.errs, { start: at.start, end: at.end, rule, msg });
};
export const owUnsup = (ixPush) => (W: OwW, at: AstNode, what: string): void => {
  W.unsup = ixPush(W.unsup, { start: at.start, end: at.end, rule: "unsupported", msg: what });
};
// the declared (uninstantiated) type of argument i of a resolved call
export const owDeclParam = () => (O: OwCtx, call: AstNode, i: number, rest: boolean): Ty | undefined => {
  const sig = O.F.calls.get(call.nid)?.sig ?? null;
  if (sig === null) return undefined;
  const d = sig.decl ?? sig, p = i < d.ps.length ? d.ps[i] : undefined;
  return i < d.ps.length ? p?.t : rest ? d.rest : undefined;
};
export const owNonRetainingArg = (owDeclParam) => (O: OwCtx, call: AstNode, i: number): boolean => {
  const flags = O.F.calls.get(call.nid)?.sig?.flags;
  const dp = owDeclParam(O, call, i, true);
  return !!flags?.intrinsic && !flags.retains && dp !== undefined && dp.k !== "tv";
};
export const owMutParamArg = (owDeclParam, isNamed) => (O: OwCtx, call: AstNode, i: number): boolean => {
  const dp = owDeclParam(O, call, i, false);
  return dp !== undefined && isNamed(dp, "Mut");
};
// the index of x among a call's arguments, -1 when it is not one
export const owArgIndex = () => (args: AstNode[], x: AstNode): number => args.findIndex((a) => a.nid === x.nid);
