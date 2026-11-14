export let a = () => {
  let out = mut([0]);
  out[0] = 1;
  return freeze(out);
};
