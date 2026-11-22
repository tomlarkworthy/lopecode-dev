const s4_signal = () => Float32Array.from([0, 0, 3, 0, 0]);

const s4_blur = (s4_signal: Float32Array): Float32Array => {
  const n = s4_signal.length;
  const out = new Float32Array(n);
  out.fill(0);
  for (let i = 0; i < n; i++)
    out[i] = ((s4_signal.at(Math.max(0, i - 1)) ?? 0) + (s4_signal.at(i) ?? 0) + (s4_signal.at(Math.min(n - 1, i + 1)) ?? 0)) / 3;
  return out;
};

const s4_counts = () => {
  const m = new Map<string, number>();
  const bump = (k: string) => {
    m.set(k, (m.get(k) ?? 0) + 1);
  };
  for (const w of ["a", "b", "a"]) bump(w);
  const f = m;
  return [f.get("a"), f.get("b")];
};

const s4_record = () => {
  const r = { a: 1, b: 2 };
  delete r.a;
  r.b += 1;
  return r;
};
