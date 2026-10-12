// SKILL.md of the issue loop, step 2: a named rate limit stops new starts for the pass, and the advisor tool's
// limit is one of them. The owner answered "A" (event 3768) to the choice of keeping the sentence or excepting
// the advisor's limit; the sentence stays as it was and his answer stands beside it. Issue skill-step-2-advisor-rate-limit.
//
//   bun test ./tests/tools/skill-step-2-advisor-rate-limit.test.ts
//   SKILL=<file> reads another copy of the procedure (the one before the change fails the second and the third).
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

test("the advisor tool's limit is named as one that stops new starts, after the sentence", () => {
  const line = "A limit of the advisor tool is such a limit, also when every other call of the agent that names it was answered: the pass starts nothing new.";
  expect(count(two, line)).toBe(1);
  expect(two.indexOf(line)).toBeGreaterThan(two.indexOf(sentence));
});

test("the owner's answer is beside it with its event, and the choice it answered in the loop's words", () => {
  expect(two).toContain('(The owner, 2026-10-12, event 3768 of `skill-step-2-advisor-rate-limit`: "A".');
  expect(two).toContain('Choice A of comment 3682 there: "As written: any named limit stops new starts for that pass."');
  expect(two).toContain("Choice B, not taken,");
});

test("step 2 has no exception for the advisor's limit: the words of choice B are not in it", () => {
  for (const part of ["of its own calls", "does not stop a start;", "two reports of it in one pass do"]) expect(two).not.toContain(part);
});
