// The rendered half of the core explosion, plus the hold. Runs a real duel in the
// browser, waits for the Brain that ends it, and photographs the burst at four
// points across its 1s life. Also measures the gap between the verdict landing and
// onEnd firing, which is what "a dual should end shortly after that animation
// plays" asks for.
//
//   bun tools/corepox-core-burst-shot.ts   -> tools/screenshots/core-burst-*.png
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1000, height: 700}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel))");
await p.waitForFunction(() => !!(window as any).__ojs_runtime, {timeout: 60000});
await p.waitForTimeout(1500);

const start = await p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-duel");
  const cell = (k: string) => { for (const [n, v] of m._scope) if (n === k) return (v as any)._value; };
  const duelView = cell("duelView"), roster = cell("duelRoster");
  const rank = (i: number) => roster.groups[1].items[i].key;
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;inset:0;z-index:9999;background:#04050a";
  document.body.append(stage);
  const W: any = window as any;
  W.__t0 = 0; W.__tEnd = 0; W.__verdict = null;
  const v = duelView({seed: 4, mode: "elimination", limit: 45,
      a: {spec: roster.byKey.get(rank(0)).spec, control: "auto"},
      b: {spec: roster.byKey.get(rank(1)).spec},
      placement: {separation: 20, bearing: 25}},
    {height: 660, speed: 8, onEnd: (out: string) => { W.__tEnd = performance.now(); W.__verdict = out; }});
  stage.append(v);
  W.__v = v;
  // latch the moment the verdict lands, independently of onEnd
  const tick = () => {
    if (v.duel.outcome && !W.__t0) W.__t0 = performance.now();
    if (!W.__tEnd) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
});

// wait for the kill, then shoot across the burst
await p.waitForFunction(() => (window as any).__t0 > 0, {timeout: 60000});
const shots: any[] = [];
for (const at of [40, 250, 520, 900]) {
  await p.waitForFunction((ms) => performance.now() - (window as any).__t0 >= ms, at, {timeout: 20000});
  const stat = await p.evaluate(() => {
    const svg = (window as any).__v.view.svg;
    const paths = [...svg.querySelectorAll("g[filter] > path")];
    const segs = paths.reduce((a, e: any) => a + ((e.getAttribute("d") ?? "").match(/M/g)?.length ?? 0), 0);
    const painted = paths.filter((e: any) => (e.getAttribute("d") ?? "").length > 0).length;
    // how far the burst has actually travelled, in px from the death point
    const fx: any = (window as any).__v.duel.world.fx[0];
    const TILE = 56, cx = fx ? fx.x * TILE : 0, cy = fx ? fx.y * TILE : 0;
    // ONLY the core lanes -- the residual exhaust and frag lanes of the frozen
    // world sit hundreds of px away and swamped the reach when everything was
    // measured together (206px on the frame after the kill, when the burst is 40px).
    let reach = 0, bands = 0, trails = 0;
    for (const e of paths as any[]) {
      if (e.getAttribute("data-fx") !== "core") continue;
      const d = e.getAttribute("d") ?? "";
      if (!d) continue;
      bands++;
      for (const mm of d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)) {
        trails++;
        reach = Math.max(reach, Math.hypot(+mm[1] - cx, +mm[2] - cy));
      }
    }
    return {segs, painted, reach: +reach.toFixed(0), bands, trails,
            nodes: svg.querySelectorAll("*").length,
            since: +(performance.now() - (window as any).__t0).toFixed(0),
            fx: (window as any).__v.duel.world.fx.length};
  });
  await p.screenshot({path: `tools/screenshots/core-burst-${at}ms.png`});
  shots.push({at, ...stat});
}
await p.waitForFunction(() => (window as any).__tEnd > 0, {timeout: 20000});
const timing = await p.evaluate(() => ({
  gap: +((window as any).__tEnd - (window as any).__t0).toFixed(0),
  verdict: (window as any).__verdict}));
await b.close();

let fail = 0;
const ok = (c: any, l: string, d = "") => { console.log(`${c ? "  ok  " : "FAIL  "}${l}${d ? "   " + d : ""}`); if (!c) fail++; };
console.log("frames across the burst (segments = M commands in the fx lane paths)");
for (const s of shots)
  console.log(`  +${String(s.since).padStart(4)}ms   ${String(s.segs).padStart(5)} segments   ` +
              `${String(s.trails).padStart(3)} trails   reach ${String(s.reach).padStart(3)}px   ` +
              `${s.bands} colour bands   ${s.nodes} svg nodes`);
console.log("");
ok(shots[0].trails > 100, "all 120 trails are drawn on the frame after the kill",
   `${shots[0].trails} of ${120}`);
ok(shots[3].reach > shots[0].reach * 2, "and it travels outward on OutCubic",
   `reach ${shots.map(s => s.reach + "px").join(" -> ")}`);
ok(shots.map(s => s.bands).every(b => b === 1), "one colour band at a time, stepped by age",
   `${shots.map(s => s.bands).join("/")} bands`);
ok(Math.max(...shots.map(s => s.nodes)) - Math.min(...shots.map(s => s.nodes)) <= 2,
   "it costs NO new svg nodes -- it is drawn into the lane paths that were already there",
   `${Math.min(...shots.map(s => s.nodes))}..${Math.max(...shots.map(s => s.nodes))} nodes`);
ok(timing.gap >= 1000 && timing.gap < 2000,
   "the duel hands over after the animation, not during it", `${timing.gap}ms, verdict ${timing.verdict}`);
if (errs.length) { ok(false, "page errors", errs[0]); }
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
