// summarize-due-default-whole-summary: the texts say which form `knowledge-docs.ts summarize` puts with no flag.
// The behaviour's test is in knowledge-docs-summaries.test.ts ("summarize with no flag puts the first paragraph alone, …").
//   bun test --timeout=30000 ./tests/tools/summarize-due-default-whole-summary.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");

test("the tool's header and usage name --whole-summary and say the first paragraph is the form with no flag; the guide and the spec's note say since when; the record has its parts", () => {
  const tool = read("tools/cloud-brain/knowledge-docs.ts");
  expect(tool).toContain("summarize <name>… --whole-summary");
  expect(flat(tool.replace(/^\/\/ ?/gm, ""))).toContain("Since summarize-due-default-whole-summary (2026-10-13) that is the form summarize puts, and writes with --dry, when no flag names one");
  expect(tool.split("[--first-paragraph | --whole-summary]").length).toBe(3);
  expect(tool).not.toContain("[--dry] [--first-paragraph] [");
  const guide = flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"));
  expect(guide).toContain("knowledge-docs.ts summarize <name>… --whole-summary");
  expect(guide).toContain("Since `summarize-due-default-whole-summary` (2026-10-13) `summarize` with neither `--first-paragraph` nor `--whole-summary` puts the first paragraph");
  const spec = flat(read("plan/cloud-brain-docs-summarised-for-search.md"));
  expect(spec).toContain("since then `summarize` with no flag puts the first paragraph, as with `--first-paragraph`, and `--whole-summary` names the form with the five sections.");
  expect(spec).not.toContain("with no flag still puts a whole summary");
  const record = read("tools/cloud-brain/records/summarize-due-default-whole-summary.md");
  for (const h of ["## What changed", "## Tests", "## Not tried"]) expect(record).toContain(h);
});
