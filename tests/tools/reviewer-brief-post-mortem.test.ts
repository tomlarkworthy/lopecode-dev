// The part "A post mortem" of the reviewer's brief: the four questions a review of a post mortem answers, what sends
// one back, which steps of the brief hold for it, and the count the reviewer runs.
// Issue pm-3-reviewer-brief, task 3 of plan/cloud-brain-post-mortems-declared-and-kept.md (design part 6).
//
//   bun test --timeout=30000 ./tests/tools/reviewer-brief-post-mortem.test.ts
// The brief is a file of the Brain. These tests read the copy kept beside them (reviewer-brief.ts, which has why):
// BRIEF=<file> reads a file in its place, BRAIN=<address> what that Brain serves now.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { briefOf } from "./reviewer-brief.ts";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const HEADING = "## A post mortem";
// The four, as part 6 of the spec has them.
const FOUR = [
  "1. Does each step of the trace say what its event, commit or line says? Read five of them, the cause's among them.",
  "2. Is the cause something a change can be made to, and does the trace reach it, or does it stop at an agent?",
  '3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?',
  '4. Would a reader know a second case from "How it is known later"?',
];

// The part: the lines from its heading to the next heading of its level, or to the end of the brief.
const part = async () => {
  const lines = (await briefOf()).split("\n");
  const from = lines.indexOf(HEADING);
  expect(from).toBeGreaterThan(0);
  const next = lines.findIndex((l, i) => i > from && l.startsWith("## "));
  return lines.slice(from + 1, next < 0 ? lines.length : next);
};
// The lines of a text that begin `1. ` to `4. `, each as one line.
const numbered = (lines: string[]) => lines.filter((l) => /^[1-4]\. /.test(l)).map(flat);

test("the brief has the part once, and the paragraph that says what you review sends a labeled issue to it", async () => {
  const brief = await briefOf();
  expect(brief.split("\n").filter((l) => l === HEADING).length).toBe(1);
  const intro = flat(brief.slice(brief.indexOf("\nYou review one issue"), brief.indexOf("\n## Steps\n")));
  expect(intro).toContain('One whose `labels` have `post-mortem` is a post mortem: read "A post mortem" below after step 1.');
});

test("the four questions are those of part 6 of the spec, in order, and no fifth", async () => {
  expect(numbered(await part())).toEqual(FOUR);
  const spec = read("plan/cloud-brain-post-mortems-declared-and-kept.md");
  const six = spec.slice(spec.indexOf("\n### 6. Reviewed"), spec.indexOf("\n### 7. Known later"));
  expect(numbered(six.split("\n"))).toEqual(FOUR);
});

// The writer reads the same four before its submit: one rule in two texts.
test("they are the four of the writer's brief as the checkout has it", () => {
  const brief = read(".claude/skills/brain-maintenance/agents/implementer.md");
  const from = brief.indexOf("\n### Before the submit: the four questions\n");
  expect(from).toBeGreaterThan(0);
  expect(numbered(brief.slice(from, brief.indexOf("\n## ", from)).split("\n"))).toEqual(FOUR);
});

test("a no to 1 or 2 sends it back, and an inexact number is a note", async () => {
  const p = flat((await part()).join("\n"));
  expect(p).toContain("A post mortem that fails 1 or 2 is sent back");
  expect(p).toContain("A number that is inexact is a note (the owner, event 2099)");
});

test("which steps hold, the count, and that the file is its record", async () => {
  const p = flat((await part()).join("\n"));
  expect(p).toContain("Steps 3, 5 and 6 are replaced by these; steps 1, 2 and 7 hold");
  expect(p).toContain("`bun test --timeout=30000 ./tests/tools/post-mortems.test.ts`");
  expect(p).toContain("`tools/cloud-brain/post-mortems/<id>.md`");
  expect(p).toContain("there is none under `tools/cloud-brain/records/`, and that is no finding");
  expect(p).toContain('ir "get?id=<the issue it is of>"');
});

// What the form test does not hold of the column `Held by` (issue post-mortem-actions-prefer-guards, comment 5009 here).
test("under question 3: the six kinds of `Held by` as the form test has them, and the three things it leaves to the reviewer", async () => {
  const p = flat((await part()).join("\n"));
  const kinds = p.match(/a column `Held by`, whose cell starts with ((?:`[a-z]+`(?:, | or )?)+)/);
  expect(kinds).not.toBeNull();
  const form = read("tests/tools/post-mortems.test.ts").match(/const KINDS = (\[[^\]]*\]);/);
  expect(form).not.toBeNull();
  expect(kinds![1].match(/[a-z]+/g)!.filter((w) => w !== "or")).toEqual(JSON.parse(form![1]));
  expect(p).toContain('"generally fixes are better as guards"');
  expect(p).toContain("- For each action held by `text`: could a guard of the installed policy, a state or a move of a workflow, a refusal of a service or a tool, or a test have stopped the step the trace names?");
  expect(p).toContain('"It is shorter" and "it needs his install" are no reason.');
  expect(p).toContain("- For each action held by one of the first four: is the kind named the kind the action is?");
  expect(p).toContain('- Where `## The root cause` is "Not found": is an action `observability` at the step where the trace stopped');
  expect(p).toContain('"None" is then no answer.');
  // the same words in the writer's section
  const writer = flat(read(".claude/skills/brain-maintenance/agents/implementer.md"));
  expect(writer).toContain('"It is shorter" and "it needs his install" are not that');
  expect(writer).toContain('"None" is then no answer');
});

test("the actions are filed after the pass, so their absence is no finding; a secret of a transcript is not quoted", async () => {
  const p = flat((await part()).join("\n"));
  expect(p).toContain("filed after your `pass`");
  expect(p).toContain("no `cause` link to it is no finding");
  expect(p).toContain("Nothing of a transcript that holds a token or a session is quoted in the review");
});

test("what the part names is there: the spec, the writer's section, the form's test, the first post mortem", async () => {
  const p = flat((await part()).join("\n"));
  for (const f of ["plan/cloud-brain-post-mortems-declared-and-kept.md", ".claude/skills/brain-maintenance/agents/implementer.md", "tests/tools/post-mortems.test.ts"]) {
    expect(p, f).toContain(f + "`");
    expect(read(f).length, f).toBeGreaterThan(0);
  }
  expect(read(".claude/skills/brain-maintenance/agents/implementer.md")).toContain("\n## A post mortem\n");
  expect(p).toContain("Review 4541 of `pm-second-summarizer-role`");
  expect(read("tools/cloud-brain/post-mortems/pm-second-summarizer-role.md")).toStartWith("# Post mortem: ");
});
