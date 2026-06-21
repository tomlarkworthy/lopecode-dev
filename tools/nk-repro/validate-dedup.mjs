import { chromium } from "playwright";
import fs from "fs";
const c = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const parseSrc = fs.readFileSync("tools/module-map/detect.mjs","utf8")
  .match(/export function parseNotebookRef[\s\S]*?\n}\n/)[0].replace("export function","function");

const run = async (url) => {
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
  const out = await f.evaluate((parseSrc)=>{
    eval(parseSrc); // defines parseNotebookRef
    const rt = window.__ojs_runtime;
    if(!rt) return {error:"no runtime"};
    const mdv=[...rt._variables].filter(v=>v._name&&v._name.startsWith("module ")&&v._definition);
    const byCanon={};
    for(const v of mdv){
      const r=parseNotebookRef(v._definition.toString());
      const k=r.canonical||"(none)";
      (byCanon[k]=byCanon[k]||{names:new Set(),count:0});
      byCanon[k].names.add(r.name||"?"); byCanon[k].count++;
    }
    const summary=Object.entries(byCanon).map(([k,o])=>({canonical:k,names:[...o.names],vars:o.count}));
    const access=summary.find(s=>s.names.some(n=>/access-runtime|e1c39d41e8e944b0/.test(n||"")));
    return { distinctCanonical:summary.length, mdvCount:mdv.length,
      accessRuntime: access, multiNameGroups: summary.filter(s=>s.names.length>1) };
  }, parseSrc);
  await browser.close();
  return out;
};
console.log("=== NEW ==="); console.log(JSON.stringify(await run("https://new.observablehq.com/@tomlarkworthy/module-map"),null,1));
