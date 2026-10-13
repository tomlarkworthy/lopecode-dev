// tools/cloud-brain/loop.ts step (st-3-step; plan/cloud-brain-orchestrator-as-steps.md, part 3): a test a row of the
// step's table, the R6 checks, health, what stops a start, the files. The tracker is a stand-in served here, called
// through the real issue-as.sh; worktree.sh, brain.ts, lock.sh, uptime and loop.ts's own start, resume and ended are
// stand-ins that log what they were given (the last tests run the real start and ended). git is the real one, on
// scratch repositories. Since st-4-orchestrator-brief the entries a step gives are the task of one judgment run, which
// the step starts: the tests from "the judgment run" on.
import { afterAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { givenKey, judged, judgmentRound, notLoggedIn, outcomeOf, verdictKey } from "../../tools/cloud-brain/loop.ts";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/loop.ts");
const RIG = mkdtempSync(join(tmpdir(), "loop-step-test-")), ROOT = join(RIG, "root"), DEV = join(ROOT, "cloud-brain-dev"), STATE = join(RIG, "state"), LOOP = join(STATE, "issue-loop"), RUNS = join(LOOP, "runs");
const TOKENS = join(STATE, "cb4-agent-tokens.json"), ME = "orch-aaaaaa", HOST = "testhost", CB4 = "https://cb4.endpointservices.workers.dev";
const g = (dir: string, ...a: string[]) => spawnSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { encoding: "utf8" });
const head = (dir: string, ref = "HEAD") => g(dir, "rev-parse", ref).stdout.trim();
mkdirSync(join(DEV, "deploy"), { recursive: true }); mkdirSync(STATE);
for (const d of ["origin.git", "dev.git"]) spawnSync("git", ["init", "-q", "--bare", "-b", "main", join(RIG, d)]);
g(DEV, "init", "-q", "-b", "main");
writeFileSync(join(DEV, "sync.ts"), 'import { appendFileSync } from "node:fs";\nappendFileSync(process.env.RIG + "/sync.log", process.argv[2] + "\\n");\n');
writeFileSync(join(DEV, "deploy/a.js"), "1\n");
g(DEV, "add", "."); g(DEV, "commit", "-q", "-m", "one"); g(DEV, "remote", "add", "origin", join(RIG, "dev.git")); g(DEV, "push", "-q", "-u", "origin", "main");
g(ROOT, "init", "-q", "-b", "main");
mkdirSync(join(ROOT, ".claude/skills/brain-maintenance"), { recursive: true }); mkdirSync(join(ROOT, "tools/cloud-brain"), { recursive: true });
writeFileSync(join(ROOT, ".claude/skills/brain-maintenance/oversight.md"), "# Oversight\n\n## 2026-10-13 02:51 CEST, events 5464 to 5646\n\ntext\n");
writeFileSync(join(ROOT, "tools/cloud-brain/seen.json"), JSON.stringify({ cb4: { "brain-x-issues": { hash: "aaaaaaaaaaaa0000" }, "brain-x-page": { hash: "bbbbbbbbbbbb1111" }, "brain-x-verifycheck": { hash: null } } }));
g(ROOT, "add", "."); g(ROOT, "commit", "-q", "-m", "one"); g(ROOT, "remote", "add", "origin", join(RIG, "origin.git")); g(ROOT, "push", "-q", "-u", "origin", "main");

const script = (name: string, text: string) => { const p = join(RIG, name); writeFileSync(p, text); chmodSync(p, 0o755); return p; };
const WORKTREE = script("worktree.sh", `#!/bin/bash
echo "$*" >> "$RIG/worktree.log"
case "$1" in
  --list) cat "$RIG/wt-list" 2>/dev/null;;
  --remove) if [ -f "$RIG/wt-refuse-$2" ] && [ "$3" != "--force" ]; then echo "not clean" >&2; exit 3; fi;;
  --at) mkdir -p "$RIG/root/.claude/worktrees/bm-$3"; echo "$RIG/root/.claude/worktrees/bm-$3";;
  --fresh) if [ -f "$RIG/wt-fresh-exit" ]; then echo "another token is in it" >&2; exit "$(cat "$RIG/wt-fresh-exit")"; fi; mkdir -p "$RIG/root/.claude/worktrees/bm-$2"; echo "$RIG/root/.claude/worktrees/bm-$2";;
esac
exit 0
`);
const BRAIN = script("brain.sh", `#!/bin/bash
echo "$*" >> "$RIG/brain.log"
case "$1 $2" in
  "redistil "*) if [ -f "$RIG/redistil" ]; then cat "$RIG/redistil"; else printf 'distiller abc\\n  brain-x-issues      same  aaaaaaaaaaaa\\n  brain-x-page        same  bbbbbbbbbbbb\\n'; fi;;
  "state "*) cat "$RIG/brain-state" 2>/dev/null || echo '{"workers":["brain-x-issues aaaaaaaaaaaa deployed","brain-x-page bbbbbbbbbbbb deployed","brain-x-new 999999999999 deployed","brain-core cccccccccccc deployed"]}';;
  "agent-token list") cat "$RIG/tokens-list" 2>/dev/null;;
  "agent-token revoke") echo "401: revoked";;
  "agent-token "*) echo "$2-0a0a0a";;
esac
exit 0
`);
const LOCK = script("lock.sh", `#!/bin/bash
echo "$LOCK_TOKEN $*" >> "$RIG/lock.log"
if [ -f "$RIG/lock-$2" ]; then read code text < "$RIG/lock-$2"; if [ "$code" = 0 ]; then echo "$text"; else echo "$text" >&2; fi; exit "$code"; fi
echo "$2 is not held"; exit 1
`);
const UPTIME = script("uptime.sh", `#!/bin/bash
cat "$RIG/uptime" 2>/dev/null || echo " 8:53  up 11 days, 12:46, 0 users, load averages: 1.50 2.00 2.00"
`);
const SELF = script("self.sh", `#!/bin/bash
echo "$*" >> "$RIG/self.log"
if [ -f "$RIG/self-exit-$1" ]; then echo "loop.ts: refused" >&2; exit "$(cat "$RIG/self-exit-$1")"; fi
case "$1" in
  start) echo '{"started":"tok-new"}';; resume) echo '{"resumed":"impl-aaaaaa"}';; ended) echo '{"ended":"'"$2"'","outcome":"pass"}';;
esac
`);
const AGENT = script("agent.sh", `#!/bin/bash
printf '%s\\n' "WORK=$WORK" "$@" >> "$RIG/agent.log"
while [ -f "$RIG/agent-hold" ]; do sleep 0.1; done
echo '{"session":"s","result":"the report","usd":1.5,"usage":{},"context":4242,"turns":3,"ms":61400,"legs":1}'
`);
const USAGE = script("usage.sh", "#!/bin/bash\necho '{\"requests\":5}'\n"), NEEDS = script("needs-tab.sh", "#!/bin/bash\nexit 1\n");

// ---- the tracker: issues, events with a seq, a key kept once, a run a role and round; the queue is what a test puts
type Ev = Record<string, any>;
let T: { seq: number; now: number; issues: Map<string, { issue: Ev; events: Ev[] }>; keys: Map<string, number>; queue: Ev[]; waiting: Ev[]; calls: { method: string; who: string; body: any }[]; fail: string };
const names = () => Object.fromEntries(Object.entries(JSON.parse(readFileSync(TOKENS, "utf8"))).map(([n, v]) => [v as string, n]));
const at = (id: string) => T.issues.get(id)!;
const ev = (id: string, e: Ev, holder = ME, via = "delegation:d1") => { const x = { seq: ++T.seq, id, at: T.now, ...e, by: { holder: "secret:" + holder, via } }; at(id).events.push(x); return x; };
const open = (id: string, more: Ev = {}) => { T.issues.set(id, { issue: { id, labels: [], state: "ready", kind: "task", runs: [], linked: [], ...more }, events: [] }); return ev(id, { type: "opened", key: "open/" + id }); };
const mv = (id: string, move: string, to: string, holder = ME, via?: string) => { const e = ev(id, { type: "moved", key: `k/${id}/${move}/${T.seq}`, move, from: at(id).issue.state, to }, holder, via); at(id).issue.state = to; return e; };
const cost = (id: string, c: Ev, holder = ME) => {
  const r = { how: "fresh", seconds: 0, context: 0, token: "impl-aaaaaa", agent: HOST + ":999999", round: 1, ...c }, { key, ...kept } = r;
  const e = ev(id, { type: "cost", key: key || `cost/${id}/${r.role}/${r.round}/${r.token}${r.outcome === "running" ? "" : "/end"}`, ...kept }, holder);
  at(id).issue.runs = [...at(id).issue.runs.filter((x: Ev) => !(x.role === r.role && x.round === r.round)), { ...kept, seq: e.seq, at: e.at }];
  return e;
};
const note = (id: string, key: string, body: string, holder = ME, via?: string) => ev(id, { type: "commented", key, body }, holder, via);
const label = (id: string, add: string[], holder = ME, via?: string) => { at(id).issue.labels = [...at(id).issue.labels, ...add]; return ev(id, { type: "labelled", key: `l/${id}/${T.seq}`, add, remove: [] }, holder, via); };
const Q = (id: string, what: string, more: Ev = {}) => { const i = at(id).issue; T.queue.push({ id, do: what, kind: i.kind, state: i.state, title: id, labels: i.labels, for: "loop", since: 1000, late: false, ...more }); };
const Wt = (id: string, why: string, more: Ev = {}) => { const i = at(id).issue; T.waiting.push({ id, kind: i.kind, state: i.state, why, since: 1000, ...more }); };
const server = Bun.serve({ port: 0, hostname: "127.0.0.1", async fetch(req) {
  const url = new URL(req.url), method = url.pathname.replace("/xrpc/com.lopecode.brain.issue.", ""), who = names()[(req.headers.get("authorization") || "").replace("Bearer ", "")];
  const body = req.method === "POST" ? await req.json() : null;
  T.calls.push({ method, who, body });
  if (!who) return Response.json({ error: "AuthRequired" }, { status: 401 });
  if (T.fail === method) return Response.json({ error: "Down" }, { status: 502 });
  if (method === "queue") return Response.json({ seq: T.seq, now: T.now, queue: T.queue, waiting: T.waiting, more: false });
  if (method === "list") return Response.json({ issues: [...T.issues.values()].map((i) => i.issue).filter((i) => i.labels.includes(url.searchParams.get("label"))), more: false });
  if (method === "sync") { const all = [...T.issues.values()].flatMap((i) => i.events).filter((e) => e.seq > Number(url.searchParams.get("after"))).sort((a, b) => a.seq - b.seq), page = all.slice(0, 4); return Response.json({ seq: T.seq, events: page, more: all.length > page.length }); }
  const id = body ? body.id : url.searchParams.get("id"), i = T.issues.get(id);
  if (!i) return Response.json({ error: "NotFound", message: "no such issue" }, { status: 404 });
  if (method === "get") return Response.json({ issue: i.issue, children: [], events: i.events });
  if (T.keys.has(body.key)) return Response.json({ id, seq: T.keys.get(body.key), duplicate: true });
  const { key, id: _, ...rest } = body;
  let e: Ev;
  if (method === "cost") e = cost(id, { key, ...rest }, who);
  else if (method === "move") { e = ev(id, { type: "moved", key, move: rest.to, from: i.issue.state, ...rest }, who); i.issue.state = rest.to; }
  else if (method === "comment") e = ev(id, { type: "commented", key, ...rest }, who);
  else return Response.json({ error: "NotFound" }, { status: 404 });
  T.keys.set(key, e.seq);
  return Response.json({ id, seq: e.seq, event: e });
} });
afterAll(() => { server.stop(true); rmSync(RIG, { recursive: true, force: true }); });

const KEEP = ["worktree.sh", "brain.sh", "lock.sh", "uptime.sh", "self.sh", "agent.sh", "usage.sh", "needs-tab.sh", "root", "state", "origin.git", "dev.git"];
// The events of a test are before the last heading of oversight.md (event 5646) unless it asks for them after it.
function fresh(seq = 100) {
  T = { seq, now: 1791874000000, issues: new Map(), keys: new Map(), queue: [], waiting: [], calls: [], fail: "" };
  for (const f of readdirSync(RIG)) if (!KEEP.includes(f)) rmSync(join(RIG, f), { recursive: true, force: true });
  rmSync(LOOP, { recursive: true, force: true });
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "impl-aaaaaa": "v-impl-aaaaaa" }));
  writeFileSync(join(STATE, "cb4-issues-tokens.json"), "{}");
}
const flag = (name: string, text = "") => writeFileSync(join(RIG, name), text);
const log = (name: string) => (existsSync(join(RIG, name + ".log")) ? readFileSync(join(RIG, name + ".log"), "utf8").trim().split("\n") : []);
const cli = async (args: string[], env: Record<string, string> = {}) => {
  const { LOOP_TOKEN: _, ...base } = process.env;
  const p = Bun.spawn(["bun", tool, ...args], { env: { ...base, LOOP_TOKEN: ME, RIG, LOOP_ROOT: ROOT, BRAIN_STATE_DIR: STATE, ISSUE_AS_BASE: `http://127.0.0.1:${server.port}`, ISSUE_AS: resolve(dirname(tool), "issue-as.sh"),
    LOOP_WORKTREE: WORKTREE, LOOP_BRAIN: "bash " + BRAIN, LOOP_LOCK: LOCK, LOOP_UPTIME: UPTIME, LOOP_SELF: SELF, LOOP_AGENT: AGENT, LOOP_USAGE: USAGE, LOOP_NEEDS_TAB: NEEDS, LOOP_HOST: HOST, ...env }, stdout: "pipe", stderr: "pipe", timeout: 30000 });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text(), code = await p.exited;
  let line: any = null;
  try { line = JSON.parse(out.split("\n")[0]); } catch {}
  return { code, out, err, line, status: out.split("\n").slice(1).join("\n") };
};
const step = (env: Record<string, string> = {}) => cli(["step"], env), dry = () => cli(["step", "--dry"]);
// The acts of a step but the start of its judgment run, which `judgment` reads: each test of a row names its own.
const acts = (line: any) => line.acts.filter((a: Ev) => a.role !== "orchestrator").map((a: Ev) => [a.act, a.id, a.role].filter(Boolean).join(" "));
const judgment = (line: any) => line.acts.filter((a: Ev) => a.role === "orchestrator");
const gave = (line: any) => line.given.map((x: Ev) => `${x.do} ${x.id} ${x.at}`);
const skipped = (line: any) => line.skipped.map((x: Ev) => `${x.do} ${x.id}`);
const writes = () => T.calls.filter((c) => c.body);
const events = (id: string, type?: string) => at(id).events.filter((e) => !type || e.type === type);
const lines = () => readFileSync(join(LOOP, "steps.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const status = () => readFileSync(join(LOOP, "status.md"), "utf8");
const runFile = (r: Ev) => { mkdirSync(RUNS, { recursive: true }); writeFileSync(join(RUNS, r.token + ".json"), JSON.stringify({ id: "a", role: "implementer", round: 1, host: HOST, pid: 999999, how: "fresh", session: "s", as: ME, made: true, agent: HOST + ":999999", ...r })); };
const file = (token: string): any => { try { return JSON.parse(readFileSync(join(RUNS, token + ".json"), "utf8")); } catch { return null; } };
const until = async (what: () => any, ms = 15000) => { for (const end = Date.now() + ms; Date.now() < end; await Bun.sleep(50)) { const v = what(); if (v) return v; } throw new Error("waited " + ms + " ms"); };
// An issue as a writer of round `round` left it: started by `starter`, sent back round - 1 times.
const worked = (id: string, round = 1, starter = "impl-aaaaaa", more: Ev = {}) => { open(id, more); mv(id, "start", "in-progress", starter); for (let n = 1; n < round; n++) { mv(id, "submit", "in-review", starter); mv(id, "rework", "in-progress"); } };

test("judged: an entry is given once, a verdict is its first word, and with none the run its given comment names is read", () => {
  const c = (key: string, body: string) => ({ type: "commented", key, body }), run = (outcome?: string) => () => (outcome ? { outcome } : undefined);
  expect([givenKey("a", "round", 7), givenKey("a", "round", 7, true), verdictKey("a", "round", 7)]).toEqual(["orch/a/given-round-7", "orch/a/given-round-7-2", "orch/a/verdict-round-7"]);
  const given = c(givenKey("a", "round", 7), "given round at 7 to orch-bbbbbb, its run on b"), again = c(givenKey("a", "round", 7, true), "given round at 7 to orch-cccccc, its run on a");
  expect(judged([], "a", "round", 7, run())).toBe("give");
  // A comment of another <at>, or of another <do>, is not this entry's.
  expect(judged([c(givenKey("a", "round", 6), "x"), c(givenKey("a", "dead", 7), "x")], "a", "round", 7, run())).toBe("give");
  expect(["go-on", "go-on\nwhy", "not-answered", "left: a reason", "", "goon"].map((b) => judged([given, c(verdictKey("a", "round", 7), b)], "a", "round", 7, run()))).toEqual(["go-on", "go-on", "not-answered", "left", "left", "left"]);
  expect([undefined, "running", "stopped", "done"].map((o) => judged([given], "a", "round", 7, run(o)))).toEqual(["runs", "runs", "again", "judged"]);
  expect(["running", "stopped", "done"].map((o) => judged([given, again], "a", "round", 7, run(o)))).toEqual(["runs", "died-twice", "judged"]);
  const asked: string[][] = [];
  judged([given, again], "a", "round", 7, (t, on) => { asked.push([t, on]); return undefined; });
  expect(asked).toEqual([["orch-cccccc", "a"]]);
  expect(judged([c(givenKey("a", "round", 7), "given round at 7 to no run: a judgment run is started from st-4-orchestrator-brief on")], "a", "round", 7, run("stopped"))).toBe("no-run");
});

test("health: a Worker that is not `same` or not at its hash, or a lock cb4 did not say, and no agent of an issue is started; it is given at each such step with no comment, to a judgment run on no issue", async () => {
  fresh();
  open("a", { state: "in-review" }); Q("a", "review");
  let r = await dry();
  expect([r.code, r.line.health, acts(r.line), r.line.dry]).toEqual([0, { ok: true }, ["start a reviewer"], true]);
  expect(log("lock")).toEqual([ME + " show land", ME + " show cb4"]);
  flag("redistil", "distiller abc\n  brain-x-issues      changes  aaaaaaaaaaaa -> dddddddddddd\n  brain-x-page        same  bbbbbbbbbbbb\n");
  T.calls = [];
  for (const n of [1, 2]) {
    r = await step();
    expect([r.code, r.line.health, r.line.acts, r.line.given]).toEqual([0, { ok: false, failed: ["redistil: brain-x-issues is changes"] }, [{ act: "start", role: "orchestrator", entries: 1, exit: 0, token: "orch-0a0a0a" }], [{ do: "unhealthy", failed: ["redistil: brain-x-issues is changes"] }]]);
    expect([lines().length, log("self"), writes()]).toEqual([n, Array(n).fill("start --role orchestrator --token orch-0a0a0a --give unhealthy (redistil: brain-x-issues is changes)"), []]);
  }
  expect(status()).toContain("- not healthy: redistil: brain-x-issues is changes");
  // One read says the token is answered; no issue and no list was read, and the line has no seq.
  expect([r.line.seq, T.calls.map((c) => c.method)]).toEqual([0, ["queue", "queue"]]);
  rmSync(join(RIG, "redistil"));
  flag("brain-state", '{"workers":["brain-x-issues ffffffffffff deployed","brain-x-page bbbbbbbbbbbb deployed"]}');
  expect((await dry()).line.health).toEqual({ ok: false, failed: ["state: brain-x-issues is at ffffffffffff, and seen.json of origin/main has aaaaaaaaaaaa"] });
  flag("brain-state", "502 bad gateway");
  expect((await dry()).line.health.failed).toEqual(["brain.ts state: 502 bad gateway"]);
  rmSync(join(RIG, "brain-state"));
  flag("redistil", '{"error":"x"}');
  expect((await dry()).line.health.failed).toEqual(['brain.ts redistil: {"error":"x"}']);
  rmSync(join(RIG, "redistil"));
  flag("lock-cb4", "2 lock.sh: cb4 did not say who holds cb4 [502]");
  expect((await dry()).line.health.failed).toEqual(["lock.sh show cb4: exit 2 lock.sh: cb4 did not say who holds cb4 [502]"]);
  // A lock that is held, or whose holder's time ended, is healthy.
  flag("lock-cb4", "0 cb4 is held by impl-x since 08:00, until 08:10"); flag("lock-land", "1 land is not held; impl-y's lock ended at 08:00");
  r = await dry();
  expect([r.line.health, r.line.land, acts(r.line)]).toEqual([{ ok: true }, undefined, ["start a reviewer"]]);
});

test("health: the two pulls are made by a step and not by a dry one; a refusal that names deploy/ puts it back, pulls and runs sync.ts; another refusal is a note", async () => {
  fresh();
  const other = join(RIG, "other"), otherDev = join(RIG, "other-dev");
  spawnSync("git", ["clone", "-q", join(RIG, "origin.git"), other]); spawnSync("git", ["clone", "-q", join(RIG, "dev.git"), otherDev]);
  writeFileSync(join(other, "new.txt"), "x\n"); g(other, "add", "."); g(other, "commit", "-q", "-m", "two"); g(other, "push", "-q", "origin", "main");
  writeFileSync(join(otherDev, "deploy/a.js"), "2\n"); g(otherDev, "add", "."); g(otherDev, "commit", "-q", "-m", "two"); g(otherDev, "push", "-q", "origin", "main");
  writeFileSync(join(DEV, "deploy/a.js"), "a read of cb4\n"); writeFileSync(join(DEV, "deploy/untracked.js"), "x\n");
  const before = [head(ROOT), head(DEV)];
  let r = await dry();
  expect([r.line.health, head(ROOT), head(DEV), readFileSync(join(DEV, "deploy/a.js"), "utf8")]).toEqual([{ ok: true }, ...before, "a read of cb4\n"]);
  r = await step();
  expect([r.line.health, head(ROOT), head(DEV), readFileSync(join(DEV, "deploy/a.js"), "utf8"), existsSync(join(DEV, "deploy/untracked.js"))]).toEqual([{ ok: true }, head(other), head(otherDev), "2\n", false]);
  expect(log("sync")).toEqual([CB4]);
  expect(status()).toContain("- cloud-brain-dev of the main checkout: deploy/ was put back for the pull, and sync.ts read cb4 again");
  expect(status()).not.toContain("was not pulled");
  // The main checkout has a commit origin/main has not, and origin/main one it has not: refused, said, and the step goes on.
  writeFileSync(join(ROOT, "local.txt"), "x\n"); g(ROOT, "add", "local.txt"); g(ROOT, "commit", "-q", "-m", "local");
  writeFileSync(join(other, "new.txt"), "y\n"); g(other, "add", "."); g(other, "commit", "-q", "-m", "three"); g(other, "push", "-q", "origin", "main");
  open("a", { state: "in-review" }); Q("a", "review");
  r = await step();
  expect([r.line.health, acts(r.line), head(ROOT, "origin/main")]).toEqual([{ ok: true }, ["start a reviewer"], head(other)]);
  expect(status()).toMatch(/- the main checkout was not pulled: .+/);
  // cloud-brain-dev behind what its origin has, with a commit of its own: both are said.
  writeFileSync(join(otherDev, "b.txt"), "x\n"); g(otherDev, "add", "."); g(otherDev, "commit", "-q", "-m", "three"); g(otherDev, "push", "-q", "origin", "main");
  writeFileSync(join(DEV, "c.txt"), "x\n"); g(DEV, "add", "c.txt"); g(DEV, "commit", "-q", "-m", "local");
  r = await step();
  expect(status()).toMatch(/- cloud-brain-dev of the main checkout was not pulled: .+/);
  expect(status()).toMatch(/- cloud-brain-dev of the main checkout: 1 commits behind its origin\/main, and the commit origin\/main of lopecode-dev records \([0-9a-f]{7}\) is in it/);
  g(ROOT, "reset", "-q", "--hard", "origin/main"); g(DEV, "reset", "-q", "--hard", "origin/main");
});

test("`step --for event` and `--for run`: no pull, no `worktree.sh --list`, no `redistil` and no `state`; the locks are read and the queue is acted on; `--for clock` is the whole step", async () => {
  fresh();
  const other = join(RIG, "other-for");
  spawnSync("git", ["clone", "-q", join(RIG, "origin.git"), other]);
  writeFileSync(join(other, "for.txt"), "x\n"); g(other, "add", "."); g(other, "commit", "-q", "-m", "for"); g(other, "push", "-q", "origin", "main");
  const before = head(ROOT);
  open("t-done", { state: "done" }); open("a", { state: "in-review" }); Q("a", "review");
  flag("wt-list", "t-done clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=bm/t-done head=abc1234\n");
  // A Worker that is not `same`: a step that is not for the clock does not read it.
  flag("redistil", "distiller abc\n  brain-x-issues      changes  aaaaaaaaaaaa -> dddddddddddd\n");
  for (const why of ["event", "run"]) {
    for (const f of ["brain.log", "worktree.log", "lock.log"]) rmSync(join(RIG, f), { force: true });
    const r = await cli(["step", "--for", why]);
    expect([r.code, r.line.for, r.line.health, head(ROOT)]).toEqual([0, why, { ok: true }, before]);
    expect(acts(r.line)).toEqual(["start a reviewer"]);
    expect([log("brain").filter((l) => /^(redistil|state)/.test(l)), log("worktree").filter((l) => /--list|--remove/.test(l)), log("lock")]).toEqual([[], [], [ME + " show land", ME + " show cb4"]]);
    expect(status()).toContain(`- a step for ${why === "run" ? "a run that ended" : "an event"}: no pull, no removal of a worktree, no \`redistil\` and no \`state\`; the locks were read`);
    expect(last(lines()).for).toBe(why);
  }
  // A lock cb4 did not say is not healthy in a step for an event too.
  flag("lock-cb4", "2 lock.sh: cb4 did not say who holds cb4 [502]");
  let r = await cli(["step", "--for", "event"]);
  expect(r.line.health).toEqual({ ok: false, failed: ["lock.sh show cb4: exit 2 lock.sh: cb4 did not say who holds cb4 [502]"] });
  rmSync(join(RIG, "lock-cb4"));
  for (const f of ["brain.log", "worktree.log"]) rmSync(join(RIG, f), { force: true });
  r = await cli(["step", "--for", "clock"]);
  expect([r.code, "for" in r.line, r.line.health, head(ROOT) === head(other)]).toEqual([0, false, { ok: false, failed: ["redistil: brain-x-issues is changes"] }, true]);
  expect([log("brain").filter((l) => /^(redistil|state)/.test(l)).length, log("worktree").filter((l) => /--list|--remove/.test(l))]).toEqual([2, ["--list", "--remove t-done"]]);
  const n = lines().length;
  for (const bad of [["step", "--for"], ["step", "--for", "soon"], ["step", "--for", "--dry"], ["step", "event"]]) {
    const b = await cli(bad);
    expect([b.code, b.out, b.err.trim()], bad.join(" ")).toEqual([2, "", "loop.ts: step [--dry] [--for clock|event|run]"]);
  }
  expect(lines().length).toBe(n);
  r = await cli(["step", "--dry", "--for", "event"]);
  expect([r.code, r.line.dry, r.line.for, lines().length]).toEqual([0, true, "event", n]);
  g(ROOT, "reset", "-q", "--hard", "origin/main");
});

test("health: a worktree nobody is in is removed when its issue has ended, with a comment for a topic's and none for a view; unlanded work is named and left", async () => {
  fresh();
  const c = "changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0", l = (name: string, state = "clean", counts = c, occupant = "-") => `${name} ${state} ${counts} occupant=${occupant} branch=bm/${name} head=abc1234`;
  for (const [id, state] of [["t-done", "done"], ["t-work", "in-progress"], ["t-busy", "done"], ["t-dirty", "rejected"], ["v-done", "done"], ["v-rev", "in-review"], ["v-copy", "done"], ["v-own", "done"], ["p-idle", "awaiting-approval"], ["p-run", "awaiting-approval"]]) open(id, { state });
  cost("p-run", { role: "approver", outcome: "running", token: "appr-aaaaaa", agent: "otherhost:1" });
  flag("wt-list", [l("orch-testhost"), l("over-testhost", "not-clean"), l("t-done"), l("t-done.2"), l("t-work"), l("t-busy", "clean", c, "impl-aaaaaa"), l("t-dirty", "not-clean", "changed=1 untracked=0 ahead=2 dev-changed=0 dev-ahead=0"),
    l("rev-v-done"), l("rev-v-rev"), l("rev-v-copy", "not-clean", "changed=0 untracked=1 ahead=0 dev-changed=0 dev-ahead=0"), l("rev-v-own", "not-clean", "changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0"), l("rev-v-none"),
    l("appr-p-idle", "not-clean", "changed=0 untracked=1 ahead=0 dev-changed=0 dev-ahead=0"), l("appr-p-run"), "odd not-a-worktree"].join("\n") + "\n");
  const removed = ["t-done", "t-done.2", "rev-v-done", "rev-v-copy", "rev-v-none", "appr-p-idle"];
  let r = await dry();
  expect(r.line.acts).toEqual(removed.map((tree) => ({ act: "worktree-remove", tree, ...(["rev-v-copy", "appr-p-idle"].includes(tree) ? { force: true } : {}) })));
  expect([log("worktree"), writes()]).toEqual([["--list"], []]);
  r = await step();
  expect(log("worktree").slice(2)).toEqual(["--remove t-done", "--remove t-done.2", "--remove rev-v-done", "--remove rev-v-copy --force", "--remove rev-v-none", "--remove appr-p-idle --force"]);
  expect(events("t-done", "commented").map((e) => [e.key, e.body])).toEqual([1, 2].map((n) => [`orch/t-done/worktree-removed-${n}`, "worktree removed " + JSON.stringify({ topic: "t-done", machine: HOST, path: join(ROOT, ".claude/worktrees/bm-t-done" + (n === 2 ? ".2" : "")) })]));
  expect(writes().length).toBe(2);
  expect(status()).toContain("- the worktree bm-t-dirty is not clean and nobody is in it: changed=1 untracked=0 ahead=2 dev-changed=0 dev-ahead=0");
  expect(status()).toContain("- the worktree bm-rev-v-own is not clean and nobody is in it: changed=0 untracked=0 ahead=1 dev-changed=0 dev-ahead=0");
  // A removal that is refused is said in its act, and no comment is written for it.
  fresh(); open("t-done", { state: "done" }); flag("wt-list", l("t-done") + "\n"); flag("wt-refuse-t-done");
  r = await step();
  expect([r.line.acts, writes()]).toEqual([[{ act: "worktree-remove", tree: "t-done", exit: 3, said: "not clean" }], []]);
});

test("runs: `ended` for a run of this machine that returned or whose process is gone, and the `running` event a start did not write", async () => {
  fresh();
  open("a", { state: "in-progress" });
  const p = Bun.spawn(["bash", "-c", "sleep 20; true", "loop-run-impl-cccccc"], { stdout: "ignore", stderr: "ignore" }), o = Bun.spawn(["bash", "-c", "sleep 20; true", "loop-run-over-aaaaaa"], { stdout: "ignore", stderr: "ignore" });
  await Bun.sleep(200);
  runFile({ token: "impl-aaaaaa", running: 5 }); writeFileSync(join(RUNS, "impl-aaaaaa.result.json"), "{}");
  runFile({ token: "impl-bbbbbb", running: 5 });
  runFile({ token: "impl-cccccc", pid: p.pid, agent: `${HOST}:${p.pid}` });
  runFile({ token: "impl-dddddd", host: "otherhost", running: 5 });
  // A token that was kept for a round to come: ended when its issue is done, and not while it is at work.
  open("z", { state: "done" });
  runFile({ token: "impl-eeeeee", running: 5, ended: { at: 1, outcome: "changes", token: "kept" } });
  runFile({ token: "impl-ffffff", id: "z", running: 5, ended: { at: 1, outcome: "pass", token: "kept" } });
  runFile({ token: "impl-000000", id: "z", running: 5, ended: { at: 1, outcome: "pass", token: "ended" } });
  // An overseer is on no issue and has no event: one that runs is left as it is.
  runFile({ token: "over-aaaaaa", role: "overseer", id: "", pid: o.pid, agent: `${HOST}:${o.pid}`, running: 0 });
  const want = [{ act: "ended", token: "impl-aaaaaa", id: "a", role: "implementer", why: "its process returned" }, { act: "ended", token: "impl-bbbbbb", id: "a", role: "implementer", why: "its process is gone and left no result" }, { act: "running", id: "a", role: "implementer", token: "impl-cccccc" }, { act: "token-ended", token: "impl-ffffff", id: "z" }];
  let r = await dry();
  expect([r.line.acts, log("self"), writes()]).toEqual([want, [], []]);
  r = await step();
  const made = events("a", "cost")[0];
  expect(r.line.acts).toEqual([{ ...want[0], exit: 0, outcome: "pass" }, { ...want[1], exit: 0, outcome: "pass" }, { ...want[2], event: made.seq }, want[3]]);
  expect(log("self")).toEqual(["ended impl-aaaaaa", "ended impl-bbbbbb"]);
  expect([log("brain").filter((l) => l.includes("revoke")), file("impl-ffffff").ended.token, file("impl-eeeeee").ended.token]).toEqual([["agent-token revoke impl-ffffff"], "ended", "kept"]);
  // At the next step neither is written again (the stand-in for `ended` marks no file, so those two are named again).
  expect(acts((await step()).line)).toEqual(["ended a implementer", "ended a implementer"]);
  expect(made).toMatchObject({ key: "cost/a/implementer/1/impl-cccccc", role: "implementer", round: 1, outcome: "running", token: "impl-cccccc", session: "s", agent: `${HOST}:${p.pid}` });
  expect(file("impl-cccccc").running).toBe(made.seq);
  expect(status()).toContain(`## What runs\n\n- implementer of a, round 1, token impl-cccccc, ${HOST}:${p.pid}\n- overseer, round 1, token over-aaaaaa, ${HOST}:${o.pid}\n`);
  p.kill(); o.kill(); await p.exited; await o.exited;
});

test("a `running` run of this machine whose process is gone and that has no file is written with what it left, and the issue gets `back`; one of another machine is left", async () => {
  fresh();
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME }));
  worked("a"); const ra = cost("a", { role: "implementer", outcome: "running" }); Wt("a", "work");
  worked("b"); cost("b", { role: "implementer", outcome: "running", token: "impl-bbbbbb", agent: "otherhost:5" }); Wt("b", "work");
  worked("c", 1, "impl-cccccc"); const submit = mv("c", "submit", "in-review", "impl-cccccc"); cost("c", { role: "implementer", outcome: "running", token: "impl-cccccc" }); Q("c", "review");
  let r = await dry();
  // Dry, nothing is written, so the run of `a` still reads `running` and no `back` is named.
  expect(acts(r.line)).toEqual(["stopped c implementer", "start c reviewer", "stopped a implementer"]);
  expect(r.status).toContain("- implementer of b, round 1, token impl-bbbbbb, otherhost:5: another machine's");
  r = await step();
  expect(acts(r.line)).toEqual(["stopped c implementer", "start c reviewer", "stopped a implementer", "back a implementer"]);
  expect(events("a", "cost")[1]).toMatchObject({ key: "cost/a/implementer/1/impl-aaaaaa/end", outcome: "stopped", token: "impl-aaaaaa", agent: HOST + ":999999" });
  expect(events("c", "cost")[1]).toMatchObject({ key: "cost/c/implementer/1/impl-cccccc/end", outcome: "in-review", event: submit.seq });
  expect([at("a").issue.runs[0].outcome, at("a").issue.state, at("b").issue.state, at("b").issue.runs[0].outcome]).toEqual(["stopped", "ready", "in-progress", "running"]);
  expect(last(events("a", "moved"))).toMatchObject({ key: `orch/a/back/impl-aaaaaa/${events("a", "moved")[0].seq}`, to: "ready" });
  expect(last(events("a", "moved")).reason).toContain("its run of round 1 ended stopped. Its token impl-aaaaaa is ended.");
  expect(log("brain").filter((l) => l.includes("revoke"))).toEqual(["agent-token revoke impl-aaaaaa"]);
  expect(ra.seq).toBeLessThan(events("a", "cost")[1].seq);
  // A run of another machine that has read `running` for 4 hours is named so.
  T.now += 4 * 3600000;
  expect((await dry()).status).toContain("otherhost:5: another machine's, `running` for 4 hours or more");
});
const last = <X>(a: X[]) => a[a.length - 1];

test("`review`: a reviewer is started, also beside a running writer; none beside a running reviewer; at 2 dead runs none, and the entry is given as `dead`", async () => {
  fresh();
  for (const id of ["a", "b", "c", "d"]) { worked(id); mv(id, "submit", "in-review", "impl-aaaaaa"); Q(id, "review"); }
  cost("a", { role: "implementer", outcome: "running", agent: "otherhost:1" });
  cost("b", { role: "reviewer", outcome: "running", token: "rev-bbbbbb", agent: "otherhost:1" });
  cost("c", { role: "reviewer", outcome: "stopped", token: "rev-cccccc" }); const dead = cost("c", { role: "reviewer", outcome: "stopped", token: "rev-dddddd" });
  cost("d", { role: "reviewer", outcome: "stopped", token: "rev-eeeeee" });
  let r = await dry();
  expect([acts(r.line), gave(r.line), r.line.skipped]).toEqual([["start a reviewer", "start d reviewer"], [`dead c ${dead.seq}`], [{ id: "b", do: "review", why: "a reviewer of it runs" }]]);
  r = await step();
  expect(log("self")).toEqual(["start a --role reviewer", "start d --role reviewer", `start c --role orchestrator --token orch-0a0a0a --give dead c (event ${dead.seq})`]);
  expect(r.line.acts[0]).toEqual({ act: "start", id: "a", role: "reviewer", exit: 0, token: "tok-new" });
  expect(events("c", "commented").map((e) => e.key)).toEqual([`orch/c/given-dead-${dead.seq}`]);
  // With `go-on` for the last of the dead runs, one run more; when that one dies the count has a later event.
  note("c", `orch/c/verdict-dead-${dead.seq}`, "go-on\none more");
  r = await dry();
  expect([acts(r.line), gave(r.line)]).toEqual([["start a reviewer", "start c reviewer", "start d reviewer"], []]);
  const third = cost("c", { role: "reviewer", outcome: "stopped", token: "rev-ffffff" });
  r = await dry();
  expect([acts(r.line), gave(r.line)]).toEqual([["start a reviewer", "start d reviewer"], [`dead c ${third.seq}`]]);
});

test("`round`: `resume` for the role of the issue; nothing with a waiter or a running writer; an agent of a session is left while its token is live", async () => {
  fresh();
  worked("a", 2); cost("a", { role: "implementer", outcome: "changes" }); Q("a", "round");
  worked("b", 2); cost("b", { role: "implementer", outcome: "changes" }); Q("b", "round", { waiter: { actor: "x", holder: "secret:impl-aaaaaa", until: T.now + 1 } });
  worked("c", 2); cost("c", { role: "implementer", round: 2, outcome: "running", agent: "otherhost:1" }); Q("c", "round");
  worked("d", 2); Q("d", "round");
  worked("e", 2, "impl-eeeeee"); Q("e", "round");
  worked("f", 2); cost("f", { role: "implementer", round: 2, outcome: "stopped", how: "resumed", key: "cost/f/implementer/2/impl-aaaaaa/resumed-1/end" }); const dead = cost("f", { role: "implementer", round: 2, outcome: "stopped", how: "resumed", key: "cost/f/implementer/2/impl-aaaaaa/resumed-2/end" }); Q("f", "round");
  open("g", { kind: "project", state: "open" }); mv("g", "spec", "spec", "spec-aaaaaa"); mv("g", "submit-spec", "spec-review", "spec-aaaaaa"); mv("g", "respec", "spec"); cost("g", { role: "spec-writer", outcome: "changes", token: "spec-aaaaaa" }); Q("g", "round");
  worked("h", 2, "dig-aaaaaa", { labels: ["digest"] }); cost("h", { role: "digest", outcome: "changes", token: "dig-aaaaaa" }); Q("h", "round");
  const r = await step();
  expect(log("self")).toEqual(["resume a --role implementer", "resume e --role implementer", "resume g --role spec-writer", "resume h --role digest", `start f --role orchestrator --token orch-0a0a0a --give dead f (event ${dead.seq})`]);
  expect(r.line.acts[0]).toEqual({ act: "resume", id: "a", role: "implementer", exit: 0, token: "impl-aaaaaa" });
  expect(gave(r.line)).toEqual([`dead f ${dead.seq}`]);
  expect(r.line.skipped).toEqual([{ id: "b", do: "round", why: "its writer waits for the review and takes the round itself" }, { id: "c", do: "round", why: "a writer of it runs and takes the round itself" },
    { id: "d", do: "round", why: "loop.ts started no implementer on it and the token of its starter, impl-aaaaaa, reads the tracker" }]);
  // After 4 hours such an issue is named for a session.
  T.queue = []; Q("d", "round", { since: T.now - 4 * 3600000 });
  expect((await dry()).status).toContain("- d: at in-progress for 4 hours or more with an agent no run of the record names (impl-aaaaaa)");
});

test("`round` at 3 `rework` moves is given once; with `go-on` it is a resume; after one more `rework` it is given again", async () => {
  fresh();
  worked("a", 4); cost("a", { role: "implementer", round: 3, outcome: "changes" }); Q("a", "round");
  worked("b", 3); cost("b", { role: "implementer", round: 2, outcome: "changes" }); Q("b", "round");
  const at3 = last(events("a", "moved")).seq;
  let r = await step();
  expect([acts(r.line), r.line.given]).toEqual([["resume b implementer"], [{ id: "a", do: "round", at: at3, key: `orch/a/given-round-${at3}`, event: last(events("a")).seq }]]);
  expect(last(events("a", "commented")).body).toBe(`given round at ${at3} to orch-0a0a0a, its run on a`);
  expect([judgment(r.line), last(log("self")), log("brain").filter((l) => /^agent-token/.test(l))]).toEqual([[{ act: "start", id: "a", role: "orchestrator", entries: 1, exit: 0, token: "orch-0a0a0a" }], `start a --role orchestrator --token orch-0a0a0a --give round a (event ${at3})`, ["agent-token orch judgment:a"]]);
  expect(status()).toContain(`## Given to the judgment at this step\n\n- round a (event ${at3})`);
  r = await step();
  // The comment names a run, which has no event yet: it is taken to run, and the entry is given to no second.
  expect([acts(r.line), judgment(r.line), r.line.given, events("a", "commented").length]).toEqual([["resume b implementer"], [], [], 1]);
  note("a", `orch/a/verdict-round-${at3}`, "go-on\neach review closed what the one before found");
  r = await step();
  expect([acts(r.line), r.line.given]).toEqual([["resume a implementer", "resume b implementer"], []]);
  mv("a", "submit", "in-review", "impl-aaaaaa"); const at4 = mv("a", "rework", "in-progress").seq;
  r = await step();
  expect([acts(r.line), gave(r.line)]).toEqual([["resume b implementer"], [`round a ${at4}`]]);
});

test("`round` whose last run ended `no-submit` is given; with `go-on` it is a resume; after a second `no-submit` of the round it is given again, as `round` and not as `dead`", async () => {
  fresh();
  worked("a", 2); const first = cost("a", { role: "implementer", round: 2, outcome: "no-submit" }); Q("a", "round");
  let r = await step();
  expect([acts(r.line), gave(r.line)]).toEqual([[], [`round a ${first.seq}`]]);
  expect((await step()).line.given).toEqual([]);
  note("a", `orch/a/verdict-round-${first.seq}`, "go-on");
  expect(acts((await step()).line)).toEqual(["resume a implementer"]);
  const second = cost("a", { role: "implementer", round: 2, outcome: "no-submit", how: "resumed", key: `cost/a/implementer/2/impl-aaaaaa/resumed-${first.seq}/end` });
  r = await step();
  expect([acts(r.line), gave(r.line)]).toEqual([[], [`round a ${second.seq}`]]);
});

test("labeled `needs-owner`: nothing until the owner has written after the label; then it is given, and with `not-answered` again only for a later event of his", async () => {
  fresh();
  worked("a", 2); cost("a", { role: "implementer", outcome: "changes" }); label("a", ["needs-owner"]); note("a", "orch/a/decision-1", "for the owner"); Q("a", "round");
  open("b", { state: "triaged" }); label("b", ["needs-owner"]); Wt("b", "owner");
  open("s", { state: "triaged", kind: "security" }); Wt("s", "owner");
  open("o", { state: "triaged", labels: ["needs-owner"] }); at("o").events[0].labels = ["needs-owner"]; Wt("o", "owner");
  let r = await step();
  expect([r.line.acts, r.line.given, r.line.skipped, writes()]).toEqual([[], [], [], []]);
  expect(status()).toContain("## What waits for the owner\n\n- a (in-progress, a round, labeled needs-owner)\n- b (triaged)\n- s (triaged)\n- o (triaged)\n");
  const his = note("a", "page/a/1", "do the smaller one", "owner", "session"), out = note("b", "out/b/1", "he said: go on", "out-5f56b2"), atOpen = note("o", "page/o/1", "yes", "owner", "session");
  r = await step();
  expect([acts(r.line), judgment(r.line).map((a: Ev) => [a.id, a.entries]), gave(r.line)]).toEqual([[], [["a", 3]], [`answer a ${his.seq}`, `answer b ${out.seq}`, `answer o ${atOpen.seq}`]]);
  expect(["a", "b", "o"].map((id) => last(events(id, "commented")).body)).toEqual([`given answer at ${his.seq} to orch-0a0a0a, its run on a`, `given answer at ${out.seq} to orch-0a0a0a, its run on a`, `given answer at ${atOpen.seq} to orch-0a0a0a, its run on a`]);
  expect((await step()).line.given).toEqual([]);
  note("a", `orch/a/verdict-answer-${his.seq}`, "not-answered");
  note("a", "impl/a/x", "a comment of an agent");
  expect((await step()).line.given).toEqual([]);
  const later = note("a", "page/a/2", "the first", "owner", "session");
  expect(gave((await step()).line)).toEqual([`answer a ${later.seq}`]);
});

test("`ready` and `finish`: the move, with the queue's seq in its reason; nothing of either when dry", async () => {
  fresh();
  open("a", { state: "triaged" }); Q("a", "ready", { since: 1234 });
  open("p", { state: "building", kind: "project" }); Q("p", "finish", { since: 5678 });
  let r = await dry();
  expect([r.line.acts, writes(), existsSync(LOOP)]).toEqual([[{ act: "ready", id: "a" }, { act: "finish", id: "p" }], [], false]);
  const seq = T.seq;
  r = await step();
  expect(r.line.acts).toEqual([{ act: "ready", id: "a", event: seq + 1 }, { act: "finish", id: "p", event: seq + 2 }]);
  expect(events("a", "moved")[0]).toMatchObject({ key: "orch/a/ready-1234", to: "ready", reason: `waits for nothing, by the queue at ${seq}`, by: { holder: "secret:" + ME } });
  expect(events("p", "moved")[0]).toMatchObject({ key: "orch/p/finish-5678", to: "done", reason: `no part of it is open, by the queue at ${seq}` });
  expect([r.line.seq, r.line.at, lines().length]).toEqual([seq, T.now, 1]);
  // The same entries again are the same keys: nothing is written twice.
  r = await step();
  expect(r.line.acts.map((a: Ev) => a.duplicate)).toEqual([true, true]);
  expect([events("a", "moved").length, lines().length]).toEqual([1, 2]);
});

test("`start` and `spec`: an implementer, a digest writer with the label, a spec writer; none beside a running writer; at 2 dead runs none, and the entry is given as `dead`", async () => {
  fresh();
  open("a"); Q("a", "start");
  open("b", { labels: ["digest"] }); Q("b", "start");
  open("c", { kind: "project", state: "open" }); Q("c", "spec");
  open("d"); cost("d", { role: "implementer", outcome: "stopped", token: "impl-bbbbbb" }); const dd = cost("d", { role: "implementer", outcome: "no-submit", token: "impl-cccccc" }); Q("d", "start");
  open("e", { kind: "project", state: "open" }); cost("e", { role: "spec-writer", outcome: "stopped", token: "spec-bbbbbb" }); const de = cost("e", { role: "spec-writer", outcome: "stopped", token: "spec-cccccc" }); Q("e", "spec");
  open("f"); cost("f", { role: "implementer", outcome: "stopped", token: "impl-bbbbbb" }); Q("f", "start");
  open("h"); cost("h", { role: "digest", outcome: "running", token: "dig-bbbbbb", agent: "otherhost:1" }); Q("h", "start");
  open("m"); Q("m", "merge");
  const r = await step();
  expect(log("self")).toEqual(["start a --role implementer", "start b --role digest", "start c --role spec-writer", "start f --role implementer", `start d --role orchestrator --token orch-0a0a0a --give dead d (event ${dd.seq}); dead e (event ${de.seq})`]);
  expect(gave(r.line)).toEqual([`dead d ${dd.seq}`, `dead e ${de.seq}`]);
  expect(r.line.skipped).toEqual([{ id: "m", do: "merge", why: "no row of the step's table names it" }, { id: "h", do: "start", why: "a writer of it runs" }]);
});

test("in `waiting` for the owner at `awaiting-approval`: an approver is started when the round has no verdict and no approver left the issue", async () => {
  fresh();
  const waits = (id: string) => { worked(id); mv(id, "submit", "in-review", "impl-aaaaaa"); mv(id, "pass", "awaiting-approval", "rev-aaaaaa"); Wt(id, "owner"); };
  waits("a");
  waits("b"); note("b", "approver/b/verdict-1", "approver: approve\nwhy", "appr-aaaaaa");
  waits("c"); note("c", "approver/c/verdict-1", "approver: leave\nwhy", "appr-aaaaaa"); mv("c", "send-back", "in-progress"); mv("c", "submit", "in-review", "impl-aaaaaa"); mv("c", "pass", "awaiting-approval", "rev-aaaaaa");
  waits("d"); cost("d", { role: "approver", outcome: "running", token: "appr-bbbbbb", agent: "otherhost:1" });
  waits("e"); cost("e", { role: "approver", outcome: "stopped", token: "appr-cccccc" }); const dead = cost("e", { role: "approver", outcome: "stopped", token: "appr-dddddd" });
  waits("f"); mv("f", "send-back", "in-progress"); mv("f", "submit", "in-review", "impl-aaaaaa"); mv("f", "pass", "awaiting-approval", "rev-aaaaaa"); note("f", "approver/f/verdict-1", "approver: approve\nwhy", "appr-aaaaaa");
  const r = await step();
  expect(log("self")).toEqual(["start a --role approver", "start f --role approver", `start e --role orchestrator --token orch-0a0a0a --give dead e (event ${dead.seq})`]);
  expect([gave(r.line), r.line.skipped]).toEqual([[`dead e ${dead.seq}`], [{ id: "d", do: "approve", why: "an approver of it runs" }]]);
  expect(status()).toContain("## What waits for the owner\n\n- a (awaiting-approval)\n- b (awaiting-approval)\n- c (awaiting-approval)\n- d (awaiting-approval)\n- e (awaiting-approval)\n- f (awaiting-approval)\n");
});

test("in `waiting`, `work`, with no running writer and no waiter: the token is ended and the issue goes `back`; an agent of a session is left while its token is live", async () => {
  fresh();
  worked("a"); cost("a", { role: "implementer", outcome: "no-submit" }); runFile({ token: "impl-aaaaaa", ended: { at: 1, outcome: "no-submit", token: "kept" } }); Wt("a", "work");
  worked("b"); cost("b", { role: "implementer", outcome: "stopped" }); Wt("b", "work", { waiter: { actor: "x", holder: "secret:impl-aaaaaa", until: T.now + 1 } });
  worked("c"); Wt("c", "work");
  worked("d", 1, "impl-dddddd"); Wt("d", "work");
  open("e", { kind: "project", state: "open" }); mv("e", "spec", "spec", "spec-eeeeee"); cost("e", { role: "spec-writer", outcome: "stopped", token: "spec-eeeeee" }); runFile({ token: "spec-eeeeee", id: "e", role: "spec-writer", ended: { at: 1, outcome: "stopped", token: "ended" } }); Wt("e", "work");
  worked("f", 1, "impl-ffffff"); cost("f", { role: "implementer", outcome: "stopped", token: "impl-ffffff" }); runFile({ token: "impl-ffffff", id: "f", made: false, ended: { at: 1, outcome: "stopped", token: "given, not ended" } }); Wt("f", "work");
  worked("g"); cost("g", { role: "implementer", outcome: "running", agent: "otherhost:1" }); Wt("g", "work");
  // A writer that died, `back`, and a session's writer on it now: the run of the round is not its starter's.
  worked("h", 1, "impl-bbbbbb"); cost("h", { role: "implementer", outcome: "stopped", token: "impl-bbbbbb" }); mv("h", "back", "ready"); mv("h", "start", "in-progress", "impl-aaaaaa"); Wt("h", "work");
  let r = await dry();
  expect([acts(r.line), writes(), log("brain").filter((l) => l.includes("revoke"))]).toEqual([["back a implementer", "back d implementer", "back e spec-writer", "back f implementer"], [], []]);
  r = await step();
  expect(r.line.acts.map((a: Ev) => [a.id, a.token, a.revoke, typeof a.event])).toEqual([["a", "impl-aaaaaa", "ended", "number"], ["d", undefined, undefined, "number"], ["e", "spec-eeeeee", undefined, "number"], ["f", "impl-ffffff", undefined, "number"]]);
  expect(log("brain").filter((l) => l.includes("revoke"))).toEqual(["agent-token revoke impl-aaaaaa"]);
  expect(["a", "b", "c", "d", "e", "f", "g"].map((id) => at(id).issue.state)).toEqual(["ready", "in-progress", "in-progress", "ready", "open", "ready", "in-progress"]);
  expect(last(events("a", "moved"))).toMatchObject({ key: `orch/a/back/impl-aaaaaa/${events("a", "moved")[0].seq}`, reason: "A dead writer: a is at in-progress with no running implementer and no waiter; its run of round 1 ended no-submit. Its token impl-aaaaaa is ended. The next writer makes its own start." });
  expect(last(events("d", "moved")).reason).toBe("A dead writer: d is at in-progress with no running implementer and no waiter; no run of this round is in the record and its starter's token no longer reads the tracker. The next writer makes its own start.");
  expect(last(events("e", "moved")).reason).toContain("ended stopped. Its token spec-eeeeee was ended with its run. The next");
  expect(last(events("f", "moved")).reason).toContain("ended stopped. The next");
  expect(r.line.skipped).toEqual(["c", "h"].map((id) => ({ id, do: "work", why: "loop.ts started no implementer on it and the token of its starter, impl-aaaaaa, reads the tracker" })));
  expect(at("h").issue.state).toBe("in-progress");
});

// The stand-in tracker answers `sync` 4 events a page.
test("compare: the lines of a file of dry steps beside the events after the first, read through every page; its refusals", async () => {
  fresh();
  open("a", { state: "triaged" }); Q("a", "ready"); open("b"); Q("b", "start"); open("z");
  const first = await dry(), file = join(RIG, "dry.log");
  expect(acts(first.line)).toEqual(["ready a", "start b implementer"]);
  for (let n = 0; n < 5; n++) note("z", "impl/z/" + n, "x", "impl-aaaaaa");
  const made = mv("a", "ready", "ready"); T.queue = T.queue.filter((e) => e.id !== "a");
  const second = await dry();
  writeFileSync(file, first.out.split("\n")[0] + "\nloop.ts run: not a line\n" + second.out.split("\n")[0] + "\n");
  T.calls = [];
  let r = await cli(["compare", "--steps", file]);
  expect(r.code).toBe(0);
  expect(r.line).toMatchObject({ file, lines: 2, "not JSON": 1, steps: 2, from: first.line.seq, to: second.line.seq, events: 6, by: ["orch-", "out-"], unnamed: [] });
  expect(r.line.named.map((x: Ev) => [x.name, x.event && x.event.seq, x.steps])).toEqual([["ready a", made.seq, 1], ["start implementer b", null, 2]]);
  expect(T.calls.map((c) => c.method)).toEqual(["sync", "sync", "sync"]);
  expect(r.status).toContain(`## Named by a dry step and done\n\n- ready a: event ${made.seq} (moved ready by orch-aaaaaa), 0 min after the step; named by 1 step, first at event ${first.line.seq} (`);
  // With another beginning for the session's tokens, the writer's comments are the session's and no step named them.
  r = await cli(["compare", "--steps", file, "--by", "impl-"]);
  expect(r.line.unnamed.length).toBe(5);
  // Since: the lines of the last hours by this machine's clock; the stand-in's `now` is of 2026-10-13.
  r = await cli(["compare", "--steps", file, "--since", "1"]);
  expect([r.code, r.line.lines, r.line.steps, r.line.since]).toEqual([0, 2, 0, 1]);
  T.calls = [];
  for (const args of [["--since", "0"], ["--since"], ["--steps"], ["--by", ""], ["x"], ["--dry"]]) expect([args, (await cli(["compare", ...args])).code]).toEqual([args, 2]);
  expect([(await cli(["compare"])).code, (await cli(["compare", "--steps", join(RIG, "none")])).err]).toEqual([1, `loop.ts: no file ${join(RIG, "none")}: the lines of steps are steps.jsonl, or with --steps the output of \`run --dry\`\n`]);
  expect((await cli(["compare", "--steps", RIG])).err).toBe(`loop.ts: no file ${RIG}: the lines of steps are steps.jsonl, or with --steps the output of \`run --dry\`\n`);
  expect((await cli(["compare", "--steps", file], { LOOP_TOKEN: "" })).code).toBe(2);
  expect(T.calls).toEqual([]);
  // steps.jsonl is the file with no --steps: a step that is not dry writes it.
  T.queue = [];
  await step();
  r = await cli(["compare"]);
  expect([r.code, r.line.file, r.line.steps]).toEqual([0, join(LOOP, "steps.jsonl"), 1]);
});

// never-page-up-line-after-a-check at event 6473 (2026-10-13): its writer asked for an act of the owner's and ended with
// no submit, the session labeled it, and it was never sent back, so the queue has it in `waiting`, `work`, and no `round`.
test("in `waiting`, `work`, labeled `needs-owner`: it is the owner's and no `back` is made; with a word of his after the label it is given", async () => {
  fresh();
  worked("a"); cost("a", { role: "implementer", outcome: "no-submit" }); runFile({ token: "impl-aaaaaa", ended: { at: 1, outcome: "no-submit", token: "kept" } }); label("a", ["needs-owner"]); Wt("a", "work");
  let r = await dry();
  expect([r.line.acts, r.line.given, r.line.skipped]).toEqual([[], [], []]);
  expect(r.status).toContain("## What waits for the owner\n\n- a (in-progress, at work, labeled needs-owner)\n");
  r = await step();
  expect([r.line.acts, r.line.given, writes(), log("brain").filter((l) => l.includes("revoke")), at("a").issue.state]).toEqual([[], [], [], [], "in-progress"]);
  const his = note("a", "out/a/1", "he said: make the check", "out-5f56b2");
  r = await step();
  expect([acts(r.line), gave(r.line), at("a").issue.state]).toEqual([[], [`answer a ${his.seq}`], "in-progress"]);
});

test("a digest the snapshot opened: each older one is rejected as covered by the newest, which is triaged and made ready; another's digest is given as a triage", async () => {
  fresh();
  for (const day of ["2026-10-11", "2026-10-12", "2026-10-10"]) { open("digest-" + day, { state: "open", labels: ["digest"], opener: "worker:brain-x-snapshot" }); Q("digest-" + day, "triage", { since: 77 }); }
  open("digest-by-hand", { state: "open", labels: ["digest"], opener: "delegation:d1" }); Q("digest-by-hand", "triage");
  let r = await dry();
  expect([r.line.acts, gave(r.line), writes()]).toEqual([[{ act: "reject", id: "digest-2026-10-10" }, { act: "reject", id: "digest-2026-10-11" }, { act: "digest", id: "digest-2026-10-12", covers: ["digest-2026-10-10", "digest-2026-10-11"] }, { act: "start", id: "digest-by-hand", role: "orchestrator", entries: 1 }], [`triage digest-by-hand ${at("digest-by-hand").events[0].seq}`], []]);
  r = await step();
  expect(["digest-2026-10-10", "digest-2026-10-11", "digest-2026-10-12", "digest-by-hand"].map((id) => at(id).issue.state)).toEqual(["rejected", "rejected", "ready", "open"]);
  expect(events("digest-2026-10-11", "moved")[0]).toMatchObject({ key: "orch/digest-2026-10-11/covered", to: "rejected", reason: "covered by digest-2026-10-12" });
  expect(events("digest-2026-10-12").slice(1).map((e) => [e.type, e.key, e.to || e.body])).toEqual([["commented", "orch/digest-2026-10-12/covers", "This digest covers the days of digest-2026-10-10, digest-2026-10-11 as well: each was rejected as covered by it."],
    ["moved", "orch/digest-2026-10-12/triage-77", "triaged"], ["moved", "orch/digest-2026-10-12/ready-77", "ready"]]);
  expect(events("digest-2026-10-12", "moved").map((e) => e.reason)).toEqual(Array(2).fill("the day's digest, opened by the snapshot's run"));
  // One alone: no comment.
  fresh(); open("digest-2026-10-13", { state: "open", labels: ["digest"], opener: "worker:brain-x-snapshot" }); Q("digest-2026-10-13", "triage");
  r = await step();
  expect([r.line.acts.map((a: Ev) => a.act), events("digest-2026-10-13").slice(1).map((e) => e.type), at("digest-2026-10-13").issue.state]).toEqual([["digest"], ["moved", "moved"], "ready"]);
});

test("an overseer is started at 3 issues ended since the last heading of oversight.md, or one at its third `rework`; none beside a live `over-` token, and no third since that heading", async () => {
  fresh(6000);
  for (const id of ["a", "b"]) { open(id); mv(id, "pass", "done"); }
  expect(acts((await dry()).line)).toEqual([]);
  open("c"); label("c", ["needs-owner"]);
  let r = await step();
  expect([acts(r.line), log("self")]).toEqual([["start overseer"], ["start --role overseer"]]);
  // The events are read a page at a time: 4 an answer of this stand-in.
  expect(T.calls.filter((c) => c.method === "sync").length).toBeGreaterThan(1);
  flag("tokens-list", JSON.stringify({ name: "rev-0a0a0a", note: "rev; x", until: "2099-01-01T00:00:00.000Z", kept: true }) + "\n" + JSON.stringify({ name: "over-0a0a0a", note: "over; oversight-after-5646", until: "2099-01-01T00:00:00.000Z", kept: true }) + "\n");
  r = await dry();
  expect([acts(r.line), r.line.skipped]).toEqual([[], [{ id: "", do: "overseer", why: "an overseer's token is live" }]]);
  flag("tokens-list", JSON.stringify({ name: "over-0a0a0a", note: "over; x", until: "2020-01-01T00:00:00.000Z", kept: true }) + "\n");
  expect(acts((await dry()).line)).toEqual(["start overseer"]);
  runFile({ token: "over-aaaaaa", role: "overseer", id: "", after: "5646", ended: { at: 1, outcome: "stopped" } }); runFile({ token: "over-bbbbbb", role: "overseer", id: "", after: "5464", ended: { at: 1, outcome: "done" } });
  expect(acts((await dry()).line)).toEqual(["start overseer"]);
  runFile({ token: "over-cccccc", role: "overseer", id: "", after: "5646", ended: { at: 1, outcome: "done" } });
  r = await dry();
  expect([acts(r.line), skipped(r.line)]).toEqual([[], ["overseer "]]);
  expect(r.status).toContain("- oversight: 2 overseers were started since the heading of oversight.md that ends at event 5646, and it has no later heading");
  // One issue at its third rework since the heading.
  fresh(6000); worked("a", 3);
  expect(acts((await dry()).line)).toEqual([]);
  mv("a", "submit", "in-review", "impl-aaaaaa"); mv("a", "rework", "in-progress");
  expect(acts((await dry()).line)).toEqual(["start overseer"]);
});

test("`triage`, `decompose`, `promote`, `look`, an agent's ask and a move of the owner's with no post mortem are each given once, 5 at most a step; a triage that got a link and came back is given again", async () => {
  fresh(6000);
  open("a", { state: "open" }); Q("a", "triage");
  open("b", { state: "approved", kind: "project" }); Q("b", "decompose");
  open("c", { state: "open", kind: "feedback" }); Q("c", "promote");
  open("d", { state: "in-review" }); Q("d", "look");
  open("e", { state: "in-progress" }); const asks = label("e", ["asks-orchestrator"], "impl-aaaaaa");
  open("f", { state: "spec-review", kind: "project" }); const sent = mv("f", "send-back", "spec", "owner", "session");
  open("g", { state: "awaiting-approval" }); ev("g", { type: "reviewed", key: "r/g", verdict: "pass" }); const rejected = mv("g", "owner-reject", "rejected", "owner", "session");
  open("h", { state: "done", linked: [{ rel: "cause", id: "pm-h" }] }); mv("h", "revert", "ready", "owner", "session");
  open("i", { state: "awaiting-approval" }); mv("i", "owner-reject", "rejected", "owner", "session");
  open("j", { state: "spec-review", kind: "project" }); mv("j", "send-back", "spec", "spec-aaaaaa");
  const first = (id: string) => at(id).events[0].seq;
  let r = await step();
  expect(gave(r.line)).toEqual([`asks e ${asks.seq}`, `triage a ${first("a")}`, `decompose b ${first("b")}`, `promote c ${first("c")}`, `look d ${first("d")}`]);
  expect([r.line.skipped, acts(r.line)]).toEqual([[{ id: "f", do: "pm", why: "5 entries are given at a step" }, { id: "g", do: "pm", why: "5 entries are given at a step" }], []]);
  expect(["a", "b", "c", "d", "e", "f"].map((id) => events(id, "commented").map((e) => e.key))).toEqual([[`orch/a/given-triage-${first("a")}`], [`orch/b/given-decompose-${first("b")}`], [`orch/c/given-promote-${first("c")}`], [`orch/d/given-look-${first("d")}`], [`orch/e/given-asks-${asks.seq}`], []]);
  r = await step();
  expect([gave(r.line), r.line.skipped]).toEqual([[`pm f ${sent.seq}`, `pm g ${rejected.seq}`], []]);
  expect((await step()).line.given).toEqual([]);
  // The triage held it with a link: it is in `waiting`. When that ends it is a triage again, of a later event.
  const link = ev("a", { type: "linked", key: "orch/a/after-b", rel: "after", to: "b" });
  expect(gave((await step()).line)).toEqual([`triage a ${link.seq}`]);
  const held = ev("d", { type: "held", key: "orch/d/hold-1", until: 5 });
  expect(gave((await step()).line)).toEqual([`look d ${held.seq}`]);
});

test("a given entry whose judgment run ended `stopped` is given once more and not a third time; one whose run ended another way is in the status as judged and left", async () => {
  fresh();
  open("a", { state: "open" }); Q("a", "triage"); open("b", { state: "open" }); Q("b", "triage"); open("c", { state: "open" }); Q("c", "triage");
  const [sa, sb, sc] = ["a", "b", "c"].map((id) => at(id).events[0].seq);
  note("a", `orch/a/given-triage-${sa}`, `given triage at ${sa} to orch-bbbbbb, its run on a`); note("b", `orch/b/given-triage-${sb}`, `given triage at ${sb} to orch-bbbbbb, its run on a`); note("c", `orch/c/given-triage-${sc}`, `given triage at ${sc} to orch-cccccc, its run on c`);
  cost("a", { role: "orchestrator", outcome: "running", token: "orch-bbbbbb", agent: "otherhost:1" }); cost("c", { role: "orchestrator", outcome: "done", token: "orch-cccccc" });
  let r = await step();
  expect([r.line.given, events("a", "commented").length]).toEqual([[], 1]);
  expect(status()).toContain(`## Judged and left as it was\n\n- triage c (event ${sc})\n`);
  cost("a", { role: "orchestrator", outcome: "stopped", token: "orch-bbbbbb" });
  r = await step();
  expect(r.line.given.map((x: Ev) => x.key)).toEqual([`orch/a/given-triage-${sa}-2`, `orch/b/given-triage-${sb}-2`]);
  expect((await step()).line.given).toEqual([]);
  // The second give names a run, and that one died as well.
  fresh();
  open("a", { state: "open" }); Q("a", "triage"); const s = at("a").events[0].seq;
  note("a", `orch/a/given-triage-${s}`, `given triage at ${s} to orch-bbbbbb, its run on a`); note("a", `orch/a/given-triage-${s}-2`, `given triage at ${s} to orch-cccccc, its run on a`);
  cost("a", { role: "orchestrator", outcome: "stopped", token: "orch-bbbbbb" }); cost("a", { role: "orchestrator", round: 2, outcome: "stopped", token: "orch-cccccc" });
  r = await step();
  expect([r.line.given, writes().filter((c) => c.method === "comment")]).toEqual([[], []]);
  expect(status()).toContain(`## The judgment run died twice\n\n- triage a (event ${s})\n`);
});

test("what stops a start of a writer or an approver, and not a review or a round: uptime at 15, `land` held by one at two steps 30 s apart, a result that was an error, a review that was not started", async () => {
  fresh();
  const rig = () => {
    T.issues.clear(); T.queue = []; T.waiting = [];
    worked("a"); mv("a", "submit", "in-review", "impl-aaaaaa"); Q("a", "review");
    worked("b", 2); cost("b", { role: "implementer", outcome: "changes" }); Q("b", "round");
    open("c"); Q("c", "start"); open("s", { kind: "project", state: "open" }); Q("s", "spec");
    worked("d"); mv("d", "submit", "in-review", "impl-aaaaaa"); mv("d", "pass", "awaiting-approval", "rev-aaaaaa"); Wt("d", "owner");
  };
  rig();
  const all = ["start a reviewer", "resume b implementer", "start d approver", "start c implementer", "start s spec-writer"], some = all.slice(0, 2), held = ["approve d", "start c", "spec s"];
  let r = await dry();
  expect([acts(r.line), r.line.stops]).toEqual([all, undefined]);
  flag("uptime", " 8:53  up 11 days, 12:46, 0 users, load averages: 15.00 9.49 9.67\n");
  r = await dry();
  expect([acts(r.line), r.line.stops, skipped(r.line), r.line.skipped[1].why]).toEqual([some, ["uptime's first number is 15"], held, "no new writer: uptime's first number is 15"]);
  expect(r.status).toContain("- no new writer and no approver is started: uptime's first number is 15");
  flag("uptime", "08:53:00 up 1 day, load average: 14,99, 20.00, 30.00\n");
  expect(acts((await dry()).line)).toEqual(all);
  rmSync(join(RIG, "uptime"));
  // land: named in the line; the same holder at the next step, 30 s on by the service's clock.
  flag("lock-land", "0 land is held by impl-x since 08:00:00, until 08:10:00");
  r = await step();
  expect([r.line.land, r.line.stops, acts(r.line)]).toEqual(["impl-x", undefined, all]);
  T.now += 29999; rig();
  expect((await dry()).line.stops).toBeUndefined();
  T.now += 1;
  r = await dry();
  expect([r.line.stops, acts(r.line)]).toEqual([["land has named impl-x at this step and the one before"], some]);
  flag("lock-land", "0 land is held by impl-y since 08:00:40, until 08:10:40");
  expect((await dry()).line.stops).toBeUndefined();
  rmSync(join(RIG, "lock-land"));
  // A result that was an error, less than 30 minutes ago.
  runFile({ token: "impl-bbbbbb", ended: { at: Date.now() - 29 * 60000, outcome: "stopped" } }); writeFileSync(join(RUNS, "impl-bbbbbb.exit"), "1\n");
  r = await dry();
  expect([r.line.stops, acts(r.line)]).toEqual([["the result of impl-bbbbbb was an error less than 30 minutes ago"], some]);
  runFile({ token: "impl-bbbbbb", ended: { at: Date.now() - 31 * 60000, outcome: "stopped" } });
  expect((await dry()).line.stops).toBeUndefined();
  runFile({ token: "impl-bbbbbb", ended: { at: Date.now(), outcome: "pass" } }); writeFileSync(join(RUNS, "impl-bbbbbb.exit"), "0\n");
  expect((await dry()).line.stops).toBeUndefined();
  // A review that was not started: no new writer and no approver after it in that step.
  flag("self-exit-start", "1");
  r = await step();
  expect(r.line.acts.map((a: Ev) => [a.act, a.id, a.exit, a.said])).toEqual([["start", "a", 1, "loop.ts: refused"], ["resume", "b", 0, undefined]]);
  expect([skipped(r.line), r.line.skipped[0].why]).toEqual([held, "no approver: a review or a round of this step was not started"]);
});

// loop-sh-sandbox-has-no-keychain: on 2026-10-13 the driver's sandbox had no keychain, and five runs of two steps each
// answered `Not logged in · Please run /login` in under 0.1 s. The stop of a result that was an error held the
// writers and the approvers; the second step still started an overseer and a judgment run.
const OUT = '{"session":"s","result":"Not logged in \\u00b7 Please run /login","usd":0,"usage":{"input":0,"output":0},"context":0,"turns":1,"ms":89,"legs":1}';
test("notLoggedIn: the result line of 2026-10-13, and not a report that cost something, another text, an empty line or no result", () => {
  expect([JSON.parse(OUT), { result: "  not logged in" }, { result: "Invalid API key · Please run /login", usd: 0, context: 0 }].map(notLoggedIn)).toEqual([true, true, true]);
  expect([null, undefined, {}, "Not logged in", { result: 5 }, { result: "" }, { result: "the report" }, { result: "It said: Not logged in" }, { result: "Not logged into the page: needed a tab" },
    { result: "Not logged in · Please run /login", usd: 0.01 }, { result: "Not logged in · Please run /login", context: 4242 }, { result: "The page said: Please run /login", usd: 1.5, context: 4242 }].map(notLoggedIn)).toEqual(Array(12).fill(false));
});

test("a result that says its process is not logged in stops every start made with the token that started it: a review, a round, an approver, a writer, an overseer and the judgment run; the moves are made", async () => {
  fresh(6000);
  const rig = () => {
    T.issues.clear(); T.queue = []; T.waiting = [];
    worked("a"); mv("a", "submit", "in-review", "impl-aaaaaa"); Q("a", "review");
    worked("b", 2); cost("b", { role: "implementer", outcome: "changes" }); Q("b", "round");
    open("c"); Q("c", "start"); open("s", { kind: "project", state: "open" }); Q("s", "spec");
    worked("d"); mv("d", "submit", "in-review", "impl-aaaaaa"); mv("d", "pass", "awaiting-approval", "rev-aaaaaa"); Wt("d", "owner");
    open("r", { state: "triaged" }); Q("r", "ready");
    open("t", { state: "open" }); Q("t", "triage");
    for (const id of ["x", "y", "z"]) { open(id); mv(id, "pass", "done"); }
  };
  rig();
  const all = ["start a reviewer", "resume b implementer", "ready r", "start d approver", "start c implementer", "start s spec-writer", "start overseer"], first = at("t").events[0].seq;
  const result = (token: string, text = OUT) => writeFileSync(join(RUNS, token + ".result.json"), text);
  let r = await dry();
  expect([acts(r.line), judgment(r.line).length, gave(r.line), r.line.unlogged, r.status.includes("not logged in")]).toEqual([all, 1, [`triage t ${first}`], undefined, false]);
  // A run this token started, ended or not, with that result.
  runFile({ token: "impl-bbbbbb", id: "c" }); result("impl-bbbbbb");
  r = await dry();
  const why = "the result of impl-bbbbbb says its process is not logged in";
  expect([acts(r.line), judgment(r.line), r.line.given, r.line.unlogged]).toEqual([["ended c implementer", "ready r"], [], [], { token: "impl-bbbbbb", by: ME, said: "Not logged in · Please run /login" }]);
  expect(r.line.skipped).toEqual([{ id: "a", do: "start", why: "no reviewer: " + why }, { id: "b", do: "round", why: "no round: " + why }, { id: "d", do: "start", why: "no approver: " + why },
    { id: "c", do: "start", why: "no implementer: " + why }, { id: "s", do: "start", why: "no spec-writer: " + why }, { id: "", do: "overseer", why: "no overseer: " + why }, { id: "t", do: "triage", why: "no judgment run: " + why }]);
  expect(r.status).toContain(`## Health\n\n- healthy\n- no agent of any role is started: the result of impl-bbbbbb says its process is not logged in ("Not logged in · Please run /login"). It holds for the runs started with ${ME}, the token this step was made with: stop the driver, log \`claude\` in where it runs (the header of tools/cloud-brain/loop.sh has what its sandbox is given), and start it again\n`);
  // Not dry, with the run ended: the move is made, no start, no resume, no token for a judgment run and no `given` comment.
  runFile({ token: "impl-bbbbbb", id: "c", ended: { at: Date.now() - 3 * 3600000, outcome: "stopped" } });
  r = await step();
  expect([acts(r.line), log("self"), log("brain").filter((l) => l.startsWith("agent-token orch")), writes().map((c) => c.method), status().includes("- no agent of any role is started: the result of impl-bbbbbb")]).toEqual([["ready r"], [], [], ["move"], true]);
  // It is the token's: a step made with another starts them, as a driver started again does.
  rig();
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "impl-aaaaaa": "v-impl-aaaaaa", "orch-dddddd": "v-orch-dddddd" }));
  r = await cli(["step", "--dry"], { LOOP_TOKEN: "orch-dddddd" });
  expect([acts(r.line), judgment(r.line).length, r.line.unlogged]).toEqual([all, 1, undefined]);
  // Another machine's run, a result that is a report, and one that cost something stop nothing.
  runFile({ token: "impl-bbbbbb", id: "c", host: "otherhost", ended: { at: 1, outcome: "stopped" } });
  expect(acts((await dry()).line)).toEqual(all);
  runFile({ token: "impl-bbbbbb", id: "c", ended: { at: 1, outcome: "in-review" } }); result("impl-bbbbbb", '{"result":"the report","usd":1.5,"context":4242}');
  expect(acts((await dry()).line)).toEqual(all);
  result("impl-bbbbbb", '{"result":"Not logged in to the page it was to check","usd":1.5,"context":4242}');
  expect(acts((await dry()).line)).toEqual(all);
});

test("not logged in: a result that is there before the next start stops the rest of that step; a step that is not healthy starts no judgment run; an overseer's such run is not counted among the 2 since a heading", async () => {
  fresh(6000);
  open("a", { state: "in-review" }); Q("a", "review"); open("c"); Q("c", "start");
  // The stand-in for `start` leaves the file and the result of the run it started, as an agent that returned at once does.
  const self = script("self-out.sh", `#!/bin/bash
echo "$*" >> "$RIG/self.log"
if [ "$1" = start ]; then mkdir -p "${RUNS}"; echo '{"id":"a","role":"reviewer","round":1,"token":"rev-cccccc","host":"${HOST}","as":"${ME}","pid":999999,"agent":"${HOST}:999999"}' > "${RUNS}/rev-cccccc.json"; echo '${OUT.replace(/\\/g, "\\\\")}' > "${RUNS}/rev-cccccc.result.json"; echo '{"started":"rev-cccccc"}'; fi
`);
  let r = await step({ LOOP_SELF: self });
  expect([acts(r.line), log("self"), r.line.skipped, r.line.unlogged.token]).toEqual([["start a reviewer"], ["start a --role reviewer"], [{ id: "c", do: "start", why: "no implementer: the result of rev-cccccc says its process is not logged in" }], "rev-cccccc"]);
  // Not healthy: the entry `unhealthy` is given to no run.
  flag("redistil", "distiller abc\n  brain-x-issues      changes  aaaaaaaaaaaa -> dddddddddddd\n  brain-x-page        same  bbbbbbbbbbbb\n");
  r = await dry();
  expect([r.line.health.ok, r.line.acts, r.line.given, r.line.skipped]).toEqual([false, [], [], [{ id: "", do: "unhealthy", why: "no judgment run: the result of rev-cccccc says its process is not logged in" }]]);
  rmSync(join(RUNS, "rev-cccccc.result.json"));
  expect(judgment((await dry()).line).length).toBe(1);
  // The two overseers of 2026-10-13, started by a driver that is gone: a third is started. Two that ran: none.
  fresh(6000);
  for (const id of ["x", "y", "z"]) { open(id); mv(id, "pass", "done"); }
  for (const t of ["over-aaaaaa", "over-bbbbbb"]) { runFile({ token: t, role: "overseer", id: "", as: "orch-ffffff", after: "5646", ended: { at: 1, outcome: "stopped" } }); writeFileSync(join(RUNS, t + ".result.json"), OUT); }
  r = await dry();
  expect([acts(r.line), r.line.unlogged]).toEqual([["start overseer"], undefined]);
  writeFileSync(join(RUNS, "over-bbbbbb.result.json"), '{"result":"the report","usd":1.5,"context":4242}');
  expect(acts((await dry()).line)).toEqual(["start overseer"]);
  writeFileSync(join(RUNS, "over-aaaaaa.result.json"), '{"result":"the report","usd":1.5,"context":4242}');
  expect([acts((await dry()).line), skipped((await dry()).line)]).toEqual([[], ["overseer "]]);
});

test("step --dry twice over the same answers prints the same line twice, writes nothing, and its status names each entry that waits for the owner", async () => {
  fresh();
  worked("a"); mv("a", "submit", "in-review", "impl-aaaaaa"); Q("a", "review");
  worked("b", 4); cost("b", { role: "implementer", round: 3, outcome: "changes" }); Q("b", "round");
  open("c", { state: "triaged" }); Q("c", "ready");
  open("d"); Q("d", "start");
  worked("e"); cost("e", { role: "implementer", outcome: "stopped" }); Wt("e", "work");
  for (const id of ["o1", "o2", "o3"]) { open(id, { state: "triaged" }); label(id, ["needs-owner"]); Wt(id, "owner"); }
  open("w", { state: "triaged" }); Wt("w", "after", { on: ["a"] });
  flag("wt-list", "t-gone clean changed=0 untracked=0 ahead=0 dev-changed=0 dev-ahead=0 occupant=- branch=bm/t-gone head=abc1234\n"); open("t-gone", { state: "done" });
  runFile({ token: "impl-bbbbbb", running: 5 });
  const one = await dry(), seq = T.seq, two = await dry();
  expect([one.code, one.out]).toEqual([0, two.out]);
  expect(acts(one.line)).toEqual(["worktree-remove", "ended a implementer", "start a reviewer", "ready c", "back e implementer", "start d implementer"]);
  expect([gave(one.line), one.line.seq, one.line.at, one.line.dry]).toEqual([[`round b ${last(events("b", "moved")).seq}`], seq, T.now, true]);
  expect(Object.keys(one.line)).toEqual(["at", "seq", "dry", "health", "acts", "given", "skipped"]);
  // Nothing was sent, made or removed.
  expect([writes(), T.seq, existsSync(join(LOOP, "steps.jsonl")), existsSync(join(LOOP, "status.md")), log("self"), log("worktree"), log("brain").filter((l) => !/^(redistil|state)/.test(l))]).toEqual([[], seq, false, false, [], ["--list", "--list"], []]);
  expect(file("impl-bbbbbb").ended).toBeUndefined();
  for (const e of T.waiting.filter((w) => w.why === "owner")) expect(one.status).toContain(`- ${e.id} (triaged)`);
  expect(one.status).toMatch(/^# The loop at event \d+, 2026-10-13T\S+ \(a dry step: nothing was done\)\n/);
  expect(one.status).not.toContain("- w (");
  // The step that is not dry writes the same status to the file, less its first line's note and its title of the acts.
  const real = await step();
  expect([real.status, lines().length, lines()[0]]).toEqual(["", 1, real.line]);
  expect(status()).toContain("## What waits for the owner\n\n- o1 (triaged)\n- o2 (triaged)\n- o3 (triaged)\n");
});

test("a read that is not answered ends the step with exit 1 and `error` in its line, which is written; step takes --dry and --for and nothing else, and needs LOOP_TOKEN", async () => {
  fresh();
  open("a", { state: "in-review" }); Q("a", "review");
  T.fail = "queue";
  let r = await step();
  expect([r.code, r.line.acts, lines().length]).toEqual([1, [], 1]);
  expect(r.line.error).toMatch(/^queue\?limit=1 answered 502/);
  expect(status()).toContain("The step ended on a read that was not answered: queue?limit=1 answered 502");
  T.fail = "get";
  r = await dry();
  expect([r.code, r.line.error.slice(0, 22)]).toEqual([1, "get?id=a answered 502 "]);
  // A token issue-as.sh does not keep: the step ends before health, and says so.
  T.fail = "";
  r = await cli(["step", "--dry"], { LOOP_TOKEN: "orch-ffffff" });
  expect([r.code, r.line.health, r.line.error.slice(0, 31), log("lock").length]).toEqual([1, { ok: true }, "queue?limit=1 answered nothing ", 2]);
  T.calls = [];
  r = await cli(["step", "--wet"]);
  expect([r.code, r.err.trim(), T.calls]).toEqual([2, "loop.ts: step [--dry] [--for clock|event|run]", []]);
  const { LOOP_TOKEN: _, ...base } = process.env;
  const p = spawnSync("bun", [tool, "step"], { encoding: "utf8", env: { ...base, LOOP_ROOT: ROOT, BRAIN_STATE_DIR: STATE, ISSUE_AS_BASE: `http://127.0.0.1:${server.port}` } as any });
  expect([p.status, T.calls]).toEqual([2, []]);
});

test("with the real start and ended: a review entry starts a reviewer whose run is `running` in the record, the next step starts no second, and a run that returned is ended", async () => {
  fresh();
  worked("a"); mv("a", "submit", "in-review", "impl-aaaaaa"); Q("a", "review");
  open("b", { state: "in-review" }); runFile({ token: "rev-bbbbbb", id: "b", role: "reviewer", how: "light", made: false, running: 5 }); writeFileSync(join(RUNS, "rev-bbbbbb.result.json"), '{"result":"the report","ms":2000,"context":7}');
  flag("agent-hold");
  let r = await step({ LOOP_SELF: "" });
  expect(r.line.acts).toEqual([{ act: "ended", token: "rev-bbbbbb", id: "b", role: "reviewer", why: "its process returned", exit: 0, outcome: "stopped" }, { act: "start", id: "a", role: "reviewer", exit: 0, token: "rev-0a0a0a" }]);
  expect(events("b", "cost")[0]).toMatchObject({ key: "cost/b/reviewer/1/rev-bbbbbb/end", outcome: "stopped", seconds: 2, context: 7, by: { holder: "secret:" + ME } });
  expect(file("rev-bbbbbb").ended).toMatchObject({ outcome: "stopped", token: "given, not ended" });
  expect(events("a", "cost")[0]).toMatchObject({ key: "cost/a/reviewer/1/rev-0a0a0a", outcome: "running", token: "rev-0a0a0a", agent: `${HOST}:${file("rev-0a0a0a").pid}` });
  r = await step({ LOOP_SELF: "" });
  expect([r.line.acts, r.line.skipped]).toEqual([[], [{ id: "a", do: "review", why: "a reviewer of it runs" }]]);
  expect(status()).toContain(`- reviewer of a, round 1, token rev-0a0a0a, ${HOST}:${file("rev-0a0a0a").pid}`);
  rmSync(join(RIG, "agent-hold"));
  await until(() => file("rev-0a0a0a")?.ended);
  expect(at("a").issue.runs[0].outcome).toBe("stopped");
});

// ---- st-4-orchestrator-brief: the step starts the judgment run
test("the judgment run: its round is one more than the runs of that role the issue has, and it ends `done`, or `stopped` with no result or with one that was an error", () => {
  expect([judgmentRound([]), judgmentRound(undefined as any), judgmentRound([{ role: "implementer", round: 4 }]), judgmentRound([{ role: "orchestrator", round: 1 }, { role: "orchestrator", round: 3 }, { role: "reviewer", round: 9 }])]).toEqual([1, 1, 1, 4]);
  const run = { id: "a", role: "orchestrator", round: 1, token: "orch-bbbbbb" };
  expect([outcomeOf(run, [], true), outcomeOf(run, [], true, true), outcomeOf(run, [], false)]).toEqual([{ outcome: "done" }, { outcome: "stopped" }, { outcome: "stopped" }]);
});

test("the judgment run, with the real start and ended: the entries of a step are given to one run by its token, a second is not started while it runs, and it is ended `done`", async () => {
  fresh();
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "impl-aaaaaa": "v-impl-aaaaaa", "orch-0a0a0a": "v-orch-0a0a0a" }));
  open("a", { state: "open" }); Q("a", "triage");
  worked("b", 4); cost("b", { role: "implementer", round: 3, outcome: "changes" }); Q("b", "round");
  const sa = at("a").events[0].seq, sb = last(events("b", "moved")).seq, tree = join(ROOT, ".claude/worktrees/bm-orch-" + HOST);
  flag("agent-hold");
  let r = await step({ LOOP_SELF: "" });
  expect(r.line.acts).toEqual([{ act: "start", id: "b", role: "orchestrator", entries: 2, exit: 0, token: "orch-0a0a0a" }]);
  expect(r.line.given.map((x: Ev) => [x.do, x.id, x.at, x.key, x.event > 0])).toEqual([["round", "b", sb, `orch/b/given-round-${sb}`, true], ["triage", "a", sa, `orch/a/given-triage-${sa}`, true]]);
  expect(["a", "b"].map((id) => last(events(id, "commented")))).toMatchObject([{ body: `given triage at ${sa} to orch-0a0a0a, its run on b`, by: { holder: "secret:" + ME } }, { body: `given round at ${sb} to orch-0a0a0a, its run on b` }]);
  // The comments are before the run's event, which is on the first of its issues, with a round of its own.
  const f = file("orch-0a0a0a"), running = last(events("b", "cost"));
  expect(running).toMatchObject({ key: "cost/b/orchestrator/1/orch-0a0a0a", role: "orchestrator", round: 1, outcome: "running", how: "fresh", token: "orch-0a0a0a", session: f.session, agent: `${HOST}:${f.pid}` });
  expect(running.seq).toBeGreaterThan(last(events("a", "commented")).seq);
  expect(f).toMatchObject({ id: "b", role: "orchestrator", round: 1, made: true, tree: "orch-" + HOST, path: tree, as: ME });
  expect(events("a", "cost")).toEqual([]);
  expect(log("worktree").filter((l) => /--fresh/.test(l))).toEqual([`--fresh orch-${HOST} --for orch-0a0a0a`]);
  expect(log("brain").filter((l) => /^agent-token/.test(l))).toEqual(["agent-token orch judgment:b"]);
  // The process: started in the worktree, with the four lines, the third the entries.
  await until(() => existsSync(join(RIG, "agent.log")));
  expect(readFileSync(join(RIG, "agent.log"), "utf8")).toBe([`WORK=${tree}`, "orchestrator", `Working directory: ${tree}.`, `Read ${tree}/.claude/skills/brain-maintenance/agents/orchestrator.md and follow it.`, `Entries: round b (event ${sb}); triage a (event ${sa})`, "Your token is orch-0a0a0a.", ""].join("\n"));
  // While it runs: a new entry is not given and has no comment, and the two are not given again.
  open("c", { state: "open" }); Q("c", "triage");
  r = await step({ LOOP_SELF: "" });
  expect([r.line.acts, r.line.given, r.line.skipped, events("c", "commented")]).toEqual([[], [], [{ id: "c", do: "triage", why: "a judgment run runs (orch-0a0a0a)" }], []]);
  expect(status()).toContain(`- orchestrator of b, round 1, token orch-0a0a0a, ${HOST}:${f.pid}`);
  expect((await dry()).line).toMatchObject({ acts: [], given: [], skipped: [{ id: "c", do: "triage", why: "a judgment run runs (orch-0a0a0a)" }] });
  // It returns: ended `done`, its token ended, the worktree left, the report in the journal of the issue its event is on.
  rmSync(join(RIG, "agent-hold"));
  await until(() => file("orch-0a0a0a")?.ended);
  expect(file("orch-0a0a0a").ended).toMatchObject({ outcome: "done", token: "ended" });
  expect(last(events("b", "cost"))).toMatchObject({ key: "cost/b/orchestrator/1/orch-0a0a0a/end", outcome: "done", seconds: 61, context: 4242 });
  expect([log("brain").filter((l) => /revoke/.test(l)), log("worktree").filter((l) => /--leave/.test(l))]).toEqual([["agent-token revoke orch-0a0a0a"], [`--leave orch-${HOST}`]]);
  expect(readFileSync(join(LOOP, "b.md"), "utf8")).toMatch(/\n## orchestrator round 1 \(fresh, loop\.ts\), ended .*outcome done, token orch-0a0a0a.*\n\nthe report\n/);
  // It left both as they were, with no verdict: neither is given again, and the status has them for a session.
  rmSync(join(RIG, "agent.log"));
  r = await step({ LOOP_SELF: "" });
  expect(gave(r.line)).toEqual([`triage c ${at("c").events[0].seq}`]);
  expect(status()).toContain(`## Judged and left as it was\n\n- round b (event ${sb})\n- triage a (event ${sa})\n`);
  // The run of c is on c, round 1; a second judgment run on b would be its round 2.
  await until(() => file("orch-0a0a0a")?.ended && file("orch-0a0a0a").id === "c");
  expect([last(events("c", "cost")).key, judgmentRound(at("b").issue.runs)]).toEqual(["cost/c/orchestrator/1/orch-0a0a0a/end", 2]);
  // A verdict `left` is in the status with its reason, for a session with the owner.
  note("a", verdictKey("a", "triage", sa), "left: a session with the owner makes the token loop-x\nmore");
  await step({ LOOP_SELF: "" });
  expect(status()).toContain(`## What a session with the owner is asked to do\n\n- triage a (event ${sa}): left by the judgment: a session with the owner makes the token loop-x\n`);
  expect(status()).toContain(`## Judged and left as it was\n\n- round b (event ${sb})\n- triage c (`);
});

test("the judgment run: a start that failed is written as a run that died, its token ended, and the entry is given once more and then is in the status", async () => {
  fresh();
  open("a", { state: "open" }); Q("a", "triage"); const sa = at("a").events[0].seq;
  flag("self-exit-start", "1");
  let r = await step();
  expect(r.line.acts).toEqual([{ act: "start", id: "a", role: "orchestrator", entries: 1, exit: 1, token: "orch-0a0a0a", said: "loop.ts: refused", revoke: "ended", event: last(events("a")).seq }]);
  expect(events("a").slice(1).map((e) => [e.type, e.key, e.outcome || e.body])).toEqual([["commented", `orch/a/given-triage-${sa}`, `given triage at ${sa} to orch-0a0a0a, its run on a`], ["cost", "cost/a/orchestrator/1/orch-0a0a0a/end", "stopped"]]);
  expect(log("brain").filter((l) => /^agent-token/.test(l))).toEqual(["agent-token orch judgment:a", "agent-token revoke orch-0a0a0a"]);
  r = await step();
  expect(r.line.given.map((x: Ev) => x.key)).toEqual([`orch/a/given-triage-${sa}-2`]);
  expect(last(events("a", "cost"))).toMatchObject({ key: "cost/a/orchestrator/2/orch-0a0a0a/end", round: 2, outcome: "stopped" });
  r = await step();
  expect([r.line.acts, r.line.given]).toEqual([[], []]);
  expect(status()).toContain(`## The judgment run died twice\n\n- triage a (event ${sa})\n`);
  // No token: nothing is given and no comment is written; the entry is due at the next step.
  fresh();
  open("a", { state: "open" }); Q("a", "triage");
  r = await step({ LOOP_BRAIN: "bash " + script("brain-none.sh", "#!/bin/bash\ncase \"$1\" in redistil) printf 'distiller abc\\n  brain-x-issues      same  aaaaaaaaaaaa\\n';; state) echo '{\"workers\":[]}';; *) echo 'no token loop-agents' >&2; exit 1;; esac\n") });
  expect([r.line.acts, r.line.given, r.line.skipped, events("a", "commented"), log("self")]).toEqual([[{ act: "start", id: "a", role: "orchestrator", entries: 1, exit: 1, said: "agent-token made no token: no token loop-agents" }], [], [{ id: "a", do: "triage", why: "agent-token made no token for the judgment run" }], [], []]);
});

test("start --role orchestrator: it takes --token and --give and no other role takes --give; a worktree another token is in is exit 1 with nothing left; with no issue it has the file and no event; a second beside it is exit 3", async () => {
  fresh();
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "orch-0a0a0a": "v-orch-0a0a0a" }));
  open("a", { state: "open" });
  const start = (...a: string[]) => cli(["start", ...a]);
  let r = await start("a", "--role", "orchestrator", "--give", "triage a (event 1)");
  expect([r.code, r.err.trim()]).toEqual([2, "loop.ts: a judgment run is started by `step`, which makes its token and names it in the `given` comments before the run: --token <t>"]);
  for (const a of [["a", "--role", "orchestrator", "--token", "orch-0a0a0a"], ["a", "--role", "reviewer", "--give", "triage a (event 1)"]]) expect([(await start(...a)).code, (await start(...a)).err.trim()]).toEqual([2, "loop.ts: --give is the entries of a judgment run, and --role orchestrator has it"]);
  expect([writes(), existsSync(RUNS) ? readdirSync(RUNS) : [], log("worktree")]).toEqual([[], [], []]);
  // Another token is in the worktree: the token is ended, no file and no event are left.
  flag("wt-fresh-exit", "4");
  r = await start("a", "--role", "orchestrator", "--token", "orch-0a0a0a", "--give", "triage a (event 1)");
  expect([r.code, r.err.trim(), writes(), existsSync(RUNS) ? readdirSync(RUNS).filter((f) => f.endsWith(".json")) : [], log("brain")]).toEqual([1, `loop.ts: worktree.sh --fresh orch-${HOST}: exit 4 another token is in it; the token orch-0a0a0a is ended`, [], [], ["agent-token revoke orch-0a0a0a"]]);
  rmSync(join(RIG, "wt-fresh-exit"));
  // A cluster that is not healthy is all it was given: no issue, so no event, and its report is in _judgment.md.
  flag("agent-hold");
  r = await start("--role", "orchestrator", "--token", "orch-0a0a0a", "--give", "unhealthy (redistil: brain-x-issues is changes)");
  expect([r.code, r.line]).toMatchObject([0, { started: "orch-0a0a0a", id: "", role: "orchestrator", round: 1, tree: "orch-" + HOST }]);
  expect([r.line.event, r.line.key]).toEqual([undefined, undefined]);
  // While it runs a second is exit 3, by hand as by the step, and the run's file is as it was.
  writeFileSync(TOKENS, JSON.stringify({ [ME]: "v-" + ME, "orch-0a0a0a": "v-orch-0a0a0a", "orch-1b1b1b": "v-orch-1b1b1b" }));
  const pid = file("orch-0a0a0a").pid, second = await start("a", "--role", "orchestrator", "--token", "orch-1b1b1b", "--give", "triage a (event 1)");
  expect([second.code, second.err.trim(), file("orch-1b1b1b"), file("orch-0a0a0a").pid, writes()]).toEqual([3, `loop.ts: a judgment run runs (orch-0a0a0a, ${HOST}:${pid}); nothing was started`, null, pid, []]);
  rmSync(join(RIG, "agent-hold"));
  await until(() => file("orch-0a0a0a")?.ended);
  expect([file("orch-0a0a0a").ended.outcome, writes(), readFileSync(join(RIG, "agent.log"), "utf8").split("\n")[4]]).toEqual(["done", [], "Entries: unhealthy (redistil: brain-x-issues is changes)"]);
  expect(readFileSync(join(LOOP, "_judgment.md"), "utf8")).toContain("outcome done, token orch-0a0a0a");
});
