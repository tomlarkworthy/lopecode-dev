// sd-4-the-rest-and-the-release-line: the texts that say what a release's `summaries due` line is and who runs its
// command, and the record. The line's own tests are in lock.test.ts and knowledge-docs-summaries.test.ts.
//   bun test --timeout=30000 ./tests/tools/sd-4-the-rest-and-the-release-line.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const B = ".claude/skills/brain-maintenance/";
const COMMAND = "summarize --due --first-paragraph --usd-max 1";

test("the command lock.sh prints is one the tool reads, flag by flag, and the guide and SKILL.md give the same one", () => {
  const lock = read("tools/cloud-brain/lock.sh"), tool = read("tools/cloud-brain/knowledge-docs.ts");
  expect(lock).toContain(`BRAIN_BASE=$BRAIN_BASE $TOOL ${COMMAND} (a reviewer leaves it: the next landing prints it again)`);
  for (const f of COMMAND.match(/--[a-z-]+/g)!) expect([f, tool.includes(`flag("${f}")`) || tool.includes(`opt("${f}")`)]).toEqual([f, true]);
  // The line of the tool that lock.sh reads.
  expect(lock).toContain("sed -n 's/^summaries due: //p'");
  expect(tool).toContain('console.log("summaries due: " + ');
  expect(flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"))).toContain(`knowledge-docs.ts ${COMMAND}`);
  expect(flat(read(B + "SKILL.md"))).toContain(`knowledge-docs.ts ${COMMAND}`);
});

test("the two briefs say what an agent does with the line: the command in the background, its last line, the at of its first journal line", () => {
  for (const f of [B + "agents/implementer/landing.md", B + "agents/spec.md"]) {
    const text = flat(read(f)), at = text.indexOf("`summaries due (cb4): …`");
    expect([f, at > 0]).toEqual([f, true]);
    const part = text.slice(at, at + 700);
    for (const said of ["as a background command", "read its last line", "name in your report the `at` of its first line in `<root>/tools/cloud-brain/.emitted/docs/journal.jsonl`"]) expect([f, said, part.includes(said)]).toEqual([f, said, true]);
  }
  // In the implementer's page it stands at the release, after what the docs line is.
  const landing = read(B + "agents/implementer/landing.md");
  expect(landing.indexOf("`summaries due (cb4): …`")).toBeGreaterThan(landing.indexOf("Then one line `docs (cb4): …`"));
});

test("SKILL.md step 5 has the role summarizer for a paper and a doc, with both journals and both keys", () => {
  const skill = read(B + "SKILL.md");
  const part = flat(skill.slice(skill.indexOf("**The role `summarizer`**"), skill.indexOf("**The role `approver`**")));
  for (const said of ["cost/<id>/summarizer/<round>", "cost/<id>/paper-summarizer/1", ".emitted/papers/journal.jsonl", ".emitted/docs/journal.jsonl", "`summaries due (cb4): …`", "A line `summaries due` in the report of a reviewer is left"]) expect([said, part.includes(said)]).toEqual([said, true]);
  expect(skill).not.toContain("**The role `paper-summarizer`**");
});

test("the guide has the fourth line of a release and says since when the 49 long docs have a paragraph; the spec has the note of task 4", () => {
  const guide = flat(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"));
  expect(guide).toContain("summaries due (cb4): <names>. A writer or a spec writer runs");
  expect(guide).toContain("**The 49 long docs of 2026-10-13, 07:30 CEST, have a first paragraph since 09:09 that day**");
  expect(guide).toContain("The release starts no agent.");
  const spec = flat(read("plan/cloud-brain-docs-summarised-for-search.md"));
  expect(spec).toContain("**As built, task 4 (`sd-4-the-rest-and-the-release-line`, 2026-10-13): the 49 long docs of that morning have the first paragraph of a summary, and a release names the docs that wait for one.**");
  // Until summarize-due-default-whole-summary the sentence ended "still puts a whole summary, the form that failed R5."
  expect(spec).toContain("`summarize --due` with no flag put a whole summary, the form that failed R5, until `summarize-due-default-whole-summary` later that day");
});

test("the record says first that nothing measures a gain, has the run's figures and what was not tried", () => {
  const record = read("tools/cloud-brain/records/sd-4-the-rest-and-the-release-line.md");
  expect(record.split("\n")[2]).toStartWith("**Done as the owner chose, and nothing here measures a gain from it.**");
  for (const h of ["## The run", "## What cb4 holds, read after the run", "## What was built", "## The tests", "## Not tried", "## Read first"]) expect(record).toContain("\n" + h + "\n");
  for (const n of ['"picked":49,"put":48', "usd 0.674005", "seconds 2311", "context 86854", '"checked":52,"summarized":49', "1791869440009"]) expect([n, record.includes(n)]).toEqual([n, true]);
  expect(record).toContain("**Whether the search is better.**");
  expect(/TESTS_LINE|SUITE_LINE/.test(record)).toBe(false);
});
