type Lru = { readonly cap: number; readonly entries: readonly (readonly [string, number])[] };
const lru = () => ({
  make: (cap: number): Lru => ({ cap, entries: [] }),
  get: (c: Lru, k: string): [number | undefined, Lru] => {
    const hit = c.entries.find((e) => e[0] === k);
    if (hit === undefined) return [undefined, c];
    return [hit[1], { cap: c.cap, entries: [...c.entries.filter((e) => e[0] !== k), hit] }];
  },
  put: (c: Lru, k: string, v: number): Lru => {
    const rest = c.entries.filter((e) => e[0] !== k);
    const next = [...rest, [k, v] as const];
    return { cap: c.cap, entries: next.length > c.cap ? next.slice(next.length - c.cap) : next };
  },
  keys: (c: Lru) => c.entries.map((e) => e[0]),
});
const lruDemo = (lru) => {
  let c = lru.make(2);
  c = lru.put(c, "a", 1);
  c = lru.put(c, "b", 2);
  c = lru.get(c, "a")[1];
  c = lru.put(c, "c", 3);
  return lru.keys(c);
};
