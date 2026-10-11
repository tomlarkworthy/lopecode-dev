// The two texts that said nothing enters a changed doc now name what does: `lock.sh release land`, with the token
// loop-docs. Issue bd-2-release-land-enters-docs, R7 of plan/cloud-brain-brain-docs-entered-by-hand.md.
// The spec gives six counts. The seventh is the sentence bd-1 put in the tool's header in place of the spec's
// ("No step of a landing runs the put yet"), which was true until this task.
//
//   bun test ./tests/tools/docs-entered-by-the-landing.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const count = (file: string, phrase: string) => readFileSync(join(root, file), "utf8").split(phrase).length - 1;
const GUIDE = "knowledge/calling-a-cloud-brain-from-this-checkout.md", TOOL = "tools/cloud-brain/knowledge-docs.ts";

for (const file of [GUIDE, TOOL])
  test(`${file} names what enters a doc: lock.sh release land, and the token loop-docs`, () => {
    expect(count(file, "lock.sh release land")).toBeGreaterThanOrEqual(1);
    expect(count(file, "loop-docs")).toBeGreaterThanOrEqual(1);
  });

test("neither says any more that nothing enters a changed doc", () => {
  expect(count(GUIDE, "not entered again by anything")).toBe(0);
  expect(count(TOOL, "Nothing re-enters a changed doc")).toBe(0);
  expect(count(TOOL, "No step of a landing runs the put yet")).toBe(0);
});

// What the step leaves until the next landing is said where the step is said.
test("the guide says what is not entered until the next landing", () => {
  const text = readFileSync(join(root, GUIDE), "utf8");
  const section = text.slice(text.indexOf("## The knowledge docs in the Brain's search"));
  for (const phrase of ["origin/main", "no landing", "`cloud-brain-dev` alone", "docs (cb4): not entered", "LOCK_DOCS=0"]) expect(section.includes(phrase), phrase).toBe(true);
});

// bd-3-guide-stub-line: the guide said a stub of lock.test.ts printed `nothing to put`. It names that test for a line only when the test holds it.
test("the guide does not give lock.test.ts as the source of a line that test does not print", () => {
  const guide = readFileSync(join(root, GUIDE), "utf8"), stub = readFileSync(join(root, "tests/tools/lock.test.ts"), "utf8");
  if (/`nothing to put`\) was printed that day with a stub/.test(guide)) expect(stub.includes("nothing to put")).toBe(true);
  expect(stub.includes(`docs (cb4): {"put":2,"entered":2}`)).toBe(true);
});
