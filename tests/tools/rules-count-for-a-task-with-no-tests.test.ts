// rules.md, Never: "Submit, or record a `pass`, without a test count from a run you made yourself."
// A digest has no tests, and its two briefs have the agents count four numbers at the published address, so
// digest-2026-10-11 was submitted (event 401) and passed (405) across that line. The owner, event 1093: "the test
// is clearly that the digest was published. Maybe say confirmation of action can be a test if the task does not
// have tests." The line says so since. Issue digest-pass-has-no-test-count.
//
//   bun test ./tests/tools/rules-count-for-a-task-with-no-tests.test.ts
import { test, expect } from "bun:test";
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

test("the Never line still asks for a count from the agent's own run", () => {
  expect(line).toContain("without a test count from a run you made yourself");
});

test("for a task with no tests it takes a confirmation of the act, made by the agent", () => {
  expect(line).toMatch(/task (that|which) has no tests/);
  expect(line).toMatch(/confirmation that the act happened/);
  expect(line).toMatch(/made by you/);
});

test("it carries the owner's words, their date and the event", () => {
  expect(line).toContain("confirmation of action can be a test if the task does not have tests");
  expect(line).toContain("Tom, 2026-10-11");
  expect(line).toContain("event 1093");
});

test("the brief it names for a digest has the four numbers counted at the library address", () => {
  expect(line).toContain("`agents/digest.md` step 8");
  const step8 = item(readFileSync(join(skill, "agents/digest.md"), "utf8"), "8. **Publish, count");
  expect(step8).toContain("count the same four numbers there");
  expect(step8).toContain("/library/research-<day>");
});
