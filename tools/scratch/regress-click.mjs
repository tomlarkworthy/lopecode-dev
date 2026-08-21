import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on("pageerror", e => console.log("PAGEERROR:", e.message));
p.on("console", m => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.selectOption("select", "7");
await p.waitForTimeout(2500);
const chip = await p.evaluate(() => {
  const el = [...document.querySelectorAll("div,span")].find(e => e.children.length === 0 && /^(LIVE|RUNNING)$/.test(e.textContent.trim()));
  return el?.textContent?.trim() ?? "none";
});
console.log("state chip:", chip);
const svgs = await p.$$("svg"); let box = null;
for (const s of svgs) { const r = await s.boundingBox(); if (r && r.width > 400 && r.height > 300) { box = r; break; } }
const pos = () => p.evaluate(() => {
  const g = [...document.querySelectorAll("svg g g[transform]")].find(e => /translate/.test(e.getAttribute("transform")));
  return g?.getAttribute("transform");
});
console.log("t0", await pos());
await p.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.30);
await p.waitForTimeout(4000);
console.log("after click", await pos());
await p.keyboard.down("w"); await p.waitForTimeout(2500); await p.keyboard.up("w");
console.log("after W    ", await pos());
await b.close();
