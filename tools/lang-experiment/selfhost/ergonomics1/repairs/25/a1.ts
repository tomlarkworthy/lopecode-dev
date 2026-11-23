const slowSquare = () => memo((n: number) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += n;
  return s;
});
const inputs = () => [1000, 2000, 1000, 3000, 2000];
const results = (slowSquare: (n: number) => number, inputs: number[]) => inputs.map((n) => slowSquare(n));
const priceCache = (): StateCell<Record<string, number>> => state<Record<string, number>>({});
const rememberPrice = (priceCache: State<Record<string, number>>) =>
  action((sku: string, price: number) => priceCache.update((c) => Object.fromEntries([...Object.entries(c), [sku, price]])));
