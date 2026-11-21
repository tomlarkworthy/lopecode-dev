// jsx/h.ts h, boundary.ts copy: Object.freeze of a value that is not a literal
export const fr = () => (x: { readonly a: number }) => Object.freeze(x);
