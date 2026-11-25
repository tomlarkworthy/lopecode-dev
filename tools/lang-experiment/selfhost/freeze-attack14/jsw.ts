// freeze-attack14 class 3 (drive-rt only): a cell in another language writes a value a SoundScript cell published, and
// a SoundScript cell that reads both sees the write. S4.6: "A write to a published value, from any code, throws"
import { tyRow, isLit, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const W = (name: string, src: string, w: (k: any) => unknown, ok: (v: unknown) => boolean, ctl = false) => R.push({ ...tyRow(`j-${name}`, src, ok, ctl), outside: { w: [["k"], (k: any) => { w(k); return 1; }] } } as Cand);
W("typed-index", `const k = () => new Float32Array(2);\nconst g = (k: Float32Array, w: number): number => k[0] ?? -1;`, (k) => { k[0] = 9; }, isLit(0));
W("typed-in-rec", `const k = () => ({ t: new Float32Array(2) });\nconst g = (k: { readonly t: Float32Array }, w: number): number => k.t[0] ?? -1;`, (k) => { k.t[0] = 9; }, isLit(0));
W("typed-in-arr", `const k = () => [new Uint8Array(2)];\nconst g = (k: readonly Uint8Array[], w: number): number => k[0]?.[0] ?? -1;`, (k) => { k[0][0] = 9; }, isLit(0));
W("typed-fill", `const k = () => new Int32Array(2);\nconst g = (k: Int32Array, w: number): number => k[1] ?? -1;`, (k) => { k.fill(9); }, isLit(0));
W("buffer", `const k = () => new ArrayBuffer(4);\nconst g = (k: ArrayBuffer, w: number): number => new Uint8Array(k)[0] ?? -1;`, (k) => { new Uint8Array(k)[0] = 9; }, isLit(0));
W("map-proto-set", `const k = () => new Map<string, number>();\nconst g = (k: Map<string, number>, w: number): number => k.get("a") ?? 0;`, (k) => { Map.prototype.set.call(k, "a", 9); }, isLit(0));
W("set-proto-add", `const k = () => new Set<number>();\nconst g = (k: Set<number>, w: number): number => k.size;`, (k) => { Set.prototype.add.call(k, 9); }, isLit(0));
W("url-setter", `const k = () => new URL("https://a.test/");\nconst g = (k: URL, w: number): string => k.host;`, (k) => { Object.getOwnPropertyDescriptor(URL.prototype, "host")!.set!.call(k, "b.test"); }, isLit("a.test"));
W("state-typed", `const k = (): StateCell<Float32Array> => state(new Float32Array(2));\nconst g = (k: Float32Array, w: number): number => k[0] ?? -1;`, (k) => { k[0] = 9; }, isLit(0));
// held: a frozen array and record refuse the write (strict mode in the JS function: it throws)
W("arr-held", `const k = () => [0];\nconst g = (k: readonly number[], w: number): number => k[0] ?? -1;`, (k) => { "use strict"; k[0] = 9; }, isLit(0));
W("map-held", `const k = () => new Map<string, number>();\nconst g = (k: Map<string, number>, w: number): number => k.get("a") ?? 0;`, (k) => { k.set("a", 9); }, isLit(0));
// control: the reader sees a value the program did not write (checker skipped)
W("ctl", `const k = () => [0];\nconst g = (k: readonly number[], w: number): number => 9;`, () => {}, isLit(0), true);
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
