let o = () => ({ a: 1, xs: [1] });
let w = (o) => {
  o.a = 2;
  o.xs[0] = 3;
  o.a += 1;
  o.a++;
  return o;
};
let d = (o) => {
  [o.a] = [5];
  ({ k: o.a } = { k: 6 });
  return o;
};
let e = (o) => {
  o.a--;
  return o;
};
