// rules.md had no line for an act of its Never list that a session does with the owner present, on his word in
// that session: the deployer (dv-4, comment 1020), the kernel (gi-1, comment 2426) and four approve moves on one
// word, shown by title (events 2608 to 2611). The owner chose A of comment 2825 of seen-never-crossed-on-chat-word
// at event 3773. Issue rules-md-acts-on-the-owners-word.
//
//   bun test ./tests/tools/rules-md-acts-on-the-owners-word.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const rules = readFileSync(join(root, ".claude/skills/brain-maintenance/rules.md"), "utf8");
const skill = readFileSync(join(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its "## " heading to the next one.
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
// The line of a file that has a text, flattened ("" when none has it).
const lineWith = (text: string, has: string): string => flat(text.split("\n").find((l) => l.includes(has)) ?? "");

const name = "An act of Never, on the owner's word";
const ref = `"${name}"`;
const word = flat(section(rules, name));
const marker = " The rest of this section is the writer's reading, not his words. ";

// The choice as comment 2825 of seen-never-crossed-on-chat-word has it (issue.get, 2026-10-12), after its "A: ".
const choiceA =
  '"rules.md gains the sentence that a session with the owner present does an act of the Never list on his word, ' +
  "quoted on the issue with its date, and that one word may approve several issues he was shown by title; the cost " +
  "is that 'shown the passing review' no longer means he read it.\"";

test("section() and lineWith() read one and say when there is none", () => {
  expect(section("# t\n\n## a\nx\n\n## b\ny\n", "a")).toBe("## a\nx\n");
  expect(section("# t\n\n## a\nx\n", "z")).toBe("");
  expect(lineWith("one\n  two  words\n", "two")).toBe("two words");
  expect(lineWith("one\n", "z")).toBe("");
});

test("his letter with its event and issue, and the choice it answered, before the marker", () => {
  expect(word.split(marker).length).toBe(2);
  const his = word.slice(0, word.indexOf(marker));
  expect(his).toContain('Tom, event 3773 of `seen-never-crossed-on-chat-word`: "A".');
  expect(his).toContain(`Choice A of comment 2825 there: ${choiceA}`);
});

test("the reading has the cost he accepted, and one word for several issues shown by title", () => {
  const reading = word.slice(word.indexOf(marker) + marker.length);
  expect(reading).toContain('"shown the passing review" no longer means he read it');
  expect(reading).toContain("several issues he was shown by title");
  expect(reading).toContain("Each gets an `approve` move of its own");
  expect(reading).toContain("says what he was shown");
});

test("the reading says who, whose word, and where it is quoted", () => {
  const reading = word.slice(word.indexOf(marker) + marker.length);
  expect(reading).toContain("the orchestrating session, or a session outside the loop");
  expect(reading).toContain("Not an agent that a session spawned");
  expect(reading).toContain("a writer, a reviewer, a spec writer, a digest writer, the overseer");
  expect(reading).toContain("is not his word");
  expect(reading).toContain("names the act");
  expect(reading).toContain("in a comment on the issue the act is for, with the date");
});

test("the reading names the three cases of the ticket by their events", () => {
  const reading = word.slice(word.indexOf(marker) + marker.length);
  expect(reading).toContain("comment 1020 of `dv-4-owner-install-and-shell`");
  expect(reading).toContain("comment 2426 of `gi-1-kernel-link-for-several`");
  expect(reading).toContain("events 2608 to 2611");
  expect(reading).toContain('"I approve those first 4"');
});

test("Never agrees: the approve line, the first line and the line of the four Workers", () => {
  const never = flat(section(rules, "Never"));
  expect(never).not.toContain("The `approve` move alone may be made");
  expect(never).not.toContain("after being shown the passing review");
  expect(never).not.toContain("not on a word given for another issue");
  expect(never).not.toContain("One exception, under the next line");
  expect(never).toContain("or of several issues he was shown by title");
  expect(never).toContain("names the review's event and says what he was shown");
  // The section is named in the first line, the approve line and the line of the kernel, core, db and deployer.
  expect(never.split(ref).length - 1).toBe(3);
  expect(never).toContain(`and is not started. A session with the owner present deploys one on his word (${ref}).`);
});

test("the sentence that lists every act with his session names the section", () => {
  const token = flat(section(rules, "A token an approved spec names"));
  expect(token).toContain(`and an act of ${ref}. No other agent of the loop makes a token of this kind.`);
});

test("SKILL.md agrees: the row of awaiting-approval, what is still his alone, what the loop does not do", () => {
  const row = lineWith(skill, "| at `awaiting-approval` |");
  expect(row).not.toContain("after its passing review was shown to him");
  expect(row).toContain("or several issues he was shown by title");
  expect(row).toContain("one move an issue");
  expect(row).toContain(ref);

  const alone = flat(section(skill, "A token an approved spec names"));
  expect(alone).not.toContain("every other act with his session but the `approve` move (`rules.md`, Never).");
  expect(alone).toContain(ref);

  const not = lineWith(skill, "- Anything owner-present:");
  expect(not).not.toContain("which has one exception since 2026-10-11");
  expect(not).toContain("quoted on the issue with its date");
  expect(not).toContain(ref);
});
