// agents/overseer.md has the two reads plan/cloud-brain-loop-order-of-service.md gives the overseer: the median stay
// at in-review after os-2-order-and-pool (R3 of the table of checks), and the sign of a machine that carries no more
// writers (part 3, "Not known"). Issue overseer-md-lacks-order-of-service-reads.
//
//   bun test ./tests/tools/overseer-md-order-of-service-reads.test.ts
//   BRIEF=<file> reads another copy of the brief (the one before the change fails the first three; the fourth reads the spec).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const brief = readFileSync(process.env.BRIEF || resolve(root, ".claude/skills/brain-maintenance/agents/overseer.md"), "utf8");
const spec = readFileSync(resolve(root, "plan/cloud-brain-loop-order-of-service.md"), "utf8").replace(/\s+/g, " ");
const from = brief.indexOf("\n## Measure first"), to = brief.indexOf("\n## ", from + 1);
const section = brief.slice(from, to).replace(/\s+/g, " ");
const count = (text: string, part: string) => text.split(part).length - 1;

test("Measure first asks for the median stay at in-review after os-2, once, after the four lines", () => {
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  expect(count(section, "Put a fifth line in your entry")).toBe(1);
  expect(section).toContain("the median stay at `in-review` of the stays that began after event 2849, with the number of stays");
  expect(section).toContain("`plan/cloud-brain-loop-order-of-service.md`, R3");
  expect(section.indexOf("Put a fifth line")).toBeGreaterThan(section.indexOf("a number it lacks is a change you may make to it"));
  expect(section).toContain("put four of its lines in your entry");
});

test("the figure it is read against has where it is from, and when a median is a finding", () => {
  expect(section).toContain("6.3 min over 147 stays");
  expect(section).toContain("Once 40 stays are in the window, a median over 6.3 is a finding.");
  // the tool has no such line for a window; the brief says so and how the line is made
  expect(section).toContain("`issue-stats.ts --window=2849` printed one `window` line and no time in a state");
  expect(section).toContain('io "sync?after=2849"');
});

test("Measure first names the sign of a machine that carries no more writers, and where it goes", () => {
  expect(count(section, "a machine that carried no more writers")).toBe(1);
  expect(section).toContain("name the sign in your entry and add it to `SKILL.md` step 2 as one of your two edits");
});

test("the spec still has what the brief quotes of it", () => {
  expect(spec).toContain("| median 6.3 min, 147 stays, whole record |");
  expect(spec).toContain("A median over 6.3 is a finding for it");
  expect(spec).toContain("the overseer adds the sign that would have (its brief lets it edit the procedure)");
});
