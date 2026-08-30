// The tempo chip in each of its states, at turn 9's hues.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 900}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(14000);
await p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.play);
  el.qa.skipIntro?.();
});
await p.waitForTimeout(800);
const shot = async (tag: string) => {
  const svg = p.locator("svg").last();
  await svg.scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  const bx = await svg.boundingBox();
  if (bx) await p.screenshot({path: `tools/screenshots/clock-${tag}.png`,
    clip: {x: bx.x + bx.width * 0.5, y: bx.y, width: bx.width * 0.5, height: 150}});
};
await shot("build");
await p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.play);
  el.qa.play();
});
await p.waitForTimeout(2500);
await shot("live");
console.log("errors:", errs.slice(0, 3));
await b.close();
