type Product = { readonly sku: string; readonly name: string; readonly price: number };
type Line = { readonly sku: string; readonly qty: number };

const catalog = (): readonly Product[] => [
  { sku: "A", name: "apple", price: 0.5 },
  { sku: "B", name: "bread", price: 2.25 },
  { sku: "C", name: "cheese", price: 6 },
];

const cart = (): StateCell<readonly Line[]> => state<readonly Line[]>([]);

const addToCart = (cart: State<readonly Line[]>) =>
  action((sku: string) =>
    cart.update((lines) =>
      lines.some((l) => l.sku === sku)
        ? lines.map((l) => (l.sku === sku ? { ...l, qty: l.qty + 1 } : l))
        : [...lines, { sku, qty: 1 }]
    )
  );

const subtotal = (cart: readonly Line[], catalog: readonly Product[]) =>
  cart.reduce((sum, l) => sum + (catalog.find((p) => p.sku === l.sku)?.price ?? 0) * l.qty, 0);

const tax = (subtotal: number) => Math.round(subtotal * 0.2 * 100) / 100;

const total = (subtotal: number, tax: number) => subtotal + tax;
