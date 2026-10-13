// fb-batch-role-briefs (2026-10-13): ten feedback notes about the role briefs, mended in one pass. The record,
// tools/cloud-brain/records/fb-batch-role-briefs.md, has a row for each. Held here, of the texts as they are:
//   - Triage of agents/orchestrator.md says a change that only narrows, and a step that gives a role a new act, is
//     `major`, whatever the issue expects of an install; the writer's brief sends a writer whose design is one to a
//     section of the page asking-and-waiting, which says to stop before the deploy or the landing;
//   - a resumed writer and a resumed spec writer are given a command for what their brief gained since their start,
//     and the command runs;
//   - the new text of the reviewer's brief, a file beside the record, is the kept copy of lopecode-dev c58fb733 with
//     five additions and one line that goes on, and no other line changed;
//   - the record has a row for each of the ten notes.
// The `-e` of step 11's search is held by tx-2-writer-searches-before-the-submit.test.ts, and the two rules of a
// post mortem's table by post-mortems.test.ts.
//
//   bun test --timeout=30000 ./tests/tools/fb-batch-role-briefs.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { core, page } from "./implementer-brief";

const root = resolve(import.meta.dir, "../..");
const AGENTS = ".claude/skills/brain-maintenance/agents";
const read = (p: string) => readFileSync(join(root, p), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
const git = (...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
const NEW_BRIEF = "tools/cloud-brain/records/fb-batch-role-briefs.reviewer-brief.md";
// The commit the new text was made from: its kept copy is what cb4 served on 2026-10-13 at 21:07:47 CEST.
const BASE = "c58fb733";
const NOTES = ["seen-ninth-item-grep-refuses-a-flag", "seen-narrowing-change-not-major", "seen-overseer-brief-edit-not-major", "seen-briefs-change-under-a-writer",
  "seen-pm-brief-three-is-his-word", "seen-submodule-landing-unsaid", "seen-reviewer-brief-spec-section-gaps", "seen-reviewer-bug-rejected-in-seconds",
  "seen-browser-all-403-to-a-reviewer", "seen-approver-brief-gaps-of-nine-runs"];

test("Triage: a change that only narrows, and a step that gives a role a new act, is `major`, whatever the issue expects of an install", () => {
  const text = read(AGENTS + "/orchestrator.md");
  const triage = flat(text.slice(text.indexOf("\n## Triage\n")));
  expect(triage.length).toBeGreaterThan(1000);
  for (const s of [
    "A change that only narrows what a caller may do alters who may do what, and so does a step added to a role's brief that gives the role an act it did not have",
    "The label is for what may be built, whatever the issue expects of an install: a writer may build the change another way",
    "`seen-narrowing-change-not-major`", "`seen-overseer-brief-edit-not-major`",
  ]) expect(triage).toContain(s);
  // a paragraph of its own, after the one that names the labels and before the label `laptop`
  const at = (s: string) => triage.indexOf(s);
  expect(at("Add the labels `major` and `needs-owner` when the change alters who may do what")).toBeGreaterThan(0);
  expect(at("the issue is then the owner's. What alters who may do what. A change that only narrows")).toBeGreaterThan(at("Add the labels `major`"));
  expect(at("A change that only narrows")).toBeLessThan(at("Add the label `laptop`"));
});

test("the writer's brief sends a design that changes who may do what, on an issue with no `major`, to a page that says to stop", () => {
  expect(flat(core())).toContain("A design that changes who may do what, on an issue with no `major`: the page `asking-and-waiting`.");
  expect(core()).toContain('| `asking-and-waiting.md` | "When you need the orchestrating session", "A design that changes who may do what", "Before a wait" |');
  const text = page("asking-and-waiting");
  expect(text.split("\n")[1]).toContain("or your design changes who may do what on an issue with no `major`.");
  const from = text.indexOf("\n## A design that changes who may do what, on an issue with no `major`\n");
  const part = flat(text.slice(from, text.indexOf("\n## Before a wait\n")));
  expect(from).toBeGreaterThan(0);
  expect(part.length).toBeGreaterThan(600);
  for (const s of [
    "a change that only narrows is one too",
    "a step added to a role's brief that gives the role an act it did not have",
    "stop before the deploy, or before the landing when there is no deploy",
    "end the run with the ask as the first line of your report, or `issue-ask.sh` when the run cannot end",
    "you do not add it, and you do not land past it",
    "`label-guard-token-removes-annotation`", "`kept-brief-copy-behind-holders-four`",
  ]) expect(part).toContain(s);
});

test("a resumed writer and a resumed spec writer have a command for what their brief gained since their start, and it runs", () => {
  const round = flat(page("resumed-round")), spec = flat(read(AGENTS + "/spec.md"));
  const cmd = (move: string) => `git -C $W log --since=<the at of your ${move} move> --format='%h %s' origin/main -- .claude/skills/brain-maintenance/agents`;
  expect(round).toContain(cmd("start"));
  expect(round).toContain("That diff begins at your submit, and you read your brief at your start, before it.");
  expect(round).toContain("`git -C $W show <h> -- <the file>`");
  const resumed = spec.slice(spec.indexOf("## A resumed round"));
  expect(resumed).toContain(cmd("spec"));
  expect(resumed).toContain("`git -C $W show <h> -- .claude/skills/brain-maintenance/agents/spec.md`");
  // as a writer runs it, with an event's `at` in the place of the words: each line is a commit that changed a brief
  const at = "2026-10-13T07:00:00Z";
  const run = spawnSync("sh", ["-c", cmd("start").replace("$W", ".").replace("<the at of your start move>", at).replace("origin/main", "HEAD")], { cwd: root, encoding: "utf8" });
  expect(run.status).toBe(0);
  const lines = run.stdout.trim().split("\n").filter(Boolean);
  expect(lines.length).toBeGreaterThan(0);
  for (const l of lines) expect(l).toMatch(/^[0-9a-f]{7,} \S/);
  const one = git("show", "--stat", "--format=", lines[0].split(" ")[0], "--", AGENTS);
  expect(one.stdout).toContain(AGENTS);
});

test("the new text of the reviewer's brief is the kept copy of c58fb733 with five additions, and no other line changed", () => {
  const base = git("show", `${BASE}:tests/tools/fixtures/reviewer-brief.md`);
  if (base.status !== 0) return void console.log(`skipped: fb-batch-role-briefs.test.ts: no commit ${BASE} (the clone is shallow)`);
  const now = read(NEW_BRIEF), was = base.stdout;
  // every line of the copy stands in the new text, in its order, but the one that goes on
  const lines = now.split("\n");
  let i = 0;
  const gone: string[] = [];
  for (const l of was.split("\n")) {
    const j = lines.indexOf(l, i);
    if (j < 0) gone.push(l); else i = j + 1;
  }
  expect(gone).toEqual(["seen, when, where to read it, which line. No fix in it (2026-10-11, `philosophy.md`, Clarifications)."]);
  expect(now).toContain("seen, when, where to read it, which line. No fix in it (2026-10-11, `philosophy.md`, Clarifications), but for\n");
  expect(lines.length - was.split("\n").length).toBe(30);
  const text = flat(now);
  for (const s of [
    "| a spec, at `spec-review`: `pass` | `to: \"awaiting-approval\"` (the tracker names the move `to-approval`), then stop: the owner approves (\"A spec\") |",
    "| a spec, at `spec-review`: `changes` | `to: \"spec\"` (the `respec` move), with what sends it back in the reason |",
    "A spec's numbers: check each one that a requirement, or a report said to be left out, rests on",
    "A defect you read in the code, or reached only by a probe of your own, that has cost nobody anything, is not one: it is a feedback ticket",
    "A thing seen that already has a ticket gets a comment on that ticket and no new one",
    "A review that opened no QA tab by name and started no browser and no container of the cluster has nothing in either: say so in your report and make no call.",
    "bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.browser.all --owner",
  ]) expect(text).toContain(s);
  for (const s of ["A spec's numbers:", "A `bug` is for a defect", "**Before finishing**", "| a spec, at `spec-review`"]) expect(was).not.toContain(s);
  // the two rows are rows of the table of step 7
  const table = now.slice(now.indexOf("   | Verdict | Move |"), now.indexOf("   **The mark.**"));
  expect(table.split("\n").filter((l) => l.startsWith("   | ")).length).toBe(6);
});

test("the record has a row for each of the ten notes, with what was done of it", () => {
  const record = read("tools/cloud-brain/records/fb-batch-role-briefs.md");
  const rows = record.split("\n").filter((l) => /^\| \d+ \| /.test(l));
  expect(rows.length).toBe(10);
  expect(rows.map((r) => +r.split("|")[1])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const n of NOTES) expect([n, rows.filter((r) => r.includes("`" + n + "`")).length]).toEqual([n, 1]);
  for (const r of rows) expect(r.split("|")[3].trim()).toMatch(/^(mended|mended in part|closed, already mended|taken out)$/);
  expect(record).toContain("`reviewer-brief-put-of-fb-batch`");
  expect(record).toContain("`approver-brief-lines-of-the-approvers`");
  expect(record).toContain("## Not tried");
});
