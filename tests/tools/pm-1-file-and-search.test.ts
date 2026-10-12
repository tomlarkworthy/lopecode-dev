// The two docs that say where a post mortem is kept and how it enters the Brain's search name the directory.
// Issue pm-1-file-and-search, task 1 of plan/cloud-brain-post-mortems-declared-and-kept.md (comment 4523 of
// post-mortems-declared-and-kept: "No doc points at it yet"). The docs are read as they are.
//
//   bun test ./tests/tools/pm-1-file-and-search.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
// The text from a `## ` heading to the next one.
const section = (text: string, heading: string) => {
  const from = text.indexOf("\n## " + heading + "\n");
  if (from < 0) throw new Error("no section " + heading);
  const to = text.indexOf("\n## ", from + 1);
  return text.slice(from, to < 0 ? undefined : to);
};

test("\"Where the documents are\" has one row for the directory, which names the spec, the test of the form and the tool", () => {
  const rows = section(read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md"), "Where the documents are").split("\n")
    .filter((l) => l.startsWith("|") && l.includes("tools/cloud-brain/post-mortems/"));
  expect(rows.length).toBe(1);
  expect(rows[0].trimEnd().endsWith("| `tools/cloud-brain/post-mortems/<id>.md` |")).toBe(true);
  for (const named of ["plan/cloud-brain-post-mortems-declared-and-kept.md", "tests/tools/post-mortems.test.ts", "tools/cloud-brain/knowledge-docs.ts", "doc:pm-<short>"]) expect(rows[0]).toContain(named);
});

test("\"The knowledge docs in the Brain's search\" lists the directory among what the tool enters, and says how an entry is named", () => {
  const s = section(read("knowledge/calling-a-cloud-brain-from-this-checkout.md"), "The knowledge docs in the Brain's search");
  expect(s.split("\n\n")[1]).toContain("`tools/cloud-brain/post-mortems/*.md`");
  expect(s).toContain("`doc:pm-second-summarizer-role`");
});

test("the tool's header, which that doc calls the reference, lists the directory", () => {
  const header = read("tools/cloud-brain/knowledge-docs.ts").split("\nimport ")[0];
  expect(header).toContain("tools/cloud-brain/post-mortems/*.md");
});
