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
  // source modules = _value of "module N" vars
  const mdv=[...rt._variables].filter(v=>v._name&&v._name.startsWith("module ")&&v._value&&typeof v._value==="object");
  const sig = m => {
    const d=def2mod.get(m); const s=d?String(d):"";
    const files=[...s.matchAll(/files\/([0-9a-f]{16,})/g)].map(x=>x[1]).sort();
    return files.length? files.join(",").slice(0,40)+"#"+files.length : "len:"+s.length;
  };
  const access = mdv.filter(v=>{
    const t=String(v._definition);
    return /access-runtime|e1c39d41e8e944b0/.test(t);
  }).map(v=>{
    const t=String(v._definition);
    const name=(t.match(/access-runtime/)?"@mootari/access-runtime":(t.match(/(e1c39d41e8e944b0(?:@\d+)?)/)||[])[1]);
    return { name, contentSig: sig(v._value), sameObj: v._value };
  });
  // dedupe display
  const uniq=[...new Map(access.map(a=>[a.name+"|"+a.contentSig,a])).values()];
  return uniq.map(a=>({name:a.name, contentSig:a.contentSig}));
});
console.log(JSON.stringify(out,null,1));
await browser.close();
