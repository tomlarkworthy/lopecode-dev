// facts.ts globalRefs over the typed tree, as md-facts.ss.ts mdPreludeCalls is preludeCalls: the references to a
// global no parameter or declaration binds, read where compileChecked decides a cell's inputs. And ss-toolchain.ts
// keepJsx: the lowered JSX elements' originals kept in their comments.

// an identifier that names no variable here: a property after `.`, a key, a label
export const tcNotARef = () => (p: AstNode | null, n: AstNode): boolean => {
  if (p === null) return false;
  if (p.type === "MemberExpression") return !p.computed && p.property.nid === n.nid;
  if (p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") return !p.computed && p.key.nid === n.nid && (p.value === null || p.value.nid !== n.nid);
  return p.type === "LabeledStatement" || p.type === "BreakStatement" || p.type === "ContinueStatement";
};
// the start of each free reference to name in fn, in walk order
export const tcGlobalRefStarts = (tcNotARef, mdRebinds, kidsOf) => (fn: AstNode, name: string): number[] => {
  const out: Mut<number[]> = mut([]);
  const todo: Mut<{ readonly n: AstNode; readonly p: AstNode | null }[]> = mut([{ n: fn, p: null }]);
  for (let e = todo.pop(); e !== undefined; e = todo.pop()) {
    const n = e.n;
    if (mdRebinds(n, name)) continue;
    if (n.type === "Identifier" && n.name === name && !tcNotARef(e.p, n)) out.push(n.start);
    for (const k of kidsOf(n).toReversed()) todo.push({ n: k, p: n });
  }
  return freeze(out);
};
// the JSX elements and fragments not inside another, in source order
export const tcJsxRoots = (kidsOf) => (ast: Ast): AstNode[] => {
  const out: Mut<AstNode[]> = mut([]);
  const todo: Mut<AstNode[]> = mut([ast.program]);
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "JSXElement" || n.type === "JSXFragment") { out.push(n); continue; }
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  return freeze(out);
};
// keepJsx: the function's text lowered, each `ss<` block comment rewritten to hold its element's original as kept text
export const tcKeepJsx = (tcMustParse, tcJsxRoots, tcLowered, tcKeep, tcApplyEdits, parseTree) => (fnSrc: string): string => {
  const s = `(${fnSrc})`;
  const originals = tcJsxRoots(tcMustParse(s, true)).map((n) => s.slice(n.start, n.end));
  const out = tcLowered(s, true);
  const p = parseTree(out, false);
  if (!p.ok) throw new Error(`tc-gap: the lowered JSX does not parse: ${p.message}`);
  const kept = p.ast.comments.filter((c) => c.block && c.text.startsWith("ss<"));
  if (kept.length !== originals.length) throw new Error("JSX originals and kept comments do not match");
  const edits = kept.map((c, i) => ({ from: c.start, to: c.end, text: `/*${"ss"}<${tcKeep(originals[i] ?? "")}*/` }));
  return tcApplyEdits(out, edits).slice(1, -1);
};
