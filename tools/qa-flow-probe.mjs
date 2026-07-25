import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html#view=S100(@tomlarkworthy/belief-state-geometry)";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  if (!flow) return { found: false };
  flow.scrollIntoView({ block: "start" });
  return {
    found: true,
    paths: flow.querySelectorAll("path").length,
    status: flow.textContent.match(/following position \d+ of \w+.*/)[0].slice(0, 140),
    rect: (() => { const r = flow.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()
  };
});
console.log(JSON.stringify(info, null, 2));
console.log("pageerrors:", errs.length ? errs : "none");
await page.waitForTimeout(400);
const r = info.rect;
await page.screenshot({ path: "tools/screenshots/flow-unrolled.png", clip: { x: 0, y: Math.max(0, r.y - 10), width: 1100, height: Math.min(560, r.h + 40) } });
// click token row 2 to refocus
await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  flow.querySelectorAll("svg g")[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await page.waitForTimeout(300);
const after = await page.evaluate(() => {
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const flow = figs.find((f) => /heads unrolled/.test(f.textContent));
  return flow.textContent.match(/following position \d+/)[0];
});
console.log("after click:", after);
await page.screenshot({ path: "tools/screenshots/flow-unrolled-refocus.png", clip: { x: 0, y: Math.max(0, r.y - 10), width: 1100, height: Math.min(560, r.h + 40) } });
await browser.close();
