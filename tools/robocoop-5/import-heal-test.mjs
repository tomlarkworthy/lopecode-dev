// Deterministic regression test for the jbApply plumbing-upsert fix (F7, now in @tomlarkworthy/file-sync):
// a module whose first write has a BROKEN import binding (missing "@variable") must be healable by
// re-writing the file with the corrected plumbing — the create-only jbApply skipped the fix ("0 cells
// changed") and the module stayed wedged. No model calls.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT });

const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "rc5_host"].forEach((n) => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) { if (H.byName("rc5_host")) break; await new Promise((r) => setTimeout(r, 300)); }
  const host = H.byName("rc5_host");
  if (!host) return { error: "rc5_host missing" };

  const mathlib =
    'const _triple = function triple(){return( n => n * 3 )};\n' +
    'export default function define(runtime, observer) {\n' +
    '  const main = runtime.module();\n' +
    '  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n' +
    '  $def("_triple", "triple", [], _triple);\n  return main;\n}\n';
  const calc = (binding) =>
    'const _result = function result(triple){return( triple(14) )};\n' +
    'export default function define(runtime, observer) {\n' +
    '  const main = runtime.module();\n' +
    '  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n' +
    '  main.define("module @user/mathlib", async () => runtime.module((await import("@user/mathlib")).default));\n' +
    binding +
    '  $def("_result", "result", ["triple"], _result);\n  return main;\n}\n';
  const BROKEN = '  main.define("triple", ["module @user/mathlib"], (_, v) => v.import("triple", _));\n';
  const FIXED = '  main.define("triple", ["module @user/mathlib", "@variable"], (_, v) => v.import("triple", _));\n';

  const r = {};
  r.seedMathlib = (await host.seedFile("/src/@user/mathlib.js", mathlib)).msg?.slice(0, 60);
  const broken = await host.seedFile("/src/@user/calc.js", calc(BROKEN));
  r.brokenReported = /ERRORING|error/i.test(String(broken.msg));
  const fixed = await host.seedFile("/src/@user/calc.js", calc(FIXED));
  r.fixedMsg = String(fixed.msg).slice(0, 140);
  r.fixedChangedCells = !/0 cells changed/.test(String(fixed.msg));
  const calcMod = globalThis.__ojs_runtime.mains.get("@user/calc");
  try { r.result = await calcMod.value("result"); } catch (e) { r.result = "ERROR: " + (e?.message ?? e); }
  return r;
});

console.log(JSON.stringify(out, null, 2));
const pass = out.result === 42 && out.brokenReported && out.fixedChangedCells;
console.log(pass ? "HEAL TEST: PASS" : "HEAL TEST: FAIL");
await close();
process.exit(pass ? 0 : 1);
