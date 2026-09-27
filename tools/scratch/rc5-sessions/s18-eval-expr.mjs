// S18: eval_js auto-returns any single expression, including multi-line ones. Before: a multi-line IIFE
// returned a bare undefined (4 times in rc5-train w3's trace) because "is it an expression" was a regex for
// ";" or "\n". No model calls.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage();
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
const cases = [
  ["iife multi-line", "(() => {\n  const a = 2;\n  return a * 21;\n})()", "42"],
  ["chained multi-line", "[1, 2, 3]\n  .map(x => x * 2)\n  .reduce((a, b) => a + b, 0)", "12"],
  ["object literal", "({\n  a: 1,\n  b: 2\n}).b", "2"],
  ["await expr", "await Promise.resolve(7)", "7"],
  ["trailing comment", "6 * 7 // the answer", "42"],
  ["statements + return", "const a = 5;\nreturn a + 1;", "6"],
  ["statements no return", "const a = 5;\na + 1;", "undefined —"],
  ["two calls on two lines", "Math.max(1, 2)\nMath.min(1, 2)", "undefined —"],
];
const out = await page.evaluate(async cases => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length > 10)); i++) await new Promise(r => setTimeout(r, 200));
  const ev = tv._value.value.find(t => t.id === "eval_js");
  const res = [];
  for (const [label, code, want] of cases) {
    const r = await ev.execute({ module: "@tomlarkworthy/robocoop-5", code }, {});
    const got = String(r?.output ?? r);
    res.push((got.startsWith(want) ? "PASS " : "FAIL ") + label + ": " + JSON.stringify(got.slice(0, 70)));
  }
  return res;
}, cases);
console.log(out.join("\n"));
await browser.close();
