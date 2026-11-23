const makeLru = () => <K, V>(cap: number) => {
  const m = new Map<K, V>();
  return {
    get(k: K): V | undefined {
      const v = m.get(k);
      if (v !== undefined) { m.delete(k); m.set(k, v); }
      return v;
    },
    put(k: K, v: V) {
      m.delete(k);
      m.set(k, v);
      if (m.size > cap) m.delete(m.keys().next().value);
    },
    keys: () => [...m.keys()],
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
