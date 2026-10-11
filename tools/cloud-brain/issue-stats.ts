#!/usr/bin/env bun
// What the tracker's record says of the loop: where issues wait, which states hold them, how often work is sent back.
//   bun tools/cloud-brain/issue-stats.ts [--token issues-overseer-1] [--after SEQ] [--idle HOURS] [--json]
// Read from issue.sync with a token, through issue-as.sh (run it from the main checkout: a worktree has no tokens).
// --after counts only the issues opened after that event. Times are the events' own `at`.
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const arg = (n: string, d: string) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const token = arg("token", "issues-overseer-1"), since = Number(arg("after", "0")), idleH = Number(arg("idle", "4"));
const as = join(dirname(import.meta.path), "issue-as.sh");

const events: any[] = [];
for (let after = 0; ; ) {
  const out = execFileSync(as, [token, `sync?after=${after}&limit=500`], { encoding: "utf8" });
  const page = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1)).events || [];
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
const report = {
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
  line("needs-owner", `${report.needsOwner.ever} issues ever; now ${JSON.stringify(report.needsOwner.became)}; ${report.needsOwner.waitingNow} open with the label`);
  line("feedback", `${report.feedback.open} open, ${report.feedback.gathered} with a parent or a link`);
  console.log(`open and idle for ${idleH} h or more`);
  for (const w of report.waiting) console.log(`  ${w.id.padEnd(40)} ${w.kind.padEnd(8)} ${w.state.padEnd(17)} ${String(w.idleH).padStart(5)} h  ${w.labels.join(",")}  by ${w.opener}`);
}
