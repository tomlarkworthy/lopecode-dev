// The comment that puts a spec to the owner names each standing thing the spec adds and each sentence the spec marks
// as its writer's reading of his words; the spec writer says both on the issue before its submit. Issue
// decision-comment-names-what-is-added, an action of tools/cloud-brain/post-mortems/pm-second-summarizer-role.md.
// The texts are read as they are. agents/approver.md is not held here: the record says why it was not changed.
//
//   bun test ./tests/tools/decision-comment-names-what-is-added.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = join(root, ".claude/skills/brain-maintenance");
const skill = readFileSync(join(dir, "SKILL.md"), "utf8");
const spec = readFileSync(join(dir, "agents/spec.md"), "utf8");
const rules = readFileSync(join(dir, "rules.md"), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// From one mark to the next, both of which must be there and in that order.
const cut = (text: string, from: string, to: string): string => {
  const a = text.indexOf(from);
  expect(a, from).toBeGreaterThanOrEqual(0);
  const b = text.indexOf(to, a + from.length);
  expect(b, to).toBeGreaterThan(a);
  return text.slice(a, b);
};
const KINDS = ["role", "brief", "tool", "token", "Worker", "method", "store"];

// Step 7 of SKILL.md, and in it the paragraph of a spec: from its head to the lines of what was approved for him.
const tell = () => cut(skill, "\n7. **Tell the user**", "\n8. **Watch, then schedule**");
const put = () => flat(cut(tell(), "**A spec put to him.**", "Then what was approved for him since you last told him"));

test("SKILL.md step 7: a spec's comment and its item of the list have the two lines, between what it is and the choices", () => {
  const p = put();
  expect(p).toContain("whose last submit is a `submit-spec`");
  expect(p).toContain("and its item of the list");
  expect(p).toContain("after the sentences of what it is and before the choices");
  expect(p).toContain("- `Adds, to stay:`");
  expect(p).toContain("- `Readings of your words:`");
  expect(p.indexOf("- `Adds, to stay:`")).toBeLessThan(p.indexOf("- `Readings of your words:`"));
});

test("the first line names each kind of standing thing, by name, with what exists of the same job", () => {
  const line = cut(put(), "- `Adds, to stay:`", "- `Readings of your words:`");
  for (const k of KINDS) expect(line, k).toMatch(new RegExp(`\\b${k}\\b`));
  expect(line).toContain("by its name");
  expect(line).toContain("what exists today of the same job");
});

test("the second line has each sentence the spec marks as its writer's reading, one line each", () => {
  const line = cut(put(), "- `Readings of your words:`", "They are written from");
  expect(line).toContain("each sentence the spec marks as its writer's reading and not his words");
  expect(line).toContain("in one line each");
});

test("a line with nothing to say is written, not left out", () => {
  const p = put();
  expect(p).toContain("Both are there for every spec, also with nothing to say");
  expect(p).toContain("`Adds, to stay: nothing.`");
  expect(p).toContain("`Readings of your words: none marked.`");
});

test("they are written from the spec writer's comment and checked against the file at the submit's commit", () => {
  const p = put();
  expect(p).toContain("keyed `spec/<id>/adds-<round>`");
  expect(p).toContain("which is a claim as every comment is");
  expect(p).toContain('`git show <sha>:plan/cloud-brain-<id>.md | grep -n -i "reading"`');
  expect(p).toContain("A spec with no such comment");
});

test("the row of step 3 that writes the comment after a leave names the two lines", () => {
  const row = skill.split("\n").find((l) => l.startsWith("   | at `awaiting-approval` |")) || "";
  expect(row).not.toBe("");
  expect(row).toContain('for a spec, with the two lines of step 7 as well ("A spec put to him")');
  expect(put()).toContain("After an `approver: leave`");
});

test("it says that the section of rules.md has neither line and holds where the two differ", () => {
  expect(put()).toContain("where that section and this differ that section holds");
  const at = rules.indexOf("\n## What the owner is asked to decide\n");
  expect(at).toBeGreaterThan(0);
  const sec = rules.slice(at, rules.indexOf("\n## ", at + 1));
  // Held so that the sentence above is taken out when the owner's section gets the lines.
  expect(sec).not.toContain("Adds, to stay");
  expect(sec).not.toContain("Readings of your words");
});

// The spec writer's brief.
const step5 = () => flat(cut(spec, "\n5. **Write the spec**", "\n6. **Land it**"));
const step7 = () => cut(spec, "\n7. **Submit**", "\nAfter the owner's approval the orchestrator opens the tasks");
const adds = () => cut(step7(), "**Then say on the issue what the spec adds that stays", "(Since `decision-comment-names-what-is-added`");

test("spec brief step 5: a reading of his words is marked with the word the grep finds", () => {
  const item = cut(step5(), "- what was asked, in the owner's words", "- each gathered report in one line");
  expect(item).toContain("marked where it stands as your reading and not his words");
  expect(item).toContain("with the word `reading` in it");
  expect(item).toContain('`grep -n -i "reading" plan/cloud-brain-<id>.md`');
});

test("spec brief step 7: one comment before the move, after the attach, with the key the orchestrator reads", () => {
  const s = step7();
  const order = ["**Then attach the spec to the issue, before the move**", "**Then say on the issue what the spec adds that stays", '`ia move \'{"key":"spec/<id>/submit-<round>"'];
  const at = order.map((o) => s.indexOf(o));
  for (const [i, a] of at.entries()) expect(a, order[i]).toBeGreaterThan(0);
  expect([...at].sort((x, y) => x - y)).toEqual(at);
  expect(flat(adds())).toContain("keyed `spec/<id>/adds-<round>`");
  // The same key in both texts.
  expect(put()).toContain("`spec/<id>/adds-<round>`");
});

test("the comment's two parts, their form, and what an empty part says", () => {
  const a = adds();
  const block = cut(a, "   ```\n", "\n   ```\n   The first part");
  expect(block).toContain("adds, to stay:\n   - <kind> `<name>`: <what exists today of the same job");
  expect(block).toContain("readings of his words:\n   - line <n>: <the sentence the spec marks as your reading and not his words");
  const f = flat(a);
  for (const k of KINDS.filter((k) => k !== "brief")) expect(f, k).toContain(`a ${k}`);
  expect(f).toContain("a role and its brief");
  expect(f).toContain("says `nothing` or `none marked`, and is not left out");
  expect(f).toContain("a line it prints that is no reading of his words is left out");
  expect(f).toContain("Your report has the two parts as the comment has them");
  // A round after a review says them again, whole, with its own key.
  expect(flat(step7())).toContain("say again what it adds and reads (`spec/<id>/adds-<round>`, whole, as the file then has it)");
});

test("the case is beside it, with the spec's sentence and the comment he approved by", () => {
  const s = flat(step7());
  expect(s).toContain("\"That is the writer's reading and not his words; his approval of this spec is where he says otherwise.\"");
  expect(s).toContain("4344 of that issue");
  expect(s).toContain('"One light agent a doc writes the summary, as for the papers"');
  expect(put()).toContain("comment 4344 of `docs-summarised-for-search`");
  expect(existsSync(join(root, "tools/cloud-brain/post-mortems/pm-second-summarizer-role.md"))).toBe(true);
});
