const fib = () => (n: number): number => {
  const cache = new Map<number, number>();
  const go = (k: number): number => {
    if (k < 2) return k;
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    const v = go(k - 1) + go(k - 2);
    cache.set(k, v);
    return v;
  };
  return go(n);
};
const fib50 = (fib: (n: number) => number) => fib(50);
