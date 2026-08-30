// How many particles does corepox ACTUALLY put on screen? The render technique
// only matters at counts the game reaches, and the first A/B measured a mission
// whose median was 4 -- where any technique wins. Plays every mission and reports
// the median and peak on-screen particle count, sampled every frame.
//
//   node tools/corepox-particle-census.mjs [seconds-per-mission]
import { chromium } from "playwright";

const SECS = Number(process.argv[2] ?? 12);
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };

const COUNT = () => {
  let n = 0;
  for (const g of document.querySelectorAll('g[filter="url(#cp-bloom)"]')) {
    if (g.querySelector("use")) continue;
    n += g.querySelectorAll("circle, line").length;
    for (const pa of g.querySelectorAll("path[stroke-linecap='round']"))
      n += (pa.getAttribute("d") || "").split("M").length - 1;
  }
  return n;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1200 } });
// Reload per mission: a finished match replaces the play button with its win
// screen, so a second selectOption on the same page hangs waiting for a control
// that is no longer there.
const boot = async () => {
  await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
    "#view=R100(S100(@tomlarkworthy/corepox-game))");
  await p.waitForFunction(() => /[0-9][/]9/.test(document.body.innerText), { timeout: 60000 });
  await p.waitForTimeout(1500);
};
await boot();
const labels = await p.evaluate(() => [...document.querySelector("select").options].map(o => o.text));

for (const label of labels) {
  await boot();
  await p.selectOption("select", { label });
  await p.waitForTimeout(1000);
  await p.locator('button[title="play"]').first().click();
  const s = await p.evaluate(([secs, src]) => new Promise(res => {
    const count = new Function("return (" + src + ")()");
    const n = []; const t0 = performance.now();
    const tick = () => { n.push(count());
      performance.now() - t0 < secs * 1000 ? requestAnimationFrame(tick) : res(n); };
    requestAnimationFrame(tick);
  }), [SECS, COUNT.toString()]);
  console.log(`${label.padEnd(18)} median ${String(med(s)).padStart(4)}  p90 ${String([...s].sort((a, b) => a - b)[Math.floor(s.length * 0.9)]).padStart(4)}  peak ${String(Math.max(...s)).padStart(4)}`);
}
await b.close();
