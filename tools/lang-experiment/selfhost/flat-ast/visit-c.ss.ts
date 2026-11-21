// Layout C: the records of layout A (ast-a.ss.ts), with the table a cell (tree, from the outside cell flatParse)
// that each visitor cell takes as an input; calls pass row indices only. The syntax pass of lite/core.ts.
// Checked with ast-a.ss.ts and lite/messages.ss.ts in front and flatParse outside (check.ts).
// no return annotation: checking an annotated FNode[] return costs a union-to-union check (probe-tree-cost.ts)
export const tree = (flatParse: Parse) => (flatParse.ok ? flatParse.ast.nodes : []);
export type Diag = { at: number; rule: string; msg: string; unsup: boolean };
export const SYNTAX = () => new Map<string, string>([["ThisExpression", "no-this"], ["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"],
  ["TSAnyKeyword", "no-any"], ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"],
  ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]);
export const TYPE_POSITIONS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
// a row's node type as acorn names it; takes the index, since passing an unnarrowed row costs the union check
export const kindOf = (tree) => (i: number): string => { const n = tree[i]; return !n ? "" : n.type === "Other" ? n.kind : n.type; };
export const typeRows = (tree, TYPE_POSITIONS) => (root: number): boolean[] => {
  const r = tree[root];
  const out: Mut<boolean[]> = mut([]);
  for (let i = root; r && i < r.after; i++) {
    const x = tree[i];
    out.push(!!x && i > root && ((out[x.parent - root] ?? false) || TYPE_POSITIONS.has(x.field)));
  }
  return freeze(out);
};
export const namedByParent = (tree) => (i: number, root: number): boolean => {
  const x = tree[i], p = i === root || !x ? undefined : tree[x.parent];
  if (p && p.type === "MemberExpression") return !p.computed && p.property === i;
  return !!p && p.type === "Property" && !p.computed && p.key === i && p.value !== i;
};
export const argumentsAsName = (tree) => (i: number, root: number): boolean => {
  const x = tree[i], p = i === root || !x ? undefined : tree[x.parent];
  if (p && p.type === "MemberExpression") return p.property === i && !p.computed;
  return !!p && p.type === "Property" && p.key === i;
};
export const isAsConst = (tree) => (x: TSAsExpression): boolean => {
  const t = tree[x.typeAnnotation];
  const n = t && t.type === "TSTypeReference" ? tree[t.typeName] : undefined;
  return !!n && n.type === "Identifier" && n.name === "const";
};
export const reservedAt = (tree, reservedName, RESERVED_MSG, viewofInputName, namedByParent) => (i: number, root: number, inType: boolean): Diag[] => {
  const x = tree[i];
  const bad = !!x && x.type === "Identifier" && !inType && reservedName(x.name) && !(namedByParent(i, root) && !viewofInputName(x.name));
  return bad && x && x.type === "Identifier" ? [{ at: i, rule: "reserved-name", msg: RESERVED_MSG(x.name), unsup: false }] : [];
};
export const argumentsAt = (tree, argumentsAsName) => (i: number, root: number): Diag[] => {
  const x = tree[i];
  return x && x.type === "Identifier" && x.name === "arguments" && !argumentsAsName(i, root) ? [{ at: i, rule: "no-arguments", msg: "arguments", unsup: false }] : [];
};
export const bansAt = (tree, SYNTAX, reservedAt, argumentsAt, isAsConst, kindOf) => (i: number, root: number, inType: boolean): Diag[] => {
  const x = tree[i];
  if (!x) return [];
  const r = SYNTAX.get(kindOf(i));
  return [
    ...reservedAt(i, root, inType),
    ...(r !== undefined ? [{ at: i, rule: r, msg: kindOf(i), unsup: false }] : []),
    ...(x.type === "TSAsExpression" && !isAsConst(x) ? [{ at: i, rule: "no-cast", msg: "as cast", unsup: false }] : []),
    ...(x.type === "TSSatisfiesExpression" ? [{ at: i, rule: "unsupported", msg: "satisfies", unsup: true }] : []),
    ...(x.type === "VariableDeclaration" && x.kind === "var" ? [{ at: i, rule: "no-var", msg: "var", unsup: false }] : []),
    ...argumentsAt(i, root),
  ];
};
export const syntaxPass = (typeRows, bansAt) => (root: number): Diag[] => typeRows(root).flatMap((t, k) => bansAt(root + k, root, t));
