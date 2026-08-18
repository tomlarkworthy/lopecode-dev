// Functional check for source-context error feedback: when a cell errors, or a jest assertion in a
// cell fails, the agent-facing tool result must carry the FAILING CELL'S SOURCE (whole-cell, fenced)
// and — where the error is structured — expected/received. Also asserts a passing write's feedback
// keeps its old shape. Boots the notebook headless and drives rc5_host + the registered tools.
// No model calls. Usage: node tools/robocoop-5/error-context-check.mjs [notebook.html]
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "rc5-bundle.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const mod = (body, defs, imports = "") => `${body}
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
${imports}${defs}
  return main;
}
`;

// (1) a clean module — feedback must stay in its old shape
const OK = mod(
  `const _n = function n(){return( 41 + 1 )};
const _m = function m(n){return( n * 2 )};`,
  `  $def("_n", "n", [], _n);
  $def("_m", "m", ["n"], _m);`
);

// (2) a cell that compiles clean but throws when observed
const THROWS = mod(
  `const _n = function n(){return( 3 )};
const _boom = function boom(n) {
  const rows = [1, 2];
  return rows[n].missing;
};`,
  `  $def("_n", "n", [], _n);
  $def("_boom", "boom", ["n"], _boom);`
);

// (3) a real jest assertion failure — expect comes from the bundled jest-expect-standalone,
// the same `expect` @tomlarkworthy/testing serves, so the error shape is the real one.
const ASSERT = mod(
  `const _total = function total(){return( 5 )};
const _checkTotal = function checkTotal(expect,total){return(
  expect(total).toBe(6)
)};`,
  `  $def("_total", "total", [], _total);
  $def("_checkTotal", "checkTotal", ["expect","total"], _checkTotal);`,
  `  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("@tomlarkworthy/jest-expect-standalone")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
`
);

// (4) a long throwing cell — source must be elided to head/tail, not dumped whole
const filler = Array.from({ length: 50 }, (_, i) => `  const pad${i} = ${i};`).join("\n");
const LONG = mod(
  `const _huge = function huge() {
${filler}
  return null.nope;
};`,
  `  $def("_huge", "huge", [], _huge);`
);

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT });

const out = await page.evaluate(
  async ({ OK, THROWS, ASSERT, LONG }) => {
    const H = window.__nbHelpers;
    ["session", "toolsView", "hostSetup", "rc5_host"].forEach((n) => H.force(n));
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const tv = H.byName("toolsView");
      if (tv && Array.isArray(tv.value) && tv.value.length >= 10 && H.byName("rc5_host")) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const host = H.byName("rc5_host");
    if (!host) return { fatal: "rc5_host missing" };
    const tv = H.byName("toolsView");
    const byId = new Map((tv && Array.isArray(tv.value) ? tv.value : []).map((t) => [t.id, t]));
    const runTool = async (id, args) => {
      const t = byId.get(id);
      if (!t) return "TOOL MISSING: " + id;
      try { const r = await t.execute(args, {}); return String(r?.output ?? ""); }
      catch (e) { return "THREW: " + (e?.message ?? e); }
    };

    const res = {};
    res.okMsg = (await host.seedFile("/src/@user/clean.js", OK)).msg;
    res.throwMsg = (await host.seedFile("/src/@user/thrower.js", THROWS)).msg;
    res.assertMsg = (await host.seedFile("/src/@user/asserter.js", ASSERT)).msg;
    res.longMsg = (await host.seedFile("/src/@user/longcell.js", LONG)).msg;

    // eval_js: the snippet is the agent's, but a CELL it leans on is what actually blew up.
    res.evalThrow = await runTool("eval_js", { module: "@user/thrower", code: "boom" });
    res.evalAssert = await runTool("eval_js", { module: "@user/asserter", code: "checkTotal" });
    res.inspectAssert = await runTool("inspect_value", { module: "@user/asserter", name: "checkTotal" });

    // Record what the real jest error actually exposes, so the claim is measured not assumed.
    // `expect` is a cell of @user/asserter, so eval_js scoped there has it in scope.
    res.jestShape = await runTool("eval_js", {
      module: "@user/asserter",
      code: `try { expect(5).toBe(6); } catch (e) {
        return JSON.stringify({ ctor: e.constructor && e.constructor.name, ownKeys: Object.keys(e),
          matcherResult: e.matcherResult ? Object.keys(e.matcherResult) : null,
          expected: e.matcherResult && e.matcherResult.expected,
          actual: e.matcherResult && e.matcherResult.actual,
          matcher: e.matcherResult && e.matcherResult.name });
      } return "did not throw";`,
    });
    return res;
  },
  { OK, THROWS, ASSERT, LONG }
);

console.log(JSON.stringify(out, null, 2));

const fence = (s) => /```js/.test(s);
const checks = {
  "clean write keeps its shape": /✓ all \d+ cells? compute/.test(out.okMsg) && !/source of the failing cell/.test(out.okMsg) && !fence(out.okMsg),
  "throwing cell: error named": /ERRORING at runtime/.test(out.throwMsg) && /boom:/.test(out.throwMsg),
  "throwing cell: source attached": fence(out.throwMsg) && /const _boom = function boom/.test(out.throwMsg),
  "assertion cell: source attached": fence(out.assertMsg) && /const _checkTotal = function checkTotal/.test(out.assertMsg),
  "assertion cell: expected/received": /expected 6, received 5/.test(out.assertMsg),
  "eval_js throw: blamed cell source": fence(out.evalThrow) && /const _boom = function boom/.test(out.evalThrow),
  "eval_js assertion: expected/received": /expected 6, received 5/.test(out.evalAssert),
  "inspect_value assertion: source + diff": fence(out.inspectAssert) && /expected 6, received 5/.test(out.inspectAssert),
  "long cell: source elided, not dumped": fence(out.longMsg) && /\d+ lines elided/.test(out.longMsg) && !/pad30/.test(out.longMsg),
};

console.log("");
let ok = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(`${v ? "PASS" : "FAIL"}  ${k}`);
  if (!v) ok = false;
}
console.log("console errors:", consoleErrors.length ? consoleErrors.slice(0, 8) : "none");
await close();
process.exit(ok ? 0 : 1);
