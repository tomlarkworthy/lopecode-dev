// Until 2026-10-20 a change to cloud-brain-dev's own files, but README.md (SAFE of patch.ts), was loop work: an issue
// about cloud-brain-dev, run by run.ts in an issue clone, read by its reviewer, pushed by push.ts (the owner, 2026-10-14,
// issue loop-work-in-issue-clone). On 2026-10-20 18:10 UTC the owner ended that: "just fix the services directly and
// by-pass the loop machinery and rules entirely. Remove all loop tickets." rules.md "Always" says a change to the loop's
// machinery is made directly, with no ticket, and keeps the 2026-10-14 reading as what it no longer says
// (plan/retros/2026-10-20.md). The implementer's pages and the two knowledge docs still say the old reading (not changed that day).
//
//   bun test --timeout=30000 ./tests/tools/loop-work-in-issue-clone.test.ts
// RULES=, IMPL=, START=, LANDING=, CHANGING=, HUB= each read another copy of that file (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (env: string, path: string) => readFileSync(process.env[env] || resolve(root, path), "utf8").replace(/\s+/g, " ");
const docs = {
  rules: read("RULES", ".claude/skills/brain-maintenance/rules.md"),
  impl: read("IMPL", ".claude/skills/brain-maintenance/agents/implementer.md"),
  start: read("START", ".claude/skills/brain-maintenance/agents/implementer/start.md"),
  landing: read("LANDING", ".claude/skills/brain-maintenance/agents/implementer/landing.md"),
  changing: read("CHANGING", "knowledge/changing-and-deploying-a-cloud-brain-worker.md"),
  hub: read("HUB", "knowledge/working-with-cloud-brain-remote-lopecode-cluster.md"),
};

test("each doc that names worktree.sh --push-dev limits it to README.md and records/*.md", () => {
  for (const [name, s] of Object.entries(docs)) {
    expect(s, name).toContain("`README.md` and `records/*.md`");
    expect(s, name).toMatch(/issue `about` `cloud-brain-dev`/);
  }
});

test("rules.md says a machinery change is made directly with no ticket, quotes the owner of 2026-10-20, and keeps the 2026-10-14 reading", () => {
  const s = docs.rules;
  expect(s).toContain("A change to the loop's own machinery is made directly, with no ticket");
  expect(s).toContain("by-pass the loop machinery and rules entirely. Remove all loop tickets.");
  expect(s).toContain("2026-10-20");
  expect(s).toContain("It opens no issue about it");
  expect(s).toContain("Until that day this item read");
  expect(s).toContain("`push.ts`");
  expect(s).toContain("2026-10-14");
});

test("the two pages of the implementer say the writer does not land such a change", () => {
  expect(docs.start).toContain("is not yours to land");
  expect(docs.landing).toContain("is not yours to land");
});

test("SAFE in patch.ts is README.md alone (records/ left the repository with dev-records-to-tracker, 2026-10-15)", () => {
  const p = resolve(root, "cloud-brain-dev/patch.ts");
  let src = "";
  try { src = readFileSync(p, "utf8"); } catch { console.log(`skipped: loop-work-in-issue-clone.test.ts: no ${p}`); return; }
  expect(src).toContain('export const SAFE = (f: string) => f === "README.md";');
});
