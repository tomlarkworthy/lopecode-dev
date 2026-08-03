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
await page.goto("https://new.observablehq.com/@tomlarkworthy/module-map",{waitUntil:"domcontentloaded"});
for(let i=0;i<6;i++){await page.mouse.wheel(0,500);await page.waitForTimeout(400);}
await page.waitForTimeout(20000);
const f = page.frames().find(fr=>fr.url().includes("observableusercontent"))||page.mainFrame();
const out = await f.evaluate(()=>{
  const rt=window.__ojs_runtime;
  const def2mod=new Map(); for(const [d,m] of rt._modules) def2mod.set(m,d);
  // access-runtime instances: source modules referenced by "module N" vars whose def mentions access-runtime/e1c39d41e8e944b0
  const mdv=[...rt._variables].filter(v=>v._name&&v._name.startsWith("module ")&&/access-runtime|e1c39d41e8e944b0/.test(String(v._definition))&&v._value);
  const instances=[...new Set(mdv.map(v=>v._value))];
  // for each instance module, find its exported "runtime" and "main" variable values
  const objId=new Map(); let n=0; const idOf=o=>{if(o==null)return null; if(!objId.has(o))objId.set(o,"#"+(n++)); return objId.get(o);};
  const rows = instances.map(mod=>{
    const vars=[...rt._variables].filter(v=>v._module===mod);
    const rv=vars.find(v=>v._name==="runtime");
    const mv=vars.find(v=>v._name==="main");
    return { runtimeVal: idOf(rv?._value), mainVal: idOf(mv?._value), hasRuntimeVar: !!rv };
  });
  return {
    accessRuntimeInstances: instances.length,
    windowRuntime: idOf(rt),
    perInstance: rows,
    distinctRuntimeValues: new Set(rows.map(r=>r.runtimeVal)).size,
    distinctMainValues: new Set(rows.map(r=>r.mainVal)).size
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
