export const entriesObj = () => (v: unknown): number => (typeof v === "object" && v !== null ? Object.entries(v).length : 0);
export const deepEq = () => {
  const eq = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
    const ea = Object.entries(a), mb = new Map(Object.entries(b));
    return ea.length === mb.size && ea.every(([k, x]) => mb.has(k) && eq(x, mb.get(k)));
  };
  return eq;
};
export const unionWant = () => {
  type S = { k: "num" } | { k: "union"; ts: S[] };
  const w = (s: S): string => (s.k === "num" ? "number" : s.ts.map(w).join(" or "));
  return w;
};
export const tryNoMut = () => (f: () => number): number => { try { return f(); } finally { } };
export const tryMut = () => (xs: readonly number[]): number[] => { const out: Mut<number[]> = mut([]); try { out.push(1); } finally { out.push(2); } return freeze(out); };
export const mutRecord = () => (ks: readonly string[]): Record<string, number> => { const out: Mut<Record<string, number>> = mut({}); for (const k of ks) out[k] = 1; return freeze(out); };
export const mutParam = () => (s: Mut<Set<number>>, x: number): void => { s.add(x); };
export const callMutHelper = (mutParam: (s: Mut<Set<number>>, x: number) => void) => (): number => { const s = mut(new Set<number>()); mutParam(s, 1); return freeze(s).size; };
export const recMutHelper = () => (n: number): number => {
  function go(k: number, s: Mut<Set<number>>): void { if (k > 0) { s.add(k); go(k - 1, s); } }
  const s = mut(new Set<number>());
  go(n, s);
  return freeze(s).size;
};
export const errResult = () => (v: unknown): { ok: true; v: number } | { ok: false; error: string } => (typeof v === "number" ? { ok: true, v } : { ok: false, error: "nan" });
export const objKeysRead = () => (v: unknown): unknown[] => { if (typeof v !== "object" || v === null) return []; const m = new Map(Object.entries(v)); return Object.keys(v).map((k) => m.get(k)); };
