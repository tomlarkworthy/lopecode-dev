// Two statements of round 1 of redistil-apply-leaves-seen-json were untrue (review, event 452): the doc's
// redistil row said `saw` read MOVED for every swept Worker, and the record put the one failing test of
// tests/tools in sync-module.test.ts and gave a worktree's links as its cause.
//
//   cd tests/tools && bun test redistil-record-statements.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

test("the redistil row says which swept Workers read MOVED", () => {
  const row = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md").split("\n").find((l) => l.startsWith("| `redistil` |"));
  expect(row).toBeDefined();
  expect(row).not.toContain("every swept Worker");
  expect(row).toContain("swept Worker that had an entry");
});

test("the record names the test that fails and gives no cause for it", () => {
  const record = read("tools/cloud-brain/records/redistil-apply-leaves-seen-json.md");
  expect(record).toContain("preflight.test.ts");
  expect(record).not.toContain("where the notebooks are not links");
  expect(record).not.toContain("is in `sync-module.test.ts`");
});
