// tools/cloud-brain/loop.ts: start, ended, resume, dead (st-2-loop-start-and-end; plan/cloud-brain-orchestrator-as-steps.md, part 2).
// The tracker is a stand-in served here, called through the real issue-as.sh; agent.sh, worktree.sh, brain.ts,
// agent-usage.ts and review-needs-tab.sh are stand-ins that write what they were given to a log.
import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { alive, costKey, deadRuns, endKey, keepsToken, KEY_MOST, outcomeOf, resumeAt, roleOf, roundOf, shaOf } from "../../tools/cloud-brain/loop.ts";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/loop.ts");
const RIG = mkdtempSync(join(tmpdir(), "loop-test-")), ROOT = join(RIG, "root"), STATE = join(RIG, "state"), RUNS = join(STATE, "issue-loop/runs");
const TOKENS = join(STATE, "cb4-agent-tokens.json"), ME = "orch-aaaaaa", HOST = "testhost";
mkdirSync(ROOT); mkdirSync(STATE);
const git = (...a: string[]) => spawnSync("git", ["-C", ROOT, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" }).stdout.trim();
git("init", "-q", "-b", "main");
mkdirSync(join(ROOT, ".claude/skills/brain-maintenance"), { recursive: true });
writeFileSync(join(ROOT, ".claude/skills/brain-maintenance/oversight.md"), "# Oversight\n\n## 2026-10-13 01:43 CEST, events 5182 to 5464\n\ntext\n\n## 2026-10-13 02:51 CEST, events 5464 to 5646\n\ntext\n");
git("add", "."); git("commit", "-q", "-m", "one"); git("remote", "add", "origin", ROOT); git("fetch", "-q", "origin", "main");
const MAIN = git("rev-parse", "origin/main");

const script = (name: string, text: string) => { const p = join(RIG, name); writeFileSync(p, text); chmodSync(p, 0o755); return p; };
const WORKTREE = script("worktree.sh", `#!/bin/bash
echo "$*" >> "$RIG/worktree.log"
case "$1" in
  --fresh) n="$2";; --at) n="$3";; *) n="$2";;
esac
P="$RIG/root/.claude/worktrees/bm-$n"
case "$1" in
  --fresh|--at) if [ -f "$RIG/wt-exit-$n" ]; then read code msg < "$RIG/wt-exit-$n"; echo "$msg" >&2; exit "$code"; fi; mkdir -p "$P"; echo "$P";;
  --remove) if [ -f "$RIG/wt-remove-$n" ] && [ "$3" != "--force" ]; then cat "$RIG/wt-remove-$n" >&2; exit 3; fi; rm -rf "$P";;
esac
exit 0
`);
const BRAIN = script("brain.ts", `import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const R = process.env.RIG, a = process.argv.slice(2), F = process.env.BRAIN_STATE_DIR + "/cb4-agent-tokens.json", t = JSON.parse(readFileSync(F, "utf8"));
appendFileSync(R + "/brain.log", a.join(" ") + "\\n");
if (existsSync(R + "/brain-exit")) { console.log("502 no token"); process.exit(1); }
if (a[1] === "revoke") { delete t[a[2]]; writeFileSync(F, JSON.stringify(t)); console.log("401: revoked"); }
else { const n = a[1] + "-" + String(readFileSync(R + "/brain.log", "utf8").split("\\n").filter((l) => l && !l.includes(" revoke ")).length).padStart(6, "0"); t[n] = "v-" + n; writeFileSync(F, JSON.stringify(t)); console.log(n); }
`);
const AGENT = script("agent.sh", `#!/bin/bash
{ echo "WORK=$WORK SESSION=$SESSION TAB=$TAB CHECKOUT=$CHECKOUT"; printf 'arg: %s\\n' "$@"; echo ---; } >> "$RIG/agent.log"
while [ -f "$RIG/agent-hold" ]; do sleep 0.1; done
[ -f "$RIG/agent-silent" ] && exit 2
R="the report"; [ -f "$RIG/agent-result" ] && R="$(cat "$RIG/agent-result")"
echo '{"session":"s","result":"'"$R"'","usd":1.5,"usage":{},"context":4242,"turns":3,"ms":61400,"legs":1}'
[ -f "$RIG/agent-error" ] && exit 1
exit 0
`);
const USAGE = script("usage.sh", `#!/bin/bash
echo "$*" >> "$RIG/usage.log"
[ -f "$RIG/usage-exit" ] && exit 1
echo '{"input":1,"cacheWrite":2,"cacheRead":3,"output":4,"requests":5,"advisor":{"calls":0,"input":0,"output":0}}'
`);
const NEEDS = script("needs-tab.sh", `#!/bin/bash
echo "$*" >> "$RIG/tab.log"
exit "$(cat "$RIG/tab-exit" 2>/dev/null || echo 1)"
`);
const USED = { input: 1, cacheWrite: 2, cacheRead: 3, output: 4, requests: 5, advisor: { calls: 0, input: 0, output: 0 } };

// ---- the tracker: issues, events with a seq, a key kept once, a run a role and round with `replaced`
type Ev = Record<string, any>;
let T: { seq: number; issues: Map<string, { issue: Ev; events: Ev[] }>; keys: Map<string, number>; queue: Ev; calls: { method: string; who: string; body: any }[] };
const names = () => Object.fromEntries(Object.entries(JSON.parse(readFileSync(TOKENS, "utf8"))).map(([n, v]) => [v as string, n]));
const ev = (id: string, holder: string, e: Ev) => { const x = { seq: ++T.seq, id, ...e, by: { holder: "secret:" + holder }, at: Date.now() }; T.issues.get(id)!.events.push(x); return x; };
const open = (id: string, more: Ev = {}) => { T.issues.set(id, { issue: { id, labels: [], state: "ready", kind: "task", ...more }, events: [] }); ev(id, ME, { type: "opened", key: "open/" + id }); };
const MOVES: Record<string, string> = { "in-progress>ready": "back", "spec>open": "back", "in-progress>in-review": "submit", "in-review>in-progress": "rework", "ready>in-progress": "start" };
const server = Bun.serve({ port: 0, hostname: "127.0.0.1", async fetch(req) {
  const url = new URL(req.url), method = url.pathname.replace("/xrpc/com.lopecode.brain.issue.", ""), who = names()[(req.headers.get("authorization") || "").replace("Bearer ", "")];
  const body = req.method === "POST" ? await req.json() : null;
  T.calls.push({ method, who, body });
  if (!who) return Response.json({ error: "AuthRequired" }, { status: 401 });
  const id = body ? body.id : url.searchParams.get("id"), i = T.issues.get(id);
  if (method === "queue") return Response.json(T.queue);
  if (!i) return Response.json({ error: "NotFound", message: "no such issue" }, { status: 404 });
  if (method === "get") return Response.json({ issue: i.issue, children: [], events: i.events });
  if (method === "runs") return Response.json({ runs: (i.issue.runs || []).filter((r: Ev) => !url.searchParams.get("role") || r.role === url.searchParams.get("role")).map((r: Ev) => ({ id, ...r })) });
  if (T.keys.has(body.key)) return Response.json({ id, seq: T.keys.get(body.key), duplicate: true });
  const { key, id: _, ...rest } = body;
  let e: Ev;
  if (method === "cost") {
    const was = (i.issue.runs || []).find((r: Ev) => r.role === rest.role && r.round === rest.round);
    e = ev(id, who, { type: "cost", key, ...rest, ...(was ? { replaced: was.seq } : {}) });
    i.issue.runs = [...(i.issue.runs || []).filter((r: Ev) => r !== was), { ...rest, seq: e.seq, at: e.at }];
  } else if (method === "move") { e = ev(id, who, { type: "moved", key, move: MOVES[`${i.issue.state}>${rest.to}`] || "?", from: i.issue.state, ...rest }); i.issue.state = rest.to; }
  else if (method === "comment") e = ev(id, who, { type: "commented", key, ...rest });
  else return Response.json({ error: "NotFound" }, { status: 404 });
  T.keys.set(key, e.seq);
  return Response.json({ id, seq: e.seq, event: e });
} });
afterAll(() => { server.stop(true); rmSync(RIG, { recursive: true, force: true }); });

const CONTROLS = ["agent-hold", "agent-silent", "agent-error", "agent-result", "usage-exit", "tab-exit", "brain-exit"];
function fresh() {
  T = { seq: 100, issues: new Map(), keys: new Map(), queue: { queue: [], waiting: [] }, calls: [] };
  for (const f of readdirSync(RIG)) if (f.endsWith(".log") || CONTROLS.includes(f) || f.startsWith("wt-")) rmSync(join(RIG, f));
  rmSync(join(STATE, "issue-loop"), { recursive: true, force: true });
  rmSync(join(ROOT, ".claude/worktrees"), { recursive: true, force: true });
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "impl-aaaaaa": "v-impl-aaaaaa", "impl-bbbbbb": "v-impl-bbbbbb" }));
  writeFileSync(join(STATE, "cb4-issues-tokens.json"), "{}");
}
const flagFile = (name: string, text = "") => writeFileSync(join(RIG, name), text);
const log = (name: string) => (existsSync(join(RIG, name + ".log")) ? readFileSync(join(RIG, name + ".log"), "utf8").trim().split("\n") : []);
const cli = async (args: string[], env: Record<string, string> = {}) => {
  const { LOOP_TOKEN: _, ...base } = process.env;
  const p = Bun.spawn(["bun", tool, ...args], { env: { ...base, LOOP_TOKEN: ME, RIG, LOOP_ROOT: ROOT, BRAIN_STATE_DIR: STATE, ISSUE_AS_BASE: `http://127.0.0.1:${server.port}`, ISSUE_AS: resolve(dirname(tool), "issue-as.sh"),
    LOOP_WORKTREE: WORKTREE, LOOP_BRAIN: "bun " + BRAIN, LOOP_AGENT: AGENT, LOOP_USAGE: USAGE, LOOP_NEEDS_TAB: NEEDS, LOOP_HOST: HOST, ...env }, stdout: "pipe", stderr: "pipe", timeout: 30000 });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text(), code = await p.exited;
  let json: any = null;
  try { json = JSON.parse(out); } catch {}
  return { code, out, err, json };
};
const file = (token: string): any => { try { return JSON.parse(readFileSync(join(RUNS, token + ".json"), "utf8")); } catch { return null; } };
const until = async (what: () => any, ms = 15000) => { for (const end = Date.now() + ms; Date.now() < end; await Bun.sleep(50)) { const v = what(); if (v) return v; } throw new Error("waited " + ms + " ms"); };
const over = (token: string) => until(() => file(token)?.ended);
const events = (id: string, type?: string) => T.issues.get(id)!.events.filter((e) => !type || e.type === type);
const runs = (id: string) => T.issues.get(id)!.issue.runs || [];
const writes = () => T.calls.filter((c) => c.body);
const tree = (n: string) => join(ROOT, ".claude/worktrees/bm-" + n);
const journal = (id: string) => readFileSync(join(STATE, "issue-loop", id + ".md"), "utf8");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test("the round, the keys, the dead runs and the outcome are read from the events", () => {
  const m = (move: string, seq: number, more: Ev = {}) => ({ type: "moved", move, seq, ...more });
  const record = [m("start", 1), m("submit", 2, { to: "in-review" }), m("rework", 3), m("submit", 4), m("to-approval", 5, { to: "awaiting-approval" })];
  expect(["implementer", "digest", "reviewer", "approver", "spec-writer", "overseer"].map((r) => roundOf(r, record))).toEqual([2, 2, 2, 1, 1, 1]);
  expect(roundOf("spec-writer", [m("spec", 1), m("submit-spec", 2), m("respec", 3)])).toBe(2);
  expect(roundOf("reviewer", [])).toBe(1);
  // Two runs of one role and round, and two resumes of one token in one round: no two keys the same.
  const run = { id: "x", role: "implementer", round: 2, token: "impl-aaaaaa" };
  const keys = [costKey(run), costKey({ ...run, token: "impl-bbbbbb" }), costKey({ ...run, how: "resumed", at: 31 }), costKey({ ...run, how: "resumed", at: 40 })];
  expect(keys).toEqual(["cost/x/implementer/2/impl-aaaaaa", "cost/x/implementer/2/impl-bbbbbb", "cost/x/implementer/2/impl-aaaaaa/resumed-31", "cost/x/implementer/2/impl-aaaaaa/resumed-40"]);
  expect(new Set([...keys, ...keys.map((k, i) => endKey([run, { ...run, token: "impl-bbbbbb" }, { ...run, how: "resumed", at: 31 }, { ...run, how: "resumed", at: 40 }][i]))]).size).toBe(8);
  expect(endKey(run)).toBe("cost/x/implementer/2/impl-aaaaaa/end");
  // The longest id of the record on 2026-10-13 is 40 characters.
  expect(endKey({ id: "x".repeat(40), role: "spec-writer", round: 1000, token: "spec-aaaaaa", how: "resumed", at: 9999999 }).length).toBeLessThanOrEqual(KEY_MOST);
  const c = (role: string, round: number, outcome: string, seq: number) => ({ type: "cost", role, round, outcome, seq });
  const costs = [c("implementer", 1, "running", 1), c("implementer", 1, "stopped", 2), c("implementer", 1, "no-submit", 3), c("implementer", 2, "stopped", 4), c("reviewer", 1, "stopped", 5), c("implementer", 1, "in-review", 6), { type: "commented", role: "implementer", round: 1, outcome: "stopped", seq: 7 }];
  expect(deadRuns(costs, "implementer", 1).map((e) => e.seq)).toEqual([2, 3]);
  expect(deadRuns(costs, "reviewer", 1).length).toBe(1);
  expect(deadRuns(costs, "reviewer", 2).length).toBe(0);
  const by = (holder: string) => ({ by: { holder: "secret:" + holder } });
  const w = { id: "x", role: "implementer", round: 1, token: "impl-aaaaaa" };
  const submit = { ...m("submit", 10), ...by("impl-aaaaaa") }, review = (verdict: string, seq: number) => ({ type: "reviewed", verdict, seq, ...by("rev-cccccc") });
  expect(outcomeOf(w, [], true)).toEqual({ outcome: "no-submit" });
  expect(outcomeOf(w, [], false)).toEqual({ outcome: "stopped" });
  expect(outcomeOf(w, [], true, true)).toEqual({ outcome: "stopped" });
  expect(outcomeOf(w, [{ ...m("submit", 10), ...by("impl-bbbbbb") }], true)).toEqual({ outcome: "no-submit" });
  expect(outcomeOf(w, [submit], false)).toEqual({ outcome: "in-review", event: 10 });
  expect(outcomeOf(w, [review("changes", 9), submit], true)).toEqual({ outcome: "in-review", event: 10 });
  expect(outcomeOf(w, [submit, review("pass", 11)], true)).toEqual({ outcome: "pass", event: 10 });
  expect(outcomeOf(w, [submit, review("changes", 11)], true)).toEqual({ outcome: "changes", event: 10 });
  // A resumed round: the submit before the event it was sent for is the round before's.
  expect(outcomeOf({ ...w, round: 2, how: "resumed", at: 12 }, [submit, review("changes", 11), m("rework", 12)], true)).toEqual({ outcome: "no-submit" });
  expect(outcomeOf({ ...w, round: 2, how: "resumed", at: 12 }, [submit, review("changes", 11), m("rework", 12), { ...m("submit", 13), ...by("impl-aaaaaa") }], true)).toEqual({ outcome: "in-review", event: 13 });
  const r = { id: "x", role: "reviewer", round: 1, token: "rev-cccccc" };
  expect(outcomeOf(r, [submit, review("changes", 11)], true)).toEqual({ outcome: "changes", event: 11 });
  expect(outcomeOf(r, [submit, { ...review("pass", 11), ...by("rev-dddddd") }], true)).toEqual({ outcome: "stopped" });
  const a = { id: "x", role: "approver", round: 1, token: "appr-eeeeee" }, verdict = (body: string, key = "approver/x/verdict-1") => ({ type: "commented", key, body, seq: 20, ...by("appr-eeeeee") });
  expect(outcomeOf(a, [verdict("approver: approve\nwhy")], true)).toEqual({ outcome: "approve", event: 20 });
  expect(outcomeOf(a, [verdict("approver: leave\nwhy")], true)).toEqual({ outcome: "leave", event: 20 });
  expect(outcomeOf(a, [verdict("approver: approve", "other/x")], true)).toEqual({ outcome: "stopped" });
  expect(outcomeOf({ id: "", role: "overseer", round: 1, token: "over-ffffff" }, [], true)).toEqual({ outcome: "done" });
  expect(outcomeOf({ id: "", role: "overseer", round: 1, token: "over-ffffff" }, [], true, true)).toEqual({ outcome: "stopped" });
  expect([["implementer", "in-review"], ["digest", "changes"], ["spec-writer", "no-submit"], ["implementer", "pass"], ["implementer", "stopped"], ["reviewer", "changes"], ["approver", "leave"]].map(([role, o]) => keepsToken(role, o))).toEqual([true, true, true, false, false, false, false]);
  const go = (seq: number, body: string, key = `orch/x/verdict-round-${seq}`) => ({ type: "commented", key, body, seq });
  expect(resumeAt("x", [m("rework", 12)])).toBe(12);
  expect(resumeAt("x", [m("rework", 12), go(15, "go-on\nthe findings are narrower")])).toBe(15);
  expect(resumeAt("x", [m("rework", 12), go(15, "left\nno"), go(16, "go-on", "impl/x/comment")])).toBe(12);
  expect(resumeAt("x", [m("start", 1)])).toBe(0);
  const q = { queue: [{ id: "a", do: "start", labels: [] }, { id: "b", do: "start", labels: ["digest"] }, { id: "c", do: "spec" }, { id: "d", do: "review" }, { id: "e", do: "triage" }], waiting: [{ id: "f", why: "owner", state: "awaiting-approval" }, { id: "g", why: "owner", state: "in-progress" }] };
  expect(["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => roleOf(id, q))).toEqual(["implementer", "digest", "spec-writer", "reviewer", null, "approver", null, null]);
  expect(shaOf([{ kind: "commit", value: "lopecode-dev@aaa" }, { kind: "commit", value: "lopecode-dev@bbb" }, { kind: "commit", value: "cloud-brain-dev@ccc" }, { kind: "url", value: "https://x" }])).toBe("bbb");
  expect(shaOf([{ kind: "commit", value: "ddd" }])).toBe("ddd");
  expect(shaOf([{ kind: "commit", value: "cloud-brain-dev@ccc" }])).toBeUndefined();
});

test("a pid is the run's process when its command line names the run, and where ps runs when it began then", async () => {
  const p = Bun.spawn(["bash", "-c", "sleep 20; true", "loop-run-impl-0f0f0f"], { stdout: "ignore", stderr: "ignore" });
  await Bun.sleep(200);
  const ps = spawnSync("ps", ["-o", "lstart=", "-p", String(p.pid)], { encoding: "utf8" }), began = ps.status === 0 ? ps.stdout.trim() : "";
  expect(alive({ token: "impl-0f0f0f", pid: p.pid, began })).toBe(true);
  // Another run's token, another pid, no pid: not this run's process.
  expect(alive({ token: "impl-0f0f0", pid: p.pid, began })).toBe(false);
  expect(alive({ token: "impl-1e1e1e", pid: p.pid, began })).toBe(false);
  expect(alive({ token: "impl-0f0f0f", pid: process.pid, began })).toBe(false);
  expect(alive({ token: "impl-0f0f0f" })).toBe(false);
  // Where `ps` is refused (the sandbox of a session) no time is read and none is compared.
  if (began) expect(alive({ token: "impl-0f0f0f", pid: p.pid, began: "Mon Jan  1 00:00:00 2001" })).toBe(false);
  p.kill();
  await p.exited;
  expect(alive({ token: "impl-0f0f0f", pid: p.pid, began })).toBe(false);
});

test("start returns before the agent does, the run is `running` in the record, and `ended` is run when the agent has returned", async () => {
  fresh();
  open("proj", { kind: "project", state: "building" });
  open("task-a", { parent: "proj" });
  T.queue = { queue: [{ id: "task-a", do: "start", labels: [] }], waiting: [] };
  flagFile("agent-hold");
  const r = await cli(["start", "task-a"]);
  expect(r.err).toBe("");
  expect(r.code).toBe(0);
  const token = "impl-000001", f = file(token);
  expect(r.json).toEqual({ started: token, id: "task-a", role: "implementer", round: 1, how: "fresh", session: f.session, agent: `${HOST}:${f.pid}`, tree: "proj", path: tree("proj"), event: f.running, key: "cost/task-a/implementer/1/impl-000001" });
  // The agent has not returned: its process lives, and it was given the worktree, the session and the four lines.
  expect(existsSync(join(RIG, "agent-hold"))).toBe(true);
  expect(alive(f)).toBe(true);
  expect(f.session).toMatch(UUID);
  expect({ id: f.id, role: f.role, round: f.round, token: f.token, made: f.made, tree: f.tree, host: f.host, as: f.as }).toEqual({ id: "task-a", role: "implementer", round: 1, token, made: true, tree: "proj", host: HOST, as: ME });
  await until(() => log("agent").length >= 7);
  expect(log("agent")).toEqual([`WORK=${tree("proj")} SESSION=${f.session} TAB= CHECKOUT=`, "arg: implementer", `arg: Working directory: ${tree("proj")}.`, `Read ${tree("proj")}/.claude/skills/brain-maintenance/agents/implementer.md and follow it.`, "Issue: task-a", `Your token is ${token}.`, "---"]);
  expect(log("brain")).toEqual(["agent-token impl task-a"]);
  expect(log("worktree")).toEqual([`--fresh proj --for ${token}`]);
  // One `cost` event, as the spec's part 2 has it, written with the caller's token; one comment, on the topic.
  const running = events("task-a", "cost");
  expect(running.map(({ at, ...e }) => e)).toEqual([{ seq: f.running, id: "task-a", type: "cost", key: "cost/task-a/implementer/1/impl-000001", role: "implementer", round: 1, how: "fresh", outcome: "running", seconds: 0, context: 0, token, session: f.session, agent: `${HOST}:${f.pid}`, by: { holder: "secret:" + ME } }]);
  expect(runs("task-a").map((x: Ev) => [x.role, x.round, x.outcome, x.token, x.session])).toEqual([["implementer", 1, "running", token, f.session]]);
  const note = events("proj", "commented");
  expect(note.map((e) => [e.key, e.by.holder])).toEqual([["orch/proj/worktree-1", "secret:" + ME]]);
  expect(JSON.parse(note[0].body.replace(/^worktree /, ""))).toEqual({ topic: "proj", branch: "bm/proj", machine: HOST, path: tree("proj"), at: MAIN, for: "task-a" });
  // `ended` while it runs: exit 3, and nothing is written.
  const before = writes().length;
  const early = await cli(["ended", token]);
  expect([early.code, early.out]).toEqual([3, ""]);
  expect(early.err).toContain(`${token} still runs`);
  expect(writes().length).toBe(before);
  // The agent returns: the wrapper runs `ended`.
  rmSync(join(RIG, "agent-hold"));
  const e = await over(token);
  expect(alive(file(token))).toBe(false);
  expect(e.outcome).toBe("no-submit");
  const costs = events("task-a", "cost");
  expect(costs.length).toBe(2);
  expect((({ at, seq, ...x }) => x)(costs[1])).toEqual({ id: "task-a", type: "cost", key: "cost/task-a/implementer/1/impl-000001/end", role: "implementer", round: 1, how: "fresh", outcome: "no-submit", seconds: 61, context: 4242, agent: `${HOST}:${f.pid}`, session: f.session, token, usage: USED, usd: 1.5, replaced: f.running, by: { holder: "secret:" + ME } });
  expect(runs("task-a").map((x: Ev) => [x.role, x.round, x.outcome, x.seq])).toEqual([["implementer", 1, "no-submit", costs[1].seq]]);
  expect(log("usage")).toEqual([`--session ${f.session}`]);
  expect(log("worktree")).toEqual([`--fresh proj --for ${token}`, "--leave proj"]);
  // A writer that may be sent its round keeps its token.
  expect(log("brain")).toEqual(["agent-token impl task-a"]);
  expect(e.token).toBe("kept");
  expect(journal("task-a")).toMatch(/\n## implementer round 1 \(fresh, loop\.ts\), ended .*, outcome no-submit, token impl-000001, context 4242, 61 s, usd 1\.5, session .*\n\nthe report\n$/);
  // A second `ended`: nothing is written, in the record or in the journal.
  const count = writes().length, text = journal("task-a");
  const again = await cli(["ended", token]);
  expect(again.code).toBe(0);
  expect(again.json.already).toBe(token);
  expect([writes().length, journal("task-a")]).toEqual([count, text]);
});

test("an agent that returns at once: its end is written after its `running` event, and a writer that passed has its token ended", async () => {
  fresh();
  open("quick", { state: "in-review" });
  // The token the stand-in makes is impl-000001: what it wrote is in the record before the run is ended.
  const submit = ev("quick", "impl-000001", { type: "moved", move: "submit", to: "in-review", refs: [] });
  ev("quick", "rev-cccccc", { type: "reviewed", verdict: "pass" });
  const r = await cli(["start", "quick", "--role", "implementer"]);
  expect(r.code).toBe(0);
  const e = await over("impl-000001");
  expect(e.outcome).toBe("pass");
  expect(events("quick", "cost").map((x) => [x.outcome, x.event, x.replaced])).toEqual([["running", undefined, undefined], ["pass", submit.seq, r.json.event]]);
  expect(runs("quick").map((x: Ev) => x.outcome)).toEqual(["pass"]);
  expect(log("brain")).toEqual(["agent-token impl quick", "agent-token revoke impl-000001"]);
  expect(e.token).toBe("ended");
  // No topic but itself: the comment is on the issue.
  expect(events("quick", "commented").map((x) => x.key)).toEqual(["orch/quick/worktree-1"]);
  expect(log("worktree")).toEqual(["--fresh quick --for impl-000001", "--leave quick"]);
});

test("--token: the program makes no token and ends none; a second run of one role and round takes the first's place, and the dead runs are counted from the events", async () => {
  fresh();
  open("test-a");
  flagFile("agent-silent");
  const one = await cli(["start", "test-a", "--role", "implementer", "--token", "impl-aaaaaa"]);
  expect(one.code).toBe(0);
  expect((await over("impl-aaaaaa")).outcome).toBe("stopped");
  expect(file("impl-aaaaaa").made).toBe(false);
  expect(file("impl-aaaaaa").ended.token).toBe("given, not ended");
  expect(journal("test-a")).toContain("(no report: the process gave no result line, exit 2)");
  expect((await cli(["dead", "test-a", "--role", "implementer"])).json).toEqual({ id: "test-a", role: "implementer", round: 1, dead: 1, events: [events("test-a", "cost")[1].seq] });
  flagFile("agent-hold");
  const two = await cli(["start", "test-a", "--role", "implementer", "--token", "impl-bbbbbb"]);
  expect(two.code).toBe(0);
  expect(two.json.key).not.toBe(one.json.key);
  // One run of that role, `running`, and its token the second.
  expect(runs("test-a").map((x: Ev) => [x.role, x.round, x.outcome, x.token])).toEqual([["implementer", 1, "running", "impl-bbbbbb"]]);
  expect((await cli(["dead", "test-a", "--role", "implementer"])).json.dead).toBe(1);
  rmSync(join(RIG, "agent-hold"));
  expect((await over("impl-bbbbbb")).outcome).toBe("stopped");
  expect((await cli(["dead", "test-a", "--role", "implementer", "--round", "1"])).json.dead).toBe(2);
  expect((await cli(["dead", "test-a", "--role", "implementer", "--round", "2"])).json.dead).toBe(0);
  expect(events("test-a", "cost").map((x) => [x.key, x.outcome])).toEqual([
    ["cost/test-a/implementer/1/impl-aaaaaa", "running"], ["cost/test-a/implementer/1/impl-aaaaaa/end", "stopped"],
    ["cost/test-a/implementer/1/impl-bbbbbb", "running"], ["cost/test-a/implementer/1/impl-bbbbbb/end", "stopped"]]);
  // A run that gave no result has no usage, and no number of it is made up.
  expect(events("test-a", "cost")[1]).toMatchObject({ seconds: 0, context: 0 });
  expect("usage" in events("test-a", "cost")[1]).toBe(false);
  expect(log("usage")).toEqual([]);
  expect(log("brain")).toEqual([]);
  expect(Object.keys(JSON.parse(readFileSync(TOKENS, "utf8")))).toEqual([ME, "impl-aaaaaa", "impl-bbbbbb"]);
});

test("a result that is an error is `stopped`, and the made token is ended", async () => {
  fresh();
  open("err");
  flagFile("agent-error");
  flagFile("usage-exit");
  expect((await cli(["start", "err", "--role", "implementer"])).code).toBe(0);
  const e = await over("impl-000001");
  expect([e.outcome, e.token]).toEqual(["stopped", "ended"]);
  // The transcript was not found: the event has what the process said of itself and no usage.
  expect(events("err", "cost")[1]).toMatchObject({ seconds: 61, context: 4242, usd: 1.5 });
  expect("usage" in events("err", "cost")[1]).toBe(false);
});

test("the worktree: origin not reached starts nothing; another agent's is the next name; this issue's unlanded work is kept, another's is said on that issue", async () => {
  fresh();
  open("proj", { kind: "project", state: "building" });
  open("task-a", { parent: "proj" });
  open("task-b", { parent: "proj" });
  flagFile("wt-exit-proj", "2 origin was not reached");
  const none = await cli(["start", "task-a", "--role", "implementer"]);
  expect(none.code).toBe(2);
  expect(none.err).toContain("the token impl-000001 is ended");
  expect([none.out, log("agent"), writes().length, file("impl-000001")]).toEqual(["", [], 0, null]);
  expect(log("brain")).toEqual(["agent-token impl task-a", "agent-token revoke impl-000001"]);
  // Exit 4: another agent is in it.
  flagFile("wt-exit-proj", "4 occupied by impl-zzzzzz");
  const next = await cli(["start", "task-a", "--role", "implementer"]);
  expect([next.code, next.json.tree, next.json.path]).toEqual([0, "proj.2", tree("proj.2")]);
  await over(next.json.started);
  expect(JSON.parse(events("proj", "commented")[0].body.slice(9))).toMatchObject({ topic: "proj", branch: "bm/proj.2", path: tree("proj.2"), for: "task-a" });
  // Exit 3, and the last comment that names the path is of this issue: the worktree as it is, and a fifth line.
  ev("proj", ME, { type: "commented", key: "orch/proj/worktree-9", body: "worktree " + JSON.stringify({ topic: "proj", branch: "bm/proj", path: tree("proj"), for: "task-a" }) });
  flagFile("wt-exit-proj", "3 ahead=2 changed=1");
  rmSync(join(RIG, "agent.log"));
  const own = await cli(["start", "task-a", "--role", "implementer"]);
  expect([own.code, own.json.tree]).toEqual([0, "proj"]);
  await over(own.json.started);
  expect(log("agent").slice(2, 7)).toEqual([`arg: Working directory: ${tree("proj")}.`, `Read ${tree("proj")}/.claude/skills/brain-maintenance/agents/implementer.md and follow it.`, "Issue: task-a", `Your token is ${own.json.started}.`, "The worktree holds unlanded work of this issue."]);
  // Exit 3 with another issue's work: the next name, and a comment on the issue whose work stands there.
  const other = await cli(["start", "task-b", "--role", "implementer"]);
  expect([other.code, other.json.tree]).toEqual([0, "proj.2"]);
  await over(other.json.started);
  const said = events("task-a", "commented").filter((e) => e.key.startsWith("orch/task-a/stands-"));
  expect(said.map((e) => e.body)).toEqual(["The worktree bm-proj holds work of this issue that is not landed (ahead=2 changed=1). task-b is started in the next name; nothing there was touched."]);
});

test("a reviewer: a view at the submit's commit, the four tools, TAB when a commit asks for it, the view removed and the token ended", async () => {
  fresh();
  open("rv", { state: "in-review" });
  ev("rv", "impl-aaaaaa", { type: "moved", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "lopecode-dev@abc111" }] });
  ev("rv", "rev-cccccc", { type: "reviewed", verdict: "changes" });
  ev("rv", "rev-cccccc", { type: "moved", move: "rework", to: "in-progress" });
  ev("rv", "impl-aaaaaa", { type: "moved", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "lopecode-dev@abc222" }, { kind: "commit", value: "cloud-brain-dev@ddd333" }] });
  const review = ev("rv", "rev-000001", { type: "reviewed", verdict: "pass" });
  T.queue = { queue: [{ id: "rv", do: "review" }], waiting: [] };
  const r = await cli(["start", "rv"]);
  expect(r.code).toBe(0);
  expect(r.json).toMatchObject({ started: "rev-000001", role: "reviewer", round: 2, how: "light", tree: "rev-rv", key: "cost/rv/reviewer/2/rev-000001" });
  const e = await over("rev-000001"), f = file("rev-000001");
  expect(log("worktree")).toEqual(["--at abc222 rev-rv", "--remove rev-rv"]);
  expect(log("tab")).toEqual(["lopecode-dev@abc222 cloud-brain-dev@ddd333"]);
  expect(log("agent")).toEqual([`WORK= SESSION=${f.session} TAB= CHECKOUT=${tree("rev-rv")}`, "arg: reviewer", "arg: review issue rv; your token is rev-000001", "---"]);
  expect([e.outcome, e.token]).toEqual(["pass", "ended"]);
  expect(events("rv", "cost").map((x) => [x.how, x.outcome, x.event])).toEqual([["light", "running", undefined], ["light", "pass", review.seq]]);
  expect(log("brain")).toEqual(["agent-token rev rv", "agent-token revoke rev-000001"]);
  // A commit that touches a seed (exit 0), one that cannot be read (2), or a `url` ref: TAB=1.
  for (const [code, refs] of [["0", []], ["2", []], ["1", [{ kind: "url", value: "https://x" }]]] as [string, Ev[]][]) {
    flagFile("tab-exit", code);
    ev("rv", "impl-aaaaaa", { type: "moved", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "abc444" }, ...refs] });
    rmSync(join(RIG, "agent.log"));
    const t = await cli(["start", "rv", "--role", "reviewer"]);
    await over(t.json.started);
    expect(log("agent")[0]).toBe(`WORK= SESSION=${file(t.json.started).session} TAB=1 CHECKOUT=${tree("rev-rv")}`);
    expect(log("tab").pop()).toBe("lopecode-dev@abc444");
  }
});

test("a reviewer: no commit of lopecode-dev is origin/main; a view that is not clean is removed or left by its counts; `needed a tab` starts the next with one", async () => {
  fresh();
  open("rv", { state: "in-review" });
  ev("rv", "impl-aaaaaa", { type: "moved", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "cloud-brain-dev@ddd333" }] });
  flagFile("wt-remove-rev-rv", "rev-rv not-clean changed=1 untracked=2 ahead=0 dev-changed=0 dev-ahead=0\n");
  flagFile("agent-result", "needed a tab: the change is a panel");
  const a = await cli(["start", "rv", "--role", "reviewer"]);
  const ea = await over(a.json.started);
  expect(log("worktree")).toEqual([`--at ${MAIN} rev-rv`, "--remove rev-rv", "--remove rev-rv --force"]);
  expect(ea.outcome).toBe("stopped");
  expect(ea.notes).toEqual(["the view rev-rv was not clean (rev-rv not-clean changed=1 untracked=2 ahead=0 dev-changed=0 dev-ahead=0) and was removed with --force"]);
  expect(log("agent")[0]).toContain(" TAB= ");
  // The run before said it needed a tab; and a commit of the reviewer's own stands in the view this time.
  rmSync(join(RIG, "agent-result")); rmSync(join(RIG, "agent.log")); rmSync(join(RIG, "worktree.log"));
  flagFile("wt-remove-rev-rv", "rev-rv not-clean changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0\n");
  const b = await cli(["start", "rv", "--role", "reviewer"]);
  const eb = await over(b.json.started);
  expect(log("agent")[0]).toContain(" TAB=1 ");
  expect(log("worktree")).toEqual([`--at ${MAIN} rev-rv`, "--remove rev-rv"]);
  expect(eb.notes).toEqual(["the view rev-rv is left: a commit stands there that was not pushed (rev-rv not-clean changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0)"]);
  // A ref that names a commit nobody has: the view is made at origin/main.
  fresh();
  open("rv", { state: "in-review" });
  ev("rv", "impl-aaaaaa", { type: "moved", move: "submit", to: "in-review", refs: [{ kind: "commit", value: "lopecode-dev@gone" }] });
  script("worktree-once.sh", `#!/bin/bash\nif [ "$2" = gone ]; then echo "$*" >> "$RIG/worktree.log"; echo "worktree.sh: no commit gone" >&2; exit 1; fi\nexec "$RIG/worktree.sh" "$@"\n`);
  const c = await cli(["start", "rv", "--role", "reviewer"], { LOOP_WORKTREE: join(RIG, "worktree-once.sh") });
  expect(c.code).toBe(0);
  await over(c.json.started);
  expect(log("worktree").slice(0, 2)).toEqual(["--at gone rev-rv", `--at ${MAIN} rev-rv`]);
});

test("an approver: a view at origin/main, the three lines, its verdict the outcome, its token ended", async () => {
  fresh();
  open("ap", { state: "awaiting-approval" });
  ev("ap", "rev-cccccc", { type: "moved", move: "to-approval", to: "awaiting-approval" });
  const verdict = ev("ap", "appr-000001", { type: "commented", key: "approver/ap/verdict-1", body: "approver: leave\nwhat it does\nwhy: a choice" });
  T.queue = { queue: [], waiting: [{ id: "ap", why: "owner", state: "awaiting-approval" }] };
  const r = await cli(["start", "ap"]);
  expect(r.code).toBe(0);
  const e = await over("appr-000001"), f = file("appr-000001"), V = tree("appr-ap");
  expect(log("worktree")).toEqual([`--at ${MAIN} appr-ap`, "--remove appr-ap"]);
  expect(log("agent")).toEqual([`WORK=${V} SESSION=${f.session} TAB= CHECKOUT=`, "arg: approver", "arg: Run `bun " + V + "/tools/cloud-brain/approver.ts brief` and follow what it prints.", "Issue: ap", "Your token is appr-000001.", "---"]);
  expect(events("ap", "cost").map((x) => [x.role, x.round, x.how, x.outcome, x.event, x.token])).toEqual([["approver", 1, "fresh", "running", undefined, "appr-000001"], ["approver", 1, "fresh", "leave", verdict.seq, "appr-000001"]]);
  expect([e.outcome, e.token]).toEqual(["leave", "ended"]);
  expect(events("ap", "commented").filter((x) => x.key.startsWith("orch/"))).toEqual([]);
});

test("an overseer is on no issue: the file and no event, its line in _oversight.md, its token ended", async () => {
  fresh();
  const bad = await cli(["start", "some-issue", "--role", "overseer"]);
  expect([bad.code, T.calls.length]).toEqual([2, 0]);
  flagFile("agent-hold");
  const r = await cli(["start", "--role", "overseer"]);
  expect(r.code).toBe(0);
  const token = "over-000001", f = file(token), W = tree("over-" + HOST);
  expect([f.id, f.role, f.round, f.running]).toEqual(["", "overseer", 1, 0]);
  expect(r.json).toMatchObject({ started: token, id: "", role: "overseer", tree: "over-" + HOST });
  expect("key" in r.json || "event" in r.json).toBe(false);
  expect(log("brain")).toEqual(["agent-token over oversight-after-5646"]);
  expect(writes()).toEqual([]);
  await until(() => log("agent").length >= 7);
  expect(log("agent").slice(2, 6)).toEqual([`arg: Working directory: ${W}.`, `Read ${W}/.claude/skills/brain-maintenance/agents/overseer.md and follow it.`, `Last oversight ended at event 5646. Journal: ${join(STATE, "issue-loop")}/`, `Your token is ${token}.`]);
  rmSync(join(RIG, "agent-hold"));
  const e = await over(token);
  expect([e.outcome, e.token]).toEqual(["done", "ended"]);
  expect(writes()).toEqual([]);
  expect(log("worktree")).toEqual([`--fresh over-${HOST} --for ${token}`, `--leave over-${HOST}`]);
  expect(log("brain")).toEqual(["agent-token over oversight-after-5646", `agent-token revoke ${token}`]);
  const line = journal("_oversight").split("\n").find((l) => l.startsWith("{"))!;
  expect(JSON.parse(line)).toEqual({ role: "overseer", round: 1, how: "fresh", outcome: "done", seconds: 61, context: 4242, agent: f.agent, session: f.session, token, usage: USED, usd: 1.5 });
  // An overseer's edit that was not landed: none is started, and no second name is tried.
  flagFile("wt-exit-over-" + HOST, "3 ahead=1");
  rmSync(join(RIG, "worktree.log"));
  const held = await cli(["start", "--role", "overseer"]);
  expect(held.code).toBe(1);
  expect(log("worktree")).toEqual([`--fresh over-${HOST} --for over-000002`]);
  expect(log("brain").pop()).toBe("agent-token revoke over-000002");
});

test("resume sends --resume with the session of the last run and writes a `running` event of its own key; a second resume of the round has another", async () => {
  fresh();
  open("rw", { state: "in-progress" });
  flagFile("agent-hold");
  const s = await cli(["start", "rw", "--role", "implementer"]);
  const token = s.json.started, session = s.json.session;
  const submit = ev("rw", token, { type: "moved", move: "submit", to: "in-review", refs: [] });
  // The writer waits for its review: the round is its own to take, and nothing is sent.
  const review = ev("rw", "rev-cccccc", { type: "reviewed", verdict: "changes" });
  const rework = ev("rw", "rev-cccccc", { type: "moved", move: "rework", to: "in-progress" });
  const count = writes().length;
  const waits = await cli(["resume", "rw"]);
  expect(waits.code).toBe(3);
  expect(waits.err).toContain("still runs");
  expect(writes().length).toBe(count);
  rmSync(join(RIG, "agent-hold"));
  expect((await over(token)).outcome).toBe("changes");
  expect(file(token).ended.token).toBe("kept");
  rmSync(join(RIG, "agent.log")); rmSync(join(RIG, "usage.log"));
  flagFile("agent-hold");
  const r = await cli(["resume", "rw"]);
  expect(r.err).toBe("");
  expect(r.code).toBe(0);
  const key = `cost/rw/implementer/2/${token}/resumed-${rework.seq}`;
  expect(r.json).toMatchObject({ resumed: token, id: "rw", role: "implementer", round: 2, at: rework.seq, session, tree: "rw", key });
  await until(() => log("agent").length >= 6);
  expect(log("agent")).toEqual([`WORK=${tree("rw")} SESSION= TAB= CHECKOUT=`, "arg: --resume", `arg: ${session}`, `arg: Issue: rw, sent back by the review at event ${review.seq}.`, `Working directory: ${tree("rw")}.`, `A resumed round: read ${tree("rw")}/.claude/skills/brain-maintenance/agents/implementer/resumed-round.md, "A resumed round", and follow it.`, "---"]);
  expect(runs("rw").map((x: Ev) => [x.round, x.how, x.outcome, x.token, x.session])).toEqual([[1, "fresh", "changes", token, session], [2, "resumed", "running", token, session]]);
  expect(events("rw", "cost").pop()).toMatchObject({ key, how: "resumed", outcome: "running", seconds: 0, context: 0, agent: `${HOST}:${file(token).pid}` });
  expect(log("brain")).toEqual(["agent-token impl rw"]);
  // The round ends with no submit: its end is under that key and /end, and its usage is of the last run alone.
  rmSync(join(RIG, "agent-hold"));
  expect((await over(token)).outcome).toBe("no-submit");
  expect(events("rw", "cost").pop()).toMatchObject({ key: key + "/end", how: "resumed", outcome: "no-submit", round: 2 });
  expect(log("usage")).toEqual([`--session ${session} --last-run`]);
  expect(journal("rw").match(/^## implementer round \d \((fresh|resumed), loop\.ts\)/gm)).toEqual(["## implementer round 1 (fresh, loop.ts)", "## implementer round 2 (resumed, loop.ts)"]);
  // A judgment's `go-on`: the same token is resumed again in the same round, under a key of the verdict's seq.
  const go = ev("rw", ME, { type: "commented", key: `orch/rw/verdict-round-${rework.seq}`, body: "go-on\nit had landed and not submitted" });
  const again = await cli(["resume", "rw"]);
  expect(again.code).toBe(0);
  expect(again.json.key).toBe(`cost/rw/implementer/2/${token}/resumed-${go.seq}`);
  await over(token);
  expect(events("rw", "cost").map((x) => x.key)).toEqual([`cost/rw/implementer/1/${token}`, `cost/rw/implementer/1/${token}/end`, key, key + "/end", `cost/rw/implementer/2/${token}/resumed-${go.seq}`, `cost/rw/implementer/2/${token}/resumed-${go.seq}/end`]);
  expect(submit.seq).toBeLessThan(rework.seq);
});

test("resume, a dead writer: a token that no longer reads the tracker is ended and the issue goes back; another machine's run the same", async () => {
  fresh();
  open("dw", { state: "in-progress" });
  const s = await cli(["start", "dw", "--role", "implementer"]);
  const token = s.json.started;
  ev("dw", token, { type: "moved", move: "submit", to: "in-review", refs: [] });
  await over(token);
  // Nothing to send a round for.
  const none = await cli(["resume", "dw"]);
  expect(none.code).toBe(1);
  expect(none.err).toContain("there is no round to send");
  const rework = ev("dw", "rev-cccccc", { type: "moved", move: "rework", to: "in-progress" });
  const kept = JSON.parse(readFileSync(TOKENS, "utf8"));
  delete kept[token];
  writeFileSync(TOKENS, JSON.stringify(kept));
  rmSync(join(RIG, "agent.log"));
  const r = await cli(["resume", "dw"]);
  expect(r.code).toBe(0);
  const back = events("dw", "moved").pop()!;
  expect(r.json).toEqual({ dead: "dw", role: "implementer", why: `its token ${token} no longer reads the tracker`, token: `${token} ended`, back: back.seq });
  expect([back.key, back.move, back.to, back.by.holder]).toEqual([`orch/dw/back-${rework.seq}`, "back", "ready", "secret:" + ME]);
  expect(back.reason).toContain(`its token ${token} no longer reads the tracker`);
  expect(log("brain").pop()).toBe(`agent-token revoke ${token}`);
  expect(log("agent")).toEqual([]);
  expect(T.issues.get("dw")!.issue.state).toBe("ready");
  // At `ready` there is no round to send.
  expect((await cli(["resume", "dw"])).code).toBe(1);
  // A run of another machine that has ended, and a spec writer's: `back` is from `spec` to `open`.
  open("sp", { kind: "project", state: "spec" });
  const respec = ev("sp", "rev-cccccc", { type: "moved", move: "respec", to: "spec" });
  T.issues.get("sp")!.issue.runs = [{ role: "spec-writer", round: 1, how: "fresh", outcome: "in-review", token: "spec-abcdef", session: "s1", agent: "elsewhere:77", seq: 1 }];
  const o = await cli(["resume", "sp"]);
  expect(o.json).toMatchObject({ dead: "sp", role: "spec-writer", why: "its last run is another machine's (elsewhere:77)", token: "spec-abcdef ended" });
  expect(events("sp", "moved").pop()).toMatchObject({ key: `orch/sp/back-${respec.seq}`, to: "open" });
  // One that still runs there is left.
  open("far", { state: "in-progress" });
  ev("far", "rev-cccccc", { type: "moved", move: "rework", to: "in-progress" });
  T.issues.get("far")!.issue.runs = [{ role: "implementer", round: 1, how: "fresh", outcome: "running", token: "impl-abcdef", session: "s1", agent: "elsewhere:78", seq: 1 }];
  const far = await cli(["resume", "far"]);
  expect(far.code).toBe(3);
  expect(events("far", "moved").length).toBe(1);
});

test("with no LOOP_TOKEN nothing is read or sent; a role the queue does not give is asked for; a token that was not made starts nothing", async () => {
  fresh();
  open("x");
  for (const args of [["start", "x"], ["ended", "impl-aaaaaa"], ["resume", "x"], ["dead", "x", "--role", "implementer"]]) {
    const r = await cli(args, { LOOP_TOKEN: "" });
    expect([args[0], r.code, r.out]).toEqual([args[0], args[0] === "ended" ? 1 : 2, ""]);
  }
  expect(T.calls).toEqual([]);
  const r = await cli(["start", "x"]);
  expect(r.code).toBe(1);
  expect(r.err).toContain("the queue has no entry that starts an agent on x");
  expect(log("brain")).toEqual([]);
  expect((await cli(["start", "x", "--role", "writer"])).code).toBe(2);
  expect((await cli(["start", "nope", "--role", "implementer"])).code).toBe(1);
  flagFile("brain-exit");
  const no = await cli(["start", "x", "--role", "implementer"]);
  expect(no.code).toBe(1);
  expect(no.err).toContain("agent-token made no token");
  expect([log("worktree"), log("agent"), writes()]).toEqual([[], [], []]);
  expect((await cli(["ended", "impl-nosuch"])).code).toBe(1);
  expect((await cli(["bogus"])).code).toBe(2);
});
