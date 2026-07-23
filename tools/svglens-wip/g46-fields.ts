import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const svgFields = await V("svgFields"), setProperty = await V("setProperty");

const DOC = `<svg viewBox="0 0 100 100">
  <rect x="1" y="1" width="9" height="9" fill="darkseagreen" stroke="#333" stroke-width="2"/>
  <circle cx="5" cy="5" r="3" style="fill: tomato; stroke-linecap: round; opacity: 0.5"/>
</svg>`;
const RECT = 1, CIRC = 2;

console.log("registry fields:", svgFields.list.length);
console.log("kinds:", [...new Set(svgFields.list.map((f:any)=>f.kind))].join(", "));

console.log("\n--- read from attributes (rect) ---");
for (const p of ["fill","stroke","stroke-width","opacity","stroke-linecap"])
  console.log(`  ${p.padEnd(14)} = ${JSON.stringify(svgFields.read(DOC, RECT, p))}`);
console.log("  fill preserves author notation (darkseagreen):", svgFields.read(DOC, RECT, "fill") === "darkseagreen");

console.log("\n--- read from style, style wins over attr (circle) ---");
for (const p of ["fill","stroke-linecap","opacity"])
  console.log(`  ${p.padEnd(14)} = ${JSON.stringify(svgFields.read(DOC, CIRC, p))}`);

console.log("\n--- setProperty writes back through the same lens style declaration exists ---");
const w = setProperty(DOC, CIRC, "fill", "rebeccapurple");
console.log("  circle fill write:", JSON.stringify(w), "(style present -> updates style, name=style)");
const w2 = setProperty(DOC, RECT, "fill", "rebeccapurple");
console.log("  rect fill write:", JSON.stringify(w2), "(no style -> attribute)");
