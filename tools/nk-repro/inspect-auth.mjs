import { chromium } from "playwright";
import fs from "fs";
const url = process.argv[2];
const c = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1400,height:1100} });
await ctx.addCookies([
  {name:"I",value:c.I,domain:".observablehq.com",path:"/",httpOnly:true,secure:true},
  {name:"T",value:c.T,domain:".observablehq.com",path:"/",secure:true},
]);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => { const m=e.message.slice(0,160); if(!/langApiRestored/.test(m)) errors.push("[pageerror] "+m); });
page.on("console", m => { if (m.type()==="error"){ const t=m.text().slice(0,200); if(!/langApiRestored/.test(t)) errors.push("[err] "+t);} });
await page.goto(url, { waitUntil:"domcontentloaded" });
for (let i=0;i<8;i++){ await page.mouse.wheel(0,500); await page.waitForTimeout(500); }
await page.waitForTimeout(25000);
const diag = await page.evaluate(() => {
  const texts = [...document.querySelectorAll("svg text")].map(t=>t.textContent.trim()).filter(Boolean);
  const counts={}; for(const t of texts) counts[t]=(counts[t]||0)+1;
  const dups = Object.entries(counts).filter(([,n])=>n>1);
  return { hasModuleMapText:/Module map/.test(document.body.innerText), svgTextCount:texts.length,
           labels:Object.keys(counts).sort(), duplicates:dups };
});
console.log("URL:", url);
console.log(JSON.stringify(diag,null,1));
console.log("=== errors ==="); console.log([...new Set(errors)].slice(0,20).join("\n")||"(none)");
await browser.close();
