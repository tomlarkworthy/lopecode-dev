export let sum = () => (xs: number[]) => xs.reduce((p, q) => p + q, 0);
export let a = (sum) => {
  const out = mut([0, 1]);
  const alias = out;
  const arr = [out];
  sum(out);
  return out;
};
export let b = () => {
  const out = mut([0]);
  return { out };
};
