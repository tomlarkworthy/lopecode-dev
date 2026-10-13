// The tests of the reviewer's brief read a copy kept beside them, so the count of the suite at a commit does not
// change with a put of the brief on the Brain. Issue suite-tests-read-the-live-brief;
// tools/cloud-brain/records/suite-tests-read-the-live-brief.md.
//
//   bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
//   BRAIN=https://cb4.endpointservices.workers.dev bun test --timeout=30000 ./tests/tools/reviewer-brief-kept-copy.test.ts
// The second has one test more: the kept copy is, byte for byte, what that Brain serves. It is the run that fails
// when the copy is behind a put; the suite has no such test, since its count would move with the Brain again.
// The last test runs each test file that imports reviewer-brief.ts, in a `bun test` of its own in which a call of
// fetch throws. The files are found by their import and not listed here.
// Issue kept-brief-copy-behind-holders-four; tools/cloud-brain/records/kept-brief-copy-behind-holders-four.md.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { briefOf, KEPT, PATH } from "./reviewer-brief.ts";

const root = resolve(import.meta.dir, "../..");
const SELF = "reviewer-brief-kept-copy.test.ts";
// The test files that hold the brief: each one, but this, with a line that imports its reader.
const IMPORT = /^import [^;\n]* from "\.\/reviewer-brief\.ts";$/m;
const HOLDERS = readdirSync(import.meta.dir)
  .filter((f) => f.endsWith(".test.ts") && f !== SELF && IMPORT.test(readFileSync(join(import.meta.dir, f), "utf8")))
  .sort();
// A holder that calls fetch for stand-ins of its own is run for its one test of the brief, by that test's name.
const ONE_TEST: Record<string, string> = { "lock.test.ts": "R3: the reviewer's brief" };
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
});

test("a test file that calls briefOf imports it from reviewer-brief.ts, and so is among the files run below", () => {
  const calling = readdirSync(import.meta.dir)
    .filter((f) => f.endsWith(".test.ts") && f !== SELF && /\bbriefOf\(/.test(readFileSync(join(import.meta.dir, f), "utf8")))
    .sort();
  expect(calling).toEqual(HOLDERS);
  expect(HOLDERS).toContain("reviewer-brief-q3-what-exists.test.ts");
  expect(HOLDERS).toContain("reviewer-brief-post-mortem.test.ts");
  for (const f of Object.keys(ONE_TEST)) expect(HOLDERS).toContain(f);
});

if (process.env.BRAIN)
  test("BRAIN=<address>: the kept copy is what that Brain serves", async () => {
    const served = await briefOf({ BRAIN: process.env.BRAIN });
    const kept = readFileSync(KEPT, "utf8");
    let at = 0;
    while (at < kept.length && kept[at] === served[at]) at++;
    const line = kept.slice(0, at).split("\n").length;
    const said = (n: number, same: boolean) => `${n} characters, ${same ? "the same as" : `not the same from line ${line} as`} ${process.env.BRAIN}${PATH}`;
    expect(said(kept.length, kept === served)).toBe(said(served.length, true));
  });

test("every file that holds the brief passes where fetch throws", () => {
  const env: Record<string, string | undefined> = { ...process.env, BRIEF: undefined, BRAIN: undefined };
  const run = (args: string[]) => {
    const r = Bun.spawnSync(["bun", "test", "--timeout=30000", "--preload", "./tests/tools/fixtures/no-fetch.ts", ...args], { cwd: root, env, timeout: 80000 });
    return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
  };
  const whole = HOLDERS.filter((f) => !(f in ONE_TEST));
  expect(whole.length).toBeGreaterThan(0);
  const all = run(whole.map((f) => `./tests/tools/${f}`));
  expect(all.out).toMatch(/\n\s*0 fail\n/);
  expect(all.out).not.toContain("fetch was called");
  expect(all.out).toContain(`across ${whole.length} files`);
  expect(all.code).toBe(0);
  for (const [f, name] of Object.entries(ONE_TEST)) {
    const one = run(["-t", name, `./tests/tools/${f}`]);
    expect(one.out, f).toMatch(/\n\s*1 pass\n/);
    expect(one.out, f).toMatch(/\n\s*0 fail\n/);
    expect(one.code).toBe(0);
  }
}, 120000);
