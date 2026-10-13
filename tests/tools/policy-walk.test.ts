// tools/cloud-brain/policy-walk.ts: the tracker's policy walked as a state machine. Held here: what the walk prints of
// the newest plan/cloud-brain-issues-policy-v<n>.json, the file the owner is given to install (one whole walk a run of
// the suite); that the walk can fail, on three policies made here from that file with one guard weakened each, each
// walked until its first broken edge; and what --in-force says of an issue.policy that a stand-in of issue-as.sh answers.
//
//   bun test ./tests/tools/policy-walk.test.ts
// Each test names its own timeout, 200 s: the suite's is 30 s, and one whole walk was 19 s in the cell on 2026-10-13
// at a load of 35 on 18 cores (99 s there before the cell copied the issues alone at each act; the record). The tool is
// started once for each policy, all at the first test that asks, so the file is as long as the whole walk. No call
// leaves the machine.
// Until rk-2-moves-are-his-or-a-token lands, moves-are-his-or-a-token is expected to fail with nine acts, by name: the
// test says what is known, and fails when a tenth appears or one leaves.
// Issue rk-1-policy-walk; plan/cloud-brain-rules-checked-and-stale-knowledge-seen.md, section 1.
import { expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newest } from "../../tools/cloud-brain/policy-pins.ts";
import { lines, UNTIL } from "../../tools/cloud-brain/policy-walk.ts";
import { testNeedingSeedAnd } from "./needs.ts";

const root = resolve(import.meta.dir, "../.."), me = "policy-walk.test.ts", dev = join(root, "cloud-brain-dev");
const TOOL = join(root, "tools/cloud-brain/policy-walk.ts"), FILE = newest(root)!, V = "v" + /-v(\d+)\.json$/.exec(FILE)![1];
const { test: withSeed } = await testNeedingSeedAnd(me, "brain-issues.ojs", [join(dev, "test.ts"), join(dev, "deploy/services.json")]);
const tmp = mkdtempSync(join(tmpdir(), "policy-walk-test-"));
const T = 200000;

type Ran = { code: number; out: string; err: string };
const runs = new Map<string, Promise<Ran>>();
// One process of the tool for each list of arguments, started when first asked for.
const tool = (args: string[], env: Record<string, string> = {}): Promise<Ran> => {
  const key = JSON.stringify([args, env]);
  if (!runs.has(key)) runs.set(key, (async () => {
    const p = Bun.spawn(["bun", TOOL, ...args], { cwd: root, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out, err };
  })());
  return runs.get(key)!;
};

// The newest file with one guard changed, as a file of the test's own. `change` must change the text it is given.
const file = JSON.parse(readFileSync(join(root, FILE), "utf8"));
const weakened = (name: string, change: (workflows: any) => void) => {
  const copy = structuredClone(file);
  change(copy.policy.workflows);
  expect(JSON.stringify(copy)).not.toBe(JSON.stringify(file));
  const path = join(tmp, name + ".json");
  writeFileSync(path, JSON.stringify(copy));
  return path;
};
const move = (w: any, workflow: string, name: string) => w[workflow].moves.find((m: any) => m.name === name);
const cut = (text: string, part: string) => { expect(text).toContain(part); return text.replace(part, ""); };
const WEAK: Record<string, { path: string; ends: string }> = {
  // `pass` without `!issue.major`: a token passes a task that carries major.
  "major-done-is-his": { path: weakened("pass-of-a-major", (w) => { const m = move(w, "task", "pass"); m.guard = cut(m.guard, "!issue.major && "); }), ends: " pass" },
  // The label guard without its `caller.present` clause: a token takes major off.
  "major-stays": { path: weakened("label-not-present", (w) => { for (const n of Object.keys(w)) w[n].label = cut(w[n].label, ' && (!("major" in event.remove) || caller.present)'); }), ends: " labels -major" },
  // `review` without `caller.actor != issue.by.start`: the starter reviews its own work.
  "no-own-review": { path: weakened("review-by-the-starter", (w) => { w.task.review = cut(w.task.review, " && caller.actor != issue.by.start"); }), ends: " reviews pass" }
};
const NINE = ["project.respec", "project.review", "project.to-approval", "task.pass", "task.review", "task.rework", "task.start", "task.submit", "task.to-approval"];
const HOLD = ["major-done-is-his", "major-stays", "project-done-was-approved", "no-own-review", "no-trap", "loop-ends-it"];
// Every process is started at the first test that needs one, so the short walks run beside the whole one.
const all = () => { tool([FILE]); for (const [name, w] of Object.entries(WEAK)) tool([w.path, "--until", name]); tool([FILE, "--until", "moves-are-his-or-a-token", "--json"]); };

withSeed(`the newest policy file, whole: six properties hold and moves-are-his-or-a-token fails with the nine acts of a Worker`, async () => {
  all();
  const r = await tool([FILE]), text = r.out.trim().split("\n");
  expect(r.err).toBe("");
  expect(r.code).toBe(1);
  // The first line: every state was visited.
  const head = /^(\S+): (\d+) states, (\d+) acts allowed, (\d+) acts tried, (\d+) states left unvisited, /.exec(text[0])!;
  expect([head[1], head[5]]).toEqual([FILE, "0"]);
  expect(Number(head[2])).toBeGreaterThan(1000);
  expect(Number(head[4])).toBeGreaterThan(Number(head[3]));
  // One line a property, in the spec's order, and nothing else but the paths of the one that fails.
  const named = text.slice(1).filter((l) => !l.startsWith("  path: "));
  expect(named.map((l) => l.split(": ").slice(0, 2).join(": "))).toEqual([...HOLD.map((n) => `${n}: holds`), "moves-are-his-or-a-token: fails"]);
  for (const l of named.slice(0, 6)) expect(l).toMatch(/: holds: 0 /);
  expect(named[1]).toContain("(asked of task, security, feedback, project)");
  expect(named[0]).toContain("(asked of task, security)");
  expect(named[2]).toContain("(asked of project)");
  expect(named[3]).toContain("(asked of task, security, project)");
  expect(named[5]).toEndWith("the owner's, as listed: security/awaiting-approval, security/in-review");
  expect(named[6]).toEndWith(": " + NINE.join(" "));
  expect(named[6]).toContain(": fails: 9 ");
  // A path for each of the nine, from an open to the Worker's act.
  const paths = text.filter((l) => l.startsWith("  path: "));
  expect(paths.length).toBe(9);
  for (const p of paths) expect(p).toMatch(/^  path: a opens x \((task|project)\) > .* > worker [a-z-]+( pass| with a reason and a ref)?$/);
  expect(text.indexOf(paths[0])).toBe(8);
}, T);

for (const [name, w] of Object.entries(WEAK)) {
  withSeed(`a policy with one guard weakened breaks ${name}, and the walk stops there with the path`, async () => {
    all();
    const r = await tool([w.path, "--until", name]), text = r.out.trim().split("\n");
    expect(r.err).toBe("");
    expect(r.code).toBe(1);
    expect(text.length).toBe(3);
    expect(text[0]).toEndWith(`stopped at the first edge that breaks ${name}, and no other property was asked`);
    expect(text[1]).toStartWith(`${name}: fails: 1 edge, the first that breaks it, where the walk stopped: task/`);
    expect(text[2]).toStartWith("  path: a opens x (task) > ");
    expect(text[2]).toEndWith(w.ends);
    const steps = text[2].slice("  path: ".length).split(" > "), who = steps.at(-1)!.split(" ")[0];
    // no-own-review: the caller that reviews is the one that started it, the owner in the shortest path. The other two:
    // the act is a token's, which the guard as it was refused.
    if (name === "no-own-review") expect(steps.filter((s) => / (start|submit) /.test(s + " ")).map((s) => s.split(" ")[0])).toEqual([who, who]);
    else expect(who).toMatch(/^(a|b)$/);
  }, T);
}

withSeed("--until is one of the four properties an edge breaks by itself, and --json is the cell's answer", async () => {
  all();
  expect(UNTIL).toEqual(["major-done-is-his", "major-stays", "no-own-review", "moves-are-his-or-a-token"]);
  const r = await tool([FILE, "--until", "moves-are-his-or-a-token", "--json"]), a = JSON.parse(r.out);
  expect(r.code).toBe(1);
  expect(Object.keys(a.hashes).sort()).toEqual(Object.keys(file.policy.workflows).sort());
  expect(a.properties.map((p: any) => [p.name, p.holds, p.count])).toEqual([["moves-are-his-or-a-token", false, 1]]);
  expect(a.properties[0].paths[0].at(-1)).toMatch(/^worker /);
  // The same answer as lines: what the tool prints with no --json.
  expect(lines(FILE, a).text.slice(1)).toEqual([expect.stringMatching(/^moves-are-his-or-a-token: fails: 1 edge, /), "  path: " + a.properties[0].paths[0].join(" > ")]);
  expect(lines(FILE, a).holds).toBe(false);
}, T);

withSeed("a walk the cap stopped holds nothing and says so; with nothing left and every property holding it holds", () => {
  const p = (holds: boolean) => ({ name: "no-trap", asked: ["task"], holds, count: holds ? 0 : 2, what: "states", states: holds ? [] : ["task/open"], paths: holds ? [] : [["a opens x (task)"]] });
  const head = { states: 5, edges: 7, tried: 9, ms: 1200 };
  expect(lines("f", { ...head, left: 0, properties: [p(true)] })).toEqual({ text: ["f: 5 states, 7 acts allowed, 9 acts tried, 0 states left unvisited, 1.2 s in the cell", "no-trap: holds: 0 states (asked of task)"], holds: true });
  const cap = lines("f", { ...head, left: 3, properties: [p(true)] });
  expect([cap.holds, cap.text.at(-1)]).toEqual([false, "not whole: 3 states were left unvisited at the cap of 400000, so no property is held"]);
  expect(lines("f", { ...head, left: 0, properties: [p(false)] })).toEqual({ text: [expect.any(String), "no-trap: fails: 2 states (asked of task): task/open", "  path: a opens x (task)"], holds: false });
  // A property no workflow has the names for says so.
  expect(lines("f", { ...head, left: 0, properties: [{ ...p(true), asked: [] }] }).text[1]).toBe("no-trap: holds: 0 states (asked of no workflow: none has the names it reads)");
});

// --in-force. A stand-in of issue-as.sh answers issue.policy from a file; the hashes are those the cell gave for the file.
const standIn = (name: string, answer: unknown, exit = 0) => {
  const body = join(tmp, name + ".json"), sh = join(tmp, name + ".sh");
  writeFileSync(body, typeof answer === "string" ? answer : JSON.stringify(answer));
  writeFileSync(sh, `#!/bin/bash\n[ "$2" = policy ] || { echo "asked for $2" >&2; exit 9; }\necho "$1" > "${sh}.token"\ncat "${body}"\necho " [${exit ? 403 : 200}]" >&2\nexit ${exit}\n`);
  chmodSync(sh, 0o755);
  return sh;
};
const hashes = async () => JSON.parse((await tool([FILE, "--until", "moves-are-his-or-a-token", "--json"])).out).hashes as Record<string, string>;

withSeed(`--in-force: an issue.policy with the hashes and the reason of the newest file is \`in force: ${V}\`; with its hashes and another reason, the workflows of ${V} under another reason`, async () => {
  all();
  const names = await hashes();
  const same = await tool(["--in-force", "--token", "impl-test"], { ISSUE_AS: standIn("same", { policy: { seq: 77, kinds: file.policy.kinds, names, reason: file.reason }, workflows: {} }) });
  expect([same.code, same.err]).toEqual([0, ""]);
  expect(same.out.trim().split("\n")).toEqual([`in force: ${V}`, `  the 4 workflow hashes of the policy of event 77 are those of ${FILE}; the reason in force is the file's`]);
  // The token named is the one the read was made with.
  expect(readFileSync(join(tmp, "same.sh.token"), "utf8").trim()).toBe("impl-test");
  const other = await tool(["--in-force", "--token", "impl-test"], { ISSUE_AS: standIn("other-reason", { policy: { seq: 78, names, reason: "another file's" }, workflows: {} }) });
  expect(other.code).toBe(0);
  expect(other.out.trim().split("\n")).toEqual([`in force: the workflows of ${V}, under another reason`, `  the 4 workflow hashes of the policy of event 78 are those of ${FILE}; the reason in force is not the file's: the install was of another file with these workflows, and what reads the reason (approver.ts, its two blobs) reads that file's`]);
}, T);

withSeed("--in-force: one hash that differs, a workflow more or a workflow less is `in force: not`, exit 1, with which", async () => {
  all();
  const names = await hashes(), { task, ...less } = names;
  const differs = await tool(["--in-force", "--token", "t"], { ISSUE_AS: standIn("differs", { policy: { seq: 5, names: { ...names, task: "0".repeat(64) } } }) });
  expect([differs.code, differs.out.trim()]).toEqual([1, `in force: not ${V}. Of the policy of event 5, task differs; 3 of the 4 workflow hashes of ${FILE} are in force`]);
  const more = await tool(["--in-force", "--token", "t"], { ISSUE_AS: standIn("more", { policy: { seq: 6, names: { ...names, extra: "1".repeat(64) } } }) });
  expect([more.code, more.out.trim()]).toEqual([1, `in force: not ${V}. Of the policy of event 6, extra is not in ${FILE}; 4 of the 4 workflow hashes of ${FILE} are in force`]);
  const fewer = await tool(["--in-force", "--token", "t"], { ISSUE_AS: standIn("fewer", { policy: { seq: 7, names: less } }) });
  expect([fewer.code, fewer.out.trim()]).toEqual([1, `in force: not ${V}. Of the policy of event 7, task is not in force; 3 of the 4 workflow hashes of ${FILE} are in force`]);
}, T);

withSeed("exit 2 and nothing on stdout: no arguments, a file and --default together, an --until that is no edge property, a file that is no policy, no token, a read that was refused", async () => {
  const none = join(tmp, "not-a-policy.json");
  writeFileSync(none, JSON.stringify({ key: "k", reason: "r" }));
  const cases: [string[], RegExp, Record<string, string>?][] = [
    [[], /^policy-walk\.ts: policy-walk\.ts <policy\.json>/],
    [[FILE, "--default"], /^policy-walk\.ts: policy-walk\.ts <policy\.json>/],
    [[FILE, "--until", "no-trap"], /^policy-walk\.ts: --until takes one of major-done-is-his, major-stays, no-own-review, moves-are-his-or-a-token$/],
    [[FILE, "--until"], /^policy-walk\.ts: --until takes one of /],
    [[none], /not-a-policy\.json has no policy: neither it nor its `policy` has `workflows`$/],
    [[join(tmp, "absent.json")], /absent\.json was not read as JSON: /],
    [["--in-force"], /^policy-walk\.ts: no --token; nothing was sent\n/],
    [["--in-force", "--token", "t"], /^policy-walk\.ts: issue\.policy was not read with t \(exit 3\): .*\[403\]$/s, { ISSUE_AS: standIn("refused", { error: "Forbidden" }, 3) }],
    [["--in-force", "--token", "t"], /^policy-walk\.ts: issue\.policy was not read with t \(exit 0\)/, { ISSUE_AS: standIn("no-names", { policy: {} }) }]
  ];
  for (const [args, said, env] of cases) {
    const r = await tool(args, env);
    expect([args, r.code, r.out]).toEqual([args, 2, ""]);
    expect(r.err.trim()).toMatch(said);
  }
}, T);

test("SKILL.md, step 7, has the run after an install, with what each first line means", () => {
  const skill = readFileSync(join(root, ".claude/skills/brain-maintenance/SKILL.md"), "utf8");
  const seven = skill.slice(skill.indexOf("\n7. **Tell the user**"), skill.indexOf("\n8. **Watch, then schedule**"));
  expect(seven.length).toBeGreaterThan(1000);
  expect(seven).toContain("**After an install.**");
  expect(seven).toContain("`bun tools/cloud-brain/policy-walk.ts --in-force --token <your token>`");
  expect(seven).toContain("`in force: v<n>` (exit 0)");
  expect(seven).toContain("`in force: the workflows of v<n>, under another reason` (exit 0 too)");
  expect(seven).toContain("`in force: not v<n>` (exit 1)");
});

test("the list of the owner's states has one list for a file and one for the default policy, which names no approver", () => {
  const his = JSON.parse(readFileSync(join(root, "tests/tools/fixtures/policy-walk-his.json"), "utf8"));
  expect(his.file).toEqual(["security/in-review", "security/awaiting-approval"]);
  expect(his.default).toEqual([...his.file, "project/awaiting-approval"]);
});
