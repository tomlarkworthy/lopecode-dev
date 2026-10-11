// Open feedback was closed by nobody: 51 at `open` on cb4 at event 2745, 25 of them tied only to finished work, and the
// owner asked why they were not being done. issue-stats.ts now lists the feedback that is due and the owner's that is
// to be promoted; agents/overseer.md says who closes, and the row of SKILL.md who promotes. Issue feedback-closed-or-promoted.
//
//   bun test ./tests/tools/feedback-closed-or-promoted.test.ts
//   ISSUE_STATS_TS=, SKILL=, OVERSEER= name another copy of a file (the one before the change fails).
// No call leaves the machine: the events are the list below.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const { report, text } = await import(process.env.ISSUE_STATS_TS || resolve(root, "tools/cloud-brain/issue-stats.ts"));
const flat = (path: string) => readFileSync(path, "utf8").replace(/\s+/g, " ");
const skill = flat(process.env.SKILL || resolve(root, ".claude/skills/brain-maintenance/SKILL.md"));
const overseer = flat(process.env.OVERSEER || resolve(root, ".claude/skills/brain-maintenance/agents/overseer.md"));

const token = { caller: "owner", via: "delegation:b6559fa96c36", holder: "secret:impl-3fa2c1", tab: false };
const session = { caller: "owner", via: "session", holder: "", tab: true };
const F = "f".repeat(64), T = "t".repeat(64);
let seq = 0;
const ev = (type: string, id: string, more: any = {}) => ({ seq: ++seq, key: `k${seq}`, type, id, by: token, at: 1000 * seq, ...more });
const note = (id: string, more: any = {}) => ev("opened", id, { kind: "feedback", workflow: F, state: "open", labels: [], ...more });
const task = (id: string, state: string, more: any = {}) => [ev("opened", id, { kind: "task", workflow: T, state: "open", labels: [], ...more }), ...(state === "open" ? [] : [ev("moved", id, { move: "x", to: state })])];
const link = (id: string, to: string, rel = "related", more: any = {}) => ev("linked", id, { rel, to, ...more });

const events = [
  { seq: ++seq, key: "policy", type: "policy", at: 1, by: session, hashes: { feedback: F, task: T }, policy: { kinds: { feedback: "feedback", task: "task", bug: "task" }, workflows: { feedback: { closed: ["closed"] }, task: { closed: ["done", "closed", "rejected"] } } } },
  ...task("t-done", "done"), ...task("t-done-2", "done"), ...task("t-closed", "closed"), ...task("t-rejected", "rejected"), ...task("t-reverted", "reverted"), ...task("t-building", "building"), ...task("t-open", "open"),
  // Due: one tie done; two ties, done and closed; a parent that is done; a tie that another issue made to it.
  note("due-one"), link("due-one", "t-done"),
  note("due-two"), link("due-two", "t-done", "cause"), link("due-two", "t-closed"),
  note("due-parent"), link("due-parent", "t-done", "part-of"),
  note("due-said-of-it"), link("t-done-2", "due-said-of-it"),
  note("due-owners", { labels: ["owner"] }), link("due-owners", "t-done"),
  note("due-by-session", { by: session }), link("due-by-session", "t-done"),
  // Not due.
  note("no-tie"),
  note("one-live"), link("one-live", "t-done"), link("one-live", "t-building"),
  note("parent-live"), link("parent-live", "t-done"), link("parent-live", "t-open", "part-of"),
  note("only-rejected"), link("only-rejected", "t-rejected"),
  note("done-and-rejected"), link("done-and-rejected", "t-done"), link("done-and-rejected", "t-rejected"),
  note("only-reverted"), link("only-reverted", "t-reverted"),
  note("tie-not-shown"), link("tie-not-shown", "hidden-from-this-token"),
  note("asks-owner", { labels: ["needs-owner"] }), link("asks-owner", "t-done"),
  note("labelled-later"), link("labelled-later", "t-done"), ev("labelled", "labelled-later", { add: ["needs-owner"] }),
  note("link-taken-off"), link("link-taken-off", "t-done"), link("link-taken-off", "t-done", "related", { remove: true }),
  note("live-link-taken-off"), link("live-link-taken-off", "t-done"), link("live-link-taken-off", "t-open"), link("live-link-taken-off", "t-open", "related", { remove: true }),
  note("promoted"), link("promoted", "t-done"), ev("swapped", "promoted", { swap: "promote", to: { workflow: T, state: "open" } }),
  note("migrated", { workflow: "old" }), link("migrated", "t-done"), ev("swapped", "migrated", { to: { workflow: F, state: "open" } }),
  note("closed-already"), link("closed-already", "t-done"), ev("moved", "closed-already", { move: "close", to: "closed" }),
  note("tied-to-a-closed-note"), link("tied-to-a-closed-note", "closed-already"),
  note("test-note"), link("test-note", "t-done"),
  note("held"), link("held", "t-done"), ev("commented", "held", { body: "held: for the next put of the reviewer's brief" }),
  note("commented"), link("commented", "t-done"), ev("commented", "commented", { body: "A second case. It is not held: for nothing." }),
  // The owner's with no tie; and the owner's with one.
  note("owners-no-tie", { labels: ["owner"] }),
  note("session-no-tie", { by: session }),
  note("owners-live", { labels: ["owner"] }), link("owners-live", "t-building"),
  note("owners-asks", { labels: ["owner", "needs-owner"] }),
  note("owners-promoted", { labels: ["owner"] }), ev("swapped", "owners-promoted", { swap: "promote", to: { workflow: T, state: "open" } })
];
const r = report(events, { now: 1e7 });

test("feedback is due when it has a tie and each tie is done or closed", () => {
  expect(r.feedback.due.map((d: any) => d.id).sort()).toEqual(["commented", "due-by-session", "due-one", "due-owners", "due-parent", "due-said-of-it", "due-two", "live-link-taken-off", "migrated", "tied-to-a-closed-note"]);
});

test("a due one names each tie with its state, and says when it is the owner's", () => {
  const of = (id: string) => r.feedback.due.find((d: any) => d.id === id);
  expect(of("due-two")).toEqual({ id: "due-two", owners: false, ties: ["t-done done", "t-closed closed"] });
  expect(of("due-parent").ties).toEqual(["t-done done"]);
  expect(of("due-said-of-it").ties).toEqual(["t-done-2 done"]);
  expect(of("due-owners").owners).toBe(true);
  expect(of("due-by-session").owners).toBe(true);
});

test("not due: no tie, a live tie, a rejected or reverted tie, a tie not shown, needs-owner, promoted, closed, held", () => {
  const due = r.feedback.due.map((d: any) => d.id);
  for (const id of ["no-tie", "one-live", "parent-live", "only-rejected", "done-and-rejected", "only-reverted", "tie-not-shown", "asks-owner", "labelled-later", "link-taken-off", "promoted", "closed-already", "test-note", "held"]) expect(due).not.toContain(id);
});

test("to promote: the owner's by the label or by his session, with no tie, still feedback, not needs-owner", () => {
  expect(r.feedback.toPromote.sort()).toEqual(["owners-no-tie", "session-no-tie"]);
});

test("the text has both lists, each with its count", () => {
  const lines: string[] = text(r);
  expect(lines).toContain("feedback due to be closed, each tie done or closed: 10");
  expect(lines).toContain(`  ${"due-two".padEnd(40)} t-done done, t-closed closed`);
  expect(lines).toContain(`  ${"due-owners".padEnd(40)} the owner's  t-done done`);
  expect(lines).toContain("feedback of the owner's with no tie, to promote: 2");
  expect(lines).toContain("  owners-no-tie");
});

test("a record with no feedback prints both lines with 0", () => {
  const lines: string[] = text(report([ev("opened", "lone", { kind: "task", workflow: T, state: "open", labels: [] })], { now: 1e7 }));
  expect(lines).toContain("feedback due to be closed, each tie done or closed: 0");
  expect(lines).toContain("feedback of the owner's with no tie, to promote: 0");
});

test("the overseer's brief says which feedback is due, the close, and what is not closed", () => {
  expect(overseer).toContain("## Feedback that is due");
  expect(overseer).toContain("A feedback issue is **due** when it has a tie and every tie is at `done` or `closed`.");
  expect(overseer).toContain(`io move '{"key":"over/<id>/close-due","id":"<id>","to":"closed","reason":`);
  expect(overseer).toContain("One with a tie at `rejected` or `reverted`: nobody answered it.");
  expect(overseer).toContain("One labeled `needs-owner`");
  expect(overseer).toContain("close it only when you can name what the finished work did for his ask");
  expect(overseer).toContain("**One you still need is held, not closed.**");
  expect(overseer).toContain('"body":"held: <for what, and until when>"');
  expect(overseer).toContain("The one move you make is the close of a feedback issue");
});

test("the row of SKILL.md for open feedback says when to promote, with the call, and who closes", () => {
  const row = skill.slice(skill.indexOf("| `open`, kind `feedback` |"), skill.indexOf("| Anything else:"));
  expect(row).toContain(`has no parent and no link either way. Then \`promote\` it, \`issue-as.sh <your token> swap '{"key":"orch/<id>/promote","id":"<id>","swap":"promote","reason":"…"}'\``);
  expect(row).toContain("A promoted issue keeps the kind `feedback` and is on the task workflow");
  expect(row).toContain("One of his that has a parent or a link is not promoted");
  expect(row).toContain('`agents/overseer.md`, "Feedback that is due"');
  expect(row).not.toContain("Nothing, unless it is the owner's and asks for a change: then `promote` it.");
});
