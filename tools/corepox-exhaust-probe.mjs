// "There are no visible particles leaving the engine" -- and there weren't, even
// though the renderer was drawing all of them. Brightness was bucketed on raw
// remaining ttl; exhaust is born with ttl = World.rng(), so the steady-state
// remaining-life density is 2(1-x) and 23% of the plume landed in the dimmest
// lane against 1.6% in the brightest. Every particle was drawn, in near-black.
//
// So the gate is not "did the renderer write anything" -- that passed while the
// bug was live (1656 setAttribute calls, 337 non-empty). It is the DISTRIBUTION
// across lanes, which is what decides whether a plume is visible.
//
//   node tools/corepox-exhaust-probe.mjs [seconds]
import { chromium } from "playwright";

const SECS = Number(process.argv[2] ?? 5);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-lab))");
await p.waitForTimeout(9000);

// The arena, because the tutorial missions start unwired: an engine at thrust 0
// emits nothing and a probe there measures the renderer against an empty world.
const qa = await p.evaluateHandle(() => {
  const m = window.__ojs_runtime.mains.get("@tomlarkworthy/corepox-lab");
  for (const [k, v] of m._scope) if (k === "viewof arena") return v._value.qa;
});

const r = await p.evaluate(async ([q, secs]) => {
  const rows = q.corpusIndex().filter(r => !r.blocked.length).slice(0, 4);
  q.setup({srcA: "corpus", srcB: "corpus", a: rows[0].id, b: rows[1].id, gap: 8});
  q.start();
  await new Promise(r => setTimeout(r, secs * 1000));
  const w = q.world();
  const exhaust = w.particles.filter(x => x.kind === "exhaust");
  // There are TWO battlefields on this page -- the level editor keeps an idle one
  // -- so scope to the arena's own svg, or the gate scores 8 empty lanes from a
  // view that has no world to draw.
  const svg = document.querySelector("datalist[id^=cp-corpus]").parentElement.querySelector("svg");
  const lanes = [...svg.querySelectorAll('path[stroke-linecap="round"][fill="none"]')]
    .filter(e => e.getAttribute("stroke-width") === "8")
    .map(e => ({stroke: e.getAttribute("stroke"),
                n: ((e.getAttribute("d") || "").match(/M/g) || []).length}));
  return {exhaust: exhaust.length, thrusting: w.ships.flatMap(s => s.live)
            .filter(c => c.type === "Engine" && c.thrust > 0).length,
          hasTtl0: exhaust.length ? exhaust.every(x => x.ttl0 > 0) : null, lanes};
}, [qa, SECS]);

const drawn = r.lanes.reduce((a, l) => a + l.n, 0);
console.log(`engines thrusting  ${r.thrusting}`);
console.log(`live exhaust       ${r.exhaust}   ttl0 recorded on all: ${r.hasTtl0}`);
console.log(`drawn into lanes   ${drawn}`);
console.log("lane occupancy (dim -> bright):");
for (const l of r.lanes)
  console.log(`  ${l.stroke}  ${String(l.n).padStart(4)}  ${"#".repeat(Math.min(40, l.n))}`);

let fail = 0;
const say = (ok, s) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
console.log();
say(r.exhaust > 0, `the world has exhaust to draw (${r.exhaust})`);
say(drawn >= r.exhaust * 0.9, `lanes carry the particles (${drawn} of ${r.exhaust})`);
say(r.hasTtl0 !== false, "every exhaust particle carries its birth ttl");
// The failure mode this gate exists for: the plume piling into the dimmest lane.
const top = r.lanes.slice(4).reduce((a, l) => a + l.n, 0);
say(top >= drawn * 0.25, `the bright half of the ramp is populated (${top}/${drawn}, was 1.6% white)`);
console.log("pageerrors:", errs.slice(0, 3));

await p.evaluateHandle(() => document.querySelector("datalist[id^=cp-corpus]").parentElement)
  .then(h => h.asElement().screenshot({path: "tools/screenshots/cp-exhaust-arena.png"}));
await b.close();
process.exit(fail ? 1 : 0);
