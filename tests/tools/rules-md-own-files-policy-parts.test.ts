// rules.md, "The approver", "Its own files". Until 2026-10-14 the item listed the policy cells of brain-issues.ojs
// among the approver's own files, and this file held each sentence on the parts of issuesApp and issuesLimits beside
// approver.ts (`appParts`, `policyCells`; issue rules-md-own-files-says-policy-cell). The seed was deleted that day,
// behind what cb4 ran, and the tool reads it no more: the tracker's policy cells are changed only as brain-x-issues
// patches in cloud-brain-dev. Held here: the item, the approver's brief and the tool say so, and none of them still
// marks or names the seed's cells.
//
//   bun test --timeout=30000 ./tests/tools/rules-md-own-files-policy-parts.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const approver = await import(join(root, "tools/cloud-brain/approver.ts"));
const rules = readFileSync(join(root, ".claude/skills/brain-maintenance/rules.md"), "utf8");
const brief = readFileSync(join(root, ".claude/skills/brain-maintenance/agents/approver.md"), "utf8");
const tool = readFileSync(join(root, "tools/cloud-brain/approver.ts"), "utf8");
const SEED = "tools/cloud-brain/brain-issues.ojs";

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
const section = rules.slice(rules.indexOf("\n## The approver\n"), rules.indexOf("\n## What the owner is asked to decide\n"));
const own = flat(section.split(/\n(?=- )/).find((p) => p.startsWith("- **Its own files.**")) ?? "");
const six = flat(brief.slice(brief.indexOf("\n6. **Is it secure**"), brief.indexOf("\n7. **In keeping.**")));

test("the item names the four files and the refusal, and says since when the seed's policy cells are not among them", () => {
  expect(section.length).toBeGreaterThan(0);
  for (const f of ["`agents/approver.md`", "`tools/cloud-brain/approver.ts`", "`tests/tools/approver.test.ts`", "`plan/cloud-brain-issues-policy-*.json`"]) expect(own).toContain(f);
  expect(own).toContain("the tool refuses an issue of which a commit touches one, and such an issue is the owner's");
  expect(own).toContain("`approver brief <blob> tool <blob>`");
  expect(own).toContain("Until 2026-10-14 the list had the policy cells of `brain-issues.ojs` as well");
  expect(own).toContain("the policy cells are now changed only as `brain-x-issues` patches in `cloud-brain-dev`");
  for (const gone of ["`issuesApp`", "`issuesLimits`", "marked `tracker`", "a cell with no name"]) expect([gone, own.includes(gone)]).toEqual([gone, false]);
});

test("step 6 of the approver's brief has no `tracker` mark and says the same of the seed", () => {
  expect(six.length).toBeGreaterThan(0);
  expect(six).toContain("`rules` (`rules.md`, `philosophy.md`) or `policy`.");
  expect(six).toContain("Until 2026-10-14 `policy` also marked a commit that changed a policy cell of `brain-issues.ojs`");
  expect(six).toContain("`brain-x-issues` patches in `cloud-brain-dev`");
  for (const gone of ["`no policy cell`", "Of two cells it compared the policy parts alone"]) expect([gone, six.includes(gone)]).toEqual([gone, false]);
});

test("the tool marks the deleted seed with nothing, and says so in its header", () => {
  expect([approver.marks(SEED), approver.own(SEED)]).toEqual([[], false]);
  for (const gone of ["policyCells", "seedTouch", "appParts", "JUDGE", "ROUTES"]) expect([gone, gone in approver]).toEqual([gone, false]);
  const header = flat(tool.slice(0, tool.indexOf("\nimport ")).replace(/^\/\/ ?/gm, ""));
  expect(header).toContain("the policy cells are now changed only as brain-x-issues patches in cloud-brain-dev");
});
