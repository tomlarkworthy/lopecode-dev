// The recovered ships are ground truth: a ship the original shipped cannot have two
// components in one cell. So running the recovered specs through OUR footprint and
// rotation tables is a differential test of those tables -- any overlap is our bug,
// not theirs. Written after "the mine mission is all screwed up with overlapping
// components from the enemy".
import {importNotebookModule} from "./notebook-import.ts";
import {readFileSync} from "fs";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const TYPES: any = await m.value("TYPES");
const rotTile: any = await m.value("rotTile");
const DIRS: any = await m.value("DIRS");

const scenes = JSON.parse(readFileSync("data/corepox/scene-ships.json", "utf8"));
let bad = 0, total = 0;
for (const [scene, ships] of Object.entries<any>(scenes)) {
  for (const s of ships) {
    total++;
    const own = new Map<string, string>();
    const clashes: string[] = [];
    for (const c of s.components) {
      const T = TYPES[c.type];
      if (!T) { clashes.push(`unknown type ${c.type}`); continue; }
      const deg = DIRS[c.dir ?? "up"] ?? 0;
      for (const t of T.tiles) {
        const [rx, ry] = rotTile(t, deg);
        const k = `${c.pos[0] + rx},${c.pos[1] + ry}`;
        const who = `${c.type}@${c.pos}${c.dir && c.dir !== "up" ? "/" + c.dir : ""}`;
        if (own.has(k)) clashes.push(`${k}: ${own.get(k)} vs ${who}`);
        else own.set(k, who);
      }
    }
    if (clashes.length) {
      bad++;
      console.log(`${scene}/${s.name}  ${s.components.length}c  ${clashes.length} clash(es)`);
      for (const c of clashes.slice(0, 12)) console.log("   " + c);
    }
  }
}
console.log(`\n${bad} of ${total} recovered ships self-overlap under our footprint tables`);
