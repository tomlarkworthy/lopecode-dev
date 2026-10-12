// A post mortem's action is a guard, a workflow change, a refusal or a test where one can hold the cause, before a
// sentence an agent reads; and an action of observability when the trace reached no cause. The lines of it in the two
// texts the loop follows and in the spec, and that the form test holds the column the brief names.
// Issue post-mortem-actions-prefer-guards (the owner, 2026-10-12: "generally fixes are better as guards").
//
//   bun test ./tests/tools/post-mortem-actions-prefer-guards.test.ts
//   BRIEF=<file> SKILL=<file> SPEC=<file> FORM=<file> reads other copies (with those of 9109a9d9, the commit before
//   the change, all four fail).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = resolve(root, ".claude/skills/brain-maintenance");
const brief = readFileSync(process.env.BRIEF || resolve(dir, "agents/implementer.md"), "utf8");
const skill = readFileSync(process.env.SKILL || resolve(dir, "SKILL.md"), "utf8");
const spec = readFileSync(process.env.SPEC || resolve(root, "plan/cloud-brain-post-mortems-declared-and-kept.md"), "utf8");
const form = readFileSync(process.env.FORM || resolve(root, "tests/tools/post-mortems.test.ts"), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const section = (text: string, heading: string) => flat(text.match(new RegExp(`\\n## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`))?.[0] ?? "");
const has = (text: string, parts: string[]) => expect(parts.filter((p) => !text.includes(p))).toEqual([]);
const writer = section(brief, "A post mortem"), session = section(skill, "A post mortem");
const KINDS = ["guard", "workflow", "refusal", "test", "observability", "text"];

test("the brief: his two sentences, whole, and the order a kind of change is taken in", () => {
  has(writer, [
    '"would this cover deterministic rule changes or workflow changes, not jsut agent prmpt tweaking, generally fixes are better as guards."',
    '"Also if the cause cannot be determined the action would be to increase observability in the problem area"',
    "**A guard before a sentence.**",
    "take the first of these that can hold the cause, and name it in the column `Held by` of the table, as the first word of the cell",
    "A `text` cell goes on, after the word, with why none of the four can hold this cause",
    '"It is shorter" and "it needs his install" are not that',
    "a guard of the installed policy, a state or a move of a workflow, a refusal of a service or a tool, a test that fails",
  ]);
  // the table of the kinds, in the order they are taken, which is the order the form test has
  const from = brief.indexOf("**A guard before a sentence.**"), to = brief.indexOf("- **When the trace reached no cause", from);
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  const rows = brief.slice(from, to).split("\n").map((l) => l.trim().match(/^\| `([a-z]+)` \|/)?.[1]).filter(Boolean);
  expect(rows).toEqual(KINDS);
});

test("the brief: a trace that reaches no cause says so, and its action is observability, never \"None\"", () => {
  has(writer, [
    '**A trace that reaches no cause says so.** `## The root cause` then has "Not found", the step where the trace stopped',
    "**When the trace reached no cause, the action is `observability`** in the place where it stopped",
    '"None" is then no answer, and neither is a guard against a cause that was guessed.',
    "It counts among the 3",
    'Or "Not found", with the step where the trace stopped |',
  ]);
  // the limit and the sentence of the spec the cause is held by are as they were
  has(writer, ["At most 3 issues a post mortem, over all its rounds", "**The cause is something a change can be made to:**"]);
});

test("the form test holds what the brief says it holds: the six kinds in the brief's order, and the three files it does not ask", () => {
  expect(JSON.parse(form.match(/const KINDS = (\[[^\]]*\]);/)![1])).toEqual(KINDS);
  const before = JSON.parse(form.match(/const BEFORE_HELD_BY = (\[[^\]]*\]);/)![1]) as string[];
  expect(before).toEqual(["pm-second-summarizer-role.md", "pm-approver-leaves-everything.md", "pm-agent-request-not-seen-fly-idle.md"]);
  has(writer, ["holds the name, the first line, the headings, the length and the column `Held by` of the actions for every file of the directory (the column not for the three written before it)"]);
  has(writer, ["what holds the change (the column `Held by`, below)"]);
});

test("SKILL.md and the spec: the column for the session that opens the actions, and the two notes As built", () => {
  has(session, [
    "Since `post-mortem-actions-prefer-guards` (2026-10-12",
    "a column `Held by` for each action, one of `guard`, `workflow`, `refusal`, `test`, `observability`, `text`",
    "a `guard` or a `workflow` row changes the installed policy, so it is opened `major` and is his to install",
    'A file whose cause is "Not found" has an `observability` action and no "None".',
  ]);
  const s = flat(spec);
  expect(s.split("(As built, `post-mortem-actions-prefer-guards`, 2026-10-12").length - 1).toBe(2);
  has(s, ["whose cell starts with `guard`, `workflow`, `refusal`, `test`, `observability` or `text`", "Question 3 of part 6 is as written"]);
  expect(s).toContain('3. Is each action under "Next actions" of the cause, and one change, and is "None" argued?');
});
