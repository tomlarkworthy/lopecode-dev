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
// whether a node holds a typeof type query, remembered per node (memo)
export const rgHasTypeQuery = (childrenOf) => {
  const has = memo((x: AstNode): boolean => x.type === "TSTypeQuery" || childrenOf(x).some((k) => has(k.node)));
  return has;
};
// core.ts peekType inside its peek: the annotation converted, an alias expanded once
export const rgPeekType = (rgBareCtx) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, ast: Ast): Ty => {
  const t = G.convert(G, Y, E, I, Q, n, rgBareCtx(ast, "user"));
  return t.k === "named" && G.isAlias(t.n) ? G.expand(G, Y, E, I, Q, t) : t;
};
// t has, somewhere hidden walks, unknown, object, a type parameter or a function; true past a depth of generic aliases.
// Not memoised here: the registry glue (rg-registry.ts core) memoises it per core with memo, since its key holds functions
export type RgHideR = { readonly isAlias: (n: string) => boolean; readonly expand: (t: Ty) => Ty };
export const rgMayHide = () => {
  function anyHides(R: RgHideR, seen: Mut<Set<string>>, xs: Ty[], d: number, any: boolean): boolean {
    for (const x of xs) if (go(R, seen, x, d, any)) return true;
    return false;
  }
  function go(R: RgHideR, seen: Mut<Set<string>>, x: Ty, d: number, any: boolean): boolean {
    switch (x.k) {
      case "unknown": case "object": case "tv": case "fn": return true;
      case "named":
        if (!R.isAlias(x.n)) return anyHides(R, seen, x.args, d, any);
        if (x.args.length) return d > 10 || go(R, seen, R.expand(x), d + 1, any);
        if (seen.has(x.n)) return false;
        seen.add(x.n);
        return go(R, seen, R.expand(x), d, any);
      case "arr": return go(R, seen, x.el, d, any);
      case "tup": return anyHides(R, seen, x.els, d, any);
      case "union": return anyHides(R, seen, x.ts, d, any);
      // t1 (2026-11-24, A-1), with any: a record with no required member, no index and no call signature takes any object
      case "rec": return !!x.calls?.length || !!x.ctors?.length || (any && !x.index && x.exact !== true && [...x.props.values()].every((p) => p.opt)) || (!!x.index && go(R, seen, x.index, d, any)) || anyHides(R, seen, [...x.props.values()].map((p) => p.t), d, any);
      default: return false;
    }
  }
  return (R: RgHideR, t: Ty, any: boolean): boolean => go(R, new Set(), t, 0, any);
};
