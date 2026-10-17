// plan/cloud-brain-issues-policy-v9.json, the simpler task workflow the owner asked for on 2026-10-17 ("write v9"),
// made from the policy in force on cb4 then, event 7928: v8 with the state not-done and the move not-done
// (issue approved-not-landed-state). Held here: the three other workflows and the kinds are v8's byte for byte; the
// task workflow is 7928's (v8's plus not-done, written out below) with the changes plan/cloud-brain-issues-policy-v9.md
// lists and no others; every move name of 7928 is still there; the migrate names 7928's task hash alone; the key and
// the reason are ones an install takes. The walk of the file is policy-walk.test.ts (it walks the newest file); that
// the reason ends with the blobs of the checkout is issues-policy-v5.test.ts. Not held: an install in the tracker's rig.
//
//   bun test ./tests/tools/issues-policy-v9.test.ts
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pinsOf } from "../../tools/cloud-brain/policy-pins.ts";

const root = resolve(import.meta.dir, "../..");
const text = (f: string) => readFileSync(join(root, f), "utf8");
const FILE = "plan/cloud-brain-issues-policy-v9.json";
const v9 = JSON.parse(text(FILE)), v8 = JSON.parse(text("plan/cloud-brain-issues-policy-v8.json"));
const TASK_7928 = "ae6c97e05acca0b4975ef0db95072e8024a099e20aa75cce9512d3834523224d";
const TOK = 'caller.kind in ["owner", "token"]', SAID = `${TOK} && event.reason != ""`;

// The task workflow of event 7928, read with issue-as.sh <token> policy on 2026-10-17: v8's and the not-done of
// approved-not-landed-state.
const task7928 = () => {
  const t = structuredClone(v8.policy.workflows.task);
  t.states.push("not-done");
  t.closed.push("not-done");
  t.moves.push({ name: "not-done", from: "done", to: "not-done", guard: `event.reason != "" && size(event.refs) > 0 && (caller.present || (issue.major && ${TOK}))` });
  return t;
};

test("the kinds and the security, feedback and project workflows are v8's, which 7928 has in force", () => {
  expect(Object.keys(v9)).toEqual(["key", "reason", "policy", "migrate"]);
  expect(v9.policy.kinds).toEqual(v8.policy.kinds);
  expect(Object.keys(v9.policy.workflows).sort()).toEqual(Object.keys(v8.policy.workflows).sort());
  for (const n of ["security", "feedback", "project"]) expect(JSON.stringify(v9.policy.workflows[n])).toBe(JSON.stringify(v8.policy.workflows[n]));
});

test("the task workflow is 7928's with the changes of the .md and no others", () => {
  const t = task7928(), at = (name: string) => t.moves.find((m: any) => m.name === name);
  t.states.splice(t.states.indexOf("awaiting-approval") + 1, 0, "stopped");
  at("owner-reject").from.push("stopped");
  at("ready").from = ["open", "triaged"];
  at("back").from = ["in-progress", "in-review"];
  at("close").from.push("stopped");
  const i = t.moves.findIndex((m: any) => m.name === "back") + 1;
  t.moves.splice(i, 0, { name: "stop", from: ["ready", "in-progress", "in-review"], to: "stopped", guard: SAID }, { name: "retry", from: "stopped", to: "ready", guard: SAID });
  t.moves.push({ name: "requeue", from: "not-done", to: "ready", guard: SAID });
  expect(v9.policy.workflows.task).toEqual(t);
  // stopped is not closed: the loop retries it.
  expect(v9.policy.workflows.task.closed).not.toContain("stopped");
});

test("every move name of 7928 is still there, and the guards that keep the owner's authority are as they were", () => {
  const was = task7928(), now = v9.policy.workflows.task, guard = (w: any, n: string) => w.moves.find((m: any) => m.name === n)?.guard;
  for (const m of was.moves) expect(now.moves.map((x: any) => x.name)).toContain(m.name);
  for (const n of ["approve", "revert", "owner-reject", "pass", "to-approval", "submit", "start", "rework", "not-done"]) expect(guard(now, n)).toBe(guard(was, n));
  expect(guard(now, "approve")).toBe('caller.present || caller.actor == "delegation:eb3db9d0c6a5"');
  expect(now.label).toBe(was.label);
  // Each new or widened move is the owner's or a token's: none is a Worker's (policy-walk.ts, moves-are-his-or-a-token).
  for (const n of ["ready", "back", "stop", "retry", "requeue", "close"]) expect(guard(now, n)).toStartWith(TOK);
});

test("the migrate moves the open issues of 7928's task workflow state for state, and nothing else", () => {
  expect(v9.migrate).toEqual({ [TASK_7928]: { workflow: "task" } });
  for (const s of task7928().states) expect(v9.policy.workflows.task.states).toContain(s);
});

test("a key no other policy file has, and a reason an install takes that ends with the two blobs", () => {
  const others = readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-issues-policy-.*\.json$/.test(f) && "plan/" + f !== FILE);
  for (const f of others) expect(JSON.parse(text("plan/" + f)).key).not.toBe(v9.key);
  expect(v9.key.length).toBeLessThanOrEqual(100);
  expect(v9.reason.length).toBeLessThanOrEqual(2000);
  expect(v9.reason).toStartWith('Tom, 2026-10-17, in chat: "write v9"');
  expect(pinsOf(v9.reason)).not.toBeNull();
});
