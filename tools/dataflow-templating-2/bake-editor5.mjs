// Bakes the v2 swap into a checked-out @tomlarkworthy/editor-5.js, so a notebook synced with it
// boots every editor on instantiateDataflow instead of building them after the fact. Needed
// because redefining cellEditor at runtime does not rebuild existing editors.
//
// Mechanical and reversible: three new cells appended, and cellEditor's single dependency renamed.
import { readFileSync, writeFileSync } from "node:fs";

const here = (p) => new URL(p, import.meta.url).pathname;
const MODULE = new URL("../../modules/@tomlarkworthy/editor-5.js", import.meta.url).pathname;

const impl = readFileSync(here("./instantiate-dataflow.mjs"), "utf8")
  .replace(/^export default [^\n]*\n/gm, "")
  .replace(/^export /gm, "")
  .trim();

let src = readFileSync(MODULE, "utf8");
if (src.includes("cloneViaSandbox")) throw new Error("already baked — re-checkout first");

const cells = `const _cdv2f = function _instantiateDataflowFactory(){
${impl}

return instantiateDataflowFactory;
};
const _cdv2m = function _instantiateDataflow(instantiateDataflowFactory,runtime){return(
instantiateDataflowFactory(runtime.constructor, {})
)};
const _cdv2c = function _cloneViaSandbox(instantiateDataflow,onCodeChange){return(
(variables, observerFactory = () => ({})) => {
  const inst = instantiateDataflow(variables, {
    observers: observerFactory,
    watch: onCodeChange
  });
  return () => inst.dispose();
}
)};
`;

// 1. the three new cell functions, immediately before the define() export
const anchor = "export default function define(runtime, observer) {";
if (!src.includes(anchor)) throw new Error("define() export not found");
src = src.replace(anchor, cells + anchor);

// 2. register them next to cellEditor's own $def
const cellEditorDef = src.match(/^ *\$def\("_1p2yypw", "cellEditor",.*$/m);
if (!cellEditorDef) throw new Error("cellEditor $def not found");
src = src.replace(
  cellEditorDef[0],
  `  $def("_cdv2f", "instantiateDataflowFactory", [], _cdv2f);
  $def("_cdv2m", "instantiateDataflow", ["instantiateDataflowFactory","runtime"], _cdv2m);
  $def("_cdv2c", "cloneViaSandbox", ["instantiateDataflow","onCodeChange"], _cdv2c);
` + cellEditorDef[0].replace('"cloneDataflow"', '"cloneViaSandbox"')
);

// 3. rename the dependency inside cellEditor itself (signature + both call sites)
const fn = src.match(/const _1p2yypw = function _cellEditor\([\s\S]*?\n\)\};/);
if (!fn) throw new Error("cellEditor function not found");
const before = (fn[0].match(/\bcloneDataflow\b/g) || []).length;
if (before !== 3) throw new Error(`expected 3 cloneDataflow references in cellEditor, found ${before}`);
src = src.replace(fn[0], fn[0].replace(/\bcloneDataflow\b/g, "cloneViaSandbox"));

writeFileSync(MODULE, src);
console.log(`baked: 3 cells added, ${before} cloneDataflow references renamed in cellEditor`);
