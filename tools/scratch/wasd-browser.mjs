import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
await p.selectOption("select", "7");            // 8. Yin opposses Yang
await p.waitForTimeout(2500);
const pos = () => p.evaluate(() => {
  const g = [...document.querySelectorAll("svg g g[transform]")].find(e => /translate/.test(e.getAttribute("transform")));
  return g ? g.getAttribute("transform") : null;
});
const a0 = await pos();
await p.keyboard.down("d"); await p.waitForTimeout(1500); await p.keyboard.up("d");
const a1 = await pos();
await p.keyboard.down("w"); await p.waitForTimeout(2500); await p.keyboard.up("w");
const a2 = await pos();
await p.screenshot({ path: "tools/screenshots/wasd.png" });
console.log("start   ", a0);
console.log("after D ", a1);
console.log("after W ", a2);
console.log("errors:", errs.slice(0, 5));
await b.close();
