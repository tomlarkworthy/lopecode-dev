// sd-3b-first-paragraph-alone: the record of the second pilot has its parts and its verdict, and the spec and the
// guide say what it found. The flag's test is in knowledge-docs-summaries.test.ts ("summarize --first-paragraph: …").
//   bun test --timeout=30000 ./tests/tools/sd-3b-first-paragraph-alone.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const RECORD = "tools/cloud-brain/records/sd-3b-first-paragraph-alone.md";

test("the record has what was asked, the run, the gate beside the pilot's, the put-back, the cost and what was not tried", () => {
  const record = read(RECORD);
  for (const h of ["## What was asked, and the answer to each", "## What was built", "## Before the first put", "## The run", "## The gate", "## What moved", "## Put back plain", "## The cost", "## Not tried"])
    expect(record).toContain("\n" + h + "\n");
  expect(record.split("\n")[2]).toStartWith("**Passes.**");
  // Set K by words before and with the paragraphs, the pilot's with a whole summary, set L by meaning, and the journal's sum.
  for (const n of ["0.950", "0.652", "0.517", "0.426", "$0.125608", "$0.137273"]) expect(record).toContain(n);
  expect(flat(record)).toContain("`same` for all ten");
  // It says what the form did not gain, before the tables.
  expect(record.indexOf("**What the first paragraph did not do: raise set L.**")).toBeLessThan(record.indexOf("## What was asked"));
  expect(record.indexOf("**What the first paragraph did not do: raise set L.**")).toBeGreaterThan(0);
});

test("the record quotes no question of the two sets", () => {
  const spec = read("plan/cloud-brain-docs-summarised-for-search.md"), record = read(RECORD);
  const qs = [...spec.slice(spec.indexOf("## The question sets")).matchAll(/^doc:\S+\s+\d+\s+(.+)$/gm)].map((m) => m[1].trim());
  expect(qs.length).toBe(20);
  for (const q of qs) expect(record).not.toContain(q.slice(0, 40));
});

test("the spec and the guide say that the gate passed, that set L fell, that none is on cb4, and name the flag", () => {
  const spec = flat(read("plan/cloud-brain-docs-summarised-for-search.md"));
  expect(spec).toContain("**As built, `sd-3b-first-paragraph-alone` (2026-10-13): the same ten once more, the entry holding the summary's first paragraph alone, and R5 passes.**");
  expect(spec).toContain("set L fell, by words 0.623 to 0.614 and by meaning 0.517 to 0.426");
  expect(spec).toContain("(As built, `sd-3b-first-paragraph-alone`, 2026-10-13: the five headings in order or no heading,");
  const guide = flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"));
  expect(guide).toContain("`sd-3b-first-paragraph-alone` put the same ten again that day with `summarize --first-paragraph`, haiku, and put them back");
  // sd-4-the-rest-and-the-release-line put a first paragraph on every long doc at 09:09 that day, and the sentence says until when.
  expect(guide).toContain("None was on cb4 from 06:17 CEST that day until the run below.)");
  expect(guide).toContain("knowledge-docs.ts summarize <name>… --first-paragraph");
  // The header of the tool names the flag where its commands are listed.
  expect(read("tools/cloud-brain/knowledge-docs.ts")).toContain("summarize <name>… --first-paragraph");
});
