// freeze-attack14: the minimal program of each break, with its detector. Run with drive-rt.ts and drive-run.ts.
// min-rt.ts holds the two that need a cell in another language (drive-rt only).
import { tyRow, isNum, strArr, numArr, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const arrOfArr = (v: unknown) => Array.isArray(v) && v.every((x) => Array.isArray(x));
// TP: a mutating method of Array changes a tuple's order or length; the tuple type stays
R.push(tyRow("min-tp-reverse", `const g = (): number => { const t: [number, string] = [9, "1"]; t.reverse(); return t[0]; };`, isNum));
R.push(tyRow("min-tp-pop", `const g = (): number => { const t: [number, number] = [1, 2]; t.pop(); return t[1]; };`, isNum));
// HO: an index write past the end of a Mut array leaves holes that for...of and spread read as undefined
R.push(tyRow("min-ho-spread", `const g = (): number[] => { const xs = [1]; xs[3] = 5; return [...xs]; };`, numArr));
// OP: a function with a required parameter given a type whose parameter is optional
R.push(tyRow("min-op", `const g = (): number => { const f: (x?: number) => number = (x: number) => x; return f(); };`, isNum));
// RP: a function with a required parameter given a type with only a rest parameter
R.push(tyRow("min-rp", `const g = (): number => { const f: (...xs: number[]) => number = (a: number) => a; return f(); };`, isNum));
// LI: ++ on a binding of a literal type
R.push(tyRow("min-li", `const g = (): 1 => { let b: 1 = 1; b++; return b; };`, isLit(1)));
R.push(tyRow("min-li-switch", `const g = (): string => { let b: 1 = 1; b++; switch (b) { case 1: return "one"; } };`, (v) => typeof v === "string"));
// SG: split by a RegExp with a group that does not take part puts undefined in a string[]
R.push(tyRow("min-sg", `const g = (): string[] => "ab".split(/(x)?/);`, strArr));
// AR: an async function whose body reaches its end is not checked for a missing return
R.push(tyRow("min-ar", `const g = async (): Promise<number> => { };`, isNum));
// SW: a spread puts back a member a width step hid, over the member written before it
R.push(tyRow("min-sw", `const g = (): number => { const o = { a: 1, b: "s" }; const r: { readonly a: number } = o; return { b: 5, ...r }.b; };`, isNum));
// LE: == and != narrow a union to the literal they compare with, as === does
R.push(tyRow("min-le", `const g = (): "1" => { const v: number | "1" = 1; if (v == "1") { return v; } return "1"; };`, isLit("1")));
// FM: flatMap in a generic body flattens a T that is an array
R.push(tyRow("min-fm", `const g = (): readonly (readonly number[])[] => { const fm = <T,>(xs: readonly T[]): readonly T[] => xs.flatMap((x) => x); return fm([[1], [2]]); };`, arrOfArr));
// PA: a type parameter given a promise; Promise.resolve and then adopt it, and the value typed Promise<number> is 1
R.push(tyRow("min-pa", `const g = async (): Promise<readonly Promise<number>[]> => { const w = <T,>(x: T): Promise<readonly T[]> => Promise.resolve(x).then((v) => [v]); return w(Promise.resolve(1)); };`, (v) => Array.isArray(v) && v.every((x) => x instanceof Promise)));
// controls (checker skipped): each detector sees a value outside its type
R.push(tyRow("min-ctl-num", `const g = (): number => "s";`, isNum, true));
R.push(tyRow("min-ctl-arr", `const g = (): number[] => [1, undefined];`, numArr, true));
R.push(tyRow("min-ctl-lit", `const g = (): 1 => 2;`, isLit(1), true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
