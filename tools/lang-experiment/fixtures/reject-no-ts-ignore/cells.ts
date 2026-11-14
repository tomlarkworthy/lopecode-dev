export let a = () => {
  // @ts-ignore
  return 1;
};
export let b = () => {
  // @ts-expect-error
  const x: number = "s";
  return x;
};
// @ts-nocheck
