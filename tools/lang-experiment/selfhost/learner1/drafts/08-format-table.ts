type Row = { readonly item: string; readonly price: number; readonly qty: number };

const rows = (): readonly Row[] => [
  { item: "tea", price: 3.5, qty: 2 },
  { item: "cake", price: 12, qty: 1 },
];

const money = () => (x: number): string => "$" + x.toFixed(2);

const report = (rows: readonly Row[], money) =>
  rows
    .map((r) => r.item.padEnd(6) + String(r.qty).padStart(3) + " x " + money(r.price) + " = " + money(r.price * r.qty))
    .join("\n");
