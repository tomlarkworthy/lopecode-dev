// writer-started-on-an-owners-act-task (2026-10-13): fly-4b-first-run was the owner's act and after fly-4-loop-files.
// It had the `after` link alone, the queue made it ready when the link was done (event 6664), and a writer was started.
// Held here: the three texts that say how a wait is written say that a task that waits for the owner and for another
// task gets both the link and the label, and the queue reads the label before the link, as the brief says it does.
//
//   bun test --timeout=30000 ./tests/tools/owners-act-task-gets-the-label.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { runningCells, testNeedingRunning } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const DIR = ".claude/skills/brain-maintenance";
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const between = (text: string, a: string, b: string) => {
  const i = text.indexOf(a), j = text.indexOf(b, i + 1);
  expect([a, i >= 0, b, j > i]).toEqual([a, true, b, true]);
  return flat(text.slice(i, j));
};

test("the `decompose` row gives a task that is the owner's and after another task its link and the label", () => {
  const row = between(read(DIR + "/agents/orchestrator.md"), "\n## The `decompose` row\n", "\n## A round at 3 `rework` moves\n");
  for (const said of ["A task the spec leaves to the owner that is also after another task gets both",
    "the label `needs-owner`, put on when the task is opened and not when the other is done",
    "The queue reads the label and the link, and no title, body or comment",
    "Its comment begins with what the task waits for",
    "`writer-started-on-an-owners-act-task`"]) expect(row).toContain(said);
  // The row is one line still, as SKILL.md's cell had it.
  expect(read(DIR + "/agents/orchestrator.md").split("\n").filter((l) => l.startsWith("Open each task the spec lists")).length).toBe(1);
  // What was there stays: the link is written before any move, and an owner's task is not made ready.
  for (const said of ["written before any task is moved", "Then `triage` and `ready` each task, but one the spec leaves to the owner (`needs-owner`, with its comment)"]) expect(row).toContain(said);
});

test("the spec writer's brief says how a spec marks a task that is the owner's act", () => {
  const tasks = between(read(DIR + "/agents/spec.md"), "   - the tasks, in the order they land", "\n6. **Land it**");
  for (const said of ["A task that is the owner's act", "says so in a line of its own, \"The owner's: <the act>\"",
    "beside the tasks it is after", "labels it `needs-owner` when it opens it",
    "Each act of that list that is a task is named there by the task's id",
    "`writer-started-on-an-owners-act-task`"]) expect(tasks).toContain(said);
});

test("SKILL.md, where a pass by hand reads the three ways a wait is written, says an issue that waits for two has both", () => {
  const levers = between(read(DIR + "/SKILL.md"), "   Your two levers:", "   The record does not know which agents run");
  expect(levers).toContain("An issue that waits for two of them has both");
  expect(levers).toContain("a task that is the owner's act and after another task has the link and the label");
  // The note on the five moved texts says this one has been added to since the move.
  const note = between(read(DIR + "/SKILL.md"), "\n## What is in `agents/orchestrator.md`\n", "\n## ");
  for (const said of ["moved as they stood with no word changed", "One of the five has been added to since: \"The `decompose` row\"", "`writer-started-on-an-owners-act-task`"]) expect(note).toContain(said);
});

// Of the tracker cb4 runs (cloud-brain-dev/deploy/ after `bun sync.ts`): its seed brain-issues.ojs was deleted on 2026-10-14.
testNeedingRunning("owners-act-task-gets-the-label.test.ts, issueQueue", "brain-issues").test("the queue reads the label before the link: `waits` of issueQueue answers `owner` above its `after` line", async () => {
  const seed = (await runningCells("brain-issues")).find((v) => v._name === "issueQueue")!._definition;
  const a = seed.indexOf("  const waits = (i) => {"), body = seed.slice(a, seed.indexOf("\n  };", a));
  const owner = body.indexOf('includes("needs-owner") && !begun.includes(i.state)'), after = body.indexOf('return { why: "after"');
  expect([a > 0, owner > 0, after > owner]).toEqual([true, true, true]);
});
