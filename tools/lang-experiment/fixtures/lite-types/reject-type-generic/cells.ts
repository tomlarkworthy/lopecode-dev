// Generic intrinsics and a user generic: inference from arguments and callbacks.
export let xs = () => [1, 2, 3];
export let bad_map_result = (xs): string[] => xs.map((x) => x * 2);
export let bad_reduce = (xs): string => xs.reduce((a, x) => a + x, 0);
export let bad_user_generic = () => { const first = <T,>(v: readonly T[]): T | undefined => v[0]; const n: string | undefined = first([1]); return n; };
export let bad_map_get = () => { const m = new Map<string, number>([["a", 1]]); const v: number = m.get("a"); return v; };
export let ok_generic = (xs) => {
  const first = <T,>(v: readonly T[]): T | undefined => v[0];
  const m = new Map(xs.map((x): [string, number] => [String(x), x]));
  const total: number = xs.reduce((a, x) => a + x, 0);
  return [first(xs), m.get("1") ?? 0, total, xs.filter((x) => x > 1).flatMap((x) => [x, x])];
};
