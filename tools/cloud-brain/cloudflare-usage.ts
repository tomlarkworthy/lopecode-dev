#!/usr/bin/env bun
// The tables of tools/cloud-brain/cloudflare-usage.md, from a kept answer of usage.account.
//
//   bun tools/cloud-brain/cloudflare-usage.ts tools/cloud-brain/cloudflare-usage/2026-08-19_2026-09-19.json
//
// Prints one line of the answer's head, one markdown row a product (the sums over the answer's days), and the
// price of a stored write by the rule of plan/cloud-brain-cloudflare-usage-read.md, "A price on a stored write".
// It calls nothing: the answer is read with `brain.ts curl "/xrpc/com.lopecode.brain.usage.account?from=&to=" --as loop-usage`.

export type Row = { service: string; family: string; unit: string; quantity: number; pricingUnit: string; pricingQuantity: number; cost: number; cumulatedCost: number; start: string; end: string };
export type Answer = { from: string | null; to: string | null; anchor: string | null; currency: string | null; rows: Row[]; total: number };

export const R2_STORAGE = "R2 Data Storage", R2_CLASS_A = "R2 Storage Class A Operations";
// 12 months of a 1 MB file at list price with one operation, as the spec has it, for a bill with nothing to divide.
export const NOTHING_TO_DIVIDE = "0.00018";

// Up to 6 significant digits, never an exponent.
export const num = (n: number) => (n === 0 ? "0" : Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(6))).includes("e") ? n.toFixed(12).replace(/0+$/, "") : String(Number(n.toPrecision(6))));

export function products(rows: Row[]) {
  const by = new Map<string, { family: string; service: string; unit: string; days: number; quantity: number; pricingQuantity: number; cost: number; first: string; last: string }>();
  for (const r of rows) {
    const key = r.family + "\n" + r.service;
    const p = by.get(key) ?? { family: r.family, service: r.service, unit: r.unit || r.pricingUnit, days: 0, quantity: 0, pricingQuantity: 0, cost: 0, first: r.start, last: r.end };
    p.days++; p.quantity += r.quantity; p.pricingQuantity += r.pricingQuantity; p.cost += r.cost;
    if (r.start < p.first) p.first = r.start;
    if (r.end > p.last) p.last = r.end;
    by.set(key, p);
  }
  return [...by.values()].sort((a, b) => (a.family === b.family ? (a.service < b.service ? -1 : 1) : a.family < b.family ? -1 : 1));
}

export const line = (p: ReturnType<typeof products>[number]) =>
  `| ${p.family} | ${p.service} | ${p.unit} | ${p.days} | ${num(p.quantity)} | ${num(p.pricingQuantity)} | ${num(p.cost)} | ${p.first.slice(0, 10)} | ${p.last.slice(0, 10)} |`;

// The cost of the R2 storage and Class A rows over the Class A operations, up to a whole millionth of a dollar.
export function storedWritePrice(rows: Row[]) {
  const of = (name: string) => rows.filter((r) => r.family === "R2" && r.service.startsWith(name));
  const cost = [...of(R2_STORAGE), ...of(R2_CLASS_A)].reduce((s, r) => s + r.cost, 0);
  const operations = of(R2_CLASS_A).reduce((s, r) => s + r.quantity, 0);
  const quotient = operations > 0 ? cost / operations : 0;
  const price = quotient > 0 ? String(Math.ceil(quotient * 1e6 - 1e-6) / 1e6) : NOTHING_TO_DIVIDE;
  return { cost, operations, quotient, price, divided: quotient > 0 };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) { console.error("usage: cloudflare-usage.ts <answer.json>"); process.exit(2); }
  const a: Answer = JSON.parse(await Bun.file(file).text());
  if (!Array.isArray(a.rows)) { console.error(`${file} has no rows: not an answer of usage.account`); process.exit(2); }
  const list = products(a.rows);
  const ends = a.rows.map((r) => r.end).sort();
  console.log(`from ${a.from} to ${a.to} anchor ${a.anchor} currency ${a.currency} total ${num(a.total)} rows ${a.rows.length} products ${list.length} first ${a.rows.map((r) => r.start).sort()[0] ?? null} newest ${ends[ends.length - 1] ?? null} rows with a cost ${a.rows.filter((r) => r.cost !== 0).length}`);
  console.log("| family | service | unit | days | quantity | pricingQuantity | cost | first day | last row ends |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const p of list) console.log(line(p));
  const w = storedWritePrice(a.rows);
  console.log(`stored write: cost ${num(w.cost)} / ${num(w.operations)} Class A operations = ${num(w.quotient)}; price "${w.price}"${w.divided ? "" : " (the bill gave nothing to divide)"}`);
}
