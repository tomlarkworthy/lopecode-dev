// The docs an agent reads before its first brain.ts call show no `brain.ts token NAME …` line that names a method
// of the tracker. A token made that way is a new delegation, so the tracker counts it as another actor and its
// rule against reviewing an issue you started does not hold between two tokens one agent made.
// Issue doc-example-mints-tracker-token.
//
//   cd tests/tools && bun test doc-token-example.test.ts
import { test, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const md = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? md(join(dir, e.name)) : e.name.endsWith(".md") ? [join(dir, e.name)] : []);
const files = [...md("knowledge"), ...md(".claude/skills/brain-maintenance")];

// `token NAME <method…>` with a method `issue.something`, quoted or not. `token list` and `token revoke` name none.
const mints = (line: string) => /brain\.ts token (?!list\b|revoke\b)\S+ .*['"]?\bissue\.[\w*]/.test(line.split("#")[0]);

test("the pattern reads the line the issue was filed about, and not the lines beside it", () => {
  expect(mints("brain.ts token my-task 'issue.*' knowledge.search   # once")).toBe(true);
  expect(mints("brain.ts token my-task issue.list")).toBe(true);
  expect(mints("brain.ts token my-task quota.get knowledge.search   # not issue.*")).toBe(false);
  expect(mints("brain.ts curl /xrpc/com.lopecode.brain.issue.list --as my-task")).toBe(false);
  expect(mints("brain.ts token revoke my-task")).toBe(false);
});

test("no doc shows an agent making itself a token for the tracker", () => {
  expect(files.length).toBeGreaterThan(20);
  const found = files.flatMap((f) =>
    readFileSync(join(root, f), "utf8").split("\n").flatMap((l, i) => (mints(l) ? [`${f}:${i + 1}: ${l.trim()}`] : [])));
  expect(found).toEqual([]);
});
