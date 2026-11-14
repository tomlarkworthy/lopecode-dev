export let o = () => ({ a: 1, xs: [1] });
export let w = (o) => {
  o.a = 2;
  o.xs[0] = 3;
  o.a += 1;
  o.a++;
  return o;
};
export let d = (o) => {
  [o.a] = [5];
  ({ k: o.a } = { k: 6 });
  return o;
};
export let e = (o) => {
  o.a--;
  return o;
};
