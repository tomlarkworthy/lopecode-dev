import { callN, toSrcs, type Cand } from "./h.ts";
const LRU = `type Lru = { readonly cap: number; readonly entries: readonly (readonly [string, number])[] };
const lruPut = () => (c: Lru, k: string, v: number): Lru => {
  const rest = c.entries.filter((e) => e[0] !== k);
  const all: readonly (readonly [string, number])[] = [...rest, [k, v]];
  return { cap: c.cap, entries: all.length > c.cap ? all.slice(all.length - c.cap) : all };
};
const lruGet = () => (c: Lru, k: string): { readonly value: number | undefined; readonly cache: Lru } => {
  const hit = c.entries.find((e) => e[0] === k);
  if (hit === undefined) return { value: undefined, cache: c };
  return { value: hit[1], cache: { cap: c.cap, entries: [...c.entries.filter((e) => e[0] !== k), hit] } };
};\n`;
export const cands: Cand[] = [
  { name: "reject-closure-over-mut-map", src: `const cache = () => {
  const m = new Map<string, number>();
  return { get: (k: string) => m.get(k), put: (k: string, v: number) => { m.set(k, v); } };
};` },
  { name: "reject-closure-over-let", src: `const counter = () => {
  let n = 0;
  return { next: () => { n += 1; return n; } };
};` },
  { name: "accept-immutable-lru", src: LRU + `const demo = (lruPut: (c: Lru, k: string, v: number) => Lru, lruGet: (c: Lru, k: string) => { readonly value: number | undefined; readonly cache: Lru }) => {
  let c: Lru = { cap: 2, entries: [] };
  c = lruPut(c, "a", 1);
  c = lruPut(c, "b", 2);
  const g = lruGet(c, "a");
  c = lruPut(g.cache, "c", 3);
  return c.entries.map((e) => e[0]).join(",");
};`, show: ["demo"] },
  { name: "accept-state-cell-lru", src: LRU + `const cache = (): StateCell<Lru> => state<Lru>({ cap: 2, entries: [] });
const put = (cache: State<Lru>, lruPut: (c: Lru, k: string, v: number) => Lru) => action((k: string, v: number) => cache.update((c) => lruPut(c, k, v)));
const touch = (cache: State<Lru>, lruGet: (c: Lru, k: string) => { readonly value: number | undefined; readonly cache: Lru }) => action((k: string) => cache.update((c) => lruGet(c, k).cache));
const keys = (cache: Lru) => cache.entries.map((e) => e[0]).join(",");`,
    drive: async (p: any) => { const put = p.value("put"), touch = p.value("touch"); put("a", 1); put("b", 2); touch("a"); put("c", 3); await p.settle(400); return `keys=${p.value("keys")}`; } },
];
export const srcs = toSrcs(cands);
