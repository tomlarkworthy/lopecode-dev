// rules.md, Never: "Submit, or record a `pass`, without a test count from a run you made yourself."
// A digest has no tests, and its two briefs have the agents count four numbers at the published address, so
// digest-2026-10-11 was submitted (event 401) and passed (405) across that line. The owner, event 1093: "the test
// is clearly that the digest was published. Maybe say confirmation of action can be a test if the task does not
// have tests." The line says so since. Issue digest-pass-has-no-test-count.
//
//   bun test ./tests/tools/rules-count-for-a-task-with-no-tests.test.ts
import { test, expect } from "bun:test";
import { inFull } from "./implementer-brief";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const skill = join(root, ".claude/skills/brain-maintenance");

// One item of a list: its first line and the indented lines under it, as one line of text.
const item = (text: string, starts: string): string => {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.startsWith(starts));
  if (at < 0) return "";
  const rest = lines.slice(at + 1);
  const end = rest.findIndex((l) => !l.startsWith("  "));
  return [lines[at], ...rest.slice(0, end < 0 ? rest.length : end)].map((l) => l.trim()).join(" ");
};

const line = item(readFileSync(join(skill, "rules.md"), "utf8"), "- Submit, or record a `pass`");

test("item() reads one item and stops at the next", () => {
  expect(item("- a\n  b\n- c\n", "- a")).toBe("- a b");
  expect(item("- a\n\n## h\n", "- a")).toBe("- a");
  expect(item("- a\n", "- z")).toBe("");
});

// What stands before the marker is the rule's first sentence and the owner's words, and nothing else: a reading
// put there would read as his (review 1148, finding 1).
const marker = " The rest of this item is the writer's reading, not his words. ";
const his =
  "- Submit, or record a `pass`, without a test count from a run you made yourself. Tom, 2026-10-11, event 1093 of " +
  "`digest-pass-has-no-test-count`, of a digest submitted and passed with no tests: \"the test is clearly that the " +
  "digest was published. Maybe say confirmation of action can be a test if the task does not have tests.\"";
const reading = line.slice(line.indexOf(marker) + marker.length);

test("before the marker: the first sentence and the owner's words, letter for letter", () => {
  expect(line.split(marker).length).toBe(2);
  expect(line.slice(0, line.indexOf(marker))).toBe(his);
});

test("after the marker: an act with no tests is confirmed by the agent itself", () => {
  expect(reading).toMatch(/is an act \(.*\) and has no tests/);
  expect(reading).toContain("the confirmation that the act happened is the test");
  expect(reading).toContain("made by you");
  expect(reading).toContain("A confirmation another agent made is not yours.");
});

// A digest adds a seed, so a sentence that leaves out every change to a file leaves out the digest (finding 2).
test("a digest is named as such a task, and a doc alone as not one", () => {
  expect(reading).toMatch(/A digest is such a task, though it also adds a seed: its act is the publish/);
  expect(reading).toMatch(/nothing published and nothing sent, is not: a doc alone still gets a test file/);
  expect(reading).not.toMatch(/a change to a file is not such a task/);
});

test("the brief it names for a digest has the four numbers counted at the library address", () => {
  expect(reading).toContain("`agents/digest.md` step 8");
  const step8 = item(readFileSync(join(skill, "agents/digest.md"), "utf8"), "8. **Publish, count");
  expect(step8).toContain("count the same four numbers there");
  expect(step8).toContain("/library/research-<day>");
});

test("the doc-alone sentence it names is in the implementer's brief", () => {
  expect(reading).toContain("(`agents/implementer.md`, \"The tracker's write calls\")");
  const brief = inFull(join(skill, "agents"));
  const section = brief.slice(brief.indexOf("## The tracker's write calls"), brief.indexOf("## What a reviewer will check"));
  expect(section).toContain("(a doc alone) still needs a count for the submit");
});
