import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const nodeAt = await V("nodeAt"), cmdSelect = await V("cmdSelect");
const DOC = `<svg viewBox="0 0 100 100">
  <rect x="0" y="0" width="10" height="10" fill="red"/>
  <circle cx="5" cy="5" r="3" fill="red"/>
  <rect x="20" y="20" width="8" height="8" fill="blue"/>
</svg>`;
const root = nodeAt(DOC, []);
console.log("root tag:", root.tag, "children:", (root.children||[]).map((c:any)=>`${c.tag}@${JSON.stringify(c.path)}`));

const env = { src: DOC, scope: [], paths: [[0]], options: {} };
const mk = (k:string) => cmdSelect(k);
console.log("all  :", JSON.stringify(mk("all").plan(env)));
console.log("none(empty):", JSON.stringify(mk("none").plan({...env, paths: []})));
console.log("none(sel)  :", JSON.stringify(mk("none").plan(env)));
console.log("same-fill  :", JSON.stringify(mk("same-fill").plan(env)));
console.log("same-tag   :", JSON.stringify(mk("same-tag").plan(env)));
console.log("keys:", ["all","none","same-fill","same-tag"].map(k=>`${mk(k).id}:${mk(k).key}`));

console.log("\n--- scope=[0] (inside the svg) ---");
const svg = nodeAt(DOC, [0]);
console.log("svg children:", (svg.children||[]).map((c:any)=>`${c.tag}@${JSON.stringify(c.path)} fill=${c.attrs?.fill?.value}`));
const env2 = { src: DOC, scope: [0], paths: [[0,0]], options: {} };
console.log("all  :", JSON.stringify(cmdSelect("all").plan(env2).paths));
console.log("same-fill (primary rect#red):", JSON.stringify(cmdSelect("same-fill").plan(env2).paths));
console.log("same-tag  (primary rect):", JSON.stringify(cmdSelect("same-tag").plan(env2).paths));
