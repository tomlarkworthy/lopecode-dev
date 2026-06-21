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
await page.goto("https://observablehq.com/@tomlarkworthy/observablejs-toolchain",{waitUntil:"domcontentloaded"});
for(let i=0;i<10;i++){await page.mouse.wheel(0,800);await page.waitForTimeout(400);}
await page.waitForTimeout(20000);
const f = page.frames().find(fr=>fr.url().includes("observableusercontent"))||page.mainFrame();
const out = await f.evaluate(async ()=>{
  const rt=window.__ojs_runtime;
  if(!rt) return {error:"no runtime"};
  const names=["test_extractModuleInfo_new_slug_resolutions","test_extractModuleInfo_new_id_resolutions",
    "test_findModuleName_new_slug","test_findModuleName_new_id","test_findModuleName_kit_slug","test_findModuleName_classic_bundle"];
  const results={};
  for(const nm of names){
    const v=[...rt._variables].find(v=>v._name===nm);
    if(!v){ results[nm]="MISSING"; continue; }
    results[nm]=await new Promise(res=>{
      let done=false;
      const p=v._module.variable({fulfilled:val=>{if(!done){done=true;p.delete();res("PASS: "+val);}},rejected:e=>{if(!done){done=true;p.delete();res("FAIL: "+e);}}}).define([nm],x=>x);
      setTimeout(()=>{if(!done){done=true;try{p.delete()}catch{};res("TIMEOUT");}},6000);
    });
  }
  return results;
});
console.log(JSON.stringify(out,null,1));
await browser.close();
