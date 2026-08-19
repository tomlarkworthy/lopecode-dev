import { importNotebookModule } from "./notebook-import.ts";

const m = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js", {
  overrides: { md: () => null },
});
const simulate = await m.value("simulate");
const TYPES = await m.value("TYPES");

const SEEKER = { name: "seeker", components: [
  {type:"Brain",pos:[0,0]}, {type:"Radar",pos:[0,1]},
  {type:"Constant",pos:[2,1],param:"100"},
  {type:"Binary",pos:[1,1],param:"GT"}, {type:"Binary",pos:[-1,1],param:"LT"},
  {type:"Binary",pos:[1,0],param:"TIMES"}, {type:"Binary",pos:[-1,0],param:"TIMES"},
  {type:"Engine",pos:[-1,-1]}, {type:"Engine",pos:[1,-1]}, {type:"Engine",pos:[0,-1]},
  {type:"Lazer",pos:[0,2]}, {type:"Armour",pos:[0,-2]} ],
 connections: [
  {from:[0,1],fromPort:"bearing",to:[1,1],toPort:"a"},
  {from:[0,1],fromPort:"bearing",to:[-1,1],toPort:"a"},
  {from:[1,1],fromPort:"out",to:[1,0],toPort:"a"},
  {from:[2,1],fromPort:"out",to:[1,0],toPort:"b"},
  {from:[-1,1],fromPort:"out",to:[-1,0],toPort:"a"},
  {from:[2,1],fromPort:"out",to:[-1,0],toPort:"b"},
  {from:[1,0],fromPort:"out",to:[-1,-1],toPort:"in"},
  {from:[-1,0],fromPort:"out",to:[1,-1],toPort:"in"},
  {from:[2,1],fromPort:"out",to:[0,-1],toPort:"in"},
  {from:[2,1],fromPort:"out",to:[0,2],toPort:"in"} ]};

const DRONE = { name: "drone", components: [
  {type:"Brain",pos:[0,0]}, {type:"Armour",pos:[0,1]}, {type:"Armour",pos:[1,0]},
  {type:"Armour",pos:[-1,0]}, {type:"Armour",pos:[0,-1]} ], connections: [] };

console.log("component types:", Object.keys(TYPES).join(" "));
const t0 = performance.now();
const r = simulate(SEEKER, DRONE, { ticks: 6000, start: 40, sample: 250 });
const ms = performance.now() - t0;

console.log(`\nwinner=${r.winner}  ${r.seconds}s sim in ${ms.toFixed(0)}ms wall  ` +
            `(${(r.ticks / (ms/1000) / 1000).toFixed(0)}k ticks/s)`);
console.log(`a: ${r.a.live} parts alive=${r.a.alive}   b: ${r.b.live} parts alive=${r.b.alive}\n`);
console.log("   t   dist   head  aLive bLive");
for (const s of r.trace) console.log(
  String(s.t).padStart(5), String(s.dist).padStart(6), String(s.aa).padStart(7),
  String(s.aLive).padStart(5), String(s.bLive).padStart(5));

const d0 = r.trace[0].dist, dmin = Math.min(...r.trace.map(s=>s.dist ?? Infinity));
console.log(`\nPILOTING: start ${d0} -> min ${dmin} (${((d0-dmin)/d0*100).toFixed(0)}% closed) ` +
            `${dmin < d0*0.3 ? "PASS" : "FAIL"}`);
console.log(`COMBAT:   drone ${5} -> ${r.b.live} parts  ${r.b.live < 5 ? "PASS" : "FAIL"}`);
