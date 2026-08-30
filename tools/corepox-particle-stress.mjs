// The in-game A/B only ever caught 4-66 particles, where no draw technique can
// separate itself. This forces the count instead: through the game's QA seam it
// tops world.particles up to N every frame, inside the camera's viewBox, on both
// builds. Both arms carry the identical injection and the identical collision
// cost, so the difference between them is the DRAW and nothing else.
//
//   node tools/corepox-particle-stress.mjs [n] [mission] [cpu-throttle]
import { chromium } from "playwright";

const N = Number(process.argv[2] ?? 800);
const MISSION = process.argv[3] ?? "avoiding";
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
  await p.waitForFunction(() => /[0-9][/]9/.test(document.body.innerText), { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.selectOption("select", { label: await p.evaluate(w =>
    [...document.querySelector("select").options].find(o => o.text.endsWith(w)).text, MISSION) });
  await p.waitForTimeout(1200);
  const play = p.locator('button[title="play"]').first();
  if (await play.count() && await play.isVisible().catch(() => false))
    await play.click().catch(() => {});
  await p.waitForTimeout(1500);

  const cdp = await p.context().newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
  const s = await p.evaluate(([n, TILE]) => new Promise((res, rej) => {
    const m = window.__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
    let qa = null;
    for (const [k, v] of m._scope) if (k === "viewof game") qa = v._value.qa;
    if (!qa) return rej("no qa seam");
    const S = qa.session(), svg = qa.svg();
    const iv = [], cnt = [];
    let last = 0, i = 0;
    const tick = t => {
      const vb = svg.viewBox.baseVal;
      const P = S.world.particles;
      // Top up in the camera's own box, so every injected particle is ON SCREEN
      // and actually costs a raster -- off-screen ones would flatter both arms.
      while (P.length < n) P.push({
        kind: "exhaust", comp: null, ship: S.world.ships[0],
        x: (vb.x + Math.random() * vb.width) / TILE,
        y: (vb.y + Math.random() * vb.height) / TILE,
        vx: 0, vy: 0, ttl: Math.random(), dmg: 0});
      if (last) { iv.push(t - last); cnt.push(P.length); }
      last = t;
      ++i < 150 ? requestAnimationFrame(tick) : res({iv, cnt});
    };
    requestAnimationFrame(tick);
  }), [N, 56]);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await p.screenshot({ path: `tools/screenshots/cp-stress-${tag}.png` });
  await b.close();
  const frame = med(s.iv);
  console.log(`${tag.padEnd(6)} particles ${med(s.cnt)}  frame ${frame.toFixed(1)}ms  ` +
              `${(1000 / frame).toFixed(0)}fps  errors ${errs.length}`);
  return frame;
}

console.log(`n=${N}, mission "${MISSION}", CPU ${RATE}x throttle\n`);
const before = await run("tools/scratch/corepox-before.html", "before");
const after = await run("lopebooks/notebooks/corepox.html", "after");
console.log(`\nframe ${before.toFixed(1)}ms -> ${after.toFixed(1)}ms  (${(before / after).toFixed(2)}x)`);
