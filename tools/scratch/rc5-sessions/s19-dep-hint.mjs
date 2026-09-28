// S19: a cell whose function params and $def inputs disagree, or that uses an undeclared name, gets a hint
// naming the fix in the apply result. rc5-train w2: the agent added `d3` to the params only, got
// "Cannot read properties of undefined", then fixed the $def list in a second edit, per cell (11 edits).
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage();
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length > 10)); i++) await new Promise(r => setTimeout(r, 200));
  const w = tv._value.value.find(t => t.id === "write_file");
  const src = `const _a = function a(d3){return( d3.max([1, 5, 3]) )};
const _b = function b(){return( d3.min([1, 5, 3]) )};
const _c = function c(d3){return( d3.sum([1, 2]) )};
const _f = function f(md){return( md\`total \${d3.max([1, 2])}\` )};
const _e = function e(){return( new Function("x", "return sin(x)")(1) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_a", "a", [], _a);
  $def("_b", "b", [], _b);
  $def("_c", "c", ["d3"], _c);
  $def("_e", "e", [], _e);
  $def("_f", "f", ["md"], _f);
  return main;
}`;
  return String((await w.execute({ file_path: "/src/@probe/deps.js", content: src }, {}))?.output);
});
const pick = re => (out.match(re) || ["(missing)"])[0].slice(0, 200);
console.log(/a: Cannot read[^;]*takes 1 parameter\(s\) but \$def lists 0/.test(out) ? "PASS" : "FAIL", "params-only:", pick(/a: [^;]*/));
console.log(/b: d3 is not defined \[declare d3 in BOTH/.test(out) ? "PASS" : "FAIL", "undeclared:", pick(/b: [^;]*/));
// a name only in runtime-built code (w20: typed expression "sin(x)") is not a missing cell input
console.log(/e: sin is not defined \[sin is not in this cell's source/.test(out) ? "PASS" : "FAIL", "runtime-built:", pick(/e: [^;]*/));
// a name inside a template hole IS in the cell's source
console.log(/f: d3 is not defined \[declare d3 in BOTH/.test(out) ? "PASS" : "FAIL", "template hole:", pick(/f: [^;]*/));
console.log(!/c: /.test(out.split("ERRORING")[1] || "") ? "PASS" : "FAIL", "correct cell not flagged");
await browser.close();
