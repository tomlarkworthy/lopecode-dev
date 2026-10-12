// rules.md, "A token an approved spec names", said `loop-docs` names two methods and is used only for entries of
// kind `doc`. Since 2026-10-12 (the owner's B of comment 4734 of docs-summarised-for-search, the token made again at
// comment 4775 of sd-1-doc-files) it names four, and knowledge-docs.ts puts a file under docs/ for each doc.
// Issue rules-md-loop-docs-names-four-methods.
//
//   bun test --timeout=30000 ./tests/tools/rules-md-loop-docs-names-four-methods.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const rules = read(".claude/skills/brain-maintenance/rules.md");
const tool = read("tools/cloud-brain/knowledge-docs.ts");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
// A section: from its "## " heading to the next one.
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
// An item of a list: from "- `name` names" to the next line that opens an item, or the section's end.
const item = (text: string, name: string): string => {
  const at = text.indexOf(`\n- \`${name}\` names `);
  if (at < 0) return "";
  const next = text.indexOf("\n- ", at + 1);
  return flat(text.slice(at + 1, next < 0 ? text.length : next));
};

const docs = item(section(rules, "A token an approved spec names"), "loop-docs");
const marker = " The rest of this item is the writer's reading, not his words. ";
const FOUR = ["knowledge.put", "knowledge.list", "static.put", "static.list"];
// B of the decision comment, as issue.get of docs-summarised-for-search has it at event 4633.
const choiceB = '"Approve, and widen `loop-docs` in place of a second token: one token for one job."';

test("section() and item() read one and stop at the next", () => {
  expect(section("# t\n\n## a\nx\n\n## b\ny\n", "a")).toBe("## a\nx\n");
  expect(section("# t\n\n## a\nx\n", "z")).toBe("");
  expect(item("\n- `a` names one\n  two\n- `b` names three\n", "a")).toBe("- `a` names one two");
  expect(item("\n- `a` names one\n", "z")).toBe("");
});

test("what the item says the token names and where files go is what the tool has", () => {
  expect(tool).toContain(`TOKEN = "loop-docs", METHODS = "${FOUR.join(" ")}"`);
  expect(tool).toContain('const FILES = "docs/"');
  expect(docs.startsWith("- `loop-docs` names `knowledge.put`, `knowledge.list`, `static.put` and `static.list`.")).toBe(true);
  expect(docs).toContain("`docs/<source>/<path>`");
});

test("it says files as well as entries, and no longer two methods or entries only", () => {
  expect(docs).toContain("a file for each doc as well as its entry of kind `doc`");
  expect(docs).not.toContain("names `knowledge.put` and `knowledge.list`.");
  expect(docs).not.toContain("and only for entries of kind `doc`:");
  expect(docs).not.toContain("whose words these are");
});

test("the agreement names docs/, and says the token is held to neither the kind nor the prefix", () => {
  expect(docs).toContain("and only for entries of kind `doc` and files under `docs/`");
  expect(docs).toContain("the token itself is held to neither, so this is an agreement");
  expect(docs).toContain("but `shell/` and `library/`");
  // The agreement as first written named a prefix the tool does not use.
  expect(docs).toContain('"for files only under `knowledge-docs/`"');
  expect(docs).toContain("`tools/cloud-brain/records/sd-1-doc-files.md`");
});

test("the owner's word for the four methods: his message whole, its comment, the choice, the approve, before the marker", () => {
  expect(docs.split(marker).length).toBe(2);
  const his = docs.slice(0, docs.indexOf(marker));
  expect(his).toContain('Tom, 2026-10-12, whole, as comment 4734 of `docs-summarised-for-search` has it: "1 A 2 A 3 B 4 A 5 B".');
  expect(his).toContain(`B of comment 4633 there: ${choiceB}`);
  expect(his).toContain("event 4735");
});

test("who made it, both times, and the two specs", () => {
  expect(docs).toContain("comment 1952 of `bd-3-first-run-of-the-docs-step`");
  expect(docs).toContain("comment 4775 of `sd-1-doc-files`");
  expect(docs).toContain("`plan/cloud-brain-brain-docs-entered-by-hand.md`");
  expect(docs).toContain("`plan/cloud-brain-docs-summarised-for-search.md`");
});

test("the three items beside it stand as they were", () => {
  const s = section(rules, "A token an approved spec names");
  expect(item(s, "loop-agents")).toContain("names `issue.*` and has the cap `delegate`");
  expect(item(s, "loop-papers")).toContain("names `knowledge.put`, `knowledge.search` and `static.get`");
  expect(item(s, "loop-dashboard")).toContain("names `metric.query`, `metric.list` and `dashboard.*`");
});
