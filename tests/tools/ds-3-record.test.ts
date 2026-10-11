// The record of ds-3-logs-reads-the-span gives the number of lines its change added to the Logs test, and says of the
// spec only what the spec says. Review 1424 found "Seven lines" where the seed has 14, and "the spec expects" where the
// spec says "they may".
//
//   bun test ./tests/tools/ds-3-record.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const record = read("tools/cloud-brain/records/ds-3-logs-reads-the-span.md");

test("the record's count of lines added to the test is the seed's", () => {
  const seed = read("tools/cloud-brain/cloud-brain.ojs").split("\n");
  const from = seed.findIndex((l) => l.includes(`// The panel's "Last" and a shared control are one value`));
  const to = seed.findIndex((l, i) => i > from && l.includes("return rows.length"));
  expect(from).toBeGreaterThan(0);
  const added = seed.slice(from, to);
  const said = /\| `test_logs_panel_asks_cloudflare_and_a_row_filters_by_its_trace` \| (\d+) lines added at its end: one comment and (\d+) of code, (\d+) of them `expect`/.exec(record);
  expect(said && said.slice(1).map(Number)).toEqual([added.length, added.length - 1, added.filter((l) => l.includes("expect(")).length]);
});

test("the record says of the stand-in what the spec says", () => {
  expect(record).not.toContain("the spec expects");
  expect(read("plan/cloud-brain-dashboards-share-series-and-controls.md")).toContain("was not tried; they may");
  expect(record).toContain("was not tried; they may");
});
