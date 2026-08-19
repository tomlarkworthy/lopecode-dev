// Diff the ported mission ships against the JSON the original scenes carry.
//
// data/corepox/scene-ships.json is verbatim ShipSpec JSON recovered from the
// binary scenes (tools/corepox-scene-ships.py). Our corepox-missions SHIPS were
// transcribed from the same source by hand, and transcription drops things: the
// first run of this found `fire_input=1` missing from laserpost's turret, which
// is why the Twin turrets posts tracked the player and never shot.
import {importNotebookModule} from "./notebook-import.ts";
import {readFileSync} from "fs";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const SHIPS: any = await m.value("SHIPS");
const scenes = JSON.parse(readFileSync("data/corepox/scene-ships.json", "utf8"));

const num = (v: any) => v === "Infinity" ? Infinity : v === "-Infinity" ? -Infinity : v;
const ovKey = (c: any) => (c.overrides ?? [])
  .map((o: any) => `${o.name}=${num(o.value)}`).sort().join(",");
const cKey = (c: any) => `${c.type}@${c.pos[0]},${c.pos[1]}`;

// name in the scene -> our SHIPS key. Only ships we actually use are checked.
const MAP: Record<string, string> = {
  laserpost: "laserpost", shooter: "shooter", manual_aim: "manualAim",
  ProximityMine: "proximityMine", SteerableDrifterV2: "drifter",
  DisconnectedRocketCore: "rocketCore", LiteDisconnectedRocketCore: "liteCore",
  player: "aimPlayer"
};

const truth: Record<string, any> = {};
for (const ships of Object.values<any>(scenes))
  for (const s of ships) if (MAP[s.name]) truth[MAP[s.name]] = s;

let issues = 0;
for (const [key, want] of Object.entries<any>(truth)) {
  const got = SHIPS[key];
  if (!got) { console.log(`${key}: MISSING from SHIPS`); issues++; continue; }
  const lines: string[] = [];
  const wl = new Map(want.components.map((c: any) => [cKey(c), c]));
  const gl = new Map(got.components.map((c: any) => [cKey(c), c]));
  for (const [k, wc] of wl) {
    const gc: any = gl.get(k);
    if (!gc) { lines.push(`  missing component ${k}`); continue; }
    if ((wc as any).dir && (wc as any).dir !== (gc.dir ?? "up"))
      lines.push(`  ${k} dir ${gc.dir ?? "up"} != ${(wc as any).dir}`);
    if (String((wc as any).param ?? "") !== String(gc.param ?? ""))
      lines.push(`  ${k} param ${JSON.stringify(gc.param ?? "")} != ${JSON.stringify((wc as any).param ?? "")}`);
    if (ovKey(wc) !== ovKey(gc))
      lines.push(`  ${k} overrides [${ovKey(gc)}] != [${ovKey(wc)}]`);
  }
  for (const k of gl.keys()) if (!wl.has(k)) lines.push(`  extra component ${k}`);
  if (want.connections.length !== (got.connections ?? []).length)
    lines.push(`  ${(got.connections ?? []).length} wires, scene has ${want.connections.length}`);
  if (lines.length) { console.log(`${key} (scene "${want.name}")`); lines.forEach(l => console.log(l)); issues++; }
}
console.log(issues ? `\n${issues} of ${Object.keys(truth).length} checked ships differ from the scene` :
                     `\nall ${Object.keys(truth).length} checked ships match the scene JSON`);
