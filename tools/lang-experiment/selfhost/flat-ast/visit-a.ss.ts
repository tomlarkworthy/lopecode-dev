// Layout A visitors: the module shape and syntax pass of lite/core.ts, the capture walk of lite/capture.ts (captures,
// refs, bound, declaredIn) and parse.ts line/leading, over the flat table of ast-a.ss.ts. A node is its row index.
// Checked with ast-a.ss.ts and lite/messages.ss.ts in front (diff.ts); messages.ss.ts gives reservedName,
// RESERVED_MSG and viewofInputName.

// parse.ts line: the line of a source position
export const lineOf = () => (lineStarts: number[], pos: number): number => {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if ((lineStarts[m] ?? 0) <= pos) lo = m; else hi = m - 1;
  }
  return lo + 1;
};
// parse.ts leading: the comments separated from the node at start (and from each other) only by whitespace
export const leading = () => (ast: FlatAst, start: number): Comment[] => {
  const out: Mut<Comment[]> = mut([]);
  let at = start;
  for (let i = ast.comments.length - 1; i >= 0; i--) {
    const c = ast.comments[i];
    if (!c || c.end > at) continue;
    if (ast.src.slice(c.end, at).trim() !== "") break;
    out.unshift(c);
    at = c.start;
  }
  return freeze(out);
};
// the node type as acorn names it (an Other row keeps it in kind)
export const kindOf = () => (n: FNode): string => (n.type === "Other" ? n.kind : n.type);

// module shape (core.ts checkSources, the cells.ts module level). at: the row the message is about
export type ModErr = { at: number; rule: string; msg: string };
export type CellDef = { name: string; fn: number; stmt: number };
// the declaration a statement holds: `export const x = …` holds its const
export const declOf = () => (nodes: FNode[], st: number): number => {
  const s = nodes[st];
  return s && s.type === "ExportNamedDeclaration" && s.declaration !== null ? s.declaration : st;
};
// a type or interface with a built-in type's name (it is not loaded: the cells read the built-in)
export const typeClash = (declOf) => (nodes: FNode[], st: number, builtin: Set<string>): ModErr[] => {
  const d = nodes[declOf(nodes, st)];
  if (!d || (d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration")) return [];
  const id = nodes[d.id];
  if (!id || id.type !== "Identifier" || !builtin.has(id.name)) return [];
  const what = d.type === "TSInterfaceDeclaration" ? "interface" : "type";
  return [{ at: declOf(nodes, st), rule: "builtin-type-name", msg: `${id.name} is a built-in type; give this ${what} another name` }];
};
// Registry.load(typesOnly): a type or interface, exported or not, is not a statement the cell loop sees
export const isTypeStatement = (declOf) => (nodes: FNode[], st: number): boolean => {
  const d = nodes[declOf(nodes, st)];
  return !!d && (d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration");
};
// a const or let declarator: a cell when it binds a name to a function
export const declaratorCell = () => (nodes: FNode[], x: number, st: number): { cells: CellDef[]; errors: ModErr[] } => {
  const v = nodes[x];
  if (!v || v.type !== "VariableDeclarator") return { cells: [], errors: [] };
  const id = nodes[v.id], init = v.init === null ? undefined : nodes[v.init];
  const isFn = !!init && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression");
  if (id && id.type === "Identifier" && isFn && v.init !== null) return { cells: [{ name: id.name, fn: v.init, stmt: st }], errors: [] };
  return { cells: [], errors: [{ at: x, rule: "cell-not-function", msg: `${id && id.type === "Identifier" ? id.name : "?"} is not a function` }] };
};
// the rule for a statement that is not a cell
export const moduleLevelRule = () => (d: FNode, st: FNode): string | null => {
  if (st.type === "ImportDeclaration" && st.importKind === "type") return null;
  if (d.type === "TSEnumDeclaration") return "no-enum";
  if (d.type === "TSModuleDeclaration") return "no-namespace";
  if (d.type === "ClassDeclaration") return "no-class";
  return d.type === "VariableDeclaration" && d.kind === "var" ? "no-var" : "module-level";
};
// one statement the cell loop sees: its cells, or why it is not one
export type Found = { cells: CellDef[]; errors: ModErr[] };
export const statementCells = (declOf, declaratorCell, moduleLevelRule, kindOf) => (nodes: FNode[], st: number): Found => {
  const s = nodes[st], d = nodes[declOf(nodes, st)];
  if (!s || !d) return { cells: [], errors: [] };
  if (d.type === "FunctionDeclaration") {
    const id = d.id === null ? undefined : nodes[d.id];
    return { cells: id && id.type === "Identifier" ? [{ name: id.name, fn: declOf(nodes, st), stmt: st }] : [], errors: [] };
  }
  if (d.type === "VariableDeclaration" && d.kind !== "var" && d.declare !== true) {
    const found = d.declarations.map((x) => declaratorCell(nodes, x, st));
    return { cells: found.flatMap((f) => f.cells), errors: found.flatMap((f) => f.errors) };
  }
  const rule = moduleLevelRule(d, s);
  return { cells: [], errors: rule === null ? [] : [{ at: st, rule, msg: `${kindOf(d)} at module level` }] };
};
// the cells of a module and its module-level errors, in the order checkSources reports them
export const moduleShape = (typeClash, isTypeStatement, statementCells) => (nodes: FNode[], builtin: Set<string>, shellNames: Set<string>): Found => {
  const prog = nodes[0];
  if (!prog || prog.type !== "Program") return { cells: [], errors: [] };
  const found = prog.body.filter((st) => !isTypeStatement(nodes, st)).map((st) => statementCells(nodes, st));
  const cells = found.flatMap((f) => f.cells);
  const dups: Mut<ModErr[]> = mut([]);
  const seen: Mut<Set<string>> = mut(new Set());
  for (const c of cells) {
    if (seen.has(c.name) || shellNames.has(c.name)) dups.push({ at: c.stmt, rule: "duplicate-cell", msg: `cell ${c.name} defined twice` });
    seen.add(c.name);
  }
  return { cells, errors: [...prog.body.flatMap((st) => typeClash(nodes, st, builtin)), ...found.flatMap((f) => f.errors), ...freeze(dups)] };
};

// syntax pass (core.ts syntaxPass): one list of what the walk reports, unsup for what it calls unsupported
export type Diag = { at: number; rule: string; msg: string; unsup: boolean };
export const SYNTAX = () => new Map<string, string>([["ThisExpression", "no-this"], ["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"],
  ["TSAnyKeyword", "no-any"], ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"],
  ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]);
export const TYPE_POSITIONS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
// for each row of the subtree at root (by offset from root): whether a field between root and it is a type position
export const typeRows = (TYPE_POSITIONS) => (nodes: FNode[], root: number): boolean[] => {
  const r = nodes[root];
  const out: Mut<boolean[]> = mut([]);
  for (let i = root; r && i < r.after; i++) {
    const x = nodes[i];
    out.push(!!x && i > root && ((out[x.parent - root] ?? false) || TYPE_POSITIONS.has(x.field)));
  }
  return freeze(out);
};
// x is a member's property or an object literal's key, not computed (the walk's root has no parent)
export const namedByParent = () => (nodes: FNode[], i: number, root: number): boolean => {
  const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent];
  if (p && p.type === "MemberExpression") return !p.computed && p.property === i;
  return !!p && p.type === "Property" && !p.computed && p.key === i && p.value !== i;
};
// `arguments` is allowed as a member's name or an object literal's key (computed or not)
export const argumentsAsName = () => (nodes: FNode[], i: number, root: number): boolean => {
  const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent];
  if (p && p.type === "MemberExpression") return p.property === i && !p.computed;
  return !!p && p.type === "Property" && p.key === i;
};
// `as const` is not a cast
export const isAsConst = () => (nodes: FNode[], x: TSAsExpression): boolean => {
  const t = nodes[x.typeAnnotation];
  const n = t && t.type === "TSTypeReference" ? nodes[t.typeName] : undefined;
  return !!n && n.type === "Identifier" && n.name === "const";
};
export const reservedAt = (reservedName, RESERVED_MSG, viewofInputName, namedByParent) => (nodes: FNode[], i: number, root: number, inType: boolean): Diag[] => {
  const x = nodes[i];
  const bad = !!x && x.type === "Identifier" && !inType && reservedName(x.name) && !(namedByParent(nodes, i, root) && !viewofInputName(x.name));
  return bad && x && x.type === "Identifier" ? [{ at: i, rule: "reserved-name", msg: RESERVED_MSG(x.name), unsup: false }] : [];
};
export const argumentsAt = (argumentsAsName) => (nodes: FNode[], i: number, root: number): Diag[] => {
  const x = nodes[i];
  return x && x.type === "Identifier" && x.name === "arguments" && !argumentsAsName(nodes, i, root) ? [{ at: i, rule: "no-arguments", msg: "arguments", unsup: false }] : [];
};
// what the walk reports at one row, in the original's order
export const bansAt = (SYNTAX, reservedAt, argumentsAt, isAsConst, kindOf) => (nodes: FNode[], i: number, root: number, inType: boolean): Diag[] => {
  const x = nodes[i];
  if (!x) return [];
  const r = SYNTAX.get(kindOf(x));
  return [
    ...reservedAt(nodes, i, root, inType),
    ...(r !== undefined ? [{ at: i, rule: r, msg: kindOf(x), unsup: false }] : []),
    ...(x.type === "TSAsExpression" && !isAsConst(nodes, x) ? [{ at: i, rule: "no-cast", msg: "as cast", unsup: false }] : []),
    ...(x.type === "TSSatisfiesExpression" ? [{ at: i, rule: "unsupported", msg: "satisfies", unsup: true }] : []),
    ...(x.type === "VariableDeclaration" && x.kind === "var" ? [{ at: i, rule: "no-var", msg: "var", unsup: false }] : []),
    ...argumentsAt(nodes, i, root),
  ];
};
// the walk: every row of the subtree, in order
export const syntaxPass = (typeRows, bansAt) => (nodes: FNode[], root: number): Diag[] => {
  const inType = typeRows(nodes, root);
  return inType.flatMap((t, k) => bansAt(nodes, root + k, root, t));
};

// capture walk (capture.ts captures). A capture: the identifier row, its name and why it depends on state
export type Capture = { at: number; name: string; why: string };
export const isActionCall = () => (nodes: FNode[], i: number): boolean => {
  const n = nodes[i], c = n && n.type === "CallExpression" ? nodes[n.callee] : undefined;
  return !!c && c.type === "Identifier" && c.name === "action";
};
// an identifier that reads a binding: not a property name, key, label or the walk's root's parent's business
export const readsBinding = () => (nodes: FNode[], i: number, root: number): boolean => {
  const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent];
  if (!x || !p) return true;
  if (p.type === "MemberExpression" && x.field === "property" && !p.computed) return false;
  if ((p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") && x.field === "key" && !p.computed) return false;
  return p.type !== "LabeledStatement" && p.type !== "BreakStatement" && p.type !== "ContinueStatement";
};
// refs: the identifier rows under root that read a binding, type positions skipped
export const refs = (typeRows, readsBinding) => (nodes: FNode[], root: number): number[] =>
  typeRows(nodes, root).flatMap((inType, k) => {
    const x = nodes[root + k];
    return !inType && x && x.type === "Identifier" && readsBinding(nodes, root + k, root) ? [root + k] : [];
  });
// bound: the names a pattern binds
export const bound = () => (nodes: FNode[], p: number | null): string[] => {
  const names = (i: number | null): string[] => {
    const n = i === null ? undefined : nodes[i];
    if (!n) return [];
    if (n.type === "Identifier") return [n.name];
    if (n.type === "ObjectPattern") return n.properties.flatMap((q) => { const r = nodes[q]; return r && r.type === "RestElement" ? names(r.argument) : r && r.type === "Property" ? names(r.value) : []; });
    if (n.type === "ArrayPattern") return n.elements.flatMap((q) => names(q));
    if (n.type === "RestElement") return names(n.argument);
    if (n.type === "AssignmentPattern") return names(n.left);
    return n.type === "TSParameterProperty" ? names(n.parameter) : [];
  };
  return names(p);
};
// the names one row declares, for declaredIn
export const declares = (bound) => (nodes: FNode[], i: number): string[] => {
  const n = nodes[i];
  if (!n) return [];
  const id = (j: number | null): string[] => { const x = j === null ? undefined : nodes[j]; return x && x.type === "Identifier" ? [x.name] : []; };
  return [
    ...(n.type === "VariableDeclarator" ? bound(nodes, n.id) : []),
    ...((n.type === "FunctionDeclaration" || n.type === "FunctionExpression") ? id(n.id) : []),
    ...(n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration" ? n.params.flatMap((q) => bound(nodes, q)) : []),
    ...(n.type === "CatchClause" ? bound(nodes, n.param) : []),
    ...(n.type === "ClassDeclaration" ? id(n.id) : []),
  ];
};
// declaredIn: every name declared inside fn (its parameters, locals, nested functions' names and parameters)
export const declaredIn = (bound, declares, typeRows) => (nodes: FNode[], fn: number): Set<string> => {
  const f = nodes[fn];
  if (!f || (f.type !== "ArrowFunctionExpression" && f.type !== "FunctionExpression" && f.type !== "FunctionDeclaration")) return new Set();
  const inBody = typeRows(nodes, f.body).flatMap((inType, k) => (inType ? [] : declares(nodes, f.body + k)));
  return new Set([...f.params.flatMap((p) => bound(nodes, p)), ...inBody]);
};
// the rows under root outside type positions and outside every action(...) call (the call itself is kept)
export const outsideActions = (typeRows, isActionCall) => (nodes: FNode[], root: number): number[] => {
  const inType = typeRows(nodes, root);
  const out: Mut<number[]> = mut([]);
  for (let i = root; i < root + inType.length; ) {
    const x = nodes[i];
    if (!x || inType[i - root] === true) { i++; continue; }
    out.push(i);
    i = isActionCall(nodes, i) ? x.after : i + 1;
  }
  return freeze(out);
};
// a const or function of the cell, outside any action body, and what it is computed from
export type Local = { names: string[]; from: number };
export const localOf = (bound) => (nodes: FNode[], i: number): Local[] => {
  const n = nodes[i];
  if (n && n.type === "VariableDeclarator" && n.init !== null) return [{ names: bound(nodes, n.id), from: n.init }];
  const id = n && n.type === "FunctionDeclaration" && n.id !== null ? nodes[n.id] : undefined;
  return n && n.type === "FunctionDeclaration" && id && id.type === "Identifier" ? [{ names: [id.name], from: n.body }] : [];
};
// the taint to a fixpoint: a local computed from a tainted name is tainted
export const spreadTaint = (refs) => (nodes: FNode[], locals: Local[], tainted: Map<string, string>): Map<string, string> => {
  const taint: Mut<Map<string, string>> = mut(new Map(tainted));
  const nameAt = (r: number): string => { const x = nodes[r]; return x && x.type === "Identifier" ? x.name : ""; };
  // a callback reading taint would capture the Mut ([mut-capture]), so the every and find are loops
  const firstTainted = (rs: number[]): number | null => { for (const r of rs) if (taint.has(nameAt(r))) return r; return null; };
  const allTainted = (names: string[]): boolean => { for (const x of names) if (!taint.has(x)) return false; return true; };
  for (let changed = true; changed; ) {
    changed = false;
    for (const l of locals) {
      if (allTainted(l.names)) continue;
      const hit = firstTainted(refs(nodes, l.from));
      if (hit === null) continue;
      for (const x of l.names) if (!taint.has(x)) { taint.set(x, `computed from ${nameAt(hit)}`); changed = true; }
    }
  }
  return freeze(taint);
};
// the tainted names one action(fn) call's fn uses from outside itself
export const actionCaptures = (refs, declaredIn) => (nodes: FNode[], call: number, taint: Map<string, string>): Capture[] => {
  const c = nodes[call], fi = c && c.type === "CallExpression" ? c.arguments[0] : undefined;
  const f = fi === undefined ? undefined : nodes[fi];
  if (fi === undefined || !f || (f.type !== "ArrowFunctionExpression" && f.type !== "FunctionExpression" && f.type !== "FunctionDeclaration")) return [];
  const own = declaredIn(nodes, fi);
  const hit = (r: number): Capture[] => { const x = nodes[r], why = x && x.type === "Identifier" ? taint.get(x.name) : undefined; return x && x.type === "Identifier" && why !== undefined && !own.has(x.name) ? [{ at: r, name: x.name, why }] : []; };
  // the first use of each name in the body
  const inBody = refs(nodes, f.body).flatMap(hit);
  const firstUse = inBody.filter((h, k) => inBody.findIndex((o) => o.name === h.name) === k);
  return [...firstUse, ...f.params.flatMap((p) => refs(nodes, p).flatMap(hit))];
};
export const captures = (outsideActions, localOf, spreadTaint, isActionCall, actionCaptures) => (nodes: FNode[], cellFn: number, tainted: Map<string, string>): Capture[] => {
  const f = nodes[cellFn];
  if (!f || (f.type !== "ArrowFunctionExpression" && f.type !== "FunctionExpression" && f.type !== "FunctionDeclaration")) return [];
  const rows = outsideActions(nodes, f.body);
  const taint = spreadTaint(nodes, rows.flatMap((i) => (isActionCall(nodes, i) ? [] : localOf(nodes, i))), tainted);
  if (!taint.size) return [];
  return rows.flatMap((i) => (isActionCall(nodes, i) ? actionCaptures(nodes, i, taint) : []));
};
