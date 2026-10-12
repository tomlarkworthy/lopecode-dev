// Step 11 of the writer's brief has a ninth item: search the docs for what the change altered, before the submit
// (tx-2-writer-searches-before-the-submit, task 2 of plan/cloud-brain-texts-not-read-again-after-a-change.md, R5).
// The brief is read as it is. The item is held by its place and its own words, and its command is taken out of
// the brief and run, so a path of it that names no file fails here. The record's two texts for the overseer
// (R3, and the reviewer's reach under the owner's answer A) are held in the record.
//
//   bun test ./tests/tools/tx-2-writer-searches-before-the-submit.test.ts
import { test, expect } from "bun:test";
import { inFull } from "./implementer-brief";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const count = (text: string, phrase: string) => text.split(phrase).length - 1;
const flat = (text: string) => text.replace(/\s+/g, " ");
const brief = () => inFull();
const OPENING = "What you changed is spoken of elsewhere.";

// The list of step 11: from its heading to step 12, one entry an item, each flattened to one line.
const items = () => {
  const text = brief();
  const from = text.indexOf("**Before the submit, read your change as the reviewer will.**");
  const to = text.indexOf("\n12. **Say it on the issue, then submit.**");
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  const list = text.slice(from, to);
  const end = list.indexOf("\n    Since that day a reviewer holds a change");
  return (end > 0 ? list.slice(0, end) : list).split("\n    - ").slice(1).map(flat);
};
const command = () => (flat(brief()).match(/`(git grep -n -F '<name>' -- [^`]+)`/) || [])[1] || "";

test("the ninth item of step 11 is the search, once in the brief", () => {
  expect(count(brief(), OPENING)).toBe(1);
  const list = items();
  expect(list.length).toBe(9);
  expect(list[8].startsWith(OPENING)).toBe(true);
  expect(list[7]).toContain("Each ref of the submit is a commit that is pushed.");
});

test("the item says what is searched, what is mended where, and what the comment gives", () => {
  const item = items()[8] || "";
  expect(item).toContain("For each command, method, flag or step whose behaviour you changed,");
  expect(item).toContain("and read the lines in files you did not touch.");
  expect(item).toContain("One your change made untrue is mended in this landing.");
  expect(item).toContain("when the sentence is a choice the owner approved, it stays and gains \"(As built, `<id>`, <date>: …; the record.)\"");
  expect(item).toContain(
    "In a file that is not yours (the reviewer's brief on the Brain, a seed whose Worker you do not deploy, `rules.md`, `philosophy.md`), the line and its mend go in your comment under \"For the overseer\".",
  );
  expect(item).toContain("Say in the comment what you searched for and how many lines it printed.");
});

test("the command of the item runs as written, and each of its four paths names a tracked file", () => {
  const cmd = command();
  expect(cmd).toBe(
    "git grep -n -F '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'",
  );
  const paths = cmd.slice(cmd.indexOf(" -- ") + 4).split(" ").map((p) => p.replace(/'/g, ""));
  expect(paths.length).toBe(4);
  for (const path of paths) {
    const tracked = spawnSync("git", ["ls-files", "--", path], { cwd: root, encoding: "utf8" });
    expect(tracked.status).toBe(0);
    expect(tracked.stdout.trim().split("\n").filter(Boolean).length).toBeGreaterThan(0);
  }
  // `release land` is the name the spec measured (ticket 1841): the search prints lines of more than one file,
  // the writer's brief among them.
  const run = spawnSync("sh", ["-c", cmd.replace("<name>", "release land")], { cwd: root, encoding: "utf8" });
  expect(run.status).toBe(0);
  const files = new Set(run.stdout.trim().split("\n").map((l) => l.split(":")[0]));
  expect(files.has(".claude/skills/brain-maintenance/agents/implementer/landing.md")).toBe(true);
  expect(files.size).toBeGreaterThan(1);
  // A name that is in no file prints nothing and is exit 1, which is not a failure of the search.
  const none = spawnSync("sh", ["-c", cmd.replace("<name>", "zq-no-such-name-" + "7f3a")], { cwd: root, encoding: "utf8" });
  expect(none.status).toBe(1);
  expect(none.stdout).toBe("");
});

test("the record has the two texts for the overseer: the line of \"A spec\", and the reviewer's reach as the owner's answer A", () => {
  const record = read("tools/cloud-brain/records/tx-2-writer-searches-before-the-submit.md");
  expect(record).toContain("## For the overseer");
  expect(record).toContain("First written 2026-10-11; not yet run.");
  expect(record).toContain("First written 2026-10-11; 19 reviews of a spec by event 1920.");
  expect(record).toContain("event 2400");
  expect(count(record.toLowerCase(), "waiting for his word")).toBe(0);
  const text = flat(record);
  expect(text).toContain("when the change under review is what shows the sentence untrue and the fix is one sentence");
  expect(text).toContain("Never a brief, a seed or `rules.md`");
});
