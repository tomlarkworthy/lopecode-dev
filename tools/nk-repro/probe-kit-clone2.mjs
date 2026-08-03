import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
const arFetches = [];
page.on("request", r=>{ const u=r.url(); if(/access-runtime|runtime-sdk/.test(u)) arFetches.push(u.replace("https://api.observablehq.com","")); });
await page.goto("http://localhost:5173/repro",{waitUntil:"networkidle"});
await page.waitForTimeout(9000);
const out = await page.evaluate(()=>{
  const rt=window.__rt;
  return { totalModules: rt?._modules.size,
    varNames: [...(rt?._variables||[])].map(v=>v._name).filter(Boolean) };
});
console.log("access-runtime / runtime-sdk FETCHES (URL incl resolutions):");
[...new Set(arFetches)].forEach(u=>console.log("  "+u));
console.log(JSON.stringify(out,null,1));
await browser.close();
