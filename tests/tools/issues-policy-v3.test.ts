// plan/cloud-brain-issues-policy-v3.json, the body of the issue.install that lets the token loop-approver make the
// `approve` move (task 4 of plan/cloud-brain-approver-persona.md, issue ap-4-policy-v3). The file is data the owner
// installs: what is held here is that it is the policy of v2 with two guards changed and nothing else, that the guard
// takes the two callers it should, that approver.ts reads its delegation and its two blobs, and that the blobs are
// those of the brief and the tool at the commit the file is of. The policy in a rig is the seed's test,
// test_issues_an_approver_delegation_approves_and_no_other_token (brain-x-issues).
//
//   bun test ./tests/tools/issues-policy-v3.test.ts
import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse } from "../../tools/cloud-brain/cel.js";
import { judge, gitOf, BRIEF, TOOL } from "../../tools/cloud-brain/approver.ts";

const root = resolve(import.meta.dir, "../..");
const FILE = "plan/cloud-brain-issues-policy-v3.json";
const read = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));
const v3 = read(FILE), v2 = read("plan/cloud-brain-issues-policy-v2.json");
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const approveOf = (policy: any, workflow: string) => policy.workflows[workflow].moves.find((m: any) => m.name === "approve");
const guard = approveOf(v3.policy, "task").guard as string;
const id = /^caller\.present \|\| caller\.actor == "delegation:([0-9a-f]{12})"$/.exec(guard)?.[1];

test("it is the policy of v2 with the approve guard of task and of project changed, and nothing else", () => {
  expect(Object.keys(v3)).toEqual(["key", "reason", "policy", "migrate"]);
  expect(id).toBeTruthy();
  expect(approveOf(v3.policy, "project").guard).toBe(guard);
  expect(approveOf(v3.policy, "security").guard).toBe("caller.present");
  // Every other approve-like act of the owner is as it was: the two guards put back give v2, key for key.
  const back = structuredClone(v3.policy);
  for (const w of ["task", "project"]) approveOf(back, w).guard = "caller.present";
  expect(back).toEqual(v2.policy);
  expect(v3.key).not.toBe(v2.key);
});

test("the guard takes the owner present and the one delegation, and no other caller", () => {
  const allowed = parse(guard);
  const caller = (present: boolean, actor: string) => allowed({ caller: { present, actor } });
  expect(caller(true, "owner")).toBe(true);
  expect(caller(false, "delegation:" + id)).toBe(true);
  expect(caller(false, "delegation:0123456789ab")).toBe(false);
  expect(caller(false, "owner")).toBe(false);
  // The id beside the one that works, and a name where the id is.
  expect(caller(false, "delegation:" + id + "0")).toBe(false);
  expect(caller(false, "delegation:" + id!.slice(0, 11))).toBe(false);
  expect(caller(false, "secret:loop-approver")).toBe(false);
  expect(caller(false, "")).toBe(false);
});

test("migrate names two workflow hashes, to task and to project, with no state mapped", () => {
  const entries = Object.entries(v3.migrate) as [string, any][];
  expect(entries.map(([, to]) => to)).toEqual([{ workflow: "task" }, { workflow: "project" }]);
  for (const [hash] of entries) expect(hash).toMatch(/^[0-9a-f]{64}$/);
  expect(new Set(entries.map(([h]) => h)).size).toBe(2);
});

test("the reason has his words, fits an install, and ends with the brief and the tool as the file's commit has them", () => {
  expect(v3.reason.length).toBeLessThanOrEqual(2000);
  for (const said of [
    "I would like a new persona for auto-approving my owner tasks. They should review the process and if it looks secure and thematically consistent with my wishes and philosophy, then auto approve needs owner issues",
    "No it can approve anything if that's what I have asked for",
    "A the persona should always be an isolated session that judges a ticket against cluster evidence itself (i.e. not a continuation of a reviewer/writer agent session)"
  ]) expect(v3.reason).toContain(`"${said}"`);
  expect(v3.reason).toContain(guard);
  const pins = /approver brief ([0-9a-f]{40}) tool ([0-9a-f]{40})$/.exec(v3.reason);
  expect(pins).toBeTruthy();
  // The commit the file was last changed in; before its first commit, the one the checkout is at.
  const at = git("log", "-1", "--format=%H", "--", FILE) || git("rev-parse", "HEAD");
  expect([pins![1], pins![2]]).toEqual([git("rev-parse", `${at}:${BRIEF}`), git("rev-parse", `${at}:${TOOL}`)]);
});

test("approver.ts reads the delegation of this policy, and none of the policy before it", () => {
  // As a `policy` event has it, with a name for each hash, and one issue opened on the task workflow.
  const event = (file: any) => ({ type: "policy", seq: 1, reason: file.reason, policy: file.policy, hashes: Object.fromEntries(Object.keys(file.policy.workflows).map((n) => [n, "hash-of-" + n])) });
  const record = (kind: string) => [{ seq: 2, type: "opened", id: "i", workflow: "hash-of-" + kind, state: "open", by: {} }];
  const read = (file: any, kind: string) => judge(record(kind), event(file), gitOf(root), { id: "i", verdict: 3 });
  expect(read(v3, "task")).toMatchObject({ exit: 1, delegation: "delegation:" + id });
  expect(read(v3, "project")).toMatchObject({ exit: 1, delegation: "delegation:" + id });
  expect(read(v3, "security")).toMatchObject({ exit: 3, delegation: "" });
  expect(read(v2, "task")).toMatchObject({ exit: 3, delegation: "" });
});
