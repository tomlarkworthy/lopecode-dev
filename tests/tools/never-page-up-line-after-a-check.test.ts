// rules.md, Never, had a line against `brain.ts page up` and the Brain's own page in a browser of the cluster,
// "until `deployer-put-back-issues-worker` is closed". That issue is `rejected`, so the line had no end. The owner
// was shown that it goes after one check that the full page no longer triggers a put-back (issue
// never-page-up-line-after-a-check, 2026-10-13). Held here: the line is out of Never, no brief of the loop repeats
// it, the lines beside it stand, and the record has the check as it was made, which is what the line goes on.
//
//   bun test --timeout=30000 ./tests/tools/never-page-up-line-after-a-check.test.ts
import { test, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const dir = join(root, ".claude/skills/brain-maintenance");
const rules = readFileSync(join(dir, "rules.md"), "utf8");
const record = readFileSync(join(root, "tools/cloud-brain/records/never-page-up-line-after-a-check.md"), "utf8");

const flat = (s: string): string => s.replace(/\s+/g, " ").trim();
const section = (text: string, heading: string): string => {
  const at = text.indexOf(`\n## ${heading}\n`);
  if (at < 0) return "";
  const next = text.indexOf("\n## ", at + 1);
  return text.slice(at + 1, next < 0 ? text.length : next);
};
const files = (d: string): string[] =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? files(join(d, n)) : n.endsWith(".md") ? [join(d, n)] : []));

test("rules.md, Never: the line against page up and the Brain's page in a cluster browser is out", () => {
  const never = flat(section(rules, "Never"));
  expect(never.length).toBeGreaterThan(1000);
  expect(never).not.toContain("page up");
  expect(never).not.toContain("deployer-put-back-issues-worker");
  expect(never).not.toContain("Chrome 128");
  // the lines that stood before and after it
  expect(never).toContain("- Print, copy or log a secret:");
  expect(never).toContain("- Deploy text that was not built from a seed.");
});

test("no brief of the loop says the page is not opened in a browser of the cluster until that issue is closed", () => {
  // oversight.md is the overseer's journal: its entries of 2026-10-10 name the issue as history
  const held = files(dir).filter((f) => !f.endsWith("/oversight.md") && statSync(f).isFile());
  expect(held.length).toBeGreaterThan(10);
  for (const f of held) expect([f, flat(readFileSync(f, "utf8")).includes("until `deployer-put-back-issues-worker` is closed")]).toEqual([f, false]);
});

test("rules.md still asks that a browser an agent started is not left running", () => {
  expect(flat(section(rules, "Always"))).toContain("`browser.all` and `container.all` show nothing you started");
});

test("the record has the check as it was made, with no put-back in it", () => {
  expect(record).toContain("## The check as it was made");
  // the writer's first round stood here, before the act: the line does not go on a check that was not made
  expect(record).not.toContain("Not made when this was written");
  const made = flat(section(record, "The check as it was made"));
  expect(made).toMatch(/put-back lines in the window: 0\b/);
});
