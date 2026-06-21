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
  const mdv=[...rt._variables].filter(v=>v._name&&v._name.startsWith("module ")&&/access-runtime|e1c39d41e8e944b0/.test(String(v._definition)));
  return mdv.map(v=>({ name:v._name, def:String(v._definition).slice(0,260) }));
});
console.log(JSON.stringify(out,null,1));
await browser.close();
