// boundary.ts shapeOf: { error } told apart from a shape with in
export type A = { readonly k: "a" };
export const errOf = () => (x: A | { readonly error: string }): { readonly error: string } | null => ("error" in x ? x : null);
