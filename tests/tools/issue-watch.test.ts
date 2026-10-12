// issue-watch.sh: which events of an answer of `sync?after=` the watch prints. A line wakes the orchestrator.
// Issue os-1-owner-label, task 1 of plan/cloud-brain-loop-order-of-service.md. The label asks-orchestrator: issue asks-orchestrator-label-and-watch.
// A comment of an out- token: issue watch-prints-an-outside-sessions-comment.
//
//   bun test ./tests/tools/issue-watch.test.ts
//   ISSUE_WATCH_SH=/path/to/another/issue-watch.sh bun test …
// No call leaves the machine: `--filter <token>` reads the answer from stdin.
import { test, expect } from "bun:test";
import { readFileSync, writeFileSync, mkdtempSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const script = process.env.ISSUE_WATCH_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-watch.sh");
const me = "orch-aaaaaa";
const by = (holder: string, via = "delegation:0007ea9d1903") => ({ caller: "owner", via, holder: `secret:${holder}`, tab: false });
const opened = (seq: number, id: string, holder: string, labels: unknown = []) =>
  ({ seq, type: "opened", id, title: `title of ${id}`, body: "", kind: "task", labels, state: "open", by: by(holder) });
const watch = (events: unknown[], args = ["--filter", me]) => {
  const p = Bun.spawnSync(["bash", script, ...args], { stdin: Buffer.from(JSON.stringify({ events })) });
  return { code: p.exitCode, lines: p.stdout.toString().split("\n").filter(Boolean) };
};

test("an issue another token opened is a line; one the watch's own token opened is none", () => {
  const r = watch([opened(1, "theirs", "impl-bbbbbb"), opened(2, "mine", "orch-aaaaaa")]);
  expect(r.code).toBe(0);
  expect(r.lines).toEqual(["1 opened theirs impl-bbbbbb  title of theirs", "LAST 2"]);
});

test("an issue opened with the label owner is a line, though the watch's own token opened it", () => {
  const r = watch([opened(3, "asked", "orch-aaaaaa", ["infra", "owner"]), opened(4, "mine", "orch-aaaaaa", ["infra"])]);
  expect(r.lines).toEqual(["3 opened asked orch-aaaaaa  title of asked", "LAST 4"]);
});

test("the label is the name owner in a list: no other name, no part of a name, no string", () => {
  const not = [["owners"], ["needs-owner"], ["Owner"], "owner", null, [["owner"]], { owner: true }];
  const r = watch(not.map((l, i) => opened(10 + i, `n${i}`, "orch-aaaaaa", l)));
  expect(r.lines).toEqual(["LAST 16"]);
});

test("an issue another token opened with the label is one line, not two", () => {
  expect(watch([opened(5, "both", "impl-bbbbbb", ["owner"])]).lines).toEqual(["5 opened both impl-bbbbbb  title of both", "LAST 5"]);
});

test("a label put on later with the watch's own token is no line: the orchestrator made it", () => {
  const r = watch([{ seq: 8, type: "labelled", id: "x", add: ["owner"], remove: [], by: by("orch-aaaaaa") }]);
  expect(r.lines).toEqual(["LAST 8"]);
});

test("an event made with the owner's session is a line, whatever its type", () => {
  const r = watch([{ seq: 7, type: "commented", id: "x", body: "his words", by: { caller: "owner", via: "session", tab: true } }]);
  expect(r.lines).toEqual(["7 commented x OWNER  his words", "LAST 7"]);
});

// Issue os-4-writer-waits: a writer that waits for its review has not reported, so its submit is a line.
const move = (seq: number, id: string, m: unknown, to: string, holder: string) =>
  ({ seq, type: "moved", id, move: m, from: "x", to, reason: `reason of ${id}`, refs: [], by: by(holder) });

test("a submit and a submit-spec are a line each, whatever token made them, the watch's own too", () => {
  const r = watch([move(20, "a", "submit", "in-review", "impl-bbbbbb"), move(21, "b", "submit-spec", "spec-review", "spec-cccccc"),
    move(22, "c", "submit", "in-review", "orch-aaaaaa")]);
  expect(r.lines).toEqual(["20 moved a impl-bbbbbb in-review reason of a", "21 moved b spec-cccccc spec-review reason of b",
    "22 moved c orch-aaaaaa in-review reason of c", "LAST 22"]);
});

test("no other move is a line: it is the name of the move that is read, not the state it goes to", () => {
  const r = watch([move(30, "a", "start", "in-progress", "impl-bbbbbb"), move(31, "a", "rework", "in-progress", "rev-dddddd"),
    move(32, "a", "pass", "done", "rev-dddddd"), move(33, "a", "swap", "in-review", "impl-bbbbbb"), move(34, "a", "submits", "in-review", "impl-bbbbbb"),
    move(35, "a", ["submit"], "in-review", "impl-bbbbbb"), move(36, "a", null, "in-review", "impl-bbbbbb"),
    { seq: 37, type: "commented", id: "a", move: "submit", body: "x", by: by("impl-bbbbbb") }]);
  expect(r.lines).toEqual(["LAST 37"]);
});

test("a submit made with the owner's session is one line, not two", () => {
  const r = watch([{ ...move(40, "a", "submit", "in-review", "x"), by: { caller: "owner", via: "session", tab: true } }]);
  expect(r.lines).toEqual(["40 moved a OWNER in-review reason of a", "LAST 40"]);
});

test("an answer with no event prints nothing, and so does one that is not JSON", () => {
  expect(watch([]).lines).toEqual([]);
  const p = Bun.spawnSync(["bash", script, "--filter", me], { stdin: Buffer.from("not json") });
  expect([p.exitCode, p.stdout.toString()]).toEqual([0, ""]);
});

test("--filter with no token is refused", () => {
  expect(watch([opened(1, "theirs", "impl-bbbbbb")], ["--filter"]).code).not.toBe(0);
});

// Issue asks-orchestrator-label-and-watch: an agent that still runs asks the session with a label, and the watch prints it.
const labelled = (seq: number, id: string, holder: string, add: unknown, remove: unknown = []) =>
  ({ seq, type: "labelled", id, add, remove, by: by(holder) });

test("the label asks-orchestrator put on an issue is a line, whatever token put it on, the watch's own too", () => {
  const r = watch([labelled(50, "a", "impl-bbbbbb", ["asks-orchestrator"]), labelled(51, "b", "spec-cccccc", ["x", "asks-orchestrator"]),
    labelled(52, "c", "orch-aaaaaa", ["asks-orchestrator"])]);
  expect(r.lines).toEqual(["50 labelled a impl-bbbbbb ['asks-orchestrator'] ", "51 labelled b spec-cccccc ['x', 'asks-orchestrator'] ",
    "52 labelled c orch-aaaaaa ['asks-orchestrator'] ", "LAST 52"]);
});

test("the comment with the ask is no line, alone or before the label; the label after it is one", () => {
  const ask = { seq: 60, type: "commented", id: "a", key: "impl/a/ask-1", body: "asks-orchestrator: a go-ahead for the machine's pass", by: by("impl-bbbbbb") };
  expect(watch([ask]).lines).toEqual(["LAST 60"]);
  expect(watch([ask, labelled(61, "a", "impl-bbbbbb", ["asks-orchestrator"])]).lines).toEqual(["61 labelled a impl-bbbbbb ['asks-orchestrator'] ", "LAST 61"]);
});

test("the label taken off is no line, and no other label, part of the name, string or event type is read as it", () => {
  const not = [labelled(70, "a", "orch-aaaaaa", [], ["asks-orchestrator"]), labelled(71, "a", "impl-bbbbbb", [], ["asks-orchestrator"]),
    labelled(72, "a", "impl-bbbbbb", ["needs-owner"]), labelled(73, "a", "impl-bbbbbb", ["asks-orchestrator-2"]), labelled(74, "a", "impl-bbbbbb", ["asks"]),
    labelled(75, "a", "impl-bbbbbb", "asks-orchestrator"), labelled(76, "a", "impl-bbbbbb", [["asks-orchestrator"]]), labelled(77, "a", "impl-bbbbbb", null),
    labelled(78, "a", "impl-bbbbbb", { "asks-orchestrator": true }), labelled(79, "a", "impl-bbbbbb", ["Asks-Orchestrator"]),
    { seq: 80, type: "commented", id: "a", add: ["asks-orchestrator"], body: "x", by: by("impl-bbbbbb") },
    opened(81, "mine", "orch-aaaaaa", ["asks-orchestrator"])];
  expect(watch(not).lines).toEqual(["LAST 81"]);
});

test("the label put on with the owner's session is one line, not two", () => {
  const r = watch([{ ...labelled(90, "a", "x", ["asks-orchestrator"]), by: { caller: "owner", via: "session", tab: true } }]);
  expect(r.lines).toEqual(["90 labelled a OWNER ['asks-orchestrator'] ", "LAST 90"]);
});

// What cb4 answered for the label put on and taken off by a writer's token, events 5125 and 5126 of 2026-10-12 (the fields the filter reads, and key).
test("the two events cb4 recorded for a label put on and taken off: the first is a line", () => {
  const cb4 = (seq: number, key: string, add: string[], remove: string[]) => ({ seq, key, type: "labelled", id: "asks-orchestrator-label-and-watch",
    workflow: "5eb1623a624e13065bc38dc55a0ffbbf7466a6ccf88261c56ae3fa718fdac52c", add, remove,
    by: { caller: "owner", via: "delegation:25065a55573c", holder: "secret:impl-0f0bf1", tab: false } });
  const r = watch([cb4(5125, "impl/asks-orchestrator-label-and-watch/check-add-1", ["asks-orchestrator"], []),
    cb4(5126, "impl/asks-orchestrator-label-and-watch/check-remove-1", [], ["asks-orchestrator"])], ["--filter", "orch-d97e0e"]);
  expect(r.lines).toEqual(["5125 labelled asks-orchestrator-label-and-watch impl-0f0bf1 ['asks-orchestrator'] ", "LAST 5126"]);
});

// Issue watch-prints-an-outside-sessions-comment: a session outside the loop writes with a token out- and six hex digits
// (rules.md, "Which token"), and the owner may be in it. Its comment is a line.
const commented = (seq: number, id: string, holder: unknown, body = `words of ${seq}`, via = "delegation:931272f8f20c") =>
  ({ seq, type: "commented", id, key: `k/${seq}`, body, by: { caller: "owner", via, holder, tab: false } });

// Comment 4916 of fly-1-by-hand, as cb4 has it (the fields the filter reads, and key; the body is its first line).
test("the comment cb4 recorded from a session outside the loop, event 4916, is a line", () => {
  const owners = { seq: 4916, type: "commented", id: "fly-1-by-hand", key: "out/fly-1-by-hand/owner-idle-machine-1", body: "From a session with the owner",
    by: { caller: "owner", via: "delegation:931272f8f20c", holder: "secret:out-5f56b2", tab: false } };
  expect(watch([owners], ["--filter", "orch-d97e0e"]).lines).toEqual(["4916 commented fly-1-by-hand out-5f56b2  From a session with the owner", "LAST 4916"]);
});

test("a comment of an out- token is a line; a comment of a writer, a reviewer or the watch's own token is none", () => {
  const r = watch([commented(100, "a", "secret:out-0a1b2c"), commented(101, "a", "secret:impl-bbbbbb"), commented(102, "a", "secret:rev-dddddd"),
    commented(103, "a", "secret:orch-aaaaaa"), commented(104, "b", "secret:out-ffffff", "two\nlines")]);
  expect(r.lines).toEqual(["100 commented a out-0a1b2c  words of 100", "104 commented b out-ffffff  two lines", "LAST 104"]);
});

test("a watch given an out- token prints no comment of that token, and prints another out- token's", () => {
  const r = watch([commented(110, "a", "secret:out-0a1b2c"), commented(111, "a", "secret:out-ffffff")], ["--filter", "out-0a1b2c"]);
  expect(r.lines).toEqual(["111 commented a out-ffffff  words of 111", "LAST 111"]);
});

test("the name is out- and six hex digits, whole: no other length, case, prefix, role or type of holder is read as it", () => {
  const not = ["secret:out-abcde", "secret:out-abcdefa", "secret:out-ABCDEF", "secret:out-abcdeg", "secret:xout-abcdef", "secret:outside-abcdef",
    "secret:out-", "secret:out-abcdef ", "secret:out-abcdef\n", "out-abcdef", "session:out-abcdef", "secret:impl-abcdef", "secret:out-abcdef-2", "", null, 7,
    ["secret:out-abcdef"], { name: "secret:out-abcdef" }];
  const r = watch([...not.map((h, i) => commented(120 + i, "a", h)), { seq: 140, type: "commented", id: "a", body: "no holder", by: { caller: "owner", via: "delegation:x" } },
    { seq: 141, type: "commented", id: "a", body: "no by" }]);
  expect(r.lines).toEqual(["LAST 141"]);
});

test("no other event of an out- token is a line for its token: a move, a label, a link, a review", () => {
  const out = by("out-0a1b2c");
  const r = watch([{ ...move(150, "a", "start", "in-progress", "x"), by: out }, { ...labelled(151, "a", "x", ["needs-owner"]), by: out },
    { seq: 152, type: "linked", id: "a", rel: "related", to: "b", by: out }, { seq: 153, type: "reviewed", id: "a", verdict: "pass", body: "x", by: out }]);
  expect(r.lines).toEqual(["LAST 153"]);
});

test("a comment made with the owner's session is one line with OWNER, whatever holder it has", () => {
  const r = watch([commented(160, "a", "secret:out-0a1b2c", "his words", "session")]);
  expect(r.lines).toEqual(["160 commented a OWNER  his words", "LAST 160"]);
});

test("SKILL.md, step 8, has the comment of an out- token among what the watch prints", () => {
  const flat = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8").replace(/\s+/g, " ");
  expect(flat).toMatch(/issue-watch\.sh <your token>[^|]*for each comment written with a token `out-` and six hex digits, but the one the watch is given/);
  expect(flat).toMatch(/A line is a wake: read that issue and take it from the table of step 3, without a whole pass\. An agent's other writes print nothing/);
});

// SKILL=<file> and IMPLEMENTER=<file> read another copy (the files before the change).
test("SKILL.md has the row of the label above the in-progress rows, the watch's line in step 8 and the list in a whole pass", () => {
  const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8");
  const rows = skill.split("\n").filter((l) => l.trim().startsWith("|"));
  const at = rows.findIndex((l) => l.trim().startsWith("| labeled `asks-orchestrator`"));
  const first = rows.findIndex((l) => l.trim().startsWith("| `in-progress`"));
  expect(at).toBeGreaterThan(-1);
  expect(rows.filter((l) => l.trim().startsWith("| labeled `asks-orchestrator`")).length).toBe(1);
  expect(first).toBeGreaterThan(at);
  const row = rows[at];
  expect(row).toContain("Answer in this wake");
  expect(row).toContain(`"key":"orch/<id>/answer-<n>"`);
  expect(row).toContain(`"remove":["asks-orchestrator"]`);
  expect(row).toContain(`"list?label=asks-orchestrator&limit=100"`);
  expect(row.indexOf("answer-<n>")).toBeLessThan(row.indexOf(`"remove":["asks-orchestrator"]`));
  const flat = skill.replace(/\s+/g, " ");
  expect(flat).toMatch(/issue-watch\.sh <your token>[^|]*for each label `asks-orchestrator` put on an issue, whatever token put it on/);
  expect(flat).toMatch(/that wake is a whole pass, health first, with the read of `list\?label=asks-orchestrator`/);
});

test("the implementer's brief names the report first and the label for a run that cannot end, written by the tool", () => {
  const brief = readFileSync(process.env.IMPLEMENTER || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
  const from = brief.indexOf("\n## When you need the orchestrating session\n");
  expect(from).toBeGreaterThan(-1);
  const part = brief.slice(from + 1, brief.indexOf("\n## ", from + 1));
  const end = part.indexOf("**First choice: end the run.**"), label = part.indexOf("**The label `asks-orchestrator` is for a run that cannot end**");
  expect(end).toBeGreaterThan(-1);
  expect(label).toBeGreaterThan(end);
  const flat = part.replace(/\s+/g, " ");
  expect(flat).toMatch(/Stop what you started that is billed .* end with a report whose first line is the ask\. A report wakes the session/);
  // Since wait-says-what-runs-and-until-when the two writes are one call of issue-ask.sh (tests/tools/issue-ask.test.ts has their order).
  expect(part.indexOf("$W/tools/cloud-brain/issue-ask.sh <token> <id> <n> <minutes>")).toBeGreaterThan(label);
  expect(flat).toContain("One call makes the two writes, the comment first");
  expect(brief).toContain(`"When you need the orchestrating session", below.`);
});

// The read the brief gives a writer that waits: exit 0 while the label is on, 3 when it is off.
test("the brief's read of the label is exit 0 with the label on the issue, 3 without, and neither for an answer with no issue", () => {
  const brief = readFileSync(process.env.IMPLEMENTER || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
  const m = brief.match(/ia "get\?id=<id>" 2>\/dev\/null \| (python3 -I -c '[^\n]*')\n/);
  expect(m).not.toBeNull();
  const read = (labels: unknown) => Bun.spawnSync(["bash", "-c", m![1]], { stdin: Buffer.from(JSON.stringify({ issue: { labels }, events: [{ type: "labelled", add: ["asks-orchestrator"] }] })) }).exitCode;
  expect([read(["x", "asks-orchestrator"]), read([]), read(["asks-orchestrator-2"])]).toEqual([0, 3, 3]);
  const none = (text: string) => Bun.spawnSync(["bash", "-c", m![1]], { stdin: Buffer.from(text) }).exitCode;
  expect([none(""), none("not json"), none("{}")].every((c) => c !== 0 && c !== 3)).toBe(true);
});

// Issue wait-says-what-runs-and-until-when: an ask the session did not answer is printed again, from list?label=asks-orchestrator.
const MIN = 60000, NOW_MS = 1791840000000;
const listed = (id: string, seq: number, minutes: number, labels: unknown = ["asks-orchestrator"]) => ({ id, seq, labels, updated_at: NOW_MS - minutes * MIN, state: "in-progress" });
const still = (issues: unknown, now: string[] = [String(NOW_MS)]) => {
  const p = Bun.spawnSync(["bash", script, "--still", ...now], { stdin: Buffer.from(typeof issues === "string" ? issues : JSON.stringify({ issues, total: 0, more: false })) });
  return { code: p.exitCode, lines: p.stdout.toString().split("\n").filter(Boolean) };
};

test("an issue with the label and no event for 5 minutes is a line asks-still, with the minutes in fives; a younger one is none", () => {
  const r = still([listed("a", 40, 4.99), listed("b", 41, 5), listed("c", 42, 9.99), listed("d", 43, 10), listed("e", 44, 22), listed("f", 45, 0), listed("g", 46, -3)]);
  const tail = "min with the label asks-orchestrator and no event of the issue: answer it";
  expect(r.lines).toEqual([`41 asks-still b 5 ${tail}`, `42 asks-still c 5 ${tail}`, `43 asks-still d 10 ${tail}`, `44 asks-still e 20 ${tail}`]);
});

test("--still prints nothing for an issue without the label in a list, one with no updated_at, an answer that is not a list of issues, or no clock", () => {
  const not = [listed("a", 1, 9, []), listed("b", 2, 9, ["asks-orchestrator-2"]), listed("c", 3, 9, "asks-orchestrator"), listed("d", 4, 9, null),
    { id: "e", seq: 5, labels: ["asks-orchestrator"] }, { id: "f", seq: 6, labels: ["asks-orchestrator"], updated_at: "1" },
    { id: "g", seq: 7, labels: ["asks-orchestrator"], updated_at: true }, "h", null];
  expect(still(not).lines).toEqual([]);
  for (const text of ["", "not json", "[]", "{}", `{"issues":{"a":1}}`, `{"issues":null}`]) expect([text, still(text).lines]).toEqual([text, []]);
  expect(still([listed("a", 1, 9)], ["soon"]).lines).toEqual([]);
  expect(still([listed("a", 1, 9)], []).code).not.toBe(0);
});

// The loop itself, with a stand-in for issue-as.sh (ISSUE_AS_SH): no event in any read of sync, and a list with one issue
// labelled 6 minutes before. Read every second for 4 s: the line is printed once, not at each read.
test("the watch's loop prints an ask that is still on once for its 5 minutes, not at each read", () => {
  const dir = mkdtempSync(join(tmpdir(), "issue-watch-"));
  const sh = join(dir, "issue-as.sh");
  writeFileSync(sh, `#!/bin/bash
echo "$2" >> "${dir}/calls.log"
case "$2" in
  sync*) echo '{"events":[]}';;
  list\\?label=asks-orchestrator*) echo '{"issues":[{"id":"a","seq":9,"labels":["asks-orchestrator"],"updated_at":'$(( ($(date +%s) - 360) * 1000 ))'}]}';;
esac
echo " [200]" >&2
`);
  chmodSync(sh, 0o755);
  const p = Bun.spawnSync(["bash", script, me, "0", "1"], { env: { ...process.env, ISSUE_AS_SH: sh }, timeout: 4000 });
  expect(p.stdout.toString().split("\n").filter(Boolean)).toEqual(["9 asks-still a 5 min with the label asks-orchestrator and no event of the issue: answer it"]);
  const calls = readFileSync(join(dir, "calls.log"), "utf8").split("\n").filter(Boolean);
  expect(calls.filter((c) => c === "list?label=asks-orchestrator&limit=100").length).toBeGreaterThan(1);
  expect(calls.filter((c) => c.startsWith("sync?after=")).length).toBeGreaterThan(1);
});

test("SKILL.md and the brief name the line asks-still where they describe the watch", () => {
  const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8").replace(/\s+/g, " ");
  expect(skill).toMatch(/issue-watch\.sh <your token>[^|]*a line `<seq> asks-still <id> <N> min …` for each issue that has that label and has had no event for 5 minutes, once at each 5 minutes/);
  expect(skill).toContain("A line `asks-still` of the watch names an issue of this row");
  const brief = readFileSync(process.env.IMPLEMENTER || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents/implementer.md"), "utf8").replace(/\s+/g, " ");
  expect(brief).toContain("It prints a second line, `asks-still`, when the label is still on and the issue has had no event for 5 minutes.");
});

// SKILL=<file> and GUIDE=<file> read another copy of the procedure and of the guide (the files before the change).
test("SKILL.md says once what the owner's is, takes a project by it, and names the label where it describes the watch", () => {
  const skill = readFileSync(process.env.SKILL || resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/SKILL.md"), "utf8");
  const flat = skill.replace(/\s+/g, " ");
  expect(flat.split("**The owner's**").length - 1).toBe(1);
  expect(flat).toMatch(/\*\*The owner's\*\*[^|]*`by\.via` of its `opened` event is `session`\), or labeled `owner`/);
  const row = skill.split("\n").filter((l) => l.includes("kind `project` or `feature`, at `open`"));
  expect(row.length).toBe(1);
  expect(row[0]).toContain("with three parts or more, or the owner's |");
  expect(skill).not.toContain("or opened by the owner |");
  expect(flat).toMatch(/issue-watch\.sh <your token>[^|]*for each issue opened with the label `owner`, whatever token opened it/);
});

test("the guide for calling a Brain tells a session that opens an issue on the owner's word to put the label on", () => {
  const guide = readFileSync(process.env.GUIDE || resolve(import.meta.dir, "../../knowledge/calling-a-cloud-brain-from-this-checkout.md"), "utf8").replace(/\s+/g, " ");
  expect(guide).toMatch(/opens an issue on the owner's word puts `owner` in the `labels` of the open \(`"labels":\["owner"\]`/);
});
