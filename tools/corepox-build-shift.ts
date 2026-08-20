// Does the ship move when you place a part? Reported by Tom as "when i place a
// component the center of the ship shifts". Measured, not reasoned: take the
// screen position of the core's own tile before and after a placement, in the same
// view, so anything that moves is the ship and not the camera.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
// A mission's intro cutscene covers the board (corepox-game `cutscene`), so a
// tool that drives the board has to get past it the way a player does.
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
await p.selectOption("select", process.argv[2] ?? "8");
await skipIntro();
await p.waitForTimeout(1200);

const read = () => p.evaluate(() => {
  const root: any = document.querySelector("[data-cpx],*") &&
    [...document.querySelectorAll("*")].find((e: any) => e.qa)!;
  const q = (root as any).qa, S = q.session();
  const core = S.player.comps.find((c: any) => c.type === "Brain");
  const [wx, wy] = S.player.worldOf(core);
  const svg = q.svg();
  const vb = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
  const TILE = 56;
  return {
    cx: S.player.cx, cy: S.player.cy, x: S.player.x, y: S.player.y,
    coreWorld: [wx, wy],
    // where that world point lands on screen, through the live viewBox
    screen: [r.left + (wx * TILE - vb.x) / vb.width * r.width,
             r.top + (wy * TILE - vb.y) / vb.height * r.height],
    viewBox: [vb.x, vb.y, vb.width, vb.height],
    parts: S.player.comps.length
  };
});

const before = await read();
// wrench, first row of CHOOSE BUILD OPTION, then a ghost -- the shipped flow,
// which is what the UI does since 2026-08-20
await p.locator('button[title="build"]').first().click();
await p.waitForTimeout(300);
await p.locator('div[style*="border:1.5px solid #ff6b5a"]').first().click();
await p.waitForTimeout(300);
const cell = await p.evaluate(() => {
  const root: any = [...document.querySelectorAll("*")].find((e: any) => e.qa)!;
  const d = [...root.qa.svg().querySelectorAll('rect[stroke-dasharray]')];
  const r = d[0].getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
});
await p.mouse.click(cell[0], cell[1]);
await p.waitForTimeout(600);
const after = await read();

const f = (a: number[]) => a.map(v => v.toFixed(2)).join(", ");
console.log(`parts     ${before.parts} -> ${after.parts}`);
console.log(`com       (${f([before.cx, before.cy])}) -> (${f([after.cx, after.cy])})`);
console.log(`ship x,y  (${f([before.x, before.y])}) -> (${f([after.x, after.y])})`);
console.log(`core world(${f(before.coreWorld)}) -> (${f(after.coreWorld)})   ` +
  `moved ${Math.hypot(after.coreWorld[0] - before.coreWorld[0],
                      after.coreWorld[1] - before.coreWorld[1]).toFixed(3)} tiles`);
console.log(`core px   (${f(before.screen)}) -> (${f(after.screen)})   ` +
  `moved ${Math.hypot(after.screen[0] - before.screen[0],
                      after.screen[1] - before.screen[1]).toFixed(1)} px`);
console.log(`viewBox   [${f(before.viewBox)}] -> [${f(after.viewBox)}]`);
await b.close();
