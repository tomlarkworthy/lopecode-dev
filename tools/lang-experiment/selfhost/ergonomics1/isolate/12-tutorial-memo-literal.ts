const fib = () => memo((n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
const fib50 = (fib: (n: number) => number) => fib(50);
