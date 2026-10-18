// A checkout that lacks what a test reads gets that test skipped by name, never failed.
// Issue tests-tools-fail-in-a-fresh-worktree: `bun test ./tests/tools` gave 1 fail in a worktree fresh from worktree.sh
// (no build for issue-lock-sql.test.ts) and 12 in a plain `git worktree add` (no cloud-brain-dev, and no lopecode:
// atproto-publish.test.ts then left the run with no fetch, and the tests that read the reviewer's brief failed on that).
//
//   bun test ./tests/tools/needs.test.ts
// Three files are run as they are, each pointed at a place that has nothing.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runningCells, runningModule, seedModule, testNeedingRunning, testNeedingSeed, testNeedingSeedAnd } from "./needs.ts";

const here = import.meta.dir;
const none = resolve(here, "no-such-place");
const run = (file: string, env: Record<string, string>, ...more: string[]) => {
  const p = Bun.spawnSync(["bun", "test", `./${file}`, ...more], { cwd: here, env: { ...process.env, ...env } });
  const out = p.stdout.toString() + p.stderr.toString();
  const n = (word: string) => Number(out.match(new RegExp(`^\\s*(\\d+) ${word}$`, "m"))?.[1] ?? 0);
  return { code: p.exitCode, out, pass: n("pass"), skip: n("skip"), fail: n("fail"), errors: n("errors?") };
};

// Issue view-isolated-from-main-notebook: the two SQL tests took their module from a notebook, and in a worktree with no
// build that was the main checkout's lopebooks/notebooks/@tomlarkworthy_cloud-brain.html through a link: a file of no
// commit, written by each landing that builds (3 fails of topic-sql.test.ts in a reviewer's view, 12:55 CEST 2026-10-12).
test("a test of a seed and of files: skipped for the first file lacking with nothing compiled, else as testNeedingSeed", async () => {
  const lines: string[] = [], log = console.log, built: string[] = [];
  const build = async (seed: string) => (built.push(seed), "/tmp/x.js");
  console.log = (l: string) => void lines.push(l);
  try {
    const lacking = await testNeedingSeedAnd("a.test.ts", "x.ojs", [here, resolve(none, "brain-db.js")], build);
    expect([lacking.test, lacking.module, built]).toEqual([test.skip, "", []]);
    expect(lines).toEqual([`skipped: a.test.ts: no ${resolve(none, "brain-db.js")}. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, git submodule update --init cloud-brain-dev lopebooks lopecode`]);
    const has = await testNeedingSeedAnd("a.test.ts", "x.ojs", [here], build);
    expect([has.test, has.module, built]).toEqual([test, "/tmp/x.js", ["x.ojs"]]);
    const none_ = await testNeedingSeedAnd("a.test.ts", "x.ojs", [], async () => { throw new Error("no @tomlarkworthy_observablejs-toolchain.html in lopecode/ or lopebooks/"); });
    expect([none_.test, none_.module]).toEqual([test.skip, ""]);
    expect(lines.length).toBe(2);
  } finally {
    console.log = log;
  }
});

// Since 2026-10-14 both read what cb4 runs: brain-issues.ojs was deleted that day, behind what ran, and brain-topic.ojs
// later that day with the other service seeds.
test("the two SQL tests read their statements from the seed of the checkout or what cb4 runs, and no file of tests/tools names the built notebook to read it", async () => {
  const needs = await import("./needs.ts");
  expect(Object.keys(needs).filter((k) => /^(BUILT|COMMITTED|notebookOf)$/.test(k))).toEqual([]);
  for (const [file, line] of [["issue-lock-sql.test.ts", 'testNeedingRunning("issue-lock-sql.test.ts", "brain-issues", [BRAIN_DB])'], ["topic-sql.test.ts", 'testNeedingRunning("topic-sql.test.ts", "brain-topic", [BRAIN_DB])']]) {
    const src = readFileSync(resolve(here, file), "utf8");
    expect(src).toContain(line);
    expect(src).toContain("importNotebookModule(module)");
    expect(src).not.toMatch(/lope-reader|--get-module|BRAIN_NOTEBOOK(?! named another)|process\.env/);
  }
  // The link's file, by its name: nothing here reads it. notebook-backup.test.ts makes repositories of its own with a file of that name.
  const naming = [...new Bun.Glob("*.ts").scanSync(here)].filter((f) => f !== "needs.test.ts" && readFileSync(resolve(here, f), "utf8").includes("lopebooks/notebooks/@tomlarkworthy_cloud-brain.html"));
  expect(naming).toEqual([]);
});

test("light-agent.test.ts with no cloud-brain-dev: every test skipped, none failed, and a line names agent.sh and put.sh", () => {
  const r = run("light-agent.test.ts", { CLOUD_BRAIN_DEV: none });
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.skip).toBeGreaterThan(0);
  expect(r.out).toContain(`skipped: light-agent.test.ts: no ${resolve(none, "agent.sh")}, ${resolve(none, "put.sh")}`);
}, 60000);

test("reviewer-brief-names-token.test.ts, its test of agent.sh, with no cloud-brain-dev: skipped, and a line names agent.sh", () => {
  const r = run("reviewer-brief-names-token.test.ts", { CLOUD_BRAIN_DEV: none }, "-t", "agent.sh sends");
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.out).toContain(`skipped: reviewer-brief-names-token.test.ts, its test of agent.sh: no ${resolve(none, "agent.sh")}`);
}, 60000);

test("atproto-publish.test.ts with no atproto.html: every test skipped, none failed, a line names it", () => {
  const r = run("atproto-publish.test.ts", { ATPROTO_HTML: resolve(none, "atproto.html") });
  expect([r.code, r.pass, r.fail, r.errors]).toEqual([0, 0, 0, 0]);
  expect(r.skip).toBeGreaterThan(0);
  expect(r.out).toContain(`skipped: atproto-publish.test.ts: no ${resolve(none, "atproto.html")}`);
}, 60000);

// The stand-in asks for no address: it prints what fetch is, in the same run and after atproto-publish.test.ts.
test("atproto-publish.test.ts with no atproto.html leaves fetch a function for the files run after it", () => {
  const after = resolve(here, "needs-fetch.fixture.ts");
  const p = Bun.spawnSync(["bun", "test", "./atproto-publish.test.ts", after], { cwd: here, env: { ...process.env, ATPROTO_HTML: resolve(none, "atproto.html") } });
  const out = p.stdout.toString() + p.stderr.toString();
  expect(out).toContain("fetch after: function");
  expect(p.exitCode).toBe(0);
}, 60000);

// Issue cost-events-test-reads-stale-deploy: cost-events.test.ts asked issueAct of cloud-brain-dev/deploy/, and failed 3
// in a checkout whose copy was from before issue.cost.
// Until 2026-10-14 of brain-issues.ojs, deleted that day; then brain-topic.ojs, deleted later that day; then brain-db.ojs,
// deleted 2026-10-18; cloud-brain.ojs and cloud-brain-specs.ojs since, the seeds left (i13287 retires them too).
test("a module is compiled from the seed of this checkout, once, into a file that is not in the checkout", async () => {
  const file = await seedModule("cloud-brain.ojs");
  expect(file).toEndWith("/cloud-brain.js");
  expect(file.startsWith(resolve(here, "../.."))).toBe(false);
  expect(await seedModule("cloud-brain.ojs")).toBe(file);
  // spanOptions's line of the seed, as the seed has it, is in what was compiled.
  const spans = readFileSync(resolve(here, "../../tools/cloud-brain/cloud-brain.ojs"), "utf8").split("\n").find((l) => l.startsWith("spanOptions = "))!.slice("spanOptions = ".length);
  expect(readFileSync(file, "utf8")).toContain(spans);
  expect((await testNeedingSeed("needs.test.ts", "cloud-brain.ojs")).module).toBe(file);
}, 60000);

// Issue rows-add-within-sql-fails-once-in-suite: in the first run of the suite in a checkout, cost-events.test.ts imported
// brain-issues.js, cloudflare-iac.js was then written beside it, and every test of rows-add-within-sql.test.ts failed with
// "Cannot find module". A directory that is new to this process is that first run.
test("a second seed, compiled after the first seed's module was imported, is found by import()", async () => {
  const into = mkdtempSync(join(tmpdir(), "seed-module-test-"));
  try {
    const first = await seedModule("cloud-brain.ojs", into);
    expect(first.startsWith(into)).toBe(true);
    expect(typeof (await import(pathToFileURL(first).href)).default).toBe("function");
    const second = await seedModule("cloud-brain-specs.ojs", into);
    expect(typeof (await import(pathToFileURL(second).href)).default).toBe("function");
    expect(dirname(second)).not.toBe(dirname(first));
    expect(await seedModule("cloud-brain.ojs", into)).toBe(first);
  } finally {
    rmSync(into, { recursive: true, force: true });
  }
}, 60000);

// Issue bk-4-install-the-project-workflow: issues-policy-v4.test.ts runs a cell that is not in the seed, in the seed's rig.
test("a seed compiled with an edit of its text is another file under the edit's name, and the seed's own module is as it was", async () => {
  const into = mkdtempSync(join(tmpdir(), "seed-module-test-"));
  try {
    const plain = await seedModule("cloud-brain-specs.ojs", into);
    const edit = { name: "cloud-brain-specs-and-one", text: (seed: string) => seed + "\n// %%\none_more_cell_of_a_test = 41 + 1\n" };
    const edited = await seedModule("cloud-brain-specs.ojs", into, edit);
    expect(edited).toEndWith("/cloud-brain-specs-and-one/cloud-brain-specs-and-one.js");
    expect(readFileSync(edited, "utf8")).toContain("one_more_cell_of_a_test");
    expect(readFileSync(plain, "utf8")).not.toContain("one_more_cell_of_a_test");
    // Asked again, each is the file it was.
    expect([await seedModule("cloud-brain-specs.ojs", into, edit), await seedModule("cloud-brain-specs.ojs", into)]).toEqual([edited, plain]);
  } finally {
    rmSync(into, { recursive: true, force: true });
  }
}, 60000);

test("with no toolchain notebook the tests of a seed are skipped with a line, and any other failure of the build is thrown", async () => {
  const lines: string[] = [], log = console.log;
  console.log = (l: string) => void lines.push(l);
  try {
    const none = await testNeedingSeed("a.test.ts, its tests of x", "x.ojs", async () => { throw new Error("no @tomlarkworthy_observablejs-toolchain.html in lopecode/ or lopebooks/"); });
    expect(none.test).toBe(test.skip);
    expect(lines).toEqual(["skipped: a.test.ts, its tests of x: x.ojs was not compiled: no @tomlarkworthy_observablejs-toolchain.html in lopecode/ or lopebooks/. tools/cloud-brain/worktree.sh makes a worktree that has it; in another checkout, git submodule update --init cloud-brain-dev lopebooks lopecode"]);
    expect(testNeedingSeed("a.test.ts", "x.ojs", async () => { throw new Error("cell 3: Unexpected token"); })).rejects.toThrow("cell 3: Unexpected token");
    expect(lines.length).toBe(1);
  } finally {
    console.log = log;
  }
}, 60000);

// Since 2026-10-14 a rig's cell is compiled into what cb4 runs of the tracker, as seedModule's edit put it at the end of the seed.
testNeedingRunning("needs.test.ts, runningModule", "brain-issues").test("runningModule: the running module with no test cell of its own and the one cell added, in a file that is not in the checkout", async () => {
  const into = mkdtempSync(join(tmpdir(), "running-"));
  try {
    const file = await runningModule("brain-issues", { name: "brain-issues-probe", cell: "// a probe\ntest_probe = issuesLimits.key" }, into);
    expect(file).toBe(join(into, "brain-issues-probe", "brain-issues-probe.js"));
    const { importNotebookModule } = await import("../../tools/notebook-import.ts");
    const m = await importNotebookModule(file, { overrides: { checkedRule: () => { throw new Error("no rule is checked here"); } } });
    expect(await m.value("test_probe")).toBe(await m.value("issuesLimits").then((L: any) => L.key));
    // Of the running module's cells, every one but its test cells is still defined.
    const had = (await runningCells("brain-issues")).map((v) => v._name).filter((n): n is string => !!n);
    const text = readFileSync(file, "utf8");
    expect(had.filter((n) => n.startsWith("test_")).length).toBeGreaterThan(50);
    expect(had.filter((n) => n.startsWith("test_") && text.includes(`"${n}", [`))).toEqual([]);
    expect(had.filter((n) => !n.startsWith("test_") && !text.includes(`"${n}", [`))).toEqual([]);
  } finally {
    rmSync(into, { recursive: true, force: true });
  }
}, 60000);
