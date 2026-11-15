// Wrong argument types, arity, and a callback whose parameter type does not fit.
let add = () => (a: number, b: number) => a + b;
let bad_arg = (add) => add(1, "2");
let bad_arity = (add) => add(1);
let bad_callback = () => ["a", "b"].map((s: number) => s + 1);
let bad_method_arg = () => "abc".startsWith(1);
let ok_calls = (add) => add(1, 2) + (["a"].map((s) => s.length)[0] ?? 0);
