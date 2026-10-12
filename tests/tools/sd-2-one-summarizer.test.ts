// sd-2-one-summarizer, task 2 of plan/cloud-brain-docs-summarised-for-search.md: what its docs say of the tools.
// The tools' own behaviour is in summarize-papers.test.ts ("sd-2: …") and knowledge-docs-summaries.test.ts.
//   bun test --timeout=30000 ./tests/tools/sd-2-one-summarizer.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");

test("the guide says what the docs tool does with a summary, and its four commands", () => {
  const guide = flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"));
  expect(guide).toContain("An entry that holds the line `Summary by summarizer (…)` is neither cut nor unmarked.");
  expect(guide).toContain("`put --stale` leaves a long doc whose entry `knowledge.list` answered with no text");
  for (const c of ["knowledge-docs.ts summarize <name>… --dry", "knowledge-docs.ts summarize --due --usd-max 1", "knowledge-docs.ts status --check-summaries", "knowledge-docs.ts put --plain <name>…"]) expect(guide).toContain(c);
  expect(guide).toContain("The role is named `summarizer` since `sd-2-one-summarizer`");
});

test("each command the guide gives is one the tool takes, and the tool's header names the role, its brief and the two lines of a summarized entry", () => {
  const tool = read("tools/cloud-brain/knowledge-docs.ts"), header = flat(tool.slice(0, tool.indexOf("\nimport ")).replace(/^\/\/ ?/gm, ""));
  for (const w of ['cmd === "summarize"', 'flag("--check-summaries")', 'flag("--plain")', 'flag("--due")', 'opt("--except")', 'opt("--usd-max")']) expect(tool).toContain(w);
  expect(header).toContain("written by the role `summarizer`");
  expect(header).toContain("brain/roles/summarizer.md");
  expect(header).toContain("Summary by summarizer (<model>), <day>, of <source>/<path> as it was with sha256 <the file the agent read>.");
  expect(header).toContain("The whole doc is the file <file> in this Brain's brain-static");
  // The one role's name and the line, in the tool that starts it.
  const papers = read("tools/cloud-brain/summarize-papers.ts");
  expect(papers).toContain('export const ROLE = "summarizer";');
  expect(papers).toContain("read your brief, brain/roles/${ROLE}.md, then summarize a ${x.kind}: ");
});

test("the spec has the note of what was built otherwise, and the record has what changed, the tests and what was not tried", () => {
  const spec = flat(read("plan/cloud-brain-docs-summarised-for-search.md"));
  expect(spec).toContain("**As built, task 2 (`sd-2-one-summarizer`, 2026-10-12).**");
  expect(spec).toContain("**The task line names the brief**");
  const record = read("tools/cloud-brain/records/sd-2-one-summarizer.md");
  for (const h of ["## What changed", "## The tests", "## The dry runs on three docs", "## Not tried"]) expect(record).toContain("\n" + h + "\n");
  expect(record).toContain("No summary was put on cb4");
});
