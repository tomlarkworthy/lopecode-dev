const n = () => 6;

const squares = (n: number) => {
  const out: number[] = [];
  for (let i = 1; i <= n; i++) out.push(i * i);
  return out;
};

const sumSquares = (squares: readonly number[]) => {
  let sum = 0;
  for (const s of squares) sum += s;
  return sum;
};
