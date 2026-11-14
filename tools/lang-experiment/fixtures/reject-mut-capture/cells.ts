export let a = () => {
  const out = mut([0]);
  const f = () => out[0];
  return f();
};
