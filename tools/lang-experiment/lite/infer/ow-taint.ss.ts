// action-capture by name (lite/capture.ts captures): a local computed from a state-dependent name is tainted too,
// to a fixpoint, and an action body may use no tainted name that it does not declare itself.

export type OwCapture = { readonly at: AstNode; readonly name: string; readonly why: string; readonly opaque: boolean; readonly fix?: string };
// an identifier that does not read a binding: a property or key name, or a label
export const owNotARef = () => (parent: AstNode | null, key: string): boolean => {
  if (parent === null) return false;
  switch (parent.type) {
    case "MemberExpression": return key === "property" && !parent.computed;
    case "Property": case "MethodDefinition": case "PropertyDefinition": return key === "key" && !parent.computed;
    case "LabeledStatement": case "BreakStatement": case "ContinueStatement": return true;
    default: return false;
  }
};
// the identifiers under n that read a binding, outside type positions, in field order
export const owRefsOf = (owNotARef, childrenOf, TYPE_FIELDS) => {
  function walk(n: AstNode, out: Mut<AstNode[]>, parent: AstNode | null, key: string): void {
    if (n.type === "Identifier") { if (!owNotARef(parent, key)) out.push(n); return; }
    if (n.type === "JSXIdentifier") return;
    for (const k of childrenOf(n)) if (!TYPE_FIELDS.has(k.key)) walk(k.node, out, n, k.key);
  }
  return (n: AstNode): AstNode[] => {
    const out: Mut<AstNode[]> = [];
    walk(n, out, null, "");
    return out;
  };
};
// the names a pattern binds
export const owBound = () => {
  function bound(p: AstNode | null, out: Mut<Set<string>>): void {
    if (p === null) return;
    switch (p.type) {
      case "Identifier": out.add(p.name); return;
      case "ObjectPattern": for (const q of p.properties) bound(q.type === "RestElement" ? q.argument : q.type === "Property" ? q.value : null, out); return;
      case "ArrayPattern": for (const q of p.elements) bound(q, out); return;
      case "RestElement": bound(p.argument, out); return;
      case "AssignmentPattern": bound(p.left, out); return;
      case "TSParameterProperty": bound(p.parameter, out); return;
      default: return;
    }
  }
  return bound;
};
export const owBoundNames = (owBound) => (p: AstNode | null): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  owBound(p, out);
  return out;
};
// every name declared anywhere inside fn: its parameters, locals, nested functions' names and parameters
export const owDeclaredIn = (owBound, ixFnParts, isFnNode, kidsOf) => (fn: AstNode): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const parts = ixFnParts(fn);
  if (parts === null) return out;
  for (const p of parts.params) owBound(p, out);
  const todo: Mut<AstNode[]> = [parts.body];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "VariableDeclarator") owBound(n.id, out);
    if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression") && n.id !== null && n.id.type === "Identifier") out.add(n.id.name);
    const np = isFnNode(n) ? ixFnParts(n) : null;
    if (np !== null) for (const p of np.params) owBound(p, out);
    if (n.type === "CatchClause") owBound(n.param, out);
    if (n.type === "ClassDeclaration" && n.id.type === "Identifier") out.add(n.id.name);
    for (const k of kidsOf(n)) todo.push(k);
  }
  return out;
};
export const owIsActionCall = () => (n: AstNode): boolean => n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "action";
export type OwLocal = { readonly names: Set<string>; readonly from: AstNode };
// the cell's locals outside any action body, each with what its value is computed from
export const owLocals = (owIsActionCall, owBoundNames, kidsOf) => (body: AstNode): OwLocal[] => {
  const out: Mut<OwLocal[]> = [];
  const todo: Mut<AstNode[]> = [body];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (owIsActionCall(n)) continue;
    if (n.type === "VariableDeclarator" && n.init !== null) out.push({ names: owBoundNames(n.id), from: n.init });
    if (n.type === "FunctionDeclaration" && n.id.type === "Identifier") out.push({ names: new Set([n.id.name]), from: n.body });
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  return out;
};
// the first reference in from to a tainted name
export const owFirstTainted = (owRefsOf) => (taint: Mut<Map<string, string>>, from: AstNode): string | null => {
  for (const r of owRefsOf(from)) if (r.type === "Identifier" && taint.has(r.name)) return r.name;
  return null;
};
export const owTaintPass = (owFirstTainted) => (taint: Mut<Map<string, string>>, locals: OwLocal[]): boolean => {
  let changed = false;
  for (const l of locals) {
    let all = true;
    for (const x of l.names) if (!taint.has(x)) all = false;
    const hit = all ? null : owFirstTainted(taint, l.from);
    if (hit === null) continue;
    for (const x of l.names) if (!taint.has(x)) { taint.set(x, `computed from ${hit}`); changed = true; }
  }
  return changed;
};
// the uses in one action body of tainted names it does not declare; a parameter's default is read each call
export const owActionTaint = (owDeclaredIn, owRefsOf, ixFnParts) => (taint: Mut<Map<string, string>>, f: AstNode, out: Mut<OwCapture[]>): void => {
  const parts = ixFnParts(f);
  if (parts === null) return;
  const own = owDeclaredIn(f), seen: Mut<Set<string>> = new Set();
  for (const r of owRefsOf(parts.body)) {
    const why = r.type === "Identifier" ? taint.get(r.name) : undefined;
    if (r.type !== "Identifier" || why === undefined || own.has(r.name) || seen.has(r.name)) continue;
    seen.add(r.name);
    out.push({ at: r, name: r.name, why, opaque: false });
  }
  for (const p of parts.params) for (const r of owRefsOf(p)) {
    const why = r.type === "Identifier" ? taint.get(r.name) : undefined;
    if (r.type === "Identifier" && why !== undefined && !own.has(r.name)) out.push({ at: r, name: r.name, why, opaque: false });
  }
};
export const owTaintCaptures = (owLocals, owTaintPass, owActionTaint, owIsActionCall, isFnNode, ixFnParts, kidsOf) => (fn: AstNode, tainted: Map<string, string>): OwCapture[] => {
  const parts = ixFnParts(fn);
  if (parts === null) return [];
  const taint: Mut<Map<string, string>> = new Map(tainted), locals = owLocals(parts.body);
  for (let changed = true; changed; ) changed = owTaintPass(taint, locals);
  const out: Mut<OwCapture[]> = [];
  if (!taint.size) return out;
  const todo: Mut<AstNode[]> = [parts.body];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n.type === "CallExpression" && owIsActionCall(n)) {
      const f = n.arguments[0];
      if (f !== undefined && isFnNode(f)) owActionTaint(taint, f, out);
      continue;
    }
    for (const k of kidsOf(n).toReversed()) todo.push(k);
  }
  return out;
};
