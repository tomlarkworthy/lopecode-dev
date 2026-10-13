import { test, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { products, line, num, storedWritePrice, NOTHING_TO_DIVIDE, type Answer, type Row } from "../../tools/cloud-brain/cloudflare-usage.ts";

const root = join(import.meta.dir, "..", "..");
const read = (p: string) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : "");
const doc = read("tools/cloud-brain/cloudflare-usage.md");
const page = read("knowledge/calling-a-cloud-brain-from-this-checkout.md");
const answer = (name: string): Answer => JSON.parse(read(`tools/cloud-brain/cloudflare-usage/${name}.json`));
const period = answer("2026-08-19_2026-09-19"), current = answer("current-2026-10-13");

const row = (service: string, quantity: number, cost: number): Row =>
  ({ service, family: "R2", unit: "", quantity, pricingUnit: "Count", pricingQuantity: 0, cost, cumulatedCost: cost, start: "2026-01-01T00:00:00Z", end: "2026-01-02T00:00:00Z" });

test("the kept period is whole: it starts and ends on the anchor's day of the month, a row a day", () => {
  expect(period.from).toBe("2026-08-19");
  expect(period.to).toBe("2026-09-19");
  expect(period.anchor!.slice(8, 10)).toBe("19");
  const days = new Set(period.rows.map((r) => r.start.slice(0, 10)));
  expect(days.size).toBe(31);
  expect([...days].sort()[0]).toBe("2026-08-19");
  expect(period.rows.map((r) => r.end).sort().pop()).toBe("2026-09-19T00:00:00Z");
});

test("a kept row has the ten names of usage.account and no other", () => {
  for (const a of [period, current])
    for (const r of a.rows)
      expect(Object.keys(r).sort()).toEqual(["cost", "cumulatedCost", "end", "family", "pricingQuantity", "pricingUnit", "quantity", "service", "start", "unit"]);
});

test("the doc has a row for each product of each kept answer, with the sums the tool prints", () => {
  for (const a of [period, current]) {
    const list = products(a.rows);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(doc).toContain(line(p));
  }
  expect(doc).toContain(`${period.rows.length} rows`);
  expect(doc).toContain(`${products(period.rows).length} products`);
  expect(doc).toContain(`${current.rows.length} rows`);
  expect(doc).toContain(`${products(current.rows).length} products`);
});

test("the rows the doc quotes are rows of the kept period", () => {
  const quoted = doc.split("\n").filter((l) => l.startsWith('{"service":')).map((l) => JSON.parse(l));
  expect(quoted.length).toBeGreaterThanOrEqual(3);
  for (const q of quoted) expect(period.rows).toContainEqual(q);
});

test("the price of a stored write is the rule's, and the doc and the page give it", () => {
  const w = storedWritePrice(period.rows);
  expect(period.total).toBe(0);
  expect(w).toEqual({ cost: 0, operations: 31490, quotient: 0, price: "0.00018", divided: false });
  expect(doc).toContain(`$0 / ${num(w.operations)} = $0`);
  expect(doc).toContain('price: "0.00018"');
  expect(page).toContain("usage.account");
  expect(page).toContain("tools/cloud-brain/cloudflare-usage.md");
});

test("a bill with a cost is divided by the Class A operations and rounded up to a millionth", () => {
  const rows = [row("R2 Data Storage (First 10GB-Month included)", 40, 1.15), row("R2 Storage Class A Operations (First 1M included)", 600000, 0.9),
    row("R2 Storage Class A Operations (First 1M included)", 400000, 0.15), row("R2 Storage Class B Operations (First 10M included)", 5, 100),
    { ...row("R2 Data Storage (First 10GB-Month included)", 1, 100), family: "D1" }];
  const w = storedWritePrice(rows);
  expect(w.operations).toBe(1000000);
  expect(w.cost).toBeCloseTo(2.2, 9);
  expect(w.price).toBe("0.000003"); // 0.0000022, up
  expect(w.divided).toBe(true);
  expect(storedWritePrice([row("R2 Storage Class A Operations (First 1M included)", 1000000, 3)]).price).toBe("0.000003"); // a whole millionth stays
  expect(storedWritePrice([row("R2 Storage Class A Operations (First 1M included)", 10, 0.5)]).price).toBe("0.05");
});

test("with no operations, or no rows, there is nothing to divide", () => {
  expect(storedWritePrice([]).price).toBe(NOTHING_TO_DIVIDE);
  expect(storedWritePrice([row("R2 Data Storage (First 10GB-Month included)", 40, 0.45)])).toEqual({ cost: 0.45, operations: 0, quotient: 0, price: NOTHING_TO_DIVIDE, divided: false });
});

test("a number is printed with no exponent", () => {
  expect([0, 31490, 0.160243123, 0.0000932157, 24452259, 1e-9].map(num)).toEqual(["0", "31490", "0.160243", "0.0000932157", "24452259", "0.000000001"]);
});
