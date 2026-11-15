let a = () => {
  // @ts-ignore
  return 1;
};
let b = () => {
  // @ts-expect-error
  const x: number = "s";
  return x;
};
// @ts-nocheck
