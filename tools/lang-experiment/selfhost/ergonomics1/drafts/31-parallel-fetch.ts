type Price = { sku: string; price: number };
const skus = () => ["A", "B", "C"];
const prices = async (fetch, skus: string[]) => {
  const all = await Promise.all(skus.map((s) => fetch(`https://example.test/price/${s}`).then((r) => r.json())));
  return all as Price[];
};
const cheapest = (prices: Price[]) => prices.slice().sort((a, b) => a.price - b.price)[0].sku;
