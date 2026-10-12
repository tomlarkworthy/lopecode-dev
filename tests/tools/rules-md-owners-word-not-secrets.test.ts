// The section "An act of Never, on the owner's word" of rules.md left no item of Never out, so a session the owner
// types into could print a secret on his word in chat. He approved the section at event 4353 of
// rules-md-acts-on-the-owners-word with the reason "B", choice B of comment 3832 there. This holds the smaller
// reading of it: secrets. Issue rules-md-owners-word-not-secrets.
//
//   bun test ./tests/tools/rules-md-owners-word-not-secrets.test.ts
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
// The items of a list: each from its "- " at the line's start to the next one.
const items = (text: string): string[] =>
  text
    .split(/\n(?=- )/)
    .filter((p) => p.startsWith("- "))
    .map(flat);
const lineWith = (text: string, has: string): string => flat(text.split("\n").find((l) => l.includes(has)) ?? "");

const name = "An act of Never, on the owner's word";
const ref = `"${name}"`;
const word = flat(section(rules, name));
const marker = " The rest of this section is the writer's reading, not his words. ";
const his = word.slice(0, Math.max(0, word.indexOf(marker)));
const reading = word.slice(word.indexOf(marker) + marker.length);

// The six secrets as the Never item lists them.
const six = "the recovery key, the deployer key, a session, a token, the Cloudflare token, an app password";
// Choice B as comment 3832 of rules-md-acts-on-the-owners-word has it (issue.get, 2026-10-12), after its "**B.** ".
const choiceB = '"Send it back with the items it does not reach (say, secrets and messages stay Never whatever is said)."';
// The orchestrating session's pick in the same comment, after its "**My pick.** ".
const pick = '"B, with secrets left out: a word in chat is easy to give, and nothing so far needed a secret printed."';

test("items() cuts a list at each item and leaves out what stands before the first", () => {
  expect(items("## a\n\n- one\n  more\n- two\n")).toEqual(["- one more", "- two"]);
  expect(items("no list\n")).toEqual([]);
});

test("his letter of event 4353 and the choice it answered stand before the one marker", () => {
  expect(word.split(marker).length).toBe(2);
  expect(his).toContain('Tom, event 4353 of `rules-md-acts-on-the-owners-word`');
  expect(his).toContain('"B".');
  expect(his).toContain(`Choice B of comment 3832 there: ${choiceB}`);
  // The pick is the loop's text: it is in the reading, and not among his words.
  expect(his).not.toContain("secrets left out");
});

test("the reading has an item for what the section does not reach: a secret, with the six of Never", () => {
  const not = items(section(rules, name)).find((i) => i.startsWith("- **What it does not reach.**")) ?? "";
  expect(not).toContain("A secret printed, copied or logged");
  expect(not).toContain(six);
  expect(not).toContain("stays Never whatever is said in chat");
  expect(not).toContain("is no leave for it");
  expect(not).toContain(pick);
  expect(not).toContain("the orchestrating session's");
});

test("the item says what his B did not decide: a message outside the two addressees", () => {
  const not = items(section(rules, name)).find((i) => i.startsWith("- **What it does not reach.**")) ?? "";
  expect(not).toContain("named no items");
  expect(not).toContain("A message outside the two addressees");
  expect(not).toContain("is not decided");
});

test("no sentence of the reading gives a secret as an act a word could be for", () => {
  expect(reading).not.toContain("is no word to print a key");
});

test("Never agrees: the item of the secrets names the section, and the first item leaves the secret out", () => {
  const never = items(section(rules, "Never"));
  const secret = never.find((i) => i.startsWith("- Print, copy or log a secret:")) ?? "";
  expect(secret).toContain(six);
  expect(secret).toContain(`whatever is said in chat`);
  expect(secret).toContain(ref);
  const first = never[0] ?? "";
  expect(first).toContain("an act of this list, but a secret printed, copied or logged, that a session with the owner present");
});

test("SKILL.md agrees in the two places that say what a session does on his word", () => {
  const alone = flat(section(skill, "A token an approved spec names"));
  expect(alone).toContain("an act he gives his word for in this session, which a secret printed, copied or logged never is");

  const not = lineWith(skill, "- Anything owner-present:");
  expect(not).toContain("quoted on the issue with its date");
  expect(not).toContain("but a secret printed, copied or logged, which no word of his in a session gives leave for");
  expect(not).toContain(ref);
});
