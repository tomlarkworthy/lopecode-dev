// A function expression with type parameters: parse.ts keeps them on the node, the typed tree has no field for them.
export const id = () => function <T>(x: T): T { return x; };
export const pick = () => function <T>(xs: T[], d: T): T { const y: T = d; return xs[0] ?? y; };
