let a = () => {
  const out = mut([0]);
  const r = freeze(out);
  out[0] = 2;
  return r;
};
