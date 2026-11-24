import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "literal-inference-generic-fn-cell", src: `const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr: <T>(xs: readonly T[], d: T) => T) => firstOr([3, 4], 0) + 1;`, show: ["a"] },
  { name: "generic-fn-cell-no-comma", src: `const firstOr = () => <T>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr: <T>(xs: readonly T[], d: T) => T) => firstOr([3, 4], 0) + 1;`, show: ["a"] },
  { name: "literal-inference-untyped-param", src: `const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr) => firstOr(["x"], "y").length;`, show: ["a"] },
  { name: "reject-generic-inferred-wrong-use", src: `const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr) => firstOr(["x"], "y") * 2;` },
  { name: "reject-as-in-generic-alias-use", src: `type Stack<T> = { readonly items: readonly T[] };
const push = () => <T,>(s: Stack<T>, x: T): Stack<T> => ({ items: [...s.items, x] });
const s = (push) => push(push({ items: [] as readonly number[] }, 1), 2).items.length;`, show: ["s"] },
  { name: "accept-generic-alias-annotated-empty", src: `type Stack<T> = { readonly items: readonly T[] };
const empty = () => <T,>(): Stack<T> => ({ items: [] });
const push = () => <T,>(s: Stack<T>, x: T): Stack<T> => ({ items: [...s.items, x] });
const s = (empty, push) => { const e: Stack<number> = empty(); return push(e, 2).items; };`, show: ["s"] },
  { name: "explicit-type-argument", src: `type Stack<T> = { readonly items: readonly T[] };
const empty = () => <T,>(): Stack<T> => ({ items: [] });
const s = (empty) => empty<number>().items.length;`, show: ["s"] },
  { name: "extends-bound", src: `const eqKey = () => <K extends string | number,>(a: K, b: K): boolean => a === b;
const s = (eqKey) => eqKey(1, 1);`, show: ["s"] },
  { name: "strict-eq-on-type-param", src: `const same = () => <T,>(a: T, b: T): boolean => a === b;
const s = (same) => same(1, 1);`, show: ["s"] },
  { name: "eq-undefined-on-type-param", src: `const isNone = () => <T,>(a: T | undefined): boolean => a === undefined;
const s = (isNone) => isNone(1);`, show: ["s"] },
  { name: "accept-groupBy-inferred", src: `type Sale = { readonly region: string; readonly amount: number };
const sales = () => (): readonly Sale[] => [{ region: "n", amount: 1 }, { region: "s", amount: 2 }, { region: "n", amount: 3 }];
const groupBy = () => <T,>(xs: readonly T[], key: (x: T) => string): Map<string, readonly T[]> => {
  const m = new Map<string, readonly T[]>();
  for (const x of xs) { const k = key(x); m.set(k, [...(m.get(k) ?? []), x]); }
  return m;
};
const byRegion = (groupBy, sales: () => readonly Sale[]) => [...groupBy(sales(), (s) => s.region).entries()].map(([k, v]) => k + ":" + v.length).join(",");`, show: ["byRegion"] },
  { name: "generic-function-declaration-cell", src: `function pairOf() { return <A, B>(a: A, b: B): readonly [A, B] => [a, b]; }
const s = (pairOf) => pairOf(1, "x")[1];`, show: ["s"] },
  { name: "generic-local-helper", src: `const s = () => { const id = <T,>(x: T): T => x; return id(3) + 1; };`, show: ["s"] },
  { name: "accept-generic-fn-cell-explicit-arg", src: `const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr: <T>(xs: readonly T[], d: T) => T) => firstOr<number>([3, 4], 0) + 1;`, show: ["a"] },
  { name: "accept-generic-fn-cell-typed-arg", src: `const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr: <T>(xs: readonly T[], d: T) => T) => { const xs: readonly number[] = [3, 4]; return firstOr(xs, 0) + 1; };`, show: ["a"] },
  { name: "accept-generic-alias-push", src: `type Stack<T> = { readonly items: readonly T[] };
const push = () => <T,>(s: Stack<T>, x: T): Stack<T> => ({ items: [...s.items, x] });
const s = (push) => { const e: Stack<number> = { items: [] }; return push(push(e, 1), 2).items; };`, show: ["s"] },
];
export const srcs = toSrcs(cands);
