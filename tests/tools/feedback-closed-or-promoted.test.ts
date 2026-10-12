// Open feedback was closed by nobody: 51 at `open` on cb4 at event 2745, 25 of them tied only to finished work, and the
// owner asked why they were not being done. issue-stats.ts now lists the feedback that is due and the owner's that is
// to be promoted; agents/overseer.md says who closes, and the row of SKILL.md who promotes. Issue feedback-closed-or-promoted.
//
//   bun test ./tests/tools/feedback-closed-or-promoted.test.ts
//   ISSUE_STATS_TS=, SKILL=, OVERSEER= name another copy of a file (the one before the change fails).
// No call leaves the machine: the events are the list below.
//
// Since owners-feedback-held-by-related-links (2026-10-12): a `related` link whose other end is a feedback issue at `open`
// is no tie, and one of the owner's whose ties have all ended is in the list to promote and not in the list to close.
// Three of his asks had waited at `open` behind such links (the cases named `ring-…`, `owners-…` below).
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
  note("owners-promoted", { labels: ["owner"] }), ev("swapped", "owners-promoted", { swap: "promote", to: { workflow: T, state: "open" } }),
  // A `related` link between two notes at `open` is no tie, either way. `owners-ring-a` is held by nothing but the
  // link `owners-ring-b` makes to it; `owners-ring-b` by nothing but its own.
  note("owners-ring-a", { labels: ["owner"] }),
  note("owners-ring-b", { labels: ["owner"] }), link("owners-ring-b", "owners-ring-a"),
  // The first case of the issue: a finished project by its own link, and two open notes that link to it.
  note("owners-done-and-notes", { labels: ["owner"] }), link("owners-done-and-notes", "t-done"),
  note("ring-c"), link("ring-c", "owners-done-and-notes"),
  note("ring-d"), link("ring-d", "owners-done-and-notes"), link("ring-d", "ring-c"),
  // Not the owner's: a ring alone is no tie (`ring-c`, `ring-d`); a ring and finished work is due.
  note("ring-and-done"), link("ring-and-done", "ring-c"), link("ring-and-done", "t-done"),
  // Still ties: another rel to an open note, a note the other end of which is closed, promoted, or not shown.
  note("owners-cause-of-a-note", { labels: ["owner"] }), link("owners-cause-of-a-note", "ring-c", "cause"),
  note("owners-duplicate-of-a-note", { labels: ["owner"] }), link("owners-duplicate-of-a-note", "ring-c", "duplicate"),
  note("owners-after-a-note", { labels: ["owner"] }), link("owners-after-a-note", "ring-c", "after"),
  note("owners-part-of-a-note", { labels: ["owner"] }), link("owners-part-of-a-note", "ring-c", "part-of"),
  note("owners-related-to-promoted", { labels: ["owner"] }), link("owners-related-to-promoted", "promoted"),
  note("owners-related-not-shown", { labels: ["owner"] }), link("owners-related-not-shown", "hidden-from-this-token"),
  note("owners-related-to-closed-note", { labels: ["owner"] }), link("owners-related-to-closed-note", "closed-already"),
  // The owner's with every tie ended: by his own link, by a link made to it, by its parent; with a `held:` comment too.
  note("owners-said-of-it", { labels: ["owner"] }), link("t-done-2", "owners-said-of-it", "cause"),
  note("owners-parent-done", { labels: ["owner"] }), link("owners-parent-done", "t-closed", "part-of"),
  note("owners-held", { labels: ["owner"] }), link("owners-held", "t-done"), ev("commented", "owners-held", { body: "held: a second case" }),
  note("owners-done-and-live", { labels: ["owner"] }), link("owners-done-and-live", "t-done"), link("owners-done-and-live", "t-building"),
  note("owners-rejected", { labels: ["owner"] }), link("owners-rejected", "t-rejected"),
  // A link that was made and taken off again is none, whatever its rel; one of two rels to one issue leaves the other.
  note("owners-cause-taken-off", { labels: ["owner"] }), link("owners-cause-taken-off", "t-open", "cause"), link("owners-cause-taken-off", "t-open", "cause", { remove: true }),
  note("owners-one-of-two-taken-off", { labels: ["owner"] }), link("owners-one-of-two-taken-off", "t-open", "cause"), link("owners-one-of-two-taken-off", "t-open"), link("owners-one-of-two-taken-off", "t-open", "cause", { remove: true })
];
const r = report(events, { now: 1e7 });

test("feedback is due when it has a tie and each tie is done or closed", () => {
  expect(r.feedback.due.map((d: any) => d.id).sort()).toEqual(["commented", "due-one", "due-parent", "due-said-of-it", "due-two", "live-link-taken-off", "migrated", "ring-and-done", "tied-to-a-closed-note"]);
});

test("a due one names each tie with its state", () => {
  const of = (id: string) => r.feedback.due.find((d: any) => d.id === id);
  expect(of("due-two")).toEqual({ id: "due-two", ties: ["t-done done", "t-closed closed"] });
  expect(of("ring-and-done")).toEqual({ id: "ring-and-done", ties: ["t-done done"] });
  expect(of("due-parent").ties).toEqual(["t-done done"]);
  expect(of("due-said-of-it").ties).toEqual(["t-done-2 done"]);
});

test("not due: no tie, a live tie, a rejected or reverted tie, a tie not shown, needs-owner, promoted, closed, held", () => {
  const due = r.feedback.due.map((d: any) => d.id);
  for (const id of ["no-tie", "one-live", "parent-live", "only-rejected", "done-and-rejected", "only-reverted", "tie-not-shown", "asks-owner", "labelled-later", "link-taken-off", "promoted", "closed-already", "test-note", "held"]) expect(due).not.toContain(id);
});

test("not due: one of the owner's, and a note whose only ties are `related` links with notes at open", () => {
  const due = r.feedback.due.map((d: any) => d.id);
  for (const id of ["due-owners", "due-by-session", "owners-done-and-notes", "owners-held", "ring-c", "ring-d"]) expect(due).not.toContain(id);
});

test("a `related` link with a note at open is no tie, from either end; the three shapes of the issue are to promote", () => {
  const of = (id: string) => r.feedback.toPromote.find((d: any) => d.id === id);
  expect(of("owners-ring-a")).toEqual({ id: "owners-ring-a", ties: [] });
  expect(of("owners-ring-b")).toEqual({ id: "owners-ring-b", ties: [] });
  expect(of("owners-done-and-notes")).toEqual({ id: "owners-done-and-notes", ties: ["t-done done"] });
});

test("still a tie, so not to promote: cause, duplicate, after or part-of to a note at open; related to a promoted one or one not shown", () => {
  const ids = r.feedback.toPromote.map((d: any) => d.id);
  for (const id of ["owners-cause-of-a-note", "owners-duplicate-of-a-note", "owners-after-a-note", "owners-part-of-a-note", "owners-related-to-promoted", "owners-related-not-shown", "owners-done-and-live", "owners-rejected", "owners-live", "owners-one-of-two-taken-off"]) expect(ids).not.toContain(id);
});

test("to promote: the owner's by the label or by his session, with no tie or each tie done or closed, still feedback, not needs-owner", () => {
  expect(r.feedback.toPromote.map((d: any) => d.id).sort()).toEqual(["due-by-session", "due-owners", "owners-cause-taken-off", "owners-done-and-notes", "owners-held", "owners-no-tie", "owners-parent-done", "owners-related-to-closed-note", "owners-ring-a", "owners-ring-b", "owners-said-of-it", "session-no-tie"]);
  const of = (id: string) => r.feedback.toPromote.find((d: any) => d.id === id);
  expect(of("owners-no-tie")).toEqual({ id: "owners-no-tie", ties: [] });
  expect(of("due-owners")).toEqual({ id: "due-owners", ties: ["t-done done"] });
  expect(of("owners-said-of-it").ties).toEqual(["t-done-2 done"]);
  expect(of("owners-parent-done").ties).toEqual(["t-closed closed"]);
  expect(of("owners-related-to-closed-note").ties).toEqual(["closed-already closed"]);
});

test("the text has both lists, each with its count", () => {
  const lines: string[] = text(r);
  expect(lines).toContain("feedback due to be closed, not the owner's, each tie done or closed: 9");
  expect(lines).toContain(`  ${"due-two".padEnd(40)} t-done done, t-closed closed`);
  expect(lines).toContain("feedback of the owner's with no tie, or each tie done or closed, to promote or to close: 12");
  expect(lines).toContain(`  ${"owners-no-tie".padEnd(40)} no tie`);
  expect(lines).toContain(`  ${"due-owners".padEnd(40)} t-done done`);
  expect(lines).toContain(`  ${"owners-done-and-notes".padEnd(40)} t-done done`);
});

test("a record with no feedback prints both lines with 0", () => {
  const lines: string[] = text(report([ev("opened", "lone", { kind: "task", workflow: T, state: "open", labels: [] })], { now: 1e7 }));
  expect(lines).toContain("feedback due to be closed, not the owner's, each tie done or closed: 0");
  expect(lines).toContain("feedback of the owner's with no tie, or each tie done or closed, to promote or to close: 0");
});

test("the overseer's brief says which feedback is due, the close, and what is not closed", () => {
  expect(overseer).toContain("## Feedback that is due");
  expect(overseer).toContain("A feedback issue is **due** when it has a tie and every tie is at `done` or `closed`.");
  expect(overseer).toContain(`io move '{"key":"over/<id>/close-due","id":"<id>","to":"closed","reason":`);
  expect(overseer).toContain("One with a tie at `rejected` or `reverted`: nobody answered it.");
  expect(overseer).toContain("One labeled `needs-owner`");
  expect(overseer).toContain("A `related` link whose other end is itself a feedback issue at `open` is no tie");
  expect(overseer).toContain("lists the due ones that are not the owner's under `feedback due to be closed, not the owner's`");
  expect(overseer).toContain("**One that is the owner's is the orchestrator's, not yours.**");
  expect(overseer).toContain("under `feedback of the owner's with no tie, or each tie done or closed, to promote or to close`");
  expect(overseer).not.toContain("close it only when you can name what the finished work did for his ask");
  expect(overseer).toContain("**One you still need is held, not closed.**");
  expect(overseer).toContain('"body":"held: <for what, and until when>"');
  expect(overseer).toContain("The one move you make is the close of a feedback issue");
});

test("the row of SKILL.md for open feedback says when to promote, with the call, and who closes", () => {
  const row = skill.slice(skill.indexOf("| `open`, kind `feedback` |"), skill.indexOf("| Anything else:"));
  expect(row).toContain("has no tie, or each of its ties is at `done` or `closed`, and none of that finished work made the change.");
  expect(row).toContain("but for a `related` link whose other end is itself a feedback issue at `open`");
  expect(row).toContain(`Then \`promote\` it, \`issue-as.sh <your token> swap '{"key":"orch/<id>/promote","id":"<id>","swap":"promote","reason":"…"}'\``);
  expect(row).toContain(`When a finished tie did make the change, close it with the commit or the line of the record that did in the reason: \`issue-as.sh <your token> move '{"key":"orch/<id>/close-done","id":"<id>","to":"closed","reason":"…"}'\``);
  expect(row).toContain("`feedback due to be closed, not the owner's` and `feedback of the owner's with no tie, or each tie done or closed, to promote or to close`");
  expect(row).toContain("A promoted issue keeps the kind `feedback` and is on the task workflow");
  expect(row).toContain("One of his with a tie at any other state is not promoted");
  expect(row).not.toContain("One of his that has a parent or a link is not promoted");
  expect(row).toContain('`agents/overseer.md`, "Feedback that is due"');
  expect(row).not.toContain("Nothing, unless it is the owner's and asks for a change: then `promote` it.");
});
