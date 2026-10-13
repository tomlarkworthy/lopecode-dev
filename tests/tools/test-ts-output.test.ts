// cloud-brain-dev/test.ts: its last lines are the result, short enough for `| tail -15`; the JSON is a file; what the
// modules print with console.* is a file too. Issue test-ts-output-floods-the-reader;
// tools/cloud-brain/records/test-ts-output-floods-the-reader.md.
//
//   bun test --timeout=30000 ./tests/tools/test-ts-output.test.ts
// test.ts and all.ts are run on copies beside a deploy/ made here, with the runtime and the bootloader the repository
// commits, through `sh -c "bun test.ts <worker> 2>&1 | tail -15"`: the command of the brief. No call leaves the machine.
import { test as always, expect } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { testNeeding } from "./needs.ts";

const dev = process.env.CLOUD_BRAIN_DEV || resolve(import.meta.dir, "../../cloud-brain-dev");
const shared = ["@observablehq/runtime@6.0.0.js", "@tomlarkworthy/bootloader.js"];
const needing = testNeeding("test-ts-output.test.ts", [join(dev, "test.ts"), join(dev, "all.ts"), ...shared.map((f) => join(dev, "deploy", f))]);
// A clone from before the change has no --report: the tests would fail on it, and say nothing of this checkout's text.
const has = needing !== always.skip && /--report/.test(readFileSync(join(dev, "test.ts"), "utf8"));
const test = has || process.env.TEST_TS_HAS_A_REPORT ? needing : needing.skip;
if (needing !== always.skip && test === needing.skip) console.log(`skipped: test-ts-output.test.ts: ${join(dev, "test.ts")} has no --report (the clone is behind this checkout's pointer); TEST_TS_HAS_A_REPORT=1 runs the tests on it`);

const cell = (name: string, body: string) => `  main.variable(observer("${name}")).define("${name}", [], () => { ${body} });\n`;
const many = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join("");
const name = (kind: string, i: number) => `test_${kind}_${String(i).padStart(2, "0")}_with_a_name_as_long_as_a_test_has`;
// 40 that pass with a value of 5,000 characters, each of which logs an object as a Worker does.
const passing = many(40, (i) => cell(name("passes", i), `console.log({ at: "probe.line", n: ${i}, text: "L".repeat(300) }); return "v".repeat(5000);`));
const failing = (n: number) => many(n, (i) => cell(name("fails", i), `throw new Error("E${i} first line\\nsecond line " + "e".repeat(5000));`));
const mod = (cells: string) => `export default function define(runtime, observer) {\n  const main = runtime.module();\n${cells}  return main;\n}\n`;

// A deploy/ of the modules given, and test.ts beside it. `sh` runs a shell line there.
const rig = async (modules: Record<string, string>, f: (dir: string, sh: (line: string) => Promise<{ code: number; out: string }>) => Promise<void>) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "test-ts-output-")));
  try {
    for (const f of ["test.ts", "all.ts"]) copyFileSync(join(dev, f), join(dir, f));
    mkdirSync(join(dir, "deploy/@observablehq"), { recursive: true });
    mkdirSync(join(dir, "deploy/@tomlarkworthy"));
    mkdirSync(join(dir, "deploy/@probe"));
    for (const f of shared) symlinkSync(join(dev, "deploy", f), join(dir, "deploy", f));
    const services = Object.keys(modules).map((k) => ({ worker: k.split(":")[0], module: "@probe/" + k.split(":")[1], hash: "0123456789abcdef", text: "" }));
    for (const [k, cells] of Object.entries(modules)) writeFileSync(join(dir, "deploy/@probe", k.split(":")[1] + ".js"), mod(cells));
    writeFileSync(join(dir, "deploy/shared.json"), JSON.stringify({ files: [] }));
    writeFileSync(join(dir, "deploy/services.json"), JSON.stringify({ services }));
    await f(dir, async (line) => {
      const p = Bun.spawn(["sh", "-c", line], { cwd: dir, stdout: "pipe", stderr: "pipe" });
      const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
      return { code, out: out + err };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
const report = (file: string) => readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));

test("40 tests pass with long values and log lines: the tail is the counts and two files, under 2,000 characters", async () => {
  await rig({ "brain-x-quiet:quiet": passing }, async (dir, sh) => {
    const all = await sh("bun test.ts brain-x-quiet 2>&1"), tail = await sh("bun test.ts brain-x-quiet 2>&1 | tail -15");
    expect(tail.out.length).toBeLessThan(2000);
    expect(tail.out.trimEnd().split("\n").at(-1)).toBe("brain-x-quiet @probe/quiet no hash (edited): 40 passed, 0 failed, 0 need a browser");
    expect(tail.out).toContain("report: reports/brain-x-quiet.json");
    expect(tail.out).toContain("log: reports/brain-x-quiet.log (");
    // Neither the JSON nor a logged object is in what is printed, whole.
    expect([all.code, all.out.includes('{"worker"'), all.out.includes("probe.line"), all.out.includes("vvvvv")]).toEqual([0, false, false, false]);
    expect(all.out.length).toBeLessThan(4000);
    // The report is what the last line of stdout was: a line a module, every test with its state and its value, cut.
    const [r] = report(join(dir, "reports/brain-x-quiet.json"));
    expect([r.worker, r.module, r.passed, r.failed, r.needsBrowser, r.tests.length, r.edited]).toEqual(["brain-x-quiet", "@probe/quiet", 40, 0, 0, 40, true]);
    expect(r.tests[0]).toEqual({ name: name("passes", 0), state: "passed", value: "v".repeat(120) + "… (cut: 120 of 5000 characters; --whole prints all)" });
    // The log has each object the cells printed.
    expect(readFileSync(join(dir, "reports/brain-x-quiet.log"), "utf8").match(/probe\.line/g)!.length).toBe(40);
  });
});

test("2 of 42 fail: the tail has each failed test by name with the start of its error, and the counts", async () => {
  await rig({ "brain-x-two:two": passing + failing(2) }, async (dir, sh) => {
    const all = await sh("bun test.ts brain-x-two 2>&1"), tail = await sh("bun test.ts brain-x-two 2>&1 | tail -15");
    expect(all.code).toBe(1);
    expect(tail.out.length).toBeLessThan(2000);
    for (const i of [0, 1]) expect(tail.out).toMatch(new RegExp(`^FAIL ${name("fails", i)}: E${i} first line ⏎ second line e{212}… \\(cut: 240 of \\d+ characters\\)$`, "m"));
    expect(tail.out.trimEnd().split("\n").at(-1)).toBe("brain-x-two @probe/two no hash (edited): 40 passed, 2 failed, 0 need a browser");
    // The report has 600 characters of each error, as before.
    const [r] = report(join(dir, "reports/brain-x-two.json"));
    expect(r.tests.filter((t: any) => t.state === "failed").map((t: any) => [t.name, t.error.slice(0, 13), t.error.length > 600, Object.keys(t).sort().join()])).toEqual(
      [0, 1].map((i) => [name("fails", i), `E${i} first line`, true, "error,name,state"]));
  });
});

test("one fails: 600 characters of its error; --whole: all of it, and the report whole", async () => {
  await rig({ "brain-x-one:one": failing(1) }, async (dir, sh) => {
    const tail = await sh("bun test.ts brain-x-one 2>&1 | tail -15");
    expect(tail.out).toMatch(/^FAIL test_fails_00\w+: E0 first line ⏎ second line e{572}… \(cut: 600 of \d+ characters\)$/m);
    expect(tail.out.length).toBeLessThan(2000);
    const whole = await sh("bun test.ts brain-x-one --whole 2>&1");
    expect(whole.out).toMatch(/^FAIL test_fails_00\w+\n {5}E0 first line\n {5}second line e{5000}$/m);
    expect(report(join(dir, "reports/brain-x-one.json"))[0].tests[0].error).toBe("E0 first line\nsecond line " + "e".repeat(5000));
  });
});

test("every one of 40 fails: the tail names 8, says 32 more failed, and is under 2,000 characters", async () => {
  await rig({ "brain-x-none:none": failing(40) }, async (dir, sh) => {
    const all = await sh("bun test.ts brain-x-none 2>&1"), tail = await sh("bun test.ts brain-x-none 2>&1 | tail -15");
    expect(tail.out.length).toBeLessThan(2000);
    expect(tail.out.match(/^FAIL \w+: E\d+ first line/gm)!.length).toBe(8);
    expect(tail.out).toMatch(/^… and 32 more failed/m);
    expect(tail.out.trimEnd().split("\n").at(-1)).toBe("brain-x-none @probe/none no hash (edited): 0 passed, 40 failed, 0 need a browser");
    // Each of the 40 is named in what is printed above, and has its error in the report.
    for (let i = 0; i < 40; i++) expect(all.out).toContain("FAIL " + name("fails", i));
    expect(report(join(dir, "reports/brain-x-none.json"))[0].tests.filter((t: any) => /^E\d+ first line/.test(t.error)).length).toBe(40);
  });
});

test("a test that needs a browser, one that gives no answer, and a module that does not load", async () => {
  const cells = cell("test_reads_the_document", "return document.title;") + cell("test_never_answers", "return new Promise(() => {});") + cell("test_passes", "return 1;");
  await rig({ "brain-x-odd:odd": cells, "brain-x-broken:broken": "  this is not javascript\n" }, async (dir, sh) => {
    const odd = await sh("bun test.ts brain-x-odd --seconds 1 2>&1 | tail -15");
    expect(odd.out).toMatch(/^skip test_reads_the_document \(document is not defined\)$/m);
    expect(odd.out).toMatch(/^FAIL test_never_answers: no answer in 1 s$/m);
    expect(odd.out.trimEnd().split("\n").at(-1)).toBe("brain-x-odd @probe/odd no hash (edited): 1 passed, 1 failed, 1 need a browser");
    expect(report(join(dir, "reports/brain-x-odd.json"))[0].tests.map((t: any) => t.state)).toEqual(["needs a browser", "failed", "passed"]);
    const broken = await sh("bun test.ts brain-x-broken 2>&1 | tail -15");
    expect(broken.out.length).toBeLessThan(2000);
    expect(broken.out).toMatch(/^FAIL \(the module loads\): \S/m);
    expect(broken.out.trimEnd().split("\n").at(-1)).toBe("brain-x-broken @probe/broken no hash (edited): 0 passed, 1 failed, 0 need a browser");
    expect(report(join(dir, "reports/brain-x-broken.json"))[0].tests).toEqual([{ name: "(the module loads)", state: "failed", error: expect.any(String) }]);
  });
});

test("a Worker of two modules: a line a module in the report and at the end; --report names the file", async () => {
  await rig({ "brain-x-pair:left": passing, "brain-x-pair:right": failing(1) }, async (dir, sh) => {
    const tail = await sh("bun test.ts brain-x-pair --report out/mine.json 2>&1 | tail -15");
    expect(tail.out.length).toBeLessThan(2000);
    expect(tail.out.trimEnd().split("\n").slice(-2)).toEqual([
      "brain-x-pair @probe/left no hash (edited): 40 passed, 0 failed, 0 need a browser",
      "brain-x-pair @probe/right no hash (edited): 0 passed, 1 failed, 0 need a browser"]);
    expect(tail.out).toContain("report: out/mine.json");
    expect(tail.out).toContain("log: out/mine.log");
    expect(report(join(dir, "out/mine.json")).map((r: any) => [r.module, r.passed, r.failed])).toEqual([["@probe/left", 40, 0], ["@probe/right", 0, 1]]);
    expect(existsSync(join(dir, "reports"))).toBe(false);
  });
});

test("a run that stops before its tests leaves no report of the run before", async () => {
  await rig({ "brain-x-quiet:quiet": cell("test_one", "return 1;") }, async (dir, sh) => {
    expect((await sh("bun test.ts brain-x-quiet")).code).toBe(0);
    expect(existsSync(join(dir, "reports/brain-x-quiet.json"))).toBe(true);
    const r = await sh("bun test.ts brain-x-quiet --with no-such-file.js");
    expect([r.code, r.out.trim()]).toEqual([2, "--with: no file at no-such-file.js"]);
    expect(existsSync(join(dir, "reports/brain-x-quiet.json"))).toBe(false);
    // --report with no file after it, with a flag after it, or with a directory, is refused before anything runs.
    for (const flags of ["--report", "--report --whole", "--report deploy"]) {
      const refused = await sh(`bun test.ts brain-x-quiet ${flags}`);
      expect([flags, refused.code, refused.out.split(":")[0]]).toEqual([flags, 2, "--report"]);
    }
    expect((await sh("bun test.ts")).code).toBe(2);
    // A module that logs nothing leaves no log.
    const quiet = await sh("bun test.ts brain-x-quiet");
    expect([quiet.out.includes("log:"), existsSync(join(dir, "reports/brain-x-quiet.log"))]).toEqual([false, false]);
  });
});

test("all.ts reads each report from its file: a line a module with the names of what failed, and the total", async () => {
  await rig({ "brain-x-quiet:quiet": passing, "brain-x-two:two": failing(2) }, async (dir, sh) => {
    const r = await sh("bun all.ts");
    expect(r.code).toBe(1);
    const lines = r.out.trimEnd().split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toMatch(/^brain-x-quiet +quiet +40 passed +0 failed +0 need a browser +0123456789ab|^brain-x-quiet +quiet +40 passed +0 failed +0 need a browser +no hash/);
    expect(lines[1]).toMatch(new RegExp(`^brain-x-two +two +0 passed +2 failed +0 need a browser +no hash +${name("fails", 0)} ${name("fails", 1)}$`));
    expect(lines[2]).toBe("total 40 passed, 2 failed, 0 need a browser");
  });
});

// The texts a writer reads before a run of test.ts say where the JSON is, and none says it is a line of the output.
always("the writer's pages, the cluster guide and the clone's README name the report file, and none a JSON line of stdout", () => {
  const read = (p: string) => readFileSync(resolve(import.meta.dir, "../..", p), "utf8").replace(/\s+/g, " ");
  const pages = ".claude/skills/brain-maintenance/agents/implementer/";
  const seed = read(pages + "seed-tests.md"), landing = read(pages + "landing.md"), guide = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");
  expect(seed).toContain("`2>&1 | tail -15` reads whole");
  expect(seed).toContain("`cloud-brain-dev/reports/<worker>.json`, or `--report FILE`");
  expect(seed).not.toContain("prints a line a test and one line of JSON");
  expect(landing).toContain("Its last line is the count of what now runs");
  expect(landing).not.toContain("Its JSON line is the report");
  expect(guide).toContain("the JSON report is a file, `reports/brain-x-NAME.json` there");
  expect(guide).not.toContain("prints a JSON report with the hash");
});
test("the clone's README and AGENTS.md say the same", () => {
  const read = (p: string) => readFileSync(join(dev, p), "utf8").replace(/\s+/g, " ");
  expect(read("README.md")).toContain("`reports/<worker>.json` here (git-ignored), or the file given with `--report FILE`");
  expect(read("README.md")).not.toContain("then one line of JSON a module, which is the report");
  expect(read("AGENTS.md")).toContain("reports/brain-x-NAME.json (--report FILE)");
  expect(readFileSync(join(dev, ".gitignore"), "utf8").split("\n")).toContain("reports/");
});
