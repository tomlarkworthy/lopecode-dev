#!/usr/bin/env bun
// The counts of tools/cloud-brain/records/pm-read-after-three.md, made from the tracker's events.
//   bun tests/tools/pm-read-after-three.ts                          prints the lines from the kept fixture
//   bun tests/tools/pm-read-after-three.ts --fetch --token NAME [--until SEQ]
//                                                                   reads issue.sync from 4480 and writes the fixture again
// The fixture (tests/tools/fixtures/pm-read-after-three.json) keeps what the lines are counted from and no more:
// the moves and reviews of the three post mortems and their nine actions, each approver's verdict with the blob of
// the brief it names, each event of the label asks-orchestrator, and each comment of a writer that names a search.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const fixturePath = resolve(import.meta.dir, "fixtures/pm-read-after-three.json");
export const FIRST = 4480; // the open of the first post mortem

export const POST_MORTEMS: Record<string, string[]> = {
  "pm-second-summarizer-role": ["spec-names-what-exists-of-the-job", "decision-comment-names-what-is-added", "philosophy-one-role-for-one-job"],
  "pm-approver-leaves-everything": ["approver-brief-his-test", "approver-before-decision-comment", "approver-own-files-are-the-policy-cells"],
  "pm-agent-request-not-seen-fly-idle": ["asks-orchestrator-label-and-watch", "wait-says-what-runs-and-until-when", "watch-prints-an-outside-sessions-comment"],
};
// Issues whose writers were sent to a post mortem by their own body: the post mortems, their actions, the project and its tasks.
export const FAMILY = [
  ...Object.keys(POST_MORTEMS), ...Object.values(POST_MORTEMS).flat(),
  "post-mortems-declared-and-kept", "pm-1-file-and-search", "pm-2-brief-and-procedure", "pm-3-reviewer-brief", "pm-4-stats-block",
  "post-mortem-actions-prefer-guards", "pm-read-after-three",
];
// The blob of agents/approver.md that pm-approver-leaves-everything read, and the commit that changed its test.
export const BRIEF_EXAMINED = "9956b9aa";

const PM = new RegExp(Object.keys(POST_MORTEMS).join("|"), "g");
const SEARCH = /knowledge\.search|[Ss]earche[sd]|Prior art/;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const holder = (e: any) => (e.by && typeof e.by === "object" ? str(e.by.holder).replace(/^secret:/, "") : "");

export function reduce(events: any[], until: number) {
  const ids = new Set([...Object.keys(POST_MORTEMS), ...Object.values(POST_MORTEMS).flat()]);
  const issues: Record<string, { moves: any[]; reviews: any[] }> = {};
  const verdicts: any[] = [], labels: any[] = [], searches: any[] = [];
  for (const e of events) {
    if (e.seq > until) break;
    if (ids.has(e.id)) {
      const i = (issues[e.id] ??= { moves: [], reviews: [] });
      if (e.type === "moved") i.moves.push({ seq: e.seq, move: e.move, at: e.at });
      if (e.type === "reviewed") i.reviews.push({ seq: e.seq, verdict: e.verdict });
    }
    if (e.type === "commented" && /^approver\/.*\/verdict/.test(str(e.key))) {
      const body = str(e.body), briefs = [...body.matchAll(/brief ([0-9a-f]{8})/g)];
      verdicts.push({ seq: e.seq, id: e.id, verdict: body.split("\n")[0].replace(/^approver: /, ""), brief: briefs.length ? briefs[briefs.length - 1][1] : "none" });
    }
    if (e.type === "labelled" && JSON.stringify([e.add, e.remove]).includes("asks-orchestrator"))
      labels.push({ seq: e.seq, id: e.id, add: (e.add ?? []).includes("asks-orchestrator"), by: holder(e), at: e.at });
    if (e.type === "commented" && /^(impl|spec)-/.test(holder(e)) && SEARCH.test(str(e.body))) {
      // a test file named for a post mortem is no answer of a search
      const body = str(e.body), names = [...new Set(body.replace(/pm-[a-z-]+\.test\.ts/g, "").match(PM) ?? [])];
      const line = names.length ? body.split("\n").find((l) => SEARCH.test(l) && l.match(PM)) ?? body.split("\n").find((l) => l.match(PM)) ?? "" : "";
      searches.push({ seq: e.seq, id: e.id, by: holder(e), names, line: line.slice(0, 700) });
    }
  }
  return { from: FIRST, until, issues, verdicts, labels, searches };
}

export const load = () => JSON.parse(readFileSync(fixturePath, "utf8")) as ReturnType<typeof reduce>;

export function summary(f = load()) {
  const pms = Object.keys(POST_MORTEMS).map((id) => {
    const i = f.issues[id], submit = i.moves.find((m) => m.move === "submit"), pass = i.moves.find((m) => m.move === "pass");
    return { id, reviews: i.reviews.map((r) => `${r.verdict}@${r.seq}`), reworks: i.moves.filter((m) => m.move === "rework").length,
      minutes: Math.round((pass.at - submit.at) / 6000) / 10 };
  });
  const actions = Object.values(POST_MORTEMS).flat().map((id) => {
    const i = f.issues[id], last = i.moves[i.moves.length - 1];
    return { id, last: last.move, lastSeq: last.seq, reworks: i.moves.filter((m) => m.move === "rework").length,
      changes: i.reviews.filter((r) => r.verdict === "changes").map((r) => r.seq) };
  });
  const count = (vs: any[]) => ({ n: vs.length, approve: vs.filter((v) => v.verdict === "approve").length, leave: vs.filter((v) => v.verdict === "leave").length });
  const examined = f.verdicts.filter((v) => v.brief === BRIEF_EXAMINED), later = f.verdicts.filter((v) => v.brief !== BRIEF_EXAMINED);
  const blobs = [...new Set(f.verdicts.map((v) => v.brief))].map((b) => ({ brief: b, ...count(f.verdicts.filter((v) => v.brief === b)) }));
  const outside = f.searches.filter((s) => !FAMILY.includes(s.id));
  const named = outside.filter((s) => s.names.length);
  return {
    pms, actions, blobs, examined: count(examined), later: count(later),
    labels: f.labels,
    searchIssues: new Set(outside.map((s) => s.id)).size, namedIssues: new Set(named.map((s) => s.id)).size, named,
    namedBy: Object.fromEntries(Object.keys(POST_MORTEMS).map((id) => [id, named.filter((s) => s.names.includes(id)).map((s) => s.id)])),
  };
}

export function report(f = load()): string[] {
  const s = summary(f), done = s.actions.filter((a) => a.last === "pass" || a.last === "approve");
  return [
    `events ${f.from} to ${f.until}`,
    ...s.pms.map((p) => `${p.id}: reviews ${p.reviews.join(", ")}; rework moves ${p.reworks}; submit to pass ${p.minutes} min`),
    `actions: ${s.actions.length}, ${done.length} ended by a pass or an approve, ${s.actions.filter((a) => a.reworks).length} with a rework`,
    ...s.actions.map((a) => `  ${a.id}: last move ${a.last}@${a.lastSeq}${a.changes.length ? `, sent back at ${a.changes.join(", ")}` : ""}`),
    `approver verdicts that name brief ${BRIEF_EXAMINED}: ${s.examined.n}, ${s.examined.approve} approve, ${s.examined.leave} leave`,
    `approver verdicts that name a later brief: ${s.later.n}, ${s.later.approve} approve, ${s.later.leave} leave`,
    ...s.blobs.map((b) => `  brief ${b.brief}: ${b.n}, ${b.approve} approve, ${b.leave} leave`),
    `label asks-orchestrator: ${s.labels.filter((l) => l.add).length} put, on ${[...new Set(s.labels.map((l) => l.id))].join(", ")}`,
    ...s.labels.map((l) => `  ${l.id}: ${l.add ? "put" : "removed"}@${l.seq} by ${l.by}, ${new Date(l.at).toISOString()}`),
    `issues outside the family with a writer's comment that names a search: ${s.searchIssues}; of them name a post mortem: ${s.namedIssues}`,
    ...Object.entries(s.namedBy).map(([id, by]) => `  ${id}: ${by.length} (${by.join(", ") || "none"})`),
  ];
}

if (import.meta.main) {
  const arg = (n: string) => { const i = process.argv.indexOf(n); return i < 0 ? undefined : process.argv[i + 1]; };
  if (process.argv.includes("--fetch")) {
    const token = arg("--token");
    if (!token) { console.error("--fetch needs --token NAME, the caller's own"); process.exit(2); }
    const as = process.env.ISSUE_AS ?? resolve(import.meta.dir, "../../tools/cloud-brain/issue-as.sh");
    const events: any[] = [];
    for (let after = FIRST - 1; ; ) {
      const out = execFileSync(as, [token, `sync?after=${after}&limit=500`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const page = JSON.parse(out.slice(out.indexOf("{"))).events as any[];
      events.push(...page);
      if (page.length < 500) break;
      after = page[page.length - 1].seq;
    }
    const until = Number(arg("--until") ?? events[events.length - 1].seq);
    writeFileSync(fixturePath, JSON.stringify(reduce(events, until), null, 1) + "\n");
  }
  console.log(report().join("\n"));
}
