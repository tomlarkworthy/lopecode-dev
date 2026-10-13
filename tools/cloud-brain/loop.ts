#!/usr/bin/env bun
// loop.ts: a run of an agent of the issue loop is started and ended by a program, and is in the record between.
// Part 2 of plan/cloud-brain-orchestrator-as-steps.md (st-2-loop-start-and-end); tools/cloud-brain/records/st-2-loop-start-and-end.md.
// `step` is part 3 of that spec, one pass made by a program (st-3-step; tools/cloud-brain/records/st-3-step.md), and
// since st-4-orchestrator-brief it starts the judgment run (tools/cloud-brain/records/st-4-orchestrator-brief.md).
// `run` is part 4, the driver that makes the steps (st-5-driver; tools/cloud-brain/records/st-5-driver.md).
// `compare` is the R8 check, what dry steps named beside what was done (st-6-a-day-beside-the-session;
// tools/cloud-brain/records/st-6-a-day-beside-the-session.md).
// Nothing of the loop calls it yet: SKILL.md steps 4 and 5 are as they were until st-7.
//
//   bun tools/cloud-brain/loop.ts run                                   (on the laptop: tools/cloud-brain/loop.sh)
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts run --dry
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts step [--dry] [--for clock|event|run]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts start <id> [--role <role>] [--token <t>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts start --role overseer [--token <t>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts start [<id>] --role orchestrator --token <t> --give "<entries>"
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts ended <token>
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts resume <id> [--role <role>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts dead <id> --role <role> [--round <n>]
//   LOOP_TOKEN=<own token> bun tools/cloud-brain/loop.ts compare [--since <hours>] [--steps <file>] [--by <names>]
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
//         --role orchestrator is a judgment run, which `step` starts and nobody else: the model that decides the
//         entries --give names, by the brief agents/orchestrator.md. Its token is the step's making (--token, which
//         it must have) and is ended with the run; its worktree is `orch-<host>`, with no comment; the third line of
//         its prompt is `Entries: <--give>`; its event is on <id>, the first issue of its entries, with the round one
//         more than the runs of that role the issue has. With no <id> (a cluster that is not healthy is all it was
//         given) it has the file and no event, and its report goes to _judgment.md of the journal. Exit 3 and
//         nothing started while a judgment run of this machine runs.
// ended   SKILL.md step 5 as code, when the wrapper has returned. No result and a process that lives: exit 3. The
//         outcome is read from the issue and not from the report: a writer's `in-review`, `pass` or `changes` (its
//         submit, and the review after it), `no-submit` (a result, no submit), `stopped` (no result, or an error);
//         a reviewer's verdict, or `stopped`; an approver's `approve` or `leave`, or `stopped`; an overseer's and a
//         judgment run's `done`, or `stopped` with no result or with one that was an error. Then the `cost`
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
//         The revoke is read by its exit: at 0 the `back`, the printed `token` and the line of exit 1 say `ended`,
//         at any other `not ended: exit N, <what the command answered>`; the `back` is made either way.
// dead    How many runs of a role and round died: the `cost` events of get?id= with the outcome `stopped` or
//         `no-submit`. `runs` keeps one run a role and round and cannot say.
//
// step    One pass: SKILL.md steps 1 to 3 as code. It keeps nothing between two runs but the files of runs/. In order:
//         1. health: the two pulls of the main checkout (`cloud-brain-dev` once more after `deploy/` is put back and
//            `sync.ts` when the refusal names a file under it), its two reads, `worktree.sh --list` with the removals
//            of SKILL.md step 1, `brain.ts redistil` (every Worker `same`), `brain.ts state` against seen.json of
//            origin/main, `lock.sh show land` and `show cb4`. A refused pull, a copy that is behind and a worktree
//            with unlanded work are notes of the status. Not healthy is a Worker that is not `same` or not at its
//            hash, a command of those that failed, or a lock cb4 did not say: then no run is ended and no agent of
//            an issue started, and the line's `given` has one entry `unhealthy` with what failed, which has no issue
//            and no comment and is the task of a judgment run at each such step (item 5);
//         2. runs: for each file of runs/ of this machine that is not ended, `ended` when its process returned or is
//            gone, and the `running` event when a `start` died before it wrote one and the process lives; and a
//            writer's token that `ended` kept is ended when its issue is `done`, `rejected` or closed;
//         3. the queue (`queue?limit=500`) and its table, by `get?id=` of each entry it acts on. `review`: start a
//            reviewer. `round`: `resume`; nothing with a `waiter`, a running writer, or `needs-owner` and no word
//            of the owner after the label. `ready` and `finish`: the move. `start`, `spec`: start the writer.
//            `waiting`, `owner`, at `awaiting-approval` with no verdict of the round and no `leave`: start the
//            approver. `waiting`, `work`, no running writer, no `waiter`: "A dead writer", the token ended and
//            `back`; labeled `needs-owner` it is the owner's, as a `round` so labeled, and no `back` is made. A digest the snapshot opened: the older ones rejected, `triage`, `ready`. An overseer when 3
//            issues came to `done`, `rejected` or `needs-owner`, or one to its third `rework`, since the last
//            heading of oversight.md, none runs, and fewer than 2 were started since. No agent of a role is
//            started on an issue that has a `running` run of it (the writers are one role for this), nor at 2 dead
//            runs of the role and round. A running run of this machine whose process is gone and that has no file
//            is written `stopped`, or with its submit. An issue at work whose starter has no run in the record
//            (an agent a session started) is left while that token reads the tracker;
//         4. what stops a start of a writer or an approver: `uptime`'s first number at 15 or more, `land` naming one
//            holder in this line and the last of steps.jsonl 30 s or more apart, a result that was an error
//            (runs/<token>.exit is 1) in the last 30 minutes, or a review or a round of this step that was not started;
//         5. the judgment: the entries a model is to decide (`round` at 3 `rework` moves or after a run with no
//            submit, `dead`, `triage`, `decompose`, `promote`, `look`, `answer`, `asks`, `pm`), 5 at most a step,
//            each given once for one event <at> of its issue: a comment keyed orch/<id>/given-<do>-<at>, body
//            `given <do> at <at> to <token>, its run on <issue>`. The entries of a step are the task of one judgment
//            run, started at the step's end: the step makes its token (`agent-token orch judgment:<issue>`), writes
//            the comments, then `start [<issue>] --role orchestrator --token <token> --give "<do> <id> (event <at>);
//            …"`, with <issue> the first entry's. While a judgment run of this machine runs none is started and
//            no comment written: the entries are in `skipped` and are due at the next step. A start that failed is
//            written as a run that died (a `cost` event `stopped`, the token ended). A comment keyed
//            orch/<id>/verdict-<do>-<at> is the answer: `go-on` (the round is resumed, or one run more is started),
//            `not-answered`, `left` (in the status with its first line, for a session with the owner).
//            A given entry with no verdict is read by the run its comment names: `stopped` is given once more
//            (…-2), then or otherwise it is in the status and given to no model again;
//         6. one line of JSON appended to steps.jsonl and printed: { at, seq, health, land, stops, acts, given,
//            skipped }, `at` and `seq` the queue's `now` and `seq`; and status.md written again.
//         --dry prints the line and then the status, writes neither file, sends no write to the tracker, and runs no
//         pull, no removal, no `ended`, no start. Exit 1 with `error` in the line when a read was not answered,
//         the first of them `queue?limit=1`, before health: a token cb4 refuses is no cluster that is not healthy.
//         --for event and --for run are the driver's, a step begun for an event or for a run that ended: it leaves
//         out the two pulls, `worktree.sh --list` with its removals, `redistil` and `state`, reads the two locks, and
//         has `for` in its line and a note in the status. --for clock, or no --for, is the whole step.
//
// run     The loop: no model, one process, stopped with Ctrl-C (SIGINT or SIGTERM). It needs no LOOP_TOKEN. In order:
//         1. its token, `brain.ts agent-token orch driver:<host>`, and the lock `lock.sh take loop orchestrator-<host>`
//            with it. A take that is refused: stderr names the holder, the token is ended, exit 1 and no step. No
//            token, or cb4 not reached at the take: exit 2;
//         2. a step for the clock, `loop.ts step --for clock` with its token, and its line printed. Then every 30 s
//            it looks for a reason, and runs one step at a time: `event`, when `sync?after=<the last seq it read>` has
//            an event whose `by.holder` is not a token of this driver; `run`, when a file of runs/ of this machine is
//            not ended and has a result or a process that is gone, once a file; `clock`, 1,800 s after the last step
//            for the clock began, and in the place of an `event` or a `run` after a step that was not healthy, had an
//            `error` or printed no line. The last seq is the `seq` of a step's line, or the last event read;
//         3. a step whose line has a move that was made (`ready`, `finish`, `back`, `digest`, `reject`, with an
//            `event` and no `duplicate`) is followed at once by a step for an event, 20 one after another at most;
//         4. the lock is renewed every 120 s, also while a step runs. A renew that is refused: no more steps after
//            the one that runs, no release, exit 1. One cb4 did not answer is asked again in 30 s;
//         5. at 40 hours of its token, between two steps: a new token, `loop` released, taken with the new one, and
//            the old one ended. No new token: the old is kept and it is asked again in 30 s. A take that is refused
//            there: both tokens ended, exit 1;
//         6. a step that exits other than 0 or prints no line is said on stderr, and the driver goes on at the next
//            reason. At a signal it waits for the step that runs, releases `loop`, ends its token and exits 0. The
//            token is left, and stderr says so, when a run it started has not ended: the run's `ended` is made with it.
//         --dry runs `step --dry` at each reason with LOOP_TOKEN, the caller's: no token is made, no lock asked, and
//         every event is a reason, the caller's own too. It prints each step's line and not its status.
//         stdout is one line of JSON a step; stderr has what the driver says, each line `loop.ts run: …`.
//
// compare The R8 check: what dry steps named, beside what was done. It reads the lines of steps from steps.jsonl, or
//         from --steps <file>, the output of `run --dry` (a dry step writes no steps.jsonl; a line that is no step's
//         is left out and counted), with --since <hours> those of the last hours by this machine's clock; and the
//         events from 200 before the seq of the first line (`sync?after=`, every page). It writes nothing. stdout is
//         one line of JSON, then the same as text, four lists:
//         - named and done: an act a step named, the first event after that step that did the same, and the minutes
//           between. `ready`, `finish`, `back`: that move. `reject`: a move to `rejected`. `digest`: `triage`.
//           `start`: a `cost` event of the role, or the agent's own first event (a writer's `start`, a spec writer's
//           `spec`, `reviewed`, a comment keyed `approver/…`): the loop of a session wrote no `running` event, so of
//           an agent it started the first event is the agent's, and for a reviewer it is the review. `resume`: a
//           `cost` event `resumed`, or the next submit. `ended`, `stopped`, `running`: the `cost` event of that token.
//           `worktree-remove`: the comment keyed `…/worktree-removed-…` on the issue of the tree's name. Each entry
//           given to a judgment run is an act `given`: the first event of a session's token on that issue that is
//           no `cost` event and no `worktree` comment. An act named again by a step that read its event is a new row;
//         - named and not done: the rows with no such event, with how many steps named each, the first and the last;
//         - of a kind the record has no event of: `token-ended`, and the start of an overseer, which is on no issue;
//         - done and named by no step: each event after the first line by a token whose name begins as --by has it
//           (`orch-,out-` with none: an orchestrating session's and a session's the owner is in) that is the event of
//           no row, and each `start` or `spec` move of an agent that no `running` event names, with the seq the step
//           before it read and the minutes since. A step reads the record as it is when it runs: what a session did
//           before the next step read is named by no step, whether or not a step would have named it.
//         Exit 1: no such file, or a read the tracker did not answer. Exit 2: the arguments, or no LOOP_TOKEN.
//
// The tools it runs, each named by an environment variable for tests/tools/loop.test.ts: ISSUE_AS (issue-as.sh),
// LOOP_WORKTREE (worktree.sh), LOOP_BRAIN (`bun brain.ts`), LOOP_AGENT (agent.sh of the worktree or the view),
// LOOP_USAGE (`bun agent-usage.ts`), LOOP_NEEDS_TAB (review-needs-tab.sh), LOOP_HOST (`hostname -s`), LOOP_ROOT (the
// main checkout), and for `step` LOOP_LOCK (lock.sh), LOOP_UPTIME (`uptime`) and LOOP_SELF (`bun loop.ts`, for its
// `start`, `resume` and `ended`, and for the `step` of `run`). The files are under BRAIN_STATE_DIR, or the main checkout's tools/cloud-brain/.emitted.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { facts as approverFacts } from "./approver.ts";

// ---- what is read from the record, with no call
export const PREFIX: Record<string, string> = { implementer: "impl", digest: "dig", "spec-writer": "spec", reviewer: "rev", approver: "appr", overseer: "over", orchestrator: "orch" };
export const BRIEF: Record<string, string> = { implementer: "implementer", digest: "digest", "spec-writer": "spec", overseer: "overseer", orchestrator: "orchestrator" };
// The roles whose run is in a worktree of the machine and not of an issue: `over-<host>`, `orch-<host>`.
const ALONE: Record<string, string> = { overseer: "over-", orchestrator: "orch-" };
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
// A judgment run's round is one more than the runs of that role the issue has: no run takes another's place in `runs`.
export const judgmentRound = (runs: Ev[]) => Math.max(0, ...(runs || []).filter((r) => r.role === "orchestrator").map((r) => Number(r.round) || 0)) + 1;

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
  // An overseer and a judgment run leave no one move to read: `done`, or `stopped` with no result or one that was an error.
  if (ALONE[run.role]) return { outcome: returned && !error ? "done" : "stopped" };
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
// `agent-token revoke`, read by its exit: "ended", or "not ended: exit N, <what the command answered>".
const revoke = (token: string) => { const r = brain("agent-token", "revoke", token); return r.code === 0 ? "ended" : `not ended: exit ${r.code}, ${(r.out + r.err).trim().replace(/\s+/g, " ") || "it answered nothing"}`; };

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

const runFiles = () => (existsSync(RUNS()) ? (readdirSync(RUNS()).filter((f) => /^[a-z]+-[0-9a-f]{6}\.json$/.test(f)).sort().map((f) => load(f.slice(0, -5))).filter(Boolean) as Run[]) : []);
const fileOf = (token: string) => join(RUNS(), token + ".json");
const load = (token: string): Run | null => { try { return JSON.parse(readFileSync(fileOf(token), "utf8")); } catch { return null; } };
const save = (run: Run) => { mkdirSync(RUNS(), { recursive: true }); writeFileSync(fileOf(run.token) + ".tmp", JSON.stringify(run, null, 1) + "\n"); renameSync(fileOf(run.token) + ".tmp", fileOf(run.token)); };
// The time a process began, and "" where `ps` is not run: it is setuid, and the sandbox of a session (safehouse) refuses it.
const began = (pid: number) => { const r = sh("ps", ["-o", "lstart=", "-p", String(pid)]); return r.code === 0 ? r.out.trim() : ""; };
// A pid alone is not the test: after a restart another process may have it. The wrapper's command line names the run
// (`loop-run-<token>`, read with pgrep, which the sandbox lets run), and the time the process began is compared as well
// where the file has one and `ps` gives one. `-a`: on macOS pgrep leaves its own ancestors out without it, so a step
// made by an agent of the run took that run for gone (st-6-a-day-beside-the-session). On Linux `-a` prints the command
// line after the pid, so the pid is the first word of a line.
export const alive = (run: { token?: string; pid?: number; began?: string }) => {
  if (!run.pid || !run.token) return false;
  if (!sh("pgrep", ["-a", "-f", `loop-run-${run.token}( |$)`]).out.split("\n").map((l) => l.trim().split(/\s+/)[0]).includes(String(run.pid))) return false;
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
  const token = run.made ? revoke(run.token) : "";
  if (run.tree) WRITERS.includes(run.role) || ALONE[run.role] ? worktree("--leave", run.tree) : worktree("--remove", run.tree, "--force");
  rmSync(fileOf(run.token), { force: true });
  return stop(code, text + (token ? `; the token ${run.token} is ${token}` : ""));
};
const lastOversight = (file: string) => { try { return (last([...readFileSync(file, "utf8").matchAll(/^## .*events \d+ to (\d+)/gm)]) || [])[1] || ""; } catch { return ""; } };

function start(args: string[]) {
  const me = own(), flag = (n: string) => { const i = args.indexOf(n); if (i < 0) return undefined; const v = args.splice(i, 2)[1]; return v && !v.startsWith("--") ? v : stop(2, `${n} takes a value`); };
  let role = flag("--role"), given = flag("--token");
  const entries = flag("--give"), id = args[0] || "";
  if (!id && !ALONE[role || ""]) stop(2, "start <id> [--role <role>] [--token <t>], or start --role overseer, or start [<id>] --role orchestrator --token <t> --give \"<entries>\"");
  if (role === "overseer" && id) stop(2, "an overseer is on no issue: start --role overseer");
  if ((role === "orchestrator") !== !!entries) stop(2, "--give is the entries of a judgment run, and --role orchestrator has it");
  if (role === "orchestrator" && !given) stop(2, "a judgment run is started by `step`, which makes its token and names it in the `given` comments before the run: --token <t>");
  // One judgment run a machine: a second is not started while one runs, also by hand.
  const judging = role === "orchestrator" && existsSync(RUNS()) ? readdirSync(RUNS()).filter((f) => /^orch-[0-9a-f]{6}\.json$/.test(f)).map((f) => load(f.slice(0, -5))).find((r) => r && r.role === "orchestrator" && r.host === HOST() && !r.ended && alive(r)) : null;
  if (judging) stop(3, `a judgment run runs (${judging.token}, ${judging.agent}); nothing was started`);
  const got = id ? read(me, `get?id=${id}`) : { issue: { id: "", labels: [] }, events: [] };
  if (id && !(got.issue && got.issue.id)) stop(1, `no issue ${id} that ${me} reads`);
  const issue = got.issue, events: Ev[] = got.events || [];
  role = role || roleOf(id, read(me, "queue?limit=500")) || stop(1, `the queue has no entry that starts an agent on ${id}; name one with --role`);
  if (!PREFIX[role!]) stop(2, `--role is one of ${Object.keys(PREFIX).join(", ")}`);
  // A judgment run's token is the step's making, for this run: it is ended with the run, as one `start` made is.
  const run: Run = { id, role: role!, round: role === "orchestrator" ? judgmentRound(issue.runs) : roundOf(role!, events), token: given || "", session: randomUUID(), how: role === "reviewer" ? "light" : "fresh", as: me, made: !given || role === "orchestrator", host: HOST(), startedAt: Date.now() };
  // The longest key of the run is refused before anything is made: the service keeps 100 characters.
  const longest = endKey({ ...run, token: given || PREFIX[run.role] + "-000000", how: "resumed", at: 9999999 });
  if (longest.length > KEY_MOST) stop(1, `the key ${longest} would be ${longest.length} characters, and the tracker keeps ${KEY_MOST}`);
  const root = ROOT();
  if (run.role === "overseer") run.after = lastOversight(join(root, ".claude/skills/brain-maintenance/oversight.md"));
  // A token that was given is one issue-as.sh keeps and cb4 answers: else its agent could write nothing.
  if (given && as(given, id ? `get?id=${id}` : "queue?limit=1").status !== 200) stop(1, `--token ${given}: a read with it was not answered; nothing was started`);
  if (!given) {
    const t = brain("agent-token", PREFIX[run.role], id || `oversight-after-${lastOversight(join(root, ".claude/skills/brain-maintenance/oversight.md"))}`);
    if (t.code !== 0 || !/^[a-z]+-[0-9a-f]{6}$/.test(t.out.trim())) stop(1, `agent-token made no token: ${(t.out + t.err).trim()}`);
    run.token = t.out.trim();
  }
  let agent: string, argv: string[], vars: Record<string, string>;
  if (WRITERS.includes(run.role) || ALONE[run.role]) {
    const topic = ALONE[run.role] ? ALONE[run.role] + run.host : issue.parent || id;
    const tEvents: Ev[] = topic === id || ALONE[run.role] ? events : (as(me, `get?id=${topic}`).data || {}).events || [];
    const notes = [...worktreeComments(tEvents), ...worktreeComments(events)];
    const p: any = place(topic, topic, run.token, id, (path) => (last(notes.filter((c) => c.path === path)) || {}).for, me, !!ALONE[run.role]);
    if (p.fail) unmake(run, p.said, p.fail);
    Object.assign(run, { tree: p.tree, path: p.path, topic });
    if (!ALONE[run.role]) {
      const at = sh("git", ["-C", p.path, "rev-parse", "origin/main"]).out.trim();
      const n = tEvents.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`orch/${topic}/worktree-`)).length + 1;
      const c = write(me, "comment", { key: `orch/${topic}/worktree-${n}`, id: topic, body: "worktree " + JSON.stringify({ topic, branch: "bm/" + p.tree, machine: run.host, path: p.path, ...(at ? { at } : {}), for: id }) });
      if (!c.ok) console.error(`loop.ts: the worktree comment on ${topic} was not written: ${c.status} ${c.said || ""}`);
    }
    const third = run.role === "orchestrator" ? `Entries: ${entries}` : run.role === "overseer" ? `Last oversight ended at event ${lastOversight(join(p.path, ".claude/skills/brain-maintenance/oversight.md")) || lastOversight(join(root, ".claude/skills/brain-maintenance/oversight.md"))}. Journal: ${join(LOOP(), "/")}` : `Issue: ${id}`;
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
  // A run on no issue (an overseer, a judgment run of a cluster that is not healthy) has the file and no event.
  if (id) {
    const c = write(me, "cost", { key: costKey(run), id, role: run.role, round: run.round, how: run.how, outcome: "running", seconds: 0, context: 0, token: run.token, session: run.session, agent: run.agent });
    if (!c.ok) console.error(`loop.ts: the running event was not written: ${c.status} ${c.said || ""}`);
    run.running = c.ok ? c.seq : 0;
  } else run.running = 0;
  save({ ...load(run.token), ...run } as Run);
  say({ started: run.token, id, role: run.role, round: run.round, how: run.how, session: run.session, agent: run.agent, tree: run.tree, path: run.path, event: run.running || undefined, key: id ? costKey(run) : undefined });
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
  if (run.id) {
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
    appendFileSync(join(LOOP(), (run.id || (run.role === "orchestrator" ? "_judgment" : "_oversight")) + ".md"), `\n${head}\n\n${run.id ? "" : JSON.stringify(cost) + "\n\n"}${result && typeof result.result === "string" ? result.result : `(no report: the process gave no result line, exit ${exit})`}\n`);
  }
  const notes: string[] = [];
  if (run.tree && (WRITERS.includes(run.role) || ALONE[run.role])) worktree("--leave", run.tree);
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
    // "A dead writer": its token ended (a role's token is the owner's), then `back`, which is made whatever the revoke exited with. The issue is a start at the next read.
    const named = run && /^(impl|dig|spec)-[0-9a-f]{6}$/.test(run.token || "") ? run.token : "";
    const revoked = named && !(file && file.made === false) ? revoke(named) : "";
    const key = backKey(id, run && run.token, events);
    const b = write(me, "move", { key, id, to: role === "spec-writer" ? "open" : "ready", reason: `A dead writer: the round of event ${at} cannot be sent to the ${role} that started it, since ${why}. ${revoked ? `Its token ${named} is ${revoked}. ` : ""}The next writer makes its own start.`, refs: [] });
    const ended = revoked ? ` The token ${named} is ${revoked}.` : "";
    if (!b.ok) stop(1, `back was not made: ${b.status} ${b.said || ""}`);
    // A key the tracker has is answered 200 and nothing is written: the event of that seq is not this `back`.
    if (b.duplicate) stop(1, `back was not made: the tracker has the key ${key} at event ${b.seq} and wrote nothing; ${id} is at ${read(me, `get?id=${id}`).issue.state}.${ended}`);
    return say({ dead: id, role, why, token: revoked ? `${named} ${revoked}` : "none ended", back: b.seq });
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

const REASONS = ["clock", "event", "run"];
// ---- the step: one pass (part 3 of the spec)
export const GIVEN_MOST = 5, LOAD_MOST = 15, LAND_MS = 30000, ERROR_MS = 30 * 60000, LATE_MS = 4 * 3600000, DEAD_MOST = 2;
const JUDGED = ["triage", "decompose", "promote", "look"], AT_TYPES = ["opened", "moved", "swapped", "held", "linked", "labelled"];
type Got = { issue: Ev; events: Ev[] };
export const givenKey = (id: string, what: string, at: number, again = false) => `orch/${id}/given-${what}-${at}${again ? "-2" : ""}`;
export const verdictKey = (id: string, what: string, at: number) => `orch/${id}/verdict-${what}-${at}`;
const keyed = (events: Ev[], key: string) => events.find((e) => e.type === "commented" && e.key === key);

// What is done with an entry of a row a model decides, for the event <at> it is due for. `give`: no comment has the
// key. A verdict is its first word: `go-on`, `not-answered`, and anything else `left`. With no verdict the run the last
// `given` comment names is read (`runOf`: the last `cost` event of that token on that issue): `runs` (also when it has
// no event yet), `again` (it ended `stopped`, once), `died-twice`, `judged` (it ended another way and left the entry),
// and `no-run` for a comment that names no token, which is what `step` wrote until st-4-orchestrator-brief.
export function judged(events: Ev[], id: string, what: string, at: number, runOf: (token: string, on: string) => Ev | undefined): string {
  const first = keyed(events, givenKey(id, what, at)), second = keyed(events, givenKey(id, what, at, true)), verdict = keyed(events, verdictKey(id, what, at));
  if (!first) return "give";
  if (verdict) { const w = String(verdict.body || "").split("\n")[0].trim().split(/\s+/)[0]; return ["go-on", "not-answered"].includes(w) ? w : "left"; }
  const named = / to ([a-z]+-[0-9a-f]{6}), its run on (\S+)/.exec(String((second || first).body || ""));
  if (!named) return "no-run";
  const run = runOf(named[1], named[2]);
  if (!run || run.outcome === "running") return "runs";
  if (run.outcome !== "stopped") return "judged";
  return second ? "died-twice" : "again";
}

// status.md: what the step did, what runs, what waits for the owner, and what a session with him is asked to do.
function statusText(line: Ev, S: Record<string, string[]>) {
  const part = (title: string, rows: string[]) => [`## ${title}`, "", ...(rows.length ? rows.map((r) => "- " + r) : ["Nothing."]), ""];
  return [`# The loop at event ${line.seq}, ${new Date(line.at).toISOString()}${line.dry ? " (a dry step: nothing was done)" : ""}`, "",
    ...(line.error ? [`The step ended on a read that was not answered: ${line.error}`, ""] : []),
    ...part("Health", [line.health.ok ? "healthy" : "not healthy: " + line.health.failed.join("; "), ...(line.stops ? ["no new writer and no approver is started: " + line.stops.join("; ")] : []), ...S.notes]),
    ...part(line.dry ? "What a step would do" : "What the step did", line.acts.map((a: Ev) => JSON.stringify(a))),
    ...part("What runs", S.runs),
    ...part("What waits for the owner", S.owner),
    ...part("Given to the judgment at this step", S.given),
    ...part("Given before st-4-orchestrator-brief, to no run: no judgment run reads it", S.norun),
    ...part("Judged and left as it was", S.left),
    ...part("The judgment run died twice", S.died),
    ...part("What a session with the owner is asked to do", S.session),
    ...part("Skipped", line.skipped.map((s: Ev) => `${s.do} ${s.id}: ${s.why}`)),
  ].join("\n");
}

async function step(args: string[]) {
  const me = own(), dry = args.includes("--dry"), fi = args.indexOf("--for"), why = fi < 0 ? "clock" : args[fi + 1], whole = why === "clock";
  if (args.some((a, i) => a !== "--dry" && i !== fi && (fi < 0 || i !== fi + 1)) || !REASONS.includes(why)) stop(2, "step [--dry] [--for clock|event|run]");
  const root = ROOT(), host = HOST(), dev = join(root, "cloud-brain-dev"), skill = join(root, ".claude/skills/brain-maintenance");
  const line: Ev = { at: Date.now(), seq: 0, ...(dry ? { dry: true } : {}), ...(whole ? {} : { for: why }), health: { ok: true }, acts: [], given: [], skipped: [] };
  const S: Record<string, string[]> = { notes: [], runs: [], owner: [], given: [], norun: [], left: [], died: [], session: [] };
  const runsNow = new Map<string, string>();
  // An act is named in the line, and made when the step is not dry: what it answered is added to its entry.
  const done = (a: Ev, make?: () => Ev | void) => { line.acts.push(a); if (!dry && make) Object.assign(a, make() || {}); return a; };
  const skip = (id: string, what: string, why: string) => { line.skipped.push({ id, do: what, why }); };
  const tail = (r: { out: string; err: string }) => (r.err + r.out).trim().split("\n").pop() || "";
  const self = (...a: string[]) => { const r = tool(words(env.LOOP_SELF, ["bun", import.meta.path]), a, { LOOP_TOKEN: me }); let o: Ev = {}; try { o = JSON.parse(r.out.trim().split("\n").pop() || ""); } catch {} return { ...o, exit: r.code, ...(r.code ? { said: r.err.trim().split("\n").pop() || "" } : {}) } as Ev; };
  const wrote = (c: ReturnType<typeof write>) => (c.ok ? { event: c.seq, ...(c.duplicate ? { duplicate: true } : {}) } : { refused: `${c.status} ${c.said || ""}`.trim() });
  const moveTo = (id: string, key: string, to: string, reason: string) => wrote(write(me, "move", { key, id, to, reason, refs: [] }));
  const comment = (id: string, key: string, body: string) => wrote(write(me, "comment", { key, id, body }));
  const get = (method: string) => { const r = as(me, method); if (r.status !== 200 || !r.data) throw new Error(`${method} answered ${r.status || "nothing"} ${r.err}`); return r.data; };
  const cache = new Map<string, Got | null>();
  const got = (id: string): Got | null => {
    if (!cache.has(id)) {
      const r = as(me, `get?id=${id}`);
      if (r.status !== 200 && r.status !== 404) throw new Error(`get?id=${id} answered ${r.status || "nothing"} ${r.err}`);
      cache.set(id, r.status === 200 && r.data && r.data.issue && !r.data.issue.hidden ? { issue: r.data.issue, events: r.data.events || [] } : null);
    }
    return cache.get(id)!;
  };
  const running = (G: Got, roles: string[]) => ((G.issue.runs || []) as Ev[]).filter((r) => roles.includes(r.role) && r.outcome === "running");
  const end = (code: number) => {
    S.runs.push(...runsNow.values());
    const text = statusText(line, S);
    if (!dry) { mkdirSync(LOOP(), { recursive: true }); appendFileSync(join(LOOP(), "steps.jsonl"), JSON.stringify(line) + "\n"); writeFileSync(join(LOOP(), "status.md"), text); }
    say(line);
    if (dry) console.log(text);
    process.exitCode = code;
  };
  // ---- 5, its end: the entries of this step are the task of one judgment run. None is started while one of this
  // machine runs: its entries wait, with no comment. The comment of each names the run's token, and is written before
  // the run is started; a start that failed is written `stopped`, so its entries are given once more.
  const give = () => {
    const name = (x: Ev) => (x.id ? `${x.do} ${x.id} (event ${x.at})` : `unhealthy (${x.failed.join("; ")})`);
    const leave = (why: string) => { for (const x of line.given) skip(x.id || "", x.do, why); line.given = []; };
    if (!line.given.length) return;
    const busy = runFiles().find((r) => r.host === host && r.role === "orchestrator" && !r.ended && alive(r));
    if (busy) return leave(`a judgment run runs (${busy.token})`);
    const on: string = (line.given.find((x: Ev) => x.id) || {}).id || "";
    done({ act: "start", ...(on ? { id: on } : {}), role: "orchestrator", entries: line.given.length }, () => {
      const t = brain("agent-token", "orch", `judgment:${on || "unhealthy"}`), token = t.out.trim();
      if (t.code !== 0 || !/^orch-[0-9a-f]{6}$/.test(token)) { leave("agent-token made no token for the judgment run"); return { exit: 1, said: `agent-token made no token: ${tail(t)}` }; }
      for (const x of [...line.given]) {
        if (!x.id) continue;
        const c = write(me, "comment", { key: x.key, id: x.id, body: `given ${x.do} at ${x.at} to ${token}, its run on ${on}` });
        if (c.ok && !c.duplicate) { x.event = c.seq; continue; }
        const why = c.ok ? `the tracker has the key ${x.key}: another step gave it` : `its comment was refused: ${c.status} ${c.said || ""}`.trim();
        if (x.id !== on) { skip(x.id, x.do, why); line.given = line.given.filter((y: Ev) => y !== x); continue; }
        leave(`the entry the run would be on, ${on}, was not given: ${why}`);
        return { exit: 1, said: why, revoke: revoke(token) };
      }
      const r = self("start", ...(on ? [on] : []), "--role", "orchestrator", "--token", token, "--give", line.given.map(name).join("; "));
      if (r.exit === 0) return { exit: 0, token };
      // The comments name a run that was not started: it is written as one that died, and its token is ended.
      const ended = revoke(token), G = on ? got(on) : null;
      const c = G ? wrote(write(me, "cost", { key: `cost/${on}/orchestrator/${judgmentRound(G.issue.runs)}/${token}/end`, id: on, role: "orchestrator", round: judgmentRound(G.issue.runs), how: "fresh", outcome: "stopped", seconds: 0, context: 0, token })) : {};
      return { exit: r.exit, token, said: r.said, revoke: ended, ...c };
    });
    S.given.push(...line.given.map(name));
  };
  try {
    // The caller's token reads the tracker, or the step ends here: a token cb4 refuses is not a cluster that is not healthy.
    get("queue?limit=1");
    // ---- 1. health
    const git = (...a: string[]) => sh("git", a), failed: string[] = [];
    if (!whole) S.notes.push(`a step for ${why === "run" ? "a run that ended" : "an event"}: no pull, no removal of a worktree, no \`redistil\` and no \`state\`; the locks were read`);
    if (!dry && whole) {
      const a = git("-C", root, "pull", "--ff-only");
      if (a.code !== 0) { S.notes.push(`the main checkout was not pulled: ${tail(a)}`); git("-C", root, "fetch", "--no-recurse-submodules", "origin", "main"); }
      let b = git("-C", dev, "pull", "--ff-only");
      if (b.code !== 0 && /^\s+deploy\//m.test(b.err)) {
        git("-C", dev, "checkout", "--", "deploy"); git("-C", dev, "clean", "-fd", "deploy"); b = git("-C", dev, "pull", "--ff-only");
        const s = sh("bash", ["-c", 'cd "$1" && bun sync.ts "$2"', "sync", dev, "https://cb4.endpointservices.workers.dev"]);
        S.notes.push(`cloud-brain-dev of the main checkout: deploy/ was put back for the pull, and sync.ts ${s.code === 0 ? "read cb4 again" : "exited " + s.code}`);
      }
      if (b.code !== 0) S.notes.push(`cloud-brain-dev of the main checkout was not pulled: ${tail(b)}`);
    }
    const behind = git("-C", dev, "rev-list", "--count", "HEAD..origin/main").out.trim(), pointer = git("-C", root, "ls-tree", "origin/main", "cloud-brain-dev").out.split(/\s+/)[2] || "";
    const has = !!pointer && git("-C", dev, "merge-base", "--is-ancestor", pointer, "HEAD").code === 0;
    if (behind !== "0" || !has) S.notes.push(`cloud-brain-dev of the main checkout: ${behind || "an unread count of"} commits behind its origin/main, and the commit origin/main of lopecode-dev records (${pointer.slice(0, 7) || "none read"}) is ${has ? "" : "not "}in it`);
    // The worktrees of the loop: one nobody is in, whose issue has ended, is removed; unlanded work is named and left.
    const listed = whole ? worktree("--list") : { code: 0, out: "", err: "" };
    if (listed.code !== 0) S.notes.push(`worktree.sh --list: exit ${listed.code} ${tail(listed)}`);
    for (const l of listed.out.split("\n").filter(Boolean)) {
      const [name, state, ...rest] = l.split(" "), kv = Object.fromEntries(rest.map((x) => x.split("=")));
      if (/^(orch|over|out)-/.test(name) || !["clean", "not-clean"].includes(state) || kv.occupant !== "-") continue;
      const appr = name.startsWith("appr-"), view = name.startsWith("rev-"), id = name.replace(/^(rev|appr)-/, "").replace(/\.\d+$/, "");
      const G = got(id), at = G ? G.issue.state : "", unlanded = `the worktree bm-${name} is not clean and nobody is in it: ${rest.filter((x) => /^(changed|untracked|ahead|dev-changed|dev-ahead)=/.test(x)).join(" ")}`;
      let force = false;
      if (appr) { if (G && running(G, ["approver"]).length) continue; force = state !== "clean"; }
      else if (view) {
        if (["in-review", "spec-review"].includes(at)) continue;
        if (state !== "clean" && !(kv.ahead === "0" && kv["dev-ahead"] === "0")) { S.notes.push(unlanded); continue; }
        force = state !== "clean";
      } else if (state !== "clean") { S.notes.push(unlanded); continue; }
      else if (!["done", "closed", "rejected"].includes(at)) continue;
      done({ act: "worktree-remove", tree: name, ...(force ? { force: true } : {}) }, () => {
        const r = worktree("--remove", name, ...(force ? ["--force"] : []));
        if (r.code !== 0) return { exit: r.code, said: tail(r) };
        if (appr || view) return;
        const n = G!.events.filter((e) => e.type === "commented" && String(e.key || "").startsWith(`orch/${id}/worktree-removed-`)).length + 1;
        const key = `orch/${id}/worktree-removed-${n}`;
        G!.events.push({ type: "commented", key });
        return comment(id, key, "worktree removed " + JSON.stringify({ topic: id, machine: host, path: join(root, ".claude/worktrees/bm-" + name) }));
      });
    }
    // The cluster: every Worker `same`, each brain-x-* at the hash seen.json of origin/main holds for it, both locks said.
    if (whole) {
      const rd = brain("redistil"), rows = rd.out.split("\n").filter((l) => /^\s+\S+\s+\S+/.test(l)).map((l) => l.trim().split(/\s+/));
      if (rd.code !== 0 || !rows.length) failed.push(`brain.ts redistil: ${rd.code !== 0 ? `exit ${rd.code} ` : ""}${tail(rd) || "it named no Worker"}`);
      for (const [w, st] of rows) if (st !== "same") failed.push(`redistil: ${w} is ${st}`);
      const st = brain("state");
      let workers: string[] = [], seen: Ev = {};
      try { workers = JSON.parse(st.out).workers || []; } catch { failed.push(`brain.ts state: ${st.code !== 0 ? `exit ${st.code} ` : ""}${tail(st) || "it printed no JSON"}`); }
      try { seen = JSON.parse(git("-C", root, "show", "origin/main:tools/cloud-brain/seen.json").out).cb4 || {}; } catch { failed.push("seen.json of origin/main was not read"); }
      for (const w of workers) {
        const [name, hash] = String(w).split(" "), kept = seen[name] && seen[name].hash;
        if (/^brain-x-/.test(name) && kept && String(kept).slice(0, 12) !== hash) failed.push(`state: ${name} is at ${hash}, and seen.json of origin/main has ${String(kept).slice(0, 12)}`);
      }
    }
    for (const name of ["land", "cb4"]) {
      const r = sh(env.LOOP_LOCK || join(HERE, "lock.sh"), ["show", name], { LOCK_TOKEN: me });
      if (r.code !== 0 && r.code !== 1) failed.push(`lock.sh show ${name}: exit ${r.code} ${tail(r)}`);
      const who = r.code === 0 ? (/ is held by (\S+) since /.exec(r.out) || [])[1] : "";
      if (name === "land" && who) line.land = who;
    }
    if (failed.length) {
      // Not healthy: no agent of an issue is started. It is of no issue, so it has no comment and is given at each such step.
      line.health = { ok: false, failed };
      line.given.push({ do: "unhealthy", failed });
      give();
      return end(0);
    }

    // ---- 2. the runs of this machine: `ended` for one that returned or is gone, the event a start did not write
    for (const run of runFiles()) {
      if (run.host !== host || run.ended) continue;
      const returned = existsSync(join(RUNS(), run.token + ".result.json"));
      if (returned || !alive(run)) { done({ act: "ended", token: run.token, id: run.id, role: run.role, why: returned ? "its process returned" : "its process is gone and left no result" }, () => { const r = self("ended", run.token); return { exit: r.exit, ...(r.outcome ? { outcome: r.outcome } : {}), ...(r.said ? { said: r.said } : {}) }; }); continue; }
      runsNow.set(run.token, `${run.role}${run.id ? " of " + run.id : ""}, round ${run.round}, token ${run.token}, ${run.agent}`);
      if (!run.running && run.id) done({ act: "running", id: run.id, role: run.role, token: run.token }, () => {
        const c = write(me, "cost", { key: costKey(run), id: run.id, role: run.role, round: run.round, how: run.how, outcome: "running", seconds: 0, context: 0, token: run.token, session: run.session, agent: run.agent });
        if (c.ok) save({ ...(load(run.token) || run), running: c.seq });
        return wrote(c);
      });
    }
    cache.clear();

    // ---- 3. the queue
    const q = get("queue?limit=500");
    line.seq = q.seq || 0; line.at = q.now || line.at;
    const entries: Ev[] = q.queue || [], waiting: Ev[] = q.waiting || [];
    // ---- 4. what stops a start of a writer or an approver
    let prev: Ev = {};
    try { prev = JSON.parse(last(readFileSync(join(LOOP(), "steps.jsonl"), "utf8").trim().split("\n")) || "{}"); } catch {}
    const up = tool(words(env.LOOP_UPTIME, ["uptime"]), []), load1 = Number(((/load averages?:\s*(\d+(?:[.,]\d+)?)/.exec(up.out) || [])[1] || "0").replace(",", "."));
    const stops: string[] = [];
    if (load1 >= LOAD_MOST) stops.push(`uptime's first number is ${load1}`);
    if (line.land && prev.land === line.land && line.at - (prev.at || 0) >= LAND_MS) stops.push(`land has named ${line.land} at this step and the one before`);
    const erred = runFiles().find((r) => r.host === host && r.ended && Date.now() - r.ended.at < ERROR_MS && existsSync(join(RUNS(), r.token + ".exit")) && readFileSync(join(RUNS(), r.token + ".exit"), "utf8").trim() === "1");
    if (erred) stops.push(`the result of ${erred.token} was an error less than ${ERROR_MS / 60000} minutes ago`);
    if (stops.length) line.stops = stops;
    // A writer's token that `ended` kept for a round to come is ended when its issue is closed.
    for (const run of runFiles()) {
      if (run.host !== host || !run.id || !run.ended || run.ended.token !== "kept") continue;
      const G = got(run.id);
      if (!G || !(G.issue.closed || ["done", "closed", "rejected"].includes(G.issue.state))) continue;
      done({ act: "token-ended", token: run.token, id: run.id }, () => { const r = revoke(run.token); if (r === "ended") save({ ...run, ended: { ...run.ended, token: "ended" } }); return r === "ended" ? undefined : { said: r }; });
    }
    let unstarted = false;
    const held = () => [...stops, ...(unstarted ? ["a review or a round of this step was not started"] : [])];

    // An issue is read once a step. A `running` run of this machine whose process is gone and that has no file here
    // is written with what it left: `stopped`, or its submit. One of another machine is left, and named after 4 hours.
    const looked = new Set<string>();
    const look = (id: string): Got | null => {
      const G = got(id);
      if (!G || looked.has(id)) return G;
      looked.add(id);
      for (const r of running(G, Object.keys(PREFIX))) {
        const [h, pid] = String(r.agent || "").split(":"), file = r.token ? load(r.token) : null, what = `${r.role} of ${id}, round ${r.round}, token ${r.token}, ${r.agent}`;
        if (h !== host) { runsNow.set(r.token, `${what}: another machine's${line.at - r.at >= LATE_MS ? ", `running` for 4 hours or more" : ""}`); continue; }
        if ((file && !file.ended) || alive({ token: r.token, pid: Number(pid) })) { runsNow.has(r.token) || runsNow.set(r.token, what); continue; }
        const key = String((G.events.find((e) => e.seq === r.seq) || {}).key || "");
        if (!key) continue;
        const left = outcomeOf({ id, role: r.role, round: r.round, token: r.token, how: r.how, at: Number((/\/resumed-(\d+)$/.exec(key) || [])[1] || 0) }, G.events, false);
        done({ act: "stopped", id, role: r.role, round: r.round, token: r.token, outcome: left.outcome, why: "its process is gone and this machine has no file of it" }, () => {
          const c = write(me, "cost", { key: key + "/end", id, role: r.role, round: r.round, how: r.how, outcome: left.outcome, seconds: 0, context: 0, ...(left.event ? { event: left.event } : {}), token: r.token, session: r.session, agent: r.agent });
          if (c.ok) { r.outcome = left.outcome; G.events.push({ type: "cost", seq: c.seq, role: r.role, round: r.round, outcome: left.outcome, token: r.token }); }
          return wrote(c);
        });
      }
      return G;
    };
    // ---- 5. the judgment: an entry is given once for one event of its issue, 5 at most a step
    const runOf = (token: string, on: string) => { const G = got(on); return G ? last(G.events.filter((e) => e.type === "cost" && e.token === token)) : undefined; };
    // `judge` names an entry in the line; `give`, at the end of the step, writes its comment and starts the one run.
    const judge = (id: string, what: string, at: number, G: Got): string => {
      const how = judged(G.events, id, what, at, runOf), name = `${what} ${id} (event ${at})`;
      if (how === "judged") S.left.push(name);
      else if (how === "died-twice") S.died.push(name);
      else if (how === "no-run") S.norun.push(name);
      else if (how === "left") S.session.push(`${name}: left by the judgment: ${String((keyed(G.events, verdictKey(id, what, at)) || {}).body || "").split("\n")[0].trim().replace(/^left:?\s*/, "") || "it gave no reason"}`);
      if (how !== "give" && how !== "again") return how;
      const key = givenKey(id, what, at, how === "again");
      if (line.given.length >= GIVEN_MOST) { skip(id, what, `${GIVEN_MOST} entries are given at a step`); return "wait"; }
      if (key.length > KEY_MOST) { skip(id, what, `the key ${key} is over ${KEY_MOST} characters`); return "wait"; }
      line.given.push({ id, do: what, at, key });
      return how;
    };
    // Fewer than 2 dead runs of the role and round, or `go-on` for the last of them: else the entry is the row "2 dead runs".
    const bound = (id: string, G: Got, role: string, round: number) => {
      const d = deadRuns(G.events, role, round);
      return d.length < DEAD_MOST || judge(id, "dead", last(d)!.seq, G) === "go-on";
    };
    const begin = (id: string, role: string, first = false) => done({ act: "start", ...(id ? { id } : {}), role }, () => {
      const r = self("start", ...(id ? [id] : []), "--role", role);
      if (r.exit !== 0 && first) unstarted = true;
      return { exit: r.exit, ...(r.started ? { token: r.started } : {}), ...(r.said ? { said: r.said } : {}) };
    });
    const writerOf = (G: Got) => (G.issue.state === "spec" ? "spec-writer" : (G.issue.labels || []).includes("digest") ? "digest" : "implementer");
    const his = (e: Ev) => !!e.by && (e.by.via === "session" || /^secret:out-/.test(String(e.by.holder || "")));
    // Labeled needs-owner: given when he has written after the label, else it is his and nothing is done.
    const owners = (id: string, G: Got) => {
      const lab = last(G.events.filter((x) => (x.type === "labelled" && (x.add || []).includes("needs-owner")) || (x.type === "opened" && (x.labels || []).includes("needs-owner"))));
      const word = lab && last(G.events.filter((x) => x.seq > lab.seq && his(x)));
      if (word) judge(id, "answer", word.seq, G);
    };
    // An issue at work whose starter has no run in the record is an agent of a session (an `Agent` call, a quick win):
    // left while that token reads the tracker.
    const starterOf = (G: Got, role: string) => String(((last(moved(G.events, role === "spec-writer" ? "spec" : "start")) || {}).by || {}).holder || "").replace(/^secret:/, "");
    const anothers = (e: Ev, G: Got, role: string) => {
      const starter = starterOf(G, role);
      if (!starter || !live(starter, e.id)) return false;
      skip(e.id, e.do || e.why, `loop.ts started no ${role} on it and the token of its starter, ${starter}, reads the tracker`);
      if (line.at - (e.since || line.at) >= LATE_MS) S.session.push(`${e.id}: at ${e.state} for 4 hours or more with an agent no run of the record names (${starter})`);
      return true;
    };

    // An agent that still runs asks: before any row.
    for (const i of (get("list?label=asks-orchestrator&limit=100").issues || []) as Ev[]) {
      const G = i.hidden ? null : look(i.id), lab = G && last(G.events.filter((x) => x.type === "labelled" && (x.add || []).includes("asks-orchestrator")));
      if (G && lab) judge(i.id, "asks", lab.seq, G);
    }
    const digests: Ev[] = [];
    const take = (e: Ev) => {
      if (e.do === "ready" || e.do === "finish") {
        const to = e.do === "ready" ? "ready" : "done", key = `orch/${e.id}/${e.do}-${e.since}`;
        if (key.length > KEY_MOST) return skip(e.id, e.do, `the key ${key} is over ${KEY_MOST} characters`);
        return void done({ act: e.do, id: e.id }, () => moveTo(e.id, key, to, e.do === "ready" ? `waits for nothing, by the queue at ${q.seq}` : `no part of it is open, by the queue at ${q.seq}`));
      }
      const G = look(e.id);
      if (!G) return skip(e.id, e.do, "get?id= did not answer the issue");
      const labels: string[] = G.issue.labels || [];
      if (e.do === "review") {
        if (running(G, ["reviewer"]).length) return skip(e.id, e.do, "a reviewer of it runs");
        if (bound(e.id, G, "reviewer", roundOf("reviewer", G.events))) begin(e.id, "reviewer", true);
      } else if (e.do === "round") {
        const role = writerOf(G), round = roundOf(role, G.events);
        if (labels.includes("needs-owner")) { S.owner.push(`${e.id} (${e.state}, a round, labeled needs-owner)`); return owners(e.id, G); }
        if (e.waiter) return skip(e.id, e.do, "its writer waits for the review and takes the round itself");
        if (running(G, WRITERS).length) return skip(e.id, e.do, "a writer of it runs and takes the round itself");
        const mine = ((G.issue.runs || []) as Ev[]).filter((r) => r.role === role).sort((a, b) => a.round - b.round || a.seq - b.seq), lastRun = last(mine);
        if ((!lastRun || lastRun.token !== starterOf(G, role)) && anothers(e, G, role)) return;
        const noSubmit = lastRun && lastRun.outcome === "no-submit" ? lastRun.seq : 0, at = Math.max(0, noSubmit, ...moved(G.events, "rework", "respec").map((m) => m.seq));
        if ((round > 3 || noSubmit) && judge(e.id, "round", at, G) !== "go-on") return;
        if (!noSubmit && !bound(e.id, G, role, round)) return;
        done({ act: "resume", id: e.id, role }, () => {
          const r = self("resume", e.id, "--role", role);
          if (r.exit !== 0 && r.exit !== 3) unstarted = true;
          return { exit: r.exit, ...(r.resumed ? { token: r.resumed } : {}), ...(r.dead ? { dead: r.why, back: r.back } : {}), ...(r.said ? { said: r.said } : {}) };
        });
      } else if (e.do === "start" || e.do === "spec") {
        const role = e.do === "spec" ? "spec-writer" : labels.includes("digest") ? "digest" : "implementer";
        if (running(G, WRITERS).length) return skip(e.id, e.do, "a writer of it runs");
        if (!bound(e.id, G, role, roundOf(role, G.events))) return;
        if (held().length) return skip(e.id, e.do, "no new writer: " + held().join("; "));
        begin(e.id, role);
      } else if (e.do === "triage" && labels.includes("digest") && G.issue.opener === "worker:brain-x-snapshot") digests.push(e);
      else if (JUDGED.includes(e.do)) judge(e.id, e.do, Math.max(0, ...G.events.filter((x) => AT_TYPES.includes(x.type)).map((x) => x.seq)), G);
      else skip(e.id, e.do, "no row of the step's table names it");
    };
    const wait = (e: Ev) => {
      if (e.why === "owner") S.owner.push(`${e.id} (${e.state})`);
      if (e.why !== "owner" && e.why !== "work") return;
      const G = look(e.id);
      if (!G) return skip(e.id, e.why, "get?id= did not answer the issue");
      const labels: string[] = G.issue.labels || [];
      if (e.why === "owner") {
        if (labels.includes("needs-owner")) return owners(e.id, G);
        if (e.state !== "awaiting-approval") return;
        const f = approverFacts(G.events.map((x) => ({ id: e.id, ...x })) as any, { files: () => null, parents: () => [] } as any, e.id);
        if (G.events.some((x) => x.key === f.verdictKey) || f.left.length) return;
        if (running(G, ["approver"]).length) return skip(e.id, "approve", "an approver of it runs");
        if (!bound(e.id, G, "approver", roundOf("approver", G.events))) return;
        if (held().length) return skip(e.id, "approve", "no approver: " + held().join("; "));
        return void begin(e.id, "approver");
      }
      // Labeled needs-owner at work (a writer that asked for an act of his and ended with no submit): his, as a `round` so labeled.
      if (labels.includes("needs-owner")) { S.owner.push(`${e.id} (${e.state}, at work, labeled needs-owner)`); return owners(e.id, G); }
      // "A dead writer": at work, no running writer and no waiter. The bound of dead runs holds at the start this leaves.
      const role = writerOf(G), round = roundOf(role, G.events);
      if (e.waiter || running(G, WRITERS).length) return;
      const run = ((G.issue.runs || []) as Ev[]).find((r) => r.role === role && r.round === round), cur = run && run.token === starterOf(G, role) ? run : undefined;
      if (!cur && anothers(e, G, role)) return;
      const named = cur && /^(impl|dig|spec)-[0-9a-f]{6}$/.test(cur.token || "") ? String(cur.token) : "", file = named ? load(named) : null;
      const key = backKey(e.id, named, G.events);
      done({ act: "back", id: e.id, role, ...(named ? { token: named } : {}) }, () => {
        const gone = file && file.ended && file.ended.token === "ended", revoked = named && !gone && !(file && file.made === false) ? revoke(named) : "";
        const m = moveTo(e.id, key, role === "spec-writer" ? "open" : "ready", `A dead writer: ${e.id} is at ${e.state} with no running ${role} and no waiter${cur ? `; its run of round ${round} ended ${cur.outcome}` : "; no run of this round is in the record and its starter's token no longer reads the tracker"}. ${gone ? `Its token ${named} was ended with its run. ` : revoked ? `Its token ${named} is ${revoked}. ` : ""}The next writer makes its own start.`);
        return { ...m, ...(revoked ? { revoke: revoked } : {}) };
      });
    };
    // Rounds and reviews, then the other acts of the queue, then what waits (an approver, a dead writer), then a new writer.
    const first = (e: Ev) => e.do === "round" || e.do === "review", writer = (e: Ev) => e.do === "start" || e.do === "spec";
    for (const e of entries.filter(first)) take(e);
    for (const e of entries.filter((e) => !first(e) && !writer(e))) take(e);
    // The digests the snapshot opened: the newest is written, each older one is covered by it.
    if (digests.length) {
      const ids = digests.map((d) => d.id).sort(), newest = last(ids)!, older = ids.slice(0, -1), since = digests.find((d) => d.id === newest)!.since;
      for (const id of older) done({ act: "reject", id }, () => moveTo(id, `orch/${id}/covered`, "rejected", `covered by ${newest}`));
      done({ act: "digest", id: newest, ...(older.length ? { covers: older } : {}) }, () => {
        if (older.length) comment(newest, `orch/${newest}/covers`, `This digest covers the days of ${older.join(", ")} as well: each was rejected as covered by it.`);
        const t = moveTo(newest, `orch/${newest}/triage-${since}`, "triaged", "the day's digest, opened by the snapshot's run");
        return (t as Ev).refused ? t : moveTo(newest, `orch/${newest}/ready-${since}`, "ready", "the day's digest, opened by the snapshot's run");
      });
    }
    for (const e of waiting) wait(e);
    for (const e of entries.filter(writer)) take(e);

    // What happened since the last heading of oversight.md: his moves that undo reviewed work, and whether an overseer is due.
    const after = Number(lastOversight(join(skill, "oversight.md")) || 0);
    if (!after) S.notes.push("oversight.md of the main checkout has no heading that names its last event: no overseer is started, and no move of the owner's is read for a post mortem");
    else {
      const since: Ev[] = [];
      for (let a = after, n = 0; n < 20; n++) { const p = get(`sync?after=${a}&limit=500`), page: Ev[] = p.events || []; since.push(...page); if (!p.more || !page.length) break; a = last(page)!.seq; }
      for (const m of since.filter((e) => e.type === "moved" && e.by && e.by.via === "session" && ["send-back", "owner-reject", "revert"].includes(e.move))) {
        const G = look(m.id);
        if (!G || (m.move === "owner-reject" && !G.events.some((x) => x.type === "reviewed" && x.verdict === "pass" && x.seq < m.seq))) continue;
        if (!((G.issue.linked || []) as Ev[]).some((l) => l.rel === "cause")) judge(m.id, "pm", m.seq, G);
      }
      const ended = new Set(since.filter((e) => (e.type === "moved" && ["done", "rejected"].includes(e.to)) || (e.type === "labelled" && (e.add || []).includes("needs-owner"))).map((e) => e.id));
      const third = [...new Set(since.filter((e) => e.type === "moved" && e.move === "rework").map((e) => e.id))].find((id) => { const G = got(id); return !!G && moved(G.events, "rework").length >= 3; });
      if (ended.size >= 3 || third) {
        const t = brain("agent-token", "list"), n = runFiles().filter((r) => r.role === "overseer" && String(r.after) === String(after)).length;
        const lives = t.out.split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).some((d) => d && /^over-/.test(d.name || "") && (!d.until || Date.parse(d.until) > Date.now()));
        if (t.code !== 0) skip("", "overseer", `agent-token list: exit ${t.code} ${tail(t)}`);
        else if (lives) skip("", "overseer", "an overseer's token is live");
        else if (n >= DEAD_MOST) { skip("", "overseer", `${n} overseers were started since the heading that ends at event ${after}`); S.session.push(`oversight: ${n} overseers were started since the heading of oversight.md that ends at event ${after}, and it has no later heading`); }
        else begin("", "overseer");
      }
    }
    give();
  } catch (e: any) { line.error = String((e && e.message) || e); return end(1); }
  end(0);
}

// ---- the driver: the loop, with no model (part 4 of the spec)
export const EVERY_MS = 30_000, CLOCK_MS = 1_800_000, RENEW_MS = 120_000, TOKEN_MS = 40 * 3_600_000, FOLLOW_MOST = 20;
// The acts of a step that are a move of an issue. One that was made has an event and is no duplicate.
const MOVES = ["ready", "finish", "back", "digest", "reject"];
export const madeMove = (line: Ev | null) => !!line && ((line.acts || []) as Ev[]).some((a) => MOVES.includes(a.act) && a.event && !a.duplicate && !a.refused);
// What the driver asks of the machine and the cluster: tests/tools/loop-run.test.ts gives a stand-in for each, the clock among them.
export type Driver = {
  dry: boolean; host: string;
  now: () => number; sleep: (ms: number) => Promise<void>; stopped: () => boolean;
  token: () => string;                                              // a token made for the driver, "" when none was
  revoke: (token: string) => string;
  lock: (cmd: "take" | "renew" | "release", token: string) => { code: number; said: string };
  step: (token: string, why: string) => Promise<Ev | null>;         // the step's line, null when it printed none
  seq: (token: string) => number | null;                            // the last seq of the record, null when not read
  events: (token: string, after: number) => Ev[] | null;            // every event after a seq, null when not read
  returned: () => string[];                                         // the runs of this machine that returned or are gone and are not ended
  open: (token: string) => number;                                  // how many runs started with a token are not ended
  note: (text: string) => void;
};
// Exit 0: stopped by a signal. 1: `loop` is another's, at the take or at a renew. 2: no token, or cb4 not reached at a take.
export async function drive(d: Driver, given = ""): Promise<number> {
  let token = given, made = d.now(), renewed = d.now(), lost = "";
  const mine = new Set<string>();
  const fresh = () => { const t = d.token(); if (t) mine.add(t); return t; };
  if (!d.dry) {
    token = fresh();
    if (!token) { d.note("agent-token made no token for the driver: nothing was taken and no step made"); return 2; }
    const t = d.lock("take", token);
    if (t.code !== 0) { d.note(`\`loop\` was not taken: ${t.said}. No step was made; the token ${token} is ${d.revoke(token)}`); return t.code === 1 ? 1 : 2; }
  }
  const renew = () => {
    if (d.dry || lost || d.now() - renewed < RENEW_MS) return;
    const r = d.lock("renew", token);
    if (r.code === 0) renewed = d.now();
    else if (r.code === 1) lost = r.said;
    else d.note(`\`loop\` was not renewed: ${r.said}. It is asked again in ${EVERY_MS / 1000} s`);
  };
  let after: number | null = null, clock = d.now(), healthy = true, follow = 0;
  const tried = new Set<string>();
  // One step at a time. The lock is renewed while it runs.
  const one = async (why: string) => {
    if (why === "clock") clock = d.now();
    let line: Ev | null = null, done = false;
    const p = d.step(token, why).then((l) => { line = l; done = true; });
    // A driver told to stop waits for the step it began, and asks for no more renews: the lock has 600 s.
    while (!done) { if (d.stopped()) { await p; break; } await Promise.race([p, d.sleep(EVERY_MS)]); renew(); }
    const l = line as Ev | null;
    if (l && Number(l.seq) > 0) after = Math.max(after ?? 0, Number(l.seq));
    if (why === "clock" || !l || l.error || !(l.health && l.health.ok)) healthy = !!(l && !l.error && l.health && l.health.ok);
    return l;
  };
  // An event that is not the driver's own, a run that returned, or the clock. A dry driver writes nothing: every event is a reason.
  const reason = (): string | null => {
    let why: string | null = null;
    if (after === null) after = d.seq(token);
    else {
      const events = d.events(token, after);
      if (events && events.length) {
        if (events.some((e) => d.dry || !(e.by && mine.has(String(e.by.holder || e.by).replace(/^secret:/, ""))))) why = "event";
        after = Math.max(after, ...events.map((e) => Number(e.seq) || 0));
      }
    }
    const back = d.returned().filter((t) => !tried.has(t));
    back.forEach((t) => tried.add(t));
    if (!why && back.length) why = "run";
    // A step that is not for the clock reads no Worker: after a step that was not healthy, or printed no line, the next is the clock's.
    if (d.now() - clock >= CLOCK_MS || (why && !healthy)) why = "clock";
    return why;
  };
  // At 40 hours, between two steps: a new token, `loop` released and taken with it, the old one ended. 0, or the exit.
  const rotate = (): number => {
    const next = fresh();
    if (!next) { d.note(`no new token was made at ${Math.round((d.now() - made) / 3_600_000)} hours of ${token}; it is asked again in ${EVERY_MS / 1000} s`); return 0; }
    const r = d.lock("release", token);
    if (r.code !== 0) {
      mine.delete(next);
      d.note(`\`loop\` was not released for a new token: ${r.said}. The new token ${next} is ${d.revoke(next)}`);
      if (r.code === 1) lost = r.said;
      return 0;
    }
    const t = d.lock("take", next);
    if (t.code !== 0) { d.note(`\`loop\` was released for a new token and not taken again: ${t.said}. The tokens: ${next} is ${d.revoke(next)}, ${token} is ${d.revoke(token)}`); return t.code === 1 ? 1 : 2; }
    d.note(`a new token at 40 hours: ${next} holds \`loop\`, and ${token} is ${d.revoke(token)}`);
    token = next; made = renewed = d.now();
    return 0;
  };
  for (let why: string | null = "clock"; ; ) {
    if (why) {
      const line = await one(why);
      if (lost || d.stopped()) break;
      if (madeMove(line) && ++follow <= FOLLOW_MOST) { why = "event"; continue; }
      if (follow > FOLLOW_MOST) d.note(`${FOLLOW_MOST} steps one after another each made a move: the next step waits for a reason`);
      follow = 0;
    }
    if (!d.dry && d.now() - made >= TOKEN_MS) { const code = rotate(); if (code) return code; if (lost) break; }
    await d.sleep(EVERY_MS);
    if (d.stopped()) break;
    renew();
    if (lost) break;
    why = reason();
  }
  if (d.dry) return 0;
  if (lost) { d.note(`\`loop\` is no longer this driver's: ${lost}. No more steps; the token ${token} is ${d.open(token) ? "left, for the runs it started to end with" : d.revoke(token)}`); return 1; }
  const r = d.lock("release", token), n = d.open(token);
  d.note(`stopped. \`loop\`: ${r.said}. The token ${token} is ${n ? `left: ${n} run${n === 1 ? "" : "s"} it started ${n === 1 ? "has" : "have"} not ended, and each ends itself with it. It ends 48 hours after it was made, or with \`brain.ts agent-token revoke ${token}\`` : d.revoke(token)}`);
  return 0;
}

async function run(args: string[]) {
  const dry = args.includes("--dry"), host = HOST(), who = `orchestrator-${host}`;
  if (args.some((a) => a !== "--dry")) stop(2, "run [--dry]");
  const given = dry ? own() : "";
  let stopping = false, wake = () => {};
  for (const s of ["SIGINT", "SIGTERM"] as const) process.on(s, () => { stopping = true; wake(); });
  const note = (text: string) => console.error("loop.ts run: " + text);
  const said = (r: { out: string; err: string }) => (r.err + r.out).trim().split("\n").pop() || "it answered nothing";
  const code = await drive({
    dry, host, note,
    now: () => Date.now(),
    sleep: (ms) => new Promise<void>((done) => { const t = setTimeout(done, ms); wake = () => { clearTimeout(t); done(); }; if (stopping) wake(); }),
    stopped: () => stopping,
    token: () => { const t = brain("agent-token", "orch", `driver:${host}`), name = t.out.trim(); return t.code === 0 && /^orch-[0-9a-f]{6}$/.test(name) ? name : ""; },
    revoke,
    lock: (cmd, token) => { const r = sh(env.LOOP_LOCK || join(HERE, "lock.sh"), [cmd, "loop", who], { LOCK_TOKEN: token }); return { code: r.code, said: said(r).replace(/^lock\.sh: /, "") }; },
    step: async (token, why) => {
      const p = Bun.spawn([...words(env.LOOP_SELF, ["bun", import.meta.path]), "step", "--for", why, ...(dry ? ["--dry"] : [])], { env: { ...env, LOOP_TOKEN: token }, stdout: "pipe", stderr: "pipe" });
      const [out, err, exit] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
      let line: Ev | null = null;
      try { line = JSON.parse(out.split("\n")[0]); } catch {}
      if (line) say(line);
      if ((exit !== 0 || !line) && !stopping) note(`a step for ${why === "clock" ? "the clock" : why === "run" ? "a run that ended" : "an event"} ${line ? "" : "printed no line and "}exited ${exit}: ${(line && line.error) || err.trim().split("\n").pop() || "it said nothing"}. The driver goes on at the next reason`);
      return line;
    },
    seq: (token) => { const r = as(token, "queue?limit=1"); return r.status === 200 && r.data && Number(r.data.seq) >= 0 ? Number(r.data.seq) : null; },
    events: (token, after) => {
      const all: Ev[] = [];
      for (let a = after, n = 0; n < 20; n++) { const r = as(token, `sync?after=${a}&limit=500`); if (r.status !== 200 || !r.data) return null; const page: Ev[] = r.data.events || []; all.push(...page); if (!r.data.more || !page.length) break; a = last(page)!.seq; }
      return all;
    },
    returned: () => runFiles().filter((r) => r.host === host && !r.ended && (existsSync(join(RUNS(), r.token + ".result.json")) || !alive(r))).map((r) => r.token),
    open: (token) => runFiles().filter((r) => r.host === host && !r.ended && r.as === token).length,
  }, given);
  process.exit(code);
}

// ---- compare: what the dry steps named beside what was done (R8; st-6-a-day-beside-the-session)
// The event that did what an act names: of the act's issue, after the step that named it first.
const SESSION = ["orch-", "out-"];
const holderOf = (e: Ev) => String((e.by && e.by.holder) || "").replace(/^secret:/, "");
const treeIssue = (tree: string) => tree.replace(/^(rev|appr)-/, "").replace(/\.\d+$/, "");
const did = (a: Ev, e: Ev, by: string[]): boolean => {
  const mv = (...m: string[]) => e.type === "moved" && m.includes(e.move), role = a.role, t = holderOf(e);
  if (a.act === "worktree-remove") return e.id === treeIssue(String(a.tree || "")) && e.type === "commented" && /\/worktree-removed/.test(e.key || "");
  if (e.id !== a.id) return false;
  if (a.act === "given") return by.some((p) => t.startsWith(p)) && e.type !== "cost" && !/\/worktree-/.test(e.key || "");
  if (a.act === "ready" || a.act === "finish" || a.act === "back") return mv(a.act);
  if (a.act === "reject") return e.type === "moved" && e.to === "rejected";
  if (a.act === "digest") return mv("triage");
  if (a.act === "resume") return (e.type === "cost" && e.how === "resumed") || mv("submit", "submit-spec");
  if (a.act === "ended" || a.act === "stopped") return e.type === "cost" && e.token === a.token && e.outcome !== "running";
  if (a.act === "running") return e.type === "cost" && e.token === a.token && e.outcome === "running";
  if (a.act !== "start") return false;
  if (e.type === "cost" && e.role === role) return true;
  if (role === "reviewer") return e.type === "reviewed";
  if (role === "approver") return e.type === "commented" && /^approver\//.test(e.key || "");
  return role === "spec-writer" ? mv("spec") : mv("start");
};
const UNREAD = ["token-ended"], BEFORE = 200; // an act the record has no event of; the events read before the first step
const nameOf = (a: Ev) => [a.act, a.do, a.role, a.id || a.tree || a.token].filter(Boolean).join(" ");
// The lines of dry steps and the events after the first of them. `named`: each act a step named, with the event that
// did the same and the minutes from the step that named it first; an act named again by a step that read that event
// is a second row. `unnamed`: each event of a session's token (`by`, the beginnings of a holder's name) that is the
// event of no row, and each `start` or `spec` move of an agent that no `running` event names (an `Agent` call of a
// session: its own first move is all the record has of its start). A judgment run's entries are each an act `given`.
// Events up to the first step's seq are read for those `running` events alone.
export function compare(lines: Ev[], events: Ev[], by: string[] = SESSION) {
  const steps = lines.filter((l) => l && typeof l.seq === "number" && Array.isArray(l.acts)).sort((x, y) => x.seq - y.seq || x.at - y.at);
  const evs = [...events].sort((x, y) => x.seq - y.seq), used = new Set<number>(), open = new Map<string, Ev>(), named: Ev[] = [];
  const mins = (ms: number) => Math.round(ms / 6000) / 10;
  for (const l of steps) {
    const acts: Ev[] = [...l.acts.filter((a: Ev) => !(a.act === "start" && a.role === "orchestrator")), ...(l.given || []).filter((g: Ev) => g.id).map((g: Ev) => ({ act: "given", do: g.do, id: g.id, at: g.at }))];
    for (const a of acts) {
      const key = JSON.stringify([a.act, a.do, a.role, a.id, a.tree, a.token, a.at]);
      let row = open.get(key);
      if (row && row.event && row.event.seq <= l.seq) row = undefined;
      if (!row) {
        row = { name: nameOf(a), act: a.act, ...(a.id ? { id: a.id } : {}), ...(a.role ? { role: a.role } : {}), first: { seq: l.seq, at: l.at }, last: { seq: l.seq, at: l.at }, steps: 0, event: null };
        const e = UNREAD.includes(a.act) || (a.act === "start" && !a.id) ? undefined : evs.find((x) => x.seq > l.seq && !used.has(x.seq) && did(a, x, by));
        if (e && e.type === "cost" && e.token) for (const x of evs) if (x.id === e.id && x.type === "moved" && ["start", "spec"].includes(x.move) && holderOf(x) === e.token) used.add(x.seq);
        if (e) { used.add(e.seq); row.event = { seq: e.seq, type: e.type, ...(e.move ? { move: e.move } : {}), ...(e.outcome ? { outcome: e.outcome } : {}), by: holderOf(e) || (e.by && e.by.via) || "", at: e.at }; row.minutes = mins(e.at - l.at); }
        else if (UNREAD.includes(a.act) || (a.act === "start" && !a.id)) row.unread = "the record has no event of it";
        open.set(key, row); named.push(row);
      }
      row.steps++; row.last = { seq: l.seq, at: l.at };
    }
  }
  const from = steps.length ? steps[0].seq : 0;
  const echo = (e: Ev) => evs.some((x) => x.seq < e.seq && x.id === e.id && x.type === "cost" && x.outcome === "running" && x.token === holderOf(e));
  const unnamed = evs.filter((e) => e.seq > from && !used.has(e.seq) && (by.some((p) => holderOf(e).startsWith(p)) || (e.type === "moved" && ["start", "spec"].includes(e.move) && !echo(e)))).map((e) => {
    const before = last(steps.filter((l) => l.seq < e.seq)), after = steps.find((l) => l.seq >= e.seq);
    return { seq: e.seq, type: e.type, ...(e.move ? { move: e.move } : {}), ...(e.role ? { role: e.role } : {}), ...(e.outcome ? { outcome: e.outcome } : {}), id: e.id, by: holderOf(e), at: e.at, key: e.key,
      before: before ? before.seq : null, ...(before ? { minutes: mins(e.at - before.at) } : {}), after: after ? after.seq : null };
  });
  return { steps: steps.length, whole: steps.filter((l) => !l.for).length, unhealthy: steps.filter((l) => !l.health || !l.health.ok).length, from, to: steps.length ? last(steps)!.seq : 0,
    began: steps.length ? steps[0].at : 0, ended: steps.length ? last(steps)!.at : 0, events: evs.filter((e) => e.seq > from).length, named, unnamed };
}
const clock = (ms: number) => new Date(ms).toISOString().slice(11, 19) + "Z";
export function compareText(c: ReturnType<typeof compare>) {
  const done = c.named.filter((r) => r.event), not = c.named.filter((r) => !r.event && !r.unread), unread = c.named.filter((r) => r.unread);
  const seen = (r: Ev) => `named by ${r.steps} step${r.steps === 1 ? "" : "s"}, first at event ${r.first.seq} (${clock(r.first.at)})${r.steps > 1 ? `, last at ${r.last.seq} (${clock(r.last.at)})` : ""}`;
  const list = (rows: string[]) => (rows.length ? rows.map((r) => "- " + r).join("\n") : "Nothing.");
  return [`# ${c.steps} dry steps, events ${c.from} to ${c.to} (${c.steps ? clock(c.began) + " to " + clock(c.ended) : "no step"}): ${c.whole} whole, ${c.unhealthy} not healthy; ${c.events} events after the first`,
    "", "## Named by a dry step and done", "", list(done.map((r) => `${r.name}: event ${r.event.seq} (${[r.event.type, r.event.move, r.event.outcome].filter(Boolean).join(" ")} by ${r.event.by}), ${r.minutes} min after the step; ${seen(r)}`)),
    "", "## Named by a dry step and not done", "", list(not.map((r) => `${r.name}: ${seen(r)}`)),
    "", "## Named by a dry step, of a kind the record has no event of", "", list(unread.map((r) => `${r.name}: ${seen(r)}`)),
    "", "## Done with a session's token, or an agent's own start, and named by no dry step", "", list(c.unnamed.map((e) => `event ${e.seq} (${clock(e.at)}): ${[e.type, e.move, e.role, e.outcome].filter(Boolean).join(" ")} of ${e.id} by ${e.by}, key ${e.key}; ${e.before === null ? "no step before it" : `the step before it read event ${e.before}, ${e.minutes} min earlier`}; ${e.after === null ? "no step after it" : `the next read event ${e.after}`}`)), ""].join("\n");
}
function compareCmd(args: string[]) {
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const rest = args.filter((a, i) => !["--since", "--steps", "--by"].includes(a) && !["--since", "--steps", "--by"].includes(args[i - 1]));
  const since = opt("--since"), hours = since === undefined ? 0 : Number(since), file = opt("--steps") || join(LOOP(), "steps.jsonl"), by = (opt("--by") || SESSION.join(",")).split(",").filter(Boolean);
  if (rest.length || (since !== undefined && !(hours > 0)) || ["--since", "--steps", "--by"].some((n) => args.includes(n) && !opt(n)) || !by.length) stop(2, "compare [--since <hours>] [--steps <file>] [--by <beginnings of the session's tokens, with commas>]");
  const me = own();
  let text = "", bad = 0;
  try { text = readFileSync(file, "utf8"); } catch { stop(1, `no file ${file}: the lines of steps are steps.jsonl, or with --steps the output of \`run --dry\``); }
  const all = text.split("\n").filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { bad++; return null; } }).filter((l) => l && typeof l.seq === "number" && Array.isArray(l.acts));
  const lines = hours ? all.filter((l) => l.at >= Date.now() - hours * 3_600_000) : all;
  const events: Ev[] = [];
  if (lines.length) for (let a = Math.max(0, Math.min(...lines.map((l) => l.seq)) - BEFORE), n = 0; n < 200; n++) { const d = read(me, `sync?after=${a}&limit=500`), page: Ev[] = d.events || []; events.push(...page); if (!d.more || !page.length) break; a = last(page)!.seq; }
  const c = compare(lines, events, by);
  say({ file, ...(hours ? { since: hours } : {}), by, lines: all.length, ...(bad ? { "not JSON": bad } : {}), ...c });
  console.log(compareText(c));
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "start") start(args);
  else if (cmd === "ended") await ended(args);
  else if (cmd === "resume") await resume(args);
  else if (cmd === "dead") dead(args);
  else if (cmd === "step") await step(args);
  else if (cmd === "run") await run(args);
  else if (cmd === "compare") compareCmd(args);
  else stop(2, "run [--dry] | compare [--since <hours>] [--steps <file>] [--by <names>] | start <id> [--role <role>] [--token <t>] | start [<id>] --role orchestrator --token <t> --give <entries> | ended <token> | resume <id> [--role <role>] | dead <id> --role <role> [--round <n>] | step [--dry] [--for clock|event|run]");
}
