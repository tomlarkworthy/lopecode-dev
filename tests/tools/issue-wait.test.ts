// issue-wait.sh: a wait of the tracker's record, and the reads of the caller's due waits. Issues os-4-writer-waits
// (the writer's wait for its own review), tr-2-issue-wait-over-wakes (the wait as an event) and tr-3-briefs-and-queue
// (the briefs name it, and the wait for an event with no flag is gone): plan/cloud-brain-tracker-trigger-rules.md, part 3.
//
//   bun test --timeout=30000 ./tests/tools/issue-wait.test.ts
//   ISSUE_WAIT_SH=/path/to/another/issue-wait.sh bun test …
// No call leaves the machine: the tool calls a stand-in for issue-as.sh (ISSUE_AS_SH), and ISSUE_WAIT_EVERY makes its
// 15 s short. IMPLEMENTER=, SPEC_BRIEF= and SKILL= read another copy of the three texts.
import { test, expect } from "bun:test";
import { inFull, core } from "./implementer-brief";
import { readFileSync, writeFileSync, mkdtempSync, chmodSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const script = process.env.ISSUE_WAIT_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-wait.sh");
const by = (holder: string) => ({ caller: "owner", via: "delegation:0007ea9d1903", holder: `secret:${holder}`, tab: false });
const reviewed = (seq: number, id: string, verdict = "changes") =>
  ({ seq, type: "reviewed", id, verdict, body: `${verdict}\n\n1. a finding's "words"`, refs: [], by: by("rev-cccccc") });
const moved = (seq: number, id: string, move: string, to: string) =>
  ({ seq, type: "moved", id, move, to, reason: "", refs: [], by: by("rev-cccccc") });
const commented = (seq: number, id: string) => ({ seq, type: "commented", id, body: "cost {}", by: by("orch-aaaaaa") });
const lines = (s: string) => s.split("\n").filter(Boolean);

const wait = (f: { sh: string }, args: string[], every = "0.05") => {
  const t = Date.now();
  const p = Bun.spawnSync(["bash", script, ...args], { env: { ...process.env, ISSUE_AS_SH: f.sh, ISSUE_WAIT_EVERY: every } });
  return { code: p.exitCode, out: lines(p.stdout.toString()), err: p.stderr.toString(), ms: Date.now() - t };
};

// tr-2-issue-wait-over-wakes, part 3 of plan/cloud-brain-tracker-trigger-rules.md: the wait as an event of the record.
// A stand-in for issue-as.sh that keeps what the tracker keeps of one issue in s.json beside it: the keys it has
// answered, the one wait of the caller, the issue's state and events. `moves` changes the issue at the nth read of
// wakes, `fail` answers the next n calls of a method 502, `status` answers every call of a method that status,
// `foreign` are keys another actor wrote. It knows the `when` of two shapes, issue.state != "S" and issue.state == "S".
type Tracker = { issue: { id: string; state: string }; events: unknown[]; keys?: Record<string, any>; wait?: any; seq?: number;
  moves?: { wakes: number; state: string; events?: unknown[] }[]; fail?: Record<string, number>; status?: Record<string, number>; foreign?: string[]; exit?: number };
const tracker = (t: Tracker) => {
  const dir = mkdtempSync(join(tmpdir(), "issue-wait-tr-"));
  const file = join(dir, "s.json");
  writeFileSync(file, JSON.stringify({ keys: {}, wait: null, seq: 100, wakes: 0, ...t }));
  const sh = join(dir, "issue-as.sh");
  writeFileSync(sh, `#!/usr/bin/env python3
import json, os, re, sys, time
d = os.path.dirname(os.path.abspath(__file__)); p = os.path.join(d, "s.json")
s = json.load(open(p))
call = sys.argv[2]; body = sys.argv[3] if len(sys.argv) > 3 else None
open(os.path.join(d, "calls.log"), "a").write(" ".join(sys.argv[1:]) + "\\n")
def out(status, o):
    json.dump(s, open(p, "w")); sys.stdout.write(json.dumps(o)); sys.stderr.write(" [%d]\\n" % status); sys.exit(0)
if s.get("exit"):
    sys.stderr.write("issue-as.sh: no token named %s is kept; nothing was sent\\n" % sys.argv[1]); sys.exit(s["exit"])
method = call.split("?")[0]; now = int(time.time() * 1000)
if (s.get("status") or {}).get(method): out(s["status"][method], {"error": "Refused", "message": "refused by the stand-in"})
if (s.get("fail") or {}).get(method):
    s["fail"][method] -= 1; out(502, {"error": "UpstreamFailed"})
def due(w):
    m = re.fullmatch(r'issue\\.state (!=|==) "([a-z-]+)"', w["when"])
    return bool(m) and ((s["issue"]["state"] != m.group(2)) == (m.group(1) == "!="))
if method == "wait":
    b = json.loads(body); k = b["key"]
    if k in (s.get("foreign") or []): out(200, {"id": b["id"], "seq": 3, "duplicate": True})
    if k in s["keys"]: out(200, {"id": b["id"], "seq": s["keys"][k]["seq"], "duplicate": True, "event": s["keys"][k]})
    if b["id"] != s["issue"]["id"]: out(404, {"error": "NotFound", "message": "no issue " + b["id"]})
    if b.get("remove") is True:
        if not s.get("wait"): out(404, {"error": "NotFound", "message": "no such wait"})
        e = {"remove": True}
    else:
        if "nope" in b["when"]: out(400, {"error": "InvalidRequest", "message": "when: No such key: nope"})
        e = {x: b[x] for x in ("when", "until", "note") if x in b}
    s["seq"] += 1; e.update(seq=s["seq"], key=k, type="waits", id=b["id"])
    s["wait"] = None if e.get("remove") else e
    s["keys"][k] = e; out(200, {"id": b["id"], "seq": e["seq"], "event": e})
if method == "wakes":
    s["wakes"] += 1
    for m in s.get("moves") or []:
        if m["wakes"] == s["wakes"]:
            s["issue"]["state"] = m["state"]; s["events"] += m.get("events") or []
    w = s.get("wait"); a = {"seq": s["seq"], "now": now, "due": [], "waiting": []}
    if w and w["until"] > now:
        e = {x: w[x] for x in ("when", "until", "note", "seq") if x in w}; e["id"] = s["issue"]["id"]
        if due(w): a["due"].append(dict(e, since=5, issue={"state": s["issue"]["state"], "closed": False, "last": {"move": "", "at": 0}, "labels": []}))
        else: a["waiting"].append(e)
    out(200, a)
if method == "get": out(200, {"issue": s["issue"], "children": [], "events": s["events"]})
out(501, {"error": "MethodNotImplemented"})
`);
  chmodSync(sh, 0o755);
  const calls = () => (existsSync(join(dir, "calls.log")) ? lines(readFileSync(join(dir, "calls.log"), "utf8")) : []);
  return { sh, calls, state: () => JSON.parse(readFileSync(file, "utf8")), set: (f: (s: any) => void) => { const s = JSON.parse(readFileSync(file, "utf8")); f(s); writeFileSync(file, JSON.stringify(s)); },
    // Each call as [method, the body's fields but `until`]: the time is checked apart.
    sent: () => calls().map((c) => { const [, method, ...rest] = c.split(" "); const b = rest.length ? JSON.parse(rest.join(" ")) : undefined; if (b) delete b.until; return b ? [method, b] : [method]; }) };
};
const T = "impl-aaaaaa";
const waitKey = { key: "impl/mine/wait-7", id: "mine" };
const removed = ["wait", { key: "impl/mine/remove-7", id: "mine", remove: true }];
const inReview = (more: Partial<Tracker> = {}) => tracker({ issue: { id: "mine", state: "in-review" }, events: [], ...more });

// tr-3-briefs-and-queue: the form the briefs named until then. A writer that has the old brief in its context is told the line.
test("the wait with no flag, and --filter, were taken out: exit 64 with nothing sent, and stderr has the line to run in its place", () => {
  const f = inReview();
  const old = wait(f, [T, "mine", "7"]);
  expect([old.code, old.out, old.err]).toEqual([64, [], "issue-wait.sh: the wait with no flag was taken out (tr-3-briefs-and-queue), and nothing was sent. After your submit: issue-wait.sh impl-aaaaaa mine 7 --left in-review\n"]);
  expect(wait(f, [T, "mine", "7", "20"]).err).toContain("After your submit: issue-wait.sh impl-aaaaaa mine 7 --left in-review 20\n");
  expect(wait(f, ["spec-bbbbbb", "mine", "7"]).err).toContain("After your submit: issue-wait.sh spec-bbbbbb mine 7 --left spec-review\n");
  // The line it names is one the tool takes: a wait is written.
  const line = old.err.trim().split("After your submit: issue-wait.sh ")[1].split(" ");
  expect(wait(f, [...line, "0"]).code).toBe(3);
  expect(f.calls()).toEqual([]);
  expect(wait(f, [...line, "1"]).code).toBe(3);
  expect(f.sent()[0]).toEqual(["wait", { ...waitKey, when: 'issue.state != "in-review"' }]);
  // Arguments that were refused before are refused as before, with the usage and no hint.
  const g = inReview();
  for (const a of [[], ["tok"], ["tok", "mine"], ["tok", "mine", "x"], ["tok", "mine", "-1"], ["tok", "mine", "1.5"], ["tok", "Mine?", "1"], ["tok", "mine", "1", "soon"], ["tok", "mine", "1", "2", "3"], ["", "mine", "1"],
    ["--filter"], ["--filter", "mine"], ["--filter", "mine", "7"], ["--filter", "mine", "x"]]) {
    const r = wait(g, a);
    expect([a, r.code, r.out, /^usage: issue-wait\.sh <token> <id> <after seq> \(--when CEL \| --left STATE\)/.test(r.err), r.err.includes("--filter")]).toEqual([a, 64, [], true, false]);
  }
  expect(g.calls()).toEqual([]);
  // The script has no read of sync left, and its header says what went.
  const sh = readFileSync(script, "utf8");
  expect([sh.includes("sync?after="), /^# The wait for an event, `issue-wait\.sh <token> <id> <after seq> \[seconds\]` with no flag, and `--filter` were taken out/m.test(sh)]).toEqual([false, true]);
});

test("--when: the first run writes the wait, with its key and 25 minutes, then reads wakes?id=; not due in the seconds is exit 3 with nothing printed and nothing taken off", () => {
  const f = inReview(); const t = Date.now();
  const r = wait(f, [T, "mine", "7", "--when", 'issue.state != "in-review"', "1"]);
  expect([r.code, r.out, r.err]).toEqual([3, [], ""]);
  expect(r.ms).toBeGreaterThan(900);
  const sent = f.sent();
  expect(sent[0]).toEqual(["wait", { ...waitKey, when: 'issue.state != "in-review"' }]);
  expect(sent.length).toBeGreaterThan(3);
  expect(sent.slice(1).every((c) => c.length === 1 && c[0] === "wakes?id=mine")).toBe(true); // one write, then reads
  const until = JSON.parse(f.calls()[0].split(" ").slice(2).join(" ")).until;
  expect(until).toBeGreaterThanOrEqual(t + 25 * 60000);
  expect(until).toBeLessThan(Date.now() + 25 * 60000 + 1);
  expect(f.state().wait.when).toBe('issue.state != "in-review"');
});

test("--when that is due: exit 0 with the due entry and null for an issue with no review, and the remove is sent", () => {
  const f = inReview();
  const r = wait(f, [T, "mine", "7", "--when", 'issue.state == "in-review"', "20"]);
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(r.out.length).toBe(2);
  expect(JSON.parse(r.out[0])).toMatchObject({ id: "mine", when: 'issue.state == "in-review"', seq: 101, since: 5, issue: { state: "in-review", closed: false } });
  expect(JSON.parse(r.out[1])).toBe(null);
  expect(f.sent()).toEqual([["wait", { ...waitKey, when: 'issue.state == "in-review"' }], ["wakes?id=mine"], ["get?id=mine"], removed]);
  expect(f.state().wait).toBe(null);
  // A --when at in-progress is not a round sent back: a taker that waits on what it is after is at in-progress.
  const g = tracker({ issue: { id: "mine", state: "in-progress" }, events: [] });
  expect(wait(g, [T, "mine", "7", "--when", 'issue.state == "in-progress"', "20"]).code).toBe(0);
  expect(g.sent().at(-1)).toEqual(removed);
});

test("--last: at exit 3 the remove is sent, and the next run of the same arguments is exit 5", () => {
  const f = inReview();
  const r = wait(f, [T, "mine", "7", "--left", "in-review", "1", "--last"]);
  expect([r.code, r.out, r.err]).toEqual([3, [], ""]);
  expect(f.sent().at(-1)).toEqual(removed);
  expect(f.sent().filter((c) => c[0] === "wait").length).toBe(2);
  expect(f.state().wait).toBe(null);
  const again = wait(f, [T, "mine", "7", "--left", "in-review", "20"]);
  expect([again.code, again.out]).toEqual([5, []]);
  expect(again.err).toBe("issue-wait.sh: the wait impl/mine/wait-7 (event 101) is not live: it is past its until, was taken off, or another wait of this token on mine took its place\n");
});

test("a wait past its until is exit 5 with nothing printed and nothing sent after the read", () => {
  const f = inReview();
  expect(wait(f, [T, "mine", "7", "--left", "in-review", "1"]).code).toBe(3);
  f.set((s) => { s.wait.until = Date.now() - 1; s.issue.state = "done"; });
  const n = f.calls().length;
  const r = wait(f, [T, "mine", "7", "--left", "in-review", "20"]);
  expect([r.code, r.out]).toEqual([5, []]);
  expect(f.sent().slice(n)).toEqual([["wait", { ...waitKey, when: 'issue.state != "in-review"' }], ["wakes?id=mine"]]);
});

const round = { wakes: 3, state: "in-progress", events: [reviewed(5, "mine", "pass"), reviewed(9, "mine"), commented(10, "mine"), reviewed(12, "mine"), moved(13, "mine", "rework", "in-progress")] };

test("--left, a round sent back: exit 0 with the entry and the last review over the seq, whole; nothing is sent, the wait stands and stderr names the two commands", () => {
  const f = inReview({ moves: [round] });
  const r = wait(f, [T, "mine", "7", "--left", "in-review", "20"]);
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out[0])).toMatchObject({ id: "mine", when: 'issue.state != "in-review"', issue: { state: "in-progress" } });
  expect(JSON.parse(r.out[1])).toEqual(reviewed(12, "mine"));
  expect(r.out.length).toBe(2);
  expect(f.sent()).toEqual([["wait", { ...waitKey, when: 'issue.state != "in-review"' }], ["wakes?id=mine"], ["wakes?id=mine"], ["wakes?id=mine"], ["get?id=mine"]]);
  expect(f.state().wait.seq).toBe(101);
  expect(r.err).toBe("issue-wait.sh: mine is at in-progress: a round was sent back, and the wait stands as it is. Take the round: issue-wait.sh impl-aaaaaa mine 7 --work   Leave it: issue-wait.sh impl-aaaaaa mine 7 --remove\n");
  // A spec sent back is the same case.
  const spec = tracker({ issue: { id: "mine", state: "spec-review" }, events: [], moves: [{ wakes: 1, state: "spec" }] });
  expect(wait(spec, ["spec-bbbbbb", "mine", "7", "--left", "spec-review", "20"]).err).toContain("mine is at spec: a round was sent back");
  expect(spec.sent()[0]).toEqual(["wait", { key: "spec/mine/wait-7", id: "mine", when: 'issue.state != "spec-review"' }]);
  expect(spec.state().wait.seq).toBe(101);
});

test("--left --no-round at a round sent back, and --left at a pass: the remove is sent", () => {
  const f = inReview({ moves: [round] });
  const r = wait(f, [T, "mine", "7", "--left", "in-review", "--no-round", "20"]);
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(JSON.parse(r.out[1]).seq).toBe(12);
  expect(f.sent().slice(-2)).toEqual([["get?id=mine"], removed]);
  expect(f.state().wait).toBe(null);
  const pass = inReview({ moves: [{ wakes: 2, state: "done", events: [reviewed(12, "mine", "pass"), moved(13, "mine", "pass", "done")] }] });
  const p = wait(pass, [T, "mine", "7", "--left", "in-review", "20"]);
  expect([p.code, p.err, JSON.parse(p.out[1]).verdict]).toEqual([0, "", "pass"]);
  expect(pass.sent().at(-1)).toEqual(removed);
});

test("a second run after the move: the same arguments write no wait the tracker keeps, and it is exit 0 at its first read", () => {
  for (const to of ["done", "in-progress"]) {
    const f = inReview();
    expect(wait(f, [T, "mine", "7", "--left", "in-review", "1"]).code).toBe(3);
    const before = f.state(); const n = f.calls().length;
    f.set((s) => { s.issue.state = to; s.events.push(reviewed(12, "mine", to === "done" ? "pass" : "changes")); });
    const r = wait(f, [T, "mine", "7", "--left", "in-review", "20"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out[0])).toMatchObject({ seq: 101, issue: { state: to } });
    expect(JSON.parse(r.out[1]).seq).toBe(12);
    const sent = f.sent().slice(n);
    expect(sent.slice(0, 3)).toEqual([["wait", { ...waitKey, when: 'issue.state != "in-review"' }], ["wakes?id=mine"], ["get?id=mine"]]);
    expect(sent.slice(3)).toEqual(to === "done" ? [removed] : []);
    // The key of the first run: one wait event in all, and the seq the second run's write left is the first's.
    expect(Object.keys(f.state().keys)).toEqual(to === "done" ? ["impl/mine/wait-7", "impl/mine/remove-7"] : ["impl/mine/wait-7"]);
    expect(f.state().keys["impl/mine/wait-7"]).toEqual(before.keys["impl/mine/wait-7"]);
  }
});

test("--work reads the state and writes the wait of a round in the place of the one that stood; --remove is one call", () => {
  const f = inReview({ moves: [round] });
  expect(wait(f, [T, "mine", "7", "--left", "in-review", "20"]).code).toBe(0);
  const n = f.calls().length; const t = Date.now();
  const w = wait(f, [T, "mine", "7", "--work"]);
  expect([w.code, w.err]).toEqual([0, ""]);
  expect(f.sent().slice(n)).toEqual([["get?id=mine"], ["wait", { key: "impl/mine/work-7", id: "mine", when: 'issue.state != "in-progress"', note: "at work on the round" }]]);
  const until = JSON.parse(f.calls()[n + 1].split(" ").slice(2).join(" ")).until;
  expect(until).toBeGreaterThanOrEqual(t + 60 * 60000);
  expect(until).toBeLessThan(Date.now() + 60 * 60000 + 1);
  expect(w.out.map((l) => JSON.parse(l))).toEqual([{ seq: 102, key: "impl/mine/work-7", when: 'issue.state != "in-progress"', until, note: "at work on the round" }]);
  expect(f.state().wait).toMatchObject({ seq: 102, note: "at work on the round" });
  const m = f.calls().length;
  const x = wait(f, [T, "mine", "7", "--remove"]);
  expect([x.code, x.err, x.out.map((l) => JSON.parse(l))]).toEqual([0, "", [{ seq: 103, key: "impl/mine/remove-7", remove: true }]]);
  expect(f.sent().slice(m)).toEqual([removed]);
  expect(f.state().wait).toBe(null);
});

test("--remove with no wait is exit 0 and says so; with a key kept before it says nothing was written; --work and --remove that are not written are exit 1", () => {
  const f = inReview();
  const r = wait(f, [T, "mine", "7", "--remove"]);
  expect([r.code, r.out, r.err]).toEqual([0, [], "issue-wait.sh: no wait of this token stands on mine: nothing to take off\n"]);
  expect(wait(f, [T, "mine", "7", "--left", "in-review", "0"]).code).toBe(3); // 0 seconds: no call, so no wait
  expect(f.calls().length).toBe(1);
  expect(wait(f, [T, "mine", "7", "--work"]).code).toBe(0);
  expect(wait(f, [T, "mine", "7", "--remove"]).code).toBe(0);
  expect(wait(f, [T, "mine", "8", "--work"]).code).toBe(0);
  const kept = wait(f, [T, "mine", "7", "--remove"]);
  expect([kept.code, kept.err]).toEqual([0, "issue-wait.sh: the key impl/mine/remove-7 was kept before, so nothing was written now: a wait written after that remove stands until its time\n"]);
  expect(JSON.parse(kept.out[0])).toEqual({ seq: 102, key: "impl/mine/remove-7", remove: true, duplicate: true });
  expect(f.state().wait.key).toBe("impl/mine/work-8");
  const again = wait(f, [T, "mine", "8", "--work"]);
  expect([again.code, again.err, JSON.parse(again.out[0]).duplicate]).toEqual([0, "issue-wait.sh: the key impl/mine/work-8 was kept before, so nothing was written now\n", true]);
  const down = inReview({ fail: { get: 1, wait: 2 } });
  const w = wait(down, [T, "mine", "7", "--work"]);
  expect([w.code, w.out, w.err]).toEqual([1, [], "issue-wait.sh: the state of mine was not read; nothing was written\n"]);
  expect(down.sent()).toEqual([["get?id=mine"]]);
  const w2 = wait(down, [T, "mine", "7", "--work"]);
  expect([w2.code, w2.out, w2.err]).toEqual([1, [], "issue-wait.sh: the wait was not written [502] UpstreamFailed\n"]);
  const x = wait(down, [T, "mine", "7", "--remove"]);
  expect([x.code, x.out]).toEqual([1, []]);
  expect(x.err).toBe("issue-wait.sh: the remove was not written [502] UpstreamFailed; the wait stands until its time, or: issue-wait.sh impl-aaaaaa mine 7 --remove\n");
});

test("--until gives the minutes of the wait; the tracker's refusal of a wait is exit 64 with its message after one call", () => {
  const f = inReview(); const t = Date.now();
  expect(wait(f, [T, "mine", "7", "--until", "5", "--left", "in-review", "1"]).code).toBe(3);
  const until = JSON.parse(f.calls()[0].split(" ").slice(2).join(" ")).until;
  expect(until).toBeGreaterThanOrEqual(t + 5 * 60000);
  expect(until).toBeLessThan(Date.now() + 5 * 60000 + 1);
  const bad = inReview();
  const r = wait(bad, [T, "mine", "7", "--when", "issue.nope == 1", "20"]);
  expect([r.code, r.out, r.err, bad.calls().length]).toEqual([64, [], "issue-wait.sh: the wait was refused [400] when: No such key: nope\n", 1]);
  const none = wait(bad, [T, "theirs", "7", "--left", "in-review", "20"]);
  expect([none.code, none.err]).toEqual([64, "issue-wait.sh: the wait was refused [404] no issue theirs\n"]);
  const other = inReview({ foreign: ["impl/mine/wait-7"] });
  const o = wait(other, [T, "mine", "7", "--left", "in-review", "20"]);
  expect([o.code, o.out, other.calls().length]).toEqual([64, [], 1]);
  expect(o.err).toBe("issue-wait.sh: the key impl/mine/wait-7 is another actor's (event 3): no wait of this token was written\n");
});

test("the new arguments that are refused: exit 64 with no call", () => {
  const f = inReview();
  const L = ["--left", "in-review"];
  for (const a of [["--when"], ["--left"], [...L, "--when", "true"], [...L, "--work"], ["--work", "--remove"], ["--work", "5"], ["--remove", "--last"], ["--work", "--until", "5"],
    ["--last"], ["--no-round"], ["--until", "5"], ["--when", "true", "--no-round"], ["--when", ""], ["--when", "x".repeat(501)], ["--left", "In-Review"], ["--left", 'a" || true || "'],
    [...L, "--until", "0"], [...L, "--until", "43201"], [...L, "--until", "soon"], [...L, "--until"], [...L, "--last", "--last"], [...L, ...L], [...L, "--soon"], [...L, "1", "2"], [...L, "soon"]])
    expect([a, wait(f, [T, "mine", "7", ...a]).code]).toEqual([a, 64]);
  for (const a of [["", "mine", "7", ...L], [T, "Mine?", "7", ...L], [T, "mine", "x", ...L], [T, "mine", ...L], ["-aaaaaa", "mine", "7", ...L]])
    expect([a, wait(f, a).code]).toEqual([a, 64]);
  expect(f.calls()).toEqual([]);
});

test("calls that are not answered: the wait is written when the tracker answers, a read that fails is counted, and a due wait whose issue is not read is exit 3 and stands", () => {
  const f = inReview({ fail: { wait: 2 } });
  const r = wait(f, [T, "mine", "7", "--when", 'issue.state == "in-review"', "20"]);
  expect([r.code, r.out.length, r.err]).toEqual([0, 2, ""]);
  expect(f.sent().map((c) => c[0])).toEqual(["wait", "wait", "wait", "wakes?id=mine", "get?id=mine", "wait"]);
  const down = inReview({ fail: { wakes: 1e6 } });
  const d = wait(down, [T, "mine", "7", "--left", "in-review", "1"], "0.2");
  expect([d.code, d.out]).toEqual([3, []]);
  expect(d.err).toMatch(/^issue-wait\.sh: (\d+) of (\d+) calls gave no answer that was read\n$/);
  const [, bad, all] = d.err.match(/(\d+) of (\d+)/)!;
  expect(Number(all) - Number(bad)).toBe(1); // the write of the wait was read
  const blind = inReview({ fail: { get: 1e6 } });
  const b = wait(blind, [T, "mine", "7", "--when", 'issue.state == "in-review"', "1", "--last"], "0.2");
  expect([b.code, b.out]).toEqual([3, []]);
  expect(b.err).toMatch(/^issue-wait\.sh: the wait is due and the issue was not read \(get\?id=mine\): run it again\nissue-wait\.sh: \d+ of \d+ calls gave no answer that was read\n$/);
  expect(blind.sent().at(-1)).toEqual(removed); // --last
  const stands = inReview({ fail: { get: 1e6 } });
  expect(wait(stands, [T, "mine", "7", "--when", 'issue.state == "in-review"', "1"], "0.2").code).toBe(3);
  expect(stands.state().wait.seq).toBe(101);
});

test("a token that is not kept, and a call that is refused 401 or 403, are exit 2 after one call, for each form", () => {
  for (const a of [["--left", "in-review", "20"], ["--work"], ["--remove"]]) {
    const none = inReview({ exit: 2 });
    const r = wait(none, ["impl-nobody", "mine", "7", ...a]);
    expect([a, r.code, r.out, r.err, none.calls().length]).toEqual([a, 2, [], "issue-as.sh: no token named impl-nobody is kept; nothing was sent\n", 1]);
    for (const status of [401, 403]) {
      const f = inReview({ status: { wait: status, get: status } });
      const x = wait(f, [T, "mine", "7", ...a]);
      expect([a, x.code, x.out, f.calls().length]).toEqual([a, 2, [], 1]);
      expect(x.err).toContain(`[${status}] refused by the stand-in; the token has ended or does not name it`);
    }
  }
  const read = inReview({ status: { wakes: 401 } });
  expect(wait(read, [T, "mine", "7", "--left", "in-review", "20"]).code).toBe(2);
  expect(read.calls().length).toBe(2);
});

const flat = (env: string | undefined, path: string) => readFileSync(env || resolve(import.meta.dir, path), "utf8").replace(/\s+/g, " ");

test("the writer's brief has the wait as step 13: the line with --left, the timeout, five runs with --last, --work before the one round, --no-round after it, --remove at 3", () => {
  const brief = (process.env.IMPLEMENTER ? readFileSync(process.env.IMPLEMENTER, "utf8") : inFull()).replace(/\s+/g, " ");
  const step = brief.slice(brief.indexOf("13. **Wait for your review"), brief.indexOf("## A resumed round"));
  expect(step).toContain("tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --left in-review");
  expect(step).toContain("with the Bash `timeout` at 280000");
  expect(step).toContain("to 5 runs in all (20 minutes), the fifth with `--last`");
  expect(step).toContain("Run it only after your submit");
  expect(step).toContain("The second is the last `reviewed` event of the issue after your submit, whole");
  expect(step).toContain("a round was sent back, and the wait stands as it is");
  expect(step).toMatch(/3 `rework` moves or more \(count them in [^)]*\): the judgment at 3 is the orchestrator's \(`SKILL\.md`, step 3\)\. `\$W\/tools\/cloud-brain\/issue-wait\.sh <token> <id> <seq of your submit> --remove`, and report\. You take no round\./);
  expect(step).toMatch(/Otherwise the round is yours\. `\$W\/tools\/cloud-brain\/issue-wait\.sh <token> <id> <seq of your submit> --work` before anything else/);
  expect(step).toContain("`… <seq of the round's submit> --left in-review --no-round`. That is the one round you take");
  expect(step).toContain("**Exit 5**, nothing printed: your wait is not live");
  // What the tool no longer does is not asked of the writer: no line of a review with no move, no read of sync.
  expect(step).not.toMatch(/and one line:|The second line, when there is one|It reads `sync\?after=` every 15 s and writes nothing/);
  expect(brief).toMatch(/## A resumed round A round you take yourself after step 13 is a resumed round too: what follows holds, with the tool's second line, the review, where it says the message/);
  // The file every writer reads has the same line, the exits and the three flags, and is run with no page for a pass.
  const short = (process.env.IMPLEMENTER_CORE ? readFileSync(process.env.IMPLEMENTER_CORE, "utf8") : core()).replace(/\s+/g, " ");
  const s13 = short.slice(short.indexOf("13. **Wait for your review"), short.indexOf("## The pages"));
  for (const t of ["$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit> --left in-review ```", "up to 5 runs in all, the fifth with `--last`; then report", "the second line is the review",
    "Run the line with `--work` for `--left in-review`, then read the page `resumed-round` and follow it", "the wait after that round's submit ends `--no-round`", "At 3 `rework` moves or more take no round: `--remove` for `--work`",
    "**Exit 5**: the wait ended", "**Exit 2**: your token was ended"]) expect([t, s13.includes(t)]).toEqual([t, true]);
  expect(s13).not.toMatch(/reviewer's move|second line with/);
});

test("the spec writer's brief has the same wait in step 7, with --left spec-review, and a resumed round names it", () => {
  const spec = flat(process.env.SPEC_BRIEF, "../../.claude/skills/brain-maintenance/agents/spec.md");
  const step = spec.slice(spec.indexOf("7. **Submit**"), spec.indexOf("After the owner's approval the orchestrator opens the tasks"));
  expect(step.indexOf("**Then wait for the spec's review, and take one round yourself**")).toBeGreaterThan(step.indexOf(`"to":"spec-review"`));
  for (const t of ["$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq> --left spec-review ```", "with the Bash `timeout` at 280000", "up to 5 runs in all, the fifth with `--last`", "Run it only after the submit",
    "`$W/tools/cloud-brain/issue-wait.sh <token> <id> <seq> --work` before anything else", "`… <seq of that submit> --left spec-review --no-round`. That is the one round you take", "<id> is at spec: a round was sent back"])
    expect([t, step.includes(t)]).toEqual([t, true]);
  // The count the spec's row R3 asks for: the lines of the brief that name the tool.
  const raw = readFileSync(process.env.SPEC_BRIEF || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents/spec.md"), "utf8");
  expect(raw.split("\n").filter((l) => l.includes("issue-wait.sh")).length).toBe(2);
  expect(spec).toMatch(/## A resumed round .*the first round after a submit is taken by the writer that waits for its review \(step 7\), with no message/);
});

test("SKILL.md: a writer that waits is not a writer at work, its run of two rounds has one cost event, and the watch names the submit", () => {
  const skill = flat(process.env.SKILL, "../../.claude/skills/brain-maintenance/SKILL.md");
  expect(skill).toMatch(/\*\*A writer that waits\.\*\*.*At `in-review` it is not counted as a writer at work; after the `rework` it is at work again\. In both it is still the agent on its issue/);
  // Since cm-5-the-loop-writes-the-event the run is a cost event, which has no field for the count of rounds.
  expect(skill).toMatch(/gets one event, when it reports: `round` the number of the first of the two, `event` the last submit/);
  expect(skill).toMatch(/No field says it was two: `issue\.cost` refuses a field it does not list, `rounds` among them/);
  expect(skill).toMatch(/`agent-usage\.ts --session <session> --agent <agentId>` with no `--last-run`/);
  // Since bk-6-skill-watch-and-stats the submit is the queue's entry `review`, and that line of the watch names it.
  expect(skill).toMatch(/issue-watch\.sh <your token>.*a writer that waits has not reported \(`os-4-writer-waits`\), so the line `QUEUE review` is how you learn its review is wanted/);
  expect(skill).toMatch(/A writer that waits for its review \(step 2, "A writer that waits"\) is running: it takes that round itself and is sent no message/);
});

test("SKILL.md: steps 2 and 3 read who waits from `waiter` of the queue's entry, and infer none from which agents reported", () => {
  const skill = flat(process.env.SKILL, "../../.claude/skills/brain-maintenance/SKILL.md");
  const two = skill.slice(skill.indexOf("**A writer that waits.**"), skill.indexOf("On trial: `plan/cloud-brain-loop-order-of-service.md`, part 5"));
  for (const t of ["a spec writer does the same after its submit (`agents/spec.md`, step 7)", "has `waiter: { actor, holder, until }` while the agent that started it has a live wait there",
    "You keep no list of who waits and infer none from which agents have reported", "an agent that died is believed until `until`, 25 minutes for one that listened and 60 for one at work on a round",
    "An agent spawned before that change has the brief of before it in its context and may wait with no wait in the record"]) expect([t, two.includes(t)]).toEqual([t, true]);
  expect(two).not.toContain("You read which writer waits from the tracker: an agent of yours that has not reported");
  const three = skill.slice(skill.indexOf("3. **Read the queue and take its entries in order.**"), skill.indexOf("4. **Spawn.**"));
  expect(three).toContain("for, since, late, hold, waiter }], waiting: [{ id, kind, state, why, on, until, waiter }], more }`");
  expect(three).toContain("an entry with `waiter` is that agent's, until `waiter.until`");
  expect(three).toMatch(/\| `round` \| With `waiter` on the entry: nothing\. The round is that agent's, a writer's or a spec writer's[^|]* Without: send the round to the agent that started it/);
  expect(three).toMatch(/\| `work`, and no agent of yours is on it \| With `waiter` on the entry: nothing, until `waiter\.until`\. Without: "A dead writer"/);
  expect(three).toMatch(/\*\*A spec sent back\.\*\* With `waiter` on its entry of the queue, nothing/);
  expect(skill).toContain("The queue's entry of its round has `waiter` (step 3, the row `round`). What follows is for an entry with none");
});
