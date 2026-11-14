// Wrong argument types, arity, and a callback whose parameter type does not fit.
export let add = () => (a: number, b: number) => a + b;
export let bad_arg = (add) => add(1, "2");
export let bad_arity = (add) => add(1);
export let bad_callback = () => ["a", "b"].map((s: number) => s + 1);
export let bad_method_arg = () => "abc".startsWith(1);
export let ok_calls = (add) => add(1, 2) + (["a"].map((s) => s.length)[0] ?? 0);
