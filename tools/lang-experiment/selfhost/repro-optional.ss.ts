const optParam = () => {
  function f(n?: number): number {
    return n === undefined ? 0 : n;
  }
  const g = (n?: number): number => f(n);
  return g(1);
};
const optProp = () => {
  const r: { a?: number } = { a: undefined };
  const x: number | undefined = 1;
  const s: { a?: number } = { a: x };
  return [r, s];
};
