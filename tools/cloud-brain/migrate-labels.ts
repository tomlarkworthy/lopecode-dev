#!/usr/bin/env bun
// The labels of plan/cloud-brain-agentic-redesign.md §5, put on each open issue that the install of
// plan/cloud-brain-issues-policy-v10.json swapped onto its task workflow. issue.install's `migrate` maps a state to a
// state and puts no label (brain-x-issues, issue.install), so this is run once after the install.
//
//   bun tools/cloud-brain/migrate-labels.ts --token <name> --install <seq> [--write]
//
// <name>     A tracker token issue-as.sh keeps (brain.ts agent-token out "…"); it is read by issue-as.sh and never printed.
// <seq>      The seq the install answered. An issue is migrated when its events have the swap keyed policy/<seq>/<id>;
//            the state it was in is that swap's `from.state`.
// --write    Sends what the dry run prints. Without it nothing is written.
//
// One line of JSON an issue: { id, from, add, remove, why }. A write is one labelled event keyed migrate/<id>/flow,
// and for an issue that was stopped a comment before it, keyed migrate/<id>/flow-why, quoting the reason of the move
// that stopped it; the label is sent only when that comment answered 200. `remove` names only labels the issue carries (issue.label refuses any other with 409).
// Exit 0: done, or a dry run. 1: a write was refused (the rest are still tried). 2: the arguments, or a read failed.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const AS = resolve(import.meta.dir, "issue-as.sh");
export const GONE = ["run-stopped", "stranded", "laptop"];

// §5's table, but in-review and awaiting-approval go back to the worker: v10's review guard compares the reviewer with
// by["+worker-processing"] and finish wants a pass after +needs-reviewer, which no migrated issue has.
export function labelsFor(from: string, labels: string[]): { add: string[]; remove: string[]; why: string } {
  const has = (l: string) => labels.includes(l);
  // laptop is retired (plan §3.1): it meant the owner's hands, which needs-owner is, whatever the state.
  const want = has("laptop") ? ["needs-owner"]
    : ["open", "triaged", "ready"].includes(from)
    ? has("needs-owner") ? [] : ["needs-worker"]
    : from === "awaiting-approval" ? ["needs-worker", "major"]
    : ["in-progress", "in-review", "stopped"].includes(from) ? ["needs-worker"]
    : [];
  const why = ["in-review", "awaiting-approval"].includes(from) ? `${from}: the worker hands it over again, so review and finish have a worker and a hand-over to read` : `from ${from}`;
  return { add: want.filter((l) => !has(l)), remove: GONE.filter(has), why };
}

const call = (token: string, method: string, body?: unknown): { status: number; data: any } => {
  const r = spawnSync(AS, [token, method, ...(body === undefined ? [] : [JSON.stringify(body)])], { encoding: "utf8" });
  const status = Number(/\[(\d{3})\]/.exec(r.stderr || "")?.[1] ?? 0);
  try { return { status, data: JSON.parse(r.stdout) }; } catch { return { status, data: null }; }
};

if (import.meta.main) {
  const argv = process.argv.slice(2), arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const token = arg("--token"), install = Number(arg("--install")), write = argv.includes("--write");
  if (!token || !Number.isSafeInteger(install) || install < 1) { console.error("usage: bun tools/cloud-brain/migrate-labels.ts --token <name> --install <seq> [--write]"); process.exit(2); }
  const policy = call(token, "policy"), task = policy.data?.policy?.names?.task;
  const list = call(token, "list?state=open&limit=500");
  if (policy.status !== 200 || list.status !== 200 || !task) { console.error(`migrate-labels.ts: issue.policy ${policy.status}, issue.list ${list.status}`); process.exit(2); }
  if (list.data.more) { console.error("migrate-labels.ts: issue.list answered more than 500 open issues"); process.exit(2); }
  let refused = 0;
  for (const row of list.data.issues.filter((i: any) => i.workflow === task)) {
    const got = call(token, "get?id=" + encodeURIComponent(row.id));
    if (got.status !== 200) { console.error(`migrate-labels.ts: issue.get ${row.id} ${got.status}`); process.exit(2); }
    const events = got.data.events || [], swap = events.find((e: any) => e.type === "swapped" && e.key === `policy/${install}/${row.id}`);
    if (!swap) { console.log(JSON.stringify({ id: row.id, skipped: `no swap of install ${install}` })); continue; }
    const plan = labelsFor(swap.from.state, got.data.issue.labels || []);
    const stop = swap.from.state === "stopped" ? events.filter((e: any) => e.type === "moved" && e.to === swap.from.state).at(-1) : null;
    console.log(JSON.stringify({ id: row.id, from: swap.from.state, ...plan, ...(stop ? { stopped: stop.reason } : {}) }));
    if (!write || (!plan.add.length && !plan.remove.length)) continue;
    // The label only after the comment is written: a stopped issue is not handed back without its reason. The quoted
    // reason names past times, so issue-as.sh's time check (ISSUE_AS_TIME_AHEAD) is not passed over.
    const said = stop ? call(token, "comment", { key: `migrate/${row.id}/flow-why`, id: row.id, body: `Moved to open by policy ${install}, from ${swap.from.state}. Its reason then (event ${stop.seq}): ${stop.reason}` }) : { status: 200 };
    if (said.status !== 200) { refused++; console.error(`migrate-labels.ts: ${row.id}: comment ${said.status}, no label sent`); continue; }
    const put = call(token, "label", { key: `migrate/${row.id}/flow`, id: row.id, add: plan.add, remove: plan.remove });
    if (put.status !== 200) { refused++; console.error(`migrate-labels.ts: ${row.id}: label ${put.status} ${JSON.stringify(put.data)}`); }
  }
  process.exit(refused ? 1 : 0);
}
