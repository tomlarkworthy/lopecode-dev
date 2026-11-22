// mut(e) needs a fresh value. ok* cells must pass; bad* cells must fail with mut-not-fresh.
let xs = () => [1, 2, 3];
let o = () => ({ a: 1 });
let bad_param = (xs) => { const m = xs; m[0] = 9; return m; };
let bad_binding = () => { const ys = [1]; const m = ys; m[0] = 2; return m; };
let bad_frozen = () => { const a = [1]; const f = a; const b = f; b[0] = 2; return b; };
let bad_view_ctor = () => { const buf = new ArrayBuffer(8); const m = new Float32Array(buf); m[0] = 1; return m; };
let bad_view_method = (xs) => { const t = Float32Array.from(xs); const m = t.subarray(0, 1); m[0] = 1; return m; };
let ok_literal = () => { const m = [0, 0]; m[1] = 1; return m; };
let ok_spread = (xs, o) => { const a = [...xs]; const b = { ...o }; a[0] = 7; b.a = 2; return [a, b]; };
let ok_fresh_intrinsics = (xs) => {
  const a = Array.from(xs);
  const b = xs.slice(1);
  const c = new Map<string, number>();
  const d = structuredClone(xs);
  const e = xs.map((x) => x * 2);
  a.push(4); b.push(5); c.set("k", 1); d.reverse(); e.sort((p, q) => q - p);
  return [a, b, c.size, d, e];
};
