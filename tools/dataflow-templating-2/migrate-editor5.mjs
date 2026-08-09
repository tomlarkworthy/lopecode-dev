// Points a consumer's cloneDataflow call sites at cloneViaSandbox, importing it from
// @tomlarkworthy/dataflow-templating. bake-editor5.mjs did the same swap for editor-5 with the
// implementation inlined -- that was the gate harness, before the sandbox code lived in the
// library.
//
//   node migrate-editor5.mjs                       # editor-5 (the default, kept for the record)
//   node migrate-editor5.mjs @tomlarkworthy/robocoop-2
//
// The import edge means a consumer must never ship ahead of dataflow-templating: sweep the library
// across the corpus first.
import { readFileSync, writeFileSync } from "node:fs";

const MODULE_ID = process.argv[2] || "@tomlarkworthy/editor-5";
const PATH = new URL(`../../modules/${MODULE_ID}.js`, import.meta.url).pathname;

let src = readFileSync(PATH, "utf8");
if (src.includes("cloneViaSandbox")) throw new Error("already migrated — re-checkout first");

// 1. the import
const oldImport = `  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));`;
if (!src.includes(oldImport)) throw new Error("cloneDataflow import not found");
src = src.replace(
  oldImport,
  `  main.define("cloneViaSandbox", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneViaSandbox", _));`
);

// 2. every $def that lists cloneDataflow as a dependency
const defs = [...src.matchAll(/^ *\$def\("[^"]+", "[^"]*",.*$/gm)]
  .map((m) => m[0])
  .filter((d) => d.includes('"cloneDataflow"'));
if (!defs.length) throw new Error("no $def lists cloneDataflow");
for (const d of defs) src = src.replace(d, d.replace('"cloneDataflow"', '"cloneViaSandbox"'));

// 3. the cell functions themselves -- signature and call sites
const pids = defs.map((d) => d.match(/\$def\("([^"]+)"/)[1]);
let renamed = 0;
for (const pid of pids) {
  const fn = src.match(
    new RegExp(`const ${pid} = (?:async )?function [\\s\\S]*?\\n(?:\\)\\};|\\};)`)
  );
  if (!fn) throw new Error(`cell function for ${pid} not found`);
  const n = (fn[0].match(/\bcloneDataflow\b/g) || []).length;
  if (!n) throw new Error(`${pid} lists cloneDataflow but its body never mentions it`);
  src = src.replace(fn[0], fn[0].replace(/\bcloneDataflow\b/g, "cloneViaSandbox"));
  renamed += n;
}

if (/\bcloneDataflow\b/.test(src)) throw new Error("cloneDataflow still referenced somewhere");

writeFileSync(PATH, src);
console.log(
  `migrated ${MODULE_ID}: import rewired, ${renamed} reference(s) renamed across ${pids.length} cell(s) (${pids.join(", ")})`
);
