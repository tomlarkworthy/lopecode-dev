// capture.ts opaqueCaptures over the nested tree: the action-capture rule by binding, which keys maps by node and
// compares nodes. Here a node is keyed by its nid and a binding by its id. The checker's facts (bindingOf, the
// bindings, the action bodies) arrive as data keyed the same way (OwnFacts), from an outside cell. Checked with
// ast-n.ss.ts, kids-n.ss.ts and visit-n.ss.ts in front (check.ts).

// a binding as the facts give it: node is its declaration (nid, or -1 outside this parse), with its span; fnNode is the
// function it names (nid, or -1)
export type Bind = { id: number; name: string; kind: string; cellParam: boolean; mutOwned: boolean; node: number; start: number; end: number; fnNode: number };
export type OwnFacts = { bindingOf: [number, number][]; bindings: Bind[]; actionBodies: number[] };
export type OwnCapture = { node: AstNode; name: string; why: string; opaque: boolean };
export const ownFactsIn = (ownFacts: OwnFacts): OwnFacts => ownFacts;
// the function cell's nodes: by nid, each one's parent nid, the identifiers and the JSX component names, in kids order
export type Tree = { byNid: Map<number, AstNode>; parent: Map<number, number>; ids: Identifier[]; comps: AstNode[] };
export const treeOf = (kids) => (root: AstNode): Tree => {
  const byNid: Mut<Map<number, AstNode>> = mut(new Map());
  const parent: Mut<Map<number, number>> = mut(new Map());
  const ids: Mut<Identifier[]> = mut([]);
  const comps: Mut<AstNode[]> = mut([]);
  const upper = (s: string): boolean => s.charAt(0) >= "A" && s.charAt(0) <= "Z";
  const walk = (n: AstNode, p: AstNode | null): void => {
    byNid.set(n.nid, n);
    if (p !== null) parent.set(n.nid, p.nid);
    if (n.type === "Identifier") ids.push(n);
    // a component name has no binding in the facts, so it is not followed
    if (p !== null && p.type === "JSXOpeningElement" && p.name.nid === n.nid && (n.type !== "JSXIdentifier" || upper(n.name))) comps.push(n);
    for (const c of kids(n)) walk(c, n);
  };
  walk(root, null);
  return { byNid: freeze(byNid), parent: freeze(parent), ids: freeze(ids), comps: freeze(comps) };
};
export type Span = { start: number; end: number };
export const within = () => (x: Span, f: Span): boolean => x.start >= f.start && x.end <= f.end;
export const isLocal = () => (b: Bind): boolean => b.kind !== "prelude" && b.kind !== "global";
// the spans a binding's value comes from: its function, a for...of's declaration and iterable, or its declarator
export const valueSpan = () => (t: Tree, b: Bind): AstNode[] | null => {
  const fn = t.byNid.get(b.fnNode);
  if (fn !== undefined) return [fn];
  const up = (n: AstNode | undefined): AstNode | undefined => { const p = n === undefined ? undefined : t.parent.get(n.nid); return p === undefined ? undefined : t.byNid.get(p); };
  let d = up(t.byNid.get(b.node));
  while (d !== undefined && d.type !== "VariableDeclarator") d = up(d);
  const decl = up(d), loop = up(decl);
  if (loop !== undefined && loop.type === "ForOfStatement" && decl !== undefined && loop.left.nid === decl.nid) return [decl, loop.right];
  return d !== undefined && d.type === "VariableDeclarator" && d.init !== null ? [d] : null;
};
// why each of bs depends on state, or null when it does not (keyed by binding id)
export const whyOf = (within, isLocal, valueSpan) => (t: Tree, facts: OwnFacts, tainted: Map<string, string>, bs: Bind[]): Map<number, string | null> => {
  const bindings = new Map(facts.bindings.map((b) => [b.id, b] as const));
  const bindingOf = new Map(facts.bindingOf);
  const bindOf = (r: AstNode): Bind | undefined => { const id = bindingOf.get(r.nid); return id === undefined ? undefined : bindings.get(id); };
  const bad: Mut<Map<number, string | null>> = mut(new Map());
  const visiting: Mut<Set<number>> = mut(new Set());
  // the local bindings used in span from outside it
  const free = (span: AstNode[]): Bind[] => t.ids.flatMap((r) => {
    const b = bindOf(r);
    return b !== undefined && isLocal(b) && b.node !== r.nid && span.some((s) => within(r, s)) && !span.some((s) => within(b, s)) ? [b] : [];
  });
  function why(b: Bind): string | null {
    if (!isLocal(b)) return null;
    if (b.cellParam) return tainted.get(b.name) ?? null;
    const hit = bad.get(b.id);
    if (hit !== undefined) return hit;
    if (visiting.has(b.id)) return null; // a function that calls itself: decided by its other references
    visiting.add(b.id);
    const w = why1(b);
    visiting.delete(b.id);
    if (w !== null || visiting.size === 0) bad.set(b.id, w);
    return w;
  }
  function why1(b: Bind): string | null {
    if (b.kind === "param") return "is a parameter of an enclosing function, so a caller may pass it a value that depends on state";
    if (b.kind === "let") return "is a let or a catch binding, so its value is not fixed where it is declared";
    if (b.mutOwned) return "is a Mut, which the cell may change after the action is made";
    const span = valueSpan(t, b);
    if (span === null) return "is bound where the checker does not follow its value";
    for (const j of t.comps) if (span.some((s) => within(j, s))) return "is computed from a JSX component, which the checker does not follow";
    for (const c of free(span)) {
      const w = why(c);
      if (w !== null) return `is computed from ${c.name}, which ${w.startsWith("is ") ? w : `depends on state (${w})`}`;
    }
    return null;
  }
  // a callback calling why would capture the Mut ([mut-capture]), so this is a loop
  const out: Mut<Map<number, string | null>> = mut(new Map());
  for (const b of bs) out.set(b.id, why(b));
  return freeze(out);
};
// The same rule by binding, default-deny (capture.ts opaqueCaptures). skip: the identifiers captures already reported
export type Use = { r: Identifier; b: Bind; a: AstNode };
// each identifier of a local binding used inside an action body that does not hold the binding's declaration
export const usesInActions = (within, isLocal) => (t: Tree, facts: OwnFacts, skip: Set<number>): Use[] => {
  const bindings = new Map(facts.bindings.map((b) => [b.id, b] as const));
  const bindingOf = new Map(facts.bindingOf);
  const bodies = facts.actionBodies.flatMap((id) => { const a = t.byNid.get(id); return a === undefined ? [] : [a]; });
  return t.ids.flatMap((r) => {
    const id = bindingOf.get(r.nid), b = id === undefined ? undefined : bindings.get(id);
    if (skip.has(r.nid) || b === undefined || !isLocal(b) || b.node === r.nid) return [];
    const a = bodies.find((x) => within(r, x) && !within(b, x));
    return a === undefined ? [] : [{ r, b, a }];
  });
};
export const opaqueCaptures = (treeOf, within, whyOf, usesInActions) => (cellFn: FnNode, facts: OwnFacts, tainted: Map<string, string>, skip: Set<number>): OwnCapture[] => {
  if (facts.actionBodies.length === 0) return [];
  const t = treeOf(cellFn);
  const uses = usesInActions(t, facts, skip);
  const why = whyOf(t, facts, tainted, uses.map((u) => u.b));
  const out: Mut<OwnCapture[]> = mut([]);
  const seen: Mut<Set<string>> = mut(new Set());
  for (const u of uses) {
    const w = why.get(u.b.id) ?? null, key = `${u.a.start}:${u.b.id}`;
    if (w === null || seen.has(key)) continue;
    seen.add(key);
    out.push({ node: u.r, name: u.b.name, why: w, opaque: !u.b.cellParam });
  }
  const bodies = facts.actionBodies.flatMap((id) => { const a = t.byNid.get(id); return a === undefined ? [] : [a]; });
  for (const j of t.comps) if (bodies.some((a) => within(j, a))) out.push({ node: j, name: `<${j.type === "JSXIdentifier" ? j.name : "component"}>`, why: "is a JSX component, which the checker does not follow", opaque: true });
  return freeze(out);
};
