// plan/cloud-brain-issues-policy-v7.json, the v6 file with the approver's tool as main has it after
// approver-check-wants-an-orch-starter, under a key of its own. The file is data the owner installs. Held here: that it
// is the v6 file but for its key and the end of its reason, as policy-pins.ts remake makes it; that the two blobs are
// those of the commit the file is of; and what the tracker's rig answers when the file is installed on a record that
// has the v6 file in force, which cb4 has since event 6510.
// That the newest policy file names the two files of the checkout, and what approver.ts judges under it, is held by
// issues-policy-v5.test.ts for whichever file is the newest.
//
//   bun test --timeout=120000 ./tests/tools/issues-policy-v7.test.ts
// The rig is the cell of issues-policy-v6.test.ts (fixtures/v6-install-rig.ojs), given the v6 file where that test
// gives the v5 file and the v7 file where it gives the v6 file: the names of what it returns are that cell's, so `v5`,
// `under5` and `v5again` below are of the v6 file, and `v6`, `under6` and `v6again` of the v7 file. No call leaves the
// machine.
import { expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { BRIEF, TOOL } from "../../tools/cloud-brain/approver.ts";
import { pinsOf, remake } from "../../tools/cloud-brain/policy-pins.ts";
import { testNeedingRunningModule } from "./needs.ts";

const root = resolve(import.meta.dir, "../.."), me = "issues-policy-v7.test.ts";
const FILE = "plan/cloud-brain-issues-policy-v7.json", V6 = "plan/cloud-brain-issues-policy-v6.json";
const text = (f: string) => readFileSync(join(root, f), "utf8");
const v7 = JSON.parse(text(FILE)), v6 = JSON.parse(text(V6)), v3 = JSON.parse(text("plan/cloud-brain-issues-policy-v3.json"));
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const KEY = "policy-2026-10-13-approver-check-starter-v7";
const NOTE = "Made again by approver-check-wants-an-orch-starter, for the tool whose check counts an approver's cost event that an orch- or an out- holder wrote; the brief is unchanged and the policy is as event 6510 left it, under a key of its own.";

test("it is the v6 file but for its key and the end of its reason: the policy and the migrate are v6's", () => {
  expect(Object.keys(v7)).toEqual(["key", "reason", "policy", "migrate"]);
  const { reason, key, ...rest } = v7, { reason: was, key: old, ...before } = v6;
  expect(JSON.stringify(rest)).toBe(JSON.stringify(before));
  // A key no other policy file of plan/ has, of a length an install takes (issuesLimits.key, 100).
  expect(key).toBe(KEY);
  const others = readdirSync(join(root, "plan")).filter((f) => /^cloud-brain-issues-policy-.*\.json$/.test(f) && "plan/" + f !== FILE);
  expect(others).toContain("cloud-brain-issues-policy-v6.json");
  for (const f of others) expect(JSON.parse(text("plan/" + f)).key).not.toBe(key);
  expect(key.length).toBeLessThanOrEqual(100);
  // The reason: v6's to its two blobs, then one sentence, then v6's brief and a tool that is not v6's.
  const had = pinsOf(was)!, now = pinsOf(reason)!;
  expect(reason).toBe(`${was.slice(0, was.length - `approver brief ${had.brief} tool ${had.tool}`.length)}${NOTE} approver brief ${now.brief} tool ${now.tool}`);
  expect(reason.length).toBeLessThanOrEqual(2000);
  expect(now.brief).toBe(had.brief);
  expect(now.tool).not.toBe(had.tool);
  // Byte for byte it is what policy-pins.ts makes of the v6 file with that note and that key.
  expect(text(FILE)).toBe(remake(text(V6), now, NOTE, KEY));
});

test("the two blobs are those of the brief and the tool at the commit the file is of", () => {
  const pins = pinsOf(v7.reason)!;
  const at = git("log", "-1", "--format=%H", "--", FILE) || git("rev-parse", "HEAD");
  expect([pins.brief, pins.tool]).toEqual([git("rev-parse", `${at}:${BRIEF}`), git("rev-parse", `${at}:${TOOL}`)]);
});

// The rig. One run of cloud-brain-dev/test.ts, read by the tests below.
const CELL = "test_v6_install_in_the_rig";
const withCell = { name: "brain-issues-v7-install", cell: readFileSync(join(root, "tests/tools/fixtures/v6-install-rig.ojs"), "utf8").replace('"__DATA__"', () => JSON.stringify({ v3, v5: v6, v6: v7 })) };
const dev = join(root, "cloud-brain-dev");
const { test: withRig, module: built } = await testNeedingRunningModule(me + ", the rig", "brain-issues", withCell, [join(dev, "test.ts"), join(dev, "deploy/services.json")]);
let ran: Promise<any> | undefined;
const rig = () => (ran ??= (async () => {
  const file = join(dirname(built), "report.json");
  rmSync(file, { force: true });
  const r = spawnSync("bun", ["test.ts", "brain-x-issues", "--with", built, "--whole", "--seconds", "100", "--report", file], { cwd: dev, encoding: "utf8", maxBuffer: 1 << 26 });
  const line = (existsSync(file) ? readFileSync(file, "utf8") : r.stdout).trim().split("\n").at(-1) || "";
  let report: any;
  try { report = JSON.parse(line); } catch { throw new Error(`test.ts gave no report (exit ${r.status}): ${r.stdout.slice(-2000)}\n${r.stderr.slice(-2000)}`); }
  expect(report.tests.map((t: any) => [t.name, t.state, t.error])).toEqual([[CELL, "passed", undefined]]);
  return JSON.parse(report.tests[0].value);
})());
const T = 120000;

withRig("the rig is as cb4 is: the v3 file, then the v6 file in force with its reason", async () => {
  const r = await rig();
  expect([r.v3.status, r.v5.status]).toEqual([200, 200]);
  expect(r.under5).toMatchObject({ seq: r.v5.seq, reason: v6.reason, names: r.v5.hashes });
}, T);

withRig("the v7 body under the key of v6 writes nothing: the reason in force is still v6's", async () => {
  const r = await rig();
  expect(r.sameKey).toMatchObject({ status: 200, duplicate: true, seq: r.v5.seq, reason: v6.reason });
  expect(r.afterSameKey).toEqual({ policy: r.under5, events: r.before.events });
}, T);

withRig("the v7 file installs: one event, the reason in force is its own, and no workflow and no issue changes", async () => {
  const r = await rig();
  expect(r.v6).toEqual({ status: 200, seq: r.before.events + 1, hashes: r.v5.hashes, moved: [], left: [], relinked: [], unlinked: [] });
  expect(r.under6).toEqual({ ...r.under5, seq: r.v6.seq, reason: v7.reason });
  expect(pinsOf(r.under6.reason)).toEqual(pinsOf(v7.reason));
  expect(r.after).toEqual({ ...r.before, events: r.before.events + 1 });
  expect([r.before.task.workflow, r.before.project.workflow]).toEqual([r.v5.hashes.task, r.v5.hashes.project]);
}, T);

withRig("each file sent again is the install it was, and the v6 file sent last does not bring its reason back", async () => {
  const r = await rig();
  expect(r.v6again).toMatchObject({ status: 200, duplicate: true, seq: r.v6.seq, reason: v7.reason });
  expect(r.v5again).toMatchObject({ status: 200, duplicate: true, seq: r.v5.seq, reason: v6.reason });
  expect(r.end.policy).toEqual(r.under6);
  expect(r.end.events).toBe(r.after.events);
  expect(r.end.verify).toMatchObject({ ok: true, guards: true });
}, T);
