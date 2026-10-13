// The writer's brief and its page `submit-and-wait` ask for the suite's count "from a run made after your last
// edit", and for that count in the record. Writing the count in the record is an edit, so three writers of
// 2026-10-13 ran the suite again for it, or committed the record once more. Both texts now say that writing the
// count in the record is no such edit. Issue suite-count-in-the-record-loops.
//
//   bun test --timeout=30000 ./tests/tools/suite-count-in-the-record.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const AGENTS = resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents");
const flat = (s: string) => s.replace(/\s+/g, " ");
// The item of the list "read your change as the reviewer will" that begins `start`: to the next item.
const item = (file: string, start: string) => {
  const text = flat(readFileSync(join(AGENTS, file), "utf8")), a = text.indexOf("- " + start);
  if (a < 0) return "";
  const b = text.indexOf(" - ", a + 2);
  return text.slice(a, b < 0 ? text.length : b);
};

for (const file of ["implementer.md", "implementer/submit-and-wait.md"])
  test(`${file}: the item of the suite's count says that writing it in the record is no such edit`, () => {
    const said = item(file, file === "implementer.md" ? "Every count in the reason" : "Every count in the submit's reason");
    expect(said).toContain("the record is one a command of yours printed");
    expect(said).toContain("after your last edit");
    expect(said).toMatch(/[Ww]riting (it|that count) in the record is no such edit/);
  });

test("the page says what the clause is for, and what is still run after the count is written", () => {
  const said = item("implementer/submit-and-wait.md", "Every count in the submit's reason");
  expect(said).toContain("the suite is not run again for it");
  expect(said).toContain("`suite-count-in-the-record-loops`");
  expect(said).toContain("`land.sh --test`");
});
