let a = () => {
  class A {}
  return typeof A;
};
let b = () => {
  const K = class {};
  return typeof K;
};
