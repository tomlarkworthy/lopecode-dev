#!/usr/bin/env bun
// What the tracker's record says of the loop: where issues wait, which states hold them, how often work is sent back.
//   bun tools/cloud-brain/issue-stats.ts --token NAME [--after SEQ] [--until SEQ] [--window SEQ] [--idle HOURS] [--json]
// Read from issue.sync with a token, through issue-as.sh (run it from the main checkout: a worktree has no tokens).
// --token is the caller's own token, the one its prompt names, and has no default: with none the tool prints the line
// above and exits 2, and nothing is sent (issue-stats-default-token-r4; until then it read as a role's token).
// --after counts only the issues opened after that event. Times are the events' own `at`.
// --window counts the events after that one, whatever issue they are of: what an oversight judges its last edits by.
// --until reads the record as it was at that event: a count written down with its event can be made again.
// `statements only` counts the reviews whose body begins with those words, and what the round after a sent-back one cost.
// The lines under `locks` are issue.locks?history=500, the holds of the landing lock and the deploy lock as the tracker
// keeps them: read when the tool runs, of the newest 500 holds. They are rows and not events, so --after, --until and
// --window do not reach them, and a count of them cannot be made again once the rows are trimmed.
// The last line, `past 4 h, not started, no reason: <n>`, is R4 of plan/cloud-brain-loop-order-of-service.md (os-3). Its
// rows are the issues that are not closed, not feedback, not labeled `needs-owner` now, at `open`, `triaged` or `ready`
// (no agent is on one there), and whose last move, or open when it never moved, is --idle hours ago or more. `idle` in
// the list above it is since the last event of any kind, so a comment takes an issue out of that list and not out of
// this count. A row has a reason, and is left out of <n>, when a comment of the issue begins `held:` or the reason of
// its last `triage` move has the word `held`, with a capital or without; such a row carries `held` in the list of the idle. Both
// are read wherever they are in the issue's record: a reason written before a later move still counts. The rows of <n>
// are printed under the line. The clock of both lists is this machine's when the tool runs, with --until too.
// `report`, `holds` and `text` take what was read and call nothing: tests/tools/issue-stats.test.ts.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

// --name=value or --name value.
const arg = (n: string, d: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  return at < 0 ? d : process.argv[at].includes("=") ? process.argv[at].split("=")[1] : process.argv[at + 1] ?? d;
};

// The role in a token's name, `<role>-<6 hex>` as `brain.ts agent-token` makes it. Any other name is its own group:
// the three role tokens of before, a session's own token, the owner.
export const role = (name: string) => /^(orch|impl|rev|spec|over|dig|out)-[0-9a-f]{6}$/.exec(name)?.[1] ?? name;
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

export function report(record: any[], { since = 0, from = 0, until = 0, idleH = 4, now = Date.now(), locks }: { since?: number; from?: number; until?: number; idleH?: number; now?: number; locks?: any } = {}) {
const events = until ? record.filter((e) => e.seq <= until) : record;
const who = (by: any) => ((by?.holder || "").startsWith("secret:") ? by.holder.slice(7) : by?.caller === "owner" ? (by.tab === false ? "owner (token)" : "owner") : by?.caller || "?");
const workflows: Record<string, any> = {}, issues: Record<string, any> = {};
for (const e of events) {
  if (e.type === "policy") for (const [n, h] of Object.entries(e.hashes)) workflows[h as string] = e.policy.workflows[n];
  if (!e.id || e.hidden || e.type === "policy") continue;
  if (e.type === "opened") issues[e.id] = { id: e.id, kind: e.kind, opener: who(e.by), workflow: e.workflow, state: e.state, at: e.at, since: e.at, seq: e.seq, labels: new Set(e.labels || []), stays: [], moves: [], verdicts: [], asked: (e.labels || []).includes("needs-owner"), parent: e.parent, links: 0, heldBy: { comment: false, triage: false } };
  const i = issues[e.id];
  if (!i) continue;
  i.last = e.at;
  if (e.type === "moved" || e.type === "swapped") {
    const to = e.type === "moved" ? e.to : e.to.state;
    i.stays.push([i.state, e.at - i.since]);
    if (e.move === "triage") i.heldBy.triage = /\bheld\b/i.test(e.reason || "");
    i.moves.push(e.move || e.swap || "swap");
    Object.assign(i, { state: to, since: e.at }, e.type === "swapped" ? { workflow: e.to.workflow } : {});
  }
  if (e.type === "commented" && /^held:/i.test(String(e.body || "").trimStart())) i.heldBy.comment = true;
  if (e.type === "reviewed") i.verdicts.push(e.verdict);
  if (e.type === "labelled") {
    for (const l of e.add || []) i.labels.add(l);
    for (const l of e.remove || []) i.labels.delete(l);
    if ((e.add || []).includes("needs-owner")) i.asked = true;
  }
  if (e.type === "linked") e.rel === "part-of" ? (i.parent = e.remove ? null : e.to) : (i.links += e.remove ? -1 : 1);
}

const H = (ms: number) => +(ms / 3600000).toFixed(1);
const all = Object.values(issues).filter((i: any) => i.seq > since && !/^test-/.test(i.id)) as any[];
const closed = (i: any) => (workflows[i.workflow]?.closed || []).includes(i.state);
const count = (l: string[]) => l.reduce((m: Record<string, number>, k) => ((m[k] = (m[k] || 0) + 1), m), {});

const perState: Record<string, number[]> = {};
for (const i of all) for (const [s, ms] of i.stays) (perState[s] ||= []).push(ms);
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
// implementer `cost` comment whose `event` is after the review, and its first reviewer `cost` comment whose `event`
// is after that one: by `event`, since a comment's own seq is when it was written (backfilled ones, long after) and
// its `round` counts the writer's runs, not the reviews. A review with either missing is counted and left out of the sum.
const costs: Record<string, any[]> = {};
for (const e of shown) if (e.type === "commented" && /^cost \{/.test(e.body || "")) try { (costs[e.id] ||= []).push(JSON.parse(e.body.slice(5))); } catch {}
const mark = (e: any) => /^statements only(, record)?(?![\w-])/.exec(String(e.body || "").trimStart());
const after = (list: any[], r: string, n: number) => list.filter((c) => c.role === r && c.event > n && Number.isFinite(c.tokens)).sort((x, y) => x.event - y.event)[0];
const statementsOnly = (list: any[]) => {
  const tally = (reviews: any[]) => {
    const round = { summed: 0, tokens: 0, leftOut: [] as number[] };
    for (const e of reviews.filter((e) => e.verdict === "changes")) {
      const writer = after(costs[e.id] || [], "implementer", e.seq), review = writer && after(costs[e.id], "reviewer", writer.event);
      if (review) { round.summed++; round.tokens += writer.tokens + review.tokens; } else round.leftOut.push(e.seq);
    }
    return { reviews: reviews.length, verdicts: count(reviews.map((e) => e.verdict)), round };
  };
  const marked = list.filter((e) => e.type === "reviewed" && mark(e));
  return { all: tally(marked), record: tally(marked.filter((e) => mark(e)![1])) };
};

// R4: not started and no agent on it, for --idle hours since its last move. `by` is the reason found, a comment first.
const unstartedStates = ["open", "triaged", "ready"];
const canWait = (i: any) => i.kind !== "feedback" && !i.labels.has("needs-owner") && unstartedStates.includes(i.state);
const heldBy = (i: any) => (i.heldBy.comment ? "comment" : i.heldBy.triage ? "triage" : null);
const past = open.filter((i) => canWait(i) && now - i.since >= idleH * 3600000).map((i) => ({ id: i.id, kind: i.kind, state: i.state, sinceMoveH: H(now - i.since), by: heldBy(i) })).sort((a, b) => b.sinceMoveH - a.sinceMoveH);
const moved = (m: string) => inWindow.filter((e) => e.type === "moved" && e.move === m).length;
const windowReport = {
  after: from, events: inWindow.length, submits: moved("submit") + moved("submit-spec"), reworks: moved("rework") + moved("send-back"),
  verdicts: count(inWindow.filter((e) => e.type === "reviewed").map((e) => e.verdict)),
  withText: inWindow.filter((e) => `${e.reason || ""}${e.body || ""}`.trim()).length, timesAhead: inWindow.filter(ahead).map((e) => e.seq),
  statementsOnly: statementsOnly(inWindow)
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
  // Time spent in a state before the move out of it. An issue still in a state is under `waiting`.
  timeInState: Object.fromEntries(Object.entries(perState).map(([s, l]) => [s, { stays: l.length, medianMin: +(median(l) / 60000).toFixed(1), totalH: H(l.reduce((a, b) => a + b, 0)), maxH: H(Math.max(...l)) }])),
  done: { count: done.length, medianH: H(median(done.map((i) => i.since - i.at))), firstPass: done.filter((i) => !i.moves.includes("rework")).length, quick: done.filter((i) => !i.moves.includes("ready")).length },
  review: { submits, reworks, verdicts: count(all.flatMap((i) => i.verdicts)) },
  // Of the record up to --until, whatever --after is; `window.statementsOnly` is of the reviews after --window.
  statementsOnly: statementsOnly(shown),
  needsOwner: { ever: asked.length, became: count(asked.map((i) => i.state)), waitingNow: open.filter((i) => i.labels.has("needs-owner")).length },
  feedback: { open: open.filter((i) => i.kind === "feedback").length, gathered: all.filter((i) => i.kind === "feedback" && (i.parent || i.links > 0)).length },
  // Absent when no answer of issue.locks was given.
  locks: locks === undefined ? undefined : holds(locks),
  // Not closed, and nothing has happened to it for --idle hours: the candidates for a trap. `held` is under `unstarted`.
  waiting: open.filter((i) => now - i.last > idleH * 3600000).map((i) => ({ id: i.id, kind: i.kind, state: i.state, idleH: H(now - i.last), labels: [...i.labels], opener: i.opener, held: canWait(i) && !!heldBy(i) })).sort((a, b) => b.idleH - a.idleH),
  // Past --idle hours since the last move, not started: `noReason` is R4's count, `held` the rows with a reason.
  unstarted: { hours: idleH, count: past.filter((w) => !w.by).length, noReason: past.filter((w) => !w.by).map(({ by, ...w }) => w), held: past.filter((w) => w.by) }
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
  console.log(`approve by the session: ${a.pressed} pressed, ${a.madeForOwner} made for the owner${a.other.length ? `; ${a.other.length} with another key ${JSON.stringify(a.other)}` : ""}`);
  console.log("time in a state before the move out of it");
  for (const [s, t] of Object.entries(report.timeInState)) console.log(`  ${s.padEnd(18)} ${String(t.stays).padStart(3)} stays  median ${String(t.medianMin).padStart(6)} min  total ${String(t.totalH).padStart(5)} h  max ${t.maxH} h`);
  line("done", `${report.done.count}, median ${report.done.medianH} h from opened; ${report.done.firstPass} with no rework; ${report.done.quick} started without triage`);
  line("review", `${submits} submits, ${reworks} sent back; verdicts ${JSON.stringify(report.review.verdicts)}`);
  if (from) line("window", `${windowReport.events} events after ${from}: ${windowReport.submits} submits, ${windowReport.reworks} sent back; verdicts ${JSON.stringify(windowReport.verdicts)}; ${windowReport.timesAhead.length} of ${windowReport.withText} texts name a time ahead of their own stamp ${JSON.stringify(windowReport.timesAhead)}`);
  const marked = (t: Report["statementsOnly"]["all"]) => `${t.reviews} ${JSON.stringify(t.verdicts)}${t.round.summed + t.round.leftOut.length ? `, the rounds after ${t.round.summed} sent back: ${t.round.tokens} tokens${t.round.leftOut.length ? `, ${t.round.leftOut.length} more left out (no cost comment naming its event) ${JSON.stringify(t.round.leftOut)}` : ""}` : ""}`;
  const statements = (s: Report["statementsOnly"]) => `${marked(s.all)}; of them \`statements only, record\`: ${marked(s.record)}`;
  line("statements only", `reviews that begin with it: ${statements(report.statementsOnly)}`);
  if (from) console.log(`  after ${from}: ${statements(windowReport.statementsOnly)}`);
  line("needs-owner", `${report.needsOwner.ever} issues ever; now ${JSON.stringify(report.needsOwner.became)}; ${report.needsOwner.waitingNow} open with the label`);
  line("feedback", `${report.feedback.open} open, ${report.feedback.gathered} with a parent or a link`);
  const l: any = report.locks;
  if (l?.unread) line("locks", `not read: ${l.unread}`);
  else if (l) {
    line("locks", `${l.rows} holds in the history (the newest 500 are kept), ${l.held.length} held and ${l.ended.length} ended and not taken since, at ${stamp(l.now)}`);
    for (const [n, h] of Object.entries(l.names) as [string, any][]) console.log(`  ${n.padEnd(8)} ${String(h.released).padStart(3)} released${h.released ? `  median ${h.medianS} s  longest ${h.longestS} s by ${h.longest.who}, taken ${stamp(h.longest.taken)}` : ""}${h.expired + h.forced ? `; ${h.expired} expired and ${h.forced} forced, not measured` : ""}`);
    for (const h of l.held) console.log(`  held   ${h.name} by ${h.who} since ${stamp(h.taken)}, until ${stamp(h.until)}`);
    for (const h of l.ended) console.log(`  ended  ${h.name} by ${h.who} at ${stamp(h.until)}, taken ${stamp(h.taken)}; no row of the history yet`);
  }
  console.log(`open and idle for ${idleH} h or more`);
  for (const w of report.waiting) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.idleH).padStart(5)} h  ${w.labels.join(",")}  by ${w.opener}${w.held ? "  held" : ""}`);
  const u = report.unstarted;
  console.log(`past ${u.hours} h, not started, no reason: ${u.count}${u.held.length ? ` (${u.held.length} more are held)` : ""}`);
  for (const w of u.noReason) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.sinceMoveH).padStart(5)} h with no move`);
  return lines;
}
type Report = ReturnType<typeof report>;

if (import.meta.main) {
  const token = arg("token", ""), as = join(dirname(import.meta.path), "issue-as.sh");
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
  const r = report(events, { locks, since: Number(arg("after", "0")), from: Number(arg("window", "0")), until: Number(arg("until", "0")), idleH: Number(arg("idle", "4")) });
  console.log(process.argv.includes("--json") ? JSON.stringify(r) : text(r).join("\n"));
}
