import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(11000);
// pick FollowCourse
await p.selectOption("select", "7");   // 8. Yin opposses Yang = FollowCourse
await p.waitForTimeout(1500);
const shot = async (n) => p.screenshot({ path: `tools/screenshots/manual-${n}.png` });
await shot("build");
// press play
const play = await p.$('[title="play"], [aria-label="play"]') ?? (await p.$$("div")).find(() => false);
const clicked = await p.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find(e => e.textContent === "▶" && e.children.length === 0);
  if (!el) return false;
  el.closest("[style]")?.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
  return true;
});
console.log("play pressed:", clicked);
await p.waitForTimeout(2000);
const svgs = await p.$$("svg");
let box = null, svg = null;
for (const s of svgs) { const b2 = await s.boundingBox(); if (b2 && b2.width * b2.height > (box ? box.width * box.height : 0)) { box = b2; svg = s; } }
console.log("battlefield box:", box && {w: Math.round(box.width), h: Math.round(box.height)});
const pos = () => p.evaluate(() => {
  const g = [...document.querySelectorAll("svg g g[transform]")].find(e => /translate/.test(e.getAttribute("transform")));
  return g ? g.getAttribute("transform") : null;
});
const before = await pos();
// tap a waypoint left of centre
await p.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.30);
await p.waitForTimeout(5000);
const after = await pos();
const ring = await p.evaluate(() => !!document.querySelector('circle[stroke="#4fd8e8"]'));
console.log("waypoint ring drawn:", ring);
console.log("player transform before:", before);
console.log("player transform after :", after);
await shot("flying");
console.log("errors:", errs.slice(0, 6));
await b.close();
