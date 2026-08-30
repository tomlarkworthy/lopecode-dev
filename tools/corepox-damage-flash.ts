// Does a hit SHOW? ShipComponent.displayDamage flashes the sprite for 0.1s and
// then leaves it at alpha hp/maxHp, and neither was ported until 2026-08-21.
//
// A screenshot cannot gate a 100ms flash, so this samples the live DOM from inside
// the page on every animation frame: how many component groups carry the highlight
// filter, and what the faded ones settle at.
//
// Mission 6 (Aim) is the fixture, and the choice is the measurement. Twin turrets
// looks like the obvious one -- both posts open fire on the handed ship at once --
// but that ship LOSES in 1.4s and most of its parts go from full hp to zero in a
// single event, and a fatal hit is not drawn (the component is hidden the same
// frame). It reports 0 flashes while damage is plainly happening. Aim's armour
// takes graze damage and survives it, which is the case the flash exists for.
//
//   bun tools/corepox-damage-flash.ts [mission-index] [ms]
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
             "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skip = async () => { for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90); } };
await skip();
await p.selectOption("select", process.argv[2] ?? "5");
await skip();
await p.waitForTimeout(500);
await p.evaluate(() => {
  const w: any = window;
  w.__fl = {frames: 0, litFrames: 0, mostAtOnce: 0, runs: [] as number[], faded: new Set()};
  let run = 0, runStart = 0;
  const tick = (ts: number) => {
    const f = w.__fl;
    f.frames++;
    // :not(display none) matters. A component destroyed mid-flash keeps the
    // filter on a hidden node, and the loop stops on DEFEAT, so counting hidden
    // groups reported 97% of frames lit on a mission the player loses in 1.4s.
    const lit = document.querySelectorAll(
      'g[style*="invert(1)"]:not([style*="display: none"])').length;
    if (lit) {
      f.litFrames++; f.mostAtOnce = Math.max(f.mostAtOnce, lit);
      if (!run) runStart = ts;
      run++;
    } else if (run) { f.runs.push(ts - runStart); run = 0; }
    for (const g of document.querySelectorAll('g[style*="opacity"]')) {
      const o = (g as HTMLElement).style.opacity;
      if (o && Number(o) < 1) f.faded.add(o);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const play = p.locator("button", {hasText: "▶"}).first();
if (await play.count()) await play.click().catch(() => {});
// One frame with a lit component, caught on the way past. The flash is ~137ms and
// a screenshot round-trip is longer than that, so this misses more often than it
// hits; it is evidence when it lands, not a gate.
const shot = (async () => {
  try {
    await p.waitForFunction(() =>
      document.querySelector('g[style*="invert(1)"]:not([style*="display: none"])'),
      {timeout: 8000, polling: 16});
    await p.screenshot({path: "tools/screenshots/corepox-damage-flash.png"});
    return true;
  } catch { return false; }
})();
await p.waitForTimeout(Number(process.argv[3] ?? 8000));
console.log((await shot) ? "caught one in tools/screenshots/corepox-damage-flash.png"
                         : "no flash caught on camera this run");
const r: any = await p.evaluate(() => {
  const f = (window as any).__fl;
  return {...f, faded: [...f.faded].sort()};
});
await b.close();
const runs = r.runs as number[];                       // milliseconds, not frames
const avg = runs.length ? runs.reduce((a, c) => a + c, 0) / runs.length : 0;
console.log(`frames ${r.frames}, ${r.litFrames} of them with a component lit ` +
            `(${(100 * r.litFrames / r.frames).toFixed(1)}%), most at once ${r.mostAtOnce}`);
console.log(`flashes ${runs.length}, mean ${avg.toFixed(0)}ms each ` +
            `(displayDamage waits 0.1s; overlapping hits extend it)`);
console.log(`faded components settled at: ${r.faded.join(" ") || "none"}`);
let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
say(runs.length > 0, `a hit lights the component that took it (${runs.length} flashes seen)`);
say(avg >= 80 && avg <= 400, `the flash lasts about 0.1s (${avg.toFixed(0)}ms mean)`);
say(r.litFrames < r.frames * 0.6, "and it is a flash, not a permanent state");
say(r.faded.length > 0, "a damaged component stays faded afterwards");
process.exit(fail ? 1 : 0);
