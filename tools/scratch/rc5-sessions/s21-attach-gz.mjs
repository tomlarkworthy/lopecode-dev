// S21: attach_file warns when a .gz name holds bytes that are not gzip (w4: a plain +esm bundle stored as
// abcjs.js.gz, so the unzip in the cell failed). No model: the tool is executed directly.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 300 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  const tools = new Map(tv._value.value.map(t => [t.id, t]));
  await tools.get("write_file").execute({ file_path: "/src/@probe/gz.js", content: `export default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer("x")).define("x", [], () => 1);\n  return main;\n}` }, {});
  const plain = (await tools.get("attach_file").execute({ module: "@probe/gz", name: "lib.js.gz", content: "export default 1;" }, {})).output;
  const ok = (await tools.get("attach_file").execute({ module: "@probe/gz", name: "lib2.js", content: "x" }, {})).output;
  return { plain, ok };
});
console.log(JSON.stringify(out, null, 1));
console.log(/WARNING/.test(out.plain) && !/WARNING/.test(out.ok) ? "PASS" : "FAIL");
await browser.close();
