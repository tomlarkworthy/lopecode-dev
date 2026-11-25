// facts.ts over the typed tree: cellsOf (the cells a source declares, with factsOf's facts, md-facts.ss.ts) and
// globalRefs (the free references to a global). preludeCalls is md-facts.ss.ts's mdPreludeCalls.

// the cells one top-level statement declares: a function declaration, or a declarator binding a name to a function
export const cpStatementDefs = () => (st: AstNode): MdDef[] => {
  const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  if (d === null) return [];
  if (d.type === "FunctionDeclaration") return d.id.type === "Identifier" ? [{ name: d.id.name, fn: d, stmt: st }] : [];
  if (d.type !== "VariableDeclaration") return [];
  return d.declarations.flatMap((x): MdDef[] => {
    if (x.type !== "VariableDeclarator" || x.id.type !== "Identifier" || x.init === null) return [];
    const init = x.init;
    return init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression" ? [{ name: x.id.name, fn: init, stmt: st }] : [];
  });
};
// cellsOf: each cell of src with its facts, or the parse's error
export const cpCellsOf = (parseTree, cpStatementDefs, mdFactsOf) => (src: string): CpCells => {
  const p = parseTree(src, false);
  if (!p.ok) return { ok: false, message: p.message };
  const prog = p.ast.program;
  if (prog.type !== "Program") return { ok: true, cells: [] };
  return { ok: true, cells: prog.body.flatMap((st) => cpStatementDefs(st).map((d) => mdFactsOf(d.name, d, null, [], [], null))) };
};
// a key of p that names x rather than reading it: a member's property, a property's or class member's key
export const cpNamedKey = () => (x: AstNode, p: AstNode): boolean => {
  if (p.type === "MemberExpression") return !p.computed && p.property.nid === x.nid;
  if (p.type === "Property" || p.type === "MethodDefinition") return !p.computed && p.key.nid === x.nid && p.value.nid !== x.nid;
  if (p.type === "PropertyDefinition") return !p.computed && p.key.nid === x.nid && (p.value === null || p.value.nid !== x.nid);
  return false;
};
// globalRefs: the nids of the identifiers in fn that read the global name, outside every scope binding it
export const cpGlobalRefs = (mdRebinds, cpNamedKey, kidsOf) => (fn: AstNode, name: string): Set<number> => {
  const out: Mut<Set<number>> = new Set();
  const todo: Mut<{ n: AstNode; p: AstNode | null }[]> = [{ n: fn, p: null }];
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n, p = e.p;
    if (mdRebinds(n, name)) continue;
    const label = p !== null && (p.type === "LabeledStatement" || p.type === "BreakStatement" || p.type === "ContinueStatement");
    if (n.type === "Identifier" && n.name === name && !label && !(p !== null && cpNamedKey(n, p))) out.add(n.nid);
    for (const k of kidsOf(n).toReversed()) todo.push({ n: k, p: n });
  }
  return out;
};
