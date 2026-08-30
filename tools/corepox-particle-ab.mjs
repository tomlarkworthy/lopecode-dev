// A/B the particle draw in the REAL game, not in the bench page: same mission,
// same wall time, one HTML with the old node-per-particle fx layer and one with
// the lane paths. Reports the live particle count, the median rAF interval and
// the median draw cost, and leaves a frame on disk for each.
//
//   node tools/corepox-particle-ab.mjs [mission-suffix] [seconds] [cpu-throttle]
import { chromium } from "playwright";

const MISSION = process.argv[2] ?? "aiming";
const SECS = Number(process.argv[3] ?? 12);
const RATE = Number(process.argv[4] ?? 6);

const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };

async function run(file, tag) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 1200 } });
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  await p.goto("file://" + process.cwd() + "/" + file +
    "#view=R100(S100(@tomlarkworthy/corepox-game))");
  await p.waitForFunction(() => document.body.innerText.includes("1/9"), { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.selectOption("select", { label: await p.evaluate(w =>
    [...document.querySelector("select").options].find(o => o.text.endsWith(w)).text, MISSION) });
  await p.waitForTimeout(1200);

  // Throttle only while the match runs: booting a 4.4MB notebook at 6x is slow
  // enough to trip the wait above.
  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  // Some missions come up already LIVE (mission 7 does), and then there is no
  // play button to press -- only a restart. Clicking is best-effort.
  const play = p.locator('button[title="play"]').first();
  if (await play.count() && await play.isVisible().catch(() => false))
    await play.click().catch(() => {});
  await p.waitForTimeout(SECS * 1000 * 0.4);

  // Frame intervals sampled from the page's own rAF, alongside the particle count
  // the engine reports -- a frame time without the count it was paid for is not
  // comparable between runs.
  const s = await p.evaluate(() => new Promise(res => {
    // Count what is actually ON SCREEN, so the same probe reads both builds: the
    // old layer is one node per particle, the new one is subpaths in a few paths.
    const count = () => {
      let n = 0;
      for (const g of document.querySelectorAll('g[filter="url(#cp-bloom)"]')) {
        if (g.querySelector("use")) continue;                  // that is a hull
        n += g.querySelectorAll("circle, line").length;
        for (const pa of g.querySelectorAll("path[stroke-linecap='round']"))
          n += (pa.getAttribute("d") || "").split("M").length - 1;
      }
      return n;
    };
    const iv = [], n = [];
    let last = 0, i = 0;
    const tick = t => { if (last) { iv.push(t - last); n.push(count()); } last = t;
      ++i < 180 ? requestAnimationFrame(tick) : res({ iv, n }); };
    requestAnimationFrame(tick);
  }));
  await p.waitForTimeout(SECS * 1000 * 0.6);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.screenshot({ path: `tools/screenshots/cp-particles-${tag}.png` });
  const status = await p.evaluate(() => document.body.innerText.match(/\d\/9[\s\S]{0,120}/)?.[0]);
  await b.close();
  const peak = Math.max(...s.n), frame = med(s.iv);
  console.log(`${tag.padEnd(6)} particles med ${med(s.n)} peak ${peak}  frame ${frame.toFixed(1)}ms ` +
              `${(1000 / frame).toFixed(0)}fps  errors ${errs.length}`);
  if (errs.length) console.log("    errs:", [...new Set(errs)].slice(0, 3));
  return { tag, peak, frame, status, errs };
}

console.log(`mission "${MISSION}", ${SECS}s, CPU ${RATE}x throttle\n`);
const before = await run("tools/scratch/corepox-before.html", "before");
const after = await run("lopebooks/notebooks/corepox.html", "after");
console.log(`\nframe ${before.frame.toFixed(1)}ms -> ${after.frame.toFixed(1)}ms  ` +
            `(${(before.frame / after.frame).toFixed(2)}x)`);
console.log("status after:", after.status?.split("\n")[0]);
