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
import { inFull } from "./implementer-brief";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const brief = (process.env.BRIEF ? readFileSync(process.env.BRIEF, "utf8") : inFull());
const flat = brief.replace(/\s+/g, " ");
const script = process.env.SUITE_SH || resolve(import.meta.dir, "suite.sh");
const FLAGS = ["--parallel=4", "--timings=tests/tools/timings.json", "--timeout=30000"];
// The whole suite, as a command: `bun test`, flags or none, then the directory and nothing after it. Its flags.
const whole = (text: string) => [...text.matchAll(/`bun test((?: --?[\w=.\/-]+)*) \.?\/?tests\/tools\/?`/g)].map((m) => m[1].trim().split(" ").filter(Boolean));

// A scratch checkout with the script in its place and a stand-in for bun that prints where it ran, the TMPDIR it had
// and what it was given, and leaves a directory and a file in that TMPDIR as a test's rig does. `tmp` is where the
// script is told to make the run's directory (SUITE_TMP_BASE), so that what it leaves there can be counted.
const rig = (exit = 0, body = "") => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "bm-suite-")));
  mkdirSync(join(base, "checkout/tests/tools"), { recursive: true });
  mkdirSync(join(base, "bin"));
  mkdirSync(join(base, "elsewhere"));
  mkdirSync(join(base, "tmp"));
  // What the caller has as TMPDIR: three entries, which the script counts and does not add to.
  for (const d of ["sys/a", "sys/b", "sys/c"]) mkdirSync(join(base, d), { recursive: true });
  copyFileSync(script, join(base, "checkout/tests/tools/suite.sh"));
  chmodSync(join(base, "checkout/tests/tools/suite.sh"), 0o755);
  writeFileSync(join(base, "bin/bun"), `#!/bin/bash\necho "cwd=$PWD"\necho "tmp=$TMPDIR"\nmkdir -p "$TMPDIR/left-rig/deep" && echo x > "$TMPDIR/left-rig/deep/file" && echo x > "$TMPDIR/left-file"\n${body}\nfor a in "$@"; do echo "arg=$a"; done\nexit ${exit}\n`);
  chmodSync(join(base, "bin/bun"), 0o755);
  const run = (cwd: string, ...args: string[]) => {
    const p = Bun.spawnSync([join(base, "checkout/tests/tools/suite.sh"), ...args], { cwd: join(base, cwd), env: { ...process.env, TMPDIR: join(base, "sys") + "/", SUITE_TMP_BASE: join(base, "tmp"), PATH: `${join(base, "bin")}:${process.env.PATH}` } });
    const out = p.stdout.toString().trim().split("\n");
    return { code: p.exitCode, cwd: out[0], tmp: (out[1] || "").replace(/^tmp=/, ""), args: out.slice(2).map((l) => l.replace(/^arg=/, "")), err: p.stderr.toString() };
  };
  return { base, run, left: () => readdirSync(join(base, "tmp")) };
};

test("suite.sh runs bun test with four workers, the timings file and 30 s, on ./tests/tools at the root of its checkout, from any directory", () => {
  const { base, run } = rig();
  for (const cwd of ["elsewhere", "checkout", "checkout/tests/tools"]) {
    const r = run(cwd);
    expect([cwd, r.code, r.cwd]).toEqual([cwd, 0, "cwd=" + join(base, "checkout")]);
    expect(r.args).toEqual(["test", ...FLAGS, "./tests/tools"]);
    expect(r.err).toBe(`+ bun test ${FLAGS.join(" ")} ./tests/tools (in ${join(base, "checkout")})\n+ TMPDIR=${r.tmp}, removed at the end\n+ ${join(base, "sys")}, the temporary directory of the caller, has 3 entries\n`);
  }
});

// Issue tmpdir-entries-slow-every-bun-start: the rigs of the tests were left in the system's temporary directory, which
// had 200,884 entries on 2026-10-13, and a bun started under it took 700 ms.
test("the run has a TMPDIR of its own, not the caller's, and nothing of it is left when bun ends, whatever bun's exit", () => {
  for (const exit of [0, 1, 70]) {
    const { base, run, left } = rig(exit);
    const r = run("elsewhere");
    expect(r.code).toBe(exit);
    expect(r.tmp).toMatch(new RegExp("^" + join(base, "tmp") + "/bm-suite-run\\.[A-Za-z0-9]{6}/t$"));
    expect(existsSync(r.tmp)).toBe(false);
    expect(left()).toEqual([]);
    expect(readdirSync(join(base, "sys")).sort()).toEqual(["a", "b", "c"]);
  }
});

test("the default place of the run's directory is /tmp, and that directory is gone after the run", () => {
  const { base } = rig();
  const env: Record<string, string | undefined> = { ...process.env, PATH: `${join(base, "bin")}:${process.env.PATH}` };
  delete env.SUITE_TMP_BASE;
  const p = Bun.spawnSync([join(base, "checkout/tests/tools/suite.sh")], { cwd: base, env });
  const tmp = p.stdout.toString().split("\n")[1].replace(/^tmp=/, "");
  expect(tmp).toMatch(/^\/(private\/)?tmp\/bm-suite-run\.[A-Za-z0-9]{6}\/t$/);
  expect(existsSync(tmp.slice(0, -2))).toBe(false);
  // With no TMPDIR given the caller's is the system's own, and its count is said.
  delete env.TMPDIR;
  const q = Bun.spawnSync([join(base, "checkout/tests/tools/suite.sh")], { cwd: base, env });
  expect(q.stderr.toString()).toMatch(/\n\+ \/\S+, the temporary directory of the caller, has \d+ entries\n$/);
});

test("a run that is told to stop (TERM, INT) while bun runs leaves nothing either", async () => {
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    const { base, left } = rig(0, 'echo ready\nexec sleep 30');
    const p = Bun.spawn([join(base, "checkout/tests/tools/suite.sh")], { cwd: base, stdout: "pipe", stderr: "ignore", env: { ...process.env, TMPDIR: join(base, "sys") + "/", SUITE_TMP_BASE: join(base, "tmp"), PATH: `${join(base, "bin")}:${process.env.PATH}` } });
    const reader = p.stdout.getReader();
    let seen = "";
    while (!seen.includes("ready")) { const { value, done } = await reader.read(); if (done) break; seen += new TextDecoder().decode(value); }
    expect(left().length).toBe(1);
    // The script and its bun, as a terminal's Ctrl-C or a caller's kill of the group reaches both.
    Bun.spawnSync(["pkill", "-" + sig.slice(3), "-P", String(p.pid)]);
    p.kill(sig);
    await p.exited;
    expect([sig, left()]).toEqual([sig, []]);
  }
});

test("with no place for the run's directory nothing is run: exit 2", () => {
  const { base } = rig();
  const p = Bun.spawnSync([join(base, "checkout/tests/tools/suite.sh")], { cwd: base, env: { ...process.env, SUITE_TMP_BASE: join(base, "absent"), PATH: `${join(base, "bin")}:${process.env.PATH}` } });
  expect([p.exitCode, p.stdout.toString()]).toEqual([2, ""]);
  expect(p.stderr.toString()).toContain("suite.sh: no temporary directory in " + join(base, "absent") + "; nothing was run");
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

test("the brief says that the script's run has a TMPDIR of its own", () => {
  expect(flat).toContain("the script gives the run a `TMPDIR` of its own, a new directory of `/tmp` that it removes at the end and names in its second line on stderr");
  expect(flat).toContain("its last line there is the count of entries of the temporary directory it was called with");
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
