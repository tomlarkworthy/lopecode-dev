// erase.ts has no TSTypeAssertion case: the type is cut and "<>" left, "const f = (x) => <>x;", which does not parse.
// comment-types.ts has the case. The tc port reproduces erase.ts.
const f = (x: unknown) => <number>x;
