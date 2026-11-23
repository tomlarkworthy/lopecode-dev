const fib = () => {
  const f = memo((n: number): number => (n < 2 ? n : f(n - 1) + f(n - 2)));
  return f;
};
const fib50 = (fib: (n: number) => number) => fib(50);
