import { chromium } from "playwright";
import fs from "fs";
const c = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1400,height:1100} });
await ctx.addCookies([
  {name:"I",value:c.I,domain:".observablehq.com",path:"/",httpOnly:true,secure:true},
  {name:"T",value:c.T,domain:".observablehq.com",path:"/",secure:true},
]);
const page = await ctx.newPage();
await page.goto("https://new.observablehq.com/@tomlarkworthy/module-map", { waitUntil:"domcontentloaded" });
for (let i=0;i<6;i++){ await page.mouse.wheel(0,500); await page.waitForTimeout(400); }
await page.waitForTimeout(22000);
const f = page.frames().find(fr => fr.url().includes("observableusercontent"));
const out = await f.evaluate(() => {
  const rt = window.__ojs_runtime;
  const vars=[...rt._variables], builtin=rt._builtin, imports=new Set(rt._modules.values());
  // rendered
  const labels=[...document.querySelectorAll("svg text")].map(t=>t.textContent.trim()).filter(Boolean);
  const arrows=document.querySelectorAll("svg path[stroke*='gradient'], svg g[aria-label*='arrow'] path, svg path").length;
  // module-def vars host analysis
  const mdv = vars.filter(v=>v._name&&v._name.startsWith("module ")&&!v._name.startsWith("module <unknown"));
  const mods=[...new Set(vars.map(v=>v._module))];
  const mainC=mods.filter(m=>!imports.has(m)&&m!==builtin&&!m._source);
  const main=mainC[0];
  // how many mdv are hosted on main vs imported
  const hostStats={onMain:0, onImported:0, onBuiltin:0, onOther:0};
  for(const v of mdv){ const m=v._module; if(m===main)hostStats.onMain++; else if(imports.has(m))hostStats.onImported++; else if(m===builtin)hostStats.onBuiltin++; else hostStats.onOther++; }
  // sample of mdv with names + value-module resolution
  return {
    renderedLabels: labels,
    renderedLabelCount: labels.length,
    svgPathCount: arrows,
    mdvCount: mdv.length,
    mdvNameSample: mdv.slice(0,8).map(v=>v._name),
    hostStats
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
