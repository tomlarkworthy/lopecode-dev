// The section "Where a change made on the Brain's page is kept" of knowledge/changing-and-deploying-a-cloud-brain-worker.md:
// the four kinds of the rule, the changes that have no place, and the sentence on the saved-notebook doc
// (pm-2-rule-in-the-doc; R4 of plan/cloud-brain-page-modifications-how-they-are-kept.md). The names the section gives
// are held to the modules, so a rename in brain-feedback, brain-shell.ojs or cloud-brain.ojs fails here. brain-feedback
// has no seed since 2026-10-18 (i13287): it is read from cloud-brain-dev/deploy/ after bun sync.ts.
//
//   bun test ./tests/tools/pm-2-page-changes-kept.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { running, runningCells } from "./needs";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const HEADING = "## Where a change made on the Brain's page is kept";
const doc = read("knowledge/changing-and-deploying-a-cloud-brain-worker.md");
const start = doc.indexOf(HEADING);
const section = doc.slice(start, doc.indexOf("\n## ", start + 1));
const feedback = readFileSync(running("brain-feedback"), "utf8");
const feedbackCells = await runningCells("brain-feedback");
const cellOf = (cells: { _name: string | null; _definition: string }[], name: string) => cells.find((c) => c._name === name);
const shell = read("tools/cloud-brain/brain-shell.ojs");
const page = read("tools/cloud-brain/cloud-brain.ojs");
const row = (first: string) => section.split("\n").find((l) => l.startsWith("| " + first)) || "";
const lines = (s: string) => s.split("\n");

test("the section is in the doc once", () => {
  expect(doc.split("\n").filter((l) => l === HEADING).length).toBe(1);
});

test("the rule has its four kinds, each with where it is kept", () => {
  expect(row("a fact about the work")).toContain("the record or the rows of the service");
  expect(row("what he is looking at")).toContain("the address");
  expect(row("something of his own")).toContain("this browser");
  expect(row("something of his own")).toContain("{ get, set }");
  expect(row("a change to what the page is or does")).toContain("the seed");
  expect(row("a change to what the page is or does")).toContain("cloud-brain-dev");
});

test("the third row names the browser's items and functions as brain-feedback has them", () => {
  const third = row("something of his own");
  for (const name of ["brain_feedback_drafts ADDRESS", "brain_feedback_away ADDRESS", 'feedbackKept(ADDRESS, "away")', "feedbackAway"]) expect([name, third.includes(name)]).toEqual([name, true]);
  // feedbackKept names its item "brain_feedback_" + what + " " + brain, drafts by default.
  expect(cellOf(feedbackCells, "feedbackKept")?._definition).toContain('(brain = "", what = "drafts") =>');
  expect(feedback).toContain('("brain_feedback_" + what + " " + brain)');
  expect(feedback).toContain("brain_feedback_away ADDRESS");
  expect(feedback).toContain("brain_feedback_drafts ADDRESS");
  expect(cellOf(feedbackCells, "feedbackAway")).toBeDefined();
});

test("the first two rows name what the seeds have", () => {
  expect(row("a fact about the work")).toContain("`annotation`");
  expect(feedback).toContain('label: "annotation"');
  expect(row("what he is looking at")).toContain("viewModules");
  expect(lines(shell).some((l) => l.startsWith("viewModules = "))).toBe(true);
});

test("the changes with no place are listed, each with where it is held, as the seeds have it", () => {
  for (const first of ["a note's box, moved", "the span of Health", "the filters of the Issues panel", "a cell edited in the page's editor"])
    expect([first, row(first) !== ""]).toEqual([first, true]);
  expect(row("a note's box, moved")).toContain("the new place is not kept");
  expect(feedback).toContain("A note's box can be moved; the new place is not kept.");
  expect(row("the span of Health")).toContain("`cloud-brain.ojs` line 36");
  expect(lines(page)[35]).toStartWith("viewof span = ");
  // Who is signed in is said apart: a browser item of no kind.
  expect(section).toContain("`brain_session`");
  expect(lines(shell)[225]).toContain('"brain_session"');
});

test("one sentence says the saved-notebook doc is for a file the reader saves", () => {
  const other = read("knowledge/keeping-user-state-in-the-saved-notebook.md");
  const quoted = "the state is written into that file when the notebook is saved";
  expect(other).toContain(quoted);
  const sentence = section.replace(/\n/g, " ").split(/(?<=\.) (?=[`A-Z])/).filter((s) => s.includes("keeping-user-state-in-the-saved-notebook.md"));
  expect(sentence.length).toBe(1);
  expect(sentence[0]).toContain(quoted);
  expect(sentence[0]).toContain("not a file he saves");
});
