// cloud-brain-dev/test.ts: a test's value over 120 characters and an error over 600 are cut, and the cut says so.
// Issue test-ts-cuts-returned-value; tools/cloud-brain/records/test-ts-cuts-returned-value.md.
//
//   bun test ./tests/tools/test-ts-cut.test.ts
// test.ts is run on a copy beside a deploy/ of one module made here, with the runtime and the bootloader the
// repository commits. No call leaves the machine, and deploy/ of the checkout is not read for a service.
import { test as always, expect } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { testNeeding } from "./needs.ts";

const dev = process.env.CLOUD_BRAIN_DEV || resolve(import.meta.dir, "../../cloud-brain-dev");
const shared = ["@observablehq/runtime@6.0.0.js", "@tomlarkworthy/bootloader.js"];
const test = testNeeding("test-ts-cut.test.ts", [join(dev, "test.ts"), ...shared.map((f) => join(dev, "deploy", f))]);
// Until the branch test-ts-cuts-returned-value of cloud-brain-dev is pushed and the pointer here moves, the test.ts
// of main has no mark. The two tests of it then run only with TEST_TS_MARKS_A_CUT=1, where they fail.
const fixed = test !== always.skip && /--whole/.test(readFileSync(join(dev, "test.ts"), "utf8"));
const reported = fixed && /--report/.test(readFileSync(join(dev, "test.ts"), "utf8"));
const marked = fixed || process.env.TEST_TS_MARKS_A_CUT ? test : test.skip;
if (test !== always.skip && marked === test.skip) console.log(`skipped: test-ts-cut.test.ts: ${join(dev, "test.ts")} has no --whole (the branch test-ts-cuts-returned-value of cloud-brain-dev is not in this checkout's pointer); TEST_TS_MARKS_A_CUT=1 runs the two tests on it`);

// The cells of the module: what each returns or throws, by length.
const cells = `
  main.variable(observer("test_value_120")).define("test_value_120", [], () => "v".repeat(120));
  main.variable(observer("test_value_121")).define("test_value_121", [], () => "v".repeat(120) + "W");
  main.variable(observer("test_value_5000")).define("test_value_5000", [], () => "head" + "v".repeat(4990) + "tail!!");
  main.variable(observer("test_value_none")).define("test_value_none", [], () => undefined);
  main.variable(observer("test_error_600")).define("test_error_600", [], () => { throw new Error("e".repeat(600)); });
  main.variable(observer("test_error_601")).define("test_error_601", [], () => { throw new Error("e".repeat(600) + "F"); });
`;
const run = async (...flags: string[]) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "test-ts-cut-")));
  try {
    copyFileSync(join(dev, "test.ts"), join(dir, "test.ts"));
    mkdirSync(join(dir, "deploy/@tomlarkworthy"), { recursive: true });
    mkdirSync(join(dir, "deploy/@observablehq"));
    mkdirSync(join(dir, "deploy/@probe"));
    for (const f of shared) symlinkSync(join(dev, "deploy", f), join(dir, "deploy", f));
    writeFileSync(join(dir, "deploy/@probe/lengths.js"), `export default function define(runtime, observer) {\n  const main = runtime.module();${cells}  return main;\n}\n`);
    writeFileSync(join(dir, "deploy/shared.json"), JSON.stringify({ files: [] }));
    writeFileSync(join(dir, "deploy/services.json"), JSON.stringify({ services: [{ worker: "brain-x-lengths", module: "@probe/lengths", hash: "h", text: "" }] }));
    // Since test-ts-output-floods-the-reader the report is a file (--report); a test.ts from before it prints the line.
    const file = join(dir, "report.json");
    const p = Bun.spawn(["bun", join(dir, "test.ts"), "brain-x-lengths", ...flags, "--report", file], { stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    const line = (existsSync(file) ? readFileSync(file, "utf8") : out).split("\n").find((l) => l.startsWith('{"worker"'));
    if (!line) throw new Error(`test.ts printed no report, exit ${code}: ${err.slice(0, 2000)}`);
    const report = JSON.parse(line);
    const of = (name: string) => report.tests.find((t: any) => t.name === name) as { state: string; value?: string; error?: string };
    return { code, out, report, of };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("a value of 120 characters and an error of 600 are printed as they are", async () => {
  const r = await run();
  expect([r.report.passed, r.report.failed, r.report.needsBrowser, r.code]).toEqual([4, 2, 0, 1]);
  expect(r.of("test_value_120").value).toBe("v".repeat(120));
  expect(r.of("test_value_none").value).toBe("undefined");
  expect(r.of("test_error_600").error).toBe("e".repeat(600));
});

marked("a value over 120 characters and an error over 600 are cut, and each says so with its length", async () => {
  const r = await run();
  const v121 = r.of("test_value_121").value!, v5000 = r.of("test_value_5000").value!, e601 = r.of("test_error_601").error!;
  // What was printed before is still the start, so the first 120 (or 600) characters are the test's own.
  expect([v121.slice(0, 120), v5000.slice(0, 120), e601.slice(0, 600)]).toEqual(["v".repeat(120), "head" + "v".repeat(116), "e".repeat(600)]);
  expect(v121.slice(120)).toMatch(/cut.*\b120 of 121\b.*--whole/);
  expect(v5000.slice(120)).toMatch(/cut.*\b120 of 5000\b.*--whole/);
  expect(e601.slice(600)).toMatch(/cut.*\b600 of 601\b.*--whole/);
  // Nothing of the part that was cut is in the line, and the line a failed test prints has the mark too.
  expect([v121.includes("W"), v5000.includes("tail!!"), e601.includes("F")]).toEqual([false, false, false]);
  // Two failed, so each has 240 characters of its error in the last lines; the report has the 600 (above).
  expect(r.out).toMatch(reported ? /^FAIL test_error_601: e{240}… \(cut: 240 of 601 characters\)$/m : /FAIL test_error_601 \n {5}e{600}[^\n]*600 of 601/);
  expect([r.report.passed, r.report.failed]).toEqual([4, 2]);
});

marked("--whole prints every value and error whole, with no mark", async () => {
  const r = await run("--whole");
  expect(r.of("test_value_120").value).toBe("v".repeat(120));
  expect(r.of("test_value_121").value).toBe("v".repeat(120) + "W");
  expect(r.of("test_value_5000").value).toBe("head" + "v".repeat(4990) + "tail!!");
  expect(r.of("test_error_600").error).toBe("e".repeat(600));
  expect(r.of("test_error_601").error).toBe("e".repeat(600) + "F");
  expect([r.report.passed, r.report.failed, r.report.needsBrowser, r.code]).toEqual([4, 2, 0, 1]);
});
