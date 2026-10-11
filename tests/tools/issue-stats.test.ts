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
// `statements only`, and what the round after a sent-back one cost. The cost comments are the bodies cb4 has, whole,
// at the seqs it has them (804 to 807 of redistil-apply-leaves-seen-json, 835 to 839 of verification-runs-are-not-kept;
// read 2026-10-11 with issues-implementer-2). The reviews are 452 and 534 with the mark put before a body of this
// file's own: no review on cb4 carried the mark when this was written.
const rev = { caller: "owner", via: "delegation:84cd2100b161", holder: "secret:issues-reviewer-2", tab: false };
const reviewed = (seq: number, id: string, verdict: string, body: string) => ({ seq, key: `rev/${id}/${seq}`, type: "reviewed", id, verdict, body, refs: [], by: rev, at: 1000 * seq });
const cost = (seq: number, id: string, body: string) => ({ seq, key: `cost-${seq}`, type: "commented", id, body, by: token("issues-implementer-2"), at: 1000 * seq });
const r534 = [
  opened("verification-runs-are-not-kept", token("issues-overseer-1"), { seq: 412 }),
  reviewed(534, "verification-runs-are-not-kept", "changes", "statements only\nFinding 1. Two sentences of the served reference."),
  reviewed(562, "verification-runs-are-not-kept", "pass", "pass. Nothing found."),
  cost(835, "verification-runs-are-not-kept", 'cost {"role":"implementer","round":1,"tokens":117836,"seconds":364,"tools":16,"outcome":"stopped","backfilled":true}'),
  cost(836, "verification-runs-are-not-kept", 'cost {"role":"implementer","round":2,"tokens":175360,"seconds":1030,"tools":46,"outcome":"in-review","event":482,"backfilled":true}'),
  cost(837, "verification-runs-are-not-kept", 'cost {"role":"reviewer","round":1,"tokens":145267,"seconds":402,"tools":27,"outcome":"changes","event":534,"backfilled":true}'),
  cost(838, "verification-runs-are-not-kept", 'cost {"role":"implementer","round":3,"tokens":177525,"seconds":723,"tools":37,"outcome":"in-review","event":549,"backfilled":true}'),
  cost(839, "verification-runs-are-not-kept", 'cost {"role":"reviewer","round":2,"tokens":132823,"seconds":376,"tools":26,"outcome":"pass","event":562,"backfilled":true}'),
  // The billed usage of 838: a comment of another kind, which is no cost comment.
  cost(1720, "verification-runs-are-not-kept", 'cost-usage {"of":838,"role":"implementer","round":3,"backfilled":true,"how":"matched by event 549","usage":{"input":74,"cacheWrite":168665,"cacheRead":4672271,"output":34500,"requests":34}}')
];
const r452 = [
  opened("redistil-apply-leaves-seen-json", token("issues-overseer-1"), { seq: 411 }),
  reviewed(452, "redistil-apply-leaves-seen-json", "changes", "statements only\nFinding 1. The record names the wrong failing test."),
  cost(804, "redistil-apply-leaves-seen-json", 'cost {"role":"implementer","round":1,"tokens":119966,"seconds":367,"tools":21,"outcome":"in-review","event":449,"backfilled":true}'),
  cost(805, "redistil-apply-leaves-seen-json", 'cost {"role":"reviewer","round":1,"tokens":109954,"seconds":299,"tools":19,"outcome":"changes","event":452,"backfilled":true}'),
  cost(806, "redistil-apply-leaves-seen-json", 'cost {"role":"implementer","round":2,"tokens":103508,"seconds":218,"tools":16,"outcome":"in-review","event":462,"backfilled":true}'),
  cost(807, "redistil-apply-leaves-seen-json", 'cost {"role":"reviewer","round":2,"tokens":77183,"seconds":95,"tools":7,"outcome":"pass","backfilled":true}')
];
const others = [
  opened("p", token("issues-overseer-1"), { seq: 2000 }),
  reviewed(2001, "p", "pass", "statements only\nNote 1. The record says bytes where wc -m counts characters."),
  reviewed(2002, "p", "pass", "  statements only, record. Note 1. One count of the record is off by one."),
  // In the issue's own record and sent back, with no cost comment after it yet.
  reviewed(2003, "p", "changes", "statements only, record\nFinding 1. The record gives no test count."),
  // Not marked: the words are not the first of the body, or go on as another word.
  reviewed(2004, "p", "changes", "Verdict: changes.\nstatements only"),
  reviewed(2005, "p", "pass", "statements only-ish, and a test to change"),
  reviewed(2006, "p", "pass", "Statements only"),
  reviewed(2007, "test-q", "pass", "statements only")
].sort((a, b) => a.seq - b.seq);
const marked = [...r452, ...r534, ...others].sort((a, b) => a.seq - b.seq);
const statementsLine = (lines: string[]) => lines.filter((l) => /^statements only\b/.test(l) || /^  after \d+: /.test(l));

test("review 534, marked, with its five cost comments: the round after it is 310,348 (R3)", () => {
  const s = report(r534, { now: 1e7 }).statementsOnly;
  expect(s.all).toEqual({ reviews: 1, verdicts: { changes: 1 }, round: { summed: 1, tokens: 310348, leftOut: [] } });
  expect(177525 + 132823).toBe(310348);
  expect(s.record).toEqual({ reviews: 0, verdicts: {}, round: { summed: 0, tokens: 0, leftOut: [] } });
  expect(statementsLine(text(report(r534, { now: 1e7 })))).toEqual(['statements only reviews that begin with it: 1 {"changes":1}, the rounds after 1 sent back: 310348 tokens; of them `statements only, record`: 0 {}']);
});

test("review 452, marked: counted, and left out of the sum, since its reviewer's cost comment names no event", () => {
  const s = report(r452, { now: 1e7 }).statementsOnly;
  expect(s.all).toEqual({ reviews: 1, verdicts: { changes: 1 }, round: { summed: 0, tokens: 0, leftOut: [452] } });
  expect(statementsLine(text(report(r452, { now: 1e7 })))).toEqual(['statements only reviews that begin with it: 1 {"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost comment naming its event) [452]; of them `statements only, record`: 0 {}']);
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

test("--window counts the marked reviews after that event, with a line of its own; --until cuts the cost comments too", () => {
  const w = report(marked, { now: 1e7, from: 500 });
  expect(w.window.statementsOnly.all).toEqual({ reviews: 4, verdicts: { changes: 2, pass: 2 }, round: { summed: 1, tokens: 310348, leftOut: [2003] } });
  expect(statementsLine(text(w))).toEqual([
    'statements only reviews that begin with it: 5 {"changes":3,"pass":2}, the rounds after 1 sent back: 310348 tokens, 2 more left out (no cost comment naming its event) [452,2003]; of them `statements only, record`: 2 {"pass":1,"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost comment naming its event) [2003]',
    '  after 500: 4 {"changes":2,"pass":2}, the rounds after 1 sent back: 310348 tokens, 1 more left out (no cost comment naming its event) [2003]; of them `statements only, record`: 2 {"pass":1,"changes":1}, the rounds after 0 sent back: 0 tokens, 1 more left out (no cost comment naming its event) [2003]'
  ]);
  // At event 838 the reviewer's comment of the round after 534 was not written yet.
  expect(report(marked, { now: 1e7, until: 838 }).statementsOnly.all).toEqual({ reviews: 2, verdicts: { changes: 2 }, round: { summed: 0, tokens: 0, leftOut: [452, 534] } });
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
