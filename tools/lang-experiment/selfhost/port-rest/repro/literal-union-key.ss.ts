// boundary.ts shapeOf: case "num": case "str": ... return { k: t.k }
export type K = { readonly k: "num" } | { readonly k: "str" };
export const same = () => (k: "num" | "str"): K => ({ k });
