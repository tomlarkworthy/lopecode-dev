// approver.ts: the one approve move an approver may make for the owner, and what is read of those moves.
// Issue ap-1-approver-tool, task 1 of plan/cloud-brain-approver-persona.md (R2 to R8; the cases are the list under
// "How each requirement is known to be met").
//
//   bun test ./tests/tools/approver.test.ts
//   APPROVER_TS=/path/to/another/approver.ts bun test …
// No call leaves the machine. The record and the policy are made below, the git repository is made in a temporary
// directory with the tool itself committed as its tools/cloud-brain/approver.ts, and the tracker of the last tests is a
// server of this process, which keeps each call with the bearer it came with.
import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const tool = process.env.APPROVER_TS || resolve(import.meta.dir, "../../tools/cloud-brain/approver.ts");
const { judge, issueAt, facts, factsText, check, list, listText, trial, trialText, gitOf, marks, own, policyOf, BRIEF, TOOL, TEST } = await import(tool);

// ---- the repository
const root = realpathSync(mkdtempSync(join(tmpdir(), "approver-")));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const sh = (dir: string, ...a: string[]) => {
  const r = spawnSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${a.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
};
const put = (dir: string, file: string, text: string) => { mkdirSync(dirname(join(dir, file)), { recursive: true }); writeFileSync(join(dir, file), text); };
const commit = (file: string, text: string) => { put(root, file, text); sh(root, "add", file); sh(root, "commit", "-q", "-m", file); return sh(root, "rev-parse", "HEAD"); };
const RULES = ".claude/skills/brain-maintenance/rules.md", SPEC = "plan/cloud-brain-thing.md";
const HIS_RULE = "It seems like common sense to issue scoped tokens that follow a spec.", HIS_LINE = "Ensures secure from outsides and between members.";
const APPROVED = "The thing answers within one second, whatever the load.", LATER = "And it answers within a tenth of a second on Sundays.";

// philosophy.md is a file of cloud-brain-dev, read at the commit main records for it.
const dev = join(root, "cloud-brain-dev");
mkdirSync(dev);
sh(dev, "init", "-q", "-b", "main");
put(dev, "philosophy.md", `1. "${HIS_LINE}"\n`);
sh(dev, "add", "philosophy.md");
sh(dev, "commit", "-q", "-m", "philosophy");
sh(root, "init", "-q", "-b", "main");
put(root, ".gitignore", "cloud-brain-dev/\n");
put(root, RULES, `Tom, 2026-10-11: "Why do I need to even do it? ${HIS_RULE}"\n`);
put(root, BRIEF, "The brief, as the owner's install names it.\n");
put(root, TOOL, readFileSync(tool, "utf8"));
put(root, TEST, "the test\n");
for (const f of ["brain-core", "brain-topic", "brain-issues"]) put(root, `tools/cloud-brain/${f}.ojs`, f + "\n");
put(root, "plan/cloud-brain-issues-policy-v2.json", "{}\n");
put(root, SPEC, "# The thing\n");
sh(root, "add", ".gitignore", ".claude", "tools", "tests", "plan");
sh(root, "update-index", "--add", "--cacheinfo", `160000,${sh(dev, "rev-parse", "HEAD")},cloud-brain-dev`);
sh(root, "commit", "-q", "-m", "base");
const cSpec = commit(SPEC, `# The thing\n\n${APPROVED}\n`), cSpecLater = commit(SPEC, `# The thing\n\n${APPROVED}\n${LATER}\n`);
// The commits a submit names are on a branch of their own, so main keeps the brief and the tool of the install.
sh(root, "checkout", "-q", "-b", "side");
const touched = {
  core: commit("tools/cloud-brain/brain-core.ojs", "core 2\n"), topic: commit("tools/cloud-brain/brain-topic.ojs", "topic 2\n"), rules: commit(RULES, "rules 2\n"),
  brief: commit(BRIEF, "a looser brief\n"), tool: commit(TOOL, "// a looser tool\n"), test: commit(TEST, "a looser test\n"),
  policy: commit("plan/cloud-brain-issues-policy-v3.json", "{}\n"), seed: commit("tools/cloud-brain/brain-issues.ojs", "issues 2\n")
};
// A ref whose tree has no brief: main before task 2 lands.
sh(root, "checkout", "-q", "-b", "nobrief", "main");
sh(root, "rm", "-q", BRIEF);
sh(root, "commit", "-q", "-m", "no brief");
sh(root, "checkout", "-q", "main");
const git = gitOf(root, "main", tool), briefBlob = git.blob(BRIEF)!, toolBlob = git.blob(TOOL)!;

test("the repository of the test: main has the brief and the tool that runs, and the commits of a submit are read", () => {
  expect(briefBlob).toMatch(/^[0-9a-f]{40}$/);
  expect(git.self()).toBe(toolBlob);
  expect(git.files("", touched.core)).toEqual(["tools/cloud-brain/brain-core.ojs"]);
  expect(git.files("lopecode-dev", touched.rules)).toEqual([RULES]);
  expect(git.files("cloud-brain-dev", sh(dev, "rev-parse", "HEAD"))).toEqual(["cloud-brain-dev/philosophy.md"]);
  expect(git.files("", "0".repeat(40))).toBe(null);
  expect(git.files("no-such-repo", touched.core)).toBe(null);
  expect(git.philosophy()).toContain(HIS_LINE);
  expect(git.text("main", RULES)).toContain(HIS_RULE);
});

test("origin/main is fetched before it is read: a commit pushed since is seen, and an origin that is not reached is said", () => {
  const origin = realpathSync(mkdtempSync(join(tmpdir(), "approver-origin-"))), clone = realpathSync(mkdtempSync(join(tmpdir(), "approver-clone-")));
  try {
    sh(origin, "init", "-q", "-b", "main");
    put(origin, BRIEF, "one\n");
    sh(origin, "add", ".");
    sh(origin, "commit", "-q", "-m", "one");
    sh(clone, "clone", "-q", origin, ".");
    const g = gitOf(clone), one = g.blob(BRIEF);
    expect(g.main).toBe("origin/main");
    put(origin, BRIEF, "two\n");
    sh(origin, "commit", "-q", "-am", "two");
    expect(g.blob(BRIEF)).toBe(one);
    expect(g.fetch()).toBe(true);
    expect(g.blob(BRIEF)).not.toBe(one);
    expect(g.text("origin/main", BRIEF)).toBe("two\n");
    sh(clone, "remote", "set-url", "origin", join(origin, "gone"));
    expect(g.fetch()).toBe(false);
    // A ref that is no remote's is not fetched: the tests' own.
    expect(gitOf(clone, "main").fetch()).toBe(false);
  } finally { rmSync(origin, { recursive: true, force: true }); rmSync(clone, { recursive: true, force: true }); }
});

// ---- the record
const ID = "delegation:aaaaaaaaaaaa", HASH = { task: "T".repeat(64), project: "P".repeat(64) };
const by = (name: string, id: string) => ({ caller: "owner", via: `delegation:${id}`, holder: `secret:${name}`, tab: false });
const SESSION = { caller: "owner", via: "session", holder: "", tab: true };
const ORCH = by("orch-111111", "0000000000a1"), IMPL = by("impl-222222", "0000000000a2"), REV = by("rev-333333", "0000000000a3"), SPECW = by("spec-444444", "0000000000a4");
const APPR = by("appr-0a1b2c", "0000000000a5"), LOOP = { ...by("loop-approver", "aaaaaaaaaaaa") };
const UUID = (n: number) => `b70df59c-a451-4541-b551-${String(n).padStart(12, "0")}`;
const guardOf = (named: boolean) => (named ? `caller.present || caller.actor == "${ID}"` : "caller.present");
const policyEvent = (seq: number, { named = true, brief = briefBlob, pinned = toolBlob, reason }: any = {}) => ({
  seq, key: `policy/${seq}`, type: "policy", by: SESSION, at: seq * 1000, hashes: HASH,
  reason: reason ?? `Tom, 2026-10-12: "install it". approver brief ${brief} tool ${pinned}`,
  policy: { kinds: { task: "task", feature: "project" }, workflows: {
    task: { moves: [{ name: "start", from: "ready", to: "in-progress", guard: "true" }, { name: "approve", from: "awaiting-approval", to: "done", guard: guardOf(named) }] },
    project: { moves: [{ name: "approve", from: "awaiting-approval", to: "approved", guard: guardOf(named) }] } } }
});
// The same policy as issue.policy answers it.
const policyAnswer = (e: any) => ({ policy: { seq: e.seq, kinds: e.policy.kinds, names: e.hashes, reason: e.reason }, workflows: Object.fromEntries(Object.entries(e.hashes).map(([n, h]) => [h, e.policy.workflows[n]])) });

type World = {
  policy?: any; ref?: string | string[]; asked?: string[]; body?: string; verdictBy?: any; verdictKey?: string; brief?: string;
  specApprovedBy?: any; reviewBy?: any; extra?: (w: { push: (e: any) => any; s: Record<string, number> }) => void; state?: "in-review";
};
// A project the owner opened and approved, a task of it that was started, submitted and passed, and one verdict.
function world(o: World = {}) {
  const record: any[] = [], s: Record<string, number> = {};
  const push = (e: any) => { const seq = record.length + 1; record.push({ seq, key: e.key || `k${seq}`, at: seq * 1000, ...e }); return seq; };
  const ev = (id: string, type: string, who: any, more: any = {}) => push({ id, type, by: who, workflow: id === "proj" || id === "late" ? HASH.project : HASH.task, ...more });
  const move = (id: string, name: string, to: string, who: any, more: any = {}) => ev(id, "moved", who, { move: name, to, reason: "", refs: [], ...more });
  push(policyEvent(1, o.policy));
  s.wish = ev("proj", "opened", SESSION, { key: UUID(1), title: "The thing", body: "I would like the thing to answer within one second, please.", state: "open", parent: null });
  move("proj", "spec", "spec", SPECW);
  s.submitSpec = move("proj", "submit-spec", "spec-review", SPECW, { reason: `${SPEC}, the spec`, refs: [{ kind: "commit", value: cSpec }] });
  ev("proj", "reviewed", REV, { verdict: "pass", body: "pass" });
  move("proj", "to-approval", "awaiting-approval", REV);
  s.choice = ev("proj", "commented", ORCH, { body: "A: the thing answers within one second. B: within ten." });
  s.A = move("proj", "approve", "approved", o.specApprovedBy ?? SESSION, { key: UUID(2), reason: "A" });
  s.other = ev("other", "opened", SESSION, { key: UUID(3), title: "Another matter", body: "I would like the other thing painted green all over.", state: "open", parent: null });
  s.lateWish = ev("late", "opened", SESSION, { key: UUID(4), title: "Later", body: "I would like every Worker to deploy itself at midnight.", state: "open", parent: null });
  ev("task", "opened", ORCH, { title: "Task 1", body: "Task 1 of the spec.", state: "open", parent: "proj" });
  s.start = move("task", "start", "in-progress", IMPL);
  s.quoted = ev("task", "commented", ORCH, { body: 'The owner, 2026-10-12, in chat: "make the core answer within one second"' });
  s.link = ev("task", "linked", ORCH, { rel: "part-of", to: "late" });
  s.submit = move("task", "submit", "in-review", IMPL, { refs: [o.ref ?? `lopecode-dev@${touched.core}`].flat().map((value) => ({ kind: "commit", value })).concat([{ kind: "deploy", value: "brain-x-topic@abc" }] as any) });
  s.review = ev("task", "reviewed", o.reviewBy ?? REV, { verdict: "pass", body: "pass" });
  if (o.state !== "in-review") s.toApproval = move("task", "to-approval", "awaiting-approval", REV);
  o.extra?.({ push: (e) => ev(e.id || "task", e.type, e.by, e), s });
  const lines = o.asked ?? [`asked: ${s.wish} "the thing to answer within one second"`];
  s.verdict = ev("task", "commented", o.verdictBy ?? APPR, { key: o.verdictKey ?? "approver/task/verdict-1", body: o.body ?? ["approver: approve", "The core answers within one second, as the owner asked when he opened the project.", "Is it what he asked for: yes.", "Is it secure: yes.", ...lines, `brief ${o.brief ?? briefBlob}`].join("\n") });
  return { record, s, policy: policyAnswer(record[0]) };
}
const run = (o: World = {}, asked?: (s: Record<string, number>) => string[]) => {
  let w = world(o);
  if (asked) w = world({ ...o, asked: asked(w.s) });
  return { ...w, j: judge(w.record, w.policy, git, { id: "task", verdict: w.s.verdict }) };
};
const refused = (j: any, words: string | RegExp) => { expect(j.send).toBe(null); expect(j.exit).toBe(1); expect(j.why.join("\n")).toMatch(words); };

test("approve: a ref that touches brain-core.ojs is sent when the verdict has a true asked: line (R3: no kind is refused)", () => {
  const { j, s } = run();
  expect(j.why).toEqual([]);
  expect(j.exit).toBe(0);
  expect(j.delegation).toBe(ID);
  expect(j.asked).toEqual([{ where: String(s.wish), quote: "the thing to answer within one second", kind: 1, said: `on your words of event ${s.wish}` }]);
  expect(j.send).toEqual({ key: "approver/task/approve-1", id: "task", to: "done", refs: [], reason: `${"approver: approve\nThe core answers within one second, as the owner asked when he opened the project.\nIs it what he asked for: yes.\nIs it secure: yes.\n".slice(0, 200)}asked: ${s.wish} "the thing to answer within one second"\nbrief ${briefBlob}`.slice(0, 200) + `\nverdict ${s.verdict}, brief ${briefBlob}` });
  // The policy as a `policy` event of the record judges the same.
  const w = world();
  expect(policyOf(w.record[0])).toEqual(policyOf(w.policy));
  expect(judge(w.record, w.record[0], git, { id: "task", verdict: w.s.verdict }).exit).toBe(0);
});

test("approve: the four kinds of words, each read from where it is kept", () => {
  expect(run({}, (s) => [`asked: ${s.quoted} "make the core answer within one second"`]).j.asked[0]).toMatchObject({ kind: 4, said: expect.stringContaining("on words a session quoted at event") });
  expect(run({ asked: [`asked: rules.md "${HIS_RULE}"`] }).j.asked[0]).toMatchObject({ kind: 3, said: "on your words in rules.md" });
  expect(run({ asked: [`asked: philosophy.md "${HIS_LINE}"`] }).j.asked[0]).toMatchObject({ kind: 3, said: "on your words in philosophy.md" });
  expect(run({ asked: [`asked: ${SPEC} "${APPROVED}"`] }).j.asked[0]).toMatchObject({ kind: 2, said: "on the spec you approved" });
  // A short answer of his: the whole text of an event of his own, with the comment it answered.
  const short = run({}, (s) => [`asked: ${s.A} "A" answers ${s.choice}`]);
  expect(short.j.exit).toBe(0);
  expect(short.j.asked[0]).toMatchObject({ kind: 1, quote: "A" });
  // Twenty characters is long enough; nineteen is not (the next test).
  expect([..."answer within one se"].length).toBe(20);
  expect(run({}, (s) => [`asked: ${s.wish} "answer within one se"`]).j.exit).toBe(0);
  // Two lines: both are held, and both are answered.
  expect(run({}, (s) => [`asked: ${s.wish} "the thing to answer within one second"`, `asked: rules.md "${HIS_RULE}"`]).j.asked.map((a: any) => a.kind)).toEqual([1, 3]);
});

test("approve sends nothing (R3): the asked: line is absent, or its quotation is not where it says", () => {
  refused(run({ asked: [] }).j, /no line `asked:/);
  refused(run({ asked: ["asked: the owner said so"] }).j, /not read as asked:/);
  refused(run({}, (s) => [`asked: ${s.wish} "the thing to reply within one second"`]).j, /not in event \d+, letter for letter/);
  expect([..."answer within one s"].length).toBe(19);
  refused(run({}, (s) => [`asked: ${s.wish} "answer within one s"`]).j, /fewer than 20 characters is the whole text of an event of his own/);
  refused(run({}, (s) => [`asked: ${s.other} "the other thing painted green all over"`]).j, /is of other: not the issue, nor its parent/);
  refused(run({}, (s) => [`asked: ${s.lateWish} "every Worker to deploy itself at midnight"`]).j, /is of late: not the issue/);
  refused(run({ asked: ["asked: 99999 \"the thing to answer within one second\""] }).j, /event 99999 is not in the record read/);
  // Both lines are held: one true line does not carry a false one.
  refused(run({}, (s) => [`asked: ${s.wish} "the thing to answer within one second"`, `asked: ${s.other} "the other thing painted green all over"`]).j, /is of other/);
  // A short quotation: no `answers`, a comment that is not before it on its issue, an event that is no press of his.
  refused(run({}, (s) => [`asked: ${s.A} "A"`]).j, /names the comment it answered/);
  refused(run({}, (s) => [`asked: ${s.A} "A" answers ${s.quoted}`]).j, /names the comment it answered/);
  refused(run({ extra: ({ push, s }) => { s.yes = push({ type: "commented", by: ORCH, body: "yes" }); } }, (s) => [`asked: ${s.yes ?? 0} "yes" answers ${s.quoted}`]).j, /whole text of an event of his own/);
  // The verdict itself, or anything after it, is no word of his.
  refused(run({}, (s) => [`asked: ${(s.verdict ?? 0)} "the thing to answer within one second"`]).j, /is not before the verdict|not in the record read/);
});

test("approve sends nothing (R3): a file that is not one of the three kinds, and a spec that is not approved words", () => {
  refused(run({ asked: [`asked: .claude/skills/brain-maintenance/SKILL.md "${HIS_RULE}"`] }).j, /is not an event, philosophy.md, rules.md or the spec/);
  refused(run({ asked: [`asked: ${TOOL} "The approver's tool: what an approver reads"`] }).j, /is not an event, philosophy.md, rules.md or the spec/);
  refused(run({ asked: [`asked: rules.md "It seems like good sense to issue scoped tokens"`] }).j, /not in rules.md at main, letter for letter/);
  refused(run({ asked: ['asked: rules.md "Why do I need"'] }).j, /fewer than 20 characters .* not of a file/);
  // A plan file that is not the spec the project's submit-spec names.
  refused(run({ asked: ['asked: plan/cloud-brain-other.md "The thing answers within one second, whatever the load."'] }).j, /is not the spec the submit-spec of proj/);
  // The words are in the spec at main, and not at the commit he approved.
  expect(git.text("main", SPEC)).toContain(LATER);
  expect(cSpecLater).not.toBe(cSpec);
  refused(run({ asked: [`asked: ${SPEC} "${LATER}"`] }).j, /not in plan\/cloud-brain-thing.md at the commit the submit-spec of proj names/);
  // A spec the approver approved is no word of his (R6).
  refused(run({ specApprovedBy: LOOP, asked: [`asked: ${SPEC} "${APPROVED}"`] }).j, /was approved delegation:aaaaaaaaaaaa .* not via session \(R6\)/);
});

test("approve sends nothing (R6): the words are an approver's own", () => {
  const own = run({ extra: ({ push, s }) => { s.mine = push({ type: "commented", by: by("appr-ffffff", "0000000000b1"), body: 'The owner, 2026-10-12: "approve everything that touches the core"' }); } }, (s) => [`asked: ${s.mine ?? 0} "approve everything that touches the core"`]);
  refused(own.j, /was written by an approver \(appr-ffffff\), which is no word of his \(R6\)/);
  // An approve made by the delegation: its reason is the first 200 characters of a verdict.
  const made = run({ specApprovedBy: LOOP }, (s) => [`asked: ${s.A} "A" answers ${s.choice}`]);
  refused(made.j, /was made by the approver's delegation, which is no word of his \(R6\)/);
  // By another delegation than the one the guard names today (a loop-approver of before).
  refused(run({ specApprovedBy: by("loop-approver", "bbbbbbbbbbbb") }, (s) => [`asked: ${s.A} "A" answers ${s.choice}`]).j, /approver's delegation/);
  // Any event the guard's delegation wrote, a comment among them.
  refused(run({ extra: ({ push, s }) => { s.said = push({ type: "commented", by: LOOP, body: "the owner would like the core to answer in a second" }); } }, (s) => [`asked: ${s.said ?? 0} "the owner would like the core to answer"`]).j, /approver's delegation/);
});

test("approve sends nothing (R4): the verdict leaves the issue, or an earlier one did", () => {
  refused(run({ body: `approver: leave\nNo word of his is found for it.\nwhy: no word of his\nbrief ${briefBlob}` }).j, /does not begin `approver: approve`/);
  const earlier = run({ extra: ({ push }) => { push({ type: "commented", by: by("appr-eeeeee", "0000000000b2"), key: "approver/task/verdict-0", body: "approver: leave\nThe change is more than the words." }); } });
  refused(earlier.j, /was left to the owner \(`approver: leave`, event \d+\): he approves it or nobody does \(R4\)/);
  expect(earlier.j.why.length).toBe(1);
});

test("approve sends nothing (R5): the verdict's holder worked on the issue, or is no appr- token", () => {
  refused(run({ verdictBy: IMPL }).j, /holder is secret:impl-222222, not an appr- token \(R5\)[\s\S]*made the start of event/);
  refused(run({ verdictBy: REV }).j, /made the review of event/);
  refused(run({ verdictBy: SESSION }).j, /holder is no token, not an appr- token/);
  refused(run({ verdictBy: by("appr-0a1b2", "0000000000a5") }).j, /not an appr- token/);
  // An appr- token that reviewed the issue is not independent of it.
  const reviewer = run({ reviewBy: APPR });
  refused(reviewer.j, /made the review of event/);
  expect(reviewer.j.why.length).toBe(1);
});

test("approve sends nothing (R7): a ref that touches one of the approver's own five files, each a case", () => {
  for (const [name, file] of [["brief", BRIEF], ["tool", TOOL], ["test", TEST], ["policy", "plan/cloud-brain-issues-policy-v3.json"], ["seed", "tools/cloud-brain/brain-issues.ojs"]] as const) {
    const { j } = run({ ref: `lopecode-dev@${touched[name]}` });
    refused(j, new RegExp(`touches ${file.replaceAll(".", "\\.")}: the approver does not approve a change to itself \\(R7\\)`));
    expect(j.why.length).toBe(1);
    expect(own(file)).toBe(true);
  }
  // One of two refs is enough, and a ref in another spelling the record has.
  refused(run({ ref: [`lopecode-dev@${touched.core}`, `lopecode-dev ${touched.tool}`] }).j, /touches tools\/cloud-brain\/approver.ts/);
  refused(run({ ref: touched.brief.slice(0, 8) }).j, /touches .*agents\/approver.md/);
  // rules.md is not one of them: a change to it is judged as anything is.
  expect(run({ ref: `lopecode-dev@${touched.rules}` }).j.exit).toBe(0);
});

test("approve sends nothing (R7): the brief or the tool is not the one the installed policy names", () => {
  const other = "1".repeat(40);
  refused(run({ brief: other }).j, /the verdict ends brief 1{40}, and the policy names the brief/);
  refused(run({ body: 'approver: approve\nasked: 2 "the thing to answer within one second"' }).j, /the verdict ends with no `brief <blob>`/);
  // The install names another brief than main has: a verdict formed from either makes no move.
  const stale = run({ policy: { brief: other }, brief: other });
  refused(stale.j, /agents\/approver.md at main is [0-9a-f]{40}, and the policy names 1{40} \(R7\)/);
  expect(stale.j.why.length).toBe(1);
  const tool2 = run({ policy: { pinned: other } });
  refused(tool2.j, /tools\/cloud-brain\/approver.ts at main is [0-9a-f]{40}, and the policy names 1{40}[\s\S]*the tool that runs is [0-9a-f]{40}/);
  expect(tool2.j.why.length).toBe(2);
  // The file that runs is another than main's: a checkout behind, or a tool changed in place.
  const w = world();
  refused(judge(w.record, w.policy, { ...git, self: () => other }, { id: "task", verdict: w.s.verdict }), /the tool that runs is 1{40}/);
  refused(run({ policy: { reason: 'Tom, 2026-10-12: "install it"' } }).j, /does not end `approver brief <blob> tool <blob>` \(R7\)/);
});

test("approve sends nothing, exit 3: the approve guard names no delegation, whatever the verdict", () => {
  const { j } = run({ policy: { named: false } });
  expect(j.exit).toBe(3);
  expect(j.send).toBe(null);
  expect(j.why).toEqual(["the approve guard of the policy in force (event 1) names no delegation (caller.present): nothing is sent until the owner installs one that does"]);
});

test("approve sends nothing: a ref that is not in the checkout, no commit ref, another state, another round's key", () => {
  refused(run({ ref: "lopecode-dev@" + "0".repeat(40) }).j, /the ref lopecode-dev@0{40} is not a commit the checkout has/);
  refused(run({ ref: `lopebooks@${touched.core}` }).j, /the ref lopebooks@[0-9a-f]{40} is not a commit the checkout has/);
  refused(run({ ref: "not a commit" }).j, /is not a commit the checkout has/);
  refused(run({ ref: [] }).j, /no submit with a commit ref to read/);
  refused(run({ state: "in-review" }).j, /the issue is at in-review, not awaiting-approval/);
  refused(run({ verdictKey: "approver/task/verdict-2" }).j, /key is approver\/task\/verdict-2, not approver\/task\/verdict-1/);
  refused(run({ verdictKey: "impl/task/comment-1" }).j, /not approver\/task\/verdict-1/);
  const w = world();
  refused(judge(w.record, w.policy, git, { id: "task", verdict: w.s.review }), /event \d+ is not a comment of task/);
  refused(judge(w.record, w.policy, git, { id: "task", verdict: w.s.choice }), /event \d+ is not a comment of task/);
  refused(judge(w.record, w.policy, git, { id: "nothing", verdict: w.s.verdict }), /no issue nothing is in the record read/);
  // A verdict of the round before a send-back does not approve the next round.
  const again = world();
  const n = again.record.length;
  for (const [move, to, who] of [["rework", "in-progress", REV], ["submit", "in-review", IMPL], ["to-approval", "awaiting-approval", REV]] as const) again.record.push({ seq: again.record.length + 1, key: `again-${move}`, id: "task", type: "moved", move, to, by: who, workflow: HASH.task, at: 0, refs: [{ kind: "commit", value: touched.core }] });
  expect(again.record.length).toBe(n + 3);
  refused(judge(again.record, again.policy, git, { id: "task", verdict: again.s.verdict }), /key is approver\/task\/verdict-1, not approver\/task\/verdict-2[\s\S]*from before the last move to awaiting-approval/);
});

test("a project at awaiting-approval is approved to `approved`, on the words he opened it with", () => {
  const w = world();
  const record = w.record.filter((e: any) => e.seq < w.s.A);
  const seq = record.length + 1;
  record.push({ seq, key: "approver/proj/verdict-1", id: "proj", type: "commented", by: APPR, workflow: HASH.project, at: 0, body: `approver: approve\nThe spec is the thing he asked for.\nasked: ${w.s.wish} "the thing to answer within one second"\nbrief ${briefBlob}` });
  const j = judge(record, w.policy, git, { id: "proj", verdict: seq });
  expect(j.why).toEqual([]);
  expect(j.send).toMatchObject({ key: "approver/proj/approve-1", id: "proj", to: "approved" });
  // The spec under judgment is not approved words: its own file is refused.
  record[seq - 1] = { ...record[seq - 1], body: `approver: approve\nasked: ${SPEC} "${APPROVED}"\nbrief ${briefBlob}` };
  refused(judge(record, w.policy, git, { id: "proj", verdict: seq }), /neither the issue's parent nor that one's parent has an approved spec/);
});

test("facts: a commit that touches rules.md and one that touches brain-core.ojs are marked, one that touches brain-topic.ojs is not", () => {
  const w = world({ ref: [`lopecode-dev@${touched.rules}`, `lopecode-dev@${touched.core}`, `lopecode-dev@${touched.topic}`, `lopecode-dev@${touched.tool}`, `lopecode-dev@${"0".repeat(40)}`] });
  const f = facts(w.record, git, "task");
  expect(f).toMatchObject({ state: "awaiting-approval", round: 1, verdictKey: "approver/task/verdict-1", family: ["proj"], submit: w.s.submit, review: w.s.review, verdicts: [w.s.verdict], left: [] });
  expect(f.refs.map((r: any) => r.files)).toEqual([
    [{ file: RULES, marks: ["rules"] }], [{ file: "tools/cloud-brain/brain-core.ojs", marks: ["never"] }], [{ file: "tools/cloud-brain/brain-topic.ojs", marks: [] }],
    [{ file: TOOL, marks: ["approver"] }], null, null
  ]);
  const text = factsText(f);
  expect(text[0]).toBe("task: at awaiting-approval, round 1; the verdict's key is approver/task/verdict-1");
  expect(text).toContain(`  [rules]    ${RULES}`);
  expect(text).toContain("  [never]    tools/cloud-brain/brain-core.ojs");
  expect(text).toContain("             tools/cloud-brain/brain-topic.ojs");
  expect(text).toContain(`commit lopecode-dev@${"0".repeat(40)}: not a commit the checkout has`);
  expect(text).toContain("deploy brain-x-topic@abc");
  expect(factsText(facts(w.record, git, "nothing"))).toEqual(["no issue nothing is in the record read"]);
  // The marks, by path.
  for (const f of ["tools/cloud-brain/brain-kernel.ojs", "tools/cloud-brain/brain-db.ojs", "tools/cloud-brain/brain-deployer.ojs", "tools/cloud-brain/cloudflare-iac.ojs", "lopecode", "lopecode-plugin", "lopebooks/notebooks/@tomlarkworthy_exporter-3.html", "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"]) expect(marks(f)).toEqual(["never"]);
  expect(marks("cloud-brain-dev/philosophy.md")).toEqual(["rules"]);
  expect(marks("tools/cloud-brain/brain-issues.ojs")).toEqual(["policy"]);
  expect(marks("plan/cloud-brain-issues-policy-v3.json")).toEqual(["policy"]);
  expect(marks(BRIEF)).toEqual(["approver"]);
  expect(marks("tools/cloud-brain/brain-static.ojs")).toEqual([]);
  expect(marks("lopebooks")).toEqual([]);
  // A guard added to the issue, and an earlier leave, are in what the approver reads.
  const left = world({ extra: ({ push }) => { push({ type: "commented", by: APPR, body: "approver: leave" }); push({ type: "narrowed", by: APPR, move: "approve", guard: "caller.present" }); } });
  const lf = facts(left.record, git, "task");
  expect(lf.left.length).toBe(1);
  expect(lf.extra).toEqual([{ n: lf.left[0] + 1, move: "approve", guard: "caller.present" }]);
  expect(factsText(lf).join("\n")).toMatch(/left to the owner at \d+\nguard added to approve \(event \d+\): caller.present/);
});

// An approve by the delegation, as `approve` would have sent it, and the cost event of the run.
const approved = (w: ReturnType<typeof world>, o: { reason?: string; who?: any; cost?: any } = {}) => {
  const j = judge(w.record, w.policy, git, { id: "task", verdict: w.s.verdict }), push = (e: any) => { w.record.push({ seq: w.record.length + 1, key: `k${w.record.length + 1}`, at: (w.record.length + 1) * 1000, id: "task", workflow: HASH.task, ...e }); return w.record.length; };
  const seq = push({ type: "moved", move: "approve", to: "done", by: o.who ?? LOOP, key: "approver/task/approve-1", reason: o.reason ?? j.send?.reason ?? `approver: approve\nverdict ${w.s.verdict}, brief ${briefBlob}`, refs: [] });
  if (o.cost !== null) push({ type: "cost", role: "approver", round: 1, token: "appr-0a1b2c", by: ORCH, ...o.cost });
  return seq;
};

test("a swap: an issue the migrate of an install moved is judged on the workflow the swap names, before any later event of it", () => {
  // As issue.install writes it (brain-issues.ojs, issueEvent): the policy event, then one `swapped` event an open issue.
  // The event's own `workflow` is the one the issue leaves; the one it is on from then is `to.workflow`.
  const NEW = "N".repeat(64), w = world(), n = w.record.length;
  const install = { ...policyEvent(n + 1), hashes: { ...HASH, task: NEW } };
  w.record.push(install);
  // Not yet swapped: the issue is on a workflow the policy in force no longer has, and nothing is sent.
  expect(policyOf(install).workflows[HASH.task]).toBe(undefined);
  expect(judge(w.record, install, git, { id: "task", verdict: w.s.verdict }).exit).toBe(3);
  w.record.push({ seq: n + 2, key: `policy/${n + 1}/task`, id: "task", type: "swapped", workflow: HASH.task, swap: null, policy: n + 1, from: { workflow: HASH.task, state: "awaiting-approval" }, to: { workflow: NEW, state: "awaiting-approval" }, reason: "", by: SESSION, at: (n + 2) * 1000 });
  const j = judge(w.record, install, git, { id: "task", verdict: w.s.verdict });
  expect(j.why).toEqual([]);
  expect(j.exit).toBe(0);
  expect(j.send).toMatchObject({ key: "approver/task/approve-1", id: "task", to: "done" });
  expect(issueAt(w.record, "task")).toMatchObject({ workflow: NEW, state: "awaiting-approval", rounds: 1 });
  // As the issue stood before the swap, which is what `check` reads of an approve made before it.
  expect(issueAt(w.record, "task", n + 2).workflow).toBe(HASH.task);
  // The same policy as issue.policy answers it.
  expect(judge(w.record, policyAnswer(install), git, { id: "task", verdict: w.s.verdict }).exit).toBe(0);
  // The swap is no move to awaiting-approval: the round and the verdict's key are as before it.
  expect(facts(w.record, git, "task")).toMatchObject({ state: "awaiting-approval", round: 1, verdictKey: "approver/task/verdict-1" });
  // A swap that lands in another state is read for its state, as before.
  const moved = world();
  moved.record.push({ seq: moved.record.length + 1, key: "k", id: "task", type: "swapped", workflow: HASH.task, swap: "escalate", from: { workflow: HASH.task, state: "awaiting-approval" }, to: { workflow: HASH.task, state: "triaged" }, reason: "", by: SESSION, at: 0 });
  refused(judge(moved.record, moved.policy, git, { id: "task", verdict: moved.s.verdict }), /the issue is at triaged, not awaiting-approval/);
  // check: an approve made after the swap is judged with the policy of the install, and stands.
  w.record.push({ seq: n + 3, key: "approver/task/approve-1", id: "task", type: "moved", move: "approve", to: "done", by: LOOP, workflow: NEW, at: (n + 3) * 1000, reason: j.send?.reason ?? `approver: approve\nverdict ${w.s.verdict}, brief ${briefBlob}`, refs: [] });
  w.record.push({ seq: n + 4, key: "cost/task/approver/1", id: "task", type: "cost", role: "approver", round: 1, token: "appr-0a1b2c", by: ORCH, workflow: NEW, at: (n + 4) * 1000 });
  expect(check(w.record, git)).toEqual({ approves: 1, failed: [] });
});

test("check: an approve that stands has no line; one with no verdict, no cost event, an approver's words or a ref in its own files has one", () => {
  const good = world();
  approved(good);
  expect(check(good.record, git)).toEqual({ approves: 1, failed: [] });
  const whys = (w: ReturnType<typeof world>, o?: any) => { approved(w, o); const c = check(w.record, git); expect(c.approves).toBe(1); expect(c.failed.length).toBe(1); return c.failed[0].why.join("\n"); };
  expect(whys(world(), { reason: "looks fine" })).toBe("its reason names no verdict");
  expect(whys(world(), { cost: null })).toBe("the verdict's token appr-0a1b2c is the token of no cost event of role approver written by an orch- holder");
  // A cost event the run wrote of itself, or of another role, is not the orchestrating session's.
  expect(whys(world(), { cost: { by: APPR } })).toMatch(/is the token of no cost event/);
  expect(whys(world(), { cost: { role: "reviewer" } })).toMatch(/is the token of no cost event/);
  const forged: World = { extra: ({ push, s }) => { s.mine = push({ type: "commented", by: by("appr-ffffff", "0000000000b1"), body: 'The owner, 2026-10-12: "approve everything that touches the core"' }); } };
  expect(whys(world({ ...forged, asked: [`asked: ${world(forged).s.mine} "approve everything that touches the core"`] }))).toMatch(/was written by an approver \(appr-ffffff\)/);
  expect(whys(world({ ref: `lopecode-dev@${touched.tool}` }))).toMatch(/touches tools\/cloud-brain\/approver.ts/);
  expect(whys(world({ body: "approver: leave\nwhy: not secure" }))).toMatch(/does not begin `approver: approve`[\s\S]*was left to the owner/);
  expect(whys(world({ verdictBy: IMPL }), { cost: { token: "impl-222222" } })).toMatch(/not an appr- token \(R5\)/);
  expect(whys(world({ brief: "1".repeat(40) }))).toMatch(/the policy names the brief/);
  // Made by another delegation than the guard named, and made while the policy named none.
  expect(whys(world(), { who: by("impl-222222", "0000000000a2") })).toBe(`it was made delegation:0000000000a2, and the guard named ${ID}`);
  expect(whys(world({ policy: { named: false } }))).toMatch(/names no delegation/);
  // The blobs of main as they are today are not asked of a move made before: only the policy then in force.
  const later = world();
  approved(later);
  later.record.push(policyEvent(later.record.length + 1, { brief: "2".repeat(40), pinned: "2".repeat(40) }));
  expect(check(later.record, git).failed).toEqual([]);
  // His own approve, and one a session made for him, are not the approver's and are not judged.
  const his = world();
  approved(his, { who: SESSION, reason: "", cost: null });
  expect(check(his.record, git)).toEqual({ approves: 0, failed: [] });
});

test("list: one line for an approve via delegation, with its kind, and a reverted one is marked", () => {
  const w = world();
  const seq = approved(w);
  const rows = list(w.record, git);
  expect(rows).toEqual([{ seq, id: "task", at: seq * 1000, verdict: w.s.verdict, on: `on your words of event ${w.s.wish}`, sentence: "The core answers within one second, as the owner asked when he opened the project.", reverted: false }]);
  expect(listText(rows)).toEqual([`1970-01-01 ${String(new Date(seq * 1000).getHours()).padStart(2, "0")}:00  task  on your words of event ${w.s.wish}  The core answers within one second, as the owner asked when he opened the project.`]);
  expect(list(w.record, git, { since: seq * 1000 + 1 })).toEqual([]);
  w.record.push({ seq: w.record.length + 1, key: UUID(9), id: "task", type: "moved", move: "revert", to: "reverted", by: SESSION, at: 0 });
  expect(list(w.record, git)[0].reverted).toBe(true);
  expect(listText(list(w.record, git))[0]).toContain("  reverted  ");
  // Words a session quoted are said apart from his own events; a spec, and a file, each by name.
  const quoted = world();
  const q = world({ asked: [`asked: ${quoted.s.quoted} "make the core answer within one second"`] });
  approved(q);
  expect(list(q.record, git)[0].on).toBe(`on words a session quoted at event ${q.s.quoted}`);
  const spec = world({ asked: [`asked: ${SPEC} "${APPROVED}"`] });
  approved(spec);
  expect(list(spec.record, git)[0].on).toBe("on the spec you approved");
  // His press and a session's move for him are in no line.
  const his = world();
  approved(his, { who: SESSION, cost: null });
  expect(list(his.record, git)).toEqual([]);
});

test("trial: the verdicts in the open, counted by what followed and by whose words; a test- issue's are apart", () => {
  const w = world();
  const add = (id: string, n: number, body: string, more: any = {}) => w.record.push({ seq: w.record.length + 1, key: `approver/${id}/verdict-${n}`, id, type: "commented", by: APPR, at: 0, body, ...more });
  const moved = (id: string, move: string, who: any = SESSION) => w.record.push({ seq: w.record.length + 1, key: UUID(w.record.length), id, type: "moved", move, to: "x", by: who, at: 0 });
  moved("task", "approve");
  add("task", 2, `approver: approve\nSecond.\nasked: rules.md "${HIS_RULE}"`);
  moved("task", "revert");
  add("b", 1, `approver: approve\nThird.\nasked: ${w.s.other} "the other thing painted green all over"`);
  add("task", 4, `approver: approve\nFourth.\nasked: ${w.s.quoted} "make the core answer within one second"`);
  // An approve the delegation made is not his.
  moved("task", "approve", LOOP);
  add("d", 1, "approver: leave\nNo word.\nwhy: no word of his");
  add("e", 1, "approver: leave\nMore.\nwhy: more than the words");
  add("f", 1, "approver: leave\nA secret is sent.\nwhy: not secure");
  add("g", 1, "approver: leave\nI cannot tell.\nwhy: could not tell");
  add("h", 1, "approver: leave\nThe review names something not tried.\nwhy: the review names something not tried");
  add("i", 1, "approver: leave\nNo reason line.");
  add("test-approver-1", 1, "approver: leave\nwhy: no word of his");
  add("test-approver-2", 1, "approver: approve\nWrong.");
  add("task", 3, "approver: approve", { hidden: true });
  w.record.push({ seq: w.record.length + 1, key: "orch/task/note", id: "task", type: "commented", by: ORCH, at: 0, body: "approver: approve, says the orchestrator" });
  const t = trial(w.record, git);
  expect(t).toMatchObject({
    verdicts: 10, approve: 4, leave: 6, neither: 0, approved: 0, undone: 2, waiting: 2,
    kinds: { event: 1, spec: 0, file: 1, quoted: 1, none: 1 },
    whys: { "no word of his": 1, "more than the words": 1, "not secure": 1, "could not tell": 1, other: 2 },
    made: { verdicts: 2, approve: 1, leave: 1 }
  });
  const text = trialText(t);
  expect(text.slice(0, 5)).toEqual([
    "verdicts 10   approve 4   leave 6",
    "of approve:   he approved 0   he sent back, rejected or reverted 2   still waiting 2",
    "of approve:   on an event of his 1   on a spec he approved 0   on his words in a file 1   on words a session quoted 1   on no words the tool finds 1",
    "of leave:     no word of his 1   more than the words 1   not secure 1   could not tell 1   other 2",
    "made issues (test-): verdicts 2   approve 1   leave 1"
  ]);
  expect(text.length).toBe(15);
  expect(text[5]).toBe(`${w.s.verdict}  task  approver: approve`);
  // He approved it, and nothing undid it.
  const yes = world();
  yes.record.push({ seq: yes.record.length + 1, key: UUID(1), id: "task", type: "moved", move: "approve", to: "done", by: SESSION, at: 0 });
  expect(trial(yes.record, git)).toMatchObject({ verdicts: 1, approve: 1, approved: 1, undone: 0, waiting: 0 });
  expect(trialText(trial([], git))[0]).toBe("verdicts 0   approve 0   leave 0");
});

// ---- the tool as it is run: the reads through issue-as.sh, the two sends with loop-approver
const VALUE = { appr: "value-of-the-run-7f3a", loop: "value-of-loop-approver-9c1d" };
let served: { record: any[]; policy: any; refuse?: number; idHolder?: string; again?: boolean; heldByOther?: number } = { record: [], policy: {} }, calls: { method: string; bearer: string; body: any }[] = [];
const server = Bun.serve({ port: 0, hostname: "127.0.0.1", async fetch(req) {
  const url = new URL(req.url), method = url.pathname.replace("/xrpc/com.lopecode.brain.issue.", ""), bearer = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const body = req.method === "POST" ? await req.json() : null;
  calls.push({ method, bearer, body });
  if (served.refuse && req.method === "POST") return Response.json({ error: "AuthRequired", message: "unknown token" }, { status: served.refuse });
  if (method === "sync") { const after = Number(url.searchParams.get("after") || 0), limit = Number(url.searchParams.get("limit") || 200); return Response.json({ events: served.record.filter((e) => e.seq > after).slice(0, limit) }); }
  if (method === "policy") return Response.json(served.policy);
  // A key another actor holds: its place and no more (brain-issues.ojs, `wrote`).
  if (method === "move" && served.heldByOther) return Response.json({ id: body.id, seq: served.heldByOther, duplicate: true });
  if (method === "move") return Response.json({ id: body.id, seq: 9001, ...(served.again ? { duplicate: true } : {}), event: { seq: 9001, ...body, type: "moved", by: LOOP } });
  // A key another delegation holds answers no event.
  if (method === "comment") return Response.json(body.key === "approver/id" && served.idHolder ? { id: body.id, seq: 7, duplicate: true } : { id: body.id, seq: 9002, event: { seq: 9002, ...body, type: "commented", by: LOOP } });
  return Response.json({ error: "NotFound" }, { status: 404 });
} });
afterAll(() => server.stop(true));

const state = join(root, "state");
mkdirSync(state);
const keep = (loop = true) => { writeFileSync(join(state, "cb4-agent-tokens.json"), JSON.stringify({ "appr-0a1b2c": VALUE.appr })); writeFileSync(join(state, "cb4-tokens.json"), JSON.stringify(loop ? { "loop-approver": VALUE.loop, other: "x" } : { other: "x" })); };
const cli = async (args: string[], env: Record<string, string> = {}) => {
  const p = Bun.spawn(["bun", tool, ...args], { env: { ...process.env, APPROVER_ROOT: root, APPROVER_MAIN: "main", BRAIN_STATE_DIR: state, ISSUE_AS_BASE: `http://127.0.0.1:${server.port}`, ISSUE_AS: resolve(dirname(tool), "issue-as.sh"), ...env }, stdout: "pipe", stderr: "pipe", timeout: 30000 });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
  return { code: await p.exited, out, err, all: out + err };
};
const serve = (w: ReturnType<typeof world>) => { served = { record: w.record, policy: w.policy }; calls = []; keep(); };
const sends = () => calls.filter((c) => c.body);

test("brief: the file as main has it, then `brief <blob>`; exit 1 when main has none", async () => {
  const r = await cli(["brief"]);
  expect(r.code).toBe(0);
  expect(r.out).toBe(`The brief, as the owner's install names it.\nbrief ${briefBlob}\n`);
  const bare = await cli(["brief"], { APPROVER_MAIN: "nobrief" });
  expect(bare.code).toBe(1);
  expect(bare.err).toContain("has no .claude/skills/brain-maintenance/agents/approver.md");
  expect(bare.out).toBe("");
  // origin/main, when origin is not reached (the test's repository has no origin): nothing is printed.
  const unreached = await cli(["brief"], { APPROVER_MAIN: "" });
  expect([unreached.code, unreached.out]).toEqual([2, ""]);
  expect(unreached.err).toContain("origin/main was not fetched");
});

test("approve, run: the reads are the run's own token, the one move is loop-approver's, and no value is printed", async () => {
  const w = world();
  serve(w);
  const r = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c"]);
  expect(r.all).toContain(`approved task: event 9001, to done, on your words of event ${w.s.wish}`);
  expect(r.code).toBe(0);
  expect(calls.map((c) => [c.method, c.bearer])).toEqual([["policy", VALUE.appr], ["sync", VALUE.appr], ["move", VALUE.loop]]);
  expect(sends().map((c) => c.body)).toEqual([judge(w.record, w.policy, git, { id: "task", verdict: w.s.verdict }).send]);
  expect(r.all).not.toContain(VALUE.loop);
  expect(r.all).not.toContain(VALUE.appr);
  // The same key answered as kept already (two runs at once): said, and exit 0.
  serve(w);
  served.again = true;
  const twice = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c"]);
  expect([twice.code, twice.out]).toEqual([0, `approved task: event 9001 (sent before; nothing new was written), to done, on your words of event ${w.s.wish}\n`]);
});

test("approve, run: a key another actor holds already is exit 4 and is not said to be approved", async () => {
  const w = world();
  serve(w);
  served.heldByOther = 41;
  const r = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c"]);
  expect(calls.map((c) => c.method)).toEqual(["policy", "sync", "move"]);
  expect(r.all).not.toContain("approved task");
  expect([r.code, r.out]).toEqual([4, ""]);
  expect(r.err).toContain("no approve was made for task: the key approver/task/approve-1 is kept already as event 41, which another actor wrote");
  expect(r.all).not.toContain(VALUE.loop);
  // With --json what was judged and the tracker's answer are printed, and the exit is the same.
  serve(w);
  served.heldByOther = 41;
  const asJson = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c", "--json"]);
  expect(asJson.code).toBe(4);
  expect(JSON.parse(asJson.out)).toMatchObject({ exit: 0, send: { key: "approver/task/approve-1" }, answer: { id: "task", seq: 41, duplicate: true } });
});

test("list --since: hours that are not a number above 0 are exit 2, and nothing is read or listed", async () => {
  const w = world();
  serve(w);
  approved(w);
  writeFileSync(join(state, "since.json"), JSON.stringify(w.record));
  const from = ["--record", join(state, "since.json")], line = `task  on your words of event ${w.s.wish}  The core answers`;
  for (const [args, said] of [[["--since=abc"], '"abc"'], [["--since=-1"], '"-1"'], [["--since=0"], '"0"'], [["--since="], '""'], [["--since", "abc"], '"abc"'], [["--since=Infinity"], '"Infinity"'], [["--since=1h"], '"1h"'], [["--since=1e2"], '"1e2"'], [["--since=" + "9".repeat(400)], '"' + "9".repeat(400) + '"']] as const) {
    const r = await cli(["list", ...args, ...from]);
    expect([args, r.code, r.out]).toEqual([args, 2, ""]);
    expect(r.err).toContain(`the hours of --since were not read (${said}); nothing was listed`);
  }
  // --since with nothing after it, and with another flag after it.
  for (const args of [[...from, "--since"], ["--since", ...from], ["--since", "--json", ...from]]) {
    const r = await cli(["list", ...args]);
    expect([args, r.code, r.out]).toEqual([args, 2, ""]);
    expect(r.err).toContain("the hours of --since were not read");
  }
  // Refused before the record is read: no call with the run's token.
  expect((await cli(["list", "--since=abc", "--token", "appr-0a1b2c"])).code).toBe(2);
  expect(calls).toEqual([]);
  // Hours that are read: the approve of the record is from 1970, so it is in no span, and in the list with none.
  for (const args of [["--since=1"], ["--since", "1"], ["--since=0.5"], ["--since=100000"]]) {
    const r = await cli(["list", ...args, ...from]);
    expect([args, r.code, r.out, r.err]).toEqual([args, 0, "", ""]);
  }
  expect((await cli(["list", ...from])).out).toContain(line);
  // Hours that reach back past it list it.
  w.record.at(-2).at = Date.now() - 2 * 3600e3;
  writeFileSync(join(state, "since.json"), JSON.stringify(w.record));
  expect((await cli(["list", "--since=3", ...from])).out).toContain(line);
  expect((await cli(["list", "--since=1", ...from])).out).toBe("");
});

test("approve, run: exit 3 and nothing sent while no approve guard names a delegation; exit 1 with each reason; exit 2 with no token", async () => {
  const before = world({ policy: { named: false } });
  serve(before);
  const r = await cli(["approve", "task", String(before.s.verdict), "--token", "appr-0a1b2c"]);
  expect(r.code).toBe(3);
  expect(r.err).toContain("no approve guard of the policy in force (event 1) names a delegation; nothing was sent");
  // The policy is read and nothing else: not the record, and no move.
  expect(calls.map((c) => c.method)).toEqual(["policy"]);

  const bad = world({ ref: `lopecode-dev@${touched.tool}`, asked: [] });
  serve(bad);
  const no = await cli(["approve", "task", String(bad.s.verdict), "--token", "appr-0a1b2c"]);
  expect(no.code).toBe(1);
  expect(no.err).toContain("no move was sent for task");
  expect(no.err).toContain("the approver does not approve a change to itself (R7)");
  expect(no.err).toContain("the verdict has no line `asked:");
  expect(sends()).toEqual([]);

  const usage = await cli(["approve", "task", String(bad.s.verdict)]);
  expect(usage.code).toBe(2);
  expect(usage.err).toContain("no --token; nothing was sent");
  const unknown = await cli(["approve", "task", String(bad.s.verdict), "--token", "appr-nobody"]);
  expect(unknown.code).toBe(2);
  expect((await cli(["approve", "task"])).code).toBe(2);
  expect((await cli([])).code).toBe(2);
  // A good verdict, and origin not reached: the blobs of origin/main cannot be read, so nothing is sent.
  const good = world();
  serve(good);
  const unreached = await cli(["approve", "task", String(good.s.verdict), "--token", "appr-0a1b2c"], { APPROVER_MAIN: "" });
  expect(unreached.code).toBe(2);
  expect(unreached.err).toContain("origin/main was not fetched; nothing was sent");
  expect(sends()).toEqual([]);
});

test("R8, ending all of it: with loop-approver gone from the kept tokens no move is sent, and a value the tracker refuses is exit 4", async () => {
  const w = world();
  serve(w);
  keep(false);
  const gone = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c"]);
  expect(gone.code).toBe(2);
  expect(gone.err).toContain("no token loop-approver is kept; nothing was sent");
  expect(sends()).toEqual([]);
  // The value is still in a file (another checkout's) and the tracker no longer takes it: what a revoke leaves.
  serve(w);
  served.refuse = 401;
  const refusedMove = await cli(["approve", "task", String(w.s.verdict), "--token", "appr-0a1b2c"]);
  expect(refusedMove.code).toBe(4);
  expect(refusedMove.err).toContain('the tracker refused the move: 401 {"error":"AuthRequired","message":"unknown token"}');
  expect(refusedMove.all).not.toContain(VALUE.loop);
});

test("approve from files sends nothing: it prints the move it would send", async () => {
  const w = world();
  serve(w);
  writeFileSync(join(state, "record.json"), JSON.stringify(w.record));
  writeFileSync(join(state, "policy.json"), JSON.stringify(w.policy));
  const r = await cli(["approve", "task", String(w.s.verdict), "--record", join(state, "record.json"), "--policy", join(state, "policy.json")]);
  expect(r.code).toBe(0);
  expect(r.out).toContain('not sent (read from a file): {"key":"approver/task/approve-1","id":"task","to":"done"');
  expect(calls).toEqual([]);
  // The reading commands, from the same file.
  const f = await cli(["facts", "task", "--record", join(state, "record.json")]);
  expect(f.out).toContain("task: at awaiting-approval, round 1");
  expect(f.out).toContain("  [never]    tools/cloud-brain/brain-core.ojs");
  expect((await cli(["facts", "nothing", "--record", join(state, "record.json")])).code).toBe(1);
  approved(w);
  writeFileSync(join(state, "record.json"), JSON.stringify(w.record));
  const c = await cli(["check", "--record", join(state, "record.json")]);
  expect([c.code, c.out.trim()]).toEqual([0, "1 approves by a delegation, 0 that do not stand"]);
  const l = await cli(["list", "--since=1", "--record", join(state, "record.json"), "--json"]);
  expect(JSON.parse(l.out)).toEqual([]);
  expect((await cli(["list", "--record", join(state, "record.json")])).out).toContain(`task  on your words of event ${w.s.wish}  The core answers`);
  expect((await cli(["trial", "--record", join(state, "record.json")])).out).toContain("verdicts 1   approve 1   leave 0");
  w.record.at(-2).reason = "nothing named";
  writeFileSync(join(state, "record.json"), JSON.stringify(w.record));
  const failed = await cli(["check", "--record", join(state, "record.json")]);
  expect(failed.code).toBe(1);
  expect(failed.out).toContain("its reason names no verdict");
  expect(calls).toEqual([]);
});

test("id: one comment sent with loop-approver, the by.via of the event that answers is printed, and the value is in no output", async () => {
  serve(world());
  const r = await cli(["id"]);
  expect([r.code, r.out]).toEqual([0, ID + "\n"]);
  expect(calls.map((c) => [c.method, c.bearer, c.body.key, c.body.id])).toEqual([["comment", VALUE.loop, "approver/id", "ap-4-policy-v3"]]);
  expect(r.all).not.toContain(VALUE.loop);
  // A key a loop-approver of before holds answers no event: the next key is tried, on the issue named.
  serve(world());
  served.idHolder = "delegation:bbbbbbbbbbbb";
  const next = await cli(["id", "some-issue"]);
  expect([next.code, next.out]).toEqual([0, ID + "\n"]);
  expect(calls.map((c) => [c.body.key, c.body.id])).toEqual([["approver/id", "some-issue"], ["approver/id-2", "some-issue"]]);
  keep(false);
  calls = [];
  const none = await cli(["id"]);
  expect(none.code).toBe(2);
  expect(calls).toEqual([]);
  serve(world());
  served.refuse = 403;
  expect((await cli(["id"])).code).toBe(4);
});
