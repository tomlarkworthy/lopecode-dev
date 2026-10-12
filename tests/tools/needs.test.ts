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
import { seedModule, testNeedingSeed, testNeedingSeedAnd } from "./needs.ts";

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

test("the two SQL tests read their statements from the seed of the checkout, and no file of tests/tools names the built notebook to read it", async () => {
  const needs = await import("./needs.ts");
  expect(Object.keys(needs).filter((k) => /^(BUILT|COMMITTED|notebookOf)$/.test(k))).toEqual([]);
  for (const [file, seed] of [["issue-lock-sql.test.ts", "brain-issues.ojs"], ["topic-sql.test.ts", "brain-topic.ojs"]]) {
    const src = readFileSync(resolve(here, file), "utf8");
    expect(src).toContain(`await testNeedingSeedAnd("${file}", "${seed}", [BRAIN_DB])`);
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
test("a module is compiled from the seed of this checkout, once, into a file that is not in the checkout", async () => {
  const file = await seedModule("brain-issues.ojs");
  expect(file).toEndWith("/brain-issues.js");
  expect(file.startsWith(resolve(here, "../.."))).toBe(false);
  expect(await seedModule("brain-issues.ojs")).toBe(file);
  // The list of issue.cost's fields, as the seed has it, is in what was compiled.
  const fields = readFileSync(resolve(here, "../../tools/cloud-brain/brain-issues.ojs"), "utf8").match(/ cost: \[("[a-z]+"(, )?)+\]/)![0];
  expect(readFileSync(file, "utf8")).toContain(fields);
  expect((await testNeedingSeed("needs.test.ts", "brain-issues.ojs")).module).toBe(file);
}, 60000);

// Issue rows-add-within-sql-fails-once-in-suite: in the first run of the suite in a checkout, cost-events.test.ts imported
// brain-issues.js, cloudflare-iac.js was then written beside it, and every test of rows-add-within-sql.test.ts failed with
// "Cannot find module". A directory that is new to this process is that first run.
test("a second seed, compiled after the first seed's module was imported, is found by import()", async () => {
  const into = mkdtempSync(join(tmpdir(), "seed-module-test-"));
  try {
    const first = await seedModule("xrpc-client.ojs", into);
    expect(first.startsWith(into)).toBe(true);
    expect(typeof (await import(pathToFileURL(first).href)).default).toBe("function");
    const second = await seedModule("brain-operator.ojs", into);
    expect(typeof (await import(pathToFileURL(second).href)).default).toBe("function");
    expect(dirname(second)).not.toBe(dirname(first));
    expect(await seedModule("xrpc-client.ojs", into)).toBe(first);
  } finally {
    rmSync(into, { recursive: true, force: true });
  }
}, 60000);

// Issue bk-4-install-the-project-workflow: issues-policy-v4.test.ts runs a cell that is not in the seed, in the seed's rig.
test("a seed compiled with an edit of its text is another file under the edit's name, and the seed's own module is as it was", async () => {
  const into = mkdtempSync(join(tmpdir(), "seed-module-test-"));
  try {
    const plain = await seedModule("xrpc-client.ojs", into);
    const edit = { name: "xrpc-client-and-one", text: (seed: string) => seed + "\n// %%\none_more_cell_of_a_test = 41 + 1\n" };
    const edited = await seedModule("xrpc-client.ojs", into, edit);
    expect(edited).toEndWith("/xrpc-client-and-one/xrpc-client-and-one.js");
    expect(readFileSync(edited, "utf8")).toContain("one_more_cell_of_a_test");
    expect(readFileSync(plain, "utf8")).not.toContain("one_more_cell_of_a_test");
    // Asked again, each is the file it was.
    expect([await seedModule("xrpc-client.ojs", into, edit), await seedModule("xrpc-client.ojs", into)]).toEqual([edited, plain]);
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
