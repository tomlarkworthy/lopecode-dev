// The tests of the reviewer's brief read a copy kept beside them, so the count of the suite at a commit does not
// change with a put of the brief on the Brain. Issue suite-tests-read-the-live-brief;
// tools/cloud-brain/records/suite-tests-read-the-live-brief.md.
//
//   bun test ./tests/tools/reviewer-brief-kept-copy.test.ts
// The last test runs the four files that hold the brief, in a `bun test` of its own in which a call of fetch throws.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { briefOf, KEPT, PATH } from "./reviewer-brief.ts";

const root = resolve(import.meta.dir, "../..");
const HOLDERS = ["reviewer-brief-waits-on-show.test.ts", "reviewer-in-a-view.test.ts", "reviewer-brief-names-token.test.ts", "lock.test.ts"];
// A Brain of the test's: it answers the brief's path with `body`, and counts what it was asked.
const standIn = (status: number, body: string) => {
  const asked: string[] = [];
  const s = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => (asked.push(new URL(req.url).pathname), new Response(body, { status })) });
  return { base: `http://127.0.0.1:${s.port}`, asked, stop: () => s.stop(true) };
};

test("with neither BRIEF nor BRAIN the brief is the kept copy, and nothing is fetched", async () => {
  const kept = readFileSync(KEPT, "utf8");
  expect(kept).toContain("# Reviewer brief");
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => { calls++; throw new Error("fetch was called"); }) as typeof fetch;
  try {
    expect(await briefOf({})).toBe(kept);
    expect(await briefOf({ BRAIN: "", BRIEF: "" })).toBe(kept);
  } finally {
    globalThis.fetch = real;
  }
  expect(calls).toBe(0);
});

test("BRIEF=<file> reads that file, with BRAIN set too", async () => {
  const dir = mkdtempSync(join(tmpdir(), "brief-kept-"));
  const brain = standIn(200, "the Brain's");
  try {
    writeFileSync(join(dir, "edited.md"), "an edited brief");
    expect(await briefOf({ BRIEF: join(dir, "edited.md") })).toBe("an edited brief");
    expect(await briefOf({ BRIEF: join(dir, "edited.md"), BRAIN: brain.base })).toBe("an edited brief");
    expect(brain.asked).toEqual([]);
    await expect(briefOf({ BRIEF: join(dir, "none.md") })).rejects.toThrow(/ENOENT/);
  } finally {
    brain.stop();
    rmSync(dir, { recursive: true });
  }
});

test("BRAIN=<address> reads what that Brain serves at the brief's path, and a status that is not 200 is an error", async () => {
  const brain = standIn(200, "the Brain's"), gone = standIn(404, "not found");
  try {
    expect(await briefOf({ BRAIN: brain.base })).toBe("the Brain's");
    expect(await briefOf({ BRAIN: brain.base + "/" })).toBe("the Brain's");
    expect(brain.asked).toEqual([PATH, PATH]);
    await expect(briefOf({ BRAIN: gone.base })).rejects.toThrow(`${gone.base}${PATH} answered 404`);
  } finally {
    brain.stop();
    gone.stop();
  }
});

test("no file of tests/tools names the brief's address but reviewer-brief.ts", () => {
  const naming = readdirSync(import.meta.dir)
    .filter((f) => f.endsWith(".ts") && f !== "reviewer-brief.ts")
    .filter((f) => readFileSync(join(import.meta.dir, f), "utf8").includes(PATH));
  expect(naming).toEqual([]);
  for (const f of HOLDERS) expect(readFileSync(join(import.meta.dir, f), "utf8"), f).toContain('from "./reviewer-brief.ts"');
});

// lock.test.ts calls its own stand-ins with fetch, so of that file the one test of the brief is run.
test("the four files that hold the brief pass where fetch throws", () => {
  const env: Record<string, string | undefined> = { ...process.env, BRIEF: undefined, BRAIN: undefined };
  const run = (args: string[]) => {
    const r = Bun.spawnSync(["bun", "test", "--preload", "./tests/tools/fixtures/no-fetch.ts", ...args], { cwd: root, env, timeout: 60000 });
    return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
  };
  const three = run(HOLDERS.slice(0, 3).map((f) => `./tests/tools/${f}`));
  expect(three.out).toMatch(/\n\s*0 fail\n/);
  expect(three.out).not.toContain("fetch was called");
  expect(three.code).toBe(0);
  const r3 = run(["-t", "R3: the reviewer's brief", "./tests/tools/lock.test.ts"]);
  expect(r3.out).toMatch(/\n\s*1 pass\n/);
  expect(r3.out).toMatch(/\n\s*0 fail\n/);
  expect(r3.code).toBe(0);
}, 90000);
