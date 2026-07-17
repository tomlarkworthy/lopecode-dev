// Functional check for the write auto-feedback: values of written cells + cross-module downstream
// recompute report must appear in the SAME apply result. Boots the eval notebook, writes module A,
// writes module B importing from A, then re-writes A and inspects B's blast radius in A's apply msg.
import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "eval", "robocoop-5-eval.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const A1 = `const _x = function x(){return( 1 )};
const _doubled = function doubled(x){return( x * 2 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_x", "x", [], _x);
  $def("_doubled", "doubled", ["x"], _doubled);
  return main;
}`;
const B = `const _tripled = function tripled(x){return( x * 3 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  main.define("module @user/afeed", async () => runtime.module((await import("@user/afeed")).default));
  main.define("x", ["module @user/afeed", "@variable"], (_, v) => v.import("x", _));
  $def("_tripled", "tripled", ["x"], _tripled);
  return main;
}`;
const A2 = A1.replace("return( 1 )", "return( 10 )");

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(`file://${NB}#view=${LAYOUT}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });

const seed = (path, content) => page.evaluate(async ({ path, content }) => {
  const reg = globalThis.__ojs_runtime;
  let host = null;
  for (const m of reg.mains.values()) {
    const rt = m && m._runtime;
    if (!rt) continue;
    for (const v of rt._variables) if (v._name === "rc5_host") { host = v._value; break; }
    if (host) break;
  }
  if (!host) {
    for (const m of reg.mains.values()) {
      const rt = m && m._runtime;
      if (!rt) continue;
      for (const v of rt._variables) if (v._name === "rc5_host" && v._module) { try { await v._module.value("rc5_host"); host = v._value; } catch {} }
      if (host) break;
    }
  }
  if (!host || typeof host.seedFile !== "function") throw new Error("rc5_host.seedFile unavailable");
  return host.seedFile(path, String(content));
}, { path, content });

// force rc5_host to compute
await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime;
  for (const m of reg.mains.values()) {
    const rt = m && m._runtime;
    if (!rt) continue;
    for (const v of rt._variables) if (v._name === "rc5_host" && v._module) { try { await v._module.value("rc5_host"); } catch {} }
  }
});

const r1 = await seed("/src/@user/afeed.js", A1);
console.log("A write 1:", r1.msg);
const r2 = await seed("/src/@user/bsink.js", B);
console.log("B write:  ", r2.msg);
await new Promise((r) => setTimeout(r, 500));
const r3 = await seed("/src/@user/afeed.js", A2);
console.log("A write 2:", r3.msg);
await browser.close();

const ok1 = /values:.*x=1/.test(r1.msg) && /doubled=2/.test(r1.msg);
const ok3 = /values:.*x=10/.test(r3.msg) && /doubled=20/.test(r3.msg);
const okDown = /downstream recomputed:.*bsink.*tripled=30/.test(r3.msg);
console.log(`\nvalues-in-result: ${ok1 && ok3 ? "PASS" : "FAIL"}  cross-module-downstream: ${okDown ? "PASS" : "FAIL"}`);
process.exit(ok1 && ok3 && okDown ? 0 : 1);
