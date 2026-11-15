// mut(e) needs a fresh value. ok* cells must pass; bad* cells must fail with mut-not-fresh.
let xs = () => [1, 2, 3];
let o = () => ({ a: 1 });
let bad_param = (xs) => { const m = mut(xs); m[0] = 9; return freeze(m); };
let bad_binding = () => { const ys = [1]; const m = mut(ys); m[0] = 2; return freeze(m); };
let bad_frozen = () => { const a = mut([1]); const f = freeze(a); const b = mut(f); b[0] = 2; return freeze(b); };
let bad_view_ctor = () => { const buf = new ArrayBuffer(8); const m = mut(new Float32Array(buf)); m[0] = 1; return freeze(m); };
let bad_view_method = (xs) => { const t = Float32Array.from(xs); const m = mut(t.subarray(0, 1)); m[0] = 1; return freeze(m); };
let ok_literal = () => { const m = mut([0, 0]); m[1] = 1; return freeze(m); };
let ok_spread = (xs, o) => { const a = mut([...xs]); const b = mut({ ...o }); a[0] = 7; b.a = 2; return [freeze(a), freeze(b)]; };
let ok_fresh_intrinsics = (xs) => {
  const a = mut(Array.from(xs));
  const b = mut(xs.slice(1));
  const c = mut(new Map<string, number>());
  const d = mut(structuredClone(xs));
  const e = mut(xs.map((x) => x * 2));
  a.push(4); b.push(5); c.set("k", 1); d.reverse(); e.sort((p, q) => q - p);
  return [freeze(a), freeze(b), freeze(c).size, freeze(d), freeze(e)];
};
