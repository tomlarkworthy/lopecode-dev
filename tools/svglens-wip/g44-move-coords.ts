import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const moveDeltas = await V("moveDeltas"), shapeLookup = await V("shapeLookup");
const svgShapes = await V("svgShapes"), attrVal = await V("attrVal"), translateLens = await V("translateLens");

const DOC = `<svg viewBox="0 0 200 200">
  <rect x="16" y="0" width="99" height="67"/>
  <circle cx="60" cy="52" r="24"/>
  <ellipse cx="10" cy="20" rx="5" ry="8"/>
  <line x1="0" y1="0" x2="30" y2="40"/>
  <polygon points="20,190  110,80  200,190"/>
  <path d="M 10 30 C 50 12, 84 44, 128 26"/>
  <g transform="translate(5 5)"><rect x="1" y="1" width="2" height="2"/></g>
</svg>`;
const I = { rect: 1, circle: 2, ellipse: 3, line: 4, polygon: 5, path: 6, g: 7 };

// A target as `moveTargetOf` would build it, at identity CTM (no zoom, no parent transform).
const target = (tag: string, idx: number, Elin = [1, 0, 0, 1]) => ({
  idx, el: { localName: tag }, text: attrVal(DOC, idx, "transform") || "", src: DOC,
  entry: shapeLookup.forTag(svgShapes, tag, DOC, idx),
  Slin: [1, 0, 0, 1], Elin, T0: translateLens.get(attrVal(DOC, idx, "transform") || "")
});
const show = (ds: any[]) => ds.map((d) => `${d.name}=${Array.isArray(d.value) ? JSON.stringify(d.value) : d.value}`).join(" ");

console.log("--- what each tag writes when you drag it by (10, 4) ---");
for (const [tag, idx] of Object.entries(I))
  console.log(`  ${tag.padEnd(8)} ${show(moveDeltas(target(tag, idx), 10, 4))}`);

console.log("\n--- T1: a drag that ends where it began writes nothing ---");
for (const [tag, idx] of Object.entries(I))
  console.log(`  ${tag.padEnd(8)} ${moveDeltas(target(tag, idx), 0, 0).length} deltas`);

console.log("\n--- one axis only: the other attribute is untouched ---");
console.log("  rect dx only:", show(moveDeltas(target("rect", I.rect), 10, 0)));
console.log("  rect dy only:", show(moveDeltas(target("rect", I.rect), 0, 4)));

console.log("\n--- a line moves, it does not stretch ---");
const ld = moveDeltas(target("line", I.line), 10, 4);
console.log(" ", show(ld));
const before = { x1: 0, y1: 0, x2: 30, y2: 40 };
const after = Object.fromEntries(ld.map((d: any) => [d.name, +d.value]));
console.log("  length preserved:",
  Math.abs(Math.hypot(after.x2 - after.x1, after.y2 - after.y1)
         - Math.hypot(before.x2 - before.x1, before.y2 - before.y1)) < 1e-9);

console.log("\n--- a rotated element: the delta goes through its own frame ---");
// element transform rotate(90): screen +x is local -y, screen +y is local +x
const R = [0, 1, -1, 0];                       // inverse of the rotation's linear part
console.log("  rect under rotate(90), dragged (10, 0):", show(moveDeltas(target("rect", I.rect, R), 10, 0)));

console.log("\n--- snapping is applied to the origin, once ---");
const q = (v: number) => Math.round(v / 5) * 5;
console.log("  rect (dx 12, dy 3) on a grid of 5:", show(moveDeltas(target("rect", I.rect), 12, 3, { q })));
console.log("  line (dx 12, dy 3) on a grid of 5:", show(moveDeltas(target("line", I.line), 12, 3, { q })));
