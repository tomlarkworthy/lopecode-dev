// The owner, 2026-10-12, of ten comments the loop had written for him to decide by: "They are unreadable." A session
// gave him the ten as one list, and of it he said "can we please add a rule to write human reviews more in this dense
// style". This holds the rule: the section of rules.md with his words and the items he was given, and the places of
// SKILL.md and the briefs that say how such a comment is written. Issue owner-decisions-written-dense.
// He approved it with B, "Approve, and add one line: what the project is for." The item of that line, his answer
// before the marker and the two places that list the parts are held too. Issue dense-rule-says-what-project-is-for.
// He approved that with B again, "Approve, with the line first, before what the thing is." The order of the two items,
// their heads and the order of the two lists are held. Issue dense-rule-project-line-first.
//
//   bun test ./tests/tools/owner-decisions-written-dense.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = join(root, ".claude/skills/brain-maintenance");
const rules = readFileSync(join(dir, "rules.md"), "utf8");
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
// Since st-4-orchestrator-brief (2026-10-13) the sections "Triage", "A quick win" and "A post mortem" of SKILL.md are in
// agents/orchestrator.md, moved and not rewritten (tests/tools/orchestrator-brief.test.ts): they are read there.
const orchestrator = readFileSync(join(dir, "agents/orchestrator.md"), "utf8");
const implementer = readFileSync(join(dir, "agents/implementer.md"), "utf8");
const overseer = readFileSync(join(dir, "agents/overseer.md"), "utf8");
const approver = readFileSync(join(dir, "agents/approver.md"), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its "## " heading to the next one.
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
// The items of a list: each from its "- " at the line's start to the next one, or to a blank line.
const items = (text: string): string[] =>
  text
    .split(/\n(?=- )/)
    .filter((p) => p.startsWith("- "))
    .map((p) => flat(p.split(/\n\s*\n/)[0]));
// The quoted blocks: each run of lines that begin "> ", with the mark taken off.
const quotes = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .filter((p) => p.split("\n").every((l) => l.startsWith(">")))
    .map((p) => p.split("\n").map((l) => l.replace(/^> ?/, "")).join("\n"));
const item = (text: string, head: string): string => items(text).find((i) => i.startsWith(`- **${head}**`)) ?? "";
const lineWith = (text: string, has: string): string => flat(text.split("\n").find((l) => l.includes(has)) ?? "");

const name = "What the owner is asked to decide";
const ref = `"${name}"`;
const sec = section(rules, name);
const word = flat(sec);
const marker = " The rest of this section is the writer's reading, not his words. ";
const his = word.slice(0, Math.max(0, word.indexOf(marker)));

// His two messages as the body of the issue has them (issue.get, event 4388, 2026-10-12): the first whole, the
// second's last sentence.
const first = '"I am so fucking bored of approving stuff, please tell all the things that are awaiting approval and a summary of the change and impact. They are unreadable."';
const second = '"This simple summary is much better for making decisions so can we please add a rule to write human reviews more in this dense style."';
// What a short part has none of: an event number, a commit or a hash, a file path, a test count.
// His answer to the three choices of the section as first landed, whole, as comment 4884 of the first issue has it,
// and the choice he named, as comment 4784 there has it.
const third = '"1 A 2 B 3 What suggestion is being made? 0.3 minutes is not fast anyway, but whats the extra task 5 has?"';
const choiceB = '"Approve, and add one line: what the project is for."';
// His answer to the three choices of that line as it landed, whole, as comment 5025 of the second issue has it, and
// the choice he named, as comment 4964 there has it.
const fourth = '"B but I am so fucking tired of tired of this endless set of approvals about basically the same thing"';
const choiceFirst = '"Approve, with the line first, before what the thing is."';
const evidence = /\bevent \d|\b\d{4}\b|\b[0-9a-f]{8,}\b|\.(md|ojs|ts|sh|json)\b|\b\d+ (of \d+|tests?|pass)/;

test("the helpers cut a list, a quoted block and a section as the tests below read them", () => {
  expect(items("## a\n\n- one\n  more\n\nafter\n- two\n")).toEqual(["- one more", "- two"]);
  expect(quotes("a\n\n> 1. x\n>    - **A**: y\n\nb\n")).toEqual(["1. x\n   - **A**: y"]);
  expect(section("\n## a\nx\n## b\ny\n", "a")).toBe("## a\nx");
  expect(section("\n## a\nx\n", "c")).toBe("");
  expect(evidence.test("verified by the deployer on 17 tests")).toBe(true);
  expect(evidence.test("passed its review (event 4056)")).toBe(true);
  expect(evidence.test("`brain-x-topic` (`e4b8866d8a2b`)")).toBe(true);
  expect(evidence.test("`plan/cloud-brain-topics-service.md`, task 3")).toBe(true);
  expect(evidence.test("One test in the deployer's seed fails about a third of the time")).toBe(false);
});

test("his words of 20:57 and of 21:02 stand before the one marker, with where they are quoted", () => {
  expect(word.split(marker).length).toBe(2);
  expect(his).toContain("Tom, 2026-10-12 20:57 CEST");
  expect(his).toContain(first);
  expect(his).toContain("21:02 CEST");
  expect(his).toContain(second);
  expect(his).toContain("`owner-decisions-written-dense` (event 4388)");
});

test("three items of the list he was given are quoted, and each is a short part by the section's own items", () => {
  const given = quotes(sec);
  expect(given.map((q) => q.slice(0, 2))).toEqual(["5.", "7.", "10"]);
  expect(given[0]).toContain("**`bk-1-after-link`**: the tracker can record");
  expect(given[1]).toContain("**`tp-3-take-and-done`** (live on cb4).");
  expect(given[2]).toContain("**`iac-origin-test-secret-held-by-clock`**.");
  for (const q of given) expect(evidence.test(q)).toBe(false);
  // A choice is one line with a letter, and the pick is one line.
  for (const q of given.slice(1)) {
    const lines = q.split("\n").slice(1);
    expect(lines.length).toBeGreaterThan(2);
    for (const l of lines.slice(0, -1)) expect(l).toMatch(/^ {3}- \*\*[A-C]\*\*: \S/);
    expect(lines[lines.length - 1]).toMatch(/^ {3}- The loop picks [A-C]\b/);
  }
  // The sizes the section gives are the sizes of what it quotes.
  const sizes = given.map((q) => q.length);
  expect(flat(sec)).toContain(`The three are ${sizes[0]}, ${sizes[1]} and ${sizes[2]} characters`);
  expect(Math.max(...sizes)).toBeLessThan(600);
  expect(flat(sec)).toContain("4060 of `tp-3-take-and-done`, is 2,318");
});

test("the reading says what such a comment has, in the order it has them", () => {
  const holds = item(sec, "What it holds for.");
  expect(holds).toContain("`needs-owner`");
  expect(holds).toContain("waits for his approval");
  expect(holds).toContain("the list of what waits for him");
  expect(holds).toContain("whoever writes it");

  const what = item(sec, "What it is.");
  expect(what).toContain("One or two sentences");
  expect(what).toContain("what the thing does for him");
  expect(what).toContain("no event number, commit, hash, file path or test count");

  expect(item(sec, "Live, and what it costs.")).toContain("what it costs a day");
  expect(item(sec, "The one flaw.")).toContain("that bears on the choice, and no other");

  const choices = item(sec, "The choices.");
  expect(choices).toContain("A letter each, one line each");
  expect(choices).toContain("the pick, one line");

  const order = ["What it holds for.", "What the project is for.", "What it is.", "Live, and what it costs.", "The one flaw.", "The choices.", "Where the rest goes.", "The list."];
  const at = order.map((h) => sec.indexOf(`- **${h}**`));
  expect(at.every((n) => n > 0)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});

test("his two Bs: one line of what the project is for, and it stands first", () => {
  // His answer and the choice it names stand with his other words, before the marker.
  expect(his).toContain(third);
  expect(his).toContain(choiceB);
  expect(his).toContain("comment 4884");
  expect(his).toContain("comment 4784");
  // The second B, of where the line stands, with the choice it names.
  expect(his).toContain(fourth);
  expect(his).toContain(choiceFirst);
  expect(his).toContain("comment 5025");
  expect(his).toContain("comment 4964");

  const project = item(sec, "What the project is for.");
  expect(project).toContain("One line, first");
  expect(project).toContain("before the sentences of what the thing is");
  expect(project).not.toContain("after those sentences");
  // The other item is no longer the first part, and its head does not say so.
  expect(sec).not.toContain("- **What it is, first.**");
  expect(sec.indexOf("- **What the project is for.**")).toBeLessThan(sec.indexOf("- **What it is.**"));
  expect(project).toContain("what the project the issue is part of is for");
  expect(project).toContain("in plain words");
  // What the project is, how it is named, and the issue that has none.
  expect(project).toContain("its parent");
  expect(project).toContain("the spec");
  expect(project).toContain("never by a path");
  expect(project).toContain("no number");
  expect(project).toContain("part of no project");
  expect(project).toContain("has no such line");
  // The three quoted items were given him before the line was asked for, and the item says so: none names a project.
  expect(project).toContain("The three items above have none");
  for (const q of quotes(sec)) expect(q).not.toMatch(/project/i);

  // The item on philosophy.md says which part is now the summary his words of 2026-10-11 ask for.
  const beside = item(sec, "Beside `philosophy.md`.");
  expect(beside).toContain("The line of what the project is for is that summary");
  expect(beside).not.toContain("The first sentences are that summary");
});

test("the evidence stays in the review, the writer's comment and the record, and none of it before the choice", () => {
  const rest = item(sec, "Where the rest goes.");
  expect(rest).toContain("the review, the writer's comment and the record");
  expect(rest).toContain("Nothing of them stands before the choice");
  expect(rest).toContain("one line that says where");
});

test("the list: one, numbered, with those that need no thought grouped first", () => {
  const list = item(sec, "The list.");
  expect(list).toContain("One list of all that waits for him");
  expect(list).toContain("a letter for each number");
  expect(list).toContain('"Rubber stamps (already built and reviewed; all recommended A)"');
  expect(list).toContain("one word answers them all");
});

test("the section says what it leaves as it is, and what is not in his words", () => {
  const tool = item(sec, "A comment a tool reads.");
  expect(tool).toContain("`leave`");
  expect(tool).toContain("is not changed by this section");
  // The brief has the form the item speaks of.
  expect(approver).toContain("approver: leave\n   <one sentence: what the change does, and what stopped the approval>");

  const beside = item(sec, "Beside `philosophy.md`.");
  expect(beside).toContain('"a summary of the overall project goals, and how the decision fits in with pros and cons"');
  expect(beside).toContain("this section holds");

  const not = item(sec, "Not in his words, and not done.");
  expect(not).toContain("unasked");
  expect(not).toContain("Nothing checks a comment against this section");
});

test("Always has an item that names the section", () => {
  const always = items(section(rules, "Always"));
  const it = always.find((i) => i.includes(ref)) ?? "";
  expect(it).toContain("short and plain");
  expect(it).toContain("what its project is for, what it is, whether it is live");
});

test("SKILL.md, and Triage in agents/orchestrator.md, name the section where they say how a comment for him and the list are written", () => {
  const triage = lineWith(orchestrator, "or a line of `rules.md`. The comment is");
  expect(triage).toContain(ref);
  expect(triage).toContain("what its project is for, what it is, whether it is live");
  expect(skill + orchestrator).not.toContain("The comment is in the form `philosophy.md` gives.");

  const major = lineWith(orchestrator, "and comment with the plan, written as");
  expect(major).toContain(ref);
  expect(major).toContain("The owner takes `needs-owner` off");

  const at = skill.indexOf("7. **Tell the user**");
  const tell = flat(skill.slice(at, skill.indexOf("\n8. **Watch, then schedule**", at)));
  expect(at).toBeGreaterThan(0);
  expect(tell).toContain(ref);
  expect(tell).toContain("one list");
});

test("the writer's and the overseer's briefs name the section where they have an agent comment for him", () => {
  const at = implementer.indexOf("3. **Decide whether it is yours.**");
  const step = flat(implementer.slice(at, implementer.indexOf("\n4. **Claim it.**", at)));
  expect(step).toContain(ref);

  const row = lineWith(overseer, "| A decision only the owner can take |");
  expect(row).toContain(ref);
});
