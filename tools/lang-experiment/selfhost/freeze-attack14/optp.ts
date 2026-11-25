// freeze-attack14 class 1: a function whose parameter is required, given a function type whose parameter is optional;
// a caller of the type passes no argument and the parameter holds undefined at a type without it
import { tyRow, callRow, isNum, isStr, numArr, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const O = (name: string, src: string, ok: (v: unknown) => boolean = isNum) => R.push(tyRow(`o-${name}`, src, ok));
O("annot", `const g = (): number => { const f: (x?: number) => number = (x: number) => x; return f(); };`);
O("annot-str", `const g = (): string => { const f: (s?: string) => string = (s: string) => s; return f(); };`, isStr);
O("annot-arr", `const g = (): readonly number[] => { const f: (xs?: readonly number[]) => readonly number[] = (xs: readonly number[]) => xs; return f(); };`, (v) => Array.isArray(v));
O("annot-rec", `const g = (): { readonly n: number } => { const f: (o?: { readonly n: number }) => { readonly n: number } = (o: { readonly n: number }) => o; return f(); };`, (v) => typeof v === "object" && v !== null);
O("second", `const g = (): number => { const f: (a: number, x?: number) => number = (a: number, x: number) => x; return f(1); };`);
O("rec-member", `const g = (): number => { const o: { readonly f: (x?: number) => number } = { f: (x: number) => x }; return o.f(); };`);
O("arr-el", `const g = (): number => { const fs: readonly ((x?: number) => number)[] = [(x: number) => x]; const f = fs[0]; return f === undefined ? 1 : f(); };`);
O("arg", `const g = (): number => { const call = (f: (x?: number) => number) => f(); return call((x: number) => x); };`);
O("generic", `const g = (): number => { const call = <T,>(f: (x?: T) => T): T => f(); return call((x: number) => x); };`);
O("memo", `const g = (): number => { const m = memo((x: number) => x); const f: (x?: number) => number = m; return f(); };`);
O("cond", `const k = () => 1;\nconst g = (k: number): number => { const f: (x?: number) => number = k > 0 ? (x: number) => x : (x?: number) => 1; return f(); };`);
O("cell-input", `const k = () => (x: number) => x;\nconst g = (k: (x?: number) => number): number => k();`);
O("cell-input-ret", `const k = (): ((x?: number) => number) => (x: number) => x;\nconst g = (k: (x?: number) => number): number => k();`);
O("method-length", `const g = (): number => { const f: (s?: string) => number = (s: string) => s.length; return f(); };`);
O("str-concat", `const g = (): string => { const f: (s?: string) => string = (s: string) => "a" + s; return f(); };`, (v) => v === "a");
O("narrow-gone", `const g = (): number => { const f: (x?: number) => number = (x: number) => (x > 0 ? 1 : 2); return f(); };`, (v) => v === 1 || v === 2);
O("map-cb", `const g = (): number[] => { const f: (x?: number) => number = (x: number) => x; return [f(), f(1)]; };`, numArr);
O("union-member", `const g = (): number => { const f: ((x?: number) => number) | null = (x: number) => x; return f === null ? 0 : f(); };`);
O("tuple-el", `const g = (): number => { const t: readonly [(x?: number) => number] = [(x: number) => x]; return t[0](); };`);
O("return-fn", `const g = (): number => { const mk = (): ((x?: number) => number) => (x: number) => x; return mk()(); };`);
O("map-value", `const g = (): number => { const m = new Map<string, (x?: number) => number>(); m.set("k", (x: number) => x); const f = m.get("k"); return f === undefined ? 0 : f(); };`);
O("default-param", `const g = (): number => { const call = (f: (x?: number) => number = (x: number) => x) => f(); return call(); };`);
O("state-held", `const c = (): StateCell<number> => state(0);\nconst k = () => (x: number) => x + 1;\nconst g = (k: (x?: number) => number): number => k();`);
O("type-alias", `type F = (x?: number) => number;\nconst g = (): number => { const f: F = (x: number) => x; return f(); };`);
O("interface-call", `interface F { (x?: number): number }\nconst g = (): number => { const f: F = (x: number) => x; return f(); };`);
O("published-fn", `const k = (): ((x?: number) => number) => (x: number) => x;\nconst g = (k: (x?: number) => number): number => k();`);
// in an action: the parameter holds undefined and is written to state at a type without it
R.push(callRow("o-action-state", `const c = (): StateCell<readonly number[]> => state([]);\nconst g = (c: readonly number[]) => c;\nconst b = (c: State<readonly number[]>) => action(() => { const f: (x?: number) => readonly number[] = (x: number) => [x]; c.set(f()); });`, "b", [], numArr));
// controls (checker skipped): an undefined at number, seen by the detector
R.push(tyRow("o-ctl-undef", `const g = (): number => { const xs: readonly number[] = []; return xs[0]; };`, isNum, true));
R.push(callRow("o-ctl-action-state", `const c = (): StateCell<readonly number[]> => state([]);\nconst g = (c: readonly number[]) => c;\nconst b = (c: State<readonly number[]>) => action(() => { c.set([undefined]); });`, "b", [], numArr, "g", true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
