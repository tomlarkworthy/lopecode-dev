const pair = () => memo((n: number) => [n, n * n]);
const a = (pair: (n: number) => number[]) => {
  const r = pair(3);
  r.reverse();
  return r;
};
const b = (pair: (n: number) => number[], a: number[]) => pair(3);
