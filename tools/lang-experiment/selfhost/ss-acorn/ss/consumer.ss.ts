// The first consumer of soundscript-acorn: the module shape and the syntax pass of lite/core.ts, ported in
// ../nested-ast/visit-n.ss.ts (copied from there, with kindOf, FnNode and TYPE_POSITIONS taken from the module instead:
// kindOf, FnNode, TYPE_KEYS). It takes the tree only through the module's checked cell parse.

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
export const syntaxPass = (childrenOf, bansAt, TYPE_KEYS) => (root: AstNode): Diag[] => {
  const out: Mut<Diag[]> = mut([]);
  const walk = (x: AstNode, p: AstNode | null, inType: boolean): void => {
    for (const d of bansAt(x, p, inType)) out.push(d);
    for (const c of childrenOf(x)) walk(c.node, x, inType || TYPE_KEYS.has(c.key));
  };
  walk(root, null, false);
  return freeze(out);
};

// core.ts distinctNames: a name declared twice is parsed again under a stand-in of the same length, up to 40^len
export type Distinct = { parse: Parse; text: string; dups: [string, string][]; parses: number };
// the identifier characters [A-Za-z0-9_$] from pos
export const nameAt = () => (text: string, pos: number): string => {
  let e = pos;
  for (let c = text.charCodeAt(e); c === 36 || c === 95 || (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122); c = text.charCodeAt(e)) e++;
  return text.slice(pos, e);
};
// the k-th stand-in of length len (Lisu letters, as core.ts STAND), or null when k needs more letters
export const STAND = () => "\uA4D0\uA4D1\uA4D2\uA4D3\uA4D4\uA4D5\uA4D6\uA4D7\uA4D8\uA4D9\uA4DA\uA4DB\uA4DC\uA4DD\uA4DE\uA4DF\uA4E0\uA4E1\uA4E2\uA4E3\uA4E4\uA4E5\uA4E6\uA4E7\uA4E8\uA4E9\uA4EA\uA4EB\uA4EC\uA4ED\uA4EE\uA4EF\uA4F0\uA4F1\uA4F2\uA4F3\uA4F4\uA4F5\uA4F6\uA4F7";
export const standIn = (STAND) => (k: number, len: number): string | null => {
  let ph = "", j = k;
  for (let i = 0; i < len; i++) { ph = STAND.charAt(j % 40) + ph; j = Math.floor(j / 40); }
  return j > 0 ? null : ph;
};
export const distinctParse = (parse, nameAt, standIn) => (src: string, jsx: boolean): Distinct => {
  let text = src;
  const dups: Mut<[string, string][]> = mut([]);
  for (let parses = 1; ; parses++) {
    const p = parse(text, jsx);
    const name = p.ok || !p.message.includes("has already been declared") ? "" : nameAt(text, p.pos);
    const ph = p.ok || name === "" ? null : standIn(dups.length, name.length);
    if (p.ok || ph === null || dups.some((d) => d[0] === ph)) return { parse: p, text, dups: freeze(dups), parses };
    dups.push([ph, src.slice(p.pos, p.pos + name.length)]);
    text = text.slice(0, p.pos) + ph + text.slice(p.pos + name.length);
  }
};
// a module's text checked for its shape and, per cell, the syntax pass; acorn's error as a value. A cell's name is
// given back with any stand-in replaced
export type Syntax = { ok: true; shape: Found; names: string[]; diags: Diag[][]; parses: number } | { ok: false; message: string; line: number };
export const syntaxCheck = (distinctParse, moduleShape, syntaxPass) => (text: string, jsx: boolean, builtin: Set<string>, shellNames: Set<string>): Syntax => {
  const d = distinctParse(text, jsx);
  const p = d.parse;
  if (!p.ok) return { ok: false, message: p.message, line: p.line };
  const shape = moduleShape(p.ast.program, builtin, shellNames);
  const names = shape.cells.map((c) => d.dups.reduce((n, [ph, name]) => n.split(ph).join(name), c.name));
  return { ok: true, shape, names, diags: shape.cells.map((c) => syntaxPass(c.fn)), parses: d.parses };
};
