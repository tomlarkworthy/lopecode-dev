// The guide an agent reads before its first brain.ts call tells a session outside the issue loop to make itself a
// token, `brain.ts agent-token out`, before its first write to the tracker, in place of a role's token. Until this
// task it told every writer to use "its role's token", and named no command for a session the loop did not start.
// Task 5 of plan/cloud-brain-record-names-token-not-agent.md; issue ta-5-outside-session-doc.
//
//   bun test ./tests/tools/ta-5-outside-session-doc.test.ts
//   GUIDE=<file> reads another copy of the guide (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const guide = readFileSync(process.env.GUIDE || resolve(root, "knowledge/calling-a-cloud-brain-from-this-checkout.md"), "utf8");
const flat = (s: string) => s.replace(/\s+/g, " ");
// From the bold lead of the paragraph to the next part of the guide, the health check.
const from = guide.indexOf("**A session outside the loop"), to = guide.indexOf("A health check that takes");
const part = from >= 0 && to > from ? guide.slice(from, to) : "";

test("the guide has a part for a session outside the loop, before the health check", () => {
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  expect(guide.split("**A session outside the loop").length - 1).toBe(1);
});

test("it gives the command, says when, and says in place of what", () => {
  expect(part).toMatch(/^BRAIN_BASE=cb4 bun tools\/cloud-brain\/brain\.ts agent-token out "[^"]+"/m);
  expect(flat(part)).toContain("before its first write to the tracker");
  expect(flat(part)).toMatch(/not with a role's token \(`issues-implementer-2`, `issues-reviewer-2`, `issues-overseer-1`\)/);
});

test("it shows a write with the token made, and how the token is ended", () => {
  expect(part).toMatch(/^tools\/cloud-brain\/issue-as\.sh out-\S+ comment '\{"key":"out\//m);
  expect(part).toMatch(/^BRAIN_BASE=cb4 bun tools\/cloud-brain\/brain\.ts agent-token revoke out-\S+/m);
});

test("the guide no longer sends a writer to its role's token", () => {
  expect(flat(guide)).not.toContain("with its role's token");
  expect(flat(guide)).toMatch(/An agent of the issue loop writes through `tools\/cloud-brain\/issue-as\.sh` with the token its prompt names/);
});

// os-1-owner-label put this sentence in a paragraph of its own, "An issue the owner asked for", while this task was held
// (comment 2715 of the issue). It is for a session outside the loop, and is in that part now.
test("the label owner, for an issue opened on the owner's word, is said in that part and has no paragraph of its own", () => {
  expect(flat(part)).toMatch(/opens an issue on the owner's word puts `owner` in the `labels` of the open \(`"labels":\["owner"\]`/);
  expect(guide).not.toContain("**An issue the owner asked for.**");
});

test("what the guide says the command does is what brain.ts has: the roles, the parent, the hours, the file", () => {
  const tool = readFileSync(resolve(root, "tools/cloud-brain/brain.ts"), "utf8");
  expect(tool).toMatch(/const ROLES = \[[^\]]*"out"\], PARENT = "loop-agents", HOURS = 48;/);
  expect(tool).toContain('const AGENTS = BASE + "-agent-tokens.json";');
  expect(flat(part)).toContain("`loop-agents`");
  expect(flat(part)).toContain("48 hours");
  expect(flat(part)).toContain("`.emitted/cb4-agent-tokens.json`");
});
