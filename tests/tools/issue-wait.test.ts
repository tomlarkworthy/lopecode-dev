// issue-wait.sh: a writer's wait for its own review. Issue os-4-writer-waits, task 4 of
// plan/cloud-brain-loop-order-of-service.md (part 5).
//
//   bun test ./tests/tools/issue-wait.test.ts
//   ISSUE_WAIT_SH=/path/to/another/issue-wait.sh bun test …
// No call leaves the machine: `--filter` reads one answer from stdin, and the waits call a stand-in for issue-as.sh
// (ISSUE_AS_SH) that gives the files 1.json, 2.json, … of a directory, the last one again after that, and
// writes each call's arguments to calls.log. ISSUE_WAIT_EVERY and ISSUE_WAIT_MOVE make the tool's 15 s and 30 s short. IMPLEMENTER= and SKILL= read another copy of the two texts.
import { test, expect } from "bun:test";
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

const filter = (events: unknown, args: string[]) => {
  const p = Bun.spawnSync(["bash", script, "--filter", ...args], { stdin: Buffer.from(typeof events === "string" ? events : JSON.stringify({ seq: 0, events })) });
  return { code: p.exitCode, out: lines(p.stdout.toString()).map((l) => JSON.parse(l)) };
};

// A stand-in for issue-as.sh. `answers` are bodies (an object is written as JSON); `status` is what stderr ends with.
const fake = (answers: unknown[], opts: { exit?: number; status?: string } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), "issue-wait-"));
  answers.forEach((a, i) => writeFileSync(join(dir, `${i + 1}.json`), typeof a === "string" ? a : JSON.stringify(a)));
  const sh = join(dir, "issue-as.sh");
  writeFileSync(sh, `#!/bin/bash
d="${dir}"
n=$(( $(cat "$d/n" 2>/dev/null || echo 0) + 1 )); echo $n > "$d/n"
echo "$*" >> "$d/calls.log"
while [ $n -gt 1 ] && [ ! -f "$d/$n.json" ]; do n=$((n-1)); done
[ -f "$d/$n.json" ] && cat "$d/$n.json"
echo " [${opts.status ?? "200"}]" >&2
exit ${opts.exit ?? 0}
`);
  chmodSync(sh, 0o755);
  return { sh, calls: () => (existsSync(join(dir, "calls.log")) ? lines(readFileSync(join(dir, "calls.log"), "utf8")) : []) };
};
const wait = (f: { sh: string }, args: string[], every = "0.05") => {
  const t = Date.now();
  const p = Bun.spawnSync(["bash", script, ...args], { env: { ...process.env, ISSUE_AS_SH: f.sh, ISSUE_WAIT_EVERY: every } });
  return { code: p.exitCode, out: lines(p.stdout.toString()), err: p.stderr.toString(), ms: Date.now() - t };
};
const answer = (events: unknown[], more: object = {}) => ({ seq: 0, wait: 5000, events, ...more });

test("--filter: the first review of the issue after the seq, then the move after it; another issue's are not read", () => {
  const ev = [reviewed(10, "mine", "pass"), moved(11, "mine", "rework", "in-progress"), moved(12, "mine", "submit", "in-review"),
    reviewed(13, "theirs"), moved(14, "theirs", "rework", "in-progress"), commented(15, "mine"),
    reviewed(16, "mine"), commented(17, "mine"), moved(18, "theirs", "submit", "in-review"), moved(19, "mine", "rework", "in-progress"), reviewed(20, "mine", "pass")];
  const r = filter(ev, ["mine", "12"]);
  expect(r.code).toBe(0);
  expect(r.out.map((e) => [e.seq, e.type, e.verdict ?? e.to])).toEqual([[16, "reviewed", "changes"], [19, "moved", "in-progress"]]);
  expect(r.out[0].body).toBe(`changes\n\n1. a finding's "words"`);
  expect(filter(ev, ["mine"]).out.map((e) => e.seq)).toEqual([10, 11]);
  expect(filter(ev, ["mine", "16"]).out.map((e) => e.seq)).toEqual([20]);
});

test("--filter: a review with no move after it is one line; no review is exit 3 and nothing", () => {
  expect(filter([reviewed(5, "mine")], ["mine", "4"])).toEqual({ code: 0, out: [reviewed(5, "mine")] });
  expect(filter([moved(5, "mine", "rework", "in-progress"), reviewed(6, "theirs")], ["mine", "4"])).toEqual({ code: 3, out: [] });
  expect(filter([reviewed(5, "mine")], ["mine", "5"])).toEqual({ code: 3, out: [] });
  expect(filter([], ["mine", "0"])).toEqual({ code: 3, out: [] });
  expect(filter("not json", ["mine", "0"])).toEqual({ code: 3, out: [] });
  expect(filter(`{"events":"x"}`, ["mine", "0"])).toEqual({ code: 3, out: [] });
});

test("the arguments: no id, an id that is no id, a seq or seconds that is no whole number are exit 64 with no call", () => {
  const f = fake([answer([])]);
  for (const a of [[], ["tok"], ["tok", "mine"], ["tok", "mine", "x"], ["tok", "mine", "-1"], ["tok", "mine", "1.5"], ["tok", "Mine?", "1"],
    ["tok", "mine", "1", "soon"], ["tok", "mine", "1", "2", "3"], ["", "mine", "1"], ["--filter"], ["--filter", "mine", "x"]])
    expect([a, wait(f, a).code]).toEqual([a, 64]);
  expect(f.calls()).toEqual([]);
});

test("it reads sync?after= from the seq it was given, then from the last seq it read, and exits 0 at the review and its move", () => {
  const f = fake([answer([]), answer([commented(8, "mine"), reviewed(9, "theirs")]), "upstream said no", answer([reviewed(12, "mine")]), answer([]),
    answer([commented(13, "theirs"), moved(14, "mine", "rework", "in-progress"), moved(15, "mine", "submit", "in-review")])]);
  const r = wait(f, ["impl-aaaaaa", "mine", "7", "20"]);
  expect(r.code).toBe(0);
  expect(r.out.map((l) => JSON.parse(l).seq)).toEqual([12, 14]);
  expect(f.calls()).toEqual(["impl-aaaaaa sync?after=7", "impl-aaaaaa sync?after=7", "impl-aaaaaa sync?after=9", "impl-aaaaaa sync?after=9",
    "impl-aaaaaa sync?after=12", "impl-aaaaaa sync?after=12"]);
  expect(f.calls().every((c) => c.split(" ").length === 2)).toBe(true); // a read: no body is ever sent
});

test("no review in the seconds is exit 3 with nothing printed, and it has gone on asking", () => {
  const f = fake([answer([commented(8, "mine"), moved(9, "mine", "rework", "in-progress")])]);
  const r = wait(f, ["impl-aaaaaa", "mine", "7", "1"]);
  expect([r.code, r.out, r.err]).toEqual([3, [], ""]);
  expect(r.ms).toBeGreaterThan(900);
  expect(r.ms).toBeLessThan(5000);
  expect(f.calls().length).toBeGreaterThan(3);
  expect(f.calls()[1]).toBe("impl-aaaaaa sync?after=9");
});

test("answers that are not read are counted on stderr, and the wait still ends at its time", () => {
  const f = fake(["<html>502</html>"]);
  const r = wait(f, ["impl-aaaaaa", "mine", "7", "1"], "0.2");
  expect([r.code, r.out]).toEqual([3, []]);
  expect(r.err).toMatch(/^issue-wait\.sh: (\d+) of \1 calls gave no answer that was read\n$/);
});

test("a full answer of 200 events is followed at once by the next call, with no sleep between", () => {
  const page = Array.from({ length: 200 }, (_, i) => commented(100 + i, "theirs"));
  const f = fake([answer(page), answer([reviewed(300, "mine", "pass"), moved(301, "mine", "pass", "done")])]);
  const r = wait(f, ["impl-aaaaaa", "mine", "99", "20"], "10");
  expect(r.code).toBe(0);
  expect(r.out.map((l) => JSON.parse(l).seq)).toEqual([300, 301]);
  expect(f.calls()).toEqual(["impl-aaaaaa sync?after=99", "impl-aaaaaa sync?after=299"]);
  expect(r.ms).toBeLessThan(5000);
});

test("a review whose move does not come is exit 0 with one line, after the time the tool waits for the move", () => {
  const f = fake([answer([reviewed(12, "mine")]), answer([commented(13, "mine"), moved(14, "theirs", "rework", "in-progress")])]);
  const p = Bun.spawnSync(["bash", script, "impl-aaaaaa", "mine", "7", "20"], { env: { ...process.env, ISSUE_AS_SH: f.sh, ISSUE_WAIT_EVERY: "0.05", ISSUE_WAIT_MOVE: "1" } });
  expect(p.exitCode).toBe(0);
  expect(lines(p.stdout.toString()).map((l) => JSON.parse(l).seq)).toEqual([12]);
  expect(f.calls().length).toBeGreaterThan(3);
  expect(f.calls().at(-1)).toBe("impl-aaaaaa sync?after=14");
});

test("seconds of 0 makes no call and is exit 3", () => {
  const f = fake([answer([reviewed(12, "mine")])]);
  expect(wait(f, ["impl-aaaaaa", "mine", "7", "0"]).code).toBe(3);
  expect(f.calls()).toEqual([]);
});

test("a seq past the tracker's last event is read as the last event's, and stderr says so", () => {
  const f = fake([answer([], { seq: 40, reset: true }), answer([reviewed(41, "mine", "pass"), moved(42, "mine", "pass", "done")], { seq: 42 })]);
  const r = wait(f, ["impl-aaaaaa", "mine", "99999", "20"]);
  expect(r.code).toBe(0);
  expect(r.out.map((l) => JSON.parse(l).seq)).toEqual([41, 42]);
  expect(r.err).toBe("issue-wait.sh: after 99999 is past the last event, 40; reading from 40\n");
  expect(f.calls()).toEqual(["impl-aaaaaa sync?after=99999", "impl-aaaaaa sync?after=40"]);
});

test("a token that is not kept, and a read that is refused, are exit 2 after one call", () => {
  const none = fake([], { exit: 2 });
  const r = wait(none, ["impl-nobody", "mine", "7", "20"]);
  expect([r.code, r.out, none.calls().length]).toEqual([2, [], 1]);
  for (const status of ["401", "403"]) {
    const f = fake([`{"error":"Unauthorized"}`], { status });
    const x = wait(f, ["impl-aaaaaa", "mine", "7", "20"]);
    expect([x.code, x.out, f.calls().length]).toEqual([2, [], 1]);
    expect(x.err).toContain(`[${status}]`);
  }
  const busy = fake([`{"error":"UpstreamFailed"}`], { status: "502" });
  expect(wait(busy, ["impl-aaaaaa", "mine", "7", "1"], "0.2").code).toBe(3);
});

const flat = (env: string | undefined, path: string) => readFileSync(env || resolve(import.meta.dir, path), "utf8").replace(/\s+/g, " ");

test("the writer's brief has the wait as step 13: the command, the timeout, five runs, one round, and what one line means", () => {
  const brief = flat(process.env.IMPLEMENTER, "../../.claude/skills/brain-maintenance/agents/implementer.md");
  const step = brief.slice(brief.indexOf("13. **Wait for your review"), brief.indexOf("## A resumed round"));
  expect(step).toContain("tools/cloud-brain/issue-wait.sh <token> <id> <seq of your submit>");
  expect(step).toContain("with the Bash `timeout` at 280000");
  expect(step).toContain("up to 5 runs in all (20 minutes)");
  expect(step).toContain("That is the one round you take: after a second `changes`, report.");
  expect(step).toMatch(/`"verdict":"changes"` and one line: [^.]*`rework` move was not read\. Start nothing on the verdict alone/);
  expect(step).toContain("Still `in-review`: report that");
  expect(step).toContain("3 `rework` moves or more");
  expect(brief).toMatch(/## A resumed round A round you take yourself after step 13 is a resumed round too/);
});

test("SKILL.md: a writer that waits is not a writer at work, its run of two rounds has one cost event, and the watch names the submit", () => {
  const skill = flat(process.env.SKILL, "../../.claude/skills/brain-maintenance/SKILL.md");
  expect(skill).toMatch(/\*\*A writer that waits\.\*\*.*At `in-review` it is not counted as a writer at work; after the `rework` it is at work again\. In both it is still the agent on its issue/);
  // Since cm-5-the-loop-writes-the-event the run is a cost event, which has no field for the count of rounds.
  expect(skill).toMatch(/gets one event, when it reports: `round` the number of the first of the two, `event` the last submit/);
  expect(skill).toMatch(/No field says it was two: `issue\.cost` refuses a field it does not list, `rounds` among them/);
  expect(skill).toMatch(/`agent-usage\.ts --session <session> --agent <agentId>` with no `--last-run`/);
  expect(skill).toMatch(/issue-watch\.sh <your token>.*for each `submit` and `submit-spec` move, whatever token made it/);
  expect(skill).toMatch(/A writer that waits for its review \(step 2, "A writer that waits"\) is running: it takes that round itself and is sent no message/);
});
