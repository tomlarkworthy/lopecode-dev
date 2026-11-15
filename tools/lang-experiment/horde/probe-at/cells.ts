// Probe: which forms of a checked, throwing typed-array read lite accepts in strict mode (bun lite/check.ts horde/probe-at).
type Num = Float32Array | Int32Array | Uint8Array;
type MNum = Mut<Float32Array> | Mut<Int32Array> | Mut<Uint8Array>;
export const atU = () => (a: Num, i: number): number => { const v = a[i]; if (v === undefined) throw new RangeError("index " + i + " out of " + a.length); return v; };
export const atM = () => (a: MNum, i: number): number => { const v = a[i]; if (v === undefined) throw new RangeError("index " + i + " out of " + a.length); return v; };
export const atMF = () => (a: Mut<Float32Array>, i: number): number => { const v = a[i]; if (v === undefined) throw new RangeError("index " + i + " out of " + a.length); return v; };
export const useM = (atM: (a: MNum, i: number) => number) => { const b = mut(new Int32Array(3)); b[0] = 1; const v = atM(b, 0); b[1] = v; return freeze(b); };
export const useMF = (atMF: (a: Mut<Float32Array>, i: number) => number) => { const b = mut(new Float32Array(3)); b[0] = 1; const v = atMF(b, 0); b[1] = v; return freeze(b); };
export const useMplain = (atM: (a: MNum, i: number) => number) => atM(new Int32Array(3), 0);
export const readFrozenAlias = (atU: (a: Num, i: number) => number) => { const b = mut(new Int32Array(3)); b[0] = 1; const f = freeze(b); return atU(f, 0); };
export const genericArr = () => <T>(xs: readonly T[], i: number): T => { const v = xs[i]; if (v === undefined) throw new RangeError("index " + i); return v; };
export const useArr = (genericArr: <T>(xs: readonly T[], i: number) => T) => genericArr([new Float32Array(2)], 0).length;
type Idx = { readonly length: number; readonly [i: number]: number };
export const atIdx = () => (a: Idx, i: number): number => { const v = a[i]; if (v === undefined) throw new RangeError("index " + i + " out of " + a.length); return v; };
export const atLike = () => <T>(a: ArrayLike<T>, i: number): T => { const v = a[i]; if (v === undefined) throw new RangeError("index " + i + " out of " + a.length); return v; };
