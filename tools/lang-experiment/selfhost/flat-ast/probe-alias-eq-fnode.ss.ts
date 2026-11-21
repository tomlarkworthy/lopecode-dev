// Probe, with ast-a.ss.ts in front: === on node kinds of FNode rows, and on a kind taken from an outside cell.
export type NodeKind = FNode["type"];
export const sameRowKind = () => (nodes: FNode[], a: number, b: number): boolean => {
  const x = nodes[a], y = nodes[b];
  return !!x && !!y && x.type === y.type;
};
export const rowIsKind = () => (nodes: FNode[], a: number, k: string): boolean => nodes[a]?.type === k;
export type Kind2 = "Identifier" | "Literal";
export const outsideKind = (kindFromJs: Kind2) => (n: FNode): boolean => n.type === kindFromJs;
export const sameIndex = () => (x: MemberExpression, i: number): boolean => x.property === i;
