#!/usr/bin/env bun
// What the tracker's record says of the loop: where issues wait, which states hold them, how often work is sent back.
//   bun tools/cloud-brain/issue-stats.ts [--token issues-overseer-1] [--after SEQ] [--window SEQ] [--idle HOURS] [--json]
// Read from issue.sync with a token, through issue-as.sh (run it from the main checkout: a worktree has no tokens).
// --after counts only the issues opened after that event. Times are the events' own `at`.
// --window counts the events after that one, whatever issue they are of: what an oversight judges its last edits by.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

// --name=value or --name value.
const arg = (n: string, d: string) => {
  const at = process.argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  return at < 0 ? d : process.argv[at].includes("=") ? process.argv[at].split("=")[1] : process.argv[at + 1] ?? d;
};
const token = arg("token", "issues-overseer-1"), since = Number(arg("after", "0")), idleH = Number(arg("idle", "4"));
const as = join(dirname(import.meta.path), "issue-as.sh");

const events: any[] = [];
for (let after = 0; ; ) {
  const out = execFileSync(as, [token, `sync?after=${after}&limit=500`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const page = JSON.parse(out).events || [];
  events.push(...page);
  if (page.length < 500) break;
  after = page.at(-1).seq;
}

const who = (by: any) => ((by?.holder || "").startsWith("secret:") ? by.holder.slice(7) : by?.caller === "owner" ? (by.tab === false ? "owner (token)" : "owner") : by?.caller || "?");
const workflows: Record<string, any> = {}, issues: Record<string, any> = {};
for (const e of events) {
  if (e.type === "policy") for (const [n, h] of Object.entries(e.hashes)) workflows[h as string] = e.policy.workflows[n];
  if (!e.id || e.hidden || e.type === "policy") continue;
  if (e.type === "opened") issues[e.id] = { id: e.id, kind: e.kind, opener: who(e.by), workflow: e.workflow, state: e.state, at: e.at, since: e.at, seq: e.seq, labels: new Set(e.labels || []), stays: [], moves: [], verdicts: [], asked: false, parent: e.parent, links: 0 };
  const i = issues[e.id];
  if (!i) continue;
  i.last = e.at;
  if (e.type === "moved" || e.type === "swapped") {
    const to = e.type === "moved" ? e.to : e.to.state;
    i.stays.push([i.state, e.at - i.since]);
    i.moves.push(e.move || e.swap || "swap");
    Object.assign(i, { state: to, since: e.at }, e.type === "swapped" ? { workflow: e.to.workflow } : {});
  }
  if (e.type === "reviewed") i.verdicts.push(e.verdict);
  if (e.type === "labelled") {
    for (const l of e.add || []) i.labels.add(l);
    for (const l of e.remove || []) i.labels.delete(l);
    if ((e.add || []).includes("needs-owner")) i.asked = true;
  }
  if (e.type === "linked") e.rel === "part-of" ? (i.parent = e.remove ? null : e.to) : (i.links += e.remove ? -1 : 1);
}

const now = Date.now(), H = (ms: number) => +(ms / 3600000).toFixed(1);
const all = Object.values(issues).filter((i: any) => i.seq > since && !/^test-/.test(i.id)) as any[];
const closed = (i: any) => (workflows[i.workflow]?.closed || []).includes(i.state);
const median = (l: number[]) => (l.length ? [...l].sort((a, b) => a - b)[l.length >> 1] : 0);
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
const from = Number(arg("window", "0")), inWindow = events.filter((e) => e.seq > from && !e.hidden && !/^test-/.test(e.id || ""));
const moved = (m: string) => inWindow.filter((e) => e.type === "moved" && e.move === m).length;
const windowReport = {
  after: from, events: inWindow.length, submits: moved("submit") + moved("submit-spec"), reworks: moved("rework") + moved("send-back"),
  verdicts: count(inWindow.filter((e) => e.type === "reviewed").map((e) => e.verdict)),
  withText: inWindow.filter((e) => `${e.reason || ""}${e.body || ""}`.trim()).length, timesAhead: inWindow.filter(ahead).map((e) => e.seq)
};
const report = {
  window: windowReport,
  events: events.length,
  issues: all.length,
  states: count(all.map((i) => i.state)),
  kinds: count(all.map((i) => i.kind)),
  openers: count(all.map((i) => i.opener)),
  // Time spent in a state before the move out of it. An issue still in a state is under `waiting`.
  timeInState: Object.fromEntries(Object.entries(perState).map(([s, l]) => [s, { stays: l.length, medianMin: +(median(l) / 60000).toFixed(1), totalH: H(l.reduce((a, b) => a + b, 0)), maxH: H(Math.max(...l)) }])),
  done: { count: done.length, medianH: H(median(done.map((i) => i.since - i.at))), firstPass: done.filter((i) => !i.moves.includes("rework")).length, quick: done.filter((i) => !i.moves.includes("ready")).length },
  review: { submits, reworks, verdicts: count(all.flatMap((i) => i.verdicts)) },
  needsOwner: { ever: asked.length, became: count(asked.map((i) => i.state)), waitingNow: open.filter((i) => i.labels.has("needs-owner")).length },
  feedback: { open: open.filter((i) => i.kind === "feedback").length, gathered: all.filter((i) => i.kind === "feedback" && (i.parent || i.links > 0)).length },
  // Not closed, and nothing has happened to it for --idle hours: the candidates for a trap.
  waiting: open.filter((i) => now - i.last > idleH * 3600000).map((i) => ({ id: i.id, kind: i.kind, state: i.state, idleH: H(now - i.last), labels: [...i.labels], opener: i.opener })).sort((a, b) => b.idleH - a.idleH)
};

if (process.argv.includes("--json")) console.log(JSON.stringify(report));
else {
  const line = (k: string, v: any) => console.log(k.padEnd(14), typeof v === "string" ? v : JSON.stringify(v));
  line("record", `${report.events} events, ${report.issues} issues${since ? " opened after event " + since : ""}`);
  for (const k of ["states", "kinds", "openers"]) line(k, (report as any)[k]);
  console.log("time in a state before the move out of it");
  for (const [s, t] of Object.entries(report.timeInState)) console.log(`  ${s.padEnd(18)} ${String(t.stays).padStart(3)} stays  median ${String(t.medianMin).padStart(6)} min  total ${String(t.totalH).padStart(5)} h  max ${t.maxH} h`);
  line("done", `${report.done.count}, median ${report.done.medianH} h from opened; ${report.done.firstPass} with no rework; ${report.done.quick} started without triage`);
  line("review", `${submits} submits, ${reworks} sent back; verdicts ${JSON.stringify(report.review.verdicts)}`);
  if (from) line("window", `${windowReport.events} events after ${from}: ${windowReport.submits} submits, ${windowReport.reworks} sent back; verdicts ${JSON.stringify(windowReport.verdicts)}; ${windowReport.timesAhead.length} of ${windowReport.withText} texts name a time ahead of their own stamp ${JSON.stringify(windowReport.timesAhead)}`);
  line("needs-owner", `${report.needsOwner.ever} issues ever; now ${JSON.stringify(report.needsOwner.became)}; ${report.needsOwner.waitingNow} open with the label`);
  line("feedback", `${report.feedback.open} open, ${report.feedback.gathered} with a parent or a link`);
  console.log(`open and idle for ${idleH} h or more`);
  for (const w of report.waiting) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.idleH).padStart(5)} h  ${w.labels.join(",")}  by ${w.opener}`);
}
