type Row = { item: string; price: number; qty: number };
const rows = (): Row[] => [
  { item: "tea", price: 3.5, qty: 2 },
  { item: "cake", price: 12, qty: 1 },
];
const money = () => (n: number) => "$" + n.toFixed(2);
const lines = (rows: Row[], money: (n: number) => string) =>
  rows.map((r) => `${r.item.padEnd(6)}${String(r.qty).padStart(3)} x ${money(r.price)} = ${money(r.price * r.qty)}`);
const report = (lines: string[]) => lines.join("\n");
