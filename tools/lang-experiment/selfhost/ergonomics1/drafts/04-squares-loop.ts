const n = () => 6;
const squares = (n: number) => {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(i * i);
  return out;
};
const sumSquares = (squares: number[]) => squares.reduce((a, b) => a + b, 0);
