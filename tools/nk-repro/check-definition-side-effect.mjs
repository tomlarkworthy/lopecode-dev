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
await page.waitForTimeout(18000);
const f = page.frames().find(fr=>fr.url().includes("observableusercontent"))||page.mainFrame();
const out = await f.evaluate(async ()=>{
  const rt=window.__ojs_runtime;
  const objId=new Map(); let n=0; const idOf=o=>{if(o==null)return null; if(!objId.has(o))objId.set(o,"#"+(n++)); return objId.get(o);};
  // pick a "module N" var for stream-operators
  const v=[...rt._variables].find(v=>v._name&&v._name.startsWith("module ")&&/stream-operators/.test(String(v._definition)));
  if(!v) return {error:"no stream-operators module var"};
  const before = { modulesSize: rt._modules.size, currentValue: idOf(v._value) };
  // call definition twice (what module_definition_variables does)
  let r1, r2, err=null;
  try { r1 = await v._definition(); } catch(e){ err="r1:"+e.message; }
  const mid = rt._modules.size;
  try { r2 = await v._definition(); } catch(e){ err=(err||"")+" r2:"+e.message; }
  const after = rt._modules.size;
  return {
    err,
    definitionStr: String(v._definition).slice(0,140),
    valueBeforeCalling: before.currentValue,    // was _value already set?
    modulesSize_before: before.modulesSize,
    modulesSize_afterCall1: mid,
    modulesSize_afterCall2: after,
    call1Module: idOf(r1),
    call2Module: idOf(r2),
    call1_eq_call2: r1===r2,
    call1_eq_priorValue: r1===v._value || idOf(r1)===before.currentValue
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
