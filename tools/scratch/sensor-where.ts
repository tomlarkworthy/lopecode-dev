import {importNotebookModule} from "../notebook-import.ts";
const eng = await importNotebookModule(process.env.ENGINE ?? "modules/@tomlarkworthy/corepox-engine.js");
const Ship: any = await eng.value("Ship");
const s = new Ship({name:"x", components:[{type:"Brain",pos:[-1,0]},{type:"LaserTurret2",pos:[0,0]},{type:"Radar",pos:[0,-3]}]},{x:0,y:0,a:0});
const r = s.comps.find((c:any)=>c.type==="Radar"), t = s.comps.find((c:any)=>c.type==="LaserTurret2");
const [sx,sy] = s.sensorOf(r), [tx,ty] = s.worldOf(t);
console.log(`radar anchor ${s.worldOf(r).map((v:number)=>v.toFixed(2))}  sensor ${[sx,sy].map(v=>v.toFixed(2))}`);
console.log(`turret anchor ${[tx,ty].map(v=>v.toFixed(2))}   sensor is ${(sy-ty).toFixed(2)} tiles behind (screen +y), ${(sx-tx).toFixed(2)} across`);
