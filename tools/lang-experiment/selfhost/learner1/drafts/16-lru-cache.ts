// Values are read-only once returned, so the cache is a value and every operation returns a new one.
type Entry<K, V> = { readonly key: K; readonly value: V };
type Lru<K, V> = { readonly capacity: number; readonly entries: readonly Entry<K, V>[] };

const lru = () => <K extends string | number, V>(capacity: number) => {
  const touch = (c: Lru<K, V>, e: Entry<K, V>): Lru<K, V> => {
    const all = [...c.entries.filter((x) => x.key !== e.key), e];
    return { capacity: c.capacity, entries: all.length > c.capacity ? all.slice(all.length - c.capacity) : all };
  };
  const empty: Lru<K, V> = { capacity, entries: [] };
  return {
    empty,
    get: (c: Lru<K, V>, key: K): { readonly value: V | undefined; readonly cache: Lru<K, V> } => {
      const hit = c.entries.find((x) => x.key === key);
      return hit === undefined ? { value: undefined, cache: c } : { value: hit.value, cache: touch(c, hit) };
    },
    put: (c: Lru<K, V>, key: K, value: V): Lru<K, V> => touch(c, { key, value }),
    keys: (c: Lru<K, V>): K[] => c.entries.map((x) => x.key),
  };
};

const lruDemo = (lru) => {
  const ops = lru<string, number>(2);
  let c = ops.put(ops.empty, "a", 1);
  c = ops.put(c, "b", 2);
  c = ops.get(c, "a").cache;
  c = ops.put(c, "c", 3);
  return ops.keys(c);
};
