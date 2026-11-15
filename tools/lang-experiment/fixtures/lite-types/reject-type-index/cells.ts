// Index reads are T | undefined in lite's default mode (TypeScript's default strict mode says T).
let xs = () => [1, 2, 3];
let bad_index_arith = (xs) => xs[0] + 1;
let bad_index_param = () => (s: string) => s[0].length;
let ok_index_guarded = (xs) => (xs[0] ?? 0) + 1;
let ok_for_of = (xs) => { let t = 0; for (const x of xs) t += x; return t; };
