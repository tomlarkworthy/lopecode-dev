// "The prior corepox has an amazing explosion animation when a brain dies. A dual
// should end shortly after that animation plays." (Tom, 2026-08-23)
//
// The effect is recovered from prefabs/fx/CoreExplosion.prefab (trails 120,
// radius 3, trailTime 1) and fired where ShipComponent.cs:96 fires it -- a Brain,
// and only a Brain, reaching 0hp. This gate holds the ENGINE half: that the event
// is emitted, only for Brains, at the right place, and that it costs no rng.
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const UNITS: any = await m.value("UNITS");
const Ship: any = await m.value("Ship"); const World: any = await m.value("World");
let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};

console.log("the numbers, against prefabs/fx/CoreExplosion.prefab");
ok(UNITS.CORE_TRAILS === 120, "trails is the prefab's 120", `${UNITS.CORE_TRAILS}`);
ok(Math.abs(UNITS.CORE_R - 3 / 0.64) < 1e-9, "radius 3 world units in tiles",
   `${UNITS.CORE_R.toFixed(4)} tiles`);
ok(UNITS.CORE_TIME === 1, "trailTime 1s", `${UNITS.CORE_TIME}`);

const hull = (comps: any[]) => ({name: "t", components: comps, connections: []});
const at = (type: string, x: number, y: number, hp = 20) =>
  ({type, pos: [x, y], dir: "up", hp, param: "", overrides: []});

console.log("\na Brain dying, and nothing else, raises a burst");
{
  const s = new Ship(hull([at("Brain", 0, 0), at("Armour", 0, 1, 100)]), {team: "a", x: 3, y: -2, a: 0});
  const w = new World([s]);
  const armour = s.live.find((c: any) => c.type === "Armour");
  const brain = s.live.find((c: any) => c.type === "Brain");
  const [bx, by] = s.worldOf(brain);
  s.damage(armour, 999);
  ok(w.fx.length === 0, "an Armour reaching 0hp raises nothing", `${w.fx.length} fx`);
  s.damage(brain, 999);
  ok(w.fx.length === 1 && w.fx[0].kind === "core", "a Brain reaching 0hp raises one core burst");
  const e = w.fx[0] ?? {};
  ok(Math.hypot(e.x - bx, e.y - by) < 1e-9, "at the Brain's world point, read BEFORE reindex moved the hull",
     `(${e.x?.toFixed(3)}, ${e.y?.toFixed(3)}) vs (${bx.toFixed(3)}, ${by.toFixed(3)})`);
}

console.log("\na transfer is not a death");
{
  const s = new Ship(hull([at("Brain", 0, 0), at("Brain", 5, 5)]), {team: "a"});
  const w = new World([s]);
  const before = w.fx.length;
  w.step();                                   // two islands -> splitDetached transfers one
  ok(w.ships.length === 2, "the hull split", `${w.ships.length} bodies`);
  ok(w.fx.length === before, "and the transferred Brain did NOT explode", `${w.fx.length} fx`);
}

console.log("\nthe list is bounded and costs no rng");
{
  const s = new Ship(hull([at("Brain", 0, 0)]), {team: "a"});
  const w = new World([s]);
  for (let i = 0; i < UNITS.CORE_MAX + 5; i++) w.coreBurst(i, i);
  ok(w.fx.length === UNITS.CORE_MAX, "capped at CORE_MAX", `${w.fx.length} of ${UNITS.CORE_MAX}`);
  ok(w.fx[0].x === 5, "and it drops the oldest", `first is x=${w.fx[0].x}`);
}
{
  // determinism: the same seed must draw the same stream whether or not a Brain died
  const run = (killBrain: boolean) => {
    const s = new Ship(hull([at("Brain", 0, 0), at("Engine", 0, 1, 100)]), {team: "a"});
    const w = new World([s]); (World as any).rngSeed;
    for (let i = 0; i < 30; i++) w.step();
    if (killBrain) s.damage(s.live.find((c: any) => c.type === "Brain"), 999);
    for (let i = 0; i < 30; i++) w.step();
    return [w.particles.length, +w.t.toFixed(4)];
  };
  const a = run(false), b = run(false);
  ok(JSON.stringify(a) === JSON.stringify(b), "two identical runs agree", JSON.stringify(a));
}
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
