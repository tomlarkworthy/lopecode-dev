// "the radar dotted lines are not coming from the component center. The radar should
// be measuring relative to its center and the dotted line should be visualizing this."
// (Tom, 2026-08-23)
//
// The Radar does not measure from its origin tile: RadarFn.cs reads
// `center.transform.position`, and in Radar.prefab the `arrow` that carries the
// radar_trace sits at localPosition (0.32, 0.96) world units = (0.5, 1.5) TILES
// forward. corepox-engine's SENSOR table has those numbers, but rotated them through
// geom.rot -- which is documented "clockwise-positive in +Y-DOWN space" -- without
// flipping the y, which put the sensor 1.5 tiles BEHIND the part instead of ahead.
//
// This gate is deliberately a DOM measurement rather than an arithmetic one: an
// engine-only check would compare the offset against a number this file also chose,
// and would have passed with the sign wrong. It compares where the engine measures
// from against where the renderer actually draws the ring, which are two independent
// pieces of work that must agree.
//
//   bun tools/corepox-radar-sensor.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1100, height: 800}});
const errs: string[] = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};

await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel))");
await p.waitForFunction(() => !!(window as any).__ojs_runtime, {timeout: 60000});
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-duel");
  const cell = (k: string) => { for (const [n, v] of m._scope) if (n === k) return (v as any)._value; };
  const duelView = cell("duelView"), roster = cell("duelRoster");
  const rank = (i: number) => roster.groups[1].items[i].key;
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;inset:0;z-index:9999;background:#04050a";
  document.body.append(stage);
  const v = duelView({seed: 4, mode: "elimination", limit: 45,
      a: {spec: roster.byKey.get(rank(0)).spec, control: "auto"},
      b: {spec: roster.byKey.get(rank(1)).spec},
      placement: {separation: 20, bearing: 25}}, {height: 700, speed: 1});
  stage.append(v);
  (window as any).__v = v;
});
await p.waitForFunction(() => {
  const w = (window as any).__v?.duel?.world;
  return w && w.ships.some((s: any) => s.live.some((c: any) => c.type === "Radar" && c.lock));
}, {timeout: 60000});

const out: any = await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const rm = rt.mains.get("@tomlarkworthy/corepox-render");
  const cell = (k: string) => { for (const [n, v] of rm._scope) if (n === k) return (v as any)._value; };
  const TILE = cell("TILE"), SYMBOL_FOR = cell("SYMBOL_FOR"), SYMBOLS = cell("SYMBOLS");
  const w = (window as any).__v.duel.world;
  const svg: any = [...(window as any).__v.querySelectorAll("svg")]
    .sort((a: any, b: any) => b.querySelectorAll("use").length - a.querySelectorAll("use").length)[0];

  const radars: any[] = [];
  for (const s of w.ships) for (const c of s.live) {
    if (c.type !== "Radar") continue;
    const [ox, oy] = s.worldOf(c);
    const sn = s.sensorOf(c);
    radars.push({team: s.team, a: s.a, origin: [ox, oy], sensor: sn,
                 lock: c.lock ? [c.lock[0], c.lock[1]] : null});
  }

  // The drawn ring, through the sprite's own CTM. SYMBOL_FOR.Radar is [name, ax, ay]
  // and the <use> is placed at (-ax, -ay), so the sheet's top 2x2 block -- the ring --
  // is at user (ax - w/2, ay - h + h/3) ... spelled out from the sheet size below.
  const [name, ax, ay] = SYMBOL_FOR.Radar;
  const [sw, sh] = SYMBOLS[name];
  const ringArt = [sw / 2, sw / 2];                 // top 2x2 block centre, art units
  const root = svg.getScreenCTM().inverse();
  const rings: any[] = [];
  for (const u of svg.querySelectorAll('use[href="#cp-' + name + '"]')) {
    const m = root.multiply((u as any).getScreenCTM());
    const pt = svg.createSVGPoint();
    pt.x = ringArt[0] - ax; pt.y = ringArt[1] - ay;
    const q = pt.matrixTransform(m);
    rings.push([q.x / TILE, q.y / TILE]);
  }

  const pairs = rings.map((r: any) => {
    let best: any = null, bd = 1e9;
    for (const rd of radars) {
      const d = Math.hypot(r[0] - rd.origin[0], r[1] - rd.origin[1]);
      if (d < bd) { bd = d; best = rd; }
    }
    return {team: best.team, a: +best.a.toFixed(2),
            ringOffset: [+(r[0] - best.origin[0]).toFixed(3), +(r[1] - best.origin[1]).toFixed(3)],
            sensorOffset: [+(best.sensor[0] - best.origin[0]).toFixed(3),
                           +(best.sensor[1] - best.origin[1]).toFixed(3)],
            gap: +Math.hypot(r[0] - best.sensor[0], r[1] - best.sensor[1]).toFixed(3),
            lockAtSensor: best.lock
              ? +Math.hypot(best.lock[0] - best.sensor[0], best.lock[1] - best.sensor[1]).toFixed(4)
              : null};
  });
  return {pairs, symbol: [name, ax, ay, sw, sh], TILE, nRadars: radars.length};
});

console.log(`sheet ${out.symbol[0]} ${out.symbol[3]}x${out.symbol[4]} anchored at ` +
            `(${out.symbol[1]}, ${out.symbol[2]}), TILE ${out.TILE}\n`);
console.log("team    heading    ring offset        sensor offset       gap (tiles)");
for (const q of out.pairs)
  console.log(`  ${q.team}   ${String(q.a).padStart(8)}   ` +
              `[${String(q.ringOffset[0]).padStart(6)},${String(q.ringOffset[1]).padStart(7)}]   ` +
              `[${String(q.sensorOffset[0]).padStart(6)},${String(q.sensorOffset[1]).padStart(7)}]   ${q.gap}`);
console.log("");

ok(out.pairs.length >= 2, "found radars to measure", `${out.pairs.length}`);
// Half a tile is the tolerance because that is the scale at which the error shows on
// screen; the sign error this gate was written for was 3.0 tiles.
const bad = out.pairs.filter((q: any) => q.gap > 0.5);
ok(bad.length === 0, "the engine measures from where the ring is DRAWN",
   bad.length ? bad.map((q: any) => `${q.team} off by ${q.gap}`).join(", ")
              : `worst gap ${Math.max(...out.pairs.map((q: any) => q.gap)).toFixed(3)} tiles`);
// Radar.prefab: arrow at localPosition (0.32, 0.96) world units, 0.64 to the tile.
const mag = out.pairs.map((q: any) => Math.hypot(q.sensorOffset[0], q.sensorOffset[1]));
ok(mag.every((m: number) => Math.abs(m - Math.hypot(0.5, 1.5)) < 0.02),
   "and at the prefab's (0.5, 1.5) tiles from the origin tile",
   mag.map((m: number) => m.toFixed(3)).join(", "));
const lock = out.pairs.filter((q: any) => q.lockAtSensor !== null);
// Not exact: c.lock is stamped during the tick's evaluate and read here a frame
// later, by which time the hull has moved a few thousandths of a tile.
ok(lock.length > 0 && lock.every((q: any) => q.lockAtSensor < 0.05),
   "and the sightline the renderer draws starts at that same point",
   lock.map((q: any) => q.lockAtSensor).join(", ") || "(no lock)");

console.log("\npage errors: " + (errs.length ? errs.slice(0, 3).join(" | ") : "none"));
if (errs.length) fail++;
await b.close();
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
