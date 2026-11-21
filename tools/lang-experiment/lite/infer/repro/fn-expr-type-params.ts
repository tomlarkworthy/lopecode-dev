// Fixed 2026-11-21: a function expression with type parameters came through the typed tree as Other (no typeParameters field).
export const id = () => function <T>(x: T): T { return x; };
export const pick = () => function <T>(xs: T[], d: T): T { const y: T = d; return xs[0] ?? y; };
