// agents/overseer.md, "What you may do": the run the overseer makes before a put of the reviewer's brief takes its
// list of test files from a grep, and has a timeout. Until this issue the line named four files, and a fifth and a
// sixth that hold lines of the brief were not in it. Issue overseer-pre-put-run-names-four-files;
// tools/cloud-brain/records/overseer-pre-put-run-names-four-files.md.
//
//   bun test --timeout=30000 ./tests/tools/overseer-pre-put-run.test.ts
//   OVERSEER=<file> reads another copy of agents/overseer.md (the one before the change fails the first three).
// Not BRIEF=: this file's text matches the grep it tests, so the overseer's run has it, with BRIEF set to the
// reviewer's brief. It runs the grep of the line and no `bun test`.
import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const text = readFileSync(process.env.OVERSEER || resolve(root, ".claude/skills/brain-maintenance/agents/overseer.md"), "utf8");
const START = "`BRIEF=$W/cloud-brain-dev/brain/roles/reviewer.md bun test ";

// The command of the line: from its first backtick to the backtick that ends it.
const command = () => {
  const from = text.indexOf(START);
  expect(from).toBeGreaterThan(0);
  expect(text.indexOf(START, from + 1)).toBe(-1);
  const to = text.indexOf("`", from + 1);
  return text.slice(from + 1, to);
};
// What the shell puts in the place of its `$( … )`, with $W this checkout.
const listed = () => {
  const inner = command().match(/\$\((.+)\)$/);
  expect(inner).not.toBeNull();
  const r = Bun.spawnSync(["sh", "-c", inner![1]], { env: { ...process.env, W: root } });
  expect(r.exitCode).toBe(0);
  return r.stdout.toString().split("\n").filter(Boolean);
};
// The test files that read the brief through its reader, found here by their import and not by the line's grep.
const readers = () =>
  readdirSync(import.meta.dir)
    .filter((f) => f.endsWith(".test.ts") && f !== "overseer-pre-put-run.test.ts" && readFileSync(join(import.meta.dir, f), "utf8").includes('from "./reviewer-brief.ts"'))
    .map((f) => `./tests/tools/${f}`);

test("the command has a timeout and names no test file", () => {
  const c = command();
  expect(c).toStartWith("BRIEF=$W/cloud-brain-dev/brain/roles/reviewer.md bun test --timeout=30000 $(");
  expect(c).not.toMatch(/tests\/tools\/[\w.-]+\.test\.ts/);
});

test("its list has every test file that imports the reader of the brief", () => {
  const got = listed();
  const want = readers();
  expect(want.length).toBeGreaterThanOrEqual(7);
  for (const f of want) expect(got, f).toContain(f);
  expect(got).toContain("./tests/tools/reviewer-brief-q3-what-exists.test.ts");
  expect(got).toContain("./tests/tools/reviewer-brief-post-mortem.test.ts");
});

test("each name of the list is a file `bun test` can be given from the root, once", () => {
  const got = listed();
  expect(new Set(got).size).toBe(got.length);
  for (const f of got) {
    expect(f).toMatch(/^\.\/tests\/tools\/[\w.-]+\.test\.ts$/);
    expect(() => readFileSync(resolve(root, f))).not.toThrow();
  }
});

test("the entry carries the count and the number of files, and the line says the list is the grep's", () => {
  const from = text.indexOf(START);
  const after = text.slice(from, from + 900).replace(/\s+/g, " ");
  expect(after).toContain("0 fail, with the count and the number of files in the entry.");
  expect(after).toContain("The list is made by the `grep` and not written here");
});

// Issue kept-brief-copy-behind-holders-four: who writes the kept copy after a put.
test("after the put the overseer writes the kept copy from the Brain, checks it against the Brain and commits that file", () => {
  const from = text.indexOf(START);
  const after = text.slice(from, from + 2600);
  const reader = readFileSync(join(import.meta.dir, "reviewer-brief.ts"), "utf8");
  const got = after.match(/`curl -sf https:\/\/cb4\.endpointservices\.workers\.dev(\S+) -o \$W\/tests\/tools\/fixtures\/reviewer-brief\.md`/);
  expect(got).not.toBeNull();
  // The address is the reader's, which this file does not spell (reviewer-brief-kept-copy.test.ts holds that).
  expect(reader).toContain(`export const PATH = "${got![1]}";`);
  const curl = got!.index!;
  const check = after.indexOf("BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts`");
  const commit = after.indexOf('" -- tests/tools/fixtures/reviewer-brief.md`');
  expect(curl).toBeGreaterThan(0);
  expect(check).toBeGreaterThan(curl);
  expect(commit).toBeGreaterThan(check);
  expect(after.slice(0, curl).replace(/\s+/g, " ")).toContain("After the put, with 0 fail, you write the kept copy again yourself");
  // The check it names is a test of that file, by its name there, and the copy is the file the reader reads.
  const name = after.match(/its test `(BRAIN=[^`]+)` fails when the two differ/);
  expect(name).not.toBeNull();
  expect(readFileSync(join(import.meta.dir, "reviewer-brief-kept-copy.test.ts"), "utf8")).toContain(`test("${name![1]}"`);
  expect(reader).toContain('resolve(import.meta.dir, "fixtures/reviewer-brief.md")');
});
