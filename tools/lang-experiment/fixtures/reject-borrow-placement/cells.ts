export let a = () => {
  const b = mut([1]);
  return snapshot(borrow(b));
};
