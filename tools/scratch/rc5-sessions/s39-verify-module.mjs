// S39: verify a module source in the real robocoop-5 page, the way the agent would apply it.
//   node s39-verify-module.mjs <module.js> [--id @user/name] [--notebook f.html] [--save]
// Writes it with write_file to /src/<id>.js, forces every named cell, waits up to 30s each, and prints
// each cell's value type/preview or error, the tool's result text, and page errors. --save also exports,
// reopens the file with the network to atproto/observable/jsdelivr/esm.sh blocked, and re-checks the cells.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const id = flag("--id", "@user/verify");
const nb = resolve(flag("--notebook", resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html")));
const save = args.includes("--save") ? (args.splice(args.indexOf("--save"), 1), true) : false;
const src = readFileSync(resolve(args[0]), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => m.type() === "error" && !/module dependancy map|ERR_NETWORK|Failed to load resource/.test(m.text()) && errors.push(m.text().slice(0, 300)));
const check = () => page.evaluate(async (id) => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get(id);
  if (!m) return { error: "module " + id + " not in runtime.mains" };
  const vs = [...rt._variables].filter(v => v._module === m && v._name && !String(v._name).startsWith("module "));
  for (const v of vs) if (!v._reachable) m.variable(true).define([v._name], x => x);
  const out = {};
  for (const v of vs) {
    try {
      const x = await Promise.race([v._promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout 30s")), 30000))]);
      const t = x instanceof Element ? "<" + x.tagName.toLowerCase() + "> " + (x.textContent || "").trim().slice(0, 80) : typeof x === "function" ? "function" : (() => { try { return JSON.stringify(x)?.slice(0, 120); } catch { return String(x).slice(0, 120); } })();
      out[v._name] = t;
    } catch (e) { out[v._name] = "ERROR " + String(e?.message ?? e).slice(0, 200); }
  }
  return out;
}, id);
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session?.askBus, null, { timeout: 120000 });
const tool = await page.evaluate(async ({ src, id }) => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  const tools = new Map(tv._value.value.map(t => [t.id, t]));
  const r = await tools.get("write_file").execute({ file_path: "/src/" + id + ".js", content: src }, {});
  return String(r?.output ?? r);
}, { src, id });
const result = { tool: tool.slice(0, 1500), cells: await check() };
if (save) {
  const html = await page.evaluate(async () => {
    const rt = window.__ojs_runtime;
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const r = await f({ mains: rt.mains });
    return typeof r === "string" ? r : r.source;
  });
  const saved = resolve(here, ".s39-saved.html"); writeFileSync(saved, html);
  result.embeddedIds = [...html.matchAll(/<script[^>]*\bid="(@[^"]*)"/g)].map(m => m[1]).filter(i => !/^@tomlarkworthy\/(robocoop|lopepage|exporter|editor|module|runtime|file-sync|markdown-wiki|save-in-place|claude|cell-map|visualizer|themes|command|plugin|local-change|tests|observablejs|js-toolchain|code-metrics|summarizejs|fileattachments|local-disk|pyodide|bootloader|acorn|jszip|dom-view|view|codemirror|lopepage-urls|stream|annotate|isomorphic|lightning|dexie|escodegen|safe|access|notebook|mootari|observable-runtime|inspector)/.test(i));
  await page.route(/bsky\.network|observablehq\.com|jsdelivr|esm\.sh|unpkg/, r => r.abort());
  await page.goto(pathToFileURL(saved).href);
  await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  result.reopenedOffline = await check();
  unlinkSync(saved);
}
result.pageErrors = errors.slice(0, 8);
console.log(JSON.stringify(result, null, 1));
await browser.close();
