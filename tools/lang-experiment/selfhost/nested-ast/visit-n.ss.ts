// Nested-tree visitors: the module shape and syntax pass of lite/core.ts, the capture walk of lite/capture.ts
// (captures, refs, bound, declaredIn) and parse.ts line/leading, over the nested tree of ast-n.ss.ts. A node is the
// node; where the original compares two nodes with ===, the port compares their nid. Checked with ast-n.ss.ts,
// kids-n.ss.ts (childrenOf) and lite/messages.ss.ts in front (check.ts); the tree arrives from an outside cell.

// the parse, as the outside cell nestedParse delivers it (crossed: checked against NParse, frozen copy)
export const parsed = (nestedParse: NParse): NestedAst | null => (nestedParse.ok ? nestedParse.ast : null);

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
export const leading = () => (ast: NestedAst, start: number): Comment[] => {
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
// the node type as acorn names it (an Other node keeps it in kind)
export const kindOf = () => (n: AstNode): string => (n.type === "Other" ? n.kind : n.type);
export type FnNode = ArrowFunctionExpression | FunctionExpression | FunctionDeclaration;

// module shape (core.ts checkSources, the cells.ts module level)
export type ModErr = { at: AstNode; rule: string; msg: string };
export type CellDef = { name: string; fn: FnNode; stmt: AstNode };
export type Found = { cells: CellDef[]; errors: ModErr[] };
// the declaration a statement holds: `export const x = …` holds its const
export const declOf = () => (st: AstNode): AstNode => (st.type === "ExportNamedDeclaration" && st.declaration !== null ? st.declaration : st);
// a type or interface with a built-in type's name (it is not loaded: the cells read the built-in)
export const typeClash = (declOf) => (st: AstNode, builtin: Set<string>): ModErr[] => {
  const d = declOf(st);
  if (d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") return [];
  const id = d.id;
  if (id.type !== "Identifier" || !builtin.has(id.name)) return [];
  return [{ at: d, rule: "builtin-type-name", msg: `${id.name} is a built-in type; give this ${d.type === "TSInterfaceDeclaration" ? "interface" : "type"} another name` }];
};
// Registry.load(typesOnly): a type or interface, exported or not, is not a statement the cell loop sees
export const isTypeStatement = (declOf) => (st: AstNode): boolean => {
  const d = declOf(st);
  return d.type === "TSTypeAliasDeclaration" || d.type === "TSInterfaceDeclaration";
};
// a const or let declarator: a cell when it binds a name to a function
export const declaratorCell = () => (x: AstNode, st: AstNode): Found => {
  if (x.type !== "VariableDeclarator") return { cells: [], errors: [] };
  const id = x.id, init = x.init;
  if (id.type === "Identifier" && init !== null && (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression")) return { cells: [{ name: id.name, fn: init, stmt: st }], errors: [] };
  return { cells: [], errors: [{ at: x, rule: "cell-not-function", msg: `${id.type === "Identifier" ? id.name : "?"} is not a function` }] };
};
// the rule for a statement that is not a cell
export const moduleLevelRule = () => (d: AstNode, st: AstNode): string | null => {
  if (st.type === "ImportDeclaration" && st.importKind === "type") return null;
  if (d.type === "TSEnumDeclaration") return "no-enum";
  if (d.type === "TSModuleDeclaration") return "no-namespace";
  if (d.type === "ClassDeclaration") return "no-class";
  return d.type === "VariableDeclaration" && d.kind === "var" ? "no-var" : "module-level";
};
// one statement the cell loop sees: its cells, or why it is not one
export const statementCells = (declOf, declaratorCell, moduleLevelRule, kindOf) => (st: AstNode): Found => {
  const d = declOf(st);
  if (d.type === "FunctionDeclaration") {
    const id = d.id;
    return { cells: id.type === "Identifier" ? [{ name: id.name, fn: d, stmt: st }] : [], errors: [] };
  }
  if (d.type === "VariableDeclaration" && d.kind !== "var" && d.declare !== true) {
    const found = d.declarations.map((x) => declaratorCell(x, st));
    return { cells: found.flatMap((f) => f.cells), errors: found.flatMap((f) => f.errors) };
  }
  const rule = moduleLevelRule(d, st);
  return { cells: [], errors: rule === null ? [] : [{ at: st, rule, msg: `${kindOf(d)} at module level` }] };
};
// the cells of a module and its module-level errors, in the order checkSources reports them
export const moduleShape = (typeClash, isTypeStatement, statementCells) => (prog: AstNode, builtin: Set<string>, shellNames: Set<string>): Found => {
  if (prog.type !== "Program") return { cells: [], errors: [] };
  const found = prog.body.filter((st) => !isTypeStatement(st)).map((st) => statementCells(st));
  const cells = found.flatMap((f) => f.cells);
  const dups: Mut<ModErr[]> = mut([]);
  const seen: Mut<Set<string>> = mut(new Set());
  for (const c of cells) {
    if (seen.has(c.name) || shellNames.has(c.name)) dups.push({ at: c.stmt, rule: "duplicate-cell", msg: `cell ${c.name} defined twice` });
    seen.add(c.name);
  }
  return { cells, errors: [...prog.body.flatMap((st) => typeClash(st, builtin)), ...found.flatMap((f) => f.errors), ...freeze(dups)] };
};

// syntax pass (core.ts syntaxPass): one list of what the walk reports, unsup for what it calls unsupported
export type Diag = { at: AstNode; rule: string; msg: string; unsup: boolean };
export const SYNTAX = () => new Map<string, string>([["ThisExpression", "no-this"], ["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"],
  ["TSAnyKeyword", "no-any"], ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"],
  ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]);
export const TYPE_POSITIONS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
// x is a member's property or an object literal's key, not computed
export const namedByParent = () => (x: AstNode, p: AstNode | null): boolean => {
  if (p !== null && p.type === "MemberExpression") return !p.computed && p.property.nid === x.nid;
  return p !== null && p.type === "Property" && !p.computed && p.key.nid === x.nid && p.value.nid !== x.nid;
};
// `arguments` is allowed as a member's name or an object literal's key (computed or not)
export const argumentsAsName = () => (x: AstNode, p: AstNode | null): boolean => {
  if (p !== null && p.type === "MemberExpression") return p.property.nid === x.nid && !p.computed;
  return p !== null && p.type === "Property" && p.key.nid === x.nid;
};
// `as const` is not a cast
export const isAsConst = () => (x: TSAsExpression): boolean => {
  const t = x.typeAnnotation;
  const n = t.type === "TSTypeReference" ? t.typeName : null;
  return n !== null && n.type === "Identifier" && n.name === "const";
};
// what the walk reports at one node, in the original's order
export const bansAt = (SYNTAX, reservedName, RESERVED_MSG, viewofInputName, namedByParent, argumentsAsName, isAsConst, kindOf) => (x: AstNode, p: AstNode | null, inType: boolean): Diag[] => {
  const r = SYNTAX.get(kindOf(x));
  const reserved = x.type === "Identifier" && !inType && reservedName(x.name) && !(namedByParent(x, p) && !viewofInputName(x.name));
  return [
    ...(reserved && x.type === "Identifier" ? [{ at: x, rule: "reserved-name", msg: RESERVED_MSG(x.name), unsup: false }] : []),
    ...(r !== undefined ? [{ at: x, rule: r, msg: kindOf(x), unsup: false }] : []),
    ...(x.type === "TSAsExpression" && !isAsConst(x) ? [{ at: x, rule: "no-cast", msg: "as cast", unsup: false }] : []),
    ...(x.type === "TSSatisfiesExpression" ? [{ at: x, rule: "unsupported", msg: "satisfies", unsup: true }] : []),
    ...(x.type === "VariableDeclaration" && x.kind === "var" ? [{ at: x, rule: "no-var", msg: "var", unsup: false }] : []),
    ...(x.type === "Identifier" && x.name === "arguments" && !argumentsAsName(x, p) ? [{ at: x, rule: "no-arguments", msg: "arguments", unsup: false }] : []),
  ];
};
// the walk: every node under root in acorn's key order, with its parent and whether it is in a type position
export const syntaxPass = (childrenOf, bansAt, TYPE_POSITIONS) => (root: AstNode): Diag[] => {
  const out: Mut<Diag[]> = mut([]);
  const walk = (x: AstNode, p: AstNode | null, inType: boolean): void => {
    for (const d of bansAt(x, p, inType)) out.push(d);
    for (const c of childrenOf(x)) walk(c.node, x, inType || TYPE_POSITIONS.has(c.key));
  };
  walk(root, null, false);
  return freeze(out);
};

// capture walk (capture.ts captures). A capture: the identifier, its name and why it depends on state
export type Capture = { node: Identifier; name: string; why: string };
export const isActionCall = () => (n: AstNode): boolean => n.type === "CallExpression" && n.callee.type === "Identifier" && n.callee.name === "action";
// parse.ts kids: the children in source order, type positions left out
export const kids = (childrenOf, TYPE_POSITIONS) => (n: AstNode): AstNode[] =>
  childrenOf(n).filter((c) => !TYPE_POSITIONS.has(c.key)).map((c) => c.node).toSorted((a, b) => a.start - b.start);
// an identifier under p at key reads a binding: not a property name, key or label
export const readsBinding = () => (p: AstNode | null, key: string): boolean => {
  if (p === null) return true;
  if (p.type === "MemberExpression" && key === "property" && !p.computed) return false;
  if ((p.type === "Property" || p.type === "MethodDefinition" || p.type === "PropertyDefinition") && key === "key" && !p.computed) return false;
  return p.type !== "LabeledStatement" && p.type !== "BreakStatement" && p.type !== "ContinueStatement";
};
// refs: the identifiers under root that read a binding, type positions and JSX names skipped
export const refs = (childrenOf, TYPE_POSITIONS, readsBinding) => (root: AstNode): Identifier[] => {
  const out: Mut<Identifier[]> = mut([]);
  const walk = (n: AstNode, p: AstNode | null, key: string): void => {
    if (n.type === "Identifier") { if (readsBinding(p, key)) out.push(n); return; }
    if (n.type === "JSXIdentifier") return;
    for (const c of childrenOf(n)) if (!TYPE_POSITIONS.has(c.key)) walk(c.node, n, c.key);
  };
  walk(root, null, "");
  return freeze(out);
};
// bound: the names a pattern binds
export const bound = () => (p: AstNode | null): string[] => {
  const names = (n: AstNode | null): string[] => {
    if (n === null) return [];
    switch (n.type) {
      case "Identifier": return [n.name];
      case "ObjectPattern": return n.properties.flatMap((q) => (q.type === "RestElement" ? names(q.argument) : q.type === "Property" ? names(q.value) : []));
      case "ArrayPattern": return n.elements.flatMap((q) => names(q));
      case "RestElement": return names(n.argument);
      case "AssignmentPattern": return names(n.left);
      case "TSParameterProperty": return names(n.parameter);
      default: return [];
    }
  };
  return names(p);
};
// declaredIn: every name declared inside fn (its parameters, locals, nested functions' names and parameters)
export const declaredIn = (bound, kids) => (fn: FnNode): Set<string> => {
  const out: Mut<Set<string>> = mut(new Set());
  const add = (xs: string[]): void => { for (const x of xs) out.add(x); };
  const idName = (n: AstNode | null): string[] => (n !== null && n.type === "Identifier" ? [n.name] : []);
  for (const p of fn.params) add(bound(p));
  const walk = (n: AstNode): void => {
    if (n.type === "VariableDeclarator") add(bound(n.id));
    if (n.type === "FunctionDeclaration" || n.type === "FunctionExpression") add(idName(n.id));
    if (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression" || n.type === "FunctionDeclaration") for (const p of n.params) add(bound(p));
    if (n.type === "CatchClause") add(bound(n.param));
    if (n.type === "ClassDeclaration") add(idName(n.id));
    for (const k of kids(n)) walk(k);
  };
  walk(fn.body);
  return freeze(out);
};
// a const or function of the cell, outside any action call, and what it is computed from
export type Local = { names: string[]; from: AstNode };
export const localsOf = (kids, isActionCall, bound) => (body: AstNode): Local[] => {
  const out: Mut<Local[]> = mut([]);
  const walk = (n: AstNode): void => {
    if (isActionCall(n)) return;
    if (n.type === "VariableDeclarator" && n.init !== null) out.push({ names: bound(n.id), from: n.init });
    if (n.type === "FunctionDeclaration" && n.id.type === "Identifier") out.push({ names: [n.id.name], from: n.body });
    for (const k of kids(n)) walk(k);
  };
  walk(body);
  return freeze(out);
};
// the taint to a fixpoint: a local computed from a tainted name is tainted
export const spreadTaint = (refs) => (locals: Local[], tainted: Map<string, string>): Map<string, string> => {
  const taint: Mut<Map<string, string>> = mut(new Map(tainted));
  // a callback reading taint would capture the Mut ([mut-capture]), so the every and find are loops
  const firstTainted = (rs: Identifier[]): Identifier | null => { for (const r of rs) if (taint.has(r.name)) return r; return null; };
  const allTainted = (names: string[]): boolean => { for (const x of names) if (!taint.has(x)) return false; return true; };
  for (let changed = true; changed; ) {
    changed = false;
    for (const l of locals) {
      if (allTainted(l.names)) continue;
      const hit = firstTainted(refs(l.from));
      if (hit === null) continue;
      for (const x of l.names) if (!taint.has(x)) { taint.set(x, `computed from ${hit.name}`); changed = true; }
    }
  }
  return freeze(taint);
};
// the tainted names one action(fn) call's fn uses from outside itself: the first use of each in the body, then every
// use in its parameters
export const actionUses = (refs, declaredIn) => (call: CallExpression, taint: Map<string, string>): Capture[] => {
  const f = call.arguments[0];
  if (f === undefined || (f.type !== "ArrowFunctionExpression" && f.type !== "FunctionExpression" && f.type !== "FunctionDeclaration")) return [];
  const own = declaredIn(f);
  const out: Mut<Capture[]> = mut([]);
  const seen: Mut<Set<string>> = mut(new Set());
  for (const r of refs(f.body)) {
    const why = taint.get(r.name);
    if (why !== undefined && !own.has(r.name) && !seen.has(r.name)) { seen.add(r.name); out.push({ node: r, name: r.name, why }); }
  }
  for (const p of f.params) for (const r of refs(p)) {
    const why = taint.get(r.name);
    if (why !== undefined && !own.has(r.name)) out.push({ node: r, name: r.name, why });
  }
  return freeze(out);
};
export const captures = (localsOf, spreadTaint, actionUses, isActionCall, kids) => (cellFn: FnNode, tainted: Map<string, string>): Capture[] => {
  const taint = spreadTaint(localsOf(cellFn.body), tainted);
  if (taint.size === 0) return [];
  const out: Mut<Capture[]> = mut([]);
  const walk = (n: AstNode): void => {
    if (n.type === "CallExpression" && isActionCall(n)) { for (const c of actionUses(n, taint)) out.push(c); return; }
    for (const k of kids(n)) walk(k);
  };
  walk(cellFn.body);
  return freeze(out);
};
