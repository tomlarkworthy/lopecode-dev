// A mission spec's connections must address component ANCHORS, because that is
// what Ship uses: `at(x, y)` is `comps.find(c => c.px === x && c.py === y)`, and
// newSession hands MISSIONS specs straight to `new Ship` without the cell -> anchor
// normalisation loadShipSpec does for the recovered corpus. A wire whose endpoint
// is any OTHER occupied cell of the right component is dropped in silence: no
// error, no missing part, just an input that never arrives.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("tools/corepox-engine.live.js");
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const TYPES: any = await eng.value("TYPES");
const PORTS: any = await eng.value("PORTS");
const MISSIONS: any[] = await mis.value("MISSIONS");

const DIRS: any = {up: 0, right: 90, down: 180, left: 270};
const rotTile = ([x, y]: number[], dir: number) => {
  const t = ((dir / 90) | 0) & 3;
  return t === 0 ? [x, y] : t === 1 ? [y, -x] : t === 2 ? [-x, -y] : [-y, x];
};
let bad = 0, wires = 0;
const check = (label: string, spec: any) => {
  if (!spec?.connections?.length) return;
  const comps = (spec.components ?? []).map((c: any) => {
    const dir = typeof c.dir === "number" ? c.dir : (DIRS[c.dir ?? "up"] ?? 0);
    const T = TYPES[c.type] ?? {tiles: [[0, 0]]};
    return {type: c.type, pos: c.pos, dir,
            cells: T.tiles.map((t: number[]) => {
              const [rx, ry] = rotTile(t, dir);
              return [c.pos[0] + rx, c.pos[1] + ry];
            })};
  });
  const anchor = (p: number[]) => comps.find((c: any) => c.pos[0] === p[0] && c.pos[1] === p[1]);
  const owner = (p: number[]) => comps.find((c: any) =>
    c.cells.some(([x, y]: number[]) => x === p[0] && y === p[1]));
  for (const k of spec.connections) {
    wires++;
    for (const [end, p, port] of [["from", k.from, k.fromPort], ["to", k.to, k.toPort]] as any) {
      if (anchor(p)) continue;
      bad++;
      const o = owner(p);
      console.log(`  ${label}  ${end} [${p}] port ${port}: ` +
        (o ? `a ${o.type} CELL, its anchor is [${o.pos}] -- wire DROPPED`
           : `no component occupies it -- wire DROPPED`));
    }
  }
};
for (const m of MISSIONS) {
  check(`${m.id} ship`.padEnd(34), m.ship);
  check(`${m.id} solution`.padEnd(34), m.solution);
  (m.enemies ?? []).forEach((e: any, i: number) =>
    check(`${m.id} enemy ${i} ${e.spec?.name ?? ""}`.padEnd(34), e.spec));
}
console.log(`\n${wires} wires across MISSIONS, ${bad} endpoint(s) not on an anchor`);
process.exit(bad ? 1 : 0);
