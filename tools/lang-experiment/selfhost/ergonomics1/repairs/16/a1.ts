const makeLru = () => <K, V>(cap: number) => {
  const m = new Map<K, V>();
  const c: Map<K, V> = m;
  return {
    get(k: K): V | undefined {
      const v = c.get(k);
      if (v !== undefined) { c.delete(k); c.set(k, v); }
      return v;
    },
    put(k: K, v: V) {
      c.delete(k);
      c.set(k, v);
      if (c.size > cap) c.delete(c.keys().next().value);
    },
    keys: () => [...c.keys()],
  };
};
const lruDemo = (makeLru) => {
  const c = makeLru(2);
  c.put("a", 1);
  c.put("b", 2);
  c.get("a");
  c.put("c", 3);
  return c.keys();
};
