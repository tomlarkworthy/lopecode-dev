// tests/tools/suite.sh runs the whole of tests/tools as
// `bun test --parallel=4 --timings=tests/tools/timings.json --timeout=30000 ./tests/tools` at the root of its checkout,
// and the writer's brief gives the suite as that script. With no flag the files run one after another: 207 s on
// 2026-10-12, past the 120 s that is a command's default timeout. Issue tests-tools-suite-three-minutes;
// tools/cloud-brain/records/tests-tools-suite-three-minutes.md has the runs.
//
//   bun test ./tests/tools/tests-tools-suite-parallel.test.ts
//   BRIEF=<file> reads another copy of the brief (the one before the change fails the two tests of the brief).
//   SUITE_SH=<file> runs another copy of the script, as if it were at tests/tools/suite.sh of a scratch checkout.
import { expect, test } from "bun:test";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const brief = readFileSync(process.env.BRIEF || resolve(root, ".claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
const flat = brief.replace(/\s+/g, " ");
const script = process.env.SUITE_SH || resolve(import.meta.dir, "suite.sh");
const FLAGS = ["--parallel=4", "--timings=tests/tools/timings.json", "--timeout=30000"];
// The whole suite, as a command: `bun test`, flags or none, then the directory and nothing after it. Its flags.
const whole = (text: string) => [...text.matchAll(/`bun test((?: --?[\w=.\/-]+)*) \.?\/?tests\/tools\/?`/g)].map((m) => m[1].trim().split(" ").filter(Boolean));

// A scratch checkout with the script in its place and a stand-in for bun that prints where it ran and what it was given.
const rig = (exit = 0) => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "bm-suite-")));
  mkdirSync(join(base, "checkout/tests/tools"), { recursive: true });
  mkdirSync(join(base, "bin"));
  mkdirSync(join(base, "elsewhere"));
  copyFileSync(script, join(base, "checkout/tests/tools/suite.sh"));
  chmodSync(join(base, "checkout/tests/tools/suite.sh"), 0o755);
  writeFileSync(join(base, "bin/bun"), `#!/bin/bash\necho "cwd=$PWD"\nfor a in "$@"; do echo "arg=$a"; done\nexit ${exit}\n`);
  chmodSync(join(base, "bin/bun"), 0o755);
  const run = (cwd: string, ...args: string[]) => {
    const p = Bun.spawnSync([join(base, "checkout/tests/tools/suite.sh"), ...args], { cwd: join(base, cwd), env: { ...process.env, PATH: `${join(base, "bin")}:${process.env.PATH}` } });
    const out = p.stdout.toString().trim().split("\n");
    return { code: p.exitCode, cwd: out[0], args: out.slice(1).map((l) => l.replace(/^arg=/, "")), err: p.stderr.toString() };
  };
  return { base, run };
};

test("suite.sh runs bun test with four workers, the timings file and 30 s, on ./tests/tools at the root of its checkout, from any directory", () => {
  const { base, run } = rig();
  for (const cwd of ["elsewhere", "checkout", "checkout/tests/tools"]) {
    const r = run(cwd);
    expect([cwd, r.code, r.cwd]).toEqual([cwd, 0, "cwd=" + join(base, "checkout")]);
    expect(r.args).toEqual(["test", ...FLAGS, "./tests/tools"]);
    expect(r.err).toBe(`+ bun test ${FLAGS.join(" ")} ./tests/tools (in ${join(base, "checkout")})\n`);
  }
});

test("a flag given to suite.sh comes after its own and before the directory; bun's exit is the script's", () => {
  expect(rig().run("elsewhere", "--parallel=1", "--update-timings").args).toEqual(["test", ...FLAGS, "--parallel=1", "--update-timings", "./tests/tools"]);
  expect(rig(1).run("elsewhere").code).toBe(1);
  expect(rig(70).run("checkout").code).toBe(70);
});

test("the header's command is the one the script runs", () => {
  expect(readFileSync(script, "utf8")).toContain(`#   bun test ${FLAGS.join(" ")} ./tests/tools\n`);
});

test("the pattern reads the suite's command with and without flags, and not a run of one file", () => {
  expect(whole("as `bun test ./tests/tools` or")).toEqual([[]]);
  expect(whole("as `bun test --parallel ./tests/tools` or")).toEqual([["--parallel"]]);
  expect(whole(`\`bun test ${FLAGS.join(" ")} ./tests/tools\``)).toEqual([FLAGS]);
  expect(whole("`bun test tests/tools`")).toEqual([[]]);
  expect(whole("`bun test ./tests/tools/lock.test.ts` and `bun test.ts <worker>`")).toEqual([]);
});

test("the brief gives the whole suite as the script, and the bun command only with the script's flags", () => {
  expect(flat).toContain("the whole suite as `tests/tools/suite.sh`, one file as `bun test ./tests/tools/<file>` with the `./`");
  const got = whole(flat);
  expect(got).toEqual([FLAGS]);
});

test("the brief says what the flags do, where a failure's message is, and how the run is made serial", () => {
  expect(flat).toContain("four worker processes and the slowest files first");
  expect(flat).toContain("A failure's message is printed above its `(fail)` line, under the name of its file.");
  expect(flat).toContain("`tests/tools/suite.sh --parallel=1` is the run of one file after another");
  expect(flat).toContain("`records/tests-tools-suite-three-minutes.md`");
});

test("the paragraph still asks for the command as run and the skipped lines", () => {
  expect(flat).toContain("the comment gives the command as run");
  expect(flat).toContain("a line `skipped: <file>: no <path>`");
});

// A name in it of a file that is gone, and a file it does not name, are nothing to bun (run 2026-10-12): not held here.
test("the timings file is as bun writes one, and worktree.test.ts is its slowest", () => {
  const t = JSON.parse(readFileSync(resolve(root, "tests/tools/timings.json"), "utf8"));
  expect(t.version).toBe(1);
  const files = Object.entries(t.files as Record<string, number>);
  expect(files.length).toBeGreaterThan(40);
  expect(files.every(([f, ms]) => f.startsWith("tests/tools/") && Number.isFinite(ms) && ms > 0)).toBe(true);
  expect(files.toSorted((a, b) => b[1] - a[1])[0][0]).toBe("tests/tools/worktree.test.ts");
});

test("this checkout's bun has the three flags", () => {
  const p = Bun.spawnSync(["bun", "test", "--help"], { env: { ...process.env, NO_COLOR: "1" } });
  const help = p.stdout.toString() + p.stderr.toString();
  expect(help).toMatch(/--parallel=<val>\s+Run test files in parallel/);
  expect(help).toMatch(/--timings=<val>\s/);
  expect(help).toMatch(/--timeout=<val>\s/);
});
