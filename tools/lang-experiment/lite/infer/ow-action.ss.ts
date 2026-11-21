// A write, action call or read() in a function made inside an action body (lite/own.ts actionEscapes, S6.19): each
// function from the use out to the action body must run before the action's function returns. The reasons are
// memoised per function in M: null, it runs in the call; a string, why it may not.

export const owEnclFn = (isFnNode) => (O: OwCtx, n: AstNode): AstNode | null => {
  let p = O.T.parent.get(n.nid);
  while (p !== undefined && !isFnNode(p)) p = O.T.parent.get(p.nid);
  return p ?? null;
};
export const owIsState = (ixUm, isNamed, unwrap) => (O: OwCtx, n: AstNode): boolean => {
  const t = O.F.types.get(n.nid);
  return t !== undefined && ixUm(O.R, t).some((m) => isNamed(unwrap(m), "State"));
};
// a built-in calls at once a function given to a parameter of function type that it does not keep; State.update too
export const owCallsAtOnce = (owArgIndex, owIsState) => (O: OwCtx, p: CallExpression | NewExpression, x: AstNode): boolean => {
  const sig = O.F.calls.get(p.nid)?.sig ?? null, fl = sig?.flags;
  const d = sig === null ? null : sig.decl ?? sig, i = owArgIndex(p.arguments, x);
  const dp = d === null ? undefined : i < d.ps.length ? d.ps[i]?.t : d.rest;
  if (fl?.intrinsic && !fl.retains && dp !== undefined && O.R.callSigs(dp).length) return true;
  const c = p.callee;
  return p.type === "CallExpression" && c.type === "MemberExpression" && !c.computed && (c.property.type === "Identifier" || c.property.type === "PrivateIdentifier") && c.property.name === "update" && owIsState(O, c.object);
};
export type OwWhyK = { readonly why: (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, f: AstNode) => string | null };
// every function from f out to `to` (exclusive) runs in the call
export const owChain = (owEnclFn) => (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, f: AstNode | null, to: AstNode): string | null => {
  for (let g = f; g !== null && g.nid !== to.nid; g = owEnclFn(O, g)) {
    if (O.F.actionBodies.has(g.nid)) return "it is called from another action's body";
    const w = K.why(K, O, M, g);
    if (w) return w;
  }
  return null;
};
// each reference of b is a direct call from a function that runs while the one holding b's declaration does
export const owOnlyCalled = (owEnclFn, owChain, owIsCallee) => (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, b: IxBinding, decl: AstNode): string | null => {
  const home = owEnclFn(O, decl) ?? O.T.fn;
  for (const r of O.T.refs.get(b.id) ?? []) {
    if (!owIsCallee(O, r)) return `${b.name} is used other than by a direct call`;
    const w = owChain(K, O, M, owEnclFn(O, r), home);
    if (w) return `${b.name} is called from a function that may run after the call (${w})`;
  }
  return null;
};
// a helper that calls itself is decided by its other uses
export const owWhy = (owWhy1) => (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, f: AstNode): string | null => {
  const hit = M.get(f.nid);
  if (hit !== undefined) return hit;
  M.set(f.nid, null);
  const r = owWhy1(K, O, M, f);
  M.set(f.nid, r);
  return r;
};
// the const or function declaration naming f, as own.ts finds it
export const owDeclaredBy = (owBindingAt) => (O: OwCtx, p: AstNode, f: AstNode): IxBinding | undefined => {
  const decl = O.T.parent.get(p.nid);
  const id = p.type === "VariableDeclarator" && p.init !== null && p.init.nid === f.nid && p.id.type === "Identifier" && decl !== undefined && decl.type === "VariableDeclaration" && decl.kind === "const" ? p.id
    : f.type === "FunctionDeclaration" ? f.id : null;
  return id === null ? undefined : owBindingAt(O, id);
};
export const owWhy1 = (owCallsAtOnce, owOnlyCalled, owDeclaredBy, owArgIndex, ixFnParts) => (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, f: AstNode): string | null => {
  const parts = ixFnParts(f);
  if (parts !== null && (parts.async || parts.generator)) return `it is ${parts.async ? "async" : "a generator"}, so it may resume after the call has finished`;
  const p = O.T.parent.get(f.nid);
  if (p === undefined) return "it is not called where it is made";
  if (p.type === "CallExpression" && p.callee.nid === f.nid) return null;
  if ((p.type === "CallExpression" || p.type === "NewExpression") && owArgIndex(p.arguments, f) >= 0) return owCallsAtOnce(O, p, f) ? null : "it is passed to a function that may keep it";
  const b = owDeclaredBy(O, p, f);
  if (b !== undefined && b.fnNode === f.nid) return owOnlyCalled(K, O, M, b, f);
  return "it is kept: returned, stored, or placed where it may be called later";
};
// a set or update read as a value (a member read or a destructured property): where it may be called
export const owMethodValue = (owCallsAtOnce, owOnlyCalled, owBindingAt, owArgIndex) => (K: OwWhyK, O: OwCtx, M: Mut<Map<number, string | null>>, x: AstNode): string | null => {
  const p = O.T.parent.get(x.nid), d = p === undefined ? undefined : O.T.parent.get(p.nid);
  if (p === undefined) return "it is kept: bound where the checker does not follow it";
  const constDecl = (n: AstNode | undefined) => n !== undefined && n.type === "VariableDeclaration" && n.kind === "const";
  if (x.type === "MemberExpression") {
    if (p.type === "CallExpression" && p.callee.nid === x.nid) return null;
    if ((p.type === "CallExpression" || p.type === "NewExpression") && owArgIndex(p.arguments, x) >= 0) return owCallsAtOnce(O, p, x) ? null : "it is passed to a function that may keep it";
    if (p.type === "VariableDeclarator" && p.init !== null && p.init.nid === x.nid && p.id.type === "Identifier" && constDecl(d)) {
      const b = owBindingAt(O, p.id);
      return b ? owOnlyCalled(K, O, M, b, p) : "it is bound to a name the checker does not follow";
    }
    return "it is kept: returned, stored, or placed where it may be called later";
  }
  const v = x.type === "Property" ? x.value : null;
  if (v !== null && v.type === "Identifier" && d !== undefined && d.type === "VariableDeclarator" && d.id.nid === p.nid && constDecl(O.T.parent.get(d.nid))) {
    const b = owBindingAt(O, v);
    return b ? owOnlyCalled(K, O, M, b, d) : "it is bound to a name the checker does not follow";
  }
  return "it is kept: bound where the checker does not follow it";
};
export const OW_WHY_K = (owWhy): OwWhyK => ({ why: owWhy });
// the action body around n, or null outside any
export const owActionRoot = (owEnclFn) => (O: OwCtx, n: AstNode | null): AstNode | null => {
  let root = n;
  while (root !== null && !O.F.actionBodies.has(root.nid)) root = owEnclFn(O, root);
  return root;
};
// a node the facts name that is not in the tree reaches the comparison as a report of its own, never as silence
export const owActionUses = (owActionRoot, owChain, OW_WHY_K) => (O: OwCtx, M: Mut<Map<number, string | null>>): IxDiag[] => {
  const out: Mut<IxDiag[]> = mut([]);
  for (const u of O.F.inActionUses) {
    const fi = O.T.byNid.get(u.fi), at = O.T.byNid.get(u.at);
    if (fi === undefined || at === undefined) { out.push({ start: 0, end: 0, rule: "ow-internal", msg: `in-action use at nid ${u.at} outside the tree` }); continue; }
    const w = owChain(OW_WHY_K, O, M, fi, owActionRoot(O, fi) ?? O.T.fn);
    if (w) out.push({ start: at.start, end: at.end, rule: u.rule, msg: `${u.msg}: the function it is in was made in an action body and may run after the call, because ${w}` });
  }
  return freeze(out);
};
// the name of a member read or a destructured property, as own.ts reads it
export const owMemberName = () => (x: AstNode): string | null => {
  const key = x.type === "MemberExpression" ? x.property : x.type === "Property" ? x.key : null;
  const computed = x.type === "MemberExpression" || x.type === "Property" ? x.computed : true;
  if (key === null) return null;
  if (!computed && key.type === "Identifier") return key.name;
  return key.type === "Literal" ? String(key.value) : null;
};
export const owStateWrites = (owMemberName, owIsState, owEnclFn, owActionRoot, owMethodValue, OW_WHY_K) => (O: OwCtx, M: Mut<Map<number, string | null>>): IxDiag[] => {
  const out: Mut<IxDiag[]> = mut([]);
  for (const x of O.T.all) {
    const isMember = x.type === "MemberExpression";
    if (!isMember && !O.F.stateProps.has(x.nid)) continue;
    const name = owMemberName(x);
    if (x.type === "MemberExpression" && ((name !== "set" && name !== "update") || !owIsState(O, x.object))) continue;
    // outside any action: [state-write] where it is read
    if (owActionRoot(O, owEnclFn(O, x)) === null) continue;
    const w = owMethodValue(OW_WHY_K, O, M, x);
    if (w) out.push({ start: x.start, end: x.end, rule: "state-write", msg: `State.${name ?? "member"} taken as a value in an action body may write after the call, because ${w}` });
  }
  return freeze(out);
};
export const owActionEscapes = (owActionUses, owStateWrites) => (O: OwCtx): IxDiag[] => {
  if (!O.F.actionBodies.size) return [];
  const M: Mut<Map<number, string | null>> = mut(new Map());
  const uses = owActionUses(O, M);
  return [...uses, ...owStateWrites(O, M)];
};
