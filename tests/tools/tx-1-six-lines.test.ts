// Six sentences that agents act by say what is so (tx-1-six-lines, task 1 of
// plan/cloud-brain-texts-not-read-again-after-a-change.md). Each was seen untrue by an agent of the loop and filed.
// The files are read as they are. A phrase that was untrue is held absent; a mended sentence is held by its own
// words and not by a count of a phrase, so another true line with the same words leaves the test passing.
// Two of them are also held to the code they speak of: when that changes, the sentence is to be read again.
//
//   bun test ./tests/tools/tx-1-six-lines.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const count = (text: string, phrase: string) => text.split(phrase).length - 1;

test("the dashboards spec puts the note above the panels, where the cell `dashboard` draws it", () => {
  const spec = read("plan/cloud-brain-dashboards-share-series-and-controls.md");
  expect(count(spec, "under the panels")).toBe(0);
  expect(spec).toContain("the page says what it got: the note above the panels gives the span, the step and");
  expect(spec).toContain("the note above the panels (line 42) and the line a visitor reads (line 35) name the span");
  const page = read("tools/cloud-brain/cloud-brain.ojs");
  const cell = page.slice(page.indexOf("\ndashboard = (panels, { note"));
  const note = cell.indexOf("${note ? htl.html`<div");
  const grid = cell.indexOf("display:grid");
  expect(note).toBeGreaterThan(0);
  expect(grid).toBeGreaterThan(note);
});

test("the deploy guide says a renew is 600 s from the renew, as the header of lock.sh does", () => {
  const guide = read("knowledge/changing-and-deploying-a-cloud-brain-worker.md");
  expect(count(guide, "600 s more")).toBe(0);
  expect(guide).toContain("`renew` gives the holder 600 s from the renew;");
  expect(read("tools/cloud-brain/lock.sh")).toContain("600 s from now for a lock <who> holds");
});

test("step 10 of the writer's brief names the docs line a release of land prints, once", () => {
  const brief = read(".claude/skills/brain-maintenance/agents/implementer.md");
  expect(count(brief, "docs (cb4)")).toBe(1);
  const line = brief.split("\n").find((l) => l.includes("docs (cb4)")) || "";
  expect(line).toContain("lock.sh release land <id>`. It prints when the lock was taken and when it went.");
  expect(line).toContain("`not entered (…)`");
  expect(line).toContain("no failure of the landing");
  const lock = read("tools/cloud-brain/lock.sh");
  expect(lock).toContain('echo "docs ($BRAIN_BASE): ');
  expect(lock).toContain('echo "docs ($BRAIN_BASE): not entered (');
  // The line is printed after the release has answered, and the script then exits 0.
  const after = lock.slice(lock.indexOf('echo "docs ($BRAIN_BASE): not entered ('));
  expect(after.slice(0, after.indexOf(";;")).trim().endsWith("exit 0")).toBe(true);
});

test("the dashboard-service spec keeps the approved sentence and has what was built beside it", () => {
  const spec = read("plan/cloud-brain-dashboard-service.md");
  expect(count(spec, "reach every one")).toBe(1);
  // Of this sentence. A later task adds its own "As built" elsewhere in the spec (dsv-6 added three), so the file is not counted whole.
  expect(count(spec, "(As built, `dsv-3-dashboards`")).toBe(1);
  expect(spec).toContain(
    "reach every one. (As built, `dsv-3-dashboards`, 2026-10-11: they read every one and write no member's and no built-in name; `tools/cloud-brain/records/dsv-3-dashboards.md`.)",
  );
  const record = read("tools/cloud-brain/records/dsv-3-dashboards.md");
  expect(record).toContain("**list and read** every dashboard, and **write none** named");
  expect(record).toContain("**`dashboard.put` of `health`.** Decided: 403, for every caller, and the same for");
});

test("the guide read first and the spec writer's brief do not say the loop or the brief is not yet run", () => {
  const first = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
  expect(count(first, "not yet run as a loop")).toBe(0);
  expect(first).toContain("(written 2026-10-10, run as a loop since that day)");
  const brief = read(".claude/skills/brain-maintenance/agents/spec.md");
  expect(count(brief.toLowerCase(), "not yet run")).toBe(0);
  expect(brief).toContain("Run since 2026-10-11: say in your report what in it");
});
