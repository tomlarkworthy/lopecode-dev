// rc5t-orders-table: generated data behind reactive filters. Each part is scored separately by
// setup.collect (orders-table.collect.js), which acts as the user after the turn: finds the 500 orders,
// picks the least frequent region in the dropdown, raises the minimum-total slider to that region's
// median, and checks the table's own rows, the rendered count and the rendered quantity/revenue totals
// against sums it computes from those rows. The data must be the same JSON after both changes (random
// data regenerated per filter change makes every number jump).
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Filter-then-table as in @tomlarkworthy/atlas (lopecode @tomlarkworthy_atlas.html):
// filteredMap = runtimeMap.filter(filter); Inputs.table(filteredMap, {...})
const ORACLE_SRC = readFileSync(resolve(here, "orders-table.oracle.js"), "utf8");

export default {
  id: "rc5t-orders-table",
  category: "rc5-train",
  question: "Generate 500 fake orders (date, customer, product, region, quantity, unit price) and show them in a table I can sort by any column, with a region dropdown and a minimum-total slider to filter it, a count of matching rows, and a totals row showing the sum of quantity and revenue for what's filtered.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: readFileSync(resolve(here, "orders-table.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "rows500", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "stable", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "regionFilter", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "sliderFilter", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "sortWorks", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "onlyOrderRows", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "countShown", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "totalsShown", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/orders.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
