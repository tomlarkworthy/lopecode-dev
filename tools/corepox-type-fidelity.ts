// Diff our TYPES footprints and JOINTS against the component prefabs.
//
// data/corepox/component-truth.json is the definition, not a sample: every
// ShipComponent serialises its own occupancy and joints, and the prefabs under
// Assets/prefabs/components/Resources are the ones the game instantiates. Most of
// TYPES.tiles was recovered by minimising overlap across the corpus and some of it
// rests on recollection; this says which of those guesses were right.
import {importNotebookModule} from "./notebook-import.ts";
import {readFileSync} from "fs";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const TYPES: any = await m.value("TYPES");
const JOINTS: any = await m.value("JOINTS");
const truth = JSON.parse(readFileSync("data/corepox/component-truth.json", "utf8"));

const cellKey = (c: number[]) => `${c[0]},${c[1]}`;
const setOf = (a: number[][]) => new Set(a.map(cellKey));
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(x => b.has(x));
const jKey = (j: any) => JSON.stringify(Object.keys(j ?? {}).sort()
  .map(k => [k, Object.keys(j[k]).sort().map(s => [s, j[k][s]])]));

// TurretFn.Awake() rewrites this.occupancy with 12 cells after deserialisation
// ("we still had to save the prefab with occupancy prepopulated"), so the 10 cells
// on LaserTurret2.prefab never reach the game. CompositeFn builds its occupancy
// from whatever children it is given, so an empty prefab is expected there too.
const RUNTIME_OVERRIDES = new Set(["LaserTurret2", "Composite"]);

let bad = 0, checked = 0, skipped: string[] = [];
for (const [type, t] of Object.entries<any>(truth)) {
  if (!TYPES[type]) continue;                 // BinaryAtlas / Joint are helpers
  if (RUNTIME_OVERRIDES.has(type)) { skipped.push(type); continue; }
  checked++;
  const lines: string[] = [];
  if (t.hp != null && TYPES[type].hp !== t.hp) lines.push(`  hp ${TYPES[type].hp} != ${t.hp}`);
  const ours = setOf(TYPES[type].tiles), theirs = setOf(t.tiles);
  if (!same(ours, theirs)) {
    const extra = [...ours].filter(x => !theirs.has(x)), missing = [...theirs].filter(x => !ours.has(x));
    lines.push(`  tiles ${ours.size} vs ${theirs.size}` +
      (extra.length ? `  extra ${extra.join(" ")}` : "") +
      (missing.length ? `  missing ${missing.join(" ")}` : ""));
  }
  const oj = JOINTS[type] ?? {};
  const n = (j: any) => Object.values<any>(j).reduce((s, c: any) =>
    s + Object.values<any>(c).reduce((k: number, v: any) => k + v.length, 0), 0);
  if (jKey(oj) !== jKey(t.joints))
    lines.push(`  joints ${n(oj)} vs ${t.nJoints}\n     ours  ${JSON.stringify(oj)}\n     theirs ${JSON.stringify(t.joints)}`);
  if (lines.length) { bad++; console.log(type); lines.forEach(l => console.log(l)); }
}
console.log(bad ? `\n${bad} of ${checked} types differ from the prefabs`
                : `\nall ${checked} types match the component prefabs`);
console.log(`not checked (set at runtime, not by the prefab): ${skipped.join(", ")}`);
