// What the compiler needs to know about each cell (facts.ts factsOf, preludeCalls, freeUses) over the typed tree, with
// the boundary shapes core.ts adds to the parameters it found in another language.

// a pattern that binds name
export const mdBinds = () => {
  function binds(p: AstNode | null, name: string): boolean {
    if (p === null) return false;
    if (p.type === "Identifier") return p.name === name;
    if (p.type === "ObjectPattern") {
      for (const x of p.properties) if (binds(x.type === "RestElement" ? x.argument : x.type === "Property" ? x.value : null, name)) return true;
      return false;
    }
    if (p.type === "ArrayPattern") { for (const x of p.elements) if (binds(x, name)) return true; return false; }
    if (p.type === "AssignmentPattern") return binds(p.left, name);
    return p.type === "RestElement" && binds(p.argument, name);
  }
  return binds;
};
// a statement that declares name
export const mdDeclares = (mdBinds) => (st: AstNode, name: string): boolean => {
  if (st.type === "VariableDeclaration") return st.declarations.some((d) => d.type === "VariableDeclarator" && mdBinds(d.id, name));
  if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") return st.id.type === "Identifier" && st.id.name === name;
  return false;
};
// a node under which name is bound again, so no use of it there is free
export const mdRebinds = (mdBinds, mdDeclares) => (n: AstNode, name: string): boolean => {
  const decl = (x: AstNode | null): boolean => x !== null && x.type === "VariableDeclaration" && mdDeclares(x, name);
  switch (n.type) {
    case "ArrowFunctionExpression": case "FunctionDeclaration": return n.params.some((p) => mdBinds(p, name));
    case "FunctionExpression": return n.params.some((p) => mdBinds(p, name)) || (n.id !== null && n.id.type === "Identifier" && n.id.name === name);
    case "BlockStatement": case "StaticBlock": return n.body.some((s) => mdDeclares(s, name));
    case "SwitchStatement": return n.cases.some((c) => c.type === "SwitchCase" && c.consequent.some((s) => mdDeclares(s, name)));
    case "CatchClause": return mdBinds(n.param, name);
    case "ForStatement": return decl(n.init);
    case "ForInStatement": case "ForOfStatement": return decl(n.left);
    default: return false;
  }
};
// facts.ts preludeCalls: the calls of the bare name the cell does not bind, as nids
export const mdPreludeCalls = (mdRebinds, kidsOf) => (fn: AstNode, name: string): Set<number> => {
  const out: Mut<Set<number>> = new Set();
  const todo: Mut<AstNode[]> = [fn];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (mdRebinds(n, name)) continue;
    if (n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === name) out.add(n.nid);
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  return out;
};
// a returned expression that is a state(...) call, through parentheses and casts
export const mdIsRefCall = () => (calls: Set<number>, e0: AstNode | null): boolean => {
  let e = e0;
  while (e !== null && (e.type === "ParenthesizedExpression" || e.type === "TSAsExpression")) e = e.expression;
  return e !== null && calls.has(e.nid);
};
export const mdReturnsRef = (mdPreludeCalls, mdIsRefCall, mdRefName) => (fn: FnNode): boolean => {
  const rt = fn.returnType !== null && fn.returnType.type === "TSTypeAnnotation" ? fn.returnType.typeAnnotation : null;
  if (mdRefName(rt) === "StateCell") return true;
  const calls = mdPreludeCalls(fn, "state");
  const b = fn.body;
  return b.type === "BlockStatement" ? b.body.some((s) => s.type === "ReturnStatement" && mdIsRefCall(calls, s.argument)) : mdIsRefCall(calls, b);
};
// factsOf with core.ts's boundary shapes
export const mdFactsOf = (mdReturnsRef, mdCompileCalls, mdSpecOf, mdAnn, mdRefName) => (name: string, d: MdDef, bounds: Map<string, MdBoundary> | null, casts: TypeShape[]): MdInfo => {
  const compiles = mdCompileCalls(d.fn).flatMap((c) => { const sp = mdSpecOf(c); return sp === null ? [] : [{ inputs: sp.inputs, refs: sp.refs, outputs: sp.outputs }]; });
  const params = d.fn.params.map((p) => {
    const ref = mdRefName(mdAnn(p)), pname = p.type === "Identifier" ? p.name : "";
    return { name: pname, refTyped: ref === "State", eventsTyped: ref === "Events", boundary: bounds?.get(pname) ?? null };
  });
  return { name, span: [d.stmt.start, d.stmt.end], params, returnsRef: mdReturnsRef(d.fn), generator: d.fn.generator, compiles, casts };
};
