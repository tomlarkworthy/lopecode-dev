// Step 5 of the spec writer's brief asks, of each standing thing a design adds, what exists today of the same job
// and why it is not extended (spec-names-what-exists-of-the-job, from the post mortem
// tools/cloud-brain/post-mortems/pm-second-summarizer-role.md). The brief is read as it is.
// The reviewer's question 3 is a file of the Brain and is not held here: the record says why.
//
//   bun test ./tests/tools/spec-brief-names-what-exists.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const brief = () => readFileSync(resolve(root, ".claude/skills/brain-maintenance/agents/spec.md"), "utf8");

// Step 5: from its heading to step 6's. Lines are joined, so a phrase may be wrapped in the file.
const step5 = () => {
  const text = brief();
  const from = text.indexOf("\n5. **Write the spec**");
  const to = text.indexOf("\n6. **Land it**");
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return text.slice(from, to).replace(/\s+/g, " ");
};
// The item of step 5 that has the design: from its dash to the next item's.
const design = () => {
  const step = step5();
  const from = step.indexOf(" - the smallest design that meets the requirements");
  const to = step.indexOf(" - how each requirement will be known to be met");
  expect(from).toBeGreaterThan(0);
  expect(to).toBeGreaterThan(from);
  return step.slice(from, to);
};

test("the item of the design asks what exists of the same job, for each kind of standing thing", () => {
  const item = design();
  expect(item).toContain("what was not chosen and why");
  expect(item).toContain("each standing thing the design adds");
  for (const kind of ["a role and its brief", "a tool", "a token", "a Worker", "a method", "a store"]) expect(item, kind).toContain(kind);
  expect(item).toContain("what exists today that does the same job for the same purpose");
  expect(item).toContain('under "Not chosen" why that is not extended');
});

test("it says where the writer looks, and each place it names in this checkout is there", () => {
  const item = design();
  expect(item).toContain("the searches of step 4");
  const places = [".claude/skills/brain-maintenance/agents/", "tools/cloud-brain/"];
  for (const p of places) {
    expect(item, p).toContain("`" + p + "`");
    expect(existsSync(resolve(root, p)), p).toBe(true);
  }
  // The roles are files of the Brain, listed at its address and not in the checkout.
  expect(item).toContain("/static/cloud-brain-dev/index.md");
});

test("\"nothing exists\" is said with the search that showed it, and a thing with no sentence is not left to the reader", () => {
  const item = design();
  expect(item).toMatch(/Nothing exists.{0,40}is said with the search/);
  expect(item).toContain("the listing that showed it");
});

test("the owner's words are beside it, whole, with their date and where they are", () => {
  const item = design();
  expect(item).toContain('"yeah I think we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose"');
  expect(item).toContain("2026-10-12");
  expect(item).toContain("comment 4463 of `docs-summarised-for-search`");
});
