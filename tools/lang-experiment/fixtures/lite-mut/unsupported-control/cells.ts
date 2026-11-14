// Control flow lite's freeze analysis does not model, with a live Mut: the cell is unsupported, not ok.
export let n = () => 2;
export let uns_switch = (n) => {
  const out = mut([0]);
  switch (n) { case 1: out[0] = 1; break; default: out[0] = 2; }
  return freeze(out);
};
export let uns_finally = () => {
  const out = mut([0]);
  try { out[0] = 1; } finally { out[0] = 2; }
  return freeze(out);
};
