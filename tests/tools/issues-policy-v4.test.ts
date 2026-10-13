// plan/cloud-brain-issues-policy-v4.json, the body of the issue.install after which an open part that is feedback no
// longer holds its project at `building` (task 4 of plan/cloud-brain-bookkeeping-in-the-tracker.md, issue
// bk-4-install-the-project-workflow). The file is data the owner installs. Held here: that it is the policy of the v3
// file, which cb4 has in force since event 4668, with the two guards of the cell issuesDefaultPolicy and nothing else;
// that its reason keeps the approver's two blobs; and what the tracker's rig answers when the file is installed over a
// copy of cb4's open projects (fixtures/bk-4-open-projects.json).
//
//   bun test --timeout=120000 ./tests/tools/issues-policy-v4.test.ts
// The rig is issuesRig of this checkout's brain-issues.ojs, compiled here with one more cell (fixtures/bk-4-install-rig.ojs)
// and no other test cell, and run by cloud-brain-dev/test.ts beside the other modules as cloud-brain-dev/deploy/ has them.
// No call leaves the machine.
import { expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { BRIEF, TOOL } from "../../tools/cloud-brain/approver.ts";
import { SEEDS, seedModule, testNeedingSeed, testNeedingSeedAnd } from "./needs.ts";

const root = resolve(import.meta.dir, "../.."), me = "issues-policy-v4.test.ts";
const FILE = "plan/cloud-brain-issues-policy-v4.json";
const read = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));
const v4 = read(FILE), v3 = read("plan/cloud-brain-issues-policy-v3.json"), cb4 = read("tests/tools/fixtures/bk-4-open-projects.json");
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const moveOf = (policy: any, workflow: string, name: string) => policy.workflows[workflow].moves.find((m: any) => m.name === name);
const approve = moveOf(v3.policy, "task", "approve").guard as string;
const approver = /^caller\.present \|\| caller\.actor == "delegation:([0-9a-f]{12})"$/.exec(approve)?.[1];

const { test: withSeed, module: tracker } = await testNeedingSeed(me + ", the cell issuesDefaultPolicy", "brain-issues.ojs");

withSeed("it is the policy of v3 with decompose and finish of project as the built cell has them, and nothing else", async () => {
  expect(Object.keys(v4)).toEqual(["key", "reason", "policy", "migrate"]);
  expect(v4.key).not.toBe(v3.key);
  const { importNotebookModule } = await import(resolve(root, "tools/notebook-import.ts"));
  const cell = await (await importNotebookModule(tracker)).value("issuesDefaultPolicy");
  // From the policy in force: the two guards put back give v3, key for key.
  const back = structuredClone(v4.policy);
  expect(moveOf(back, "project", "decompose").guard).toBe('caller.kind in ["owner", "token"] && issue.children.work > 0');
  expect(moveOf(back, "project", "finish").guard).toBe('caller.kind in ["owner", "token"] && issue.children.work == 0');
  for (const n of ["decompose", "finish"]) {
    expect(moveOf(back, "project", n).guard).toBe(moveOf(cell, "project", n).guard);
    moveOf(back, "project", n).guard = moveOf(v3.policy, "project", n).guard;
  }
  expect(back).toEqual(v3.policy);
  // From the cell: the two approve guards of v3 put on it give this policy.
  const named = structuredClone(cell);
  for (const w of ["task", "project"]) moveOf(named, w, "approve").guard = approve;
  expect(named).toEqual(v4.policy);
  // No other guard of the file reads the new fact.
  const reads = Object.entries(v4.policy.workflows).flatMap(([w, flow]: [string, any]) => flow.moves.filter((m: any) => m.guard.includes("children.work")).map((m: any) => `${w}.${m.name}`));
  expect(reads).toEqual(["project.decompose", "project.finish"]);
});

test("the reason fits an install, has his words, and ends with the approver's brief and tool as the file's commit has them", () => {
  expect(v4.reason.length).toBeLessThanOrEqual(2000);
  for (const said of ["Please file a ticket to move book keeping into the issue tracker as U suggested, the the goal of reducing cognitive burden of orchistrator", "A", "As written, with the install."]) expect(v4.reason).toContain(`"${said}"`);
  expect(v4.reason).toContain(approve);
  expect(v4.reason).toContain(`policy of event ${cb4.policy} `);
  // approver.ts makes no approve under a policy whose reason does not end with these two (its R7).
  const pins = /approver brief ([0-9a-f]{40}) tool ([0-9a-f]{40})$/.exec(v4.reason);
  expect(pins).toBeTruthy();
  const at = git("log", "-1", "--format=%H", "--", FILE) || git("rev-parse", "HEAD");
  expect([pins![1], pins![2]]).toEqual([git("rev-parse", `${at}:${BRIEF}`), git("rev-parse", `${at}:${TOOL}`)]);
});

// The rig. One run of cloud-brain-dev/test.ts, read by the tests below.
const CELL = "test_bk4_install_in_the_rig";
const withCell = { name: "brain-issues-bk-4-install", text: (seed: string) => {
  const cells = seed.split(/^(?=\/\/ %%)/m).filter((c) => !/^(\/\/ %%.*\n)?(\/\/.*\n)*test_\w+ = /.test(c));
  const data = JSON.stringify({ v3, v4, projects: cb4.projects, approver });
  const cell = readFileSync(join(root, "tests/tools/fixtures/bk-4-install-rig.ojs"), "utf8").replace('"__DATA__"', () => data);
  return cells.join("") + "\n// %%\n" + cell;
} };
const dev = join(root, "cloud-brain-dev");
const { test: withRig, module: built } = await testNeedingSeedAnd(me + ", the rig", "brain-issues.ojs", [join(dev, "test.ts"), join(dev, "deploy/services.json")], (seed) => seedModule(seed, SEEDS, withCell));
let ran: Promise<any> | undefined;
const rig = () => (ran ??= (async () => {
  // The report is a file since test-ts-output-floods-the-reader; a test.ts from before it prints it as its last line.
  const file = join(dirname(built), "report.json");
  rmSync(file, { force: true });
  const r = spawnSync("bun", ["test.ts", "brain-x-issues", "--with", built, "--whole", "--seconds", "100", "--report", file], { cwd: dev, encoding: "utf8", maxBuffer: 1 << 26 });
  const line = (existsSync(file) ? readFileSync(file, "utf8") : r.stdout).trim().split("\n").at(-1) || "";
  let report: any;
  try { report = JSON.parse(line); } catch { throw new Error(`test.ts gave no report (exit ${r.status}): ${r.stdout.slice(-2000)}\n${r.stderr.slice(-2000)}`); }
  // The one cell, and it answered: no other test cell of the module was compiled in.
  expect(report.tests.map((t: any) => [t.name, t.state, t.error])).toEqual([[CELL, "passed", undefined]]);
  return JSON.parse(report.tests[0].value);
})());

const ids = cb4.projects.map((p: any) => p.id), sorted = (a: string[]) => a.slice().sort();
const statesOf = Object.fromEntries(cb4.projects.map((p: any) => [p.id, p.state]));
const T = 120000;

withRig("the rig holds cb4's policy: the v3 file installs to the four hashes issue.policy answered", async () => {
  const r = await rig();
  expect(r.before.names).toEqual(cb4.names);
  expect(Object.keys(v4.migrate)).toEqual([cb4.names.project]);
  expect(v4.migrate[cb4.names.project]).toEqual({ workflow: "project" });
  expect(r.before.states).toEqual(statesOf);
}, T);

withRig("under v3 a project that only feedback holds is not finished: not listed, and refused by hand", async () => {
  const r = await rig();
  // The copy has at least one such project, or this file shows nothing of what the install is for.
  expect(r.due.length).toBeGreaterThan(0);
  expect(r.before.finishQueued).toEqual([]);
  expect(r.before.finishByHand).toEqual(r.due.map(() => expect.objectContaining({ status: 403, message: "the guard of finish refuses" })));
}, T);

withRig("the install moves every open project and nothing else, each to the state it had", async () => {
  const r = await rig();
  expect(r.installed).toMatchObject({ status: 200, left: [], relinked: [], unlinked: [] });
  expect(sorted(r.installed.moved)).toEqual(sorted([...ids, "x-spec-waits"]));
  // task, security and feedback keep their hash, so no issue of theirs is swapped and none loses a review.
  const { project, ...rest } = r.installed.hashes, { project: was, ...before } = r.before.names;
  expect(rest).toEqual(before);
  expect(project).not.toBe(was);
  expect(r.after.policy).toEqual({ seq: r.installed.seq, kinds: v4.policy.kinds, names: r.installed.hashes, reason: v4.reason });
  // One event of the policy, one swap an open project (from the old hash to the new, the state kept), and one finish
  // for each project that only feedback held.
  expect(r.after.events).toBe(1 + r.installed.moved.length + r.due.length);
  expect(sorted(r.after.swaps.map((s: any) => s[0]))).toEqual(sorted(r.installed.moved));
  for (const s of r.after.swaps) expect(s.slice(1)).toEqual([r.installed.seq, true, true, true]);
  expect(r.after.verify).toMatchObject({ ok: true, guards: true });
}, T);

withRig("the install's own call finishes the project that only feedback held, after its swap, and no other", async () => {
  const r = await rig();
  expect(r.finished.map((f: any) => f.id)).toEqual(r.due);
  for (const f of r.finished) {
    expect(f.state).toBe("done");
    expect(f.swap).toEqual({ type: "swapped", seq: expect.any(Number), policy: r.installed.seq });
    // Made by the service as the caller of the install, the owner present, with the swap's seq as `auto`.
    expect(f.last).toEqual({ key: `auto/${f.swap.seq}/${f.id}`, move: "finish", auto: f.swap.seq, via: "session", caller: "owner", reason: `no part holds it after event ${f.swap.seq}` });
  }
  const done = { ...statesOf, ...Object.fromEntries(r.due.map((id: string) => [id, "done"])) };
  expect(r.after.states).toEqual(done);
  // So the queue has no finish to list: the answer of the install does not name the finish, and nothing is left to make.
  expect(r.after.finishQueued).toEqual([]);
  expect("auto" in r.installed).toBe(false);
  // Every other project is where it was: one with an open task part is refused by hand, one with no part is not decomposed.
  expect(r.held.length + r.due.length + r.noParts.length).toBe(ids.length);
  expect(r.stillHeld).toEqual(r.held.map(() => expect.objectContaining({ status: 403, message: "the guard of finish refuses" })));
  expect(r.notDecomposed).toEqual(r.noParts.map(() => expect.objectContaining({ status: 403, message: "the guard of decompose refuses" })));
  expect(r.end.states).toEqual(done);
  expect(r.end.finishQueued).toEqual([]);
  expect(r.end.verify).toMatchObject({ ok: true, guards: true });
}, T);

withRig("the approve of event 4668 stands: the named delegation approves a spec and a task, another token neither", async () => {
  const r = await rig();
  expect(approver).toBeTruthy();
  expect([r.approves.otherSpec, r.approves.otherTask]).toEqual([expect.objectContaining({ status: 403, message: "the guard of approve refuses" }), expect.objectContaining({ status: 403, message: "the guard of approve refuses" })]);
  expect(r.approves.spec).toMatchObject({ status: 200, move: "approve", to: "approved", via: "delegation:" + approver });
  expect(r.approves.task).toMatchObject({ status: 200, move: "approve", to: "done", via: "delegation:" + approver });
}, T);

withRig("the body sent again is the install it was: nothing moved, no event", async () => {
  const r = await rig();
  expect(r.again).toMatchObject({ status: 200, seq: r.installed.seq, duplicate: true, moved: [], left: [] });
}, T);
