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
