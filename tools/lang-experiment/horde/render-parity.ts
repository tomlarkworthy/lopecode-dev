// bun horde/render-parity.ts [--quick] : what is drawn equals what is simulated, in every mode.
// Part 1, fixed frames: game.html offline (frames back to back, bot, god mode, overview camera) at n 50k and 100k
// from wave 6, for main, transfer/8 and transfer/17. At frames 300, 900, 1800 it reads (a) live agents in the sim's
// arrays, (b) live agents in the GPU's agent buffer, (c) hashes of both, (d) lit pixels of the enemy layer drawn
// alone. Asserts (a) = (b), the two hashes are equal, and (a), the hash and (d) agree across modes.
// Part 2, toggling during rAF play: n 50k from wave 6, transfer/17, the bot in god mode, in the page's real rAF loop.
// Run A is left alone; run B gets T pressed every 0.7 s and the pool slider moved to another size between presses.
// The state hash after every step of B must equal A's at the same sim frame, and every 30 steps B's probe must
// show drawn = alive, GPU buffer = sim arrays and the HUD's alive count = alive.
// The renderer itself throws if it is handed a detached or partial array (proto/render.js uploadAgents).
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve } from "node:path";
const quick = process.argv.includes("--quick");
const url = "file://" + resolve(import.meta.dir, "proto/game.html");
const browser = await chromium.launch();
let failures = 0;
const fail = (m: string) => { failures++; console.log("FAIL", m); };
const sizes = quick ? [50000] : [50000, 100000];
const frames = quick ? [300] : [300, 900, 1800];
const arms = [["main", 0], ["transfer", 8], ["transfer", 17], ["lite", 8]] as const;
console.log("   n    frame  arm           alive  drawn  simHash  gpuHash  lit");
for (const n of sizes) {
  const byFrame = new Map<number, any[]>();
  for (const [mode, w] of arms) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", (e) => fail(`${mode}/${w} pageerror ${e.message}`));
    await page.goto(`${url}?n=${n}&wave=6&mode=${mode}&workers=${w}&shot=overview&frames=${Math.max(...frames)}&probe=${frames.join(",")}`, { waitUntil: "commit" });
    await page.waitForFunction(() => (window as any).__ready, null, { timeout: 600000 });
    const err = await page.evaluate(() => (window as any).__error);
    if (err) fail(`${mode}/${w}: ${err}`);
    const probes: any[] = (await page.evaluate(() => (window as any).__ready.probes)) || [];
    await page.close();
    for (const p of probes) {
      console.log(`${String(n).padStart(6)} ${String(p.simFrame).padStart(6)}  ${(mode + "/" + p.workers).padEnd(12)} ${String(p.alive).padStart(6)} ${String(p.drawn).padStart(6)}  ${p.simHash} ${p.gpuHash} ${p.lit}`);
      if (p.drawn !== p.alive) fail(`n ${n} frame ${p.simFrame} ${mode}/${w}: drawn ${p.drawn} != alive ${p.alive}`);
      if (p.gpuHash !== p.simHash) fail(`n ${n} frame ${p.simFrame} ${mode}/${w}: GPU buffer hash ${p.gpuHash} != sim ${p.simHash}`);
      if (p.hudAlive !== p.alive) fail(`n ${n} frame ${p.simFrame} ${mode}/${w}: HUD alive ${p.hudAlive} != ${p.alive}`);
      if (p.uploadFrame !== p.simFrame) fail(`n ${n} frame ${p.simFrame} ${mode}/${w}: uploaded frame ${p.uploadFrame}`);
      byFrame.set(p.simFrame, [...(byFrame.get(p.simFrame) || []), { arm: `${mode}/${w}`, ...p }]);
    }
    if (probes.length !== frames.length) fail(`n ${n} ${mode}/${w}: ${probes.length} probes`);
  }
  for (const [f, ps] of byFrame) for (const k of ["alive", "simHash", "lit"]) {
    const vals = new Set(ps.map((p) => p[k]));
    if (vals.size !== 1) fail(`n ${n} frame ${f}: ${k} differs across modes: ${ps.map((p) => `${p.arm}=${p[k]}`).join(" ")}`);
  }
}
console.log(failures ? `${failures} failure(s)` : "part 1: drawn = alive, GPU buffer = sim arrays, and the enemy layer identical across modes, at every probe");
const before = failures;
const STEPS = quick ? 400 : 1200;
async function play(toggle: boolean) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", (e) => fail(`play ${toggle ? "toggled" : "plain"} pageerror ${e.message}`));
  await page.goto(`${url}?n=50000&wave=6&mode=transfer&workers=17&bot=1&god=1&log=1&w=1280&h=800`);
  await page.waitForFunction(() => (window as any).__engine);
  const modes = new Set<string>();
  let seed = 7, presses = 0;
  while ((await page.evaluate(() => (window as any).__engine.frame)) < STEPS) {
    if (toggle) {
      await page.keyboard.press("t"); presses++;
      await page.waitForTimeout(350);
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const size = 1 + ((seed >>> 16) % 24);
      await page.$eval("#wk", (el: any, v: number) => { el.value = String(v); el.dispatchEvent(new Event("input")); }, size);
      await page.waitForTimeout(350);
      modes.add(await page.evaluate(() => { const e = (window as any).__engine; return e.mode + "/" + e.poolSize; }));
    } else await page.waitForTimeout(500);
  }
  const log = await page.evaluate(() => { const l = (window as any).__log; return { stepHashes: { ...l.stepHashes }, rafProbes: [...l.rafProbes] }; });
  await page.close();
  return { ...log, modes: [...modes], presses };
}
const A = await play(false), B = await play(true);
let compared = 0;
for (const f of Object.keys(B.stepHashes)) {
  if (+f > STEPS || !(f in A.stepHashes)) continue;
  compared++;
  if (A.stepHashes[f] !== B.stepHashes[f]) { fail(`toggled run differs from the plain run at sim frame ${f}: ${B.stepHashes[f]} vs ${A.stepHashes[f]}`); break; }
}
for (const p of B.rafProbes) {
  if (p.drawn !== p.alive || p.gpuHash !== p.simHash || p.hudAlive !== p.alive) fail(`toggled run, frame ${p.simFrame} ${p.mode}/${p.workers}: alive ${p.alive} drawn ${p.drawn} hud ${p.hudAlive} sim ${p.simHash} gpu ${p.gpuHash}`);
}
console.log(`part 2: ${B.presses} T presses, pool sizes seen ${B.modes.join(" ")}; ${compared} sim frames compared with the untoggled run; ${B.rafProbes.length} probes during play`);
if (compared < STEPS * 0.8) fail(`only ${compared} of ${STEPS} sim frames logged in both runs`);
console.log(failures === before ? "part 2: toggled run bit-identical to the plain run at every compared frame; drawn = alive = HUD at every probe" : `${failures - before} part 2 failure(s)`);
await browser.close();
process.exit(failures ? 1 : 0);
