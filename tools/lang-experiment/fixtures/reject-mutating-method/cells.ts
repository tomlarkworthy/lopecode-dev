export let m = () => new Map<string, number>();
export let xs = () => [3, 1, 2];
export let t = () => new Float32Array(2);
export let w = (m, xs, t) => {
  m.set("a", 1);
  xs.sort();
  t.fill(1);
  return m.size;
};
export let s = () => new Set<number>();
export let w2 = (s, m) => {
  s.add(1);
  m.delete("a");
  s.clear();
  return s.size;
};
