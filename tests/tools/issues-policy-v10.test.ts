// plan/cloud-brain-issues-policy-v10.json, the task workflow of plan/cloud-brain-agentic-redesign.md §3.1 and §3.5,
// made from the policy in force on cb4 on 2026-10-21, event 15036 (its issue.policy answer is
// tests/tools/fixtures/issues-policy-15036.json). Held here: the kinds and the security, feedback and project workflows
// are 15036's byte for byte; the task workflow has the five states, the six moves and the guards of the plan; the
// migrate moves every open state of 15036's task workflow to open; the key and the reason are ones an install takes;
// and migrate-labels.ts puts §5's labels. The guards are run in brain-x-issues' own tests
// (test_issues_flow_finish_wants_a_pass_by_another_holder_after_the_hand_over), not here.
//
//   bun test ./tests/tools/issues-policy-v10.test.ts
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { labelsFor } from "../../tools/cloud-brain/migrate-labels.ts";

const root = resolve(import.meta.dir, "../..");
const text = (f: string) => readFileSync(join(root, f), "utf8");
const FILE = "plan/cloud-brain-issues-policy-v10.json";
const v10 = JSON.parse(text(FILE)), inForce = JSON.parse(text("tests/tools/fixtures/issues-policy-15036.json"));
const was = (n: string) => inForce.workflows[inForce.policy.names[n]];
const TOK = 'caller.kind in ["owner", "token"]', SINCE = 'issue.by["+needs-reviewer"].seq';

test("the kinds and the security, feedback and project workflows are 15036's", () => {
  expect(Object.keys(v10)).toEqual(["key", "reason", "policy", "migrate"]);
  expect(v10.policy.kinds).toEqual(inForce.policy.kinds);
  expect(Object.keys(v10.policy.workflows)).toEqual(["task", "security", "feedback", "project"]);
  for (const n of ["security", "feedback", "project"]) expect(JSON.stringify(v10.policy.workflows[n])).toBe(JSON.stringify(was(n)));
  // feedback's promote names the workflow task: the new one keeps that name, so promote lands on it.
  expect(was("feedback").swaps[0].to).toEqual({ workflow: "task", state: "open" });
});

test("the task workflow is five states, six moves, and the guards of §3.1 and §3.5", () => {
  const t = v10.policy.workflows.task, guard = (n: string) => t.moves.find((m: any) => m.name === n)?.guard, old = was("task");
  expect([t.states, t.start, t.closed]).toEqual([["open", "done", "closed", "rejected", "reverted"], "open", ["done", "closed", "rejected", "reverted"]]);
  expect(t.moves.map((m: any) => [m.name, m.from, m.to])).toEqual([["owner-reject", "open", "rejected"], ["finish", "open", "done"], ["close", "open", "closed"], ["reject", "open", "rejected"], ["reopen", ["closed", "rejected"], "open"], ["revert", "done", "reverted"]]);
  for (const k of ["read", "open", "comment", "label", "link", "narrow"]) expect(t[k]).toBe(old[k]);
  expect([t.wait, t.review]).toEqual([TOK, `${TOK} && caller.holder != issue.by["+worker-processing"].holder`]);
  expect(guard("finish")).toBe(`issue.reviews.exists(r, r.verdict == "pass" && r.holder != issue.by["+worker-processing"].holder && r.seq > ${SINCE}) && !issue.reviews.exists(r, r.verdict == "block" && r.seq > ${SINCE}) && (!issue.major || ((caller.present || caller.actor == "delegation:eb3db9d0c6a5") && event.reason != ""))`);
  // The approver delegation is the one 15036's approve names.
  expect(old.moves.find((m: any) => m.name === "approve").guard).toContain('caller.actor == "delegation:eb3db9d0c6a5"');
  for (const n of ["reopen", "revert"]) expect(guard(n)).toBe(old.moves.find((m: any) => m.name === n).guard);
  expect([guard("close"), guard("reject"), guard("owner-reject")]).toEqual([`${TOK} && event.reason != ""`, `${TOK} && event.reason != ""`, 'caller.present && event.reason != ""']);
  expect(t.swaps).toEqual(old.swaps);
});

test("the migrate moves every open state of 15036's task workflow to open", () => {
  const old = was("task"), open = old.states.filter((s: string) => !old.closed.includes(s));
  expect(Object.keys(v10.migrate)).toEqual([inForce.policy.names.task]);
  const m = v10.migrate[inForce.policy.names.task];
  expect(m.workflow).toBe("task");
  for (const s of open) expect(m.states[s] ?? s).toBe("open");
  for (const to of Object.values(m.states)) expect(v10.policy.workflows.task.states).toContain(to);
});

test("a key no other policy file has, and a reason an install takes that ends `approver from <sha>`", () => {
  const others = readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-issues-policy-.*\.json$/.test(f) && "plan/" + f !== FILE);
  for (const f of others) expect(JSON.parse(text("plan/" + f)).key).not.toBe(v10.key);
  expect(v10.key.length).toBeLessThanOrEqual(100);
  expect(v10.reason.length).toBeLessThanOrEqual(2000);
  expect(v10.reason).toMatch(/ approver from [0-9a-f]{40}$/);
});

test("migrate-labels.ts puts §5's labels and takes off only the ones the issue carries", () => {
  const w = (from: string, labels: string[] = []) => { const { add, remove } = labelsFor(from, labels); return [add, remove]; };
  expect(w("ready")).toEqual([["needs-worker"], []]);
  expect(w("triaged", ["needs-owner"])).toEqual([[], []]);
  expect(w("ready", ["laptop", "stranded"])).toEqual([[], ["stranded"]]);
  expect(w("in-progress")).toEqual([["needs-worker"], []]);
  expect(w("in-review", ["owner", "major", "run-stopped", "stranded"])).toEqual([["needs-worker"], ["run-stopped", "stranded"]]);
  // Not needs-owner: under v10 it has no pass after +needs-reviewer, so no path to done but the worker's hand-over.
  expect(w("awaiting-approval", ["major"])).toEqual([["needs-worker"], []]);
  expect(w("awaiting-approval")).toEqual([["needs-worker", "major"], []]);
  // not-done is closed and not migrated: it is no state of the table.
  expect(w("not-done")).toEqual([[], []]);
  expect(w("stopped", ["major", "run-stopped", "needs-owner"])).toEqual([["needs-worker"], ["run-stopped"]]);
  expect(w("ready", ["needs-worker"])).toEqual([[], []]);
});
