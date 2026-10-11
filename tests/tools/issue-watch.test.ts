// issue-watch.sh: which events of an answer of `sync?after=` the watch prints. A line wakes the orchestrator.
// Issue os-1-owner-label, task 1 of plan/cloud-brain-loop-order-of-service.md.
//
//   bun test ./tests/tools/issue-watch.test.ts
//   ISSUE_WATCH_SH=/path/to/another/issue-watch.sh bun test …
// No call leaves the machine: `--filter <token>` reads the answer from stdin.
import { test, expect } from "bun:test";
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
