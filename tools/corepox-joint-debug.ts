import {importNotebookModule} from "./notebook-import.ts";
const m=await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const Ship:any=await m.value("Ship"); const JOINTS:any=await m.value("JOINTS");
const TYPES:any=await m.value("TYPES");
// two Armours side by side: both have all 8 slots, they MUST link
const spec={name:"t",components:[{type:"Armour",pos:[0,0],dir:"up"},
                                 {type:"Armour",pos:[1,0],dir:"up"}],connections:[]};
const s=new Ship(spec,{team:"a"});
console.log("comps:", s.comps.map((c:any)=>`${c.type}@${c.px},${c.py} dirName=${c.dirName} dir=${c.dir} tiles=${JSON.stringify(c.tiles)}`));
console.log("JOINTS.Armour =", JSON.stringify(JOINTS.Armour));
console.log("TYPES.Armour.tiles =", JSON.stringify(TYPES.Armour.tiles));
console.log("\nislands (engine, reach-2):", s.islands().length);
