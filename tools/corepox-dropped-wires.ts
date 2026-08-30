// Which wires does the port table fail to resolve on the hand-built prefabs?
import {importNotebookModule} from "./notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const load: any = await m.value("loadShipSpec");
const TYPES: any = await m.value("TYPES");
const PORTS: any = await m.value("PORTS");
const fs = await import("node:fs");
const pre = JSON.parse(fs.readFileSync("scratch/corepox-prefabs.json","utf8").replace(/:\s*(-?)Infinity/g, ": $11e400"));
const rot: any = {up:(x:number,y:number)=>[x,y], right:(x:number,y:number)=>[y,-x],
                  down:(x:number,y:number)=>[-x,-y], left:(x:number,y:number)=>[-y,x]};
for (const [file, specs] of Object.entries(pre) as any) for (const raw of specs) {
  const {dropped} = load(raw);
  if (!dropped.length) continue;
  console.log(`=== ${file}`);
  for (const k of dropped) {
    const desc = (cell: number[]) => {
      // which component OWNS this cell (footprint), and where is it locally?
      for (const c of raw.components) {
        const T = TYPES[String(c.type).replace(/\(Clone\).*$/,"")];
        if (!T) continue;
        const [lx, ly] = rot[c.dir ?? "up"](cell[0]-c.pos[0], cell[1]-c.pos[1]);
        const owns = T.tiles.some((t: number[]) => t[0]===lx && t[1]===ly);
        const near = Math.abs(lx)<=2 && Math.abs(ly)<=2;
        if (owns || near) return `${c.type}@${c.pos} dir=${c.dir} local=(${lx},${ly})` +
          (owns ? " OWNS" : " near") + ` ports=${JSON.stringify(PORTS[T===TYPES[c.type]?c.type:c.type]??{})}`;
      }
      return "nothing within 2 cells";
    };
    console.log(`  from ${JSON.stringify(k.from)}: ${desc(k.from)}`);
    console.log(`    to ${JSON.stringify(k.to)}: ${desc(k.to)}`);
  }
}
