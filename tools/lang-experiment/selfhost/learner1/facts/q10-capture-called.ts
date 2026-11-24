import { toSrcs, type Cand } from "./h.ts";
export const cands: Cand[] = [
  { name: "accept-local-helper-writes-captured-array", src: `const a = () => { const xs: number[] = []; const add = (n: number) => { xs.push(n); }; add(1); add(2); return xs; };`, show: ["a"] },
  { name: "accept-forEach-callback-writes-map", src: `const a = () => { const m = new Map<string, number>(); ["a", "b", "a"].forEach((w) => { m.set(w, (m.get(w) ?? 0) + 1); }); return [...m.entries()]; };`, show: ["a"] },
  { name: "accept-map-callback-writes-captured", src: `const a = () => { const seen = new Set<number>(); const ys = [1, 2, 1].map((x) => { seen.add(x); return x * 2; }); return [ys.length, seen.size]; };`, show: ["a"] },
  { name: "accept-recursive-walk-writes-captured", src: `type Tree = { readonly v: number; readonly children: readonly Tree[] };
const a = () => { const t: Tree = { v: 1, children: [{ v: 2, children: [] }, { v: 3, children: [{ v: 4, children: [] }] }] };
  const out: number[] = [];
  const walk = (n: Tree): void => { out.push(n.v); for (const c of n.children) walk(c); };
  walk(t);
  return out; };`, show: ["a"] },
  { name: "accept-let-assigned-by-called-helper", src: `const a = () => { let n = 0; const inc = () => { n += 1; }; inc(); inc(); return n; };`, show: ["a"] },
  { name: "reject-helper-passed-on", src: `const a = () => { const xs: number[] = []; const add = (n: number) => { xs.push(n); }; [1, 2].forEach(add); return xs; };`, show: ["a"] },
  { name: "reject-helper-returned", src: `const a = () => { const xs: number[] = []; return () => { xs.push(1); return xs.length; }; };` },
  { name: "reject-let-helper-passed-on", src: `const a = () => { let n = 0; const inc = () => { n += 1; }; [1, 2].forEach(inc); return n; };` },
];
export const srcs = toSrcs(cands);
