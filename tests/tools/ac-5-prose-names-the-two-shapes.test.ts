// The prose an agent reads before it calls a list says the size of a page and the sign that more remain (R3 and task 5
// of plan/cloud-brain-answers-cut-and-not-said.md, issue ac-5-prose-names-the-two-shapes). Before the task
// agents/overseer.md gave `io "sync?after=<seq>"` as "every event since the last oversight" with no word of a page,
// neither it nor SKILL.md said what `more` of a list is, and the knowledge page had no paragraph on the two shapes.
// The numbers the prose gives are held to the text of the tracker's reference and of cut.ts, not to a run of cb4. The
// reference is read from what cb4 runs, as cloud-brain-dev/deploy/ has it after `bun sync.ts` (the seed brain-issues.ojs
// until it was deleted on 2026-10-14, behind what ran).
//
//   bun test --timeout=30000 ./tests/tools/ac-5-prose-names-the-two-shapes.test.ts
// OVERSEER=, SKILL=, CALLING= each read another copy of that file (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cut } from "../../tools/cloud-brain/cut.ts";
import { testNeedingRunning } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const read = (env: string, path: string) => readFileSync(process.env[env] || resolve(root, path), "utf8");
const overseer = read("OVERSEER", ".claude/skills/brain-maintenance/agents/overseer.md");
const skill = read("SKILL", ".claude/skills/brain-maintenance/SKILL.md");
const calling = read("CALLING", "knowledge/calling-a-cloud-brain-from-this-checkout.md");
const { test: withTracker, module: tracker } = process.env.SEED ? { test, module: process.env.SEED } : testNeedingRunning("ac-5-prose-names-the-two-shapes.test.ts, the reference", "brain-issues");
const seed = tracker ? readFileSync(tracker, "utf8") : "";
// The page module, cloud-brain, has no seed since 2026-10-18 (i13482): what brain-x-page runs, from deploy/.
const { test: withPage, module: pageModule } = process.env.PAGE ? { test, module: process.env.PAGE } : testNeedingRunning("ac-5-prose-names-the-two-shapes.test.ts, the page", "cloud-brain");
const page = pageModule ? readFileSync(pageModule, "utf8") : "";

// A block of a markdown file: the lines from the one that holds `start` to the next blank line or list item.
const block = (text: string, start: string) => {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.includes(start));
  if (at < 0) return "";
  let end = at + 1;
  while (end < lines.length && lines[end].trim() !== "" && !/^\s*- /.test(lines[end]) && !lines[end].startsWith("#")) end++;
  return lines.slice(at, end).join(" ").replace(/\s+/g, " ");
};
const row = (method: string) => seed.split("\n").find((l) => l.startsWith("| \\`" + method + "\\` |")) || "";

withTracker("the tracker's reference still gives the sizes the prose repeats", () => {
  expect(row("issue.sync")).toContain("200 events when left out, 500 at most");
  expect(row("issue.sync")).toContain("the next page is the same call with \\`after=\\` the \\`seq\\` of the last event answered");
  expect(row("issue.list")).toContain("100 issues when left out, 500 at most");
  expect(row("issue.list")).toContain("There is no second page");
});

// Until overseer-runs-too-often (2026-10-13) the overseer read `sync` a page at a time, counted its own issues from it and
// listed the projects before it opened one. It reads one issue since: the list it still reads is the search before it files.
test("overseer.md reads no sync, and the list it reads before it files says when it is not all that match", () => {
  expect(overseer).not.toContain('io "sync?after=');
  const b = block(overseer, 'Search the open issues first (`io "list?limit=500"`');
  expect(b).not.toBe("");
  expect(b).toContain("`more: true`");
  expect(b).toContain("100 issues");
  expect(block(overseer, "At most 3 issues filed and 2 edits to briefs")).toContain("they are the issues you opened in it");
});

test("SKILL.md, step 3, The owner's: the list says when it is not all that match", () => {
  const lines = skill.split("\n").filter((l) => l.includes('"list?label=owner&limit=100"'));
  expect(lines.length).toBe(1);
  const b = block(skill, '"list?label=owner&limit=100"');
  expect(b).toContain("`more: true`");
  expect(b).toContain("`total`");
  expect(b).toContain("limit=500`");
});

test("the knowledge page has one paragraph on the two shapes, inside the part of it the Brain's search keeps", () => {
  const head = "## An answer that was cut, and a list that is not whole";
  expect(calling.split(head).length).toBe(2);
  expect(calling.indexOf(head)).toBeGreaterThan(0);
  const section = calling.slice(calling.indexOf(head)).split("\n## ")[0];
  // The two shapes: a field, and a last line.
  expect(section).toContain("**A field**");
  expect(section).toContain("**A last line**");
  for (const said of ["`more: true`", "`total`", "issue.list ", "issue.sync ", "issue.snapshot", "--whole", "static.get?path="]) expect(section).toContain(said);
  // A cut doc's last line names its file.
  expect(section).toMatch(/last line names (its|the) file/);
  // The entry of this doc is cut at 16,000 characters: the section stands before that.
  expect(calling.indexOf(head) + section.length).toBeLessThan(15000);
  expect(calling.indexOf(head)).toBeLessThan(calling.indexOf("## Why did that happen: the logs"));
});

withPage("each mark the knowledge page quotes is one its tool writes", () => {
  expect(calling).toContain("## An answer that was cut");
  const section = calling.slice(calling.indexOf("## An answer that was cut")).split("\n## ")[0];
  // cut.ts: the page quotes the mark of a text of 1421 characters cut at 400.
  const mark = cut("x".repeat(1421), 400).slice(400);
  expect(mark).toBe("… (cut: 400 of 1421 characters; --whole prints all)");
  expect(section).toContain(mark);
  // callAnswer: the page quotes the line the module's own test expects.
  const line = "[characters 0 to 20000 of 27094. The rest: the same call with offset 20000]";
  expect(page).toContain(line);
  expect(section).toContain(line);
  // knowledge-docs.ts: the line of a cut doc, as the page's own section on the docs has it.
  expect(read("DOCS", "tools/cloud-brain/knowledge-docs.ts")).toContain("characters of this entry's text. The whole is the file");
  expect(section).toContain("characters of this entry's text. The whole is the file");
});
