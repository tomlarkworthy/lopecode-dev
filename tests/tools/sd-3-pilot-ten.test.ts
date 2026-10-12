// sd-3-pilot-ten, task 3 of plan/cloud-brain-docs-summarised-for-search.md: the record of the pilot has its parts and
// its verdict, and the spec and the guide say that the pilot stopped. The tool's flags are in paper-sets.test.ts ("sd-3: …").
//   bun test --timeout=30000 ./tests/tools/sd-3-pilot-ten.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");

test("the record has what was asked, the runs, the gate, the put-back, the cost and what was not tried", () => {
  const record = read("tools/cloud-brain/records/sd-3-pilot-ten.md");
  for (const h of ["## What the task asked, and the answer to each", "## Before the first put", "## The two runs", "## R5: what the search by words lost",
    "## Put back plain, and read to be the text the tool makes today", "## R7: five summaries read against their docs", "## The cost", "## What was built", "## Not tried"]) expect(record).toContain("\n" + h + "\n");
  expect(flat(record)).toContain("**The task stops, as the spec has it: R5 fails with both models.**");
  // The three readings of set K by words, and the two sums of the journal.
  for (const n of ["0.950", "0.652", "0.649", "$0.137273", "$3.607589"]) expect(record).toContain(n);
  expect(flat(record)).toContain("`same` for all ten, both times");
});

test("the record quotes no question of the two sets: the spec that has them is a doc of the search", () => {
  const spec = read("plan/cloud-brain-docs-summarised-for-search.md"), record = read("tools/cloud-brain/records/sd-3-pilot-ten.md");
  const qs = [...spec.slice(spec.indexOf("## The question sets")).matchAll(/^doc:\S+\s+\d+\s+(.+)$/gm)].map((m) => m[1].trim());
  expect(qs.length).toBe(20);
  for (const q of qs) expect(record).not.toContain(q.slice(0, 40));
});

test("the spec and the guide say that the pilot stopped and that no summary of a doc is on cb4", () => {
  const spec = flat(read("plan/cloud-brain-docs-summarised-for-search.md"));
  expect(spec).toContain("**As built, task 3 (`sd-3-pilot-ten`, 2026-10-13): the pilot stopped, and no summary of a doc is on cb4.**");
  expect(spec).toContain("(As built, `sd-3-pilot-ten`, 2026-10-13: R5 failed with haiku and with opus, and the ten are plain;");
  const guide = flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"));
  expect(guide).toContain("(Task 3, `sd-3-pilot-ten`, put ten on 2026-10-13 with haiku and then with opus and put them back with `put --plain`");
  // The sentences task 2's test holds are still there.
  expect(guide).toContain("An entry that holds the line `Summary by summarizer (…)` is neither cut nor unmarked.");
});
