// philosophy.md has the owner's two sentences of 2026-10-12 on a second thing beside one with the same job.
// Issue philosophy-one-role-for-one-job. PHILOSOPHY=/path/to/another/philosophy.md bun test …
//   bun test ./tests/tools/philosophy-one-role.test.ts
import { expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { testNeeding } from "./needs";

const path = process.env.PHILOSOPHY || resolve(import.meta.dir, "../../cloud-brain-dev/philosophy.md");
const test = testNeeding("philosophy-one-role.test.ts", [path]);
const text = existsSync(path) ? readFileSync(path, "utf8") : "";
const clar = text.slice(text.indexOf("\n## Clarifications\n"), text.indexOf("\n## Not settled\n"));
const para = clar.slice(clar.indexOf("**2026-10-12, on a second thing made beside one that has the same job.**"));

test("the paragraph is under Clarifications, before Not settled", () => {
  expect(text.indexOf("\n## Clarifications\n")).toBeGreaterThan(0);
  expect(para.startsWith("**2026-10-12, on a second thing")).toBe(true);
});

test("his two sentences are quoted whole, each on a line of its own", () => {
  expect(para).toContain("\n> yeah claude, don;t we have a summarizer persona, it should reuse that\n");
  expect(para).toContain("\n> yeah I think we don;t have two seperate roles, we just make the summarizer more general as it has the same basic job for the same purpose\n");
});

test("the events and the reading are named, and the reading is marked as not his", () => {
  expect(para).toContain("comment 4458");
  expect(para).toContain("comment 4463");
  expect(para).toContain("not his words");
  expect(para).toContain("His words do not say");
});
