// sd-1-doc-files, task 1 of plan/cloud-brain-docs-summarised-for-search.md: the texts that say where the whole of a
// doc is and what the docs tool calls with. What the tool does is held by tests/tools/knowledge-docs.test.ts ("sd-1: …").
//
//   bun test ./tests/tools/sd-1-doc-files.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const FOUR = "token loop-docs knowledge.put knowledge.list static.put static.list";

test("the calling guide says a put is the file and then the entry, where the file is, and the token's four methods", () => {
  const guide = read("knowledge/calling-a-cloud-brain-from-this-checkout.md");
  const section = guide.slice(guide.indexOf("## The knowledge docs in the Brain's search"), guide.indexOf("## The summaries of the kept papers"));
  for (const phrase of ["static.put?path=docs/<source>/<path>&public=<true|false>&tags=knowledge-doc", 'file: "docs/<source>/<path>"', "`filesWrong`", "`file not kept`", "static.get?path=<file>", FOUR, "sd-1-doc-files"])
    expect(section.includes(phrase), phrase).toBe(true);
  expect(section.indexOf("static.put?path=")).toBeLessThan(section.indexOf("knowledge.put {"));
});

test("the tool's header says the same, and the tool has no address on raw.githubusercontent.com left but the header's sentence on what the line was", () => {
  const tool = read("tools/cloud-brain/knowledge-docs.ts"), header = tool.slice(0, tool.indexOf("\nimport "));
  for (const phrase of ["static.put?path=docs/<source>/<path>&public=<true|false>&tags=knowledge-doc", "knowledge.put, knowledge.list, static.put, static.list", "`filesWrong`", "sd-1-doc-files"])
    expect(header.includes(phrase), phrase).toBe(true);
  expect(tool.split("raw.githubusercontent.com").length - 1).toBe(1);
  expect(tool.slice(tool.indexOf("\nimport ")).includes("raw.githubusercontent.com")).toBe(false);
});

test("the spec says as built what differs: one token, and the prefix docs/", () => {
  const spec = read("plan/cloud-brain-docs-summarised-for-search.md");
  const note = spec.slice(spec.indexOf("**As built, task 1 (`sd-1-doc-files`"), spec.indexOf("Sections 1 to 3 and 5 of"));
  for (const phrase of ["no `loop-doc-files`", "knowledge.put knowledge.list static.put static.list", "The prefix is `docs/`, not `knowledge-docs/`", "53 of the 89", "tools/cloud-brain/records/sd-1-doc-files.md"])
    expect(note.includes(phrase), phrase).toBe(true);
  expect(spec.split("(As built, `sd-1-doc-files`, 2026-10-12").length - 1).toBe(10);
});

test("the record of the task is there, with what changed, the counts and what was not tried", () => {
  const record = read("tools/cloud-brain/records/sd-1-doc-files.md");
  for (const phrase of ["## What changed", "## Not tried", "put --all", "filesWrong", "docs/"]) expect(record.includes(phrase), phrase).toBe(true);
});
