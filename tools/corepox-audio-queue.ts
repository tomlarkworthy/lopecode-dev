// The engine half of the sound wiring: does a duel put the right events on
// World.snd, at the right place, and does the ring stay bounded when nothing drains
// it? No browser, no WebAudio -- the queue is plain data.
//
//   bun tools/corepox-audio-queue.ts
import {importNotebookModule} from "./notebook-import.ts";

const ENGINE = process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js";
const m = await importNotebookModule(ENGINE);
// UNITS FIRST: observing a config cell after the classes recomputes it and hands back
// a fresh object literal the classes never captured (memory: fetch config cells first).
const UNITS: any = await m.value("UNITS");
const TYPES: any = await m.value("TYPES");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const seedRng: any = await m.value("seedRng");
const pilot: any = await m.value("pilot");

const hull = (comps: any[]) => ({name: "t", components: comps, connections: []});
const at_ = (type: string, x: number, y: number, hp = 20) =>
  ({type, pos: [x, y], dir: "up", hp, param: "", overrides: []});

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};

// --- a component death is a Block_Break, a Brain death is an EXPLOSION -------------
const brawler = (team: string, x = 0) => new Ship(
  hull([at_("Brain", 0, 0), at_("Armour", 1, 0, 100), at_("LaserTurret2", 0, 1)]),
  {team, x, y: 0, a: 0});
{
  const a = brawler("a");
  const w = new World([a]);
  const armour = a.live.find((c: any) => c.type === "Armour");
  const brain = a.live.find((c: any) => c.type === "Brain");
  const at = a.worldOf(armour);
  a.damage(armour, 999);
  ok(w.snd.length === 1 && w.snd[0].name === "Block_Break",
     "a non-Brain death queues Block_Break", JSON.stringify(w.snd.map((e: any) => e.name)));
  ok(Math.abs(w.snd[0].x - at[0]) < 1e-9 && Math.abs(w.snd[0].y - at[1]) < 1e-9,
     "at the component's world point, read BEFORE reindex",
     `${w.snd[0].x.toFixed(3)},${w.snd[0].y.toFixed(3)} want ${at[0].toFixed(3)},${at[1].toFixed(3)}`);
  w.snd.length = 0;
  a.damage(brain, 999);
  ok(w.snd.length === 1 && w.snd[0].name === "EXPLOSION",
     "a Brain death queues EXPLOSION", JSON.stringify(w.snd.map((e: any) => e.name)));
}

// --- a hull split is not a death ---------------------------------------------------
{
  const a = brawler("a");
  const w = new World([a]);
  const armour = a.live.find((c: any) => c.type === "Armour");
  a.damage(armour, 999, true);       // transfer: Ship.detach's removal
  ok(w.snd.length === 0, "a transfer is silent", JSON.stringify(w.snd));
}

// --- firing --------------------------------------------------------------------------
{
  const a = brawler("a");
  const w = new World([a]);
  const gun = a.live.find((c: any) => c.type === "LaserTurret2");
  w.fire(a, gun, 0);
  ok(w.snd.length === 1 && w.snd[0].name === "LAZER_FIRE", "fire() queues LAZER_FIRE",
     JSON.stringify(w.snd.map((e: any) => e.name)));
  const [gx, gy] = a.worldOf(gun);
  const d = Math.hypot(w.snd[0].x - gx, w.snd[0].y - gy);
  ok(Math.abs(d - UNITS.BEAM_MUZZLE) < 1e-9, "at the muzzle, where the bolt leaves",
     `${d.toFixed(3)} tiles from the gun, BEAM_MUZZLE ${UNITS.BEAM_MUZZLE}`);
}

// --- a real duel: the ring is bounded when a frame drains it, and when nothing does --
const fs = await import("node:fs");
const load: any = await m.value("loadShipSpec");
const GUNS = new Set(["Lazer", "LaserTurret2"]);
const corpus: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(",");
  if (i < 0) continue;
  try {
    const r = JSON.parse(line.slice(i + 1));
    if (!r?.components) continue;
    const spec = load(r).spec;
    const s = new Ship(spec, {team: "a", x: 0, y: 0, a: 0});
    if (s.islands().length === 1 && s.live.length >= 6 &&
        s.live.some((c: any) => GUNS.has(c.type))) corpus.push(spec);
  } catch {}
  if (corpus.length >= 2) break;
}

const duel = (drainEachTick: boolean) => {
  const a = new Ship(corpus[0], {team: "a", x: -20, y: 0, a: 90});
  const b = new Ship(corpus[1], {team: "b", x:  20, y: 0, a: -90});
  const w = new World([a, b]);
  World.rng = seedRng(7);
  const counts = new Map<string, number>();
  let peak = 0;
  for (let i = 0; i < 3000 && a.alive && b.alive; i++) {
    w.step();
    peak = Math.max(peak, w.snd.length);
    if (drainEachTick) {
      for (const e of w.snd) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
      w.snd.length = 0;                                  // what a frame does
    }
  }
  return {counts, peak, w};
};

{
  const {counts, peak} = duel(true);
  console.log("  drained: " + ([...counts].map(([k, v]) => `${k} ${v}`).join("  ") || "(nothing)"));
  ok((counts.get("LAZER_FIRE") ?? 0) > 0, "a corpus duel fires lazers");
  ok((counts.get("Block_Break") ?? 0) + (counts.get("EXPLOSION") ?? 0) > 0,
     "and breaks components");
  ok(peak <= UNITS.SND_MAX, "a drained queue never reaches the cap",
     `peak ${peak} / ${UNITS.SND_MAX}`);
}
{
  const {w} = duel(false);
  ok(w.snd.length <= UNITS.SND_MAX, "an UNDRAINED queue stays capped (headless runs)",
     `${w.snd.length} / ${UNITS.SND_MAX}`);
}

console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
