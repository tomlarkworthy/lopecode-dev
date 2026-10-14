// A change to cloud-brain-dev's own files, but README.md and records/*.md (SAFE of patch.ts), is loop work: an issue
// about cloud-brain-dev, run by run.ts in an issue clone, read by its reviewer, pushed by push.ts. A writer of
// lopecode-dev does not land it with worktree.sh --push-dev. The owner, 2026-10-14 (issue loop-work-in-issue-clone):
// "If they are doing loop work that should still be done in an issue clone and not literally the thing they are
// standing on." Each doc that says how a change to cloud-brain-dev is landed says so.
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

test("rules.md names run.ts, push.ts, the related link, and quotes the owner with the date", () => {
  const s = docs.rules;
  expect(s).toContain("never lands it with `worktree.sh --push-dev`");
  expect(s).toContain("`push.ts`");
  expect(s).toContain("linked `related`");
  expect(s).toContain("\"If they are doing loop work that should still be done in an issue clone and not literally the thing they are standing on.");
  expect(s).toContain("2026-10-14");
});

test("the two pages of the implementer say the writer does not land such a change", () => {
  expect(docs.start).toContain("is not yours to land");
  expect(docs.landing).toContain("is not yours to land");
});

test("SAFE in patch.ts is still README.md and records/*.md, as the docs say", () => {
  const p = resolve(root, "cloud-brain-dev/patch.ts");
  let src = "";
  try { src = readFileSync(p, "utf8"); } catch { console.log(`skipped: loop-work-in-issue-clone.test.ts: no ${p}`); return; }
  expect(src).toContain('export const SAFE = (f: string) => f === "README.md" || /^records\\/[a-z0-9][a-z0-9-]*\\.md$/.test(f);');
});
