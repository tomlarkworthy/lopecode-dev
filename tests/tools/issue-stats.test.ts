// issue-stats.ts: openers counted by the role of the token that opened, and the approve moves of the owner's
// session counted by their key. Issue ta-2-stats-by-prefix, R3 and R5 of plan/cloud-brain-record-names-token-not-agent.md.
//
//   bun test ./tests/tools/issue-stats.test.ts
//   ISSUE_STATS_TS=/path/to/another/issue-stats.ts bun test …
// No call leaves the machine: the events are the list below.
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const tool = process.env.ISSUE_STATS_TS || resolve(import.meta.dir, "../../tools/cloud-brain/issue-stats.ts");
const { report, role, text } = await import(tool);

const token = (name: string) => ({ caller: "owner", via: "delegation:b6559fa96c36", holder: `secret:${name}`, tab: false });
const session = { caller: "owner", via: "session", holder: "", tab: true };
let seq = 0;
const opened = (id: string, by: any, more: any = {}) => ({ seq: ++seq, key: `k${seq}`, type: "opened", id, kind: "bug", state: "open", labels: [], by, at: 1000 * seq, ...more });
const approve = (id: string, key: string, by: any = session, more: any = {}) => ({ seq: ++seq, key, type: "moved", id, move: "approve", from: "awaiting-approval", to: "approved", by, at: 1000 * seq, ...more });

const events = [
  opened("a", token("impl-3fa2c1")),
  opened("b", token("impl-3fa2c1")),
  opened("c", token("impl-90b7d2")),
  opened("d", token("rev-51aa0e")),
  opened("e", token("over-0000ff")),
  opened("f", token("orch-7c1e04")),
  opened("g", token("out-e4410b")),
  opened("h", token("issues-implementer-2")),
  opened("i", token("issues-implementer-2")),
  opened("j", token("issues-overseer-1")),
  opened("k", token("claude-mv2fpk63-c9a3")),
  opened("l", session),
  opened("m", { caller: "owner", via: "", holder: "", tab: false }),
  opened("test-n", token("impl-3fa2c1")),
  // The shape of the two keys on cb4: event 26, and event 577.
  approve("a", "b70df59c-a451-4541-b551-20e991515797"),
  approve("b", "93c56898-c968-435a-b7f0-c5e8896067db"),
  approve("c", "orch/verification-runs-are-not-kept/approve-for-owner-1"),
  approve("d", "orch/d/approve-for-owner-12"),
  approve("e", "orch/e/approve-for-owner-1"),
  approve("f", "tests/f/approve"),
  approve("g", "orch/g/approve-for-owner-1", token("orch-7c1e04")),
  approve("test-n", "orch/test-n/approve-for-owner-1"),
  approve("h", "da1fb7b8-0b55-476a-a433-edb96f799f07", session, { hidden: true }),
  { seq: ++seq, key: "8fafa15d-d0a7-4276-b9a8-5fbac11916cd", type: "moved", id: "i", move: "close", from: "open", to: "closed", by: session, at: 1000 * seq }
];

test("a name of the shape <role>-<6 hex> has that role; any other name is its own", () => {
  expect(["impl-3fa2c1", "rev-90b7d2", "spec-51aa0e", "over-0000ff", "dig-abcdef", "orch-7c1e04", "out-e4410b"].map(role)).toEqual(["impl", "rev", "spec", "over", "dig", "orch", "out"]);
  for (const name of ["issues-implementer-2", "issues-overseer-1", "claude-mv2fpk63-c9a3", "owner", "owner (token)", "impl-3fa2c", "impl-3fa2c1x", "impl-3FA2C1", "implement-3fa2c1", "loop-agents"]) expect(role(name)).toBe(name);
});

test("openers counts by the role, with the names under each (R3)", () => {
  const r = report(events, { now: 1e6 });
  expect(r.openers).toEqual({
    impl: { count: 3, names: { "impl-3fa2c1": 2, "impl-90b7d2": 1 } },
    rev: { count: 1, names: { "rev-51aa0e": 1 } },
    over: { count: 1, names: { "over-0000ff": 1 } },
    orch: { count: 1, names: { "orch-7c1e04": 1 } },
    out: { count: 1, names: { "out-e4410b": 1 } },
    "issues-implementer-2": { count: 2, names: { "issues-implementer-2": 2 } },
    "issues-overseer-1": { count: 1, names: { "issues-overseer-1": 1 } },
    "claude-mv2fpk63-c9a3": { count: 1, names: { "claude-mv2fpk63-c9a3": 1 } },
    owner: { count: 1, names: { owner: 1 } },
    "owner (token)": { count: 1, names: { "owner (token)": 1 } }
  });
  expect(r.issues).toBe(13);
});

test("--after counts the openers of the issues opened after that event", () => {
  expect(report(events, { now: 1e6, since: 10 }).openers).toEqual({
    "claude-mv2fpk63-c9a3": { count: 1, names: { "claude-mv2fpk63-c9a3": 1 } },
    owner: { count: 1, names: { owner: 1 } },
    "owner (token)": { count: 1, names: { "owner (token)": 1 } }
  });
});

test("approve moves of the session are counted by key: pressed, made for the owner, and neither (R5)", () => {
  const r = report(events, { now: 1e6 });
  expect(r.approveBySession).toEqual({ pressed: 2, madeForOwner: 3, other: [20] });
});

test("the count of approvals is of the whole record up to --until, whatever --after is", () => {
  expect(report(events, { now: 1e6, since: 10 }).approveBySession).toEqual({ pressed: 2, madeForOwner: 3, other: [20] });
  const r = report(events, { now: 1e6, until: 17 });
  expect(r.approveBySession).toEqual({ pressed: 2, madeForOwner: 1, other: [] });
  expect(r.events).toBe(17);
});

test("the lines printed: a role with its names under it, and the approve line", () => {
  const lines = text(report(events, { now: 1e6 }), {});
  const at = lines.findIndex((l: string) => /^openers\b/.test(l));
  expect(lines.slice(at + 1, at + 3)).toEqual(["  impl                       3  impl-3fa2c1 2, impl-90b7d2 1", "  rev                        1  rev-51aa0e 1"]);
  expect(lines).toContain("  issues-implementer-2       2");
  expect(lines).toContain("approve by the session: 2 pressed, 3 made for the owner; 1 with another key [20]");
  const none = text(report(events, { now: 1e6, until: 17 }), {});
  expect(none).toContain("approve by the session: 2 pressed, 1 made for the owner");
});

// lk-5-stats-print-the-holds, R8 of plan/cloud-brain-locks-held-in-the-cluster.md.
// What cb4 answered to `issue-as.sh issues-implementer-2 "locks?history=50"` on 2026-10-11, whole: the probes of lk-1.
const cb4 = {"now":1791742303562,"locks":[],"ended":[],"history":[{"name":"probe-lk-1-issue-lock-methods","who":"c","n":4,"taken":1791741499513,"ended":1791741499867,"how":"released"},{"name":"probe-lk-1-issue-lock-methods","who":"b","n":3,"taken":1791741498287,"ended":1791741498938,"how":"released"},{"name":"probe-lk-1-issue-lock-methods","who":"a","n":2,"taken":1791741491641,"ended":1791741496641,"how":"expired"},{"name":"probe-lk-1-issue-lock-methods-20","who":"w5","n":1,"taken":1791741490601,"ended":1791741491307,"how":"released"},{"name":"probe-lk-1-issue-lock-methods","who":"a","n":1,"taken":1791741487993,"ended":1791741489963,"how":"released"}]};
// The nine holds of the spec ("How long a lock is held"), in seconds, as rows of `land` a minute apart, the last written
// first as the tracker answers. Beside them: a lease that ran out, a forced end, two holds of `cb4`, a lock held now and
// one that ended and was not taken since.
const T = Date.UTC(2026, 9, 12, 8, 0, 0);
const nine = [7, 14, 2, 11, 92, 120, 138, 199, 203];
const made = {
  now: T + 3600000,
  locks: [{ name: "cb4", who: "w-held", n: 4, taken: T + 3500000, until: T + 4100000 }],
  ended: [{ name: "land", who: "w-died", n: 12, taken: T + 2400000, until: T + 3000000 }],
  history: [
    { name: "cb4", who: "w-forced", n: 3, taken: T + 2000000, ended: T + 2900000, how: "forced" },
    { name: "land", who: "w-expired", n: 11, taken: T + 1000000, ended: T + 1600000, how: "expired" },
    { name: "cb4", who: "w-b", n: 2, taken: T + 700000, ended: T + 755000, how: "released" },
    { name: "cb4", who: "w-a", n: 1, taken: T + 600000, ended: T + 620500, how: "released" },
    ...nine.map((s, k) => ({ name: "land", who: `w${k + 1}`, n: k + 1, taken: T + 60000 * k, ended: T + 60000 * k + 1000 * s, how: "released" })).reverse()
  ]
};
const { holds } = await import(tool);
// A time as the tool prints it, in this machine's zone.
const local = (ms: number) => { const d = new Date(ms), p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const lockLines = (lines: string[]) => { const at = lines.findIndex((l) => /^locks\b/.test(l)), end = lines.findIndex((l) => /^open and idle/.test(l)); return at < 0 ? [] : lines.slice(at, end); };

test("the holds are counted by name; the median and the longest are of the released rows (R8)", () => {
  const h = holds(made);
  expect(h.rows).toBe(13);
  expect(h.names.land).toEqual({ rows: 10, released: 9, medianS: 92, longestS: 203, longest: { who: "w9", taken: T + 480000 }, expired: 1, forced: 0 });
  expect(h.names.cb4).toEqual({ rows: 3, released: 2, medianS: 55, longestS: 55, longest: { who: "w-b", taken: T + 700000 }, expired: 0, forced: 1 });
  expect(Object.keys(h.names)).toEqual(["land", "cb4"]);
  expect(h.held).toEqual(made.locks);
  expect(h.ended).toEqual(made.ended);
  // The lease that ran out was 600 s and the forced end 900 s after its take: neither is the longest.
  expect(h.names.land.longestS).toBeLessThan(600);
});

test("what cb4 answered on 2026-10-11: land and cb4 have no row, each probe's name has its own", () => {
  const h = holds(cb4);
  expect(h.names).toEqual({
    land: { rows: 0, released: 0, medianS: 0, longestS: 0, longest: null, expired: 0, forced: 0 },
    cb4: { rows: 0, released: 0, medianS: 0, longestS: 0, longest: null, expired: 0, forced: 0 },
    "probe-lk-1-issue-lock-methods": { rows: 4, released: 3, medianS: 0.7, longestS: 2, longest: { who: "a", taken: 1791741487993 }, expired: 1, forced: 0 },
    "probe-lk-1-issue-lock-methods-20": { rows: 1, released: 1, medianS: 0.7, longestS: 0.7, longest: { who: "w5", taken: 1791741490601 }, expired: 0, forced: 0 }
  });
  expect(lockLines(text(report(events, { now: 1e6, locks: cb4 })))).toEqual([
    `locks          5 holds in the history (the newest 500 are kept), 0 held and 0 ended and not taken since, at ${local(1791742303562)}`,
    "  land       0 released",
    "  cb4        0 released",
    `  probe-lk-1-issue-lock-methods   3 released  median 0.7 s  longest 2 s by a, taken ${local(1791741487993)}; 1 expired and 0 forced, not measured`,
    `  probe-lk-1-issue-lock-methods-20   1 released  median 0.7 s  longest 0.7 s by w5, taken ${local(1791741490601)}`
  ]);
});

test("the lines printed: a line for each name, for each lock held, and for each that ended with no row yet", () => {
  expect(lockLines(text(report(events, { now: 1e6, locks: made })))).toEqual([
    `locks          13 holds in the history (the newest 500 are kept), 1 held and 1 ended and not taken since, at ${local(T + 3600000)}`,
    `  land       9 released  median 92 s  longest 203 s by w9, taken ${local(T + 480000)}; 1 expired and 0 forced, not measured`,
    `  cb4        2 released  median 55 s  longest 55 s by w-b, taken ${local(T + 700000)}; 0 expired and 1 forced, not measured`,
    `  held   cb4 by w-held since ${local(T + 3500000)}, until ${local(T + 4100000)}`,
    `  ended  land by w-died at ${local(T + 3000000)}, taken ${local(T + 2400000)}; no row of the history yet`
  ]);
});

test("a name that is only held or only ended, with no row of the history, is named", () => {
  const h = holds({ now: T, locks: [{ name: "probe-x", who: "a", n: 1, taken: T - 1000, until: T + 1000 }], ended: [{ name: "probe-y", who: "b", n: 1, taken: T - 9000, until: T - 1 }], history: [] });
  expect(Object.keys(h.names)).toEqual(["land", "cb4", "probe-x", "probe-y"]);
});

test("an answer with no history is said and not counted; with no answer given the report has no locks", () => {
  expect(holds({ error: "MethodNotImplemented", message: "no method issue.locks" })).toEqual({ unread: "no method issue.locks" });
  expect(holds(undefined)).toEqual({ unread: "no answer" });
  expect(lockLines(text(report(events, { now: 1e6, locks: { error: "Gone" } })))).toEqual(["locks          not read: Gone"]);
  const r = report(events, { now: 1e6 });
  expect(r.locks).toBeUndefined();
  expect(lockLines(text(r))).toEqual([]);
  expect("locks" in JSON.parse(JSON.stringify(report(events, { now: 1e6, locks: cb4 })))).toBe(true);
});

// rc-3-record-only-count, R3 of plan/cloud-brain-record-checked-by-review-alone.md: the reviews that begin
// `statements only`, and what the round after a sent-back one cost. The runs are `cost` events (issue.cost) since
// cm-5-the-loop-writes-the-event: the nine cb4 has for these two issues, at the seqs it has them (3015 to 3018 of
// redistil-apply-leaves-seen-json, 3046 to 3050 of verification-runs-are-not-kept; read 2026-10-12 with
// `runs?id=`), without their `agent`, `session` and `usage`, which the tool does not read. `of` is the comment each
// was first written as. The reviews are 452 and 534 with the mark put before a body of this file's own: no review on
// cb4 carried the mark when this was written.
const rev = { caller: "owner", via: "delegation:84cd2100b161", holder: "secret:issues-reviewer-2", tab: false };
const reviewed = (seq: number, id: string, verdict: string, body: string) => ({ seq, key: `rev/${id}/${seq}`, type: "reviewed", id, verdict, body, refs: [], by: rev, at: 1000 * seq });
const cost = (seq: number, id: string, run: any, more: any = {}) => ({ seq, key: `cost/${id}/${run.role}/${run.round}`, type: "cost", id, how: "fresh", ...run, backfilled: true, by: token("impl-b645a6"), at: 1000 * seq, ...more });
// A run as the loop wrote it before: a comment. The tool reads none.
const comment = (seq: number, id: string, body: string) => ({ seq, key: `cost-${seq}`, type: "commented", id, body, by: token("issues-implementer-2"), at: 1000 * seq });
const r534 = [
  opened("verification-runs-are-not-kept", token("issues-overseer-1"), { seq: 412 }),
  reviewed(534, "verification-runs-are-not-kept", "changes", "statements only\nFinding 1. Two sentences of the served reference."),
  reviewed(562, "verification-runs-are-not-kept", "pass", "pass. Nothing found."),
  cost(3046, "verification-runs-are-not-kept", { role: "implementer", round: 1, outcome: "stopped", seconds: 364, context: 117836, tools: 16, of: 835 }),
  cost(3047, "verification-runs-are-not-kept", { role: "implementer", round: 2, outcome: "in-review", seconds: 1030, context: 175360, tools: 46, event: 482, of: 836 }),
  cost(3048, "verification-runs-are-not-kept", { role: "reviewer", round: 1, outcome: "changes", seconds: 402, context: 145267, tools: 27, event: 534, of: 837 }),
  cost(3049, "verification-runs-are-not-kept", { role: "implementer", round: 3, outcome: "in-review", seconds: 723, context: 177525, tools: 37, event: 549, of: 838 }),
  cost(3050, "verification-runs-are-not-kept", { role: "reviewer", round: 2, outcome: "pass", seconds: 376, context: 132823, tools: 26, event: 562, of: 839 })
];
const r452 = [
  opened("redistil-apply-leaves-seen-json", token("issues-overseer-1"), { seq: 411 }),
  reviewed(452, "redistil-apply-leaves-seen-json", "changes", "statements only\nFinding 1. The record names the wrong failing test."),
  cost(3015, "redistil-apply-leaves-seen-json", { role: "implementer", round: 1, outcome: "in-review", seconds: 367, context: 119966, tools: 21, event: 449, of: 804 }),
  cost(3016, "redistil-apply-leaves-seen-json", { role: "reviewer", round: 1, outcome: "changes", seconds: 299, context: 109954, tools: 19, event: 452, of: 805 }),
  cost(3017, "redistil-apply-leaves-seen-json", { role: "implementer", round: 2, outcome: "in-review", seconds: 218, context: 103508, tools: 16, event: 462, of: 806 }),
  cost(3018, "redistil-apply-leaves-seen-json", { role: "reviewer", round: 2, outcome: "pass", seconds: 95, context: 77183, tools: 7, of: 807 })
];
const others = [
  opened("p", token("issues-overseer-1"), { seq: 2000 }),
  reviewed(2001, "p", "pass", "statements only\nNote 1. The record says bytes where wc -m counts characters."),
  reviewed(2002, "p", "pass", "  statements only, record. Note 1. One count of the record is off by one."),
  // In the issue's own record and sent back, with no cost event after it yet.
  reviewed(2003, "p", "changes", "statements only, record\nFinding 1. The record gives no test count."),
  // Not marked: the words are not the first of the body, or go on as another word.
  reviewed(2004, "p", "changes", "Verdict: changes.\nstatements only"),
  reviewed(2005, "p", "pass", "statements only-ish, and a test to change"),
  reviewed(2006, "p", "pass", "Statements only"),
  reviewed(2007, "test-q", "pass", "statements only")
].sort((a, b) => a.seq - b.seq);
const marked = [...r452, ...r534, ...others].sort((a, b) => a.seq - b.seq);
const statementsLine = (lines: string[]) => lines.filter((l) => /^statements only\b/.test(l) || /^  after \d+: /.test(l));

test("review 534, marked, with its five cost events: the round after it is 310,348 (R3)", () => {
  const s = report(r534, { now: 1e7 }).statementsOnly;
  expect(s.all).toEqual({ reviews: 1, verdicts: { changes: 1 }, round: { summed: 1, tokens: 310348, leftOut: [] } });
  expect(177525 + 132823).toBe(310348);
  expect(s.record).toEqual({ reviews: 0, verdicts: {}, round: { summed: 0, tokens: 0, leftOut: [] } });
  expect(statementsLine(text(report(r534, { now: 1e7 })))).toEqual(['statements only reviews that begin with it: 1 {"changes":1}, the rounds after 1 sent back: 310348 tokens; of them `statements only, record`: 0 {}']);
});

test("review 452, marked: counted, and left out of the sum, since its reviewer's cost event names no event", () => {
  const s = report(r452, { now: 1e7 }).statementsOnly;
  expect(s.all).toEqual({ reviews: 1, verdicts: { changes: 1 }, round: { summed: 0, tokens: 0, leftOut: [452] } });
  expect(statementsLine(text(report(r452, { now: 1e7 })))).toEqual(['statements only reviews that begin with it: 1 {"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost event naming its event) [452]; of them `statements only, record`: 0 {}']);
});

test("a marked pass is counted and has no round after it; `statements only, record` is counted under both", () => {
  const s = report(marked, { now: 1e7 }).statementsOnly;
  expect(s.all).toEqual({ reviews: 5, verdicts: { changes: 3, pass: 2 }, round: { summed: 1, tokens: 310348, leftOut: [452, 2003] } });
  expect(s.record).toEqual({ reviews: 2, verdicts: { pass: 1, changes: 1 }, round: { summed: 0, tokens: 0, leftOut: [2003] } });
  expect(report(others, { now: 1e7 }).statementsOnly.all.verdicts).toEqual({ pass: 2, changes: 1 });
});

test("with no marked review the line reads 0", () => {
  expect(statementsLine(text(report(events, { now: 1e6 })))).toEqual(["statements only reviews that begin with it: 0 {}; of them `statements only, record`: 0 {}"]);
});

test("--window counts the marked reviews after that event, with a line of its own; --until cuts the cost events too", () => {
  const w = report(marked, { now: 1e7, from: 500 });
  expect(w.window.statementsOnly.all).toEqual({ reviews: 4, verdicts: { changes: 2, pass: 2 }, round: { summed: 1, tokens: 310348, leftOut: [2003] } });
  expect(statementsLine(text(w))).toEqual([
    'statements only reviews that begin with it: 5 {"changes":3,"pass":2}, the rounds after 1 sent back: 310348 tokens, 2 more left out (no cost event naming its event) [452,2003]; of them `statements only, record`: 2 {"pass":1,"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost event naming its event) [2003]',
    '  after 500: 4 {"changes":2,"pass":2}, the rounds after 1 sent back: 310348 tokens, 1 more left out (no cost event naming its event) [2003]; of them `statements only, record`: 2 {"pass":1,"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost event naming its event) [2003]'
  ]);
  // At event 3049 the reviewer's cost event of the round after 534 was not written yet.
  expect(report(marked, { now: 1e7, until: 3049 }).statementsOnly.all).toEqual({ reviews: 5, verdicts: { changes: 3, pass: 2 }, round: { summed: 0, tokens: 0, leftOut: [452, 534, 2003] } });
  expect(report(marked, { now: 1e7, until: 3050 }).statementsOnly.all.round).toEqual({ summed: 1, tokens: 310348, leftOut: [452, 2003] });
});

// cm-5-the-loop-writes-the-event, R7 of plan/cloud-brain-run-cost-is-part-of-the-issue-model.md.
test("a run is read from its cost event and from no comment", () => {
  const asComments = [
    ...r534.filter((e) => e.type !== "cost"),
    comment(838, "verification-runs-are-not-kept", 'cost {"role":"implementer","round":3,"tokens":177525,"seconds":723,"tools":37,"outcome":"in-review","event":549,"backfilled":true}'),
    comment(839, "verification-runs-are-not-kept", 'cost {"role":"reviewer","round":2,"tokens":132823,"seconds":376,"tools":26,"outcome":"pass","event":562,"backfilled":true}')
  ];
  expect(report(asComments, { now: 1e7 }).statementsOnly.all.round).toEqual({ summed: 0, tokens: 0, leftOut: [534] });
  // Beside the events, a comment adds nothing, and one that does not parse is no error.
  expect(report([...r534, ...asComments.slice(-2), comment(840, "verification-runs-are-not-kept", "cost {not json")], { now: 1e7 }).statementsOnly.all.round).toEqual({ summed: 1, tokens: 310348, leftOut: [] });
});

test("of two cost events of one issue, role and round the later is the one in force", () => {
  // The reviewer's run of round 2 written again with another figure, as a correction is (issue.cost, `replaced`).
  const again = cost(3400, "verification-runs-are-not-kept", { role: "reviewer", round: 2, outcome: "pass", seconds: 376, context: 100000, event: 562 }, { key: "cost/verification-runs-are-not-kept/reviewer/2/2", replaced: 3050 });
  expect(report([...r534, again], { now: 1e7 }).statementsOnly.all.round).toEqual({ summed: 1, tokens: 277525, leftOut: [] });
  expect(177525 + 100000).toBe(277525);
  // As the record was before the correction.
  expect(report([...r534, again], { now: 1e7, until: 3399 }).statementsOnly.all.round.tokens).toBe(310348);
  // The same run of another issue, or another round of this one, replaces nothing here.
  const elsewhere = [opened("z", token("issues-overseer-1"), { seq: 3401 }), cost(3402, "z", { role: "reviewer", round: 2, outcome: "pass", seconds: 1, context: 1, event: 562 }), cost(3403, "verification-runs-are-not-kept", { role: "reviewer", round: 3, outcome: "pass", seconds: 1, context: 5, event: 3300 })];
  expect(report([...r534, ...elsewhere], { now: 1e7 }).statementsOnly.all.round.tokens).toBe(310348);
  // A correction whose `event` is the earlier one: the run in force names no event after the writer's, so the review is left out.
  const before = cost(3404, "verification-runs-are-not-kept", { role: "reviewer", round: 2, outcome: "pass", seconds: 376, context: 132823 }, { replaced: 3050 });
  expect(report([...r534, before], { now: 1e7 }).statementsOnly.all.round).toEqual({ summed: 0, tokens: 0, leftOut: [534] });
});

test("the tool has no line that reads a comment for a cost (R7's grep)", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(tool, "utf8").match(/cost \\?\{|cost-usage/g)).toBe(null);
});

// Issue issue-stats-default-token-r4: the tool names no token of a role, and has no default for --token.
test("with no --token the tool prints its usage and exits 2, and no line of it names a role's token", async () => {
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(tool, "utf8").match(/issues-(implementer|reviewer|overseer)-\d/g)).toBe(null);
  for (const args of [[], ["--json"], ["--token"], ["--token", "--json"]]) {
    const r = Bun.spawnSync(["bun", tool, ...args], { env: { ...process.env, BRAIN_STATE_DIR: "/nonexistent" } });
    expect(r.exitCode, args.join(" ")).toBe(2);
    expect(r.stdout.toString()).toBe("");
    expect(r.stderr.toString()).toContain("issue-stats.ts --token NAME");
    expect(r.stderr.toString()).toContain("nothing was sent");
  }
});

// os-3-stats-past-four-hours, R4 of plan/cloud-brain-loop-order-of-service.md, part 4 of its design: the mark `held`
// and the line `past 4 h, not started, no reason: <n>`, counted from an issue's last move.
const HOUR = 3600000, NOW = 100 * HOUR;
const orch = token("orch-d97e0e");
const at = (hoursAgo: number) => NOW - hoursAgo * HOUR;
let n4 = 5000;
const open4 = (id: string, hoursAgo: number, more: any = {}) => ({ seq: ++n4, key: `k${n4}`, type: "opened", id, kind: "task", state: "open", labels: [], by: orch, at: at(hoursAgo), ...more });
const move4 = (id: string, move: string, to: string, hoursAgo: number, reason = "") => ({ seq: ++n4, key: `k${n4}`, type: "moved", id, move, to, reason, by: orch, at: at(hoursAgo) });
const said4 = (id: string, hoursAgo: number, body: string, key = `orch/${id}/held-1`) => ({ seq: ++n4, key, type: "commented", id, body, by: orch, at: at(hoursAgo) });
const policy4 = { seq: 4999, type: "policy", hashes: { task: "w" }, policy: { workflows: { task: { closed: ["done", "closed", "rejected", "reverted"] } } }, at: at(50) };
const past4 = [
  policy4,
  // No reason: triaged 6 h ago, and a comment an hour ago that is no reason.
  open4("p-bare", 7, { workflow: "w" }), move4("p-bare", "triage", "triaged", 6, "True and worth it."), said4("p-bare", 1, "The body names the wrong file.", "rev/p-bare/note"),
  // Never moved: counted from its open.
  open4("p-open", 5, { workflow: "w", kind: "project" }),
  open4("p-ready", 9, { workflow: "w", kind: "bug" }), move4("p-ready", "triage", "triaged", 8, "True."), move4("p-ready", "ready", "ready", 7.5, "Nothing it waits on."),
  // A reason: the orchestrator's comment, and a triage reason with the word in either case.
  open4("h-comment", 9, { workflow: "w" }), move4("h-comment", "triage", "triaged", 8, "It waits for data."), said4("h-comment", 7, "held: it waits for 20 runs of the deployer; the 20th starts it."),
  open4("h-space", 9, { workflow: "w" }), said4("h-space", 0.5, "  Held: until the owner answers."),
  open4("h-triage", 9, { workflow: "w" }), move4("h-triage", "triage", "triaged", 8, "A task of an approved spec. Held at triaged until: ta-1."),
  open4("h-lower", 9, { workflow: "w" }), move4("h-lower", "triage", "triaged", 8, "Task 3 of the approved spec; held until the shell is posted."),
  // Not a reason: `held` in a comment that does not begin with `held:`, with no colon, in a word that only has it, in a triage
  // reason that a later triage replaced, and in the reason of a move that is no triage.
  open4("n-mid", 9, { workflow: "w" }), said4("n-mid", 8, "This is held: for the owner."),
  open4("n-colon", 9, { workflow: "w" }), said4("n-colon", 8, "held until the owner answers"), said4("n-colon", 8, "", "k-empty"), { ...said4("n-colon", 8, "", "k-none"), body: undefined },
  open4("n-word", 9, { workflow: "w" }), move4("n-word", "triage", "triaged", 8, "The finding is upheld; withheld from nobody."),
  open4("n-second", 9, { workflow: "w" }), move4("n-second", "triage", "triaged", 8, "Held at triaged until: x."), move4("n-second", "reopen", "open", 7, "x is done."), move4("n-second", "triage", "triaged", 6, "True; x is done."),
  open4("n-ready", 9, { workflow: "w" }), move4("n-ready", "triage", "triaged", 8, "True."), move4("n-ready", "ready", "ready", 7, "ds-3 and ds-4 stay held behind this one."),
  // Not rows of the count: feedback, needs-owner by the open and by a later label, an agent on it, closed, a test's
  // issue, a hidden one, and one whose last move is under four hours ago though it was opened nine hours ago.
  open4("x-feedback", 9, { workflow: "w", kind: "feedback" }),
  open4("x-asked", 9, { workflow: "w", labels: ["needs-owner"] }),
  open4("x-labelled", 9, { workflow: "w" }), { seq: ++n4, key: `k${n4}`, type: "labelled", id: "x-labelled", add: ["needs-owner"], remove: [], by: orch, at: at(8) },
  open4("x-progress", 9, { workflow: "w" }), move4("x-progress", "start", "in-progress", 8),
  open4("x-review", 9, { workflow: "w" }), move4("x-review", "start", "in-progress", 8), move4("x-review", "submit", "in-review", 7),
  open4("x-spec", 9, { workflow: "w", kind: "project" }), move4("x-spec", "spec", "spec", 8),
  open4("x-closed", 9, { workflow: "w" }), move4("x-closed", "close", "closed", 8),
  open4("test-x", 9, { workflow: "w" }),
  open4("x-hidden", 9, { workflow: "w", hidden: true }),
  open4("x-young", 9, { workflow: "w" }), move4("x-young", "triage", "triaged", 3.9, "True."),
  // The label taken off again: a row of the count from then on.
  open4("p-unasked", 9, { workflow: "w", labels: ["needs-owner"] }), { seq: ++n4, key: `k${n4}`, type: "labelled", id: "p-unasked", add: [], remove: ["needs-owner"], by: orch, at: at(1) }
];
const pastLines = (lines: string[]) => lines.slice(lines.findIndex((l) => /^past \d/.test(l)));

test("past 4 h, not started: counted from the last move, so a comment does not hide an issue (R4)", () => {
  const r = report(past4, { now: NOW });
  expect(new Set(r.unstarted.noReason.map((w: any) => w.id))).toEqual(new Set(["p-bare", "p-open", "p-ready", "p-unasked", "n-mid", "n-colon", "n-word", "n-second", "n-ready"]));
  expect(r.unstarted.count).toBe(9);
  expect(r.unstarted.hours).toBe(4);
  // p-bare had a comment an hour ago: it is not idle for 4 h, and it is counted, at 6 h since its triage.
  expect(r.waiting.some((w: any) => w.id === "p-bare")).toBe(false);
  expect(r.unstarted.noReason.find((w: any) => w.id === "p-bare")).toEqual({ id: "p-bare", kind: "task", state: "triaged", sinceMoveH: 6 });
  expect(r.unstarted.noReason.find((w: any) => w.id === "p-open")).toEqual({ id: "p-open", kind: "project", state: "open", sinceMoveH: 5 });
  // The longest first.
  expect(r.unstarted.noReason.map((w: any) => w.sinceMoveH)).toEqual([...r.unstarted.noReason.map((w: any) => w.sinceMoveH)].sort((a, b) => b - a));
});

test("a row with a reason is marked held and left out of the count: a `held:` comment, or `held` in the last triage reason", () => {
  const r = report(past4, { now: NOW });
  expect(r.unstarted.held.map((w: any) => [w.id, w.by]).sort()).toEqual([["h-comment", "comment"], ["h-lower", "triage"], ["h-space", "comment"], ["h-triage", "triage"]]);
  // In the list of the idle: the mark, on those rows and on no other. h-space had its comment half an hour ago and is not idle.
  expect(r.waiting.filter((w: any) => w.held).map((w: any) => w.id).sort()).toEqual(["h-comment", "h-lower", "h-triage"]);
  expect(r.waiting.find((w: any) => w.id === "x-feedback").held).toBe(false);
});

test("the lines printed: `held` at the end of a marked row, and the count on a line of its own with its rows under it", () => {
  const lines = text(report(past4, { now: NOW }));
  expect(lines).toContain(`  ${"h-triage".padEnd(40)} ${"task".padEnd(8)} ${"triaged".padEnd(17)}     8 h    by orch-d97e0e  held`);
  expect(lines).toContain(`  ${"x-feedback".padEnd(40)} ${"feedback".padEnd(8)} ${"open".padEnd(17)}     9 h    by orch-d97e0e`);
  expect(lines.filter((l: string) => / held$/.test(l)).length).toBe(3);
  const past = pastLines(lines);
  expect(past[0]).toBe("past 4 h, not started, no reason: 9 (4 more are held)");
  expect(past.length).toBe(10);
  expect(past).toContain(`  ${"p-bare".padEnd(40)} ${"task".padEnd(8)} ${"triaged".padEnd(17)}     6 h with no move`);
  expect(past.at(-1)).toBe(lines.at(-1));
});

test("--idle is the hours of both; with nothing past them the line reads 0", () => {
  const two = report(past4, { now: NOW, idleH: 2 });
  expect(two.unstarted.count).toBe(10);
  expect(two.unstarted.noReason.some((w: any) => w.id === "x-young")).toBe(true);
  expect(pastLines(text(two))[0]).toBe("past 2 h, not started, no reason: 10 (4 more are held)");
  expect(pastLines(text(report(past4, { now: NOW, idleH: 10 })))).toEqual(["past 10 h, not started, no reason: 0"]);
  expect(pastLines(text(report(events, { now: 1e6 })))).toEqual(["past 4 h, not started, no reason: 0"]);
  // --until reads the record as it was: before h-comment's comment (its third event) it had no reason.
  const before = report(past4, { now: NOW, until: past4.find((e: any) => e.id === "h-comment" && e.type === "commented")!.seq - 1 });
  expect(before.unstarted.noReason.some((w: any) => w.id === "h-comment")).toBe(true);
});

// stats-window-time-in-a-state: with --window, the time in a state of the stays that began after that event.
// R3 of the table of checks of plan/cloud-brain-loop-order-of-service.md reads the line `in-review` of it.
const min = 60000;
const ev = (seq: number, type: string, id: string, minutes: number, more: any = {}) => ({ seq, key: `w${seq}`, type, id, by: token("impl-3fa2c1"), at: minutes * min, ...more });
const mv = (seq: number, id: string, move: string, from: string, state: string, minutes: number) => ev(seq, "moved", id, minutes, { move, from, to: state });
const windowed = [
  ev(1, "opened", "wa", 0, { kind: "bug", state: "open", labels: [] }),
  mv(2, "wa", "start", "open", "in-progress", 1),
  mv(3, "wa", "submit", "in-progress", "in-review", 11),   // began before the window (10), ends after it: 9 min, not of it
  ev(4, "opened", "wb", 12, { kind: "bug", state: "open", labels: [] }),
  mv(5, "wb", "start", "open", "in-progress", 13),
  mv(6, "wb", "submit", "in-progress", "in-review", 15),   // began before the window too: 30 min
  mv(10, "wa", "rework", "in-review", "in-progress", 20),
  mv(11, "wa", "submit", "in-progress", "in-review", 22),  // 2 min at in-progress from event 10 itself (not after it), then 4 min at in-review
  mv(12, "wa", "pass", "in-review", "done", 26),
  ev(13, "opened", "wc", 27, { kind: "bug", state: "open", labels: [] }),
  mv(14, "wc", "start", "open", "in-progress", 30),        // 3 min at open
  mv(15, "wc", "submit", "in-progress", "in-review", 40),  // 10 min at in-progress, then 8 min at in-review
  mv(16, "wb", "pass", "in-review", "done", 45),
  mv(17, "wc", "pass", "in-review", "done", 48),
  ev(18, "opened", "wd", 50, { kind: "bug", state: "open", labels: [] }),
  mv(19, "wd", "start", "open", "in-progress", 51),        // 1 min at open
  mv(20, "wd", "submit", "in-progress", "in-review", 53),  // 2 min at in-progress; still at in-review: no stay
  ev(21, "opened", "test-we", 54, { kind: "bug", state: "open", labels: [] }),
  mv(22, "test-we", "start", "open", "in-progress", 99),   // a test- issue: not counted
  ev(23, "opened", "wf", 60, { kind: "bug", state: "open", labels: [] }),
  mv(24, "wf", "start", "open", "in-progress", 61),
  mv(25, "wf", "submit", "in-progress", "in-review", 62),
  { ...mv(26, "wf", "pass", "in-review", "done", 92), hidden: true } // a hidden move ends no stay
];
const inReviewLines = (lines: string[]) => lines.filter((l) => /^  in-review /.test(l) || /^time in a state/.test(l) || /^  none: /.test(l));

test("--window: the stays that began after the event, by state; one that began before it is of the whole record only", () => {
  const r = report(windowed, { now: 1e7, from: 10 });
  expect(r.timeInState["in-review"]).toEqual({ stays: 4, medianMin: 9, totalH: 0.8, maxH: 0.5 });
  expect(r.window.timeInState).toEqual({
    "in-progress": { stays: 3, medianMin: 2, totalH: 0.2, maxH: 0.2 },
    "in-review": { stays: 2, medianMin: 8, totalH: 0.2, maxH: 0.1 },
    open: { stays: 3, medianMin: 1, totalH: 0.1, maxH: 0.1 }
  });
  // The event --window names is not after itself: the stay that began at 11 is in from 10 and out from 11.
  expect(report(windowed, { now: 1e7, from: 11 }).window.timeInState["in-review"]).toEqual({ stays: 1, medianMin: 8, totalH: 0.1, maxH: 0.1 });
  expect(report(windowed, { now: 1e7, from: 2 }).window.timeInState["in-review"].stays).toBe(4);
});

test("--window with --until: a stay whose move out is after --until is not counted; --after does not cut the window", () => {
  expect(report(windowed, { now: 1e7, from: 10, until: 16 }).window.timeInState["in-review"]).toEqual({ stays: 1, medianMin: 4, totalH: 0.1, maxH: 0.1 });
  expect(report(windowed, { now: 1e7, from: 10, until: 11 }).window.timeInState["in-review"]).toBeUndefined();
  const cut = report(windowed, { now: 1e7, from: 10, since: 12 });
  expect(cut.timeInState["in-review"].stays).toBe(1);
  expect(cut.window.timeInState["in-review"].stays).toBe(2);
});

test("the lines printed: with --window a second list under its own heading, above the window line; with none, no heading", () => {
  const lines = text(report(windowed, { now: 1e7, from: 10 }));
  expect(inReviewLines(lines)).toEqual([
    "time in a state before the move out of it",
    "  in-review            4 stays  median      9 min  total   0.8 h  max 0.5 h",
    "time in a state, of the stays that began after 10",
    "  in-review            2 stays  median      8 min  total   0.2 h  max 0.1 h"
  ]);
  expect(lines.findIndex((l) => l.startsWith("window "))).toBe(lines.indexOf("time in a state, of the stays that began after 10") + 4);
  expect(inReviewLines(text(report(windowed, { now: 1e7 }))).length).toBe(2);
  expect(report(windowed, { now: 1e7 }).window.timeInState).toEqual({});
  // A window with no stay in it says so.
  expect(inReviewLines(text(report(windowed, { now: 1e7, from: 25 }))).slice(2)).toEqual(["time in a state, of the stays that began after 25", "  none: no stay began after it and ended"]);
  expect(report(windowed, { now: 1e7, from: 25 }).window.timeInState).toEqual({});
});
