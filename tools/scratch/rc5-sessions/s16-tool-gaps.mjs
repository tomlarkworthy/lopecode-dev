// S16: the tool list a session reads must never go partial while writes/attachments recompute the file
// tools (e9 2026-09-27: "ERROR: unknown tool edit_file" right after an attachment). No model calls.
// Samples toolsView every 5ms through 3 write+attach rounds. Run on a pre-fix copy as the control.
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
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length > 10)); i++) await new Promise(r => setTimeout(r, 200));
  tv = tv._value;
  const all = tv.value.map(t => t.id);
  const tools = new Map(tv.value.map(t => [t.id, t]));
  const gaps = []; let samples = 0, on = true;
  (async () => { while (on) { samples++; const ids = new Set((tv.value || []).map(t => t.id)); const miss = all.filter(n => !ids.has(n)); if (miss.length) gaps.push(miss.length); await new Promise(r => setTimeout(r, 5)); } })();
  for (let i = 0; i < 3; i++) {
    await tools.get("write_file").execute({ file_path: "/src/@probe/gaps.js", content: "export default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer(\"n\")).define(\"n\", [], () => " + i + ");\n  return main;\n}" }, {});
    await tools.get("attach_file").execute({ module: "@probe/gaps", name: "f" + i + ".txt", content: "x" }, {});
    await new Promise(r => setTimeout(r, 400));
  }
  await new Promise(r => setTimeout(r, 1500));
  on = false;
  return { tools: all.length, samples, samplesPartial: gaps.length, worstMissing: Math.max(0, ...gaps), endCount: tv.value.length };
});
console.log(JSON.stringify(out));
await browser.close();
