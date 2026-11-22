// Control flow lite's freeze analysis does not model, with a live Mut: the cell is unsupported, not ok.
let n = () => 2;
let uns_switch = (n) => {
  const out = [0];
  switch (n) { case 1: out[0] = 1; break; default: out[0] = 2; }
  return out;
};
let uns_finally = () => {
  const out = [0];
  try { out[0] = 1; } finally { out[0] = 2; }
  return out;
};
