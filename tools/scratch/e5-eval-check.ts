import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(process.argv[2], { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
console.log(JSON.stringify(await frame.evaluate(() => {
  const out: any = {};
  try { let _fn: any; eval("_fn = function _title(md) {return (md`# X`);}"); out.evalWorks = typeof _fn; }
  catch (e) { out.evalWorks = "THREW " + String(e).slice(0, 140); }
  out.csp = [...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')].map((m) => m.getAttribute("content")?.slice(0, 200));
  return out;
}), null, 1));
await b.close();
