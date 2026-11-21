// Layout B: the syntax pass of lite/core.ts over generic rows (ast-b.ss.ts). A field is read by name: kid for a
// child, text and flag for the others. Checked with ast-b.ss.ts and lite/messages.ss.ts in front (check.ts).

// the child held in key (the first, for a list field), or null
export const kid = () => (r: Row, key: string): number | null => {
  const k = r.keys.indexOf(key);
  return k < 0 ? null : (r.kids[k] ?? null);
};
export const text = () => (r: Row, key: string): string | null => {
  for (const p of r.props) if (p.key === key) return typeof p.value === "string" ? p.value : null;
  return null;
};
export const flag = () => (r: Row, key: string): boolean => {
  for (const p of r.props) if (p.key === key) return p.value === true;
  return false;
};
export type Diag = { at: number; rule: string; msg: string; unsup: boolean };
export const SYNTAX = () => new Map<string, string>([["ThisExpression", "no-this"], ["ClassDeclaration", "no-class"], ["ClassExpression", "no-class"],
  ["TSAnyKeyword", "no-any"], ["TSNonNullExpression", "no-non-null"], ["ImportExpression", "no-dynamic-import"], ["TSEnumDeclaration", "no-enum"],
  ["TSModuleDeclaration", "no-namespace"], ["TSTypeAssertion", "no-cast"]]);
export const TYPE_POSITIONS = () => new Set(["typeAnnotation", "returnType", "typeParameters", "typeArguments"]);
export const typeRows = (TYPE_POSITIONS) => (nodes: Row[], root: number): boolean[] => {
  const r = nodes[root];
  const out: Mut<boolean[]> = mut([]);
  for (let i = root; r && i < r.after; i++) {
    const x = nodes[i];
    out.push(!!x && i > root && ((out[x.parent - root] ?? false) || TYPE_POSITIONS.has(x.field)));
  }
  return freeze(out);
};
export const namedByParent = (kid, flag) => (nodes: Row[], i: number, root: number): boolean => {
  const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent];
  if (!p || flag(p, "computed")) return false;
  if (p.type === "MemberExpression") return kid(p, "property") === i;
  return p.type === "Property" && kid(p, "key") === i && kid(p, "value") !== i;
};
export const argumentsAsName = (kid, flag) => (nodes: Row[], i: number, root: number): boolean => {
  const x = nodes[i], p = i === root || !x ? undefined : nodes[x.parent];
  if (p && p.type === "MemberExpression") return kid(p, "property") === i && !flag(p, "computed");
  return !!p && p.type === "Property" && kid(p, "key") === i;
};
export const isAsConst = (kid, text) => (nodes: Row[], x: Row): boolean => {
  const ti = kid(x, "typeAnnotation"), t = ti === null ? undefined : nodes[ti];
  const ni = t && t.type === "TSTypeReference" ? kid(t, "typeName") : null, n = ni === null ? undefined : nodes[ni];
  return !!n && n.type === "Identifier" && text(n, "name") === "const";
};
export const reservedAt = (reservedName, RESERVED_MSG, viewofInputName, namedByParent, text) => (nodes: Row[], i: number, root: number, inType: boolean): Diag[] => {
  const x = nodes[i], name = x && x.type === "Identifier" ? text(x, "name") : null;
  const bad = name !== null && !inType && reservedName(name) && !(namedByParent(nodes, i, root) && !viewofInputName(name));
  return bad && name !== null ? [{ at: i, rule: "reserved-name", msg: RESERVED_MSG(name), unsup: false }] : [];
};
export const argumentsAt = (argumentsAsName, text) => (nodes: Row[], i: number, root: number): Diag[] => {
  const x = nodes[i];
  return x && x.type === "Identifier" && text(x, "name") === "arguments" && !argumentsAsName(nodes, i, root) ? [{ at: i, rule: "no-arguments", msg: "arguments", unsup: false }] : [];
};
export const bansAt = (SYNTAX, reservedAt, argumentsAt, isAsConst, text) => (nodes: Row[], i: number, root: number, inType: boolean): Diag[] => {
  const x = nodes[i];
  if (!x) return [];
  const r = SYNTAX.get(x.type);
  return [
    ...reservedAt(nodes, i, root, inType),
    ...(r !== undefined ? [{ at: i, rule: r, msg: x.type, unsup: false }] : []),
    ...(x.type === "TSAsExpression" && !isAsConst(nodes, x) ? [{ at: i, rule: "no-cast", msg: "as cast", unsup: false }] : []),
    ...(x.type === "TSSatisfiesExpression" ? [{ at: i, rule: "unsupported", msg: "satisfies", unsup: true }] : []),
    ...(x.type === "VariableDeclaration" && text(x, "kind") === "var" ? [{ at: i, rule: "no-var", msg: "var", unsup: false }] : []),
    ...argumentsAt(nodes, i, root),
  ];
};
export const syntaxPass = (typeRows, bansAt) => (nodes: Row[], root: number): Diag[] => {
  const inType = typeRows(nodes, root);
  return inType.flatMap((t, k) => bansAt(nodes, root + k, root, t));
};
