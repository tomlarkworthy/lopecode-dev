// freeze only a Mut created by mut() in the same function: freezing a Mut parameter would hand out an
// immutable view of a buffer the caller keeps writing.
let bad = () => {
  const snap = (m: Mut<number[]>) => m;
  const out = [1];
  const s = snap(out);
  out[0] = 2;
  return s;
};
let ok = () => {
  const fill = (m: Mut<number[]>) => { m[0] = 4; };
  const out = [1];
  fill(out);
  return out;
};
