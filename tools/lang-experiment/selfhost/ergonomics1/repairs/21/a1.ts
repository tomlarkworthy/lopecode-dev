type Product = { sku: string; name: string; price: number };
type Line = { sku: string; qty: number };
const catalog = (): Product[] => [
  { sku: "A", name: "apple", price: 0.5 },
  { sku: "B", name: "bread", price: 2.25 },
  { sku: "C", name: "cheese", price: 6 },
];
const cart = (): StateCell<Line[]> => state<Line[]>([]);
const addToCart = (cart: State<Line[]>) =>
  action((sku: string) =>
    cart.update((lines) => {
      const existing = lines.find((l) => l.sku === sku);
      if (existing) return lines.map((l) => (l.sku === sku ? { ...l, qty: l.qty + 1 } : l));
      return [...lines, { sku, qty: 1 }];
    })
  );
const subtotal = (cart: Line[], catalog: Product[]) =>
  cart.reduce((sum, l) => sum + (catalog.find((p) => p.sku === l.sku)?.price ?? 0) * l.qty, 0);
const tax = (subtotal: number) => Math.round(subtotal * 0.2 * 100) / 100;
const total = (subtotal: number, tax: number) => subtotal + tax;
