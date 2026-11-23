// action-capture by binding, default-deny (lite/capture.ts opaqueCaptures): from outside itself an action body may use
// only a prelude name, a global, a cell input that holds no state, or a const or function whose own free references
// pass. B: the verdict per binding id, and the bindings being decided (a function that calls itself).

export type OwOpaque = { readonly ids: AstNode[]; readonly comps: AstNode[]; readonly tainted: Map<string, string> };
export type OwVerdicts = { bad: Map<number, string | null>; visiting: Set<number> };
export type OwB = Mut<OwVerdicts>;
export const owWithin = () => (x: AstNode, f: AstNode): boolean => x.start >= f.start && x.end <= f.end;
export const owIsLocal = () => (b: IxBinding): boolean => b.kind !== "prelude" && b.kind !== "global";
// identifiers in preorder, and JSX component names (a capitalised or member name), which have no binding in the facts
export const owIdsAndComps = (owIsUpper) => (O: OwCtx): { ids: AstNode[]; comps: AstNode[] } => {
  const ids: Mut<AstNode[]> = [], comps: Mut<AstNode[]> = [];
  for (const n of O.T.all) {
    if (n.type === "Identifier") ids.push(n);
    const p = O.T.parent.get(n.nid);
    if (p !== undefined && p.type === "JSXOpeningElement" && p.name.nid === n.nid && (n.type !== "JSXIdentifier" || owIsUpper(n.name))) comps.push(n);
  }
  return { ids: ids, comps: comps };
};
export const owIsUpper = () => (s: string): boolean => { const c = s.charAt(0); return c >= "A" && c <= "Z"; };
// the local bindings referenced inside span from outside it
export const owFree = (owBindingAt, owIsLocal, owWithin) => (O: OwCtx, Q: OwOpaque, span: AstNode[]): IxBinding[] => Q.ids.flatMap((r) => {
  const b = owBindingAt(O, r), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
  return b !== undefined && owIsLocal(b) && b.nid !== r.nid && span.some((s) => owWithin(r, s)) && !(d !== undefined && span.some((s) => owWithin(d, s))) ? [b] : [];
});
// what a const's value is computed from: its function, its declarator, or a for...of's declaration and iterable
export const owSpanOf = () => (O: OwCtx, b: IxBinding): AstNode[] | null => {
  const fnNode = O.T.byNid.get(b.fnNode);
  if (fnNode !== undefined) return [fnNode];
  const node = O.T.byNid.get(b.nid);
  let d = node === undefined ? undefined : O.T.parent.get(node.nid);
  while (d !== undefined && d.type !== "VariableDeclarator") d = O.T.parent.get(d.nid);
  const decl = d === undefined ? undefined : O.T.parent.get(d.nid), loop = decl === undefined ? undefined : O.T.parent.get(decl.nid);
  if (loop !== undefined && decl !== undefined && loop.type === "ForOfStatement" && loop.left.nid === decl.nid) return [decl, loop.right];
  return d !== undefined && d.type === "VariableDeclarator" && d.init !== null ? [d] : null;
};
export type OwWhyB = { readonly why: (K: OwWhyB, O: OwCtx, Q: OwOpaque, B: OwB, b: IxBinding) => string | null };
export const owOpaqueWhy = (owIsLocal, owOpaqueWhy1) => (K: OwWhyB, O: OwCtx, Q: OwOpaque, B: OwB, b: IxBinding): string | null => {
  if (!owIsLocal(b)) return null;
  if (b.cellParam) return Q.tainted.get(b.name) ?? null;
  const hit = B.bad.get(b.id);
  if (hit !== undefined) return hit;
  if (B.visiting.has(b.id)) return null;
  B.visiting = new Set([...B.visiting, b.id]);
  const w = owOpaqueWhy1(K, O, Q, B, b);
  B.visiting = new Set([...B.visiting].filter((x) => x !== b.id));
  if (w || !B.visiting.size) B.bad = new Map([...B.bad, [b.id, w]]);
  return w;
};
export const owOpaqueWhy1 = (owSpanOf, owFree, owWithin) => (K: OwWhyB, O: OwCtx, Q: OwOpaque, B: OwB, b: IxBinding): string | null => {
  if (b.kind === "param") return "is a parameter of an enclosing function, so a caller may pass it a value that depends on state";
  if (b.kind === "let") return "is a let or a catch binding, so its value is not fixed where it is declared";
  if (b.mutOwned) return "is a Mut, which the cell may change after the action is made";
  const span = owSpanOf(O, b);
  if (span === null) return "is bound where the checker does not follow its value";
  if (Q.comps.some((j) => span.some((s) => owWithin(j, s)))) return "is computed from a JSX component, which the checker does not follow";
  for (const c of owFree(O, Q, span)) {
    const w = K.why(K, O, Q, B, c);
    if (w) return `is computed from ${c.name}, which ${w.startsWith("is ") ? w : `depends on state (${w})`}`;
  }
  return null;
};
export const OW_WHY_B = (owOpaqueWhy): OwWhyB => ({ why: owOpaqueWhy });
// skip: the references the by-name rule already reported
export const owOpaqueCaptures = (owCapturesIn) => (O: OwCtx, tainted: Map<string, string>, skip: Set<number>): OwCapture[] =>
  O.F.actionBodies.size ? owCapturesIn(O, tainted, skip, [...O.F.actionBodies].flatMap((id) => O.T.byNid.get(id) ?? [])) : [];
// the same rule over any functions: action bodies, or the functions given to memo (S2.13)
export const owCapturesIn = (owIdsAndComps, owBindingAt, owIsLocal, owWithin, OW_WHY_B) => (O: OwCtx, tainted: Map<string, string>, skip: Set<number>, bodies: AstNode[]): OwCapture[] => {
  const Q: OwOpaque = { ...owIdsAndComps(O), tainted }, B: OwB = { bad: new Map(), visiting: new Set() };
  const out: Mut<OwCapture[]> = [], seen: Mut<Set<string>> = new Set();
  for (const r of Q.ids) {
    const b = owBindingAt(O, r), d = b === undefined ? undefined : O.T.byNid.get(b.nid);
    if (skip.has(r.nid) || b === undefined || !owIsLocal(b) || b.nid === r.nid || r.type !== "Identifier") continue;
    const a = bodies.find((a) => owWithin(r, a) && !(d !== undefined && owWithin(d, a)));
    const w = a === undefined ? null : OW_WHY_B.why(OW_WHY_B, O, Q, B, b);
    if (a === undefined || !w || seen.has(`${a.start}:${b.id}`)) continue;
    seen.add(`${a.start}:${b.id}`);
    out.push({ at: r, name: b.name, why: w, opaque: !b.cellParam });
  }
  for (const j of Q.comps) if (bodies.some((a) => owWithin(j, a))) out.push({ at: j, name: `<${j.type === "JSXIdentifier" ? j.name : "component"}>`, why: "is a JSX component, which the checker does not follow", opaque: true });
  return out;
};
