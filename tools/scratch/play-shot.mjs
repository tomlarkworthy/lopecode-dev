import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
const svg = await p.$("svg[viewBox]");
const box = svg && await svg.boundingBox();
console.log("battlefield box:", box && {w: Math.round(box.width), h: Math.round(box.height)});
if (box) {
  const before = await p.evaluate(() => window.__ojs_runtime ? 1 : 0);
  // click a waypoint to the right of centre
  await p.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.45);
  await p.waitForTimeout(6000);
}
await p.screenshot({ path: "tools/screenshots/corepox-play.png" });
console.log("errors:", errs.slice(0, 6));
await b.close();
