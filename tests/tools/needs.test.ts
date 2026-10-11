// A checkout that lacks what a test reads gets that test skipped by name, never failed.
// Issue tests-tools-fail-in-a-fresh-worktree: `bun test ./tests/tools` gave 1 fail in a worktree fresh from worktree.sh
// (no build for issue-lock-sql.test.ts) and 4 in a plain `git worktree add` (no cloud-brain-dev either).
//
//   bun test ./tests/tools/needs.test.ts
// The three files are run as they are, each pointed at a place that has nothing.
import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { BUILT, COMMITTED, notebookOf } from "./needs.ts";

const here = import.meta.dir;
const none = resolve(here, "no-such-place");
const run = (file: string, env: Record<string, string>, ...more: string[]) => {
  const p = Bun.spawnSync(["bun", "test", `./${file}`, ...more], { cwd: here, env: { ...process.env, ...env } });
  const out = p.stdout.toString() + p.stderr.toString();
  const n = (word: string) => Number(out.match(new RegExp(`^\\s*(\\d+) ${word}$`, "m"))?.[1] ?? 0);
  return { code: p.exitCode, out, pass: n("pass"), skip: n("skip"), fail: n("fail"), errors: n("errors?") };
};

test("the notebook: the one named, a worktree's build when it has one, the committed one otherwise", () => {
  expect(notebookOf({ worktree: true, built: false })).toBe(COMMITTED);
  expect(notebookOf({ worktree: true, built: true })).toBe(BUILT);
  expect(notebookOf({ worktree: false, built: true })).toBe(COMMITTED);
  expect(notebookOf({ worktree: false, built: false })).toBe(COMMITTED);
  expect(notebookOf({ named: "x.html", worktree: true, built: true })).toBe("x.html");
  expect(notebookOf({ named: "", worktree: true, built: false })).toBe(COMMITTED);
});

test("issue-lock-sql.test.ts with no notebook: every test skipped, none failed, and a line names the notebook", () => {
  const r = run("issue-lock-sql.test.ts", { BRAIN_NOTEBOOK: resolve(none, "cloud-brain.html") });
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.skip).toBeGreaterThan(0);
  expect(r.out).toContain(`skipped: issue-lock-sql.test.ts: no ${resolve(none, "cloud-brain.html")}`);
}, 60000);

test("light-agent.test.ts with no cloud-brain-dev: every test skipped, none failed, and a line names agent.sh and put.sh", () => {
  const r = run("light-agent.test.ts", { CLOUD_BRAIN_DEV: none });
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.skip).toBeGreaterThan(0);
  expect(r.out).toContain(`skipped: light-agent.test.ts: no ${resolve(none, "agent.sh")}, ${resolve(none, "put.sh")}`);
}, 60000);

test("reviewer-brief-names-token.test.ts, its test of agent.sh, with no cloud-brain-dev: skipped, and a line names agent.sh", () => {
  const r = run("reviewer-brief-names-token.test.ts", { CLOUD_BRAIN_DEV: none }, "-t", "agent.sh sends");
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.out).toContain(`skipped: reviewer-brief-names-token.test.ts, its test of agent.sh: no ${resolve(none, "agent.sh")}`);
}, 60000);
