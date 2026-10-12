// Question 3 of "A spec" in the reviewer's brief has the reviewer list the standing things a design adds and read, for
// each, the sentence of the spec that names what exists of the same job; one with no such sentence is a `no`.
// Issue reviewer-q3-reads-what-exists, the second half of the first action of the post mortem
// tools/cloud-brain/post-mortems/pm-second-summarizer-role.md. The writer's half is spec-brief-names-what-exists.test.ts.
//
//   bun test --timeout=30000 ./tests/tools/reviewer-brief-q3-what-exists.test.ts
// The brief is a file of the Brain. These tests read the copy kept beside them (reviewer-brief.ts, which has why):
// BRIEF=<file> reads a file in its place, BRAIN=<address> what that Brain serves now.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { briefOf } from "./reviewer-brief.ts";

const root = resolve(import.meta.dir, "../..");
const KINDS = ["a role and its brief", "a tool", "a token", "a Worker", "a method", "a store"];

// The part "A spec": the lines from its heading to the next heading of its level.
const part = async () => {
  const lines = (await briefOf()).split("\n");
  const from = lines.indexOf("## A spec");
  const to = lines.findIndex((l, i) => i > from && l.startsWith("## "));
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return lines.slice(from + 1, to);
};
// Question 3, whole: from its number to question 4's, joined, so that a wrapped line reads as one.
const q3 = async () => {
  const lines = await part();
  const from = lines.findIndex((l) => l.startsWith("3. "));
  const to = lines.findIndex((l) => l.startsWith("4. "));
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return lines.slice(from, to).join(" ").replace(/\s+/g, " ");
};

test("the part has one question 3, and it still asks for the smallest version and what was not chosen", async () => {
  expect((await part()).filter((l) => l.startsWith("3. ")).length).toBe(1);
  expect(await q3()).toStartWith("3. Is the smallest version that meets them the one proposed, and what was not chosen?");
});

test("question 3 has the reviewer list the standing things the design adds, by the six kinds", async () => {
  const q = await q3();
  const list = q.match(/List the standing things the design adds \(([^)]*)\)\./);
  expect(list).not.toBeNull();
  expect(list![1].split(", ")).toEqual(KINDS);
});

test("for each it reads the spec's sentence of what exists, or that nothing does with the search that showed it", async () => {
  const q = await q3();
  expect(q).toContain("For each, read the sentence of the spec that names what exists today that does the same job for the same purpose");
  expect(q).toContain('says under "Not chosen" why that is not extended');
  expect(q).toContain("or that nothing exists, with the search or the listing that showed it");
  expect(q).toContain("(step 5 of the spec writer's brief, `agents/spec.md`)");
});

test("a thing the design adds with no such sentence is a `no`", async () => {
  expect(await q3()).toContain("A thing the design adds with no such sentence is a `no` to this question.");
});

test("it names the review that answered yes and the post mortem, and the post mortem is a file", async () => {
  const q = await q3();
  expect(q).toContain('Review 4341 of `docs-summarised-for-search` answered "yes" from the twelve ways the spec listed');
  const pm = q.match(/`(tools\/cloud-brain\/post-mortems\/[a-z0-9-]+\.md)`/);
  expect(pm).not.toBeNull();
  expect(pm![1]).toBe("tools/cloud-brain/post-mortems/pm-second-summarizer-role.md");
  expect(readFileSync(resolve(root, pm![1]), "utf8")).toContain("pm-second-summarizer-role");
});

// The spec writer's brief is read as the checkout has it: the two texts are one rule, and name the same kinds.
test("the kinds of question 3 are the kinds of step 5 of the spec writer's brief", async () => {
  const spec = readFileSync(resolve(root, ".claude/skills/brain-maintenance/agents/spec.md"), "utf8").replace(/\s+/g, " ");
  const list = spec.match(/each standing thing the design adds \(([^)]*)\)/);
  expect(list).not.toBeNull();
  expect(list![1].split(", ")).toEqual(KINDS);
});
