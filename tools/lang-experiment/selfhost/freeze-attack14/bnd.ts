// freeze-attack14 S11 (drive-rt only: drive-run has no cells in another language). A value from an Observable
// JavaScript cell crosses into a typed parameter; the boundary checks it and gives a frozen copy (S11.4, S11.5).
// A tuple's length is read twice (the check, then the copy's allocation), so a proxy can pass the check with one length
// and be copied with another
import { tyRow, isNum, isStr, numArr, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const proxyLen = (first: number, then: number, base: unknown[]) => () => { let n = 0; return new Proxy(base, { get(t, p, r) { if (p === "length") return n++ === 0 ? first : then; return Reflect.get(t, p, r); } }); };
const getterArr = () => { const a = [1, 2]; let n = 0; Object.defineProperty(a, 1, { get() { return n++ === 0 ? 2 : "s"; }, enumerable: true }); return a; };
const B = (name: string, src: string, ext: () => unknown, ok: (v: unknown) => boolean = isNum, ctl = false) => R.push({ ...tyRow(`b-${name}`, src, ok, ctl), outside: { ext: [[], ext] } } as Cand);
B("tuple-shorter", `const g = (ext: [number, number]): number => ext[1];`, proxyLen(2, 1, [1, 2]));
B("tuple-shorter-str", `const g = (ext: [number, string]): string => ext[1];`, proxyLen(2, 1, [1, "s"]), isStr);
B("tuple-longer", `const g = (ext: [number]): number => ext.length;`, proxyLen(1, 3, [1, 2, 3]), isLit(1));
B("tuple-in-rec", `const g = (ext: { readonly t: [number, number] }): number => ext.t[1];`, () => ({ t: proxyLen(2, 1, [1, 2])() }));
B("tuple-in-arr", `const g = (ext: readonly [number, number][]): number => ext[0]?.[1] ?? -1;`, () => [proxyLen(2, 1, [1, 2])()], (v) => v !== undefined && v !== -1 && typeof v === "number");
B("tuple-union", `const g = (ext: [number, number] | string): number => (typeof ext === "string" ? 0 : ext[1]);`, proxyLen(2, 1, [1, 2]));
B("tuple-forof", `const g = (ext: [number, number]): number => { let s = 0; for (const x of ext) s = s + 1; return s; };`, proxyLen(2, 1, [1, 2]), isLit(2));
B("fn-result-tuple", `const g = (ext: () => [number, number]): number => ext()[1];`, () => proxyLen(2, 1, [1, 2]));
B("fn-result-async-tuple", `const g = async (ext: () => Promise<[number, number]>): Promise<number> => (await ext())[1];`, () => async () => proxyLen(2, 1, [1, 2])());
B("cast-tuple", `const g = (ext: unknown): number => { const r = cast<[number, number]>(ext); return r.ok ? r.value[1] : -1; };`, proxyLen(2, 1, [1, 2]), (v) => typeof v === "number");
// held: an element getter is read once
B("getter-elem", `const g = (ext: readonly number[]): number => ext[1] ?? 0;`, getterArr);
B("arr-len-proxy", `const g = (ext: readonly number[]): number => ext.length;`, proxyLen(2, 1, [1, 2]), (v) => v === 1 || v === 2);
// control (checker skipped): the cell gives a value outside its type, as the copy above would
B("ctl-str", `const g = (ext: [number, number]): number => "s";`, () => [1, 2], isNum, true);
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
