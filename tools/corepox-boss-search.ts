// FollowBoss hands you a bare core and nine kinds of part in a 5x7 box, and no
// scene field says what to build. Search Braitenberg-shaped hulls -- radar bearing
// crossed onto two engines through a MINUS, plus a gun -- for one that clears all
// three enemies inside the 60s the campaign gate allows. Layouts that overlap,
// come apart or exceed the core's 20 power are rejected before simulating.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const {Ship, World, DT}: any = await eng.values(["Ship", "World", "DT"]);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const m = MISSIONS.find(x => x.id === "FollowBoss")!;
const core = (s: any) => s.live.some((k: any) => k.type === "Brain");
const box: number[][] = m.envelope;
const inBox = (p: number[]) => box.some(q => q[0] === p[0] && q[1] === p[1]);
const HORIZON = Number(process.env.T ?? 60);

// The box is 35 cells and six free positions over it is 1.9e9 layouts, so each
// role gets the handful of cells that role can sensibly take: the radar forward,
// the Binary on the centreline behind the core, an engine on each flank aft.
const FRONT = box.filter(p => p[1] >= 1 && p[0] <= 0);
const MID = box.filter(p => p[1] <= 0 && Math.abs(p[0]) <= 1);
const AFT_L = box.filter(p => p[0] <= -1 && p[1] <= -1);
const AFT_R = box.filter(p => p[0] >= 1 && p[1] <= -1);
const layouts: any[] = [];
for (const radar of FRONT)
for (const bin of MID)
for (const eL of AFT_L) for (const eR of AFT_R)
for (const konst of box)
for (const gun of [...box, null])
for (const thr of [100]) {
  const comps = [{type: "Brain", pos: [0, 0]}, {type: "Radar", pos: radar},
    {type: "Binary", pos: bin, param: "MINUS"},
    {type: "Engine", pos: eL}, {type: "Engine", pos: eR},
    {type: "Constant", pos: konst, param: String(thr)},
    ...(gun ? [{type: "Lazer", pos: gun}] : [])];
  const conns = [
    {from: radar, fromPort: "bearing", to: eL, toPort: "in"},
    {from: radar, fromPort: "bearing", to: bin, toPort: "b"},
    {from: konst, fromPort: "out", to: bin, toPort: "a"},
    {from: bin, fromPort: "out", to: eR, toPort: "in"},
    ...(gun ? [{from: konst, fromPort: "out", to: gun, toPort: "in"}] : [])];
  layouts.push({label: `radar${radar} bin${bin} eng${eL}/${eR} k${konst} gun${gun}`,
                components: comps, connections: conns});
}
console.log(layouts.length + " layouts before geometry");

let tried = 0, best: any = null;
for (const c of layouts) {
  if (c.components.some((k: any) => k.type !== "Brain" && !inBox(k.pos))) continue;
  let p: any;
  try { p = new Ship({name: "p", ...c}, {team: "player", x: 0, y: 0, a: 0}); } catch { continue; }
  if (p.overlaps() || p.islands().length > 1) continue;
  if (p.comps.some((k: any) => !k.powered)) continue;
  tried++;
  const es = m.enemies.map((e: any) => new Ship(e.spec, {team: "enemy", x: e.x, y: e.y, a: e.a}));
  const w = new World([p, ...es]);
  let t = 0;
  for (; t < HORIZON && core(p) && es.some(core); t += DT) w.step(DT);
  const left = es.filter(core).length;
  const score = left * 1000 + t;
  if (!best || score < best.score) {
    best = {score, t, left, c, parts: p.live.length};
    console.log(`  ${left} enemies left, ${t.toFixed(1)}s, ${p.live.length} parts  ${c.label}`);
  }
}
console.log(`\n${tried} buildable layouts simulated`);
if (best) console.log(JSON.stringify({components: best.c.components, connections: best.c.connections}));
