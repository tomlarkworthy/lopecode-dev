import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const record = readFileSync(join(root, "tools/cloud-brain/records/cu-1-deployer-gains-billing-read.md"), "utf8");
const seed = readFileSync(join(root, "tools/cloud-brain/brain-deployer.ojs"), "utf8");

test("the seed's GROUPS is the list the record quotes", () => {
  const groups = seed.match(/const GROUPS = (\[[^\]]*\]);/);
  expect(groups).not.toBeNull();
  expect(JSON.parse(groups![1])).toContain("Billing Read");
  expect(record).toContain(groups![1]);
});

test("the record has the hash, the way back and what was not tried", () => {
  for (const s of ["e4b02e4f4481", "fc8063a52d65", "deployer.before-cu-1.json", "## Not tried, not known", "No mint"])
    expect(record).toContain(s);
});

test("the record says whose runs the counts are", () => {
  expect(record).toContain("my run");
  expect(record).toContain("the reviewer");
  expect(record).toContain("comment 5824");
});
