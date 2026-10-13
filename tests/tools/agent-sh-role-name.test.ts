// cloud-brain-dev/agent.sh and README.md name the role READS starts as the tool starts it: `summarizer`
// (summarize-papers.ts, ROLE). The name before, paper-summarizer, stands only in a clause that says until when, and in
// the path of the spec (issue agent-sh-and-readme-say-paper-summarizer; records/agent-sh-and-readme-say-paper-summarizer.md).
//
//   bun test ./tests/tools/agent-sh-role-name.test.ts
import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROLE } from "../../tools/cloud-brain/summarize-papers.ts";

const root = resolve(import.meta.dir, "../..");
const dev = resolve(root, "cloud-brain-dev");
const files = ["agent.sh", "README.md"];
// A checkout with no clone of the submodule has neither file: the tests skip there and say so.
const have = files.every((f) => existsSync(resolve(dev, f)));
if (!have) console.log("skipped: cloud-brain-dev has no agent.sh or README.md here (git submodule update --init cloud-brain-dev)");
const read = (f: string) => readFileSync(resolve(dev, f), "utf8");
const SPEC = "plan/cloud-brain-paper-summarizer-persona.md";

test.skipIf(!have)("the role READS is for is named as summarize-papers.ts starts it", () => {
  expect(ROLE).toBe("summarizer");
  expect(read("agent.sh")).toContain(`(the role ${ROLE}, `);
  expect(read("README.md")).toContain(`(the role \`${ROLE}\`, `);
});

test.skipIf(!have)("the name before is only in a clause that says until when, and in the spec's path", () => {
  for (const f of files) {
    const old = read(f).split("\n").filter((l) => l.split(SPEC).join("").includes("paper-summarizer"));
    expect(old.length).toBe(1);
    expect(old[0]).toMatch(/named `?paper-summarizer`? until `?sd-2-one-summarizer`?, 2026-10-12/);
  }
});
