// request_files previews the first 5 lines of a text file. In 3 of 3 runs of 20260928-0150-w13-before*
// the agent read that preview as the whole dataset ("a nice dataset with 4 European cities") and told the
// user so; the CSV had 10 rows. The result must say how many lines the file has.
// No model: request_files is executed with a stub askBus that returns a 12-line CSV.
// usage: node probe.mjs <notebook.html>   (exit 1 on failure)
import { chromium } from "playwright";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const nb = resolve(process.cwd(), process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session?.askBus, null, { timeout: 120000 });
const output = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  const tool = tv._value.value.find(t => t.id === "request_files");
  const csv = "city,population\n" + Array.from({ length: 11 }, (_, i) => "c" + i + "," + (i + 1) * 1000).join("\n") + "\n";
  const askBus = { request: async () => [new File([csv], "big.csv", { type: "text/csv" })] };
  const r = await tool.execute({ module: "@probe/count", prompt: "a csv" }, { askBus, abort: new AbortController().signal });
  return String(r?.output ?? r);
});
await browser.close();
// 12 lines: header + 11 rows. Accept either count, phrased any way.
const pass = /\b(12|11)\b[^\n]*\b(lines?|rows?)\b/i.test(output);
console.log(JSON.stringify({ pass, output: output.slice(0, 600) }, null, 1));
process.exit(pass ? 0 : 1);
