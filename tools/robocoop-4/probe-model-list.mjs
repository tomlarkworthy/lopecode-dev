// Verify the model chooser populates from the OpenRouter catalog: tool-capable models kept, non-tool dropped,
// fallback default merged in, and the <select> gets the options. Catalog is mocked for determinism.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "S100(@tomlarkworthy/robocoop-4)";
const catalog = { data: [
  { id: "zeta/tool-model", supported_parameters: ["tools", "temperature"] },
  { id: "alpha/tool-model", supported_parameters: ["tools"] },
  { id: "beta/no-tools", supported_parameters: ["temperature"] },
] };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.route("**/api/v1/models", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(catalog) }));
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-probe"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(6000);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  function allVars(){const o=[];const s=new Set();for(const m of reg.mains.values()){const rt=m?._runtime;if(!rt||s.has(rt))continue;s.add(rt);for(const v of rt._variables)o.push(v);}return o;}
  const find=(n)=>allVars().find(v=>v._name===n);
  const v = find("openrouter_models");
  if (v?._module?.value) { try { v._module.value("openrouter_models").catch(()=>{}); } catch {} await sleep(300); try { await Promise.race([v._promise, sleep(5000)]); } catch {} }
  document.querySelectorAll("details").forEach(d => d.open = true);
  await sleep(500);
  const list = find("openrouter_models")?._value || [];
  const sel = document.querySelector(".rc4-settings select");
  return {
    count: list.length,
    hasToolModels: list.includes("zeta/tool-model") && list.includes("alpha/tool-model"),
    droppedNonTool: !list.includes("beta/no-tools"),
    fallbackMerged: list.includes("anthropic/claude-sonnet-4"),
    sorted: JSON.stringify(list) === JSON.stringify([...list].sort()),
    selectOptionCount: sel ? sel.options.length : null,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
