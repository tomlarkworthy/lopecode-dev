// k1 (2026-11-23): attacks on the deep R-K test (owMutDeep: a kept function captures no local whose type holds a Mut
// anywhere, S4.10/S5.8) and on the strip of what a cell exposes (owStripMut, S4.4). Run by run-sets.ts (set k1). By
// name prefix: k1-d the depth caps; k1-r recursive and generic aliases; k1-g generics, defaults, type operators; k1-f
// functions in fields, arrays and maps; k1-u unknown/object/casts; k1-w let and widening; k1-p parameters and
// destructuring; k1-c containers; k1-s the strip, across cells. A kept function writes through the local and returns a
// read, so the observer's second call reads a new value if the write lands. k1-ctl are controls, run without the
// checker: with closure registration on each throws at the drive (fired 0); with SS_MEASURE_REG=0 each must fire.
type A = { name: string; src: string; ctl?: boolean };
const K = (name: string, setup: string, write: string, read: string): A => ({ name, src: `const a = () => { const xs = [0]; ${setup} return () => { ${write} return ${read}; }; };` });
const A = (name: string, src: string): A => ({ name, src });
const nest = (n: number): string => "[".repeat(n) + "xs" + "]".repeat(n) + " as const";
const at = (n: number): string => "t" + "[0]".repeat(n);

export const attacks: A[] = [
  // 1. depth: past 12 levels the walk counts a Mut (fail-closed); a part walked once is not walked again
  K("k1-d-tuple13", `const t = ${nest(13)};`, `${at(13)}.push(1);`, `${at(13)}.length`),
  K("k1-d-tuple30", `const t = ${nest(30)};`, `${at(30)}.push(1);`, `${at(30)}.length`),
  K("k1-d-record13", `const t = ${"{ k: ".repeat(13)}xs${" }".repeat(13)} as const;`, `t${".k".repeat(13)}.push(1);`, `t${".k".repeat(13)}.length`),
  K("k1-d-mixed13", `const t = ${"[{ k: ".repeat(7)}xs${" }]".repeat(7)} as const;`, `t${"[0].k".repeat(7)}.push(1);`, `t${"[0].k".repeat(7)}.length`),
  K("k1-d-shared-dag", "const t0 = [xs, xs] as const; const t1 = [t0, t0] as const; const t2 = [t1, t1] as const; const t3 = [t2, t2] as const; const t = [t3, t3] as const;", "t[1][1][1][1][1].push(1);", "t[0][0][0][0][0].length"),
  K("k1-d-ternary-chain", "const t = xs.length > 9 ? null : xs.length > 8 ? null : xs.length > 7 ? null : xs.length > 6 ? null : xs.length > 5 ? null : xs.length > 4 ? null : xs.length > 3 ? null : xs.length > 2 ? null : xs.length > 1 ? null : xs.length > 0 ? xs : null;", "if (t) t.push(1);", "(t ? t.length : -1)"),
  // 2. recursive and generic aliases
  A("k1-r-list", "type L<T> = { readonly v: T; readonly next: L<T> | null };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): L<T> => ({ v, next: null }); const t = mk(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  A("k1-r-list-deep", "type L<T> = { readonly next: L<T> | null; readonly v: T };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): L<T> => ({ next: { next: null, v }, v }); const t = mk(xs); return () => { t.next?.v.push(1); return t.v.length; }; };"),
  A("k1-r-grow", "type G<T> = { readonly v: T; readonly up: G<[T]> | null };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): G<T> => ({ v, up: null }); const t = mk(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  A("k1-r-tree", "type Tr<T> = { readonly v: T; readonly kids: readonly Tr<T>[] };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): Tr<T> => ({ v, kids: [] }); const t = mk(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  A("k1-r-alias-of-alias", "type B<T> = { readonly v: T };\ntype C<T> = B<B<T>>;\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): C<T> => ({ v: { v } }); const t = mk(xs); return () => { t.v.v.push(1); return t.v.v.length; }; };"),
  A("k1-r-union-alias", "type O<T> = { readonly k: \"a\"; readonly v: T } | { readonly k: \"b\" };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): O<T> => ({ k: \"a\", v }); const t = mk(xs); return () => { if (t.k === \"a\") t.v.push(1); return t.k === \"a\" ? t.v.length : -1; }; };"),
  // 3. generics, defaults, type operators
  A("k1-g-default", "type B<T = number> = { readonly v: T };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): B<T> => ({ v }); const t = mk(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  A("k1-g-id", "const a = () => { const xs = [0]; const id = <T,>(v: T): T => v; const t = id([xs] as const); return () => { t[0].push(1); return t[0].length; }; };"),
  A("k1-g-two-tvs", "const a = () => { const xs = [0]; const pr = <T, U>(u: U, v: T) => [u, v] as const; const t = pr(1, xs); return () => { t[1].push(1); return t[1].length; }; };"),
  A("k1-g-conditional", "type C<T> = T extends number ? { readonly n: T } : { readonly v: T };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): C<T> => ({ v }) as C<T>; const t = mk(xs); return () => 0; };"),
  A("k1-g-mapped", "type M<T> = { readonly [K in keyof T]: T[K] };\nconst a = () => { const xs = [0]; const t = { k: xs } as const; const u: M<typeof t> = t; return () => 0; };"),
  A("k1-g-partial", "const a = () => { const xs = [0]; const mk = <T,>(v: T): Partial<{ v: T }> => ({ v }); const t = mk(xs); return () => { t.v?.push(1); return t.v?.length ?? -1; }; };"),
  // 4. functions in fields, arrays and maps
  K("k1-f-field-helper", "const g = () => xs; const t = { g };", "t.g().push(1);", "t.g().length"),
  K("k1-f-array-of-fns", "const fs = [() => xs] as const;", "fs[0]().push(1);", "fs[0]().length"),
  K("k1-f-array-of-helpers", "const g = () => xs; const fs = [g, g];", "fs[0]?.().push(1);", "fs[1]?.().length ?? -1"),
  K("k1-f-map-of-fns", "const m = new Map([[\"g\", () => xs]]); const c: ReadonlyMap<string, () => number[]> = m;", "c.get(\"g\")?.().push(1);", "c.get(\"g\")?.().length ?? -1"),
  K("k1-f-fn-returning-tuple", "const g = () => [xs] as const; const t = g;", "t()[0].push(1);", "t()[0].length"),
  K("k1-f-curried", "const g = () => () => [xs] as const; const t = g();", "t()[0].push(1);", "t()[0].length"),
  K("k1-f-record-of-record-fn", "const t = { in: { g: () => xs } } as const;", "t.in.g().push(1);", "t.in.g().length"),
  // 5. unknown, object, casts
  K("k1-u-unknown", "const t: unknown = [xs] as const;", "if (Array.isArray(t)) t.push(1);", "(Array.isArray(t) ? t.length : -1)"),
  K("k1-u-object", "const t: object = { k: xs };", "", "0"),
  K("k1-u-as-readonly", "const t = [xs] as readonly (readonly number[])[];", "", "t.length"),
  K("k1-u-nonnull", "const t = (xs.length > 0 ? [xs] as const : null)!;", "t[0].push(1);", "t[0].length"),
  K("k1-u-json", "const t = JSON.parse(JSON.stringify([xs]));", "", "0"),
  // 6. let and widening
  K("k1-w-let-tuple", "let t = [xs] as const;", "t[0].push(1);", "t[0].length"),
  K("k1-w-let-primitive-from", "let n = xs.length; const t = [xs, n] as const;", "t[0].push(1);", "t[0].length"),
  K("k1-w-const-from-let", "let u = [xs] as const; const t = u;", "t[0].push(1);", "t[0].length"),
  K("k1-w-union-records", "const t = xs.length > 0 ? { k: xs } : { k: [1] };", "t.k.push(1);", "t.k.length"),
  K("k1-w-optional", "const t = xs.length > 5 ? undefined : ([xs] as const);", "t?.[0].push(1);", "t?.[0].length ?? -1"),
  // 7. parameters and destructuring
  A("k1-p-callback-param", "const a = () => { const xs = [0]; const fs = [[xs] as const].map((t) => () => { t[0].push(1); return t[0].length; }); return fs[0] ?? (() => -1); };"),
  A("k1-p-param-holder", "const a = () => { const mk = (t: readonly [Mut<number[]>]) => () => { t[0].push(1); return t[0].length; }; return mk([[0]]); };"),
  A("k1-p-inferred-param", "const a = () => { const xs = [0]; const mk = <T,>(t: T) => () => t; return mk([xs] as const); };"),
  K("k1-p-destr-nested", "const { k: [u] } = { k: [xs] as const } as const;", "u.push(1);", "u.length"),
  K("k1-p-destr-array", "const [[u]] = [[xs] as const] as const;", "u.push(1);", "u.length"),
  A("k1-p-default-holder", "const a = () => { const xs = [0]; const t = [xs] as const; return (u = t) => { u[0].push(1); return u[0].length; }; };"),
  A("k1-p-async-await", "const a = async () => { const xs = [0]; const t = await Promise.resolve([xs] as const); return () => { t[0].push(1); return t[0].length; }; };"),
  A("k1-p-generator-yield", "const a = function* () { const xs = [0]; const t = [xs] as const; yield () => { t[0].push(1); return t[0].length; }; };"),
  // 8. containers
  K("k1-c-map-in-tuple", "const t = [new Map([[1, xs]])] as const;", "t[0].get(1)?.push(1);", "t[0].get(1)?.length ?? -1"),
  K("k1-c-set-in-tuple", "const t = [new Set([xs])] as const;", "for (const u of t[0]) u.push(1);", "t[0].size"),
  K("k1-c-array-of", "const t = Array.of(xs); const c: readonly number[][] = t;", "c[0]?.push(1);", "c[0]?.length ?? -1"),
  K("k1-c-clone", "const t = structuredClone([xs] as const);", "t[0].push(1);", "t[0].length"),
  K("k1-c-spread-record", "const t = { ...{ k: xs } };", "t.k.push(1);", "t.k.length"),
  K("k1-c-error-cause", "const t = [new Error(\"e\", { cause: xs })] as const;", "", "t.length"),
  // 9. the strip of what a cell exposes, across cells
  A("k1-s-fresh-result", "const a = () => () => [0];\nconst b = (a) => { const r = a(); r.push(1); return r.length; };"),
  A("k1-s-map-result", "const a = () => () => new Map<string, number>();\nconst b = (a) => { a().set(\"k\", 1); return 0; };"),
  A("k1-s-field-fn", "const a = () => ({ mk: () => [0] });\nconst b = (a) => { a.mk().push(1); return 0; };"),
  A("k1-s-tuple-of-fns", "const a = () => [() => [0]] as const;\nconst b = (a) => { a[0]().push(1); return 0; };"),
  A("k1-s-fn-fn", "const a = () => () => () => [0];\nconst b = (a) => { a()().push(1); return 0; };"),
  A("k1-s-promise-result", "const a = () => async () => [0];\nconst b = async (a) => { const r = await a(); r.push(1); return r.length; };"),
  A("k1-s-mut-param-back", "const a = () => (ys: Mut<number[]>) => ys;\nconst b = (a) => { const r = a([0]); r.push(1); return r.length; };"),
  A("k1-s-rewrap", "const a = () => () => [0];\nconst b = (a) => () => a();\nconst c = (b) => { b()().push(1); return 0; };"),
  A("k1-s-relay", "const a = () => () => [0];\nconst b = (a) => ({ g: a });\nconst c = (b) => { b.g().push(1); return 0; };"),
  A("k1-s-generic-own", "const a = () => <T,>(v: T) => [v] as const;\nconst b = (a) => { const xs = [0]; const t = a(xs); return () => { t[0].push(1); return t[0].length; }; };"),
  A("k1-s-annotated-back", "const a = () => () => [0];\nconst b = (a: () => Mut<number[]>) => { a().push(1); return 0; };"),
  A("k1-s-callback-param", "const a = () => (cb: (x: Mut<number[]>) => void) => { const ys = [0]; cb(ys); return ys.length; };\nconst b = (a) => a((x) => { x.push(1); });"),
  A("k1-s-callback-shared", "const a = () => { const xs = [0]; return (cb: (x: Mut<number[]>) => void) => { cb(xs); return xs.length; }; };\nconst b = (a) => a((x) => { x.push(1); });"),
  A("k1-s-annotated-callback", "const a = () => (cb: (x: number[]) => void) => { cb([0]); return 0; };\nconst b = (a: (cb: (x: Mut<number[]>) => void) => number) => a((x) => { x.push(1); });"),
  A("k1-s-gen-fn", "const a = () => function* () { yield [0]; };\nconst b = (a) => { for (const x of a()) x.push(1); return 0; };"),
  A("k1-s-state-fn", "const a = () => state(() => [0]);\nconst b = (a: State<() => number[]>) => 0;"),
  // controls (checker skipped)
  { ...K("k1-ctl-tuple13", `const t = ${nest(13)};`, `${at(13)}.push(1);`, `${at(13)}.length`), ctl: true },
  { ...A("k1-ctl-list", "type L<T> = { readonly v: T; readonly next: L<T> | null };\nconst a = () => { const xs = [0]; const mk = <T,>(v: T): L<T> => ({ v, next: null }); const t = mk(xs); return () => { t.v.push(1); return t.v.length; }; };"), ctl: true },
  { ...K("k1-ctl-curried", "const g = () => () => [xs] as const; const t = g();", "t()[0].push(1);", "t()[0].length"), ctl: true },
];
