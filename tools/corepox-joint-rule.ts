// Which connectivity rule does the corpus support: joints, or tile distance?
//
// The port has been running on distance -- NEIGHBOURS, reach 2 -- since early in
// the port, chosen because reach 2 put more corpus ships in one piece than reach 1.
// The original binds components through declared joints (ShipComponent.cs:16
// `joints: CoordDir8[]`, disjointSets over them in Connectivity.cs:99), so two
// components can touch and NOT be attached. JOINTS is now recovered and stored in
// engine frame, so the real rule can be run.
//
// The measure is the fraction of ships that come out as ONE body, over two
// populations:
//
//   the 48 DEVELOPER ships (the port roster and the mission fleets, from the game's
//   own prefabs) -- these are the control, because they are known to fly. Under
//   joints, 48/48. That is what says the recovered JOINTS table and the mating rule
//   are right, and it is why the corpus number below is not evidence against them.
//
//   the 890 loadable PLAYER saves -- joints 62%, distance 89%. The shortfall is not
//   a defect: ShipComponent.cs:117 canPlace only tests occupancy, so the editor
//   never required a player's design to be joint-connected, and a design with a
//   part parked against an Orb's flank saves fine and flies apart on spawn.
//
// Numbers measured 2026-08-20 against vendor/corepox/firebase/data/ships.json.
//
//   bun tools/corepox-joint-rule.ts
import {importNotebookModule} from "./notebook-import.ts";
import * as fs from "node:fs";

const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, loadShipSpec, JOINTS, TYPES}: any =
  await m.values(["Ship", "loadShipSpec", "JOINTS", "TYPES"]);

const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await mis.value("SHIPS");
const MISSIONS: any[] = await mis.value("MISSIONS");

const raw: any[] = [];
for (const line of fs.readFileSync("vendor/corepox/firebase/data/ships.json", "utf8").split("\n")) {
  const i = line.indexOf(","); if (i < 0) continue;
  try { const s = JSON.parse(line.slice(i + 1)); if (s?.components) raw.push(s); } catch {}
}

const noJoints = Object.keys(TYPES).filter(t => !JOINTS[t]);
console.log(`${raw.length} saved ships; types with no joint entry: ${noJoints.join(", ") || "none"}\n`);

let n = 0, both = 0, jointWhole = 0, distWhole = 0, jointFewer = 0, distFewer = 0;
const worse: any[] = [];
for (const r of raw) {
  let s: any; try { s = new Ship(loadShipSpec(r).spec, {team: "a"}); } catch { continue; }
  if (!s.live.length) continue;
  n++;
  const j = s.islands().length, d = s.islandsByDistance().length;
  if (j === 1) jointWhole++;
  if (d === 1) distWhole++;
  if (j === d) both++;
  else if (j < d) jointFewer++;
  else { distFewer++; if (worse.length < 8) worse.push({name: r.name, comps: s.live.length, j, d}); }
}

// The control: ships the developer shipped.
const dev = new Map<string, any>();
for (const [name, spec] of Object.entries<any>(SHIPS)) dev.set("SHIPS." + name, spec);
for (const m of MISSIONS) {
  if (m.ship) dev.set(`${m.id}.player`, m.ship);
  (m.enemies ?? m.fleet ?? []).forEach((e: any, i: number) => dev.set(`${m.id}.enemy${i}`, e.ship ?? e.spec ?? e));
}
let dn = 0, dj = 0;
const shattered: string[] = [];
for (const [name, spec] of dev) {
  if (!spec?.components) continue;
  let s: any; try { s = new Ship(spec, {team: "a"}); } catch { continue; }
  if (!s.live.length) continue;
  dn++;
  if (s.islands().length === 1) dj++; else shattered.push(`${name} -> ${s.islands().length}`);
}
console.log(`developer ships one body under joints: ${dj}/${dn}` +
            (shattered.length ? `\n  ${shattered.join("\n  ")}` : ""));

const pc = (x: number) => `${x}/${n} (${(100 * x / n).toFixed(0)}%)`;
console.log(`ships that load as ONE body`);
console.log(`  joints    ${pc(jointWhole)}`);
console.log(`  distance  ${pc(distWhole)}   <- the rule in use until now\n`);
console.log(`per-ship island count: same ${both}, joints fewer ${jointFewer}, distance fewer ${distFewer}`);
if (worse.length) {
  console.log(`\nships joints splits MORE than distance does (first ${worse.length}):`);
  for (const w of worse) console.log(`  ${String(w.name).slice(0, 34).padEnd(36)} ${String(w.comps).padStart(3)} comps  joints ${w.j}  distance ${w.d}`);
}

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
console.log();
say(dj === dn, `every developer ship is one body under joints (${dj}/${dn})`);
// Joints is a refinement of reach-2 distance: a mated joint pair always sits on
// touching cells, so it can only ever split MORE. If it ever splits less, the
// geometry has drifted.
say(jointFewer === 0, `joints never binds what distance does not (${jointFewer} would be a geometry bug)`);
say(jointWhole / n > 0.55, `player saves mostly survive load (${(100 * jointWhole / n).toFixed(0)}%, was 62% on 2026-08-20)`);
process.exit(fail ? 1 : 0);
