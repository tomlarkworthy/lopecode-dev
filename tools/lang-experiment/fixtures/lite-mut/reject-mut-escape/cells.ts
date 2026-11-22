// A Mut may be read, written, passed to a Mut<…> parameter or to freeze; every other position is an error.
let id = () => <T,>(v: T) => v;
let keep = () => (xs: number[]) => xs.length;
let bad_return = () => { const out = [1]; return out; };
let bad_alias = () => { const out = [1]; const a = out; return a; };
let bad_let_assign = () => { const out = [1]; let a: number[] = []; a = out; return a; };
let bad_literal = () => { const out = [1]; const box = { out }; return box; };
let bad_ref = () => { const out = [1]; return state(out); };
let bad_promise = () => { const out = [1]; const p = Promise.resolve(out); out[0] = 2; return p; };
let bad_generic = (id) => { const out = [1]; const same = id(out); out[0] = 3; return same; };
let bad_plain_param = (keep) => { const out = [1]; return keep(out); };
let bad_push_into_other = () => {
  const out = [1];
  const all: Mut<number[][]> = [];
  all.push(out);
  out[0] = 2;
  return all;
};
let bad_yield = function* () { const out = [1]; yield out; };
let bad_callback_array = () => { const out = [1, 2]; const r = out.map((v, i, a) => a); return r; };
let ok_reads = () => {
  const out = [3, 1, 2];
  const n = out.length + (out[0] ?? 0);
  const copy = [...out];
  const s = JSON.stringify(out);
  const from = Array.from(out);
  const tpl = `${out}`;
  return { n, copy, s, from, tpl, f: out };
};
let ok_mut_param = () => {
  const bump = (m: Mut<number[]>, k: number) => { m[0] += k; m.push(k); };
  const out = [0];
  bump(out, 1);
  bump(out, 2);
  return out;
};
