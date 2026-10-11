// issue-watch.sh: which events of an answer of `sync?after=` the watch prints. A line wakes the orchestrator.
// Issue os-1-owner-label, task 1 of plan/cloud-brain-loop-order-of-service.md.
//
//   bun test ./tests/tools/issue-watch.test.ts
//   ISSUE_WATCH_SH=/path/to/another/issue-watch.sh bun test …
// No call leaves the machine: `--filter <token>` reads the answer from stdin.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

test("an answer with no event prints nothing, and so does one that is not JSON", () => {
  expect(watch([]).lines).toEqual([]);
  const p = Bun.spawnSync(["bash", script, "--filter", me], { stdin: Buffer.from("not json") });
  expect([p.exitCode, p.stdout.toString()]).toEqual([0, ""]);
});

test("--filter with no token is refused", () => {
  expect(watch([opened(1, "theirs", "impl-bbbbbb")], ["--filter"]).code).not.toBe(0);
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
