#!/usr/bin/env bun
// loop.ts: a run of an agent of the issue loop is started and ended by a program, and is in the record between.
// Part 2 of plan/cloud-brain-orchestrator-as-steps.md (st-2-loop-start-and-end); tools/cloud-brain/records/st-2-loop-start-and-end.md.
// Nothing of the loop calls it yet: SKILL.md steps 4 and 5 are as they were until st-7.
//
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts start <id> [--role <role>] [--token <t>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts start --role overseer [--token <t>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts ended <token>
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts resume <id> [--role <role>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts dead <id> --role <role> [--round <n>]
//
// LOOP_TOKEN is the caller's own token for the tracker, a name issue-as.sh keeps: the program's reads and its writes
// (the `worktree {…}` comment, the `cost` events, `back`) are made with it. With none: exit 2, nothing read or sent.
// stdout is one line of JSON; what went wrong is on stderr. Exit 0: done. 1: refused, and what was made is undone.
// 2: no LOOP_TOKEN, the arguments, or origin not reached. 3: the run still runs, nothing written.
//
// start   SKILL.md step 4 as code. The role is --role, or what the queue's `do` gives for the issue: `start` is
//         implementer (digest with the label `digest`), `spec` spec-writer, `review` reviewer, and an issue in
//         `waiting` for the owner at `awaiting-approval` approver. In order:
//         1. the agent's token, `brain.ts agent-token <impl|dig|spec|rev|appr|over> <id>`; with --token <t> a token
//            made before, which must read the tracker, and the program then makes none and ends none, here or
//            in `ended`;
//         2. a writer's worktree (`worktree.sh --fresh <topic> --for <token>`, the topic the issue's parent or
//            itself; exit 4 or another issue's unlanded work: `<topic>.2` to `.5`; this issue's unlanded work: the
//            worktree as it is, and a fifth line of the prompt) and the `worktree {…}` comment on the topic's issue;
//            a reviewer's view at the last lopecode-dev commit of the last submit (`--at <sha> rev-<id>`), with
//            TAB=1 when review-needs-tab.sh exits 0 or 2, the submit has a `url` ref, or a reviewer's run of this
//            issue reported `needed a tab`; an approver's view at origin/main (`appr-<id>`); an overseer's worktree
//            `over-<host>`, with no comment;
//         3. the file runs/<token>.json under .emitted/issue-loop: { id, role, round, session, token, … };
//         4. the run, detached: agent.sh with WORK and SESSION (a reviewer with CHECKOUT, as today), its JSON line
//            to runs/<token>.result.json, its exit to runs/<token>.exit, then `loop.ts ended <token>`; the pid of
//            that wrapper and the time it began (`ps -o lstart=`, "" where the sandbox refuses `ps`) are added to
//            the file. The wrapper's command line has `loop-run-<token>`, which is how a run is known to live;
//         5. one `cost` event, key cost/<id>/<role>/<round>/<token>: outcome `running`, seconds 0, context 0, the
//            token, the session, agent `<host>:<pid>`. An overseer is on no issue and has the file and no event.
// ended   SKILL.md step 5 as code, when the wrapper has returned. No result and a process that lives: exit 3. The
//         outcome is read from the issue and not from the report: a writer's `in-review`, `pass` or `changes` (its
//         submit, and the review after it), `no-submit` (a result, no submit), `stopped` (no result, or an error);
//         a reviewer's verdict, or `stopped`; an approver's `approve` or `leave`, or `stopped`. Then the `cost`
//         event again under <key>/end with seconds, context, usd, the usage of agent-usage.ts and the event the run
//         made; the report appended to the journal, once; `worktree.sh --leave`, or `--remove` of a view; and the
//         token ended, but one --token gave and a writer's whose outcome is `in-review`, `changes` or `no-submit`
//         (it may be sent the next round). A second run writes nothing: exit 0 and `already`.
// resume  "A rework round goes to the agent that wrote the change": the run of the role with the highest round,
//         from runs?id=. With a token that still reads the tracker, a session and an `agent` of this host:
//         `WORK=<W> agent.sh --resume <session>` with the three lines of that section, detached as above, and a
//         `running` event, how `resumed`, key cost/<id>/<role>/<round>/<token>/resumed-<at>. <at> is the seq of the
//         last `rework` or `respec` move, or of a comment keyed orch/<id>/verdict-round-… that begins `go-on` when
//         that is the later. A run that still runs: exit 3. Anything else is "A dead writer": the token ended
//         (not a role's token, which is the owner's), then `back`, key orch/<id>/back/<token>/<seq of the issue's
//         last move> (`no-token` with no token). A key the tracker has (`duplicate: true`) is exit 1: no `back` was made.
// dead    How many runs of a role and round died: the `cost` events of get?id= with the outcome `stopped` or
//         `no-submit`. `runs` keeps one run a role and round and cannot say.
//
// The tools it runs, each named by an environment variable for tests/tools/loop.test.ts: ISSUE_AS (issue-as.sh),
// LOOP_WORKTREE (worktree.sh), LOOP_BRAIN (`bun brain.ts`), LOOP_AGENT (agent.sh of the worktree or the view),
// LOOP_USAGE (`bun agent-usage.ts`), LOOP_NEEDS_TAB (review-needs-tab.sh), LOOP_HOST (`hostname -s`), LOOP_ROOT (the
// main checkout). The files are under BRAIN_STATE_DIR, or the main checkout's tools/cloud-brain/.emitted.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

// ---- what is read from the record, with no call
export const PREFIX: Record<string, string> = { implementer: "impl", digest: "dig", "spec-writer": "spec", reviewer: "rev", approver: "appr", overseer: "over" };
export const BRIEF: Record<string, string> = { implementer: "implementer", digest: "digest", "spec-writer": "spec", overseer: "overseer" };
export const WRITERS = ["implementer", "digest", "spec-writer"];
export const KEY_MOST = 100; // issuesLimits.key of brain-issues.ojs
type Ev = Record<string, any>;
export type Run = { id: string; role: string; round: number; token: string; session?: string; how?: string; at?: number; [k: string]: any };
const moved = (events: Ev[], ...names: string[]) => events.filter((e) => e.type === "moved" && names.includes(e.move));
const last = <T>(a: T[]): T | undefined => a[a.length - 1];

// A writer's round is the `rework` moves plus one and a spec writer's the `respec` moves plus one (the spec, part 2).
// A reviewer's is the submit it reviews, an approver's the count of moves to `awaiting-approval` (SKILL.md, step 5).
export const roundOf = (role: string, events: Ev[]): number =>
  role === "spec-writer" ? moved(events, "respec").length + 1
  : role === "reviewer" ? Math.max(1, moved(events, "submit", "submit-spec").length)
  : role === "approver" ? Math.max(1, events.filter((e) => e.type === "moved" && e.to === "awaiting-approval").length)
  : role === "overseer" ? 1
  : moved(events, "rework").length + 1;

// The token is in the key, so a second run of one role and round is not the first key again.
export const costKey = (r: Run) => `cost/${r.id}/${r.role}/${r.round}/${r.token}` + (r.how === "resumed" ? `/resumed-${r.at}` : "");
export const endKey = (r: Run) => costKey(r) + "/end";

export const deadRuns = (events: Ev[], role: string, round: number) =>
  events.filter((e) => e.type === "cost" && e.role === role && e.round === round && ["stopped", "no-submit"].includes(e.outcome));

// The event a resume is made for: the last `rework` or `respec` move, or a `go-on` verdict of a judgment when later.
export const resumeAt = (id: string, events: Ev[]): number =>
  Math.max(0, ...moved(events, "rework", "respec").map((e) => e.seq),
    ...events.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`orch/${id}/verdict-round-`) && /^go-on\b/.test(e.body || "")).map((e) => e.seq));

// The key of the `back` of "A dead writer". It names the dead run by its token, and the last move of the issue: a
// `back` and the next writer's `start` add no `rework`, and each `start` is a move, so no two writers that died in one
// round share a key, nor two runs of one token. The same call sent again is the same key.
export const backKey = (id: string, token: string | undefined, events: Ev[]) =>
  `orch/${id}/back/${token || "no-token"}/${Math.max(0, ...events.filter((e) => e.type === "moved").map((e) => e.seq))}`;

// What a run left, read from the issue. `returned`: its process gave a result line; `error`: that result was an error.
// Of a first run every event of its token is the run's; of a resumed round the events after the one it was sent for.
export function outcomeOf(run: Run, events: Ev[], returned: boolean, error = false): { outcome: string; event?: number } {
  const mine = events.filter((e) => e.by && e.by.holder === "secret:" + run.token && e.seq > (run.how === "resumed" ? run.at || 0 : 0));
  if (run.role === "overseer") return { outcome: returned && !error ? "done" : "stopped" };
  if (run.role === "reviewer") {
    const r = last(mine.filter((e) => e.type === "reviewed"));
    return r ? { outcome: r.verdict, event: r.seq } : { outcome: "stopped" };
  }
  if (run.role === "approver") {
    const v = last(mine.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`approver/${run.id}/verdict-`) && /^approver: (approve|leave)\b/.test(e.body || "")));
    return v ? { outcome: /^approver: approve/.test(v.body) ? "approve" : "leave", event: v.seq } : { outcome: "stopped" };
  }
  const submit = last(moved(mine, "submit", "submit-spec"));
  if (!submit) return { outcome: returned && !error ? "no-submit" : "stopped" };
  const review = last(events.filter((e) => e.type === "reviewed" && e.seq > submit.seq));
  return { outcome: review ? review.verdict : "in-review", event: submit.seq };
}

// A writer that may be sent its next round keeps its token; every other run's is ended with its `cost` event.
export const keepsToken = (role: string, outcome: string) => WRITERS.includes(role) && ["in-review", "changes", "no-submit"].includes(outcome);

// The role the queue asks for, of one issue.
export function roleOf(id: string, queue: { queue?: Ev[]; waiting?: Ev[] }): string | null {
  const e = (queue.queue || []).find((x) => x.id === id);
  if (e && e.do === "start") return (e.labels || []).includes("digest") ? "digest" : "implementer";
  if (e && e.do === "spec") return "spec-writer";
  if (e && e.do === "review") return "reviewer";
  const w = (queue.waiting || []).find((x) => x.id === id);
  return w && w.why === "owner" && w.state === "awaiting-approval" ? "approver" : null;
}

// The last lopecode-dev commit of a submit's refs: what follows `lopecode-dev@`, or a value that names no repository.
export const shaOf = (refs: Ev[]): string | undefined =>
  last((refs || []).filter((r) => r.kind === "commit").map((r) => String(r.value)).map((v) => (v.includes("@") ? (v.startsWith("lopecode-dev@") ? v.slice(13) : "") : v)).filter(Boolean));

// ---- the machine
const HERE = import.meta.dir, env = process.env;
const sh = (cmd: string, args: string[], more: Record<string, string> = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", env: { ...env, ...more }, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, out: r.stdout || "", err: r.stderr || "" };
};
const say = (o: any) => console.log(JSON.stringify(o));
const stop = (code: number, text: string): never => { console.error("loop.ts: " + text); process.exit(code); };
const ROOT = () => env.LOOP_ROOT || dirname(sh("git", ["-C", HERE, "rev-parse", "--path-format=absolute", "--git-common-dir"]).out.trim());
const STATE = () => (env.BRAIN_STATE_DIR ? resolve(env.BRAIN_STATE_DIR) : join(ROOT(), "tools/cloud-brain/.emitted"));
const LOOP = () => join(STATE(), "issue-loop"), RUNS = () => join(LOOP(), "runs");
const HOST = () => env.LOOP_HOST || sh("hostname", ["-s"]).out.trim();
const words = (v: string | undefined, or: string[]) => (v ? v.split(" ") : or);
const tool = (cmd: string[], args: string[], more: Record<string, string> = {}) => sh(cmd[0], [...cmd.slice(1), ...args], more);
const worktree = (...a: string[]) => sh(env.LOOP_WORKTREE || join(HERE, "worktree.sh"), a);
const brain = (...a: string[]) => tool(words(env.LOOP_BRAIN, ["bun", join(HERE, "brain.ts")]), a, { BRAIN_BASE: "cb4", BRAIN_STATE_DIR: STATE() });

// One call of the tracker through issue-as.sh. The status is the ` [200]` it writes on stderr; 0 when nothing was sent.
function as(token: string, method: string, body?: any) {
  const r = sh(env.ISSUE_AS || join(HERE, "issue-as.sh"), [token, method, ...(body === undefined ? [] : [JSON.stringify(body)])]);
  const status = Number((r.err.match(/\[(\d{3})\]/) || [])[1] || 0);
  let data: any = null;
  try { data = JSON.parse(r.out); } catch {}
  return { status, data, code: r.code, err: r.err.trim() };
}
const own = (file?: Run) => env.LOOP_TOKEN || (file && file.as) || stop(2, "no LOOP_TOKEN: the caller's own token for the tracker. Nothing was read or sent");
const read = (token: string, method: string) => { const r = as(token, method); if (r.status !== 200 || !r.data) stop(1, `${method} answered ${r.status || "nothing"} ${r.err}`); return r.data; };
const write = (token: string, method: string, body: any) => { const r = as(token, method, body); return { ok: r.status === 200, seq: r.data && r.data.seq, duplicate: !!(r.data && r.data.duplicate), status: r.status, said: r.data && (r.data.message || r.data.error) }; };
// A token is live when a read sent with it is answered: issue-as.sh keeps it (not exit 2) and cb4 does not refuse it.
const live = (token: string, id: string) => as(token, `get?id=${id}`).status === 200;

const fileOf = (token: string) => join(RUNS(), token + ".json");
const load = (token: string): Run | null => { try { return JSON.parse(readFileSync(fileOf(token), "utf8")); } catch { return null; } };
const save = (run: Run) => { mkdirSync(RUNS(), { recursive: true }); writeFileSync(fileOf(run.token) + ".tmp", JSON.stringify(run, null, 1) + "\n"); renameSync(fileOf(run.token) + ".tmp", fileOf(run.token)); };
// The time a process began, and "" where `ps` is not run: it is setuid, and the sandbox of a session (safehouse) refuses it.
const began = (pid: number) => { const r = sh("ps", ["-o", "lstart=", "-p", String(pid)]); return r.code === 0 ? r.out.trim() : ""; };
// A pid alone is not the test: after a restart another process may have it. The wrapper's command line names the run
// (`loop-run-<token>`, read with pgrep, which the sandbox lets run), and the time the process began is compared as well
// where the file has one and `ps` gives one.
export const alive = (run: { token?: string; pid?: number; began?: string }) => {
  if (!run.pid || !run.token) return false;
  if (!sh("pgrep", ["-f", `loop-run-${run.token}( |$)`]).out.split("\n").includes(String(run.pid))) return false;
  const now = began(run.pid);
  return !run.began || !now || now === run.began;
};

// The run, detached: agent.sh, its line to the result file, its exit beside it, then `ended`. The result is moved
// into place when it is whole, so a result file that is there is one the process finished writing.
function detach(run: Run, agent: string, args: string[], more: Record<string, string>) {
  const base = join(RUNS(), run.token), log = openSync(base + ".log", "a");
  for (const f of [".result.json", ".exit"]) rmSync(base + f, { force: true });
  const script = 'A="$1"; shift; "$A" "$@" > "$LOOP_RUN.result.tmp"; echo $? > "$LOOP_RUN.exit"; mv "$LOOP_RUN.result.tmp" "$LOOP_RUN.result.json"; exec bun "$LOOP_TS" ended "$LOOP_RUN_TOKEN"';
  const strip = Object.fromEntries(Object.entries(env).filter(([k]) => !["WORK", "SESSION", "TAB", "READS", "CHECKOUT", "DRY"].includes(k)));
  const child = spawn("bash", ["-c", script, "loop-run-" + run.token, agent, ...args], { detached: true, stdio: ["ignore", log, log], env: { ...strip, ...more, LOOP_RUN: base, LOOP_TS: import.meta.path, LOOP_RUN_TOKEN: run.token, LOOP_TOKEN: own(run) } as any });
  child.unref();
  closeSync(log);
  return { pid: child.pid!, began: began(child.pid!) };
}

// A writer's worktree: the first name that takes the token. `owner` says whose unlanded work stands at a path.
function place(first: string, topic: string, token: string, id: string, owner: (path: string) => string | undefined, me: string, alone = false) {
  for (const name of [first, ...(alone ? [] : [2, 3, 4, 5].map((n) => `${topic}.${n}`).filter((n) => n !== first))]) {
    const r = worktree("--fresh", name, "--for", token), path = join(ROOT(), ".claude/worktrees/bm-" + name);
    if (r.code === 0) return { tree: name, path: r.out.trim(), unlanded: false };
    if (alone) return { fail: r.code === 2 ? 2 : 1, said: `worktree.sh --fresh ${name}: exit ${r.code} ${r.err.trim()}` };
    if (r.code === 3 && owner(path) === id) return { tree: name, path, unlanded: true };
    if (r.code === 3 && owner(path)) write(me, "comment", { key: `orch/${owner(path)}/stands-${token}`, id: owner(path), body: `The worktree bm-${name} holds work of this issue that is not landed (${r.err.trim().split("\n").pop()}). ${id} is started in the next name; nothing there was touched.` });
    if (r.code !== 3 && r.code !== 4) return { fail: r.code === 2 ? 2 : 1, said: `worktree.sh --fresh ${name}: exit ${r.code} ${r.err.trim()}` };
  }
  return { fail: 1, said: `no worktree of ${topic} to ${topic}.5 took the token` };
}
const worktreeComments = (events: Ev[]) => events.filter((e) => e.type === "commented" && /^worktree \{/.test(e.body || "")).map((e) => { try { return JSON.parse(e.body.slice(9)); } catch { return {}; } });
const unmake = (run: Run, text: string, code = 1): never => {
  if (run.made) brain("agent-token", "revoke", run.token);
  if (run.tree) WRITERS.includes(run.role) || run.role === "overseer" ? worktree("--leave", run.tree) : worktree("--remove", run.tree, "--force");
  rmSync(fileOf(run.token), { force: true });
  return stop(code, text + (run.made ? `; the token ${run.token} is ended` : ""));
};
const lastOversight = (file: string) => { try { return (last([...readFileSync(file, "utf8").matchAll(/^## .*events \d+ to (\d+)/gm)]) || [])[1] || ""; } catch { return ""; } };

function start(args: string[]) {
  const me = own(), flag = (n: string) => { const i = args.indexOf(n); if (i < 0) return undefined; const v = args.splice(i, 2)[1]; return v && !v.startsWith("--") ? v : stop(2, `${n} takes a value`); };
  let role = flag("--role"), given = flag("--token");
  const id = args[0] || "";
  if (!id && role !== "overseer") stop(2, "start <id> [--role <role>] [--token <t>], or start --role overseer");
  if (role === "overseer" && id) stop(2, "an overseer is on no issue: start --role overseer");
  const got = id ? read(me, `get?id=${id}`) : { issue: { id: "", labels: [] }, events: [] };
  if (id && !(got.issue && got.issue.id)) stop(1, `no issue ${id} that ${me} reads`);
  const issue = got.issue, events: Ev[] = got.events || [];
  role = role || roleOf(id, read(me, "queue?limit=500")) || stop(1, `the queue has no entry that starts an agent on ${id}; name one with --role`);
  if (!PREFIX[role!]) stop(2, `--role is one of ${Object.keys(PREFIX).join(", ")}`);
  const run: Run = { id, role: role!, round: roundOf(role!, events), token: given || "", session: randomUUID(), how: role === "reviewer" ? "light" : "fresh", as: me, made: !given, host: HOST(), startedAt: Date.now() };
  // The longest key of the run is refused before anything is made: the service keeps 100 characters.
  const longest = endKey({ ...run, token: given || PREFIX[run.role] + "-000000", how: "resumed", at: 9999999 });
  if (longest.length > KEY_MOST) stop(1, `the key ${longest} would be ${longest.length} characters, and the tracker keeps ${KEY_MOST}`);
  const root = ROOT();
  // A token that was given is one issue-as.sh keeps and cb4 answers: else its agent could write nothing.
  if (given && as(given, id ? `get?id=${id}` : "queue?limit=1").status !== 200) stop(1, `--token ${given}: a read with it was not answered; nothing was started`);
  if (!given) {
    const t = brain("agent-token", PREFIX[run.role], id || `oversight-after-${lastOversight(join(root, ".claude/skills/brain-maintenance/oversight.md"))}`);
    if (t.code !== 0 || !/^[a-z]+-[0-9a-f]{6}$/.test(t.out.trim())) stop(1, `agent-token made no token: ${(t.out + t.err).trim()}`);
    run.token = t.out.trim();
  }
  let agent: string, argv: string[], vars: Record<string, string>;
  if (WRITERS.includes(run.role) || run.role === "overseer") {
    const topic = run.role === "overseer" ? "over-" + run.host : issue.parent || id;
    const tEvents: Ev[] = topic === id || run.role === "overseer" ? events : (as(me, `get?id=${topic}`).data || {}).events || [];
    const notes = [...worktreeComments(tEvents), ...worktreeComments(events)];
    const p: any = place(topic, topic, run.token, id, (path) => (last(notes.filter((c) => c.path === path)) || {}).for, me, run.role === "overseer");
    if (p.fail) unmake(run, p.said, p.fail);
    Object.assign(run, { tree: p.tree, path: p.path, topic });
    if (run.role !== "overseer") {
      const at = sh("git", ["-C", p.path, "rev-parse", "origin/main"]).out.trim();
      const n = tEvents.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`orch/${topic}/worktree-`)).length + 1;
      const c = write(me, "comment", { key: `orch/${topic}/worktree-${n}`, id: topic, body: "worktree " + JSON.stringify({ topic, branch: "bm/" + p.tree, machine: run.host, path: p.path, ...(at ? { at } : {}), for: id }) });
      if (!c.ok) console.error(`loop.ts: the worktree comment on ${topic} was not written: ${c.status} ${c.said || ""}`);
    }
    const third = run.role === "overseer" ? `Last oversight ended at event ${lastOversight(join(p.path, ".claude/skills/brain-maintenance/oversight.md")) || lastOversight(join(root, ".claude/skills/brain-maintenance/oversight.md"))}. Journal: ${join(LOOP(), "/")}` : `Issue: ${id}`;
    const prompt = [`Working directory: ${p.path}.`, `Read ${p.path}/.claude/skills/brain-maintenance/agents/${BRIEF[run.role]}.md and follow it.`, third, `Your token is ${run.token}.`, ...(p.unlanded ? ["The worktree holds unlanded work of this issue."] : [])].join("\n");
    agent = env.LOOP_AGENT || join(p.path, "cloud-brain-dev/agent.sh"); argv = [run.role, prompt]; vars = { WORK: p.path, SESSION: run.session! };
  } else {
    const view = (run.role === "reviewer" ? "rev-" : "appr-") + id, submit = last(moved(events, "submit", "submit-spec")), refs: Ev[] = (submit && submit.refs) || [];
    const main = () => { if (sh("git", ["-C", root, "fetch", "--no-recurse-submodules", "origin", "main"]).code !== 0) unmake(run, "origin was not reached", 2); return sh("git", ["-C", root, "rev-parse", "origin/main"]).out.trim(); };
    let sha = (run.role === "reviewer" && shaOf(refs)) || main(), v = worktree("--at", sha, view);
    if (v.code === 1 && /no commit/.test(v.err) && run.role === "reviewer") { sha = main(); v = worktree("--at", sha, view); }
    if (v.code !== 0) unmake(run, `worktree.sh --at ${sha} ${view}: exit ${v.code} ${v.err.trim()}`, v.code === 2 ? 2 : 1);
    const path = v.out.trim();
    Object.assign(run, { tree: view, path, sha });
    agent = env.LOOP_AGENT || join(path, "cloud-brain-dev/agent.sh");
    if (run.role === "reviewer") {
      const commits = refs.filter((r) => r.kind === "commit").map((r) => (String(r.value).includes("@") ? String(r.value) : "lopecode-dev@" + r.value));
      const needs = commits.length ? sh(env.LOOP_NEEDS_TAB || join(HERE, "review-needs-tab.sh"), commits).code : 1;
      const before = existsSync(RUNS()) ? readdirSync(RUNS()).filter((f) => /^rev-[0-9a-f]{6}\.json$/.test(f)).map((f) => load(f.slice(0, -5))).some((r) => r && r.id === id && r.neededTab) : false;
      run.tab = needs === 0 || needs === 2 || refs.some((r) => r.kind === "url") || before;
      argv = ["reviewer", `review issue ${id}; your token is ${run.token}`]; vars = { CHECKOUT: path, SESSION: run.session!, ...(run.tab ? { TAB: "1" } : {}) };
    } else {
      argv = ["approver", ["Run `bun " + path + "/tools/cloud-brain/approver.ts brief` and follow what it prints.", `Issue: ${id}`, `Your token is ${run.token}.`].join("\n")]; vars = { WORK: path, SESSION: run.session! };
    }
  }
  save(run);
  Object.assign(run, detach(run, agent, argv, vars), { agent: "" });
  run.agent = `${run.host}:${run.pid}`;
  save(run);
  if (run.role !== "overseer") {
    const c = write(me, "cost", { key: costKey(run), id, role: run.role, round: run.round, how: run.how, outcome: "running", seconds: 0, context: 0, token: run.token, session: run.session, agent: run.agent });
    if (!c.ok) console.error(`loop.ts: the running event was not written: ${c.status} ${c.said || ""}`);
    run.running = c.ok ? c.seq : 0;
  } else run.running = 0;
  save({ ...load(run.token), ...run } as Run);
  say({ started: run.token, id, role: run.role, round: run.round, how: run.how, session: run.session, agent: run.agent, tree: run.tree, path: run.path, event: run.running || undefined, key: run.role === "overseer" ? undefined : costKey(run) });
}

async function ended(args: string[], quiet = false): Promise<any> {
  const token = args[0] || stop(2, "ended <token>");
  let run = load(token) || stop(1, `no file ${fileOf(token)}: ${token} is no run this machine started`);
  const me = own(run), base = join(RUNS(), token);
  if (run.ended) { const o = { already: token, ...run.ended }; quiet || say(o); return o; }
  if (!existsSync(base + ".result.json") && alive(run)) { quiet || stop(3, `${token} still runs: ${run.agent}${run.began ? ", since " + run.began : ""}`); return { runs: token }; }
  // `start` writes the event after the process is begun: an agent that ends at once waits here for it, 30 s at most.
  for (let i = 0; run.running === undefined && Date.now() - (run.startedAt || 0) < 60000 && i < 60; i++) { await Bun.sleep(500); run = load(token) || run; }
  let result: any = null;
  try { result = JSON.parse(readFileSync(base + ".result.json", "utf8")); } catch {}
  const exit = existsSync(base + ".exit") ? Number(readFileSync(base + ".exit", "utf8").trim()) : -1;
  const events: Ev[] = run.id ? read(me, `get?id=${run.id}`).events || [] : [];
  const { outcome, event } = outcomeOf(run, events, !!result, exit === 1);
  const usage = result && run.session ? tool(words(env.LOOP_USAGE, ["bun", join(HERE, "agent-usage.ts")]), ["--session", run.session, ...(run.how === "resumed" ? ["--last-run"] : [])]) : { code: 1, out: "" };
  let billed: any;
  try { billed = usage.code === 0 ? JSON.parse(usage.out) : undefined; } catch {}
  const cost = { role: run.role, round: run.round, how: run.how, outcome, seconds: Math.round(((result && result.ms) || 0) / 1000), context: (result && result.context) || 0,
    ...(event ? { event } : {}), agent: run.agent, session: run.session, token, ...(billed ? { usage: billed } : {}), ...(result && typeof result.usd === "number" ? { usd: result.usd } : {}) };
  let seq: number | undefined;
  if (run.role !== "overseer") {
    const c = write(me, "cost", { key: endKey(run), id: run.id, ...cost });
    if (!c.ok) stop(1, `the cost event of ${token} was not written (${c.status} ${c.said || ""}); nothing else was done, run it again`);
    seq = c.seq;
  }
  // The journal has no key: a file made with "wx" is made once, and its maker appends.
  const mark = `${base}.journal-${run.round}-${run.at || 0}`;
  let first = true;
  try { closeSync(openSync(mark, "wx")); } catch { first = false; }
  if (first) {
    const head = `## ${run.role} round ${run.round} (${run.how}, loop.ts), ended ${new Date().toString().slice(0, 33)}, outcome ${outcome}, token ${token}, context ${cost.context}, ${cost.seconds} s${cost.usd !== undefined ? `, usd ${cost.usd}` : ""}, session ${run.session}, agent ${run.agent}`;
    mkdirSync(LOOP(), { recursive: true });
    appendFileSync(join(LOOP(), (run.id || "_oversight") + ".md"), `\n${head}\n\n${run.id ? "" : JSON.stringify(cost) + "\n\n"}${result && typeof result.result === "string" ? result.result : `(no report: the process gave no result line, exit ${exit})`}\n`);
  }
  const notes: string[] = [];
  if (run.tree && (WRITERS.includes(run.role) || run.role === "overseer")) worktree("--leave", run.tree);
  else if (run.tree) {
    let r = worktree("--remove", run.tree);
    // An approver writes no file in its view; a reviewer's is kept when a commit of its own stands there.
    if (r.code === 3 && (run.role === "approver" || (/(^|\s)ahead=0\b/.test(r.err) && /(^|\s)dev-ahead=0\b/.test(r.err)))) { notes.push(`the view ${run.tree} was not clean (${r.err.trim().split("\n").pop()}) and was removed with --force`); r = worktree("--remove", run.tree, "--force"); }
    else if (r.code === 3) notes.push(`the view ${run.tree} is left: a commit stands there that was not pushed (${r.err.trim().split("\n").pop()})`);
  }
  if (run.role === "reviewer" && result && /^needed a tab/.test(result.result || "")) run.neededTab = true;
  const end = run.made && !keepsToken(run.role, outcome);
  if (end) { const r = brain("agent-token", "revoke", token); if (r.code !== 0) notes.push(`agent-token revoke ${token}: ${(r.out + r.err).trim()}`); }
  run.ended = { at: Date.now(), outcome, ...(seq ? { event: seq } : {}), token: end ? "ended" : run.made ? "kept" : "given, not ended", ...(notes.length ? { notes } : {}) };
  save(run);
  const o = { ended: token, id: run.id, role: run.role, round: run.round, ...run.ended };
  quiet || say(o);
  return o;
}

async function resume(args: string[]) {
  const me = own(), i = args.indexOf("--role"), asked = i < 0 ? undefined : args.splice(i, 2)[1] || stop(2, "--role takes a value");
  const id = args[0] || stop(2, "resume <id> [--role <role>]");
  let got = read(me, `get?id=${id}`), issue = got.issue || stop(1, `no issue ${id} that ${me} reads`), events: Ev[] = got.events || [];
  const role = asked || (issue.state === "spec" ? "spec-writer" : (issue.labels || []).includes("digest") ? "digest" : "implementer");
  if (!WRITERS.includes(role)) stop(2, `a round is sent to a writer: --role is one of ${WRITERS.join(", ")}`);
  const state = role === "spec-writer" ? "spec" : "in-progress";
  if (issue.state !== state) stop(1, `${id} is at ${issue.state}: a round of a ${role} is sent at ${state}. Nothing was done`);
  const at = resumeAt(id, events);
  if (!at) stop(1, `${id} has no rework or respec move and no go-on verdict: there is no round to send. Nothing was done`);
  const lastRun = () => last(((read(me, `runs?id=${id}&role=${role}`).runs || []) as Ev[]).sort((a, b) => a.round - b.round || a.seq - b.seq));
  let run = lastRun();
  const here = (r?: Ev) => !!r && String(r.agent || "").startsWith(HOST() + ":");
  if (run && run.outcome === "running") {
    if (!here(run)) stop(3, `the ${role} of ${id} runs on another machine (${run.agent}); nothing was sent`);
    const o = await ended([run.token], true);
    if (o.runs) stop(3, `the ${role} of ${id} still runs (${run.agent}) and takes the round itself; nothing was sent`);
    run = lastRun(); got = read(me, `get?id=${id}`); events = got.events || [];
  }
  const round = roundOf(role, events), file = run && run.token ? load(run.token) : null;
  const why = !run ? "it has no run of that role in the record" : !run.session ? "its last run names no session" : !run.token ? "its last run names no token" : !here(run) ? `its last run is another machine's (${run.agent})` : !live(run.token, id) ? `its token ${run.token} no longer reads the tracker` : "";
  if (why) {
    // "A dead writer": its token ended (a role's token is the owner's), then `back`. The issue is a start at the next read.
    const named = run && /^(impl|dig|spec)-[0-9a-f]{6}$/.test(run.token || "") ? run.token : "";
    const revoked = named && !(file && file.made === false) ? brain("agent-token", "revoke", named) : null;
    const key = backKey(id, run && run.token, events);
    const b = write(me, "move", { key, id, to: role === "spec-writer" ? "open" : "ready", reason: `A dead writer: the round of event ${at} cannot be sent to the ${role} that started it, since ${why}. ${revoked ? `Its token ${named} is ended. ` : ""}The next writer makes its own start.`, refs: [] });
    const ended = revoked ? ` The token ${named} is ended.` : "";
    if (!b.ok) stop(1, `back was not made: ${b.status} ${b.said || ""}`);
    // A key the tracker has is answered 200 and nothing is written: the event of that seq is not this `back`.
    if (b.duplicate) stop(1, `back was not made: the tracker has the key ${key} at event ${b.seq} and wrote nothing; ${id} is at ${read(me, `get?id=${id}`).issue.state}.${ended}`);
    return say({ dead: id, role, why, token: revoked ? `${named} ended` : "none ended", back: b.seq });
  }
  const topic = issue.parent || id, tEvents: Ev[] = topic === id ? events : (as(me, `get?id=${topic}`).data || {}).events || [];
  const notes = [...worktreeComments(tEvents), ...worktreeComments(events)];
  const first = (file && file.tree) || (last(notes.filter((c) => c.for === id && c.branch)) || {}).branch?.slice(3) || topic;
  const p: any = place(first, topic, run!.token, id, (path) => (last(notes.filter((c) => c.path === path)) || {}).for, me);
  if (p.fail) stop(p.fail, p.said + "; nothing was sent");
  if (p.tree !== first) {
    const n = tEvents.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`orch/${topic}/worktree-`)).length + 1, sha = sh("git", ["-C", p.path, "rev-parse", "origin/main"]).out.trim();
    write(me, "comment", { key: `orch/${topic}/worktree-${n}`, id: topic, body: "worktree " + JSON.stringify({ topic, branch: "bm/" + p.tree, machine: HOST(), path: p.path, ...(sha ? { at: sha } : {}), for: id }) });
  }
  const review = last(events.filter((e) => e.type === "reviewed"));
  const brief = role === "spec-writer" ? `${p.path}/.claude/skills/brain-maintenance/agents/spec.md` : role === "digest" ? `${p.path}/.claude/skills/brain-maintenance/agents/digest.md` : `${p.path}/.claude/skills/brain-maintenance/agents/implementer/resumed-round.md`;
  const message = [`Issue: ${id}, sent back by the review at event ${review ? review.seq : at}.`, `Working directory: ${p.path}.`, `A resumed round: read ${brief}, "A resumed round", and follow it.`].join("\n");
  const base = join(RUNS(), run!.token);
  if (existsSync(base + ".result.json")) renameSync(base + ".result.json", `${base}.result.${file ? file.round : 0}-${(file && file.at) || 0}.json`);
  const next: Run = { ...(file || {}), id, role, round, token: run!.token, session: run!.session, how: "resumed", at, as: me, made: file ? file.made : true, host: HOST(), tree: p.tree, path: p.path, topic, startedAt: Date.now() };
  delete next.ended; delete next.running;
  save(next);
  Object.assign(next, detach(next, env.LOOP_AGENT || join(p.path, "cloud-brain-dev/agent.sh"), ["--resume", next.session!, message], { WORK: p.path }));
  next.agent = `${next.host}:${next.pid}`;
  save(next);
  const c = write(me, "cost", { key: costKey(next), id, role, round, how: "resumed", outcome: "running", seconds: 0, context: 0, token: next.token, session: next.session, agent: next.agent });
  if (!c.ok) console.error(`loop.ts: the running event was not written: ${c.status} ${c.said || ""}`);
  next.running = c.ok ? c.seq : 0;
  save({ ...load(next.token), ...next } as Run);
  say({ resumed: next.token, id, role, round, at, session: next.session, agent: next.agent, tree: next.tree, path: next.path, event: next.running || undefined, key: costKey(next) });
}

function dead(args: string[]) {
  const me = own(), flag = (n: string) => { const i = args.indexOf(n); if (i < 0) return undefined; const v = args.splice(i, 2)[1]; return v && !v.startsWith("--") ? v : stop(2, `${n} takes a value`); };
  const role = flag("--role") || stop(2, "dead <id> --role <role> [--round <n>]"), asked = flag("--round"), id = args[0] || stop(2, "dead <id> --role <role> [--round <n>]");
  const events: Ev[] = read(me, `get?id=${id}`).events || [], round = asked ? Number(asked) : roundOf(role, events);
  if (!Number.isInteger(round) || round < 1) stop(2, "--round is a whole number, 1 or more");
  const d = deadRuns(events, role, round);
  say({ id, role, round, dead: d.length, events: d.map((e) => e.seq) });
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "start") start(args);
  else if (cmd === "ended") await ended(args);
  else if (cmd === "resume") await resume(args);
  else if (cmd === "dead") dead(args);
  else stop(2, "start <id> [--role <role>] [--token <t>] | ended <token> | resume <id> [--role <role>] | dead <id> --role <role> [--round <n>]");
}
