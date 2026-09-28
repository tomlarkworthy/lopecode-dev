// S38: a module the agent writes can import a published module straight from its atproto blob URL
// (com.atproto.sync.getBlob), including that module's own "/@tomlarkworthy/x.js?v=4" imports.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const [mod, cid, symbol] = (process.argv[3] || "@tomlarkworthy/sticky,bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m,sticky").split(",");
const url = `https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=${cid}`;
const src = `const _probe = function probe(${symbol}){return( typeof ${symbol} )};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("probe")).define("probe", [${JSON.stringify(symbol)}], _probe);
  main.define("module ${mod}", async () => ${JSON.stringify(mod)} && runtime.module((await import(${JSON.stringify(url)})).default));
  main.define(${JSON.stringify(symbol)}, ["module ${mod}", "@variable"], (_, v) => v.import(${JSON.stringify(symbol)}, _));
  return main;
}`;
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => m.type() === "error" && errors.push(m.text()));
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session?.askBus, null, { timeout: 120000 });
const out = await page.evaluate(async (src) => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  const tools = new Map(tv._value.value.map(t => [t.id, t]));
  const w = await tools.get("write_file").execute({ file_path: "/src/@probe/blobimport.js", content: src }, {});
  const m = rt.mains.get("@probe/blobimport");
  const v = [...rt._variables].find(x => x._module === m && x._name === "probe");
  let val; try { val = await Promise.race([v._promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout 30s")), 30000))]); } catch (e) { val = "ERR " + e.message; }
  const loaders = [...rt._variables].filter(x => x._module === m && String(x._name).startsWith("module ")).map(x => x._name + " := " + String(x._definition).slice(0, 300));
  return { write: String(w?.output ?? w).slice(0, 400), probe: val, loaders };
}, src);
// save: does the export embed the blob-imported module, and does the saved file compute it with the PDS unreachable?
const html = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  return typeof r === "string" ? r : r.source;
});
const { writeFileSync, mkdtempSync } = await import("node:fs");
const saved = resolve(here, ".s38-saved.html");
writeFileSync(saved, html);
out.embedded = html.includes(`id="${mod}"`);
await page.route("https://earthstar.us-east.host.bsky.network/**", r => r.abort());
await page.goto(pathToFileURL(saved).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 });
out.reopenedOffline = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@probe/blobimport");
  if (!m) return "no @probe/blobimport module after reopen";
  const v = [...rt._variables].find(x => x._module === m && x._name === "probe");
  if (!v._reachable) m.variable(true).define(["probe"], x => x);
  try { return await Promise.race([v._promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout 30s")), 30000))]); } catch (e) { return "ERR " + e.message; }
});
out.blockIds = [...html.matchAll(/<script[^>]*\bid="([^"]*)"/g)].map(m => m[1]).filter(i => /sheet|sticky|getBlob|bafkrei|blob/i.test(i)); out.importLine = (html.match(/main.define\("module [^"]*(sheet|sticky)[^\n]{0,200}/) || [""])[0];
out.probeBlock = (html.match(/id="@probe\/blobimport"[^>]*>([\s\S]{0,1500})/) || [,""])[1]; out.sheetDefs = (html.match(/\$def\("[^"]*", "sheet"/g) || []).length;
(await import("node:fs")).unlinkSync(saved);
console.log(JSON.stringify({ ...out, errors: errors.filter(e => !/module dependancy map/.test(e)).slice(0, 5) }, null, 1));
await browser.close();
