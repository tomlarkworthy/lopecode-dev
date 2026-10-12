// cost-events.ts: the `cost {…}` comments of the tracker's record entered again as `cost` events, each once.
// Issue cm-4-enter-the-runs-again, task 4 of plan/cloud-brain-run-cost-is-part-of-the-issue-model.md (R6).
//
//   bun test ./tests/tools/cost-events.test.ts
//   COST_EVENTS_TS=/path/to/another/cost-events.ts bun test …
// No call leaves the machine: the events are the list below, and the sender of `post` is a function here.
// The last three tests give the calls to `issueAct` of the tracker as the seed of this checkout has it
// (tools/cloud-brain/brain-issues.ojs, compiled here by needs.ts), and not as cloud-brain-dev/deploy/ has it: that copy
// is as old as the checkout's last `bun sync.ts` (issue cost-events-test-reads-stale-deploy).
import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { testNeedingSeed } from "./needs.ts";

const root = resolve(import.meta.dir, "../.."), tool = process.env.COST_EVENTS_TS || resolve(root, "tools/cloud-brain/cost-events.ts");
const { plan, checked, post, summary } = await import(tool);

const usage = (n: number) => ({ input: n, cacheWrite: 10 * n, cacheRead: 100 * n, output: 2 * n, requests: 3, advisor: { calls: 1, input: n, output: 1 } });
let seq = 0;
const comment = (id: string, body: string, more: any = {}) => ({ seq: ++seq, key: `k${seq}`, type: "commented", id, body, at: 1000 * seq, ...more });
const cost = (id: string, line: any, more: any = {}) => comment(id, "cost " + JSON.stringify(line), more);
const costUsage = (id: string, line: any) => comment(id, "cost-usage " + JSON.stringify(line));

// 1: a line with its usage inline, as the light reviewer's is.
const inline = cost("a", { role: "reviewer", round: 1, light: true, tokens: 61000, seconds: 300, usd: 1.25, tools: 12, event: 40, session: "s-1", token: "rev-51aa0e", outcome: "pass", usage: usage(5) });
// 2 and 3: a line with none, and the cost-usage comment that names it, which has the agent and the session.
const joined = cost("a", { role: "implementer", round: 1, tokens: 200000, seconds: 700, outcome: "in-review", event: 30, backfilled: true });
const itsUsage = costUsage("a", { of: joined.seq, role: "implementer", round: 1, backfilled: true, how: "matched by event 30", agent: "a1b2", session: "s-2", usage: usage(7) });
// 4 and 5: a line whose cost-usage has `agent: null`.
const nulled = cost("b", { role: "reviewer", round: 2, light: true, tokens: 50000, seconds: 250, outcome: "changes", session: "s-3" });
const nullUsage = costUsage("b", { of: nulled.seq, role: "reviewer", round: 2, backfilled: true, how: "session", agent: null, session: "s-3", usage: usage(9) });
// 6 and 7: a line already entered: a cost event of its issue has its seq as `of`.
const done = cost("b", { role: "implementer", round: 1, tokens: 150000, seconds: 600, outcome: "in-review" });
const doneEvent = { seq: ++seq, key: "cost/b/implementer/1", type: "cost", id: "b", role: "implementer", round: 1, how: "fresh", outcome: "in-review", seconds: 600, context: 150000, of: done.seq, at: 1000 * seq };
// 8: a resumed round with neither a usage nor a cost-usage.
const resumed = cost("b", { role: "implementer", round: 2, resumed: true, tokens: 90000, seconds: 280, outcome: "in-review", agent: "c3d4", session: "s-4" });
// 9: something said, and 10: a comment that quotes a cost line and does not begin with one.
const said = comment("a", "the cost of this was high"), quoted = comment("a", 'he wrote cost {"role":"reviewer"}');
const record = [inline, joined, itsUsage, nulled, nullUsage, done, doneEvent, resumed, said, quoted];

test("each kind of line becomes the call the spec gives, and the one entered already becomes none", () => {
  const p = plan(record);
  expect(p.comments).toBe(5);
  expect(p.entered).toBe(1);
  expect(p.left).toEqual([]);
  expect(p.passed).toEqual([]);
  expect(p.send).toEqual([
    { key: "cost/a/reviewer/1", id: "a", role: "reviewer", round: 1, how: "light", outcome: "pass", seconds: 300, context: 61000, tools: 12, event: 40, token: "rev-51aa0e", usd: 1.25, of: inline.seq, session: "s-1", usage: usage(5) },
    { key: "cost/a/implementer/1", id: "a", role: "implementer", round: 1, how: "fresh", outcome: "in-review", seconds: 700, context: 200000, event: 30, of: joined.seq, agent: "a1b2", session: "s-2", usage: usage(7), backfilled: true },
    { key: "cost/b/reviewer/2", id: "b", role: "reviewer", round: 2, how: "light", outcome: "changes", seconds: 250, context: 50000, of: nulled.seq, session: "s-3", usage: usage(9) },
    { key: "cost/b/implementer/2", id: "b", role: "implementer", round: 2, how: "resumed", outcome: "in-review", seconds: 280, context: 90000, of: resumed.seq, agent: "c3d4", session: "s-4" }
  ]);
  // `agent: null` is left out and not sent as null; the how and the backfilled of a cost-usage comment are not carried.
  expect("agent" in p.send[2]).toBe(false);
  expect("backfilled" in p.send[2]).toBe(false);
  expect(p.send.every((b: any) => !("tokens" in b) && !("light" in b) && !("resumed" in b))).toBe(true);
  expect(summary(p)).toBe("5 cost comments: 1 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 3 with a usage, 1 with a usd, 1 fresh, 1 resumed, 2 light; 4 to enter");
});

test("run again over a record that has the events, it enters none (R6)", () => {
  const p = plan(record);
  let at = 1000;
  const events = p.send.map((b: any) => { const { key, ...run } = b; return { seq: ++at, key, type: "cost", ...run, at }; });
  const again = plan([...record, ...events]);
  expect(again.send).toEqual([]);
  expect(again.entered).toBe(5);
  expect(summary(again)).toEndWith("; 0 to enter");
});

test("a cost event of another issue with the same `of` does not count as this comment's", () => {
  const other = { ...doneEvent, seq: 900, id: "a" };
  const p = plan(record.map((e) => (e === doneEvent ? other : e)));
  expect(p.entered).toBe(0);
  expect(p.send.map((b: any) => b.key)).toContain("cost/b/implementer/1");
});

test("a cost-usage comment of another issue is not this comment's usage", () => {
  const p = plan([joined, { ...itsUsage, id: "z" }]);
  expect("usage" in p.send[0]).toBe(false);
  expect("agent" in p.send[0]).toBe(false);
});

test("the usage and the names of the line are taken before those of its cost-usage comment", () => {
  const line = cost("c", { role: "reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass", agent: "mine", usage: usage(1) });
  const p = plan([line, costUsage("c", { of: line.seq, agent: "other", session: "theirs", usage: usage(2) })]);
  expect(p.send[0].usage).toEqual(usage(1));
  expect(p.send[0].agent).toBe("mine");
  expect(p.send[0].session).toBe("theirs");
});

test("a second comment of one issue, role and round is a correction under a key of its own", () => {
  const first = cost("d", { role: "reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass" });
  const second = cost("d", { role: "reviewer", round: 1, tokens: 3, seconds: 4, outcome: "pass" });
  expect(plan([first, second]).send.map((b: any) => [b.key, b.of])).toEqual([["cost/d/reviewer/1", first.seq], ["cost/d/reviewer/1/2", second.seq]]);
  // With the first entered, the second keeps its key.
  const entered = { seq: 2000, type: "cost", id: "d", role: "reviewer", round: 1, of: first.seq };
  expect(plan([first, second, entered]).send.map((b: any) => b.key)).toEqual(["cost/d/reviewer/1/2"]);
});

test("a comment is passed over when a cost event of its run has no `of`, or a later one", () => {
  const line = cost("e", { role: "implementer", round: 1, tokens: 1, seconds: 2, outcome: "in-review" });
  const direct = { seq: 3000, type: "cost", id: "e", role: "implementer", round: 1 };
  expect(plan([line, direct])).toMatchObject({ send: [], entered: 0, passed: [{ seq: line.seq, id: "e", by: 3000 }] });
  expect(plan([line, { ...direct, of: line.seq + 1 }]).passed.length).toBe(1);
  // An earlier comment's event, another round's, another role's and another issue's do not pass it over.
  for (const x of [{ ...direct, of: line.seq - 1 }, { ...direct, round: 2 }, { ...direct, role: "reviewer" }, { ...direct, id: "f" }, { ...direct, hidden: true }])
    expect(plan([line, x]).send.length).toBe(1);
});

test("what cannot be entered is left out with a line that says why, and is not sent", () => {
  const p = plan([
    comment("g", 'cost {"role":"reviewer",'),
    comment("g", "cost {} and more"),
    cost("g", { role: "reviewer", round: 1, seconds: 2, outcome: "pass" }),
    cost("g", { role: "reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass", cost: 4 }),
    cost("g", { role: "reviewer", round: 2, tokens: 1, seconds: 2, outcome: "pass", light: true, resumed: true }),
    cost("g", { role: "reviewer", round: 3, tokens: 1, seconds: 2, outcome: "pass" }, { hidden: true }),
    { seq: ++seq, id: "g", type: "commented", hidden: true }
  ]);
  expect(p.comments).toBe(5);
  expect(p.send).toEqual([]);
  expect(p.left.map((l: any) => l.why)).toEqual(["the body does not parse", "the body does not parse", "no tokens", "a field this tool does not carry: cost", "light and resumed both"]);
});

test("a false flag is as an absent one, and a value of the wrong type is carried for the tracker to refuse", () => {
  const p = plan([cost("h", { role: "reviewer", round: "2", tokens: 1, seconds: 2, outcome: "pass", light: false, resumed: false, backfilled: false, session: null, token: null, usage: null })]);
  expect(p.send).toEqual([{ key: "cost/h/reviewer/2", id: "h", role: "reviewer", round: "2", how: "fresh", outcome: "pass", seconds: 2, context: 1, of: seq }]);
});

test("post sends in order and stops at the first answer that is not a new event", () => {
  const send = plan(record).send, sent: string[] = [];
  expect(post(send, (b: any) => { sent.push(b.key); return { id: b.id, seq: 5000 + sent.length, event: {} }; })).toEqual({ sent: 4, stopped: null });
  expect(sent).toEqual(["cost/a/reviewer/1", "cost/a/implementer/1", "cost/b/reviewer/2", "cost/b/implementer/2"]);
  const answers = [{ seq: 1 }, { error: "Refused", message: "the guard refused" }, { seq: 3 }];
  let n = 0;
  expect(post(send, () => answers[n++])).toEqual({ sent: 1, stopped: { key: "cost/a/implementer/1", of: joined.seq, why: "the guard refused" } });
  expect(n).toBe(2);
  expect(post(send, () => ({ seq: 77, duplicate: true }))).toEqual({ sent: 0, stopped: { key: "cost/a/reviewer/1", of: inline.seq, why: "the tracker kept the key already, at event 77" } });
  expect(post(send, () => { throw new Error("curl: (28) timed out\nmore"); }).stopped.why).toBe("curl: (28) timed out");
  expect(post([], () => { throw new Error("not called"); })).toEqual({ sent: 0, stopped: null });
});

test("with no --token the tool exits 2 and names the flag", () => {
  for (const args of [[], ["--post"], ["--token", "--post"]]) {
    const r = spawnSync("bun", [tool, ...args], { encoding: "utf8" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("no --token; nothing was sent");
    expect(r.stdout).toBe("");
  }
});

// A stand-in for issue-as.sh: `sync` answers the events of record.json, a page of 500 at a time, with the cost events
// written so far after them; `cost` writes one, and answers `duplicate` for a key it has.
const standIn = (events: any[]) => {
  const dir = mkdtempSync(join(tmpdir(), "cost-events-"));
  writeFileSync(join(dir, "record.json"), JSON.stringify(events));
  writeFileSync(join(dir, "as.sh"), `#!/bin/bash
exec python3 - "$@" <<'PY'
import json, os, sys
d = os.path.dirname(os.path.abspath("${join(dir, "as.sh")}"))
record = json.load(open(os.path.join(d, "record.json")))
kept = os.path.join(d, "written.json")
written = json.load(open(kept)) if os.path.exists(kept) else []
record += written
open(os.path.join(d, "calls.log"), "a").write(" ".join(sys.argv[1:3]) + "\\n")
if sys.argv[2].startswith("sync?"):
    after = int(sys.argv[2].split("after=")[1].split("&")[0])
    print(json.dumps({"seq": len(record), "events": [e for e in record if e["seq"] > after][:500]}))
elif sys.argv[2] == "cost":
    b = json.loads(sys.argv[3])
    was = [e for e in written if e["key"] == b["key"]]
    if was: print(json.dumps({"id": b["id"], "seq": was[0]["seq"], "duplicate": True}))
    elif b.get("round") == 99: print(json.dumps({"error": "Refused", "message": "the workflow's guard refused it"}))
    else:
        e = {**b, "type": "cost", "seq": max(x["seq"] for x in record) + 1}
        json.dump(written + [e], open(kept, "w"))
        print(json.dumps({"id": b["id"], "seq": e["seq"], "event": e}))
PY
`, { mode: 0o755 });
  const run = (...args: string[]) => {
    const r = spawnSync("bun", [tool, "--token", "impl-000000", ...args], { encoding: "utf8", env: { ...process.env, ISSUE_AS_SH: join(dir, "as.sh") } });
    return { status: r.status, lines: r.stdout.trim().split("\n"), err: r.stderr };
  };
  const written = () => (existsSync(join(dir, "written.json")) ? JSON.parse(readFileSync(join(dir, "written.json"), "utf8")) : []);
  return { run, written, calls: () => readFileSync(join(dir, "calls.log"), "utf8").trim().split("\n") };
};

test("the tool as run: it prints the calls and sends none; with --post it sends them; run again, 0 to enter", () => {
  // 600 events before the fixed list, so that the record is read in two pages.
  const filler = Array.from({ length: 600 }, (_, i) => ({ seq: i + 1, type: "commented", id: "filler", body: "said" }));
  const s = standIn([...filler, ...record.map((e) => ({ ...e, seq: e.seq + 600, ...(e.type === "cost" ? { of: e.of + 600 } : {}), body: e.body?.replace(/"of":(\d+)/, (_: string, n: string) => `"of":${+n + 600}`) }))]);
  const dry = s.run();
  expect(dry.status).toBe(0);
  expect(dry.lines.length).toBe(5);
  expect(dry.lines.slice(0, 4).map((l) => JSON.parse(l).key)).toEqual(["cost/a/reviewer/1", "cost/a/implementer/1", "cost/b/reviewer/2", "cost/b/implementer/2"]);
  expect(JSON.parse(dry.lines[1]).usage).toEqual(usage(7));
  expect(dry.lines[4]).toBe(`at event ${600 + record.at(-1)!.seq}, 0 events hidden to impl-000000; 5 cost comments: 1 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 3 with a usage, 1 with a usd, 1 fresh, 1 resumed, 2 light; 4 to enter`);
  expect(s.written()).toEqual([]);
  expect(s.calls()).toEqual(["impl-000000 sync?after=0&limit=500", "impl-000000 sync?after=500&limit=500"]);

  const sent = s.run("--post");
  expect(sent.status).toBe(0);
  expect(sent.lines.at(-1)).toBe("posted 4 of 4");
  expect(s.written().map((e: any) => [e.key, e.of])).toEqual([["cost/a/reviewer/1", inline.seq + 600], ["cost/a/implementer/1", joined.seq + 600], ["cost/b/reviewer/2", nulled.seq + 600], ["cost/b/implementer/2", resumed.seq + 600]]);

  const again = s.run("--post");
  expect(again.status).toBe(0);
  expect(again.lines.at(-2)).toEndWith("5 entered already, 0 passed over for a later cost event, 0 left out; of those to enter, 0 with a usage, 0 with a usd, 0 fresh, 0 resumed, 0 light; 0 to enter");
  expect(again.lines.at(-1)).toBe("posted 0 of 0");
  expect(s.written().length).toBe(4);
});

test("the tool as run: a refusal stops the sending, exit 1, and a comment left out is exit 1 with its line", () => {
  const line = (round: number) => cost("j", { role: "reviewer", round, tokens: 1, seconds: 2, outcome: "pass" });
  const s = standIn([line(1), line(99), line(3)]);
  const r = s.run("--post");
  expect(r.status).toBe(1);
  expect(r.lines.slice(-2)).toEqual([`stopped at cost/j/reviewer/99, comment ${seq - 1}: the workflow's guard refused it`, "posted 1 of 3"]);
  expect(s.written().map((e: any) => e.key)).toEqual(["cost/j/reviewer/1"]);

  const t = standIn([line(1), comment("j", "cost {nothing")]);
  const dry = t.run();
  expect(dry.status).toBe(1);
  expect(dry.lines[1]).toBe(`left out: comment ${seq} of j: the body does not parse`);
  expect(dry.lines[2]).toEndWith("2 cost comments: 0 entered already, 0 passed over for a later cost event, 1 left out; of those to enter, 0 with a usage, 0 with a usd, 1 fresh, 0 resumed, 0 light; 1 to enter");
});

const { test: withTracker, module: tracker } = await testNeedingSeed("cost-events.test.ts, its three tests with issueAct", "brain-issues.ojs");
const issueAct = async () => {
  const { importNotebookModule } = await import(resolve(root, "tools/notebook-import.ts"));
  return (await importNotebookModule(tracker, { overrides: { checkedRule: () => { throw new Error("no rule is checked here"); } } })).value("issueAct");
};

withTracker("the tracker's own shape check takes each call made from the fixed list", async () => {
  expect(checked(plan(record).send, await issueAct())).toEqual([]);
});

withTracker("the tool as run with --check: a refused body is named, exit 1, and --post then sends nothing", () => {
  const s = standIn([cost("k", { role: "reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass" }), cost("k", { role: "reviewer", round: 2, tokens: 1.5, seconds: 2, outcome: "pass" })]);
  const r = s.run("--check", tracker, "--post");
  expect(r.status).toBe(1);
  expect(r.lines[0]).toStartWith(`refused by issueAct: cost/k/reviewer/2, comment ${seq}: context`);
  expect(r.lines[1]).toBe(`checked with issueAct of ${tracker}: 1 taken, 1 refused`);
  expect(r.lines.length).toBe(3);
  expect(s.written()).toEqual([]);
  const ok = standIn([cost("k", { role: "reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass" })]).run("--check", tracker);
  expect(ok.status).toBe(0);
  expect(ok.lines[1]).toBe(`checked with issueAct of ${tracker}: 1 taken, 0 refused`);
});

withTracker("and refuses, with the field named, a call made from a line of the wrong type", async () => {
  const p = plan([
    cost("i", { role: "reviewer", round: "2", tokens: 1, seconds: 2, outcome: "pass" }),
    cost("i", { role: "Reviewer", round: 1, tokens: 1, seconds: 2, outcome: "pass" }),
    cost("i", { role: "reviewer", round: 3, tokens: 1, seconds: 2, outcome: "pass", usage: { input: 1 } }),
    cost("i", { role: "reviewer", round: 4, tokens: 1, seconds: 2, outcome: "pass" })
  ]);
  const refused = checked(p.send, await issueAct());
  expect(refused.map((r: any) => r.key)).toEqual(["cost/i/reviewer/2", "cost/i/Reviewer/1", "cost/i/reviewer/3"]);
  expect(refused.map((r: any) => r.why.split(":")[0])).toEqual(["round", "role", "usage"]);
});
