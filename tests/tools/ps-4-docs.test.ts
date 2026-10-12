// ps-4-the-rest: the doc line of R6 (plan/cloud-brain-paper-summarizer-persona.md) and the role of a cost event.
// The doc's commands are ones the tool has, and step 5 of the loop names the role with every field issue.cost requires.
//
//   bun test ./tests/tools/ps-4-docs.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const doc = read("knowledge/calling-a-cloud-brain-from-this-checkout.md"), tool = read("tools/cloud-brain/summarize-papers.ts");

test("the doc gives text, run and check in that order, and each command and flag of its lines is one the tool reads", () => {
  const lines = doc.split("\n").filter((l) => l.startsWith("BRAIN_BASE=cb4 bun tools/cloud-brain/summarize-papers.ts "));
  expect(lines.map((l) => l.split(/\s+/)[3])).toEqual(["text", "run", "check"]);
  const commands = /if \(!\[([^\]]+)\]\.includes\(cmd\)\)/.exec(tool)![1];
  for (const l of lines) {
    expect(commands).toContain(`"${l.split(/\s+/)[3]}"`);
    for (const f of l.split("#")[0].match(/--[a-z-]+/g) || []) expect([f, tool.includes(`opt("${f.slice(2)}")`) || tool.includes(`flag("${f.slice(2)}")`)]).toEqual([f, true]);
  }
  // The flags the prose names beside them.
  for (const f of ["usd-max", "again", "ids"]) expect([f, doc.includes("--" + f), tool.includes(`("${f}")`)]).toEqual([f, true, true]);
});

test("step 5 of the loop lists the role and says what each required field of its one event is", () => {
  const skill = read(".claude/skills/brain-maintenance/SKILL.md");
  const at = skill.indexOf("**The role `paper-summarizer`**"), end = skill.indexOf("6. **Oversight.**");
  expect(at).toBeGreaterThan(skill.indexOf("5. **When an agent reports**"));
  expect(end).toBeGreaterThan(at);
  const part = skill.slice(at, end);
  expect(part).toContain("cost/<id>/paper-summarizer/1");
  for (const field of ["`role`", "`round`", "`how` `light`", "`outcome`", "`seconds`", "`context`", "`usd`"]) expect([field, part.includes(field)]).toEqual([field, true]);
  expect(/`role` is [^(]*`paper-summarizer` \(a name/.test(skill)).toBe(true);
});
