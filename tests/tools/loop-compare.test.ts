// tools/cloud-brain/loop.ts compare (st-6-a-day-beside-the-session; plan/cloud-brain-orchestrator-as-steps.md, the R8
// check): the acts dry steps named beside the events that did the same. `compare` is given lines and events here; the
// command with a tracker that pages is the last test of loop-step.test.ts.
import { expect, test } from "bun:test";
import { compare, compareText } from "../../tools/cloud-brain/loop.ts";

type Ev = Record<string, any>;
const T0 = 1791884500000, MIN = 60000;
const line = (seq: number, min: number, acts: Ev[], more: Ev = {}) => ({ at: T0 + min * MIN, seq, dry: true, health: { ok: true }, acts, given: [], skipped: [], ...more });
const ev = (seq: number, min: number, id: string, holder: string, e: Ev) => ({ seq, id, at: T0 + min * MIN, key: `k/${seq}`, by: { holder: "secret:" + holder }, ...e });
const moved = (seq: number, min: number, id: string, holder: string, move: string, to = move) => ev(seq, min, id, holder, { type: "moved", move, to });
const cost = (seq: number, min: number, id: string, holder: string, role: string, outcome: string, token: string, more: Ev = {}) => ev(seq, min, id, holder, { type: "cost", role, outcome, token, ...more });
const rows = (c: ReturnType<typeof compare>) => c.named.map((r) => [r.name, r.event ? r.event.seq : r.unread ? "unread" : null, r.steps]);

test("an act a dry step named has the event that did the same after it, and the minutes from the step that named it first", () => {
  const c = compare([
    line(10, 0, [{ act: "ready", id: "a" }, { act: "start", id: "b", role: "implementer" }, { act: "start", id: "r", role: "reviewer" }, { act: "back", id: "d", role: "implementer", token: "impl-dddddd" }]),
    line(12, 1, [{ act: "start", id: "b", role: "implementer" }, { act: "start", id: "r", role: "reviewer" }, { act: "back", id: "d", role: "implementer", token: "impl-dddddd" }], { for: "event" }),
  ], [
    moved(9, -1, "a", "orch-aaaaaa", "ready"), // before the first step: no step's
    moved(11, 0.5, "a", "orch-aaaaaa", "ready"),
    cost(13, 2, "b", "out-bbbbbb", "implementer", "running", "impl-bbbbbb"),
    moved(14, 3, "b", "impl-bbbbbb", "start", "in-progress"),
    ev(15, 9, "r", "rev-cccccc", { type: "reviewed", verdict: "pass" }),
    cost(16, 10, "r", "orch-aaaaaa", "reviewer", "pass", "rev-cccccc"),
  ]);
  expect(rows(c)).toEqual([["ready a", 11, 1], ["start implementer b", 13, 2], ["start reviewer r", 15, 2], ["back implementer d", null, 2]]);
  expect(c.named.map((r) => r.minutes)).toEqual([0.5, 2, 9, undefined]);
  expect(c.named[1]).toMatchObject({ first: { seq: 10 }, last: { seq: 12 }, event: { type: "cost", outcome: "running", by: "out-bbbbbb" } });
  // The writer's own start is the echo of the `running` event that was the row's; the reviewer's end is a session's event of no row.
  expect(c.unnamed.map((e) => [e.seq, e.type, e.before, e.after])).toEqual([[16, "cost", 12, null]]);
  expect([c.steps, c.whole, c.unhealthy, c.from, c.to, c.events]).toEqual([2, 1, 0, 10, 12, 5]);
});

test("each kind of act is read by its own event; one the record has no event of is said so", () => {
  const acts = [
    { act: "finish", id: "f" }, { act: "reject", id: "j" }, { act: "digest", id: "g" }, { act: "resume", id: "s", role: "implementer" }, { act: "resume", id: "t", role: "implementer" },
    { act: "start", id: "p", role: "spec-writer" }, { act: "start", id: "v", role: "approver" }, { act: "start", id: "w", role: "digest" }, { act: "start", role: "overseer" },
    { act: "ended", id: "e", role: "implementer", token: "impl-eeeeee" }, { act: "stopped", id: "x", role: "reviewer", token: "rev-xxxxxx" }, { act: "running", id: "u", role: "implementer", token: "impl-uuuuuu" },
    { act: "token-ended", id: "k", token: "impl-kkkkkk" }, { act: "worktree-remove", tree: "rev-topic.2" }, { act: "worktree-remove", tree: "left" },
    { act: "start", id: "j1", role: "orchestrator", entries: 2 },
  ];
  const c = compare([line(100, 0, acts, { given: [{ id: "j1", do: "triage", at: 90, key: "x" }, { id: "j2", do: "promote", at: 80, key: "y" }, { do: "unhealthy", why: "a lock" }] })], [
    moved(101, 1, "f", "orch-aaaaaa", "finish", "done"), moved(102, 1, "j", "orch-aaaaaa", "reject", "rejected"), moved(103, 1, "g", "orch-aaaaaa", "triage", "triaged"),
    cost(104, 1, "s", "orch-aaaaaa", "implementer", "running", "impl-ssssss", { how: "resumed" }), moved(105, 1, "t", "impl-tttttt", "submit", "in-review"),
    moved(106, 1, "p", "spec-pppppp", "spec"), ev(107, 1, "v", "appr-vvvvvv", { type: "commented", key: "approver/v/verdict-1" }), moved(108, 1, "w", "dig-wwwwww", "start", "in-progress"),
    cost(109, 1, "e", "orch-aaaaaa", "implementer", "in-review", "impl-eeeeee"), cost(110, 1, "x", "orch-aaaaaa", "reviewer", "stopped", "rev-xxxxxx"), cost(111, 1, "u", "orch-aaaaaa", "implementer", "running", "impl-uuuuuu"),
    ev(112, 1, "topic", "orch-aaaaaa", { type: "commented", key: "orch/topic/worktree-removed-1" }),
    // A judgment's answer: a move of the session on the entry's issue. Its `cost` events and a `worktree` comment are not one.
    cost(113, 1, "j1", "orch-aaaaaa", "orchestrator", "running", "orch-jjjjjj"), ev(114, 1, "j1", "orch-aaaaaa", { type: "commented", key: "orch/j1/worktree-2" }), moved(115, 2, "j1", "orch-jjjjjj", "triage", "triaged"),
    // The step's own `given` comment, which a step that is not dry writes before the run, is no answer either.
    ev(117, 1, "j2", "orch-aaaaaa", { type: "commented", key: "orch/j2/given-promote-80" }),
    ev(116, 2, "j2", "impl-zzzzzz", { type: "commented", key: "impl/j2/x" }),
  ]);
  expect(rows(c)).toEqual([
    ["finish f", 101, 1], ["reject j", 102, 1], ["digest g", 103, 1], ["resume implementer s", 104, 1], ["resume implementer t", 105, 1],
    ["start spec-writer p", 106, 1], ["start approver v", 107, 1], ["start digest w", 108, 1], ["start overseer", "unread", 1],
    ["ended implementer e", 109, 1], ["stopped reviewer x", 110, 1], ["running implementer u", 111, 1],
    ["token-ended k", "unread", 1], ["worktree-remove rev-topic.2", 112, 1], ["worktree-remove left", null, 1],
    ["given triage j1", 115, 1], ["given promote j2", null, 1],
  ]);
  expect(c.unnamed.map((e) => e.seq)).toEqual([113, 114, 117]);
});

test("an act named again by a step that read its event is a second row, and no event is the event of two rows", () => {
  const c = compare([
    line(20, 0, [{ act: "start", id: "a", role: "reviewer" }]), line(21, 1, [{ act: "start", id: "a", role: "reviewer" }]),
    line(25, 5, [{ act: "start", id: "a", role: "reviewer" }]), line(26, 6, [{ act: "start", id: "a", role: "reviewer" }]),
  ], [cost(22, 2, "a", "orch-aaaaaa", "reviewer", "changes", "rev-111111"), cost(27, 9, "a", "orch-aaaaaa", "reviewer", "pass", "rev-222222")]);
  expect(rows(c)).toEqual([["start reviewer a", 22, 2], ["start reviewer a", 27, 2]]);
  expect(c.named.map((r) => [r.first.seq, r.last.seq, r.minutes])).toEqual([[20, 21, 2], [25, 26, 4]]);
  expect(c.unnamed).toEqual([]);
});

test("of the session's: an event of its token that no step named, and an agent's start with no `running` event; not an agent's other events, nor another prefix", () => {
  const events = [
    cost(29, -1, "e", "orch-aaaaaa", "implementer", "running", "impl-eeeeee"),
    moved(31, 1, "a", "impl-aaaaaa", "start", "in-progress"), moved(32, 1, "a", "impl-aaaaaa", "submit", "in-review"), ev(33, 1, "a", "impl-aaaaaa", { type: "commented" }),
    moved(34, 2, "b", "orch-aaaaaa", "ready"), ev(35, 2, "b", "out-bbbbbb", { type: "labelled", add: ["needs-owner"] }), moved(36, 2, "c", "", "approve"),
    moved(37, 3, "e", "impl-eeeeee", "start", "in-progress"), moved(38, 3, "s", "spec-ssssss", "spec"),
  ];
  const c = compare([line(30, 0, []), line(36, 2.5, [], { health: { ok: false, failed: ["x"] } })], events);
  expect(c.unnamed.map((e) => [e.seq, e.by, e.before, e.minutes, e.after])).toEqual([[31, "impl-aaaaaa", 30, 1, 36], [34, "orch-aaaaaa", 30, 2, 36], [35, "out-bbbbbb", 30, 2, 36], [38, "spec-ssssss", 36, 0.5, null]]);
  expect([c.unhealthy, c.events]).toEqual([1, 8]);
  expect(compare([line(30, 0, [])], events, ["out-"]).unnamed.map((e) => e.seq)).toEqual([31, 35, 38]);
  // No line: nothing is named and nothing is the session's.
  expect(compare([], events)).toMatchObject({ steps: 0, from: 0, to: 0, named: [] });
  expect(compare([{ error: "queue answered 401" }, null as any, line(30, 0, [])], []).steps).toBe(1);
});

test("the text has the two lists of the R8 check, each row a line", () => {
  const c = compare([line(10, 0, [{ act: "ready", id: "a" }, { act: "back", id: "d", role: "implementer" }, { act: "token-ended", id: "k", token: "impl-kkkkkk" }]), line(11, 3, [{ act: "back", id: "d", role: "implementer" }])],
    [moved(11, 2, "a", "orch-aaaaaa", "ready"), moved(12, 4, "z", "out-bbbbbb", "ready")]);
  const t = compareText(c);
  expect(t.split("\n")[0]).toBe("# 2 dry steps, events 10 to 11 (09:41:40Z to 09:44:40Z): 2 whole, 0 not healthy; 2 events after the first");
  expect(t).toContain("## Named by a dry step and done\n\n- ready a: event 11 (moved ready by orch-aaaaaa), 2 min after the step; named by 1 step, first at event 10 (09:41:40Z)\n");
  expect(t).toContain("## Named by a dry step and not done\n\n- back implementer d: named by 2 steps, first at event 10 (09:41:40Z), last at 11 (09:44:40Z)\n");
  expect(t).toContain("## Named by a dry step, of a kind the record has no event of\n\n- token-ended k: named by 1 step, first at event 10 (09:41:40Z)\n");
  expect(t).toContain("named by no dry step\n\n- event 12 (09:45:40Z): moved ready of z by out-bbbbbb, key k/12; the step before it read event 11, 1 min earlier; no step after it\n");
  expect(compareText(compare([], []))).toContain("# 0 dry steps, events 0 to 0 (no step): 0 whole, 0 not healthy; 0 events after the first\n\n## Named by a dry step and done\n\nNothing.\n");
});
