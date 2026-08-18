// Functional check for spec-lock: /src/@user/spec.js declares literal examples, and every module write
// re-runs them and appends a scorecard to the apply message. Boots the eval bundle, seeds an
// /instructions.md, a deliberately wrong solution and a 3-example spec (one passing, one failing, one
// whose expected value is NOT in the instructions), then fixes the solution and checks the scorecard
// goes green, still warns UNGROUNDED, persists /spec-scorecard.json and clears rc5_specGate.failing.
// No model calls.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "rc5-bundle.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const INSTRUCTIONS = `# Angle naming

Implement \`classify(deg)\`.

    classify(120)  // => "OBTUSE"

Also expose \`answer\`, whose value is 42.
`;

const solution = (body) => `const _classify = function classify(){return( ${body} )};
const _answer = function answer(){return( 42 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_classify", "classify", [], _classify);
  $def("_answer", "answer", [], _answer);
  return main;
}`;

const SPEC = `const _examples = function examples(){return( [
  { name: "obtuse", js: "classify(120)", expected: "OBTUSE" },
  { name: "answer", js: "answer", expected: 42 },
  { name: "acute", js: "classify(30)", expected: "SHARP ANGLE" }
] )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_examples", "examples", [], _examples);
  return main;
}`;

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT });
await page.evaluate(async () => {
  window.__nbHelpers.force("rc5_host");
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !window.__nbHelpers.byName("rc5_host")) await new Promise((r) => setTimeout(r, 200));
});

const seed = (path, content) => page.evaluate(async ({ path, content }) => {
  const host = window.__nbHelpers.byName("rc5_host");
  if (!host || typeof host.seedFile !== "function") throw new Error("rc5_host.seedFile unavailable");
  return host.seedFile(path, String(content));
}, { path, content });

await seed("/instructions.md", INSTRUCTIONS);
const rSol1 = await seed("/src/@user/solution.js", solution('n => "OBTUSE"'));
console.log("solution v1:", rSol1.msg);
const rSpec = await seed("/src/@user/spec.js", SPEC);
console.log("spec:       ", rSpec.msg);
const rSol2 = await seed("/src/@user/solution.js", solution('n => n > 90 ? "OBTUSE" : "SHARP ANGLE"'));
console.log("solution v2:", rSol2.msg);

const after = await page.evaluate(async () => {
  const host = window.__nbHelpers.byName("rc5_host");
  const snap = await host.snapshotFiles();
  const gate = window.__nbHelpers.byName("rc5_specGate");
  return {
    hasScorecardFile: "/spec-scorecard.json" in snap,
    scorecardFile: String(snap["/spec-scorecard.json"] ?? "").slice(0, 400),
    scorecard: gate ? gate.scorecard : null,
  };
});
console.log("scorecard file:", after.scorecardFile);
console.log("rc5_specGate.scorecard:", JSON.stringify(after.scorecard));
await close();

const red = /spec scorecard/.test(rSpec.msg) && /FAILING/.test(rSpec.msg) && /acute/.test(rSpec.msg);
const green = /✓ spec scorecard 3\/3 examples pass/.test(rSol2.msg) && !/FAILING/.test(rSol2.msg);
// v2: UNGROUNDED is informational — it must NOT tell the model to re-copy (which drove example deletion).
const ungrounded = /WARNING 1 UNGROUNDED \(paraphrased, not copied\): acute \(informational — fine if derived from stated rules; never delete examples to satisfy grounding\)/.test(rSol2.msg)
  && !/re-copy the expected values verbatim/.test(rSol2.msg);
const persisted = after.hasScorecardFile;
const cleared = !!after.scorecard && Array.isArray(after.scorecard.failing) && after.scorecard.failing.length === 0 && after.scorecard.passing.length === 3;
// module-map logs one of these per module every time a new @user module appears; it also fires on the
// UNMODIFIED notebook (verified against the lopebooks canonical), so it is boot noise, not spec-lock's.
const KNOWN_NOISE = /error building module dependancy map/;
const errors = consoleErrors.filter((e) => !KNOWN_NOISE.test(e));
const noErrors = errors.length === 0;
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none (" + consoleErrors.length + " known module-map notices ignored)");
console.log(`\nred-on-fail: ${red ? "PASS" : "FAIL"}  green-on-fix: ${green ? "PASS" : "FAIL"}  ungrounded-warning: ${ungrounded ? "PASS" : "FAIL"}  scorecard-file: ${persisted ? "PASS" : "FAIL"}  gate-cleared: ${cleared ? "PASS" : "FAIL"}  console-clean: ${noErrors ? "PASS" : "FAIL"}`);
process.exit(red && green && ungrounded && persisted && cleared && noErrors ? 0 : 1);
