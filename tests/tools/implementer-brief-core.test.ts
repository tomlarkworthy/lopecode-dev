// The implementer's brief after writer-brief-and-tool-output-smaller (2026-10-13): agents/implementer.md is what every
// task needs, 20,000 characters at most, and what one kind of task needs is a page of agents/implementer/ that the
// brief names. A writer read the brief whole, 55,479 characters a read when the issue was measured (2026-10-12) and
// 87,858 bytes at the cut, and that is sent again at each later request.
// Held here: the size; that the brief names each page and each page says when it is read; that the pages, in the
// commit that added them, are the brief of the commit before with no line left out; what the brief says of a tool's
// output; and the lines of the brief a writer with no page acts on.
//
//   bun test --timeout=30000 ./tests/tools/implementer-brief-core.test.ts
import { test, expect } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { AGENTS, PAGES, core, page, inFull } from "./implementer-brief";

const root = resolve(import.meta.dir, "../..");
const BRIEF = ".claude/skills/brain-maintenance/agents/implementer.md";
const flat = (s: string) => s.replace(/\s+/g, " ");
const git = (...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 24 });
// The four lines every page begins with, a comment: what it has, when it is read, and that it was cut as it stood.
const HEAD = /^<!-- A page of `agents\/implementer\.md`: [^\n]+\.\nRead it when [^\n]+\.\nCut from the brief 2026-10-13 [^\n]+\n[^\n]+ -->\n/;

test("the brief is 20,000 characters at most, and 20,480 bytes at most", () => {
  const text = core();
  expect([...text].length).toBeLessThanOrEqual(20000);
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(20480);
});

test("the pages are the eleven files of agents/implementer/, and the brief's table has a row for each, in their order", () => {
  expect(readdirSync(join(AGENTS, "implementer")).sort()).toEqual(PAGES.map((p) => p + ".md").sort());
  const text = core();
  const table = text.slice(text.indexOf("\n## The pages\n"), text.indexOf("\n## If you see something"));
  const rows = table.split("\n").filter((l) => l.startsWith("| `"));
  expect(rows.map((r) => r.match(/^\| `([a-z-]+)\.md` \|/)?.[1])).toEqual(PAGES);
  for (const r of rows) expect(r.split("|").slice(1, 4).map((c) => c.trim().length > 5)).toEqual([true, true, true]);
  expect(flat(table)).toContain("Each is a file of `.claude/skills/brain-maintenance/agents/implementer/`");
  expect(flat(table)).toContain("Other texts that name a step or a section of `agents/implementer.md` by its number or its title mean the page of this table");
});

test("each page begins by saying what it has and when it is read; each page the brief sends a writer to is one of the eleven", () => {
  for (const p of PAGES) expect([p, HEAD.test(page(p))]).toEqual([p, true]);
  const sent = [...core().matchAll(/the page `([a-z-]+)`/g)].map((m) => m[1]);
  expect(sent.length).toBeGreaterThan(10);
  expect(sent.filter((p) => !PAGES.includes(p))).toEqual([]);
  // the kinds of task the issue names have their page named in the step that meets them
  const text = flat(core());
  for (const s of ["read the page `post-mortem` before step 2", "Read the page `seed-tests` now", "A change with a deploy is then emitted: the page `ready-to-land`",
    "A landing with a deploy, a change to `cloud-brain-dev`, a landing by hand, or `--no-submit`: the page `landing`, read before you take a lock",
    "read the page `resumed-round` and follow it"]) expect(text).toContain(s);
});

// The pages as the commit that added them has them, joined, are the brief of that commit's parent: no line was left
// out and none was changed. A later edit of a page does not move this; it reads two commits.
test("nothing was dropped: the pages of the commit that added them are the brief as it stood before, byte for byte", () => {
  const added = git("log", "--diff-filter=A", "--format=%H", "--", ".claude/skills/brain-maintenance/agents/implementer/start.md").stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!added) return void console.log("skipped: implementer-brief-core.test.ts: no commit that added agents/implementer/start.md (the pages are not committed, or the clone is shallow)");
  const before = git("show", `${added}^:${BRIEF}`);
  expect(before.status).toBe(0);
  const pages = PAGES.map((p) => git("show", `${added}:.claude/skills/brain-maintenance/agents/implementer/${p}.md`));
  expect(pages.map((p) => p.status)).toEqual(PAGES.map(() => 0));
  expect(pages.map((p) => HEAD.test(p.stdout))).toEqual(PAGES.map(() => true));
  const joined = pages.map((p) => p.stdout.replace(HEAD, "")).join("");
  expect(Buffer.byteLength(before.stdout)).toBe(87858);
  expect(joined === before.stdout).toBe(true);
});

test("the brief says a tool's output is sent again, the issue is read short, and an output saved to a file is searched, not read whole", () => {
  const text = core();
  const part = flat(text.slice(text.indexOf("\n## What a tool prints is sent again at every request\n"), text.indexOf("\n## The advisor")));
  expect(part.length).toBeGreaterThan(400);
  for (const s of ['`ia "get?id=<id>" --short`', "An output the harness saved to a file, because it was too large to show, is searched and not read whole", "`grep -n`", "a range of lines", "`offset` and `limit`",
    "Never a `git commit`, a `git push` or `land.sh` before a `|`"]) expect(part).toContain(s);
  expect(text.indexOf("\n## What a tool prints")).toBeLessThan(text.indexOf("\n## Steps\n"));
});

test("the brief has the thirteen steps in order, and the parts a writer with no page acts on", () => {
  const text = core(), f = flat(text);
  const steps = [...text.matchAll(/^(\d+)\. \*\*/gm)].map((m) => +m[1]);
  expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13]);
  expect(f).toContain("7. **Build and test with no browser** and 8. **in a browser**");
  for (const h of ["## Your token", "## The advisor: one call, before the submit", "## Where you work", "## Steps", "## The pages", "## If you see something, say something", "## The tracker's write calls", "## Your report"]) expect(text).toContain(`\n${h}\n`);
  for (const s of [
    "Read `.claude/skills/brain-maintenance/rules.md` first; it overrides this file",
    "`issues-implementer-2` when the prompt names none",
    "A name the tool does not keep is exit 2 with nothing sent",
    "**Never `git commit -a` or `git add -A`**",
    "`BRAIN_STATE_DIR=<root>/tools/cloud-brain/.emitted`",
    "knowledge.search?semantic=true&q=",
    "add the label `needs-owner` and report",
    `ia move '{"key":"impl/<id>/start","id":"<id>","to":"in-progress","reason":"…"}'`,
    "Your round is the count of `rework` moves plus one",
    "bun test --timeout=30000 ./tests/tools/<file>",
    "`$W/tests/tools/suite.sh`",
    "`$W/tools/cloud-brain/worktree.sh --rebase <tree>`, never `git rebase` there",
    "`tools/cloud-brain/records/<id>.md`",
    "A count you cannot run again is not written",
    "Of your own commits the record names neither a sha nor a `%ci`",
    "$W/tools/cloud-brain/land.sh <token> <id> --reason @<scratchpad>/<token>-reason.txt --comment @<scratchpad>/<token>-comment.md --test",
    "Bash `timeout` at 600000",
    "The test you added fails without the fix, and you ran it without the fix to see",
    "git grep -n -F -e '<name>' -- knowledge 'plan/cloud-brain-*.md' .claude/skills/brain-maintenance 'tools/cloud-brain/*.md'",
    "$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit>",
    "up to 5 runs in all",
  ]) expect(f).toContain(s);
  for (const exit of ["**Exit 0**", "**Exit 1**", "**Exit 5**", "**Exit 64**", "**Exit 3**", "**Exit 2**"]) expect(text).toContain(exit);
});

test("a test of a sentence that moved reads the pages joined, which have each step and each section once, in the brief's order", () => {
  const full = inFull();
  const at = ["\n1. **Read the issue.**", "\n5. **Reproduce before fixing**", "\n9. **Make it ready to land", "\n10. **Land it.", "\n11. **Check it where it runs**", "\n## A resumed round\n", "\n## A post mortem\n",
    "\n## When you need the orchestrating session\n", "\n## A quick win\n", "\n## When a deploy is put back on a test\n", "\n## The tracker's write calls\n"].map((h) => [h, full.split(h).length - 1, full.indexOf(h)] as const);
  expect(at.map(([h, n]) => [h, n])).toEqual(at.map(([h]) => [h, 1]));
  expect(at.map(([, , i]) => i)).toEqual(at.map(([, , i]) => i).sort((a, b) => a - b));
});
