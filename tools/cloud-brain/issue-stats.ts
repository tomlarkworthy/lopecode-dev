#!/usr/bin/env bun
// What the tracker's record says of the loop: where issues wait, which states hold them, how often work is sent back.
//   bun tools/cloud-brain/issue-stats.ts --token NAME [--after SEQ] [--until SEQ] [--window SEQ] [--idle HOURS] [--json]
// Read from issue.sync with a token, through issue-as.sh (the one beside this file; ISSUE_AS names another).
// --token is the caller's own token, the one its prompt names, and has no default: with none the tool prints the line
// above and exits 2, and nothing is sent (issue-stats-default-token-r4; until then it read as a role's token).
// --after counts only the issues opened after that event. Times are the events' own `at`.
// --window counts the events after that one, whatever issue they are of: what an oversight judges its last edits by.
// With --window, the lines under `time in a state, of the stays that began after <SEQ>` are made as the ones of the whole
// record are, from the stays whose first event (the open, or the move into the state) is after that event and whose move
// out is in the record read. They are of every issue but a `test-` one, whatever --after is, as the `window` line is; a
// state with no such stay has no line, and with none at all the line under the heading says so (stats-window-time-in-a-state).
// --until reads the record as it was at that event: a count written down with its event can be made again.
// `statements only` counts the reviews whose body begins with those words, and what the round after a sent-back one cost:
// the `context` of two `cost` events, the writer's run and the reviewer's (the line says `tokens`, as it did).
// The lines under `locks` are issue.locks?history=500, the holds of the landing lock and the deploy lock as the tracker
// keeps them: read when the tool runs, of the newest 500 holds. They are rows and not events, so --after, --until and
// --window do not reach them, and a count of them cannot be made again once the rows are trimmed.
// The last line, `past 4 h, not started, no reason: <n>`, is R4 of plan/cloud-brain-loop-order-of-service.md (os-3), and
// since bk-6-skill-watch-and-stats it is counted from one answer of issue.queue (plan/cloud-brain-bookkeeping-in-the-tracker.md,
// part 6) and not from the record: <n> is the entries of `queue` that are `late` (the service's word: the last move, or
// the open of an issue that never moved, is 4 hours or more before its `now`) and whose `do` is `start`, `spec`, `triage`
// or `ready`, each printed under the line with its `do`. `(<m> more are held)` is the entries of `waiting` whose `why`
// is `after` or `until`: an order or a time that the record has. Such an issue carries `held` in the list of the idle
// above, which is still of the record and of --idle hours since the last event of any kind. A comment that begins
// `held:` and a triage reason with the word are no reason any more: the wait they say is written as a link `after`, a
// hold (issue.hold) or the label `needs-owner`. The 4 hours are the service's, so --idle does not move this line, and
// the queue is of the time the tool runs, so --until and --after do not reach it. With no answer of issue.queue (a
// Worker put back to before it, a refusal) the line says `not read:` and why, and no row of the idle list is marked.
// `feedback due to be closed` lists the feedback at `open`, not the owner's, that has a tie and whose every tie (a link
// either way, its parent) is at `done` or `closed`; `feedback of the owner's with no tie, or each tie done or closed` the
// ones the orchestrator promotes or closes (feedback-closed-or-promoted; agents/overseer.md had "Feedback that is due" until overseer-runs-too-often, and
// the row for `open`, kind `feedback` of SKILL.md). A `related` link whose other end is a feedback issue at `open` is no
// tie in either (owners-feedback-held-by-related-links). Neither list has an issue labeled `needs-owner` or one that is
// on another workflow than the policy's for feedback (a promoted one), and the first has none with a comment that
// begins `held:`.
// The lines under `flow` are four answers of issue.flow (plan/cloud-brain-flow-metrics.md, "The tool"; fm-4-stats-flow-block),
// asked when the tool runs, the paths as `flowAsks` writes them: flow.lead by `to` and `kind`, flow.lead to `deploy` by
// `for`, flow.open by `waits`, flow.stays by `waits`. Each n, median, 85th and longest is a row of the answer's
// `summaries`, in hours to two places; the tool computes no percentile. The hours of the stays are the `sum` of the
// answer's `series` rows, added for each `waits`. --until SEQ sends `until=` the `at` of the last event read at or before
// SEQ (0 with none), and with no --until none is sent: the tracker then takes the `at` of its last event, which may be
// after the last one this run read. --after and --window do not reach the block. An answer with no `summaries` (a
// refusal, a Worker put back to before the method) is a line `not read: <why>` in its place, and the rest is printed.
// The lines under `post mortems` are part 7 and R8 of plan/cloud-brain-post-mortems-declared-and-kept.md (pm-4-stats-block).
// A post mortem is an issue that has the label `post-mortem` at the last event read, and is no `test-` one. The first
// line has how many, how many at `done`, and the rest as `not done`, whatever state they are at; it is printed with 0
// too. A row has the state, `of` the issue its own `cause` link names, `actions` each issue with a `cause` link to it and
// that issue's state, and `named again by` each post mortem opened after it that has a `related` link to it (a `related`
// link from any other issue, or from an earlier post mortem, is not one). The last line is R8: the post mortems that do
// not have the label `owner`, which are the ones a session declared with no word of his (agents/orchestrator.md, "A post mortem"),
// and beside it the events of the one case a session declares for: each `send-back` move, each `owner-reject` of an
// issue that had a review with the verdict `pass` before it, each `revert`, by the move's name (the policy of 5166 events
// lets only a caller who is present make the three). Both are of the record up to --until, whatever --after and --window are.
// `decision comment and verdict` counts, for each verdict of an approver (a comment keyed approver/<id>/verdict-<n>),
// whether the session's comment for the owner of that round (orch/<id>/decision-<n>) is before it, after it or not
// there, with the seq of each verdict that had it before (approver-before-decision-comment: SKILL.md, step 3, has the
// verdict first). Of the record up to --until, whatever --after is; a `test-` issue is not counted.
// ISSUE_AS names another issue-as.sh: the test's stand-in, or the main checkout's when the tool is run from a worktree.
// `report`, `holds`, `flow`, `flowAsks` and `text` take what was read and call nothing: tests/tools/issue-stats.test.ts.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

// --name=value or --name value.
const arg = (n: string, d: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  return at < 0 ? d : process.argv[at].includes("=") ? process.argv[at].split("=")[1] : process.argv[at + 1] ?? d;
};

// The role in a token's name, `<role>-<6 hex>` as `brain.ts agent-token` makes it. Any other name is its own group:
// the three role tokens of before, a session's own token, the owner.
export const role = (name: string) => /^(orch|impl|rev|spec|over|dig|appr|out)-[0-9a-f]{6}$/.exec(name)?.[1] ?? name;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, forOwner = /^orch\/.+\/approve-for-owner-\d+$/;

const median = (l: number[]) => (l.length ? [...l].sort((a, b) => a - b)[l.length >> 1] : 0);

// What issue.locks answered, counted. A hold is measured when its holder released it: `ended` of a row "expired" is the
// lease's `until` and of a row "forced" the owner's call, neither the end of the work. `land` and `cb4` are always
// named, any other name when it has a row. No clock is read here: the tracker sorted `locks` from `ended` by its own.
export function holds(answer: any) {
  if (!answer || !Array.isArray(answer.history)) return { unread: String(answer?.message || answer?.error || "no answer") };
  const history: any[] = answer.history, seconds = (h: any) => +((h.ended - h.taken) / 1000).toFixed(1);
  const names = [...new Set(["land", "cb4", ...[...history, ...(answer.locks || []), ...(answer.ended || [])].map((h) => h.name)])];
  const of = (name: string) => {
    const rows = history.filter((h) => h.name === name), released = rows.filter((h) => h.how === "released");
    const longest = released.reduce((a: any, h) => (a && a.ended - a.taken >= h.ended - h.taken ? a : h), null);
    const how = (k: string) => rows.filter((h) => h.how === k).length;
    return { rows: rows.length, released: released.length, medianS: median(released.map(seconds)), longestS: longest ? seconds(longest) : 0, longest: longest && { who: longest.who, taken: longest.taken }, expired: how("expired"), forced: how("forced") };
  };
  return { now: answer.now, rows: history.length, held: answer.locks || [], ended: answer.ended || [], names: Object.fromEntries(names.map((n) => [n, of(n)])) };
}

// The four asks of the block `flow`, each a path issue-as.sh takes. `until` is the `at` of the last event of the record
// at or before --until, 0 when there is none, and is not sent with no --until.
export function flowAsks(record: any[], untilSeq = 0) {
  const last = record.filter((e) => e.seq <= untilSeq).reduce((a: any, e) => (a && a.seq > e.seq ? a : e), null);
  const until = untilSeq ? `&until=${last?.at ?? 0}` : "";
  return {
    lead: `flow?metric=flow.lead&by=to,kind&since=0${until}`,
    deployFor: `flow?metric=flow.lead&by=for&to=deploy&since=0${until}`,
    open: `flow?metric=flow.open&by=waits${until}`,
    stays: `flow?metric=flow.stays&by=waits&since=0${until}`
  };
}

// What issue.flow answered to those four, put in the order printed. Every n, median, p85 and max is a row of an answer's
// `summaries` as it came, in ms; `sum` of a row of `stays` is the `sum` of that answer's `series` rows of the same `waits`,
// added. A value of a dimension that is not in the order below comes after the ones that are, by name.
const flowOrder: Record<string, string[]> = { to: ["response", "submit", "deploy", "done"], waits: ["start", "owner", "work"], for: ["owner", "loop"] };
export function flow(answers: any) {
  const part = (answer: any, dims: string[], sums = false) => {
    if (!answer || !Array.isArray(answer.summaries)) return { unread: String(answer?.message || answer?.error || "no answer") };
    const place = (d: string, v: string) => { const at = (flowOrder[d] || []).indexOf(v); return at < 0 ? 99 : at; };
    const rows = [...answer.summaries].sort((a, b) => dims.reduce((c, d) => c || place(d, a[d]) - place(d, b[d]) || String(a[d]).localeCompare(String(b[d])), 0));
    const sum = (r: any) => (answer.series || []).filter((s: any) => dims.every((d) => s[d] === r[d])).reduce((n: number, s: any) => n + s.sum, 0);
    return { since: answer.since, until: answer.until, events: answer.cost?.events, rows: sums ? rows.map((r) => ({ ...r, sum: sum(r) })) : rows };
  };
  return { lead: part(answers?.lead, ["to", "kind"]), deployFor: part(answers?.deployFor, ["for"]), open: part(answers?.open, ["waits"]), stays: part(answers?.stays, ["waits"], true) };
}

export function report(record: any[], { since = 0, from = 0, until = 0, idleH = 4, now = Date.now(), locks, flow: flowAnswers, queue: queueAnswer }: { since?: number; from?: number; until?: number; idleH?: number; now?: number; locks?: any; flow?: any; queue?: any } = {}) {
const events = until ? record.filter((e) => e.seq <= until) : record;
const who = (by: any) => ((by?.holder || "").startsWith("secret:") ? by.holder.slice(7) : by?.caller === "owner" ? (by.tab === false ? "owner (token)" : "owner") : by?.caller || "?");
const workflows: Record<string, any> = {}, issues: Record<string, any> = {}, feedbackFlows = new Set<string>();
// The owner undid work that had passed a review: the one case a session declares a post mortem for with no word of his.
const undone: { seq: number; id: string; move: string }[] = [];
for (const e of events) {
  if (e.type === "policy") for (const [n, h] of Object.entries(e.hashes)) { workflows[h as string] = e.policy.workflows[n]; if (n === e.policy.kinds?.feedback) feedbackFlows.add(h as string); }
  if (!e.id || e.hidden || e.type === "policy") continue;
  if (e.type === "opened") issues[e.id] = { id: e.id, kind: e.kind, opener: who(e.by), workflow: e.workflow, state: e.state, at: e.at, since: e.at, sinceSeq: e.seq, seq: e.seq, labels: new Set(e.labels || []), stays: [], moves: [], verdicts: [], asked: (e.labels || []).includes("needs-owner"), parent: e.parent, links: 0, to: [] as { id: string; rel: string }[], bySession: e.by?.via === "session", heldBy: { comment: false } };
  const i = issues[e.id];
  if (!i) continue;
  i.last = e.at;
  if (e.type === "moved" || e.type === "swapped") {
    const to = e.type === "moved" ? e.to : e.to.state;
    i.stays.push([i.state, e.at - i.since, i.sinceSeq]);
    i.moves.push(e.move || e.swap || "swap");
    if (!/^test-/.test(e.id) && (e.move === "send-back" || e.move === "revert" || (e.move === "owner-reject" && i.verdicts.includes("pass")))) undone.push({ seq: e.seq, id: e.id, move: e.move });
    Object.assign(i, { state: to, since: e.at, sinceSeq: e.seq }, e.type === "swapped" ? { workflow: e.to.workflow } : {});
  }
  if (e.type === "commented" && /^held:/i.test(String(e.body || "").trimStart())) i.heldBy.comment = true;
  if (e.type === "reviewed") i.verdicts.push(e.verdict);
  if (e.type === "labelled") {
    for (const l of e.add || []) i.labels.add(l);
    for (const l of e.remove || []) i.labels.delete(l);
    if ((e.add || []).includes("needs-owner")) i.asked = true;
  }
  if (e.type === "linked") e.rel === "part-of" ? (i.parent = e.remove ? null : e.to) : (i.links += e.remove ? -1 : 1);
  if (e.type === "linked" && e.rel !== "part-of") i.to = [...i.to.filter((l: any) => !(l.id === e.to && l.rel === e.rel)), ...(e.remove ? [] : [{ id: e.to, rel: e.rel }])];
}

const H = (ms: number) => +(ms / 3600000).toFixed(1);
const all = Object.values(issues).filter((i: any) => i.seq > since && !/^test-/.test(i.id)) as any[];
const closed = (i: any) => (workflows[i.workflow]?.closed || []).includes(i.state);
const count = (l: string[]) => l.reduce((m: Record<string, number>, k) => ((m[k] = (m[k] || 0) + 1), m), {});

const perState: Record<string, number[]> = {}, perStateInWindow: Record<string, number[]> = {};
for (const i of all) for (const [s, ms] of i.stays) (perState[s] ||= []).push(ms);
// A stay is in the window when it began after --window: the event that put the issue in the state, not the move out.
if (from) for (const i of Object.values(issues) as any[]) if (!/^test-/.test(i.id)) for (const [s, ms, began] of i.stays) if (began > from) (perStateInWindow[s] ||= []).push(ms);
const timeIn = (per: Record<string, number[]>) => Object.fromEntries(Object.entries(per).map(([s, l]) => [s, { stays: l.length, medianMin: +(median(l) / 60000).toFixed(1), totalH: H(l.reduce((a, b) => a + b, 0)), maxH: H(Math.max(...l)) }]));
const done = all.filter((i) => i.state === "done");
const submits = all.reduce((n, i) => n + i.moves.filter((m: string) => m === "submit").length, 0);
const reworks = all.reduce((n, i) => n + i.moves.filter((m: string) => m === "rework").length, 0);
const open = all.filter((i) => !closed(i));
const asked = all.filter((i) => i.asked);
// A time of day in a reason or a body that is more than a minute after the event's own `at`, in this machine's zone.
// As issue-as.sh reads it: the date nearest the time says its day, and a time beside another day's date is not counted.
// It counts a quote of such a time too (a correction, a review of one): read the seqs.
const ahead = (e: any) => [e.reason, e.body].some((text) => {
  if (typeof text !== "string") return false;
  const day = new Date(e.at), today = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  const dates = [...text.matchAll(/(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g)].map((d) => ({ s: d.index!, e: d.index! + 10, v: d[0] }));
  return [...text.matchAll(/(?<![\w:.+])([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(?!\d|:\d)/g)].some((m) => {
    const at = m.index!, gap = (d: any) => (d.e <= at ? at - d.e : d.s - (at + m[0].length) + 0.5);
    const near = dates.sort((a, b) => gap(a) - gap(b))[0];
    if (near && near.v !== today) return false;
    const t = new Date(e.at); t.setHours(+m[1], +m[2], +(m[3] || 0), 0);
    return t.getTime() - e.at > 60000;
  });
});
const shown = events.filter((e) => !e.hidden && !/^test-/.test(e.id || ""));
// An approve of the owner's session has the same `by` from his press in the panel and from a call made with his
// session file. The key tells them apart: the panel writes a UUID, the loop `orch/<id>/approve-for-owner-<n>`.
// Of the record up to --until, whatever --after is. A key of neither shape is listed by its event.
const approves = shown.filter((e) => e.type === "moved" && e.move === "approve" && e.by?.via === "session");
const approveBySession = {
  pressed: approves.filter((e) => uuid.test(e.key || "")).length,
  madeForOwner: approves.filter((e) => forOwner.test(e.key || "")).length,
  other: approves.filter((e) => !uuid.test(e.key || "") && !forOwner.test(e.key || "")).map((e) => e.seq)
};
// An approve a token made. The policy takes one from a single delegation, the approver's, once the owner has installed
// that guard (plan/cloud-brain-approver-persona.md, R2; ap-1-approver-tool); `approver.ts list` has each one's line.
const approveByApprover = shown.filter((e) => e.type === "moved" && e.move === "approve" && String(e.by?.via || "").startsWith("delegation:")).length;
// The orchestrating session's comment for the owner on an issue at `awaiting-approval` (key orch/<id>/decision-<n>) is
// written after the approver's verdict of that round (approver/<id>/verdict-<n>) and not before: SKILL.md, step 3, the
// row at `awaiting-approval` (approver-before-decision-comment). `before` has the seq of each verdict whose round had
// that comment first; one after the event that change landed at is a round the row was not followed in. Of the record
// up to --until, whatever --after is.
const decisionKey = /^orch\/(.+)\/decision-(\d+)$/, verdictKey = /^approver\/(.+)\/verdict-(\d+)$/;
// The issue and the round a comment's key names, when the key is of the issue the comment is on.
const roundOf = (e: any, key: RegExp) => { const m = e.type === "commented" ? key.exec(e.key || "") : null; return m && m[1] === e.id ? `${e.id} ${m[2]}` : ""; };
const decisionAt = new Map<string, number>();
for (const e of shown) { const r = roundOf(e, decisionKey); if (r && !decisionAt.has(r)) decisionAt.set(r, e.seq); }
const decisionAndVerdict = { verdicts: 0, before: [] as number[], after: 0, none: 0 };
for (const e of shown) {
  const r = roundOf(e, verdictKey), d = decisionAt.get(r);
  if (!r) continue;
  decisionAndVerdict.verdicts++;
  d === undefined ? decisionAndVerdict.none++ : d < e.seq ? decisionAndVerdict.before.push(e.seq) : decisionAndVerdict.after++;
}
const openers: Record<string, { count: number; names: Record<string, number> }> = {};
for (const i of all) {
  const o = (openers[role(i.opener)] ||= { count: 0, names: {} });
  o.count++;
  o.names[i.opener] = (o.names[i.opener] || 0) + 1;
}
const inWindow = shown.filter((e) => e.seq > from);
// A review whose body begins `statements only` says every finding or note of it is a statement, and none asks code, a
// test or a tool to change; `statements only, record` that each is in the issue's own record. The mark is the
// reviewer's own (step 7 of its brief), of either verdict. For a marked `changes` the round after is the issue's first
// implementer run whose `event` is after the review, and its first reviewer run whose `event` is after that one: by
// `event`, since a cost event's own seq is when it was written (the ones entered from comments, long after) and its
// `round` counts the writer's runs, not the reviews. A review with either missing is counted and left out of the sum.
// A run is a `cost` event (issue.cost), the one in force for its issue, role and round: the last of them in the record
// read, which is the one the tracker's row keeps (a later one names the one it replaced). `context` is the size of the
// run's last request, not what it was billed. No comment is read for a cost (cm-5-the-loop-writes-the-event; until
// then the runs were comments, parsed here, and one that did not parse was dropped without a word).
const inForce = new Map<string, any>();
for (const e of shown) if (e.type === "cost") inForce.set(`${e.id} ${e.role} ${e.round}`, e);
const costs: Record<string, any[]> = {};
for (const c of inForce.values()) (costs[c.id] ||= []).push(c);
const mark = (e: any) => /^statements only(, record)?(?![\w-])/.exec(String(e.body || "").trimStart());
const after = (list: any[], r: string, n: number) => list.filter((c) => c.role === r && c.event > n).sort((x, y) => x.event - y.event)[0];
const statementsOnly = (list: any[]) => {
  const tally = (reviews: any[]) => {
    const round = { summed: 0, tokens: 0, leftOut: [] as number[] };
    for (const e of reviews.filter((e) => e.verdict === "changes")) {
      const writer = after(costs[e.id] || [], "implementer", e.seq), review = writer && after(costs[e.id], "reviewer", writer.event);
      if (review) { round.summed++; round.tokens += writer.context + review.context; } else round.leftOut.push(e.seq);
    }
    return { reviews: reviews.length, verdicts: count(reviews.map((e) => e.verdict)), round };
  };
  const marked = list.filter((e) => e.type === "reviewed" && mark(e));
  return { all: tally(marked), record: tally(marked.filter((e) => mark(e)![1])) };
};

// R4, from issue.queue: what is late and not started, and what waits on an order or a time. No answer, or one that is
// not the queue's (no two lists), is said in the line and nothing is counted.
const queueRead = queueAnswer && Array.isArray(queueAnswer.queue) && Array.isArray(queueAnswer.waiting);
const notStarted = ["start", "spec", "triage", "ready"], heldWhy = ["after", "until"];
const late = queueRead ? queueAnswer.queue.filter((q: any) => q.late === true && notStarted.includes(q.do)).map((q: any) => ({ id: q.id, kind: q.kind, state: q.state, do: q.do, sinceMoveH: H(queueAnswer.now - q.since) })).sort((a: any, b: any) => b.sinceMoveH - a.sinceMoveH) : [];
const held = queueRead ? queueAnswer.waiting.filter((w: any) => heldWhy.includes(w.why)).map((w: any) => ({ id: w.id, kind: w.kind, state: w.state, why: w.why, ...(w.on ? { on: w.on } : {}), ...(w.until ? { until: w.until } : {}) })) : [];
const heldIds = new Set(held.map((w: any) => w.id));
const unstarted = queueRead ? { hours: 4, count: late.length, noReason: late, held, more: queueAnswer.more === true }
  : { hours: 4, notRead: queueAnswer === undefined ? "no answer of issue.queue was given" : String(queueAnswer?.message || queueAnswer?.error || "the answer has no queue and waiting lists") };
// Feedback that waits at `open` of a workflow a policy gave the kind `feedback` (one swapped to another workflow is a
// task from then on, though its kind stays; an install that migrates swaps it to the new feedback workflow). Its ties: what it says of
// other issues, what they say of it, and its parent. A `related` link is no tie when its other end is itself feedback at
// `open` of that workflow: it says two reports are of one thing, and no work is under way for either (a link of another
// rel to such a note is a tie, and so is one to an issue this token is not shown, whose kind is not known here).
// `due`: not the owner's, it has a tie and each is at `done` or `closed`, so nothing it was gathered into is still
// being worked; `rejected` is not counted (a note tied to a rejected issue was answered by nobody) and an issue this
// token is not shown has no state here. One with a comment that begins `held:` is kept by whoever wrote that, and is
// not due. `toPromote`: the owner's, with no tie or with each tie at `done` or `closed`, whatever its comments say.
const atOpen = (id: string) => issues[id]?.kind === "feedback" && issues[id].state === "open" && feedbackFlows.has(issues[id].workflow);
const said: Record<string, { id: string; rel: string }[]> = {};
for (const i of Object.values(issues) as any[]) for (const l of i.to) (said[l.id] ||= []).push({ id: i.id, rel: l.rel });
const tied = (links: { id: string; rel: string }[]) => links.filter((l) => !(l.rel === "related" && atOpen(l.id))).map((l) => l.id);
const ties = (i: any): string[] => [...new Set([...tied(i.to), ...(i.parent ? [i.parent] : []), ...tied(said[i.id] || [])])];
const ended = (id: string) => ["done", "closed"].includes(issues[id]?.state);
const owners = (i: any) => i.bySession || i.labels.has("owner");
const notes = open.filter((i) => i.kind === "feedback" && i.state === "open" && feedbackFlows.has(i.workflow) && !i.labels.has("needs-owner"));
const tiesOf = (i: any) => ({ id: i.id, ties: ties(i).map((t) => `${t} ${issues[t].state}`) });
const feedbackDue = notes.filter((i) => !owners(i) && !i.heldBy.comment && ties(i).length && ties(i).every(ended)).map(tiesOf);
const feedbackToPromote = notes.filter((i) => owners(i) && ties(i).every(ended)).map(tiesOf);
// The post mortems, in the order they were opened. `said` has what other issues say of each.
const isPm = (i: any) => !!i && i.labels.has("post-mortem") && !/^test-/.test(i.id);
const pms = (Object.values(issues) as any[]).filter(isPm).sort((a, b) => a.seq - b.seq);
const saidOf = (p: any, rel: string) => (said[p.id] || []).filter((l) => l.rel === rel && !/^test-/.test(l.id));
const postMortems = {
  count: pms.length, done: pms.filter((p) => p.state === "done").length, notDone: pms.filter((p) => p.state !== "done").length,
  rows: pms.map((p) => ({
    id: p.id, state: p.state as string, owner: p.labels.has("owner") as boolean,
    of: p.to.filter((l: any) => l.rel === "cause").map((l: any) => l.id) as string[],
    actions: saidOf(p, "cause").map((l) => ({ id: l.id, state: issues[l.id].state as string })),
    namedAgainBy: saidOf(p, "related").filter((l) => isPm(issues[l.id]) && issues[l.id].seq > p.seq).map((l) => l.id)
  })),
  // R8: declared by a session with no word of the owner's, against the events of the one case it declares for.
  bySession: pms.filter((p) => !p.labels.has("owner")).map((p) => p.id as string),
  undone: { count: undone.length, sendBack: undone.filter((u) => u.move === "send-back").map((u) => u.seq), ownerRejectAfterPass: undone.filter((u) => u.move === "owner-reject").map((u) => u.seq), revert: undone.filter((u) => u.move === "revert").map((u) => u.seq) }
};
const moved = (m: string) => inWindow.filter((e) => e.type === "moved" && e.move === m).length;
const windowReport = {
  after: from, events: inWindow.length, submits: moved("submit") + moved("submit-spec"), reworks: moved("rework") + moved("send-back"),
  verdicts: count(inWindow.filter((e) => e.type === "reviewed").map((e) => e.verdict)),
  withText: inWindow.filter((e) => `${e.reason || ""}${e.body || ""}`.trim()).length, timesAhead: inWindow.filter(ahead).map((e) => e.seq),
  statementsOnly: statementsOnly(inWindow),
  // Of the stays that began after --window and ended in the record read; {} with no --window.
  timeInState: timeIn(perStateInWindow)
};
return {
  window: windowReport, since, idleH,
  events: events.length,
  issues: all.length,
  states: count(all.map((i) => i.state)),
  kinds: count(all.map((i) => i.kind)),
  // By the role of the token that opened, with each name under it.
  openers,
  approveBySession,
  approveByApprover,
  decisionAndVerdict,
  // Time spent in a state before the move out of it. An issue still in a state is under `waiting`.
  timeInState: timeIn(perState),
  done: { count: done.length, medianH: H(median(done.map((i) => i.since - i.at))), firstPass: done.filter((i) => !i.moves.includes("rework")).length, quick: done.filter((i) => !i.moves.includes("ready")).length },
  review: { submits, reworks, verdicts: count(all.flatMap((i) => i.verdicts)) },
  // Of the record up to --until, whatever --after is; `window.statementsOnly` is of the reviews after --window.
  statementsOnly: statementsOnly(shown),
  needsOwner: { ever: asked.length, became: count(asked.map((i) => i.state)), waitingNow: open.filter((i) => i.labels.has("needs-owner")).length },
  feedback: { open: open.filter((i) => i.kind === "feedback").length, gathered: all.filter((i) => i.kind === "feedback" && (i.parent || i.links > 0)).length, due: feedbackDue, toPromote: feedbackToPromote },
  // Of the record up to --until, whatever --after is.
  postMortems,
  // Absent when no answer of issue.locks was given.
  locks: locks === undefined ? undefined : holds(locks),
  // Absent when no answer of issue.flow was given.
  flow: flowAnswers === undefined ? undefined : flow(flowAnswers),
  // Not closed, and nothing has happened to it for --idle hours: the candidates for a trap. `held`: the queue has it in
  // `waiting` for an order or a time (`unstarted.held`).
  waiting: open.filter((i) => now - i.last > idleH * 3600000).map((i) => ({ id: i.id, kind: i.kind, state: i.state, idleH: H(now - i.last), labels: [...i.labels], opener: i.opener, held: heldIds.has(i.id) })).sort((a, b) => b.idleH - a.idleH),
  // From issue.queue: `noReason` is R4's count, the late entries that are not started; `held` the ones that wait on an
  // order or a time. `notRead` in their place when the queue was not read.
  unstarted
};
}

// A time of the tracker's, as `date` writes it on this machine.
const stamp = (ms: number) => { const d = new Date(ms), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };

// The lines printed without --json.
export function text(report: Report) {
  const lines: string[] = [], console = { log: (...a: string[]) => void lines.push(a.join(" ")) };
  const { since, idleH, window: windowReport } = report, from = windowReport.after, { submits, reworks } = report.review;
  const line = (k: string, v: any) => console.log(k.padEnd(14), typeof v === "string" ? v : JSON.stringify(v));
  line("record", `${report.events} events, ${report.issues} issues${since ? " opened after event " + since : ""}`);
  for (const k of ["states", "kinds"]) line(k, (report as any)[k]);
  console.log("openers, by the role of the token and then by its name");
  for (const [r, o] of Object.entries(report.openers)) {
    const names = Object.entries(o.names).filter(([n]) => n !== r).map(([n, c]) => `${n} ${c}`).join(", ");
    console.log(`  ${r.padEnd(24)} ${String(o.count).padStart(3)}${names ? "  " + names : ""}`);
  }
  const a = report.approveBySession;
  console.log(`approve by the session: ${a.pressed} pressed, ${a.madeForOwner} made for the owner; by the approver: ${report.approveByApprover}${a.other.length ? `; ${a.other.length} with another key ${JSON.stringify(a.other)}` : ""}`);
  const d = report.decisionAndVerdict;
  console.log(`decision comment and verdict: ${d.verdicts} verdicts of an approver; the session's comment for the owner before the verdict ${d.before.length}${d.before.length ? " " + JSON.stringify(d.before) : ""}, after it ${d.after}, none ${d.none}`);
  console.log("time in a state before the move out of it");
  const stays = (of: Report["timeInState"]) => { for (const [s, t] of Object.entries(of)) console.log(`  ${s.padEnd(18)} ${String(t.stays).padStart(3)} stays  median ${String(t.medianMin).padStart(6)} min  total ${String(t.totalH).padStart(5)} h  max ${t.maxH} h`); };
  stays(report.timeInState);
  line("done", `${report.done.count}, median ${report.done.medianH} h from opened; ${report.done.firstPass} with no rework; ${report.done.quick} started without triage`);
  line("review", `${submits} submits, ${reworks} sent back; verdicts ${JSON.stringify(report.review.verdicts)}`);
  if (from) {
    console.log(`time in a state, of the stays that began after ${from}`);
    stays(windowReport.timeInState);
    if (!Object.keys(windowReport.timeInState).length) console.log("  none: no stay began after it and ended");
  }
  if (from) line("window", `${windowReport.events} events after ${from}: ${windowReport.submits} submits, ${windowReport.reworks} sent back; verdicts ${JSON.stringify(windowReport.verdicts)}; ${windowReport.timesAhead.length} of ${windowReport.withText} texts name a time ahead of their own stamp ${JSON.stringify(windowReport.timesAhead)}`);
  const marked = (t: Report["statementsOnly"]["all"]) => `${t.reviews} ${JSON.stringify(t.verdicts)}${t.round.summed + t.round.leftOut.length ? `, the rounds after ${t.round.summed} sent back: ${t.round.tokens} tokens${t.round.leftOut.length ? `, ${t.round.leftOut.length} more left out (no cost event naming its event) ${JSON.stringify(t.round.leftOut)}` : ""}` : ""}`;
  const statements = (s: Report["statementsOnly"]) => `${marked(s.all)}; of them \`statements only, record\`: ${marked(s.record)}`;
  line("statements only", `reviews that begin with it: ${statements(report.statementsOnly)}`);
  if (from) console.log(`  after ${from}: ${statements(windowReport.statementsOnly)}`);
  line("needs-owner", `${report.needsOwner.ever} issues ever; now ${JSON.stringify(report.needsOwner.became)}; ${report.needsOwner.waitingNow} open with the label`);
  line("feedback", `${report.feedback.open} open, ${report.feedback.gathered} with a parent or a link`);
  console.log(`feedback due to be closed, not the owner's, each tie done or closed: ${report.feedback.due.length}`);
  for (const d of report.feedback.due) console.log(`  ${d.id.padEnd(40)} ${d.ties.join(", ")}`);
  console.log(`feedback of the owner's with no tie, or each tie done or closed, to promote or to close: ${report.feedback.toPromote.length}`);
  for (const d of report.feedback.toPromote) console.log(`  ${d.id.padEnd(40)} ${d.ties.join(", ") || "no tie"}`);
  const pm = report.postMortems, seqs = (l: number[]) => (l.length ? " " + JSON.stringify(l) : "");
  line("post mortems", `${pm.count}: ${pm.done} done, ${pm.notDone} not done`);
  for (const p of pm.rows) console.log(`  ${p.id.padEnd(40)} ${p.state.padEnd(17)} of ${p.of.join(", ") || "no cause link"}   actions: ${p.actions.map((a) => `${a.id} ${a.state}`).join(", ") || "none"}   named again by: ${p.namedAgainBy.join(", ") || "none"}`);
  console.log(`  declared with no label \`owner\`: ${pm.bySession.length}${pm.bySession.length ? " " + pm.bySession.join(", ") : ""}; the owner undid work that had passed a review: ${pm.undone.count} (send-back ${pm.undone.sendBack.length}${seqs(pm.undone.sendBack)}, owner-reject after a pass ${pm.undone.ownerRejectAfterPass.length}${seqs(pm.undone.ownerRejectAfterPass)}, revert ${pm.undone.revert.length}${seqs(pm.undone.revert)})`);
  const l: any = report.locks;
  if (l?.unread) line("locks", `not read: ${l.unread}`);
  else if (l) {
    line("locks", `${l.rows} holds in the history (the newest 500 are kept), ${l.held.length} held and ${l.ended.length} ended and not taken since, at ${stamp(l.now)}`);
    for (const [n, h] of Object.entries(l.names) as [string, any][]) console.log(`  ${n.padEnd(8)} ${String(h.released).padStart(3)} released${h.released ? `  median ${h.medianS} s  longest ${h.longestS} s by ${h.longest.who}, taken ${stamp(h.longest.taken)}` : ""}${h.expired + h.forced ? `; ${h.expired} expired and ${h.forced} forced, not measured` : ""}`);
    for (const h of l.held) console.log(`  held   ${h.name} by ${h.who} since ${stamp(h.taken)}, until ${stamp(h.until)}`);
    for (const h of l.ended) console.log(`  ended  ${h.name} by ${h.who} at ${stamp(h.until)}, taken ${stamp(h.taken)}; no row of the history yet`);
  }
  const f: any = report.flow;
  if (f) {
    // ms as hours to two places: 1.01 h is 3,645,001 ms. A unit, not a statistic.
    const h = (ms: number) => (ms / 3600000).toFixed(2).padStart(7) + " h";
    const head = (p: any, what: string) => console.log(`  ${what}${p.unread ? `: not read: ${p.unread}` : `, of ${p.events} events to ${stamp(p.until)}`}`);
    console.log("flow, as issue.flow answered: n, the median and the 85th of its summaries");
    head(f.lead, "from opened to a clock, by kind");
    for (const r of f.lead.rows || []) console.log(`    ${r.to.padEnd(9)} ${r.kind.padEnd(9)} ${String(r.n).padStart(4)}  median ${h(r.median)}  85th ${h(r.p85)}`);
    head(f.deployFor, "from opened to deploy, by whom it was for");
    for (const r of f.deployFor.rows || []) console.log(`    ${r.for.padEnd(19)} ${String(r.n).padStart(4)}  median ${h(r.median)}  85th ${h(r.p85)}`);
    head(f.open, "open, by what it waits for: its age");
    for (const r of f.open.rows || []) console.log(`    ${r.waits.padEnd(19)} ${String(r.n).padStart(4)}  median ${h(r.median)}  longest ${h(r.max)}`);
    head(f.stays, "stays, by what was waited for: the hours of them, added from its series");
    for (const r of f.stays.rows || []) console.log(`    ${r.waits.padEnd(19)} ${String(r.n).padStart(4)}  total  ${h(r.sum)}`);
  }
  console.log(`open and idle for ${idleH} h or more`);
  for (const w of report.waiting) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.idleH).padStart(5)} h  ${w.labels.join(",")}  by ${w.opener}${w.held ? "  held" : ""}`);
  const u: any = report.unstarted;
  if (u.notRead) console.log(`past ${u.hours} h, not started, no reason: not read: ${u.notRead}`);
  else {
    console.log(`past ${u.hours} h, not started, no reason: ${u.count}${u.held.length ? ` (${u.held.length} more are held)` : ""}${u.more ? " (the queue was cut at its limit: more entries were not read)" : ""}`);
    for (const w of u.noReason) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.sinceMoveH).padStart(5)} h with no move  ${w.do}`);
  }
  return lines;
}
type Report = ReturnType<typeof report>;

if (import.meta.main) {
  const token = arg("token", ""), as = process.env.ISSUE_AS || join(dirname(import.meta.path), "issue-as.sh");
  if (!token || token.startsWith("--")) {
    console.error("issue-stats.ts: no --token; nothing was sent\n  bun tools/cloud-brain/issue-stats.ts --token NAME [--after SEQ] [--until SEQ] [--window SEQ] [--idle HOURS] [--json]\n  NAME is your own token, the one your prompt names (a name issue-as.sh keeps)");
    process.exit(2);
  }
  const events: any[] = [];
  for (let after = 0; ; ) {
    const out = execFileSync(as, [token, `sync?after=${after}&limit=500`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const page = JSON.parse(out).events || [];
    events.push(...page);
    if (page.length < 500) break;
    after = page.at(-1).seq;
  }
  // A Worker put back to before issue.locks answers no `history`; the rest is printed and the line says what it answered.
  let locks: any;
  try { locks = JSON.parse(execFileSync(as, [token, "locks?history=500"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); }
  catch (e: any) { locks = { message: String(e?.message || e).split("\n")[0] }; }
  // The same for issue.flow, an ask at a time: one that is refused is said in its place.
  const until = Number(arg("until", "0")), flow: Record<string, any> = {};
  for (const [name, path] of Object.entries(flowAsks(events, until))) {
    try { flow[name] = JSON.parse(execFileSync(as, [token, path], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); }
    catch (e: any) { flow[name] = { message: String(e?.message || e).split("\n")[0] }; }
  }
  // And for issue.queue: one that is refused is said in the last line.
  let queue: any;
  try { queue = JSON.parse(execFileSync(as, [token, "queue"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); }
  catch (e: any) { queue = { message: String(e?.message || e).split("\n")[0] }; }
  const r = report(events, { locks, flow, queue, since: Number(arg("after", "0")), from: Number(arg("window", "0")), until, idleH: Number(arg("idle", "4")) });
  console.log(process.argv.includes("--json") ? JSON.stringify(r) : text(r).join("\n"));
}
