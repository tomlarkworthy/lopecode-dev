// The module level of core.ts checkSources (lines 63-152): the stand-in names, foreign.d.ts and shell.ts, the
// declarations, the cells and the module's errors, and the @ts-ignore comments.

// core.ts distinctNames, as syntax.ss.ts distinctParse, keeping where each name was declared again
export const mdDistinct = (parseTree, nameAt, standIn) => (src: string, jsx: boolean): { parse: Parse; text: string; dups: MdDup[] } => {
  let text = src;
  const dups: Mut<MdDup[]> = [];
  for (;;) {
    const p = parseTree(text, jsx);
    const name = p.ok || !p.message.includes("has already been declared") ? "" : nameAt(text, p.pos);
    const ph = p.ok || name === "" ? null : standIn(dups.length, name.length);
    if (p.ok || ph === null || dups.some((d) => d.ph === ph)) return { parse: p, text, dups: dups };
    dups.push({ ph, name: src.slice(p.pos, p.pos + name.length), pos: p.pos });
    text = text.slice(0, p.pos) + ph + text.slice(p.pos + name.length);
  }
};
// the tree of a text that must parse: checkSources throws the parser's error
export const mdMustParse = (parseTree) => (text: string, jsx: boolean): Ast => {
  const p = parseTree(text, jsx);
  if (!p.ok) throw new Error(p.message);
  return p.ast;
};
// shell.ts: the names it exports, a const or let declarator's or a function's
export const mdShellNames = (mdMustParse) => (text: string): Set<string> => {
  const out: Mut<Set<string>> = new Set();
  const prog = mdMustParse(text, false).program;
  if (prog.type !== "Program") return out;
  for (const st of prog.body) {
    const d = st.type === "ExportNamedDeclaration" ? st.declaration : null;
    if (d !== null && d.type === "VariableDeclaration") {
      for (const x of d.declarations) if (x.type === "VariableDeclarator" && x.id.type === "Identifier") out.add(x.id.name);
    } else if (d !== null && d.type === "FunctionDeclaration" && d.id.type === "Identifier") out.add(d.id.name);
  }
  return out;
};
// a registry report while foreign.d.ts or the user's declarations load: module-level, under core.ts's foreign.d.ts prefix
export const mdLoadErr = () => (r: MdReport): MdErr => ({ rule: r.rule, line: r.line, msg: `foreign.d.ts: ${r.msg}` });
export const mdForeignErrs = (mdLoadErr) => (F: MdForeign): MdErr[] => [
  ...F.reports.map(mdLoadErr),
  ...F.rest.map((r) => ({ rule: "module-level", line: r.line, msg: `foreign.d.ts: ${r.kind} is not a declaration` })),
  ...F.values.filter((v) => v.marker === null).map((v) => ({ rule: "foreign-unmarked", line: v.line, msg: `foreign ${v.name} has no /** pure */ or /** effect */` })),
];
// a comment that asks the checker to look away
export const mdTsIgnore = () => (text: string): boolean => text.includes("@ts-ignore") || text.includes("@ts-expect-error") || text.includes("@ts-nocheck");
export const MD_NO_TS_IGNORE = () => "@ts-ignore/@ts-expect-error/@ts-nocheck";
// each such comment: an error of the first cell whose statement holds it, else of the module
export const mdIgnores = (mdTsIgnore, MD_NO_TS_IGNORE) => (ast: Ast, defs: MdDef[], line: (pos: number) => number): { cell: Map<string, MdErr[]>; module: MdErr[] } => {
  const cell: Mut<Map<string, MdErr[]>> = new Map();
  const module: Mut<MdErr[]> = [];
  for (const cm of ast.comments) {
    if (!mdTsIgnore(cm.text)) continue;
    const c = defs.find((d) => d.stmt.start <= cm.start && cm.start < d.stmt.end);
    const e = { rule: "no-ts-ignore", line: line(cm.start), msg: MD_NO_TS_IGNORE };
    if (c === undefined) module.push(e);
    else cell.set(c.name, [...(cell.get(c.name) ?? []), e]);
  }
  return { cell: cell, module: module };
};
// errors at positions: each to the cell whose statement holds it, after what cell already has, else to the module
export const mdByCell = () => (defs: MdDef[], es: { at: number; e: MdErr }[], cell: Map<string, MdErr[]>): { cell: Map<string, MdErr[]>; module: MdErr[] } => {
  const out: Mut<Map<string, MdErr[]>> = new Map(cell), module: Mut<MdErr[]> = [];
  for (const x of es) {
    const d = defs.find((c) => c.stmt.start <= x.at && x.at < c.stmt.end);
    if (d === undefined) module.push(x.e);
    else out.set(d.name, [...(out.get(d.name) ?? []), x.e]);
  }
  return { cell: out, module };
};
// a cell's record before its check: the line of its statement and the errors made before the cell loop
export const mdFreshRec = () => (d: MdDef, line: number, errors: MdErr[]): MdCellRec => ({
  name: d.name, status: "ok", line, errors, unsupported: [], blockedBy: [], value: null, ch: [], chUnsup: [], casts: [], at: d.fn.start,
});
export type MdModuleLevel = { readonly defs: MdDef[]; readonly module: MdErr[]; readonly ignores: Map<string, MdErr[]> };
// the cells and the module's errors, in core.ts's order: foreign.d.ts, built-in type names, the user's declarations,
// statements that are not cells, duplicates, then the ignore comments with no cell
// t1 (B-1): each top-level type or interface statement that declares a member mdProtoMembers finds, once, at the statement
export const mdTypeProto = (mdProtoMembers, PROTO_MEMBER_MSG) => (prog: AstNode, proto: Set<string>): ModErr[] => {
  if (prog.type !== "Program") return [];
  const out: Mut<ModErr[]> = [];
  for (const st of prog.body) {
    const d = st.type === "ExportNamedDeclaration" && st.declaration !== null ? st.declaration : st;
    if (d.type !== "TSTypeAliasDeclaration" && d.type !== "TSInterfaceDeclaration") continue;
    const m = mdProtoMembers(d, proto)[0];
    if (m !== undefined) out.push({ at: d, rule: "banned-member", msg: PROTO_MEMBER_MSG(m.name, m.opt) });
  }
  return out;
};
export const mdModuleLevel = (moduleShape, mutPlaces, mdForeignErrs, mdLoadErr, mdIgnores, mdByCell, mdTypeProto) => (R: MdReg, ast: Ast, text: string, jsx: boolean, F: MdForeign | null, shellNames: Set<string>, line: (pos: number) => number): MdModuleLevel => {
  const shape = moduleShape(ast.program, R.builtin, shellNames);
  const modErr = (e: ModErr): MdErr => ({ rule: e.rule, line: line(e.at.start), msg: e.msg });
  // t1 (B-1): a type or interface declaring a banned member is a clash too: it is not loaded, so a cell that uses it is rejected
  const bad: ModErr[] = [...shape.clashes, ...mdTypeProto(ast.program, R.proto)];
  const clashes = bad.map(modErr);
  const user = R.loadUser(ast, jsx, bad.map((c) => c.at.start)).map(mdLoadErr);
  const defs: MdDef[] = shape.cells.map((c) => ({ name: c.name, fn: c.fn, stmt: c.stmt }));
  const ig = mdIgnores(ast, defs, line), mut = mdByCell(defs, mutPlaces(ast.program).map((e) => ({ at: e.at.start, e: modErr(e) })), ig.cell);
  return { defs, module: [...(F === null ? [] : mdForeignErrs(F)), ...clashes, ...user, ...shape.errors.map(modErr), ...ig.module, ...mut.module], ignores: mut.cell };
};
