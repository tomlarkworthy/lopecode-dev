export let a = () => {
  class A {}
  return typeof A;
};
export let b = () => {
  const K = class {};
  return typeof K;
};
