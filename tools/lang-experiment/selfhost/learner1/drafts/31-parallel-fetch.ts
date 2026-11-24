type Price = { readonly sku: string; readonly price: number };

const skus = () => ["A", "B", "C"];

const prices = async (skus: readonly string[], fetch: Fetch) => {
  // Each response stays in the function that fetched it; only the checked data leaves.
  const one = async (sku: string): Promise<Price> => {
    const res = await fetch(`https://example.test/price/${sku}`);
    const r = cast<Price>(await res.json());
    if (!r.ok) throw new Error(`price/${sku}: ${r.error}`);
    return r.value;
  };
  return Promise.all(skus.map((sku) => one(sku)));
};

const cheapest = (prices: readonly Price[]) => {
  let best = prices[0];
  for (const p of prices) if (best === undefined || p.price < best.price) best = p;
  return best === undefined ? "" : best.sku;
};
