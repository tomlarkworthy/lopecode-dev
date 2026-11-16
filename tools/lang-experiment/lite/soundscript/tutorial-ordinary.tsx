// shop_basket and viewof shop_price are Observable JavaScript cells. A parameter that reads one has a type;
// the value is checked against it when it arrives.
type Line = { item: string; qty: number };
const shopTotal = (shop_basket: Line[], shop_price: number) => shop_basket.reduce((n, l) => n + l.qty, 0) * shop_price;

// Taken as Ref, the slider is state: an action writes to it, and the slider moves.
const cheaper = (shop_price: Ref<number>) => action(() => shop_price.update((p) => p - 0.5));

const shopView = (shopTotal: number, cheaper: Action<[]>) => (
  <div>
    <button onClick={cheaper}>cheaper</button> <output>total {shopTotal}</output>
  </div>
);
