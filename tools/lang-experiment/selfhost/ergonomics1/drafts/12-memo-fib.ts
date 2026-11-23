const fib = () => {
  const cache = new Map<number, number>();
  const f = (n: number): number => {
    if (n < 2) return n;
    const hit = cache.get(n);
    if (hit !== undefined) return hit;
    const v = f(n - 1) + f(n - 2);
    cache.set(n, v);
    return v;
  };
  return f;
};
const fib50 = (fib: (n: number) => number) => fib(50);
