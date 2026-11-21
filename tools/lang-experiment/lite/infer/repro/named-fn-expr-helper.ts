// own.ts bug, reproduced by the port: a const bound to a named function expression escapes, yet the Mut it
// captures is accepted. bindingOfFn keeps the last binding naming the function, the expression's own name g (declared
// inside fnExpr after f), and g has no references, so helper(fn) holds and [mut-capture] is not reported.
// escapes is rejected with [mut-capture]; named is accepted.
export const escapes = () => { const m = mut<number[]>([]); const f = () => { m.push(1); }; return f; };
export const named = () => { const m = mut<number[]>([]); const f = function g() { m.push(1); }; return f; };
