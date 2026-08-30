// Does a detached fragment keep burning on the pilot's last throttle?
import {importNotebookModule} from "../notebook-import.ts";
const ap = await import("../corepox-autopilot.ts");
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await m.value("Ship");
const World: any = await m.value("World");
const load: any = await m.value("loadShipSpec");
const DT: number = await m.value("DT");

// Brain at 0,0; a spine of Armour; Engine out at the end, nozzle aft.
const spec = {name: "testbed", components: [
  {type: "Brain",  pos: [0, 0], dir: "up"},
  {type: "Armour", pos: [0, 1], dir: "up"},
  {type: "Armour", pos: [0, 2], dir: "up"},
  {type: "Armour", pos: [0, 3], dir: "up"},
  {type: "Engine", pos: [0, 6], dir: "up"}
], connections: []};
const s = new Ship(load(spec).spec, {team: "a", x: 0, y: 0, a: 0});
const w = new World([s]);
console.log("islands at start:", s.islands().length, "alive:", s.alive, "engines:", ap.allEngines(s).length);

for (let k = 0; k < 100; k++) { ap.pilot(s, {target: [0, -30]}, ap.allEngines(s)); w.step(); }
const eng = s.comps.find((c: any) => c.type === "Engine");
console.log(`after 2s piloted: v=${Math.hypot(s.vx, s.vy).toFixed(2)} engine in=${eng.in.in.toFixed(0)}`);

// sever the spine: kill the two Armours between the Brain and the Engine
for (const c of s.comps) if (c.type === "Armour" && (c.py === 2 || c.py === 3)) c.hp = 0;   // leaves a 4-cell gap: past reach-2
s.reindex();
w.step();                                   // splitDetached runs at the end of step
console.log("ships after sever:", w.ships.length);
const frag = w.ships.find((x: any) => x !== s);
console.log("ship comps:", w.ships.map((x: any) => x.comps.map((c: any) => c.type + (c.hp > 0 ? "" : "!")).join("+")));
if (frag) {
  const fe = frag.comps.find((c: any) => c.type === "Engine"); if (!fe) { console.log("no engine in fragment"); process.exit(0); }
  console.log(`fragment: brain=${frag.comps.some((c: any) => c.type === "Brain" && c.hp > 0)} alive=${frag.alive} engine in=${String(fe?.in?.in)} powered=${fe?.powered}`);
  const v0 = Math.hypot(frag.vx, frag.vy);
  for (let k = 0; k < 250; k++) w.step();   // 5s with NOBODY piloting
  console.log(`fragment after 5s unpiloted: v ${v0.toFixed(2)} -> ${Math.hypot(frag.vx, frag.vy).toFixed(2)}  engine in=${String(fe?.in?.in)}`);
}
