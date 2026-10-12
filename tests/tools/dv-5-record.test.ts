// The record of dv-5-read-first-20-runs gives counts of the deploy runs before and after shell/verify.html was put.
// Each is computed here from the lines logs.deploys answered (tests/tools/fixtures/dv-5-deploy-lines.json) and
// looked for in the record as tests/tools/dv-5-runs.ts prints it. The spec's line of task 5 names the record.
//
//   bun test --timeout=30000 ./tests/tools/dv-5-record.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load, report, runsOf, summary } from "./dv-5-runs";

const root = resolve(import.meta.dir, "../..");
const path = resolve(root, "tools/cloud-brain/records/dv-5-read-first-20-runs.md");
const record = existsSync(path) ? readFileSync(path, "utf8") : "";
const s = summary();
const lines = report();

test("the fixture is the span the record names, and every verify line has its verdict", () => {
  const f = load();
  expect(record).toContain(`from=${f.from}&to=${f.to}`);
  const verify = f.lines.filter((l: any) => l.at === "deploy.verify").length;
  const runs = runsOf(f.lines);
  expect(runs.filter((r) => r.page).length).toBe(verify);
  expect(runs.filter((r) => !r.page && r.at !== "deploy.verify.none").length).toBe(1);
});

test("the spec's 45 are in the lines as the spec counted them", () => {
  expect(s.spec45).toMatchObject({ runs: 45, verdicts: { verified: 38, failed: 7 }, min: 5041, median: 8723, p90: 19053, max: 23956 });
});

test("the first 20 runs on the file: 20 verified, no failure, no none, 9 other tests", () => {
  expect(s.first20.verdicts).toEqual({ verified: 20 });
  expect(s.first20.otherTestsRan).toEqual({ "9": 20 });
  expect(s.first20Runs.every((r) => r.page === "short")).toBe(true);
  expect(s.first20.median).toBeLessThan(s.spec45.median);
});

test("the record has the four lines of counts as the script prints them", () => {
  for (const l of lines.slice(1, 5)) expect(record).toContain(l);
});

test("the record has each run that gave no verdict, with its place and its reason", () => {
  const none = lines.filter((l) => l.startsWith("none: "));
  expect(none.length).toBe(3);
  for (const l of none) expect(record).toContain(l);
  expect(s.none.every((r) => r.n > 20 && r.page === null && r.reason!.startsWith("browser.extend answered 402"))).toBe(true);
});

test("the record's sentences of the Workers and of the tails are the counts", () => {
  expect(record).toContain(`${s.lower} of the ${s.both} Workers`);
  const both = s.workers.filter((w) => w.before && w.after);
  expect(record).toContain(`${both.filter((w) => w.before === 1 || w.after === 1).length} of them have one run on a side`);
  const by: Record<string, number> = {};
  for (const r of s.first20Runs) by[r.target] = (by[r.target] ?? 0) + 1;
  for (const [w, n] of Object.entries(by)) expect(record).toContain("`" + w + "` " + n);
  expect(s.first20.max).toBeGreaterThan(s.before.max);
  expect(record).toContain(`${s.first20.max} ms`);
  expect(record).toContain(`${s.after.max} ms`);
  expect(record).toContain(lines.find((l) => l.startsWith("otherTestsRan 9 last at"))!);
});

test("the spec's task 5 names the record as built", () => {
  const spec = readFileSync(resolve(root, "plan/cloud-brain-deploy-verdict-from-a-shared-page.md"), "utf8");
  expect(spec).toContain("(As built, `dv-5-read-first-20-runs`, 2026-10-12:");
  expect(spec).toContain("tools/cloud-brain/records/dv-5-read-first-20-runs.md");
});
