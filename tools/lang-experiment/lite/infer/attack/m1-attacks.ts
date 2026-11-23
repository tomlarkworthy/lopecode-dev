// m1 step 2 (2026-11-23): attacks on memo, on the ban on a Mut inside a written type ([mut-nested], S4.9), on the
// annotated local bound to a fresh value that S4.1 now makes writable, and on R-M (a Mut local written after a call of
// a memoised function). Run by run-sets.ts (set m1). By name prefix: m1-mn a Mut inside a written type; m1-an an
// annotated fresh local; m1-rm R-M; m1-memo memo's keys, cache and captures. A program with `memo: true` is also run
// with every memo(f) replaced by (f) (memoStrip, on the TypeScript AST): a cell value that reads differently between the
// two runs, neither in error, counts as silent. m1-ctl are controls, run without the checker, and each must fire.
import ts from "typescript";

const W = "for (let i = 0; i < 300; i++) await null; ";
type A = { name: string; src: string; memo?: boolean; ctl?: boolean };
const A = (name: string, src: string, memo = false): A => ({ name, src, memo });
const SQ = "const sq = memo((xs: readonly number[]) => xs.length); ";

// every memo(f) call with one argument becomes (f), outermost first
export const memoStrip = (src: string): string => {
  for (;;) {
    const sf = ts.createSourceFile("x.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let hit: ts.CallExpression | null = null;
    const visit = (n: ts.Node): void => { if (hit) return; if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "memo" && n.arguments.length === 1) hit = n; else ts.forEachChild(n, visit); };
    visit(sf);
    if (hit === null) return src;
    const c: ts.CallExpression = hit, a = c.arguments[0]!;
    src = `${src.slice(0, c.getStart(sf))}(${src.slice(a.getStart(sf), a.end)})${src.slice(c.end)}`;
  }
};

export const attacks: A[] = [
  // 1. a Mut inside a written type
  A("m1-mn-interface", "interface B { readonly t: Mut<number[]> }\nconst a = function* () { const r: B = { t: [0] }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("m1-mn-generic-arg", "type P<T> = { readonly t: T };\nconst a = function* () { const r: P<Mut<number[]>> = { t: [0] }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("m1-mn-alias-chain", "type M = Mut<number[]>;\ntype N = M;\ntype R = { readonly t: N };\nconst a = function* () { const r: R = { t: [0] }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("m1-mn-generic-alias", "type M<T> = Mut<T>;\nconst a = function* () { const r: { readonly t: M<number[]> } = { t: [0] }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("m1-mn-as-cast", "const a = function* () { const r = { t: [0] as Mut<number[]> }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("m1-mn-destructure-param", "const a = function* () { const xs = [0]; const w = ({ t }: { readonly t: Mut<number[]> }) => { t.push(1); }; yield () => xs.length; w({ t: xs }); yield 2; };"),
  A("m1-mn-tuple", "const a = function* () { const t: readonly [Mut<number[]>] = [[0]]; yield () => t[0].length; t[0].push(1); yield 2; };"),
  A("m1-mn-record-utility", "const a = function* () { const r: Record<string, Mut<number[]>> = { k: [0] }; yield () => r.k?.length ?? -1; r.k?.push(1); yield 2; };"),
  A("m1-mn-indexed", "type R = Mut<{ t: number[] }>;\nconst a = function* () { const t: R[\"t\"] = [0]; yield () => t.length; yield 2; };"),
  A("m1-mn-result", "const a = function* () { const xs = [0]; const get = (): Mut<number[]> => xs; yield () => xs.length; get().push(1); yield 2; };"),
  A("m1-mn-typeof-whole", "const a = function* () { const xs = [0]; const c: typeof xs = xs; yield () => c.length; xs.push(1); yield 2; };"),
  A("m1-mn-typeof-field", "const a = function* () { const xs = [0]; const r: { readonly t: typeof xs } = { t: xs }; yield () => r.t.length; xs.push(1); yield 2; };"),
  A("m1-mn-fn-type-param", "const w = () => (m: Mut<number[]>) => { m.push(1); };\nconst b = (w: (m: Mut<number[]>) => void) => { const xs = [0]; w(xs); w(xs); return xs; };"),
  A("m1-mn-optional-param", "const a = () => { const xs = [0]; const h = (m?: Mut<number[]>) => { if (m !== undefined) m.push(1); }; h(xs); h(); return xs; };"),
  A("m1-mn-default-param", "const a = () => { const h = (m: Mut<number[]> = [0]) => { m.push(1); return m.length; }; return [h(), h()]; };"),
  // 2. an annotated local bound to a fresh value, writable since S4.1's change
  A("m1-an-capture-yield", "const a = function* () { const xs: number[] = [0]; yield () => xs.length; xs.push(1); yield 2; };"),
  A("m1-an-capture-kept", "const a = () => { const xs: number[] = [0]; const f = () => xs.length; xs.push(1); return f; };"),
  A("m1-an-map-yield", "const a = function* () { const m: Map<string, number> = new Map(); yield () => m.size; m.set(\"k\", 1); yield 2; };"),
  A("m1-an-record", "const a = function* () { const r: { n: number } = { n: 0 }; yield () => r.n; r.n = 1; yield 2; };"),
  A("m1-an-async", "const a = async () => { const xs: number[] = [0]; const h = async () => { " + W + "xs.push(1); }; h(); return () => xs.length; };"),
  A("m1-an-let-input", "const xs = () => [1];\nconst a = (xs: number[]) => { let ys: number[] = []; ys.push(0); ys = xs; ys.push(2); return ys.length; };\nconst b = (xs: readonly number[]) => () => xs.length;"),
  A("m1-an-let-fresh", "const a = function* () { let ys: number[] = [0]; ys = [1]; yield () => ys.length; ys.push(2); yield 2; };"),
  A("m1-an-returned", "const a = () => { const xs: number[] = [0]; xs.push(1); return xs; };\nconst b = (a: readonly number[]) => () => a.length;"),
  A("m1-an-union", "const a = () => { const xs: number[] | null = []; xs?.push(1); return xs; };\nconst b = (a: readonly number[] | null) => () => a?.length ?? -1;"),
  A("m1-an-readonly-alias", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); yield 2; };"),
  // 3. R-M: a Mut local written after a call of a memoised function
  A("m1-rm-after", "const a = () => { " + SQ + "const m = [1]; const k = sq(m); m.push(2); return [k, sq(m)]; };", true),
  A("m1-rm-alias", "const a = () => { " + SQ + "const m = [1]; const n = m; const k = sq(m); n.push(2); return [k, sq(n)]; };", true),
  A("m1-rm-nested-field", "const a = () => { const get = memo((r: { readonly t: readonly number[] }) => r.t.length); const t = [1]; const r = { t }; const k = get(r); t.push(2); return [k, get(r)]; };", true),
  A("m1-rm-input", "const sq = () => memo((xs: readonly number[]) => xs.length);\nconst b = (sq: (xs: readonly number[]) => number) => { const m = [1]; const k = sq(m); m.push(2); return [k, sq(m)]; };", true),
  A("m1-rm-helper", "const a = () => { " + SQ + "const m = [1]; const w = () => { m.push(2); }; const k = sq(m); w(); return [k, sq(m)]; };", true),
  A("m1-rm-loop", "const a = () => { " + SQ + "const m = [1]; const out = [0]; for (let i = 0; i < 2; i++) { m.push(i); out.push(sq(m)); } return out; };", true),
  A("m1-rm-loop-decl", "const a = () => { " + SQ + "const out = [0]; for (let i = 0; i < 2; i++) { const m = [i]; m.push(i); out.push(sq(m)); } return out; };", true),
  A("m1-rm-snapshot", "const a = () => { " + SQ + "const m = [1]; const k = sq(snapshot(m)); m.push(2); return [k, sq(snapshot(m))]; };", true),
  A("m1-rm-spread", "const a = () => { " + SQ + "const m = [1]; const k = sq([...m]); m.push(2); return [k, sq([...m])]; };", true),
  A("m1-rm-before", "const a = () => { " + SQ + "const m = [1]; m.push(2); return [sq(m), sq(m)]; };", true),
  // 4. memo's keys, cache and captures
  A("m1-memo-let-capture", "const a = () => { let k = 1; const f = memo((n: number) => n + k); const r1 = f(1); k = 2; return [r1, f(1)]; };", true),
  A("m1-memo-mut-capture", "const a = () => { const xs = [1]; const f = memo((n: number) => n + xs.length); const r1 = f(1); xs.push(2); return [r1, f(1)]; };", true),
  A("m1-memo-negzero", "const a = () => { const f = memo((n: number) => String(1 / n)); return [f(0), f(-0), f(0)]; };", true),
  A("m1-memo-nan", "const a = () => { const f = memo((n: number) => n !== n); return [f(NaN), f(NaN), f(1)]; };", true),
  A("m1-memo-recursive", "const a = () => { const fib = memo((n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2))); return fib(30); };", true),
  A("m1-memo-kept", "const f = () => memo((n: number) => [n, n].length);\nconst b = (f: (n: number) => number) => [f(1), f(1), f(2)];", true),
  A("m1-memo-object-arg", "const a = () => { const f = memo((p: { readonly n: number }) => p.n * 2); const p = { n: 1 }; return [f(p), f({ n: 1 }), f(p)]; };", true),
  A("m1-memo-fresh-result", "const a = () => { const f = memo((n: number) => ({ n })); const x = f(1); const y = f(1); return [x, y]; };", true),
  A("m1-memo-two-args", "const a = () => { const f = memo((n: number, s: string) => s.repeat(n)); return [f(1, \"a\"), f(2, \"a\"), f(1, \"a\")]; };", true),
  A("m1-memo-in-action", "const n = () => state(0);\nconst a = (n: State<number>) => { const f = memo((k: number) => k + 1); return action(() => n.set(f(read(n)))); };", true),
  // controls: run without the checker; each must fire
  { name: "m1-ctl-memo-let", src: "const a = () => { let k = 1; const f = memo((n: number) => n + k); const r1 = f(1); k = 2; return [r1, f(1)]; };", memo: true, ctl: true },
  { name: "m1-ctl-memo-mut", src: "const a = () => { const xs = [1]; const f = memo((n: number) => n + xs.length); const r1 = f(1); xs.push(2); return [r1, f(1)]; };", memo: true, ctl: true },
  { name: "m1-ctl-let-reassign", src: "const a = function* () { let n = 0; const f = () => n; yield f; n = 1; yield f; };", ctl: true },
];
