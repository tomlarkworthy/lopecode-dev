// The record of pm-read-after-three gives counts of the first three post mortems, their nine actions, the approver's
// verdicts and the later searches. Each is computed here from the kept events (tests/tools/fixtures/pm-read-after-three.json)
// and looked for in the record as tests/tools/pm-read-after-three.ts prints it.
//
//   bun test --timeout=30000 ./tests/tools/pm-read-after-three.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load, report, summary, POST_MORTEMS } from "./pm-read-after-three";

const root = resolve(import.meta.dir, "../..");
const path = resolve(root, "tools/cloud-brain/records/pm-read-after-three.md");
const record = existsSync(path) ? readFileSync(path, "utf8") : "";
const s = summary();

test("the record has every line of the script, of the span the fixture has", () => {
  expect(record).toContain(`events ${load().from} to ${load().until}`);
  for (const l of report()) expect(record).toContain(l);
});

test("no post mortem was sent back: one review each, a pass, and no rework move", () => {
  expect(s.pms.map((p) => p.id)).toEqual(Object.keys(POST_MORTEMS));
  for (const p of s.pms) {
    expect(p.reviews.length).toBe(1);
    expect(p.reviews[0]).toStartWith("pass@");
    expect(p.reworks).toBe(0);
  }
  expect(record).toContain("None of the three was sent back");
});

test("the nine actions ended by a pass or an approve, two after a round sent back", () => {
  expect(s.actions.length).toBe(9);
  expect(s.actions.every((a) => a.last === "pass" || a.last === "approve")).toBe(true);
  expect(s.actions.filter((a) => a.reworks).map((a) => a.id)).toEqual(["philosophy-one-role-for-one-job", "approver-own-files-are-the-policy-cells"]);
});

test("the verdicts of the brief the post mortem read, and of the briefs after it, add up", () => {
  expect(s.examined.n + s.later.n).toBe(load().verdicts.length);
  expect(s.blobs.reduce((n, b) => n + b.n, 0)).toBe(load().verdicts.length);
  expect(s.examined).toEqual({ n: 13, approve: 2, leave: 11 });
  expect(s.later).toEqual({ n: 21, approve: 11, leave: 10 });
});

test("each issue whose writer's search names a post mortem is in the record with what the writer did with it", () => {
  expect(s.namedIssues).toBe(9);
  for (const n of s.named) expect(record).toContain(`| ${n.seq} | \`${n.id}\` |`);
  // a test file named for a post mortem is not counted
  expect(s.named.some((n) => n.id === "overseer-pre-put-run-names-four-files")).toBe(false);
});

test("the record says what was not tried and what was filed", () => {
  expect(record).toContain("## Not tried");
  expect(record).toContain("seen-pm-writer-reads-issue-once");
});
