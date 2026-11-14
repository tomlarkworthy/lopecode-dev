export let a = () => {
  const o = { v: 1, get() { return this.v; } };
  return o.get();
};
