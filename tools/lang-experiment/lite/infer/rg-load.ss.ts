// Registry.load over the typed tree: the top-level type, interface and declare statements of a parse into the
// declaration tables, with the statements it leaves; and the small reads of the tables core.ts's glue made.

// marker: a /** pure */ or /** effect */ block comment before the declaration
export const rgMarker = (leadingComments) => (ast: Ast, n: AstNode): "pure" | "effect" | null => {
  for (const c of leadingComments(ast, n.start)) {
    if (!c.block) continue;
    const t = c.text.trim();
    if (!t.startsWith("*")) continue;
    const w = t.slice(1).trim();
    if (w === "pure") return "pure";
    if (w === "effect") return "effect";
  }
  return null;
};
// the statements of a parse; skip: the nids of declarations not to load (a user type with a built-in name)
export const rgLoad = (rgLoadStmt, rgLoadFns) => (G: RgK, Y: RgTypes, V: RgValues, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, ast: Ast, origin: RgOrigin, typesOnly: boolean, skip: Set<number>): AstNode[] => {
  const rest: Mut<AstNode[]> = mut([]);
  const fns: Mut<Map<string, AstNode[]>> = mut(new Map());
  const body = ast.program.type === "Program" ? ast.program.body : [];
  for (const st of body) {
    const r = rgLoadStmt(G, Y, V, E, I, Q, fns, ast, origin, typesOnly, skip, st);
    if (r !== null) rest.push(r);
  }
  rgLoadFns(G, Y, V, E, I, Q, fns, ast, origin);
  return freeze(rest);
};
export const RG_DECLS = () => new Set(["TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSDeclareFunction", "VariableDeclaration", "ExportNamedDeclaration"]);
// one statement: loaded, grouped as a declared function, skipped, or left (returned)
export const rgLoadStmt = (rgDeclType, rgDeclVars, RG_DECLS, nodeKind, rgGap) => (G: RgK, Y: RgTypes, V: RgValues, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, fns: Mut<Map<string, AstNode[]>>, ast: Ast, origin: RgOrigin, typesOnly: boolean, skip: Set<number>, st: AstNode): AstNode | null => {
  if (st.type === "Other" && st.kind === "ExportNamedDeclaration") { rgGap(Q, "export held as Other"); return null; }
  const inner = st.type === "ExportNamedDeclaration" ? st.declaration : null;
  const typeKind = (x: AstNode) => nodeKind(x) === "TSTypeAliasDeclaration" || nodeKind(x) === "TSInterfaceDeclaration";
  const d = inner !== null && typeKind(inner) ? inner : st;
  if (typesOnly && !typeKind(d)) return st;
  if (d.type === "Other" && RG_DECLS.has(d.kind)) { rgGap(Q, `declaration ${d.kind} held as Other`); return null; }
  const isType = d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration";
  if (skip.has(d.nid)) return null;
  if (isType) rgDeclType(Y, Q, d, ast, origin);
  else if (d.type === "TSDeclareFunction" && d.id.type === "Identifier") fns.set(d.id.name, [...(fns.get(d.id.name) ?? []), d]);
  else if (d.type === "TSDeclareFunction") rgGap(Q, "declared function without a name");
  else if (d.type === "VariableDeclaration" && d.declare === true) rgDeclVars(G, Y, V, E, I, Q, d, ast, origin);
  else return st;
  return null;
};
// an interface declared again in the same origin adds its members; any other declaration of the name replaces it
export const rgDeclType = (rgTpNames, rgGap) => (Y: RgTypes, Q: RgCtls, d: AstNode, ast: Ast, origin: RgOrigin): void => {
  if (d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") return;
  if (d.id.type !== "Identifier") { rgGap(Q, "type declaration without a name"); return; }
  const name = d.id.name, kind = d.type === "TSTypeAliasDeclaration" ? "alias" : "iface";
  const tps = rgTpNames(Q, d.typeParameters);
  const prev = Y.get(name);
  if (prev !== undefined && prev.kind === "iface" && kind === "iface" && prev.origin === origin) Y.set(name, { ...prev, nodes: [...prev.nodes, d] });
  else Y.set(name, { kind, tps, nodes: [d], origin, ast });
};
export const rgDeclVars = (rgConvertIn, rgMarker, rgFlags, rgAnn, rgGap, UNKNOWN) => (G: RgK, Y: RgTypes, V: RgValues, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, d: AstNode, ast: Ast, origin: RgOrigin): void => {
  if (d.type !== "VariableDeclaration") return;
  for (const v of d.declarations) {
    if (v.type !== "VariableDeclarator" || v.id.type !== "Identifier") { rgGap(Q, "declare without a plain name"); continue; }
    const ann = rgAnn(Q, v.id.typeAnnotation);
    const t = ann !== null ? rgConvertIn(G, Y, E, I, Q, ann, ast, origin) : UNKNOWN;
    V.set(v.id.name, { t, origin, node: d, marker: rgMarker(ast, d), flags: rgFlags(ast, d, origin) });
  }
};
// convert with no type parameters in scope
export const rgConvertIn = (rgBareCtx) => (G: RgK, Y: RgTypes, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, n: AstNode, ast: Ast, origin: RgOrigin): Ty =>
  G.convert(G, Y, E, I, Q, n, rgBareCtx(ast, origin));
// declared functions, after the other statements: one signature, or overloads as a record of call signatures
export const rgLoadFns = (rgBareCtx, rgFlags, rgMarker, rgAnn) => (G: RgK, Y: RgTypes, V: RgValues, E: RgExpandMemo, I: RgIfaceMemo, Q: RgCtls, fns: Mut<Map<string, AstNode[]>>, ast: Ast, origin: RgOrigin): void => {
  for (const [name, list] of fns) {
    const sigs: Mut<Fn[]> = mut([]);
    for (const d of list) if (d.type === "TSDeclareFunction") sigs.push(G.sig(G, Y, E, I, Q, d.params, rgAnn(Q, d.returnType), d.typeParameters, rgBareCtx(ast, origin), rgFlags(ast, d, origin)));
    const first = list[0], one = sigs[0];
    if (first === undefined) continue;
    const t: Ty = sigs.length === 1 && one !== undefined ? one : { k: "rec", props: new Map(), calls: freeze(sigs) };
    V.set(name, { t, origin, node: first, marker: rgMarker(ast, first), flags: null });
  }
};
// core.ts loadUser: the declarations starting at a clash, by nid
export const rgSkip = () => (ast: Ast, clash: number[]): Set<number> => {
  const at = new Set(clash), out: Mut<Set<number>> = mut(new Set());
  const body = ast.program.type === "Program" ? ast.program.body : [];
  for (const st of body) {
    const d = st.type === "ExportNamedDeclaration" && st.declaration !== null ? st.declaration : st;
    if (at.has(d.start)) out.add(d.nid);
  }
  return freeze(out);
};
