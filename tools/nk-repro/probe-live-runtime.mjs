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
await page.waitForTimeout(18000);
const out = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  if (!rt) return { error: "window.__ojs_runtime missing" };
  const vars = [...rt._variables];
  const builtin = rt._builtin;
  const imports = new Set(rt._modules.values());
  const modulesFromVars = [...new Set(vars.map(v=>v._module))];
  const mainCandidates = modulesFromVars.filter(m => !imports.has(m) && m !== builtin);
  // module-defining vars (the "module ..." named vars)
  const moduleVars = vars.filter(v => v._name && v._name.startsWith("module "));
  // for each main candidate, count its named vars to identify the real main
  const describe = m => ({
    inImportsSet: imports.has(m),
    isBuiltin: m === builtin,
    hasSource: !!m._source,
    namedVarSample: vars.filter(v=>v._module===m && v._name).slice(0,5).map(v=>v._name)
  });
  return {
    runtimeModulesSize: rt._modules.size,
    totalVars: vars.length,
    modulesFromVarsCount: modulesFromVars.length,
    mainCandidateCount: mainCandidates.length,
    mainCandidates: mainCandidates.map(describe),
    moduleVarNames: moduleVars.map(v=>v._name).slice(0,20),
    moduleVarModuleInImports: moduleVars.slice(0,8).map(v=>({name:v._name, hostInImports: imports.has(v._module), hostIsBuiltin: v._module===builtin, hostHasSource: !!v._module._source}))
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
