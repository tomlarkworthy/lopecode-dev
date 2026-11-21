// D1: an arrow whose block body only throws, typed by context, is inferred as returning void and then rejected.
// TypeScript accepts both cells (a body that cannot complete returns never). Expected: ok, ok.
export type F = (x: number) => string;
export const contextual = (): F => (x) => { throw new Error("stub"); };
export const annotated = () => (x: number): string => { throw new Error("stub"); };
