// agents/overseer.md, "Feedback that is due": a comment of the overseer that says no finished work did what the
// owner asked is made from a read of the cluster, and says what was read. Issue
// overseer-says-unanswered-without-a-read; tools/cloud-brain/records/overseer-says-unanswered-without-a-read.md.
//
//   bun test --timeout=30000 ./tests/tools/overseer-says-unanswered-without-a-read.test.ts
//   OVERSEER=<file> reads another copy of agents/overseer.md (the one before the change fails all four; the
//   fourth also reads the seed of the tracker).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const text = readFileSync(process.env.OVERSEER || resolve(root, ".claude/skills/brain-maintenance/agents/overseer.md"), "utf8");
const seed = readFileSync(resolve(root, "tools/cloud-brain/brain-issues.ojs"), "utf8");
const from = text.indexOf("\n## Feedback that is due"), to = text.indexOf("\n## ", from + 1);
const section = text.slice(from, to).replace(/\s+/g, " ");
const count = (all: string, part: string) => all.split(part).length - 1;

const RULE = "A comment that says no finished work did what he asked is a statement about the cluster, and is made from a read of it";

test("the rule stands once, in the paragraph of the owner's notes, after the sentence it adds to", () => {
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  expect(count(text.replace(/\s+/g, " "), RULE)).toBe(1);
  const own = section.indexOf("**One that is the owner's is the orchestrator's, not yours.**");
  const before = section.indexOf("say it in a comment on the note: the orchestrator reads it there.");
  const at = section.indexOf(RULE);
  const after = section.indexOf("(Until `owners-feedback-held-by-related-links`");
  expect(own).toBeGreaterThan(0);
  expect(before).toBeGreaterThan(own);
  expect(at).toBeGreaterThan(before);
  expect(after).toBeGreaterThan(at);
});

test("it names the two reads, what the comment says of them, and what is said with no read", () => {
  expect(section).toContain("`git grep` the seed for what his note is anchored at");
  expect(section).toContain('`io "list?kind=feedback&state=done&limit=500"` for an issue of his at `done` whose title asks the same');
  expect(section).toContain("Say in the comment what was read and what it showed.");
  expect(section).toContain("With no such read, say only which ties the note has and their states.");
});

test("it has the case, with the comment, the day and what the run cost", () => {
  expect(section).toContain("`health-chart-not-useful-remove`, comment 4271, 2026-10-12");
  expect(section).toContain("a writer's run of 331 s found that");
});

test("the tracker's reference still has what the brief says of a list", () => {
  // the call the brief gives: the filters, the 100 of a list with no limit, the 500, and no body
  expect(seed).toContain("`issue.list\\` | query. \\`?state=&kind=&about=&parent=&label=&link=&limit=100\\`");
  expect(seed).toContain("each without its \\`body\\`");
  expect(seed).toContain("100 issues when left out, 500 at most");
  expect(section).toContain("a list has titles and no bodies, and with no `limit` it is 100 issues");
});
