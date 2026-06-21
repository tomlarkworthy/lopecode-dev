import { chromium } from "playwright";
import fs from "fs";
const c = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const run = async (url, label) => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1400,height:1100} });
  await ctx.addCookies([
    {name:"I",value:c.I,domain:".observablehq.com",path:"/",httpOnly:true,secure:true},
    {name:"T",value:c.T,domain:".observablehq.com",path:"/",secure:true},
  ]);
  const page = await ctx.newPage();
  await page.goto(url,{waitUntil:"domcontentloaded"});
  for(let i=0;i<6;i++){await page.mouse.wheel(0,500);await page.waitForTimeout(400);}
  await page.waitForTimeout(20000);
  const f = page.frames().find(fr=>fr.url().includes("observableusercontent"))||page.mainFrame();
  const out = await f.evaluate(()=>{
    const rt=window.__ojs_runtime;
    const def2mod=new Map(); for(const [d,m] of rt._modules) def2mod.set(m,d);
    const sig = m => { const d=def2mod.get(m); const s=d?String(d):""; 
      const files=[...s.matchAll(/files\/([0-9a-f]{12,})/g)].map(x=>x[1].slice(0,8)).sort();
      return (files.join(",")||("len:"+s.length)); };
    // module-def vars referencing access-runtime
    const mdv=[...rt._variables].filter(v=>v._name&&v._name.startsWith("module ")&&v._value&&typeof v._value==="object");
    const access = mdv.filter(v=>/access-runtime|e1c39d41e8e944b0/.test(String(v._definition)));
    // assign stable object ids
    const objId=new Map(); let n=0;
    const idOf=o=>{ if(!objId.has(o))objId.set(o,"obj#"+(n++)); return objId.get(o); };
    const rows = access.map(v=>{
      const t=String(v._definition);
      const nm = t.match(/access-runtime/)?"@mootari/access-runtime":(t.match(/(e1c39d41e8e944b0(?:@\d+)?)/)||[])[1];
      return { refName:nm, moduleObj:idOf(v._value), contentSig:sig(v._value) };
    });
    const distinctObjects = new Set(access.map(v=>v._value)).size;
    return { distinctModuleObjects: distinctObjects, refs: rows };
  });
  await browser.close();
  console.log("===",label,"==="); console.log(JSON.stringify(out,null,1));
};
await run("https://new.observablehq.com/@tomlarkworthy/module-map","NEW");
await run("https://observablehq.com/@tomlarkworthy/module-map","CLASSIC");
