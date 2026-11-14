// A method or property that returns a view of a Mut buffer may only be consumed at once by a
// non-retaining intrinsic (or spread/for-of, which copy or read).
export let bad_subarray_kept = () => { const out = mut(new Float32Array(4)); const v = out.subarray(0, 2); out[0] = 1; return (freeze(out)[0] ?? 0) + (v[0] ?? 0); };
export let bad_subarray_returned = () => { const out = mut(new Float32Array(4)); return out.subarray(0); };
export let bad_buffer_kept = () => { const out = mut(new Float32Array(4)); const b = out.buffer; out[0] = 1; return [freeze(out), b]; };
export let bad_fill_result = () => { const out = mut(new Float32Array(2)); const same = out.fill(1); return [same, freeze(out)]; };
export let bad_map_set_result = () => { const m = mut(new Map<string, number>()); const same = m.set("a", 1); return [same, freeze(m)]; };
export let bad_values_iterator = () => { const s = mut(new Set<number>()); const it = s.values(); s.add(1); return [it, freeze(s)]; };
export let bad_view_in_literal = () => { const out = mut(new Float32Array(4)); const box = { v: out.subarray(1) }; return [box, freeze(out)]; };
export let src = () => Float32Array.from([1, 2, 3, 4]);
export let ok_consumed_immediately = () => {
  const from = mut(new Float32Array(4));
  from[1] = 5;
  const dst = mut(new Float32Array(4));
  dst.set(from.subarray(0, 2));
  return [freeze(dst), freeze(from)];
};
export let ok_view_copied = () => {
  const m = mut(new Map<string, number>());
  m.set("a", 1);
  const keys = [...m.keys()];
  let total = 0;
  for (const v of m.values()) total += v;
  const arr = Array.from(m.entries());
  return { keys, total, arr, m: freeze(m) };
};
export let ok_plain_subarray = (src) => src.subarray(1, 3);
export let ok_statement_fill = () => { const out = mut(new Float32Array(2)); out.fill(3); return freeze(out); };
