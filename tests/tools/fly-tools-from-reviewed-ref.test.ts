// The Fly drain machine clones cloud-brain-dev's `main` at each start, by the `init.cmd` of its Fly config, and runs
// drain.ts from it (comments 7380 and 7441 of fly-loop-needs-cloud-brain-dev-alone). It does not follow the commit
// lopecode-dev records for the submodule: that was the earlier machine `loop` (tools/cloud-brain/fly/run.sh). The
// README of cloud-brain-dev says so, and says what is to move it to a reviewed ref `loop` (issue fly-tools-from-reviewed-ref).
//
//   bun test --timeout=30000 ./tests/tools/fly-tools-from-reviewed-ref.test.ts
// README= reads another copy of cloud-brain-dev/README.md (the file before the change).
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const readme = readFileSync(process.env.README || resolve(root, "cloud-brain-dev/README.md"), "utf8").replace(/\s+/g, " ");
const section = (title: string) => {
  const at = readme.indexOf("## " + title);
  expect(at).toBeGreaterThan(-1);
  const next = readme.indexOf(" ## ", at + 3);
  return readme.slice(at, next < 0 ? undefined : next);
};

test("the README no longer says the Fly machine follows the commit lopecode-dev records", () => {
  expect(readme).not.toContain("the Fly machine follows that record");
});

test("the drain section names the machine's clone of main and the ref that is to replace it", () => {
  const s = section("Until none is left: drain.ts");
  expect(s).toContain("git clone -q https://cb4.endpointservices.workers.dev/git/cloud-brain-dev.git /w");
  expect(s).toContain("`init.cmd`");
  expect(s).toContain("-b loop");
  expect(s).toContain("push-moves-loop-ref");
  expect(s).toContain("fly-tools-from-reviewed-ref");
});

test("the push.ts section says the machine runs main until loop is moved by push.ts", () => {
  const s = section("A change to this repository: push.ts");
  expect(s).toContain("The Fly machine clones `main`");
  expect(s).toContain("`loop`");
});
