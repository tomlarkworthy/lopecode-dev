// SKILL.md of the issue loop: one order for a free place, no number for the pool, and the reading of
// the issues past 4 hours in step 1. Issue os-2-order-and-pool, task 2 of plan/cloud-brain-loop-order-of-service.md.
//
//   bun test ./tests/tools/os-2-order-and-pool.test.ts
//   SKILL=<file> reads another copy of the procedure (the one before the change fails the first five; the sixth reads the tool).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8");
const flat = skill.replace(/\s+/g, " ");
const step = (n: number) => {
  const from = skill.indexOf(`\n${n}. **`), to = skill.indexOf(`\n${n + 1}. **`, from + 1);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return skill.slice(from, to).replace(/\s+/g, " ");
};
const count = (text: string, part: string) => text.split(part).length - 1;

test("step 3 has the order of a free place once, as the spec words it", () => {
  expect(count(flat, "A place goes, in this order")).toBe(1);
  expect(step(3)).toContain(
    "A place goes, in this order, to: a round that was sent back (a writer's or a spec's); a review that waits; a start. " +
      "Among starts: the owner's before the loop's own; then an issue past 4 hours",
  );
  expect(step(3)).toContain("then a bug or a task before a project or a feature; then the oldest.");
  // the sentence it replaces is kept only as what was, in quotes
  expect(count(flat, "Finishing comes before starting")).toBe(1);
  expect(flat).toContain('"Finishing comes before starting.');
});

test("the rows of a round sent back stand above the rows of a review, and those above the first row that starts", () => {
  const rows = skill.split("\n").filter((l) => l.startsWith("   | "));
  const at = (part: string) => {
    const found = rows.map((l, i) => (l.includes(part) ? i : -1)).filter((i) => i >= 0);
    expect([part, found.length]).toEqual([part, 1]);
    return found[0];
  };
  const sentBack = at("sent back, no agent running");
  const dead = at("**A dead writer.**");
  const quick = at("**A quick win of your own, sent back.**");
  const spec = at("**A spec sent back.**");
  const review = at("| `in-review`, and no review since it came into that state");
  const specReview = at("at `spec-review`, no review since it came there");
  const digest = at("labeled `digest`, at `ready`");
  const ready = at("| `ready` |");
  // "When it cannot be sent one, the next row" of the first names the dead writer's
  expect(rows[sentBack]).toContain("When it cannot be sent one, the next row");
  expect(dead).toBe(sentBack + 1);
  for (const r of [sentBack, dead, quick, spec]) expect(r).toBeLessThan(review);
  expect(specReview).toBe(review + 1);
  for (const s of [digest, ready]) expect(s).toBeGreaterThan(specReview);
  // the rows that start are not ordered by the table: a project at `open` stands above `ready`, and the sentence decides
  expect(at("at `open`, with three parts or more, or the owner's")).toBeLessThan(ready);
  const three = step(3);
  expect(three).toContain("The rows that start an agent (a digest writer for a digest at `ready`, a spec writer for a project or feature at `open`, an implementer for `ready`) are one group");
  expect(three).toContain("the order of those rows in the table decides nothing");
  expect(three).toContain("So a project of the owner's at `open` is started before a task of the loop's at `ready`.");
});

test("no number of writers or reviewers is stated as a limit, in the procedure or in the description", () => {
  expect(skill).not.toMatch(/up to (\d+|two|four|eight) implementers|More than \d+ writers|\d+ implementers of step 2/i);
  const description = skill.split("\n").find((l) => l.startsWith("description:")) ?? "";
  expect(description).not.toMatch(/\b(\d+|two|four|eight) (implementers|reviewers|writers)\b/);
  expect(description).toContain("with no fixed number of either");
  const not = skill.slice(skill.indexOf("## What the loop does not do"), skill.indexOf("## Why the overseer may edit briefs"));
  expect(not).toContain("- Two agents on one issue.");
  expect(not).not.toMatch(/\d+ (writers|reviewers)/);
});

test("step 2 has the rule of the pool as the spec words it, and the owner's numbers as what it replaces", () => {
  const two = step(2);
  for (const part of [
    "No number is set.",
    "Every review that waits gets a reviewer, and every round sent back goes to its writer, in the pass that sees it.",
    "A new writer is started only when, after that, no review waits without a reviewer and no sent-back round waits without a writer.",
    "Start nothing new in a pass in which an agent's report or your own session names a rate limit or a usage limit, or in which `lock.sh show land` has named the same holder for two passes.",
    "One agent on an issue, as before.",
    "none in force since `os-2-order-and-pool`",
    '"try to have 1-2 writers and 1-2 reviewers active at all times"',
    '"maybe we do another 2 in parrallel"',
    '"can we increase the parrallism twofold?"',
    '"Maybe we let it manage its own pool size and not worry about optimality"',
  ]) expect(two).toContain(part);
});

test("step 1 reads the line of issue-stats.ts for the issues past 4 hours, and says what is done with a row", () => {
  const one = step(1);
  for (const part of [
    "bun tools/cloud-brain/issue-stats.ts --token=<your token>",
    "`past 4 h, not started, no reason: <n>`",
    "it goes before every younger start of this pass",
    "comment once with why and what would start it, the body beginning `held:`",
    '"key":"orch/<id>/held-1"',
    "tools/cloud-brain/records/os-3-stats-past-four-hours.md",
  ]) expect(one).toContain(part);
  // the order of step 3 names the place the list is read
  expect(step(3)).toContain('(step 1, "Past 4 hours")');
});

test("the line step 1 names is the one issue-stats.ts prints", () => {
  const tool = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/issue-stats.ts"), "utf8");
  expect(tool).toContain("not started, no reason: ");
  expect(tool).toContain("more are held)");
});
