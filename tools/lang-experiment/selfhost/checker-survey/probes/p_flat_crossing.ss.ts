// outside: flatAst
// Can an AST cross the boundary as data if children are indices into a flat table (no recursive type)?
export type FId = { type: "Identifier"; start: number; end: number; name: string };
export type FBin = { type: "BinaryExpression"; start: number; end: number; operator: string; left: number; right: number };
export type FCall = { type: "CallExpression"; start: number; end: number; callee: number; arguments: number[]; optional: boolean };
export type FNode = FId | FBin | FCall;
export const countIds = (flatAst: FNode[]) => {
  let n = 0;
  for (const x of flatAst) if (x.type === "Identifier") n++;
  return n;
};
export const calleeName = (flatAst: FNode[]) => (i: number): string => {
  const x = flatAst[i];
  if (!x || x.type !== "CallExpression") return "";
  const c = flatAst[x.callee];
  return c && c.type === "Identifier" ? c.name : "";
};
