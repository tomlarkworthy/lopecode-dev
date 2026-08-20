// A player's-eye pass: what the screen actually says at each step of one mission.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const shot = async (n: string) => { await p.screenshot({path: `tools/screenshots/wt-${n}.png`}); };
const say = async (n: string) => console.log(`--- ${n}\n` +
  (await p.evaluate(() => document.body.innerText)).split("\n").slice(0, 12).join("\n"));

await say("mission 1, opened"); await shot("1-open");
// place the brain the way a player does now: wrench, the BRAIN row, then a ghost
await p.locator('button[title="build"]').first().click();
await p.waitForTimeout(300);
await p.locator('div:text-is("BRAIN")').first().click();
await p.waitForTimeout(200); await shot("2-picked");
const pt = await p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  let qa: any; for (const [k, v] of m._scope) if (k === "viewof game") qa = (v as any)._value.qa;
  const [vx, vy] = qa.tileToView(0, 0);
  const s = qa.svg(), r = s.getBoundingClientRect(), vb = s.viewBox.baseVal;
  return {x: r.left + (vx - vb.x) / vb.width * r.width, y: r.top + (vy - vb.y) / vb.height * r.height};
});
await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
await say("brain placed"); await shot("3-placed");
await p.locator('button[title="play"]').first().click();
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(500);
  if (/VICTORY|DEFEAT/.test(await p.evaluate(() => document.body.innerText))) break;
}
await say("after the verdict"); await shot("4-won");
await b.close();
