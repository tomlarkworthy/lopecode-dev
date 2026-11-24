type Prices = { readonly [sku: string]: number };

const slowSquare = () =>
  memo((n: number): number => {
    let acc = 0;
    for (let i = 0; i < n; i++) acc += n;
    return acc;
  });

const inputs = () => [1000, 2000, 1000, 3000, 2000];

const results = (inputs: readonly number[], slowSquare) => inputs.map((n) => slowSquare(n));

const priceCache = (): StateCell<Prices> => state<Prices>({});

const rememberPrice = (priceCache: State<Prices>) =>
  action((sku: string, price: number) => priceCache.update((p) => ({ ...p, [sku]: price })));
