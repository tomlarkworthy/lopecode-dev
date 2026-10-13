// A test file of tests/tools run alone, `bun test ./tests/tools/<file>`, left its rigs in the TMPDIR of its caller:
// 387 entries from the 97 files, each run once, on 2026-10-13. bunfig.toml at the root preloads tests/tools/own-tmpdir.ts,
// which gives the run a directory of its own and removes it. Issue test-rigs-left-when-a-file-runs-alone;
// tools/cloud-brain/records/test-rigs-left-when-a-file-runs-alone.md has the runs.
//
//   bun test --timeout=30000 ./tests/tools/own-tmpdir.test.ts
//   OWN_TMPDIR_TS=<file> runs another file as the preload (an empty one fails the tests of what a run leaves).
//   BRIEF=<file> reads another text as the brief and its pages.
//   SUITE_SH=<file> runs another copy of suite.sh (the one before the change fails the test of BM_TEST_TMPDIR).
import { expect, test } from "bun:test";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inFull } from "./implementer-brief";

const root = resolve(import.meta.dir, "../..");
const preload = process.env.OWN_TMPDIR_TS || resolve(import.meta.dir, "own-tmpdir.ts");
const flat = (process.env.BRIEF ? readFileSync(process.env.BRIEF, "utf8") : inFull()).replace(/\s+/g, " ");

// A test file as those of this directory are: a rig made with mkdtemp(tmpdir()) and not removed, a file in it, and a
// process started with this process's environment that makes one of its own. BODY is run after them.
const RIG = `import { expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("a rig", async () => {
  const d = mkdtempSync(join(tmpdir(), "rig-"));
  writeFileSync(join(d, "file"), "x");
  const child = Bun.spawnSync(["/bin/sh", "-c", 'mkdir "$TMPDIR/child-rig" && echo "$TMPDIR"'], { env: { ...process.env } }).stdout.toString().trim();
  console.log("RIG " + JSON.stringify({ rig: d, tmp: tmpdir(), child, marker: process.env.BM_TEST_TMPDIR ?? null }));
  BODY
}, 60000);
`;

// A scratch checkout with the root's bunfig.toml and the preload in their places, and test files `a` and `b`.
// `sys` is the TMPDIR of the caller and `base` where the preload makes its directory. One run of `bun test` there.
const scratch = (body = "") => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-own-tmpdir-")));
  const co = join(dir, "checkout"), sys = join(dir, "sys"), base = join(dir, "base");
  for (const d of [join(co, "tests/tools"), sys, base]) mkdirSync(d, { recursive: true });
  copyFileSync(resolve(root, "bunfig.toml"), join(co, "bunfig.toml"));
  copyFileSync(preload, join(co, "tests/tools/own-tmpdir.ts"));
  for (const f of ["a", "b"]) writeFileSync(join(co, `tests/tools/${f}.test.ts`), RIG.replace("BODY", body));
  const env = (more: Record<string, string | undefined>) => ({ ...process.env, BM_TEST_TMPDIR: undefined, KEEP_TEST_TMP: undefined, TMPDIR: sys + "/", SUITE_TMP_BASE: base, ...more });
  const run = (args: string[], more: Record<string, string | undefined> = {}) => {
    const p = Bun.spawnSync(["bun", "test", ...args], { cwd: co, env: env(more) });
    const out = p.stdout.toString() + p.stderr.toString();
    return { code: p.exitCode, out, rigs: [...out.matchAll(/^RIG (.*)$/gm)].map((m) => JSON.parse(m[1])), sys: readdirSync(sys), base: readdirSync(base) };
  };
  return { dir, co, sys, base, env, run };
};

test("bunfig.toml at the root preloads the file into bun test", () => {
  expect(readFileSync(resolve(root, "bunfig.toml"), "utf8")).toMatch(/^\[test\]\npreload = \["\.\/tests\/tools\/own-tmpdir\.ts"\]$/m);
  expect(existsSync(resolve(import.meta.dir, "own-tmpdir.ts"))).toBe(true);
});

test("one file run alone makes its rigs in a directory of its own, and nothing is left of it or in the caller's, pass or fail", () => {
  for (const [body, code] of [["", 0], ["expect(1).toBe(2);", 1]] as const) {
    const t = scratch(body), r = t.run(["./tests/tools/a.test.ts"]);
    expect([r.code, r.rigs.length]).toEqual([code, 1]);
    const { rig, tmp, child, marker } = r.rigs[0];
    expect(tmp).toMatch(new RegExp(`^${t.base}/bm-test-run\\.[A-Za-z0-9]{6}$`));
    expect([child, marker]).toEqual([tmp, tmp]);
    expect(rig.startsWith(tmp + "/rig-")).toBe(true);
    expect([r.sys, r.base]).toEqual([[], []]);
  }
});

test("several files, in one process and in two workers: each rig in a directory of the run, and nothing left", () => {
  for (const args of [["./tests/tools"], ["--parallel=2", "./tests/tools"]]) {
    const t = scratch(), r = t.run(args);
    expect([r.code, r.rigs.length]).toEqual([0, 2]);
    for (const { rig, tmp } of r.rigs) expect([tmp.startsWith(t.base + "/bm-test-run."), rig.startsWith(tmp + "/")]).toEqual([true, true]);
    expect([r.sys, r.base]).toEqual([[], []]);
  }
});

test("a run that is killed leaves nothing either: the directory goes when the process has ended", async () => {
  const t = scratch("await Bun.sleep(60000);");
  for (const signal of ["SIGKILL", "SIGTERM"] as const) {
    const p = Bun.spawn(["bun", "test", "./tests/tools/a.test.ts"], { cwd: t.co, env: t.env({}), stdout: "pipe", stderr: "ignore" });
    // The rig is made: the line of it is read before the signal.
    let out = "";
    for await (const chunk of p.stdout) { out += new TextDecoder().decode(chunk); if (/^RIG /m.test(out)) break; }
    const made = readdirSync(t.base);
    expect(made.length).toBe(1);
    expect(readdirSync(join(t.base, made[0])).sort()[0]).toBe("child-rig");
    p.kill(signal);
    await p.exited;
    for (let i = 0; i < 100 && readdirSync(t.base).length; i++) await Bun.sleep(100);
    expect([readdirSync(t.base), readdirSync(t.sys)]).toEqual([[], []]);
  }
}, 60000);

test("with BM_TEST_TMPDIR set the preload makes nothing: the run has the TMPDIR it was given, as under suite.sh", () => {
  const t = scratch(), r = t.run(["./tests/tools/a.test.ts"], { BM_TEST_TMPDIR: t.sys });
  expect(r.code).toBe(0);
  expect(r.rigs[0].tmp).toBe(t.sys);
  expect(r.rigs[0].rig.startsWith(t.sys + "/rig-")).toBe(true);
  expect(r.base).toEqual([]);
  expect(r.sys.length).toBe(2);
});

test("suite.sh gives bun BM_TEST_TMPDIR, the TMPDIR it made", () => {
  const t = scratch(), bin = join(t.dir, "bin");
  mkdirSync(bin);
  copyFileSync(process.env.SUITE_SH || resolve(import.meta.dir, "suite.sh"), join(t.co, "tests/tools/suite.sh"));
  chmodSync(join(t.co, "tests/tools/suite.sh"), 0o755);
  writeFileSync(join(bin, "bun"), '#!/bin/bash\necho "tmp=$TMPDIR"\necho "marker=$BM_TEST_TMPDIR"\n');
  chmodSync(join(bin, "bun"), 0o755);
  const p = Bun.spawnSync([join(t.co, "tests/tools/suite.sh")], { cwd: t.dir, env: t.env({ PATH: `${bin}:${process.env.PATH}` }) });
  const out = p.stdout.toString(), tmp = out.match(/^tmp=(.+)$/m)?.[1];
  expect(tmp).toMatch(new RegExp(`^${t.base}/bm-suite-run\\.[A-Za-z0-9]{6}/t$`));
  expect(out).toContain(`marker=${tmp}\n`);
});

test("KEEP_TEST_TMP=1 leaves the directory with its rigs and names it on stderr", () => {
  const t = scratch(), r = t.run(["./tests/tools/a.test.ts"], { KEEP_TEST_TMP: "1" });
  expect([r.code, r.base.length, r.sys]).toEqual([0, 1, []]);
  expect(r.out).toContain(`+ TMPDIR=${join(t.base, r.base[0])}, kept (KEEP_TEST_TMP=1)\n`);
  expect(readdirSync(join(t.base, r.base[0])).map((n) => n.replace(/-.{6}$/, "")).sort()).toEqual(["child-rig", "rig"]);
  // Any other value is not the switch.
  for (const v of ["0", ""]) expect(scratch().run(["./tests/tools/a.test.ts"], { KEEP_TEST_TMP: v }).base).toEqual([]);
});

test("with no place for the directory no test passes and the exit is 1", () => {
  const t = scratch(), r = t.run(["./tests/tools/a.test.ts"], { SUITE_TMP_BASE: join(t.dir, "none") });
  expect(r.code).toBe(1);
  expect(r.out).toContain(" 0 pass\n");
  expect(r.sys).toEqual([]);
});

test("the brief says that one file run alone has a TMPDIR of its own, where from, and how a rig is kept", () => {
  expect(flat).toContain("Since `test-rigs-left-when-a-file-runs-alone` (2026-10-13) one file run alone has a `TMPDIR` of its own too");
  expect(flat).toContain("`bunfig.toml` at the root preloads `tests/tools/own-tmpdir.ts` into a `bun test` started there");
  expect(flat).toContain("`KEEP_TEST_TMP=1` before the command leaves the directory and names it on stderr");
  expect(flat).toContain("A `bun test` started in another directory than the root has the `TMPDIR` of its caller.");
  expect(flat).not.toContain("what a test does not remove stays");
});
