// plan/cloud-brain-issues-policy-v5.json, the v4 file with the approver's brief and tool as main has them after
// approver-brief-his-test and approver-own-files-are-the-policy-cells (issue policy-v5-names-the-approver-as-it-is).
// The file is data the owner installs. Held here: that it is the v4 file but for the end of its reason; that the two
// blobs are those of the commit the file is of; that the newest policy file names the two files as the checkout has
// them, which fails for a writer who changes either and says what that costs; that approver.ts refuses an approve
// under the reason of v4 and sends one under this file's; and tools/cloud-brain/policy-pins.ts,
// which made the file. What the body does at an install is held by issues-policy-v4.test.ts, of the same policy.
//
//   bun test --timeout=30000 ./tests/tools/issues-policy-v5.test.ts
import { expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { judge, BRIEF, TOOL } from "../../tools/cloud-brain/approver.ts";
import { blobs, check, newest, pinsOf, remake, COST } from "../../tools/cloud-brain/policy-pins.ts";

const root = resolve(import.meta.dir, "../..");
const FILE = "plan/cloud-brain-issues-policy-v5.json", V4 = "plan/cloud-brain-issues-policy-v4.json";
const text = (f: string) => readFileSync(join(root, f), "utf8");
const v5 = JSON.parse(text(FILE)), v4 = JSON.parse(text(V4));
const git = (...a: string[]) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const NOTE = "Made again by policy-v5-names-the-approver-as-it-is, for the brief and the tool as main has them after approver-brief-his-test and approver-own-files-are-the-policy-cells.";
const A = "a".repeat(40), B = "b".repeat(40);

test("it is the v4 file but for the end of its reason: the key, the policy and the migrate are v4's", () => {
  expect(Object.keys(v5)).toEqual(["key", "reason", "policy", "migrate"]);
  const { reason, ...rest } = v5, { reason: was, ...before } = v4;
  expect(rest).toEqual(before);
  expect(JSON.stringify(rest)).toBe(JSON.stringify(before));
  // The reason: v4's to its two blobs, then one sentence, then the two blobs of now.
  const old = pinsOf(was)!, now = pinsOf(reason)!;
  const head = was.slice(0, was.length - `approver brief ${old.brief} tool ${old.tool}`.length);
  expect(reason).toBe(`${head}${NOTE} approver brief ${now.brief} tool ${now.tool}`);
  expect(reason.length).toBeLessThanOrEqual(2000);
  expect([now.brief, now.tool]).not.toEqual([old.brief, old.tool]);
  // Byte for byte it is what the tool makes of the v4 file.
  expect(text(FILE)).toBe(remake(text(V4), now, NOTE));
});

test("the two blobs are those of the brief and the tool at the commit the file is of", () => {
  const pins = pinsOf(v5.reason)!;
  const at = git("log", "-1", "--format=%H", "--", FILE) || git("rev-parse", "HEAD");
  expect([pins.brief, pins.tool]).toEqual([git("rev-parse", `${at}:${BRIEF}`), git("rev-parse", `${at}:${TOOL}`)]);
});

// The defect the file is for, through the tool's own judge: a verdict that holds in every other way, with origin/main
// and the running tool at the blobs of this checkout. Under the reason of v4, which ends as the policy in force does,
// the approve is refused on R7; under the reason of v5 it is sent.
test("approver.ts judges an approve: refused on R7 under the reason of v4, sent under the reason of v5", () => {
  const now = blobs(root), HIS = "yes, build the thing as the plan has it", UUID = "11111111-2222-3333-4444-555555555555";
  const guard = v5.policy.workflows.task.moves.find((m: any) => m.name === "approve").guard as string;
  const by = (holder: string, via = "delegation:aaaaaaaaaaaa") => ({ holder: holder && "secret:" + holder, via });
  const record = (brief: string) => [
    { seq: 1, type: "opened", id: "t1", workflow: "task", state: "open", by: by("orch-111111") },
    { seq: 3, type: "commented", id: "t1", key: UUID, body: HIS, by: by("", "session") },
    { seq: 5, type: "moved", id: "t1", move: "start", to: "in-progress", by: by("impl-222222", "delegation:bbbbbbbbbbbb") },
    { seq: 6, type: "moved", id: "t1", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "lopecode-dev@" + A }], by: by("impl-222222", "delegation:bbbbbbbbbbbb") },
    { seq: 7, type: "reviewed", id: "t1", verdict: "pass", by: by("rev-333333", "delegation:cccccccccccc") },
    { seq: 8, type: "moved", id: "t1", move: "to-approval", to: "awaiting-approval", by: by("rev-333333", "delegation:cccccccccccc") },
    { seq: 9, type: "commented", id: "t1", key: "approver/t1/verdict-1", body: `approver: approve\nasked: 3 "${HIS}"\nbrief ${brief}`, by: by("appr-444444", "delegation:dddddddddddd") }
  ];
  const git: any = { main: "origin/main", fetch: () => true, self: () => now.tool, philosophy: () => "", text: () => "", blob: (f: string) => (f === BRIEF ? now.brief : f === TOOL ? now.tool : null), files: () => ["tools/cloud-brain/brain-topic.ojs"] };
  const under = (reason: string, brief: string) => judge(record(brief), { policy: { seq: 4668, reason }, workflows: v5.policy.workflows }, git, { id: "t1", verdict: 9 });
  const old = pinsOf(v4.reason)!;
  // v4, whichever brief the verdict names: the one the policy would name, or the one main has.
  expect(under(v4.reason, old.brief)).toMatchObject({ exit: 1, send: null, why: [
    `${BRIEF} at origin/main is ${now.brief}, and the policy names ${old.brief} (R7)`,
    `${TOOL} at origin/main is ${now.tool}, and the policy names ${old.tool} (R7)`,
    `the tool that runs is ${now.tool}, and the policy names ${old.tool} (R7)`
  ] });
  expect(under(v4.reason, now.brief).why.filter((w: string) => w.includes("(R7)")).length).toBe(4);
  const sent = under(v5.reason, now.brief);
  expect(sent).toMatchObject({ exit: 0, why: [], delegation: /^delegation:[0-9a-f]{12}$/.exec(sent.delegation)?.[0] });
  expect(sent.send).toMatchObject({ key: "approver/t1/approve-1", id: "t1", to: "done" });
});

test("the newest policy file names the brief and the tool as this checkout has them", () => {
  // A fail here is no defect of the test: its line ends with what the change that made it fail costs.
  const c = check(root);
  if (c.exit) throw new Error(c.line);
  expect(Number(/v(\d+)\.json$/.exec(newest(root)!)![1])).toBeGreaterThanOrEqual(5);
});

test("a checkout whose brief or tool is not the newest file's is exit 1, with both pairs and the cost", () => {
  const dir = mkdtempSync(join(tmpdir(), "policy-pins-"));
  try {
    for (const f of [BRIEF, TOOL, FILE, V4]) { mkdirSync(dirname(join(dir, f)), { recursive: true }); cpSync(join(root, f), join(dir, f)); }
    const had = blobs(dir);
    expect(had).toEqual(pinsOf(v5.reason)!);
    expect(check(dir).exit).toBe(0);
    for (const f of [BRIEF, TOOL]) {
      const kept = readFileSync(join(dir, f));
      appendFileSync(join(dir, f), "\n");
      const now = blobs(dir), c = check(dir);
      expect(c).toEqual({ exit: 1, line: `${FILE} names the brief ${had.brief} and the tool ${had.tool}; the checkout has ${now.brief} and ${now.tool}. ${COST}` });
      writeFileSync(join(dir, f), kept);
    }
    expect(COST).toContain("one more install by the owner");
    // The newest is by its number, not by its name's order: v10 is after v9.
    cpSync(join(dir, V4), join(dir, "plan/cloud-brain-issues-policy-v10.json"));
    expect(newest(dir)).toBe("plan/cloud-brain-issues-policy-v10.json");
    expect(check(dir).exit).toBe(1);
    rmSync(join(dir, "plan"), { recursive: true });
    mkdirSync(join(dir, "plan"));
    expect(check(dir)).toEqual({ exit: 1, line: "policy-pins.ts: no policy file has no `approver brief <blob> tool <blob>` at the end of its reason" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("remake changes the two blobs and nothing else, and refuses a text it cannot remake", () => {
  const body = (reason: string) => JSON.stringify({ key: "k", reason, policy: { kinds: {}, workflows: {} }, migrate: {} }, null, 1) + "\n";
  const from = body(`his "words". approver brief ${A} tool ${B}`);
  expect(remake(from, { brief: B, tool: A })).toBe(body(`his "words". approver brief ${B} tool ${A}`));
  expect(remake(from, { brief: B, tool: A }, ' a "note". ')).toBe(body(`his "words". a "note". approver brief ${B} tool ${A}`));
  expect(remake(from, { brief: A, tool: B })).toBe(from);
  expect(() => remake(body("his words"), { brief: A, tool: B })).toThrow("does not end");
  expect(() => remake(body(`approver brief ${A} tool ${B}. more`), { brief: A, tool: B })).toThrow("does not end");
  expect(() => remake(body(`approver brief ${A} tool ${B} approver brief ${A} tool ${B}`), { brief: B, tool: A })).toThrow("more than once");
  expect(() => remake(from, { brief: B, tool: A }, "x".repeat(2000))).toThrow("an install takes 2000");
  expect(() => remake("", { brief: A, tool: B })).toThrow();
  expect(pinsOf("")).toBeNull();
  expect(pinsOf(undefined as any)).toBeNull();
});

test("the command: check is exit 0 here; remake makes the file from v4 and writes no file over another", () => {
  const tool = join(root, "tools/cloud-brain/policy-pins.ts"), run = (...a: string[]) => spawnSync("bun", [tool, ...a], { encoding: "utf8" });
  const ok = run("check");
  expect([ok.status, ok.stdout.trim()]).toEqual([0, `${newest(root)} names the brief ${blobs(root).brief} and the tool ${blobs(root).tool}, as the checkout has them`]);
  const dir = mkdtempSync(join(tmpdir(), "policy-pins-"));
  try {
    const to = join(dir, "out.json");
    const made = run("remake", join(root, V4), to, "--note", NOTE);
    expect(made.status).toBe(0);
    expect(readFileSync(to, "utf8")).toBe(text(FILE));
    const again = run("remake", join(root, V4), to);
    expect([again.status, again.stderr.trim()]).toEqual([1, `policy-pins.ts: ${to} exists, and is not written over`]);
    expect(run("remake", join(root, V4)).status).toBe(1);
    expect(run().status).toBe(1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
