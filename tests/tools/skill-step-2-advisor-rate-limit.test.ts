// SKILL.md of the issue loop, step 2: a named rate limit stops new starts for the pass. The owner answered "A"
// (event 3768 of skill-step-2-advisor-rate-limit) to the choice of keeping the sentence or excepting the advisor
// tool's limit, so the sentence stays as it was. Five lines beside it (the advisor's limit named, his answer, the
// choice quoted) were taken out on his "B" of event 4354: issue skill-step-2-five-lines-out. This file holds the
// sentence alone, and that those lines are not in step 2.
//
//   bun test ./tests/tools/skill-step-2-advisor-rate-limit.test.ts
//   SKILL=<file> reads another copy of the procedure (the one with the five lines fails the second).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8");
const from = skill.indexOf("\n2. **"), to = skill.indexOf("\n3. **", from + 1);
const two = skill.slice(from, to).replace(/\s+/g, " ");
const count = (text: string, part: string) => text.split(part).length - 1;
const sentence =
  "Start nothing new in a pass in which an agent's report or your own session names a rate limit or a usage limit, " +
  "or in which `lock.sh show land` has named the same holder for two passes.";

test("step 2 has the sentence once, as it was before the choice", () => {
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  expect(count(two, sentence)).toBe(1);
  expect(count(skill.replace(/\s+/g, " "), "Start nothing new in a pass")).toBe(1);
});

test("step 2 has nothing beside the sentence on the advisor's limit, the owner's answer or the choice", () => {
  for (const part of ["A limit of the advisor tool", "the advisor's limit", "event 3768", "comment 3682", "Choice A", "Choice B"]) expect(two).not.toContain(part);
});

test("step 2 has no exception for the advisor's limit: the words of choice B are not in it", () => {
  for (const part of ["of its own calls", "does not stop a start;", "two reports of it in one pass do"]) expect(two).not.toContain(part);
});
