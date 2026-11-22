// comment-types.ts cutsOf/commentTypes/uncommentTypes and browser/erase.ts erase: the spans of TypeScript syntax in a
// source, as edits that keep each span in a /*ss:...*/ comment (mode "comment") or drop it (mode "erase").

// the node types whose cut is decided below; one of these met as an Other node is not covered
export const tcCutKinds = () => new Set(["TSTypeAliasDeclaration", "TSInterfaceDeclaration", "TSDeclareFunction", "ImportDeclaration", "ExportNamedDeclaration", "TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion", "Identifier"]);
// a declaration that is all type: cut whole
export const tcWholeType = (nodeKind) => (n: AstNode): boolean => {
  if (n.type === "TSTypeAliasDeclaration" || n.type === "TSInterfaceDeclaration" || n.type === "TSDeclareFunction") return true;
  if (n.type === "ImportDeclaration") return n.importKind === "type";
  return n.type === "ExportNamedDeclaration" && n.declaration !== null && nodeKind(n.declaration).startsWith("TS");
};
// where the cut of `x as T` starts. comment: after the `)`s closing a parenthesised operand and the `ss>` block comment closing a
// lowered JSX operand. erase: at the first token that is not a `)` (erase.ts reads this with a regex over the gap)
export const tcAsFrom = (tcLexed) => (ast: Ast, at: number, to: number, mode: string): number => {
  const toks = tcLexed(ast.src.slice(at, to), 1e9);
  if (mode === "erase") {
    const kw = toks.find((t) => t.label !== ")");
    return at + (kw === undefined ? to - at : kw.start);
  }
  let from = at;
  for (const c of ast.comments) if (c.start >= at && c.end <= to && c.text === "ss>") from = Math.max(from, c.end);
  for (const t of toks) if (t.label === ")") from = Math.max(from, at + t.end);
  return from;
};
// `<T>x`: from the `<` to the `>` after T
export const tcAssertionTo = (tcLexed) => (ast: Ast, typeEnd: number, exprStart: number): number => {
  const gt = tcLexed(ast.src.slice(typeEnd, exprStart), 1e9).find((t) => t.label === "</>/<=/>=");
  if (gt === undefined) throw new Error("unsupported: a <T>x assertion whose closing > was not found");
  return typeEnd + gt.end;
};
// the `?` of an optional name: the first token after the name
export const tcOptionalCut = (tcLexed) => (ast: Ast, from: number): TcEdit[] => {
  const t = tcLexed(ast.src.slice(from), 1)[0];
  return t !== undefined && t.label === "?" ? [{ from: from + t.start, to: from + t.end, text: "" }] : [];
};
// the cuts at one node and the nodes to walk next
export const tcCutNode = (tcCutKinds, tcWholeType, tcAsFrom, tcAssertionTo, tcOptionalCut, childrenOf, TYPE_FIELDS) => (ast: Ast, n: AstNode, mode: string): { readonly cuts: TcEdit[]; readonly next: AstNode[] } => {
  if (n.type === "Other" && tcCutKinds.has(n.kind)) throw new Error(`tc-gap: an Other node of kind ${n.kind}`);
  if (tcWholeType(n)) return { cuts: [{ from: n.start, to: n.end, text: "" }], next: [] };
  if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression")
    return { cuts: [{ from: tcAsFrom(ast, n.expression.end, n.typeAnnotation.start, mode), to: n.end, text: "" }], next: [n.expression] };
  if (n.type === "TSNonNullExpression") return { cuts: [{ from: n.end - 1, to: n.end, text: "" }], next: [n.expression] };
  if (n.type === "TSTypeAssertion" && mode === "comment")
    return { cuts: [{ from: n.start, to: tcAssertionTo(ast, n.typeAnnotation.end, n.expression.start), text: "" }], next: [n.expression] };
  const cuts: Mut<TcEdit[]> = [];
  const next: Mut<AstNode[]> = [];
  if (n.type === "ExportNamedDeclaration" && n.declaration !== null) cuts.push({ from: n.start, to: n.declaration.start, text: "" });
  if (n.type === "Identifier" && n.optional === true) cuts.push(...tcOptionalCut(ast, n.start + n.name.length));
  for (const k of childrenOf(n)) {
    if (TYPE_FIELDS.has(k.key)) cuts.push({ from: k.node.start, to: k.node.end, text: "" });
    else next.push(k.node);
  }
  return { cuts: cuts, next: next };
};
// every cut of the tree, overlapping and touching spans merged, in order
export const tcCuts = (tcCutNode) => (ast: Ast, mode: string): TcEdit[] => {
  const all: Mut<TcEdit[]> = [];
  const todo: Mut<AstNode[]> = [ast.program];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    const r = tcCutNode(ast, n, mode);
    all.push(...r.cuts);
    todo.push(...r.next);
  }
  const merged: Mut<TcEdit[]> = [];
  for (const c of all.toSorted((a, b) => a.from - b.from)) {
    const last = merged.at(-1);
    if (last !== undefined && c.from <= last.to) merged[merged.length - 1] = { from: last.from, to: Math.max(last.to, c.to), text: "" };
    else merged.push(c);
  }
  return merged;
};
// a source's typed tree (not TSX); the parser's error is thrown as it is
export const tcMustParse = (parseTree) => (src: string, jsx: boolean): Ast => {
  const p = parseTree(src, jsx);
  if (!p.ok) throw new Error(p.message);
  return p.ast;
};
// commentTypes, with the tree it parsed: types to `ss:` block comments
export const tcCommentTypes = (tcMustParse, tcCuts, tcApplyEdits, tcEsc, tcOPEN, tcLANG) => (src: string): { readonly text: string; readonly ast: Ast } => {
  if (src.includes(tcOPEN) || src.includes(tcLANG)) throw new Error("source contains a reserved marker");
  const ast = tcMustParse(src, false);
  const edits = tcCuts(ast, "comment").map((c) => ({ from: c.from, to: c.to, text: `${tcOPEN}${tcEsc(src.slice(c.from, c.to))}*/` }));
  return { text: tcApplyEdits(src, edits), ast };
};
export const tcErase = (tcMustParse, tcCuts, tcApplyEdits) => (src: string): string => tcApplyEdits(src, tcCuts(tcMustParse(src, false), "erase"));
// uncommentTypes: each `ss:T` block comment put back as T. On the typed parse, so a text that does not parse is not covered
export const tcUncommentTypes = (parseTree, tcApplyEdits, tcUnesc) => (js: string): string => {
  const p = parseTree(js, false);
  if (!p.ok) throw new Error(`tc-gap: uncommentTypes of a text that does not parse: ${p.message}`);
  return tcApplyEdits(js, p.ast.comments.filter((c) => c.block && c.text.startsWith("ss:")).map((c) => ({ from: c.start, to: c.end, text: tcUnesc(c.text.slice(3)) })));
};
export const tcCompileTypes = (tcCommentTypes, tcLANG) => (src: string): string => tcLANG + tcCommentTypes(src).text;
// comment-types.ts decompile: the marker (the first comment) dropped, the types put back
export const tcDecompileTypes = (tcLangOf, tcLANG, tcUncommentTypes) => (js: string): string => {
  if (tcLangOf(js) !== "ss") throw new Error(`not SoundScript: the first comment must be ${tcLANG}`);
  const head = js.indexOf(tcLANG);
  return tcUncommentTypes(js.slice(0, head) + js.slice(head + tcLANG.length));
};
