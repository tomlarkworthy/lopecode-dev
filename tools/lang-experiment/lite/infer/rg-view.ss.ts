// What core.ts's glue read from a Registry, over the tables: the built-in type names, a cell's globals, foreign.d.ts's
// values and left statements, a name's origin, typed arrays, typeof queries, and the annotation shellFn peeks at.

export const rgBuiltin = (builtinNamesOf) => (Y: RgTypes): Set<string> => builtinNamesOf([...Y]);
// globalsOf: the prelude functions, the allowed intrinsics and undefined, bound in a cell's scope 0
export const rgGlobals = (ERR, UNDEF) => (V: RgValues, preludeFns: Set<string>, allowed: Set<string>): { name: string; t: Ty; kind: RgKind }[] => {
  const out: Mut<Map<string, { name: string; t: Ty; kind: RgKind }>> = new Map();
  for (const name of preludeFns) out.set(name, { name, t: ERR, kind: "prelude" });
  for (const name of allowed) {
    const v = V.get(name);
    if (name === "undefined") out.set(name, { name, t: UNDEF, kind: "global" });
    else if (v !== undefined && v.origin === "intrinsic") out.set(name, { name, t: v.t, kind: "global" });
  }
  for (const name of ["equals", "messageOf"]) {
    const v = V.get(name), b = out.get(name);
    if (v !== undefined && b !== undefined) out.set(name, { ...b, t: v.t });
  }
  return [...out.values()];
};
export const rgForeignValues = () => (V: RgValues): { name: string; marker: string | null; line: number; t: Ty }[] =>
  [...V].flatMap(([name, v]) => (v.origin === "foreign" ? [{ name, marker: v.marker, line: v.node.line, t: v.t }] : []));
export const rgRestOf = (nodeKind) => (rest: AstNode[]): { kind: string; line: number }[] => rest.map((st) => ({ kind: nodeKind(st), line: st.line }));
export const rgOriginOf = () => (Y: RgTypes, n: string): string | null => Y.get(n)?.origin ?? null;
export const rgIsTypedArray = () => (t: Ty, typed: string[]): boolean => t.k === "named" && typed.includes(t.n);
// whether a node holds a typeof type query, remembered by nid
export const rgHasTypeQuery = (childrenOf) => (M: Mut<Map<number, boolean>>, n: AstNode): boolean => {
  function has(W: Mut<Map<number, boolean>>, x: AstNode): boolean {
    const hit = W.get(x.nid);
    if (hit !== undefined) return hit;
    let r = x.type === "TSTypeQuery";
    if (!r) for (const k of childrenOf(x)) if (has(W, k.node)) { r = true; break; }
    W.set(x.nid, r);
    return r;
  }
  return has(M, n);
};
// core.ts peekType inside its peek: the annotation converted, an alias expanded once
export const rgPeekType = (rgBareCtx) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, ast: Ast): Ty => {
  const t = G.convert(G, Y, E, I, Q, n, rgBareCtx(ast, "user"));
  return t.k === "named" && G.isAlias(t.n) ? G.expand(G, Y, E, I, Q, t) : t;
};
