// D2: a discriminant read through ?. does not narrow (gap G1), and the one failed read is reported once per union
// member that lacks the property: here 3 [no-member] lines for one expression. In lite/facts.ts cellsOf over the
// typed AST (~95 members) it is 157 lines for two expressions (out/results/p_small.txt).
export type U = { type: "A"; a: number } | { type: "B" } | { type: "C" } | { type: "D" };
export const read = () => (d: U | null): number => (d?.type === "A" ? d.a : 0);
