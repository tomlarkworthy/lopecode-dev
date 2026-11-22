// 5. R-K missing a capture of a local whose own type is plainly Mut: b1's forms with `const xs = [0]` (inferred
// Mut<number[]>) in place of the nested holder. A row accepted and silent with REG=0 would be a T2 root other than b1's.
import { C } from "../freeze-attack3/harness.ts";
const X = "const xs = [0]; ";
const CW = "\nconst c = (a: { m: () => number[] }) => a.m().length;";
const p = (n: string, src: string) => C(`p5-${n}`, src);
const self = (f: string) => `{ xs.push(1); return xs.length; }`;
export const cands = [
  p("string-method", "const a = () => { " + X + "return { \"m\"(): number { xs.push(1); return xs.length; } }; };"),
  p("dup-method", "const a = () => { " + X + "return { m(): number { return 9; }, m(): number { xs.push(1); return xs.length; } }; };"),
  p("fn-decl", "const a = () => { " + X + "function m(): number " + self("") + " return { m }; };"),
  p("fn-decl-nested-block", "const a = () => { " + X + "{ function m(): number " + self("") + " return { m }; } };"),
  p("fn-expr-named", "const a = () => { " + X + "const m = function mm(): number " + self("") + "; return { m }; };"),
  p("catch-bind", "const a = () => { try { throw 1; } catch (e) { " + X + "return { m: (): number => " + self("") + " }; } };"),
  p("for-of-const-elem", "const a = () => { const rows: Mut<number[]>[] = [[0]]; for (const row of rows) return { m: (): number => { row.push(1); return row.length; } }; return { m: () => 0 }; };"),
  p("destructured", "const a = () => { const { ys } = { ys: [0] }; return { m: (): number => { ys.push(1); return ys.length; } }; };"),
  p("array-destr", "const a = () => { const [ys] = [[0]]; return { m: (): number => (ys ? ys.length : 0) }; };"),
  p("helper-local", "const a = () => { const mk = () => { " + X + "return (): number => " + self("") + "; }; return { m: mk() }; };"),
  p("helper-default-param", "const a = () => { const mk = (ys: Mut<number[]> = [0]) => (): number => { ys.push(1); return ys.length; }; return { m: mk() }; };"),
  p("made-on-call", "const a = () => { " + X + "return { m: () => (): number => " + self("") + " }; };"),
  p("spread-literal", "const a = () => { " + X + "return { ...{ m(): number " + self("") + " } }; };"),
  p("nested-literal", "const a = () => { " + X + "return { o: { m(): number " + self("") + " } }; };"),
  p("array-literal-fn", "const a = () => { " + X + "return [(): number => " + self("") + "]; };"),
  p("map-value-fn", "const a = () => { " + X + "return new Map([[\"m\", (): number => " + self("") + "]]); };"),
  p("map-callback-makes", "const a = () => { " + X + "return [0].map(() => (): number => " + self("") + "); };"),
  p("iife-result", "const a = () => { " + X + "return { m: ((): (() => number) => () => " + self("") + ")() }; };"),
  p("recursive", "const a = () => { " + X + "const m = (n: number): number => (n > 0 ? m(n - 1) : xs.length); return { m: () => m(2) }; };"),
  p("default-arg-read", "const a = () => { " + X + "return { m: (k: number = xs.length) => k }; };"),
  p("hook-tojson", "const a = () => { " + X + "return { toJSON: () => " + self("") + " }; };"),
  p("map-set-fn", "const a = () => { " + X + "const mp = new Map<string, () => number>(); mp.set(\"m\", () => " + self("") + "); return mp; };"),
  p("ternary-alias", "const a = (now: Clock) => { " + X + "const ys = now() > -1 ? xs : [1]; return { m: (): number => ys.length }; };"),
  p("alias-chain", "const a = () => { " + X + "const ys = xs; return { m: (): number => ys.length }; };"),
  p("map-get-elem", "const a = () => { const mp = new Map([[\"k\", [0]]]); const v = mp.get(\"k\"); return { m: (): number => (v ? v.length : 0) }; };"),
];
