// A method or property that returns a view of a Mut buffer may only be consumed at once by a
// non-retaining intrinsic (or spread/for-of, which copy or read).
let bad_subarray_kept = () => { const out = new Float32Array(4); const v = out.subarray(0, 2); out[0] = 1; return (out[0] ?? 0) + (v[0] ?? 0); };
let bad_subarray_returned = () => { const out = new Float32Array(4); return out.subarray(0); };
let bad_buffer_kept = () => { const out = new Float32Array(4); const b = out.buffer; out[0] = 1; return [out, b]; };
let bad_fill_result = () => { const out = new Float32Array(2); const same = out.fill(1); return [same, out]; };
let bad_map_set_result = () => { const m = new Map<string, number>(); const same = m.set("a", 1); return [same, m]; };
let bad_values_iterator = () => { const s = new Set<number>(); const it = s.values(); s.add(1); return [it, s]; };
let bad_view_in_literal = () => { const out = new Float32Array(4); const box = { v: out.subarray(1) }; return [box, out]; };
let src = () => Float32Array.from([1, 2, 3, 4]);
let ok_consumed_immediately = () => {
  const from = new Float32Array(4);
  from[1] = 5;
  const dst = new Float32Array(4);
  dst.set(from.subarray(0, 2));
  return [dst, from];
};
let ok_view_copied = () => {
  const m = new Map<string, number>();
  m.set("a", 1);
  const keys = [...m.keys()];
  let total = 0;
  for (const v of m.values()) total += v;
  const arr = Array.from(m.entries());
  return { keys, total, arr, m: m };
};
let ok_plain_subarray = (src) => src.subarray(1, 3);
let ok_statement_fill = () => { const out = new Float32Array(2); out.fill(3); return out; };
