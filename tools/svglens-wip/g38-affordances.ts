import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const affs = await V("svgAffordances");
const commands = await V("svgCommands");

console.log("providers:", affs.map((p:any)=>p.id).join(", "));

const cmdIds = new Set(commands.map((c:any)=>c.id));
console.log("\n-- command-backed chips point at real commands --");
for (const p of affs.filter((p:any)=>p.command))
  console.log(`  ${p.id.padEnd(14)} -> command "${p.command}"  exists=${cmdIds.has(p.command)}`);

// a fake affordance context
const mkA = (over:any={}) => ({
  doc:"<svg><rect/></svg>", box:{x:0,y:0,width:10,height:10}, scale:2, mode:"rect",
  paths:[[0,0]], path:[0,0], index:1, tag:"rect", indexOf:()=>1,
  field:(prop:string)=>({fill:"red",stroke:"blue","stroke-width":"2"} as any)[prop] ?? "",
  fieldOf:(_p:any,prop:string)=>({fill:"red",stroke:"blue","stroke-width":"2"} as any)[prop] ?? "",
  canDo:(_:string)=>true, ...over });

const byId = (id:string)=>affs.find((p:any)=>p.id===id);
console.log("\n-- applies() --");
console.log("  duplicate (1 sel):", byId("duplicate").applies(mkA()));
console.log("  swap-paint (fill+stroke both set):", byId("swap-paint").applies(mkA()));
console.log("  swap-paint (stroke empty -> false):", byId("swap-paint").applies(mkA({ fieldOf:(_p:any,prop:string)=>prop==="fill"?"red":"" })));
console.log("  stroke-grip (any):", byId("stroke-grip").applies(mkA()));
console.log("  close-path on rect (isPath false):", byId("close-path").applies(mkA()));
console.log("  close-path on path (isPath true):", byId("close-path").applies(mkA({ tag:"path" })));

console.log("\n-- stroke-grip drag math --");
const grip = byId("stroke-grip");
const a = mkA({ paths:[[0,0],[0,1]], fieldOf:(p:any,prop:string)=>prop==="stroke-width"?(p[1]===0?"2":""):"" });
const base = grip.drag.grab(a);
console.log("  grab bases (idx0 sw=2, idx1 sw absent->1):", JSON.stringify(base));
const width = (b:number, dux:number) => Math.max(0, +(b + dux).toFixed(2));
console.log("  drag +5 -> 2 becomes", width(base["0/0"],5), " 1 becomes", width(base["0/1"],5));
console.log("  drag -10 clamps at 0:", width(base["0/0"],-10));

console.log("\n-- glyphs --");
for (const p of affs) console.log(`  ${p.id.padEnd(14)} ${JSON.stringify(p.glyph(mkA()))}`);
