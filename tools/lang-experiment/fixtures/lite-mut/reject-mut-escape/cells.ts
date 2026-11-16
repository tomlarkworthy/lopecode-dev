// A Mut may be read, written, passed to a Mut<…> parameter or to freeze; every other position is an error.
let id = () => <T,>(v: T) => v;
let keep = () => (xs: number[]) => xs.length;
let bad_return = () => { const out = mut([1]); return out; };
let bad_alias = () => { const out = mut([1]); const a = out; return freeze(a); };
let bad_let_assign = () => { const out = mut([1]); let a: number[] = []; a = out; return a; };
let bad_literal = () => { const out = mut([1]); const box = { out }; return box; };
let bad_ref = () => { const out = mut([1]); return state(out); };
let bad_promise = () => { const out = mut([1]); const p = Promise.resolve(out); out[0] = 2; return p; };
let bad_generic = (id) => { const out = mut([1]); const same = id(out); out[0] = 3; return same; };
let bad_plain_param = (keep) => { const out = mut([1]); return keep(out); };
let bad_push_into_other = () => {
  const out = mut([1]);
  const all = mut<number[][]>([]);
  all.push(out);
  out[0] = 2;
  return freeze(all);
};
let bad_yield = function* () { const out = mut([1]); yield out; };
let bad_callback_array = () => { const out = mut([1, 2]); const r = out.map((v, i, a) => a); return r; };
let ok_reads = () => {
  const out = mut([3, 1, 2]);
  const n = out.length + (out[0] ?? 0);
  const copy = [...out];
  const s = JSON.stringify(out);
  const from = Array.from(out);
  const tpl = `${out}`;
  return { n, copy, s, from, tpl, f: freeze(out) };
};
let ok_mut_param = () => {
  const bump = (m: Mut<number[]>, k: number) => { m[0] += k; m.push(k); };
  const out = mut([0]);
  bump(out, 1);
  bump(out, 2);
  return freeze(out);
};
