import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on("pageerror", e => console.log("PAGEERROR:", e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.selectOption("select", "7");
await p.waitForTimeout(2000);
await p.evaluate(() => {
  window.__view = [...document.querySelectorAll("div")].find(e => e.value?.state && e.value?.mission);
});
const svgs = await p.$$("svg"); let box = null;
for (const s of svgs) { const r = await s.boundingBox(); if (r && r.width > 400 && r.height > 300) { box = r; break; } }
// dismiss the intro cutscene
await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
await p.waitForTimeout(800);
const state = () => p.evaluate(() => window.__view.value.state);
console.log("state:", await state());
// the player node is the first hull group; read it before/after each input
const pos = () => p.evaluate(() => {
  const g = [...document.querySelectorAll("svg g g[transform]")].find(e => /translate/.test(e.getAttribute("transform")));
  return g.getAttribute("transform");
});
const t0 = await pos();
await p.keyboard.down("d"); await p.waitForTimeout(1800); await p.keyboard.up("d");
const t1 = await pos();
await p.keyboard.down("w"); await p.waitForTimeout(1800); await p.keyboard.up("w");
const t2 = await pos();
await p.keyboard.down("a"); await p.waitForTimeout(1800); await p.keyboard.up("a");
const t3 = await pos();
console.log("t0 (idle)  ", t0);
console.log("t1 (D 1.8s)", t1);
console.log("t2 (W 1.8s)", t2);
console.log("t3 (A 1.8s)", t3);
await p.screenshot({ path: "tools/screenshots/wasd.png" });
await b.close();
