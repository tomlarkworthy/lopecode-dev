type Price = { sku: string; price: number };
const skus = () => ["A", "B", "C"];
const toPrice = () => (x: unknown): Price => {
  if (typeof x !== "object" || x === null || !("sku" in x) || !("price" in x)) throw new Error("expected a price");
  return { sku: String(x.sku), price: Number(x.price) };
};
const prices = async (fetch: Fetch, skus: string[], toPrice: (x: unknown) => Price) =>
  Promise.all(skus.map(async (s) => toPrice(await (await fetch(`https://example.test/price/${s}`)).json())));
const cheapest = (prices: Price[]) => {
  const xs = [...prices];
  xs.sort((a, b) => a.price - b.price);
  return xs[0]?.sku;
};
