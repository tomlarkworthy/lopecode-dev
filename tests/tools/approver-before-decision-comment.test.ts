// SKILL.md of the issue loop: at `awaiting-approval` the approver reads the issue before the orchestrating session
// writes anything on it for the owner, and what the session then writes is by what the run left. An action of the post
// mortem tools/cloud-brain/post-mortems/pm-approver-leaves-everything.md ("1 beside the cause"): each of the eight
// issues an approver read had the session's comment on it, with letters and a pick, before its verdict.
// Issue approver-before-decision-comment. This holds the lines of steps 2, 3, 4 and 7, and the note of the spec.
//
//   bun test --timeout=30000 ./tests/tools/approver-before-decision-comment.test.ts
//   SKILL=<file> and SPEC=<file> read another copy of the procedure and of the spec: with both as they were before
//   the change, every test but the first fails.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const skill = readFileSync(process.env.SKILL || resolve(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8");
const spec = readFileSync(process.env.SPEC || resolve(root, "plan/cloud-brain-approver-persona.md"), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ").trim();
const step = (n: number) => flat(skill.match(new RegExp(`\\n${n}\\. \\*\\*[\\s\\S]*?(?=\\n${n + 1}\\. \\*\\*|\\n## )`))?.[0] ?? "");
// A row of step 3 is one line of the file: tests/tools/approver-brief.test.ts reads it so.
const row = skill.split("\n").find((l) => l.trim().startsWith("| at `awaiting-approval`")) ?? "";
// The part of the row this change added: from its head to the note that closes it.
const head = "**The approver reads before you write for him.**";
const part = row.slice(Math.max(0, row.indexOf(head)), row.indexOf("First comment written after a verdict by this row"));
const order = (text: string, parts: string[]) => {
  const at = parts.map((p) => text.indexOf(p));
  expect(parts.filter((_, i) => at[i] < 0)).toEqual([]);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
};

test("the row is there, on one line, with the spawn before the part on what is written", () => {
  expect(row).toContain("**Spawn the approver**");
  expect(skill.split("\n").filter((l) => l.trim().startsWith("| at `awaiting-approval`")).length).toBe(1);
  expect(row.endsWith("|")).toBe(true);
});

test("step 3: nothing is written for the owner on the issue until the round's verdict is there, or its run reported with none", () => {
  expect(row.indexOf(head)).toBeGreaterThan(row.indexOf("**Spawn the approver**"));
  expect(part).toContain("Until the round's verdict is there, or its run has reported with none");
  expect(part).toContain("you write no comment for the owner on the issue");
  expect(part).toContain("none keyed `orch/<id>/decision-<n>`");
  expect(part).toContain("put no `needs-owner` on it");
  expect(part).toContain("`orch/<id>/needs-owner-<n>`");
  // A pass that starts no approver is no leave to write first.
  expect(part).toContain("also in a pass that starts no approver");
  expect(part).toContain("the issue waits for its approver");
});

test("step 3: after an approve and the move, no decision comment; after a leave, the comment from the verdict", () => {
  order(part, ["After `approver: approve` and the tool's `approve` move", "After `approver: leave`", "After `approver: approve` and no move", "After a run that reported with no verdict"]);
  const cut = (from: string, to: string) => part.slice(part.indexOf(from), part.indexOf(to));
  const approved = cut("After `approver: approve` and the tool's `approve` move", "After `approver: leave`");
  expect(approved).toContain("nothing: no decision comment and no label");
  expect(approved).toContain("step 7 tells him of it in the list of what was approved for him");

  const left = cut("After `approver: leave`", "After `approver: approve` and no move");
  expect(left).toContain("keyed `orch/<id>/decision-<n>`");
  expect(left).toContain("from the verdict's second line and its `why:`");
  expect(left).toContain('`rules.md`, "What the owner is asked to decide"');
  expect(left).toContain("with letters only where the verdict names a choice that is his");
  expect(left).toContain("With none it has no letters");
  expect(left).toContain("Then `needs-owner`");
  // The label follows the comment, and the comment follows the verdict.
  order(left, ["keyed `orch/<id>/decision-<n>`", "Then `needs-owner`"]);
});

test("step 3: the two rounds with no verdict to write from, and the approve the tool did not send", () => {
  const cut = (from: string) => part.slice(part.indexOf(from));
  const unsent = cut("After `approver: approve` and no move").split("After a run that reported with no verdict")[0];
  expect(unsent).toContain("no letters");
  expect(unsent).toContain("the tool's line");
  const none = cut("After a run that reported with no verdict");
  expect(none).toContain("a round that gets no approver because one left the issue in an earlier round");
  expect(none).toContain("from the review and the record");
  expect(none).toContain("no letters when there is nothing to choose between");
});

test("step 3 says where the change is from, and which of its cases are the writer's reading", () => {
  expect(row).toContain("Since `approver-before-decision-comment`, 2026-10-12");
  expect(row).toContain("`tools/cloud-brain/post-mortems/pm-approver-leaves-everything.md`");
  expect(row).toContain("each of the eight issues the post mortem counts had your comment keyed `orch/<id>/decision-<n>` on it before its verdict");
  expect(row).toContain("are the writer's reading and not the issue's words");
  // The count that says whether the row was followed, and the line of the tool that prints it.
  expect(row).toContain("issue-stats.ts --token <your token>` has the line `decision comment and verdict`");
  const stats = readFileSync(resolve(root, "tools/cloud-brain/issue-stats.ts"), "utf8");
  expect(stats).toContain("console.log(`decision comment and verdict: ${d.verdicts} verdicts of an approver;");
});

test("step 2: the comment for him waits on the approver too", () => {
  const two = step(2);
  expect(two).toContain("An approver (step 3, the row for `awaiting-approval`) is started after the reviewers and the rounds sent back and before a new writer");
  expect(two).not.toContain("nothing waits on it but the owner, who approves as before.");
  expect(two).toContain("your comment for him waits on it");
});

test("step 4: the prompt adds nothing, and no decision comment of the session is on the issue by then", () => {
  const four = step(4);
  expect(four).toContain("no summary, no opinion, no line of what you expect");
  expect(four).not.toContain("Your decision comment on the issue is data there");
  expect(four).toContain("You have written no decision comment on the issue by then");
  expect(four).toContain("is data there, as every comment is");
});

test("step 7: the comment at `awaiting-approval` is written after the verdict, and an issue with none yet is one line", () => {
  const seven = step(7);
  expect(seven).not.toContain("or when a `major` issue has passed its review");
  expect(seven).toContain("at `awaiting-approval` after its approver's verdict and not before");
  expect(seven).toContain('`rules.md`, "What the owner is asked to decide"');
  expect(seven).toContain("with the verdict's first two lines");
  expect(seven).toContain("One whose approver has not reported is named in one line, as waiting for its approver");
  expect(seven).toContain("approver.ts list --since=");
});

test("the spec has a note, as built, where it says the session's decision comment is on the issue", () => {
  const text = flat(spec);
  expect(text).toContain("decision comment it wrote is on the issue as data.");
  expect(text).toContain("(As built, `approver-before-decision-comment`, 2026-10-12:");
  expect(text.indexOf("(As built, `approver-before-decision-comment`")).toBeGreaterThan(text.indexOf("decision comment it wrote is on the issue as data."));
});
