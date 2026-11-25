// freeze-attack14 class 1: a function with required parameters given a function type with only a rest parameter; a
// caller of the type passes fewer arguments, and a required parameter holds undefined
import { tyRow, callRow, isNum, isStr, numArr, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const T = (name: string, src: string, ok: (v: unknown) => boolean = isNum) => R.push(tyRow(`r-${name}`, src, ok));
T("annot", `const g = (): number => { const f: (...xs: number[]) => number = (a: number) => a; return f(); };`);
T("two", `const g = (): number => { const f: (...xs: number[]) => number = (a: number, b: number) => b; return f(1); };`);
T("str", `const g = (): string => { const f: (...xs: string[]) => string = (s: string) => s; return f(); };`, isStr);
T("arg", `const g = (): number => { const call = (f: (...xs: number[]) => number) => f(); return call((a: number) => a); };`);
T("spread-empty", `const g = (): number => { const f: (...xs: number[]) => number = (a: number) => a; const xs: readonly number[] = []; return f(...xs); };`);
T("lead-rest", `const g = (): number => { const f: (a: number, ...xs: number[]) => number = (a: number, b: number) => b; return f(1); };`);
T("rec", `const g = (): number => { const o: { readonly f: (...xs: number[]) => number } = { f: (a: number) => a }; return o.f(); };`);
T("cell-input", `const k = () => (a: number) => a;\nconst g = (k: (...xs: number[]) => number): number => k();`);
T("memo", `const g = (): number => { const f: (...xs: number[]) => number = memo((a: number) => a); return f(); };`);
T("arr-of", `const g = (): readonly number[] => { const f: (...xs: readonly number[][]) => readonly number[] = (a: readonly number[]) => a; return f(); };`, (v) => Array.isArray(v));
R.push(callRow("r-action-state", `const c = (): StateCell<readonly number[]> => state([]);\nconst g = (c: readonly number[]) => c;\nconst b = (c: State<readonly number[]>) => action(() => { const f: (...xs: number[]) => readonly number[] = (a: number) => [a]; c.set(f()); });`, "b", [], numArr));
R.push(tyRow("r-ctl", `const g = (): number => { const f = (a: number) => a; return f(); };`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
