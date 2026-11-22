// Writes are legal one level deep on a Mut receiver only.
let o = () => ({ a: { b: 1 }, xs: [1, 2] });
let bad_nested_field = (o) => { const m = { ...o }; m.a.b = 2; return m; };
let bad_nested_index = (o) => { const m = { ...o }; m.xs[0] = 5; return m; };
let bad_nested_method = (o) => { const m = { ...o }; m.xs.push(3); return m; };
let bad_nested_compound = (o) => { const m = { ...o }; m.a.b += 1; m.a.b++; return m; };
let ok_first_level = (o) => {
  const m = { ...o, n: 0 };
  m.a = { b: 2 };
  m.xs = [...m.xs, 3];
  m.n += 1;
  m.n++;
  return m;
};
