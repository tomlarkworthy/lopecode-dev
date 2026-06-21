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
const frames = page.frames();
console.log("frame count:", frames.length, frames.map(f=>f.url().slice(0,60)));
for (const f of frames) {
  try {
    const r = await f.evaluate(() => {
      const rt = window.__ojs_runtime;
      const hasSvgText = document.querySelectorAll("svg text").length;
      if (!rt) return { hasRt:false, hasSvgText };
      const vars=[...rt._variables], builtin=rt._builtin, imports=new Set(rt._modules.values());
      const mods=[...new Set(vars.map(v=>v._module))];
      const mainC=mods.filter(m=>!imports.has(m)&&m!==builtin&&!m._source);
      const moduleVars=vars.filter(v=>v._name&&v._name.startsWith("module "));
      const hostInMap=moduleVars.slice(0,6).map(v=>({name:v._name,hostHasSource:!!v._module._source,hostInImports:imports.has(v._module),hostIsBuiltin:v._module===builtin,hostIsMainCand:mainC.includes(v._module)}));
      return { hasRt:true, hasSvgText, modulesSize:rt._modules.size, totalMods:mods.length,
        mainCandCount:mainC.length, mainCandSamples:mainC.map(m=>({src:!!m._source, named:vars.filter(v=>v._module===m&&v._name).slice(0,4).map(v=>v._name)})),
        moduleVarsCount:moduleVars.length, hostInMap };
    });
    if (r.hasRt || r.hasSvgText) console.log("FRAME", f.url().slice(0,50), JSON.stringify(r,null,1));
  } catch(e){ /* cross-origin */ }
}
await browser.close();
