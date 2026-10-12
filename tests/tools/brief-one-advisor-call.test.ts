// The writer's brief and the spec writer's brief each name one call of the advisor, the one before the submit,
// and say that the call before the work is left out. The tool's own description asks for both, and neither
// brief spoke of it until this issue: implementer-one-advisor-call.
//
//   bun test --timeout=30000 ./tests/tools/brief-one-advisor-call.test.ts
//   BRIEFS=<dir> reads another copy of the two files (the copy of before the issue fails every test).
import { expect, test } from "bun:test";
import { inFull } from "./implementer-brief";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = process.env.BRIEFS || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents");
const heading = "\n## The advisor: one call, before the submit\n";
const count = (text: string, part: string) => text.split(part).length - 1;
const brief = (name: string) => {
  const text = name === "implementer.md" ? inFull(dir) : readFileSync(join(dir, name), "utf8");
  const from = text.indexOf(heading), to = from < 0 ? -1 : text.indexOf("\n## ", from + heading.length);
  const first = text.search(/\n1\. \*\*/);
  return { text, from, first, part: from < 0 ? "" : text.slice(from, to < 0 ? undefined : to).replace(/\s+/g, " ") };
};

for (const [name, step, left] of [
  ["implementer.md", "step 11", "The call before the approach is left out"],
  ["spec.md", "step 6", "The call before the writing is left out"],
] as const) {
  test(`${name} has the part once, before its first step`, () => {
    const b = brief(name);
    expect(count(b.text, heading)).toBe(1);
    expect(b.first).toBeGreaterThan(0);
    expect(b.from).toBeLessThan(b.first);
  });

  test(`${name} names one call, where it is made, the call left out and when it is not`, () => {
    const { part } = brief(name);
    for (const p of ["This brief asks for one", step, left, "unless", "Say in your report how many calls you made"]) expect(part).toContain(p);
  });

  test(`${name} says the tool asks otherwise, and its numbers have their date and their source`, () => {
    const { part } = brief(name);
    for (const p of ["its own description asks for", "2026-10-12", "`implementer-one-advisor-call`"]) expect(part).toContain(p);
  });

  test(`${name}: the step of the call points at the part`, () => {
    const { text, from } = brief(name);
    expect(count(text.slice(Math.max(from, 0) + heading.length), "\"The advisor: one call, before the submit\"")).toBeGreaterThan(0);
  });
}
