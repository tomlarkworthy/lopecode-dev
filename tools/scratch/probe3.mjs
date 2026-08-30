import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on("pageerror", e => console.log("PAGEERROR:", e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.evaluate(() => {
  window.__view = [...document.querySelectorAll("div")].find(e => e.value && typeof e.value === "object" && "state" in e.value && "mission" in e.value);
});
const st = () => p.evaluate(() => window.__view ? {...window.__view.value, ship: undefined} : "no view");
console.log("mission 1 default:", await st());
await p.selectOption("select", "7");
await p.waitForTimeout(2500);
console.log("after select 8:", await st());
const svgs = await p.$$("svg"); let box = null;
for (const s of svgs) { const r = await s.boundingBox(); if (r && r.width > 400 && r.height > 300) { box = r; break; } }
await p.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.30);
await p.waitForTimeout(500);
console.log("after click:", await st());
await b.close();
