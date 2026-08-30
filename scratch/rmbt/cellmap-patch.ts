import { readFileSync, writeFileSync } from "fs";
const P = "scratch/rmbt/cellmap-edit.js";
let s = readFileSync(P, "utf8");
const sub = (a: string, b: string) => { if (!s.includes(a)) throw new Error("not found: " + a.slice(0, 70)); s = s.replace(a, b); };

// liveCellMap + its maintainer take the streaming module map instead of letting cellMap
// call moduleMap(), which force-peeks every `module …` variable against a 1s deadline.
sub(`const _1xnzq7y = async function _liveCellMap(keepalive,cellMapModule,Inputs,cellMap)
{
  keepalive(cellMapModule, "maintain_live_cell_map");
  return Inputs.input(await cellMap());
};`,
`const _1xnzq7y = async function _liveCellMap(keepalive,cellMapModule,Inputs,cellMap,currentModules)
{
  keepalive(cellMapModule, "maintain_live_cell_map");
  return Inputs.input(await cellMap(undefined, currentModules));
};`);

sub(`const _193osz9 = async function _maintain_live_cell_map(runtime_variables,$0,cellMap,Event)
{
  runtime_variables;
  $0.value = await cellMap();`,
`const _193osz9 = async function _maintain_live_cell_map(runtime_variables,$0,cellMap,Event,currentModules)
{
  runtime_variables;
  $0.value = await cellMap(undefined, currentModules);`);

sub(`  $def("_1xnzq7y", "viewof liveCellMap", ["keepalive","cellMapModule","Inputs","cellMap"], _1xnzq7y);`,
    `  $def("_1xnzq7y", "viewof liveCellMap", ["keepalive","cellMapModule","Inputs","cellMap","currentModules"], _1xnzq7y);`);

const m = s.match(/\$def\("_193osz9", "maintain_live_cell_map", \[([^\]]*)\], _193osz9\);/);
if (!m) throw new Error("maintain_live_cell_map $def not found");
s = s.replace(m[0], `$def("_193osz9", "maintain_live_cell_map", [${m[1]},"currentModules"], _193osz9);`);

sub(`  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));`,
`  main.define("module @tomlarkworthy/modules", async () => runtime.module((await import("/@tomlarkworthy/modules.js?v=4")).default));
  main.define("currentModules", ["module @tomlarkworthy/modules", "@variable"], (_, v) => v.import("currentModules", _));
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));`);

writeFileSync(P, s);
console.log("patched");
