let m = () => new Map<string, number>();
let xs = () => [3, 1, 2];
let t = () => new Float32Array(2);
let w = (m, xs, t) => {
  m.set("a", 1);
  xs.sort();
  t.fill(1);
  return m.size;
};
let s = () => new Set<number>();
let w2 = (s, m) => {
  s.add(1);
  m.delete("a");
  s.clear();
  return s.size;
};
