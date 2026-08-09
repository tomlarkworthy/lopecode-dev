// Points editor-5's cellEditor at cloneViaSandbox instead of cloneDataflow, importing it from
// @tomlarkworthy/dataflow-templating. bake-editor5.mjs did the same swap with the implementation
// inlined -- that was the gate harness, when the sandbox code did not yet live in the library.
//
// The import edge means editor-5 must never ship ahead of dataflow-templating: sweep the library
// across the corpus first.
import { readFileSync, writeFileSync } from "node:fs";

const MODULE = new URL("../../modules/@tomlarkworthy/editor-5.js", import.meta.url).pathname;

let src = readFileSync(MODULE, "utf8");
if (src.includes("cloneViaSandbox")) throw new Error("already migrated — re-checkout first");

// 1. the import
const oldImport = `  main.define("cloneDataflow", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneDataflow", _));`;
if (!src.includes(oldImport)) throw new Error("cloneDataflow import not found");
src = src.replace(
  oldImport,
  `  main.define("cloneViaSandbox", ["module @tomlarkworthy/dataflow-templating", "@variable"], (_, v) => v.import("cloneViaSandbox", _));`
);

// 2. cellEditor's dependency list
const def = src.match(/^ *\$def\("_1p2yypw", "cellEditor",.*$/m);
if (!def) throw new Error("cellEditor $def not found");
if (!def[0].includes('"cloneDataflow"')) throw new Error("cellEditor $def does not list cloneDataflow");
src = src.replace(def[0], def[0].replace('"cloneDataflow"', '"cloneViaSandbox"'));

// 3. the signature and both call sites inside cellEditor
const fn = src.match(/const _1p2yypw = function _cellEditor\([\s\S]*?\n\)\};/);
if (!fn) throw new Error("cellEditor function not found");
const n = (fn[0].match(/\bcloneDataflow\b/g) || []).length;
if (n !== 3) throw new Error(`expected 3 cloneDataflow references in cellEditor, found ${n}`);
src = src.replace(fn[0], fn[0].replace(/\bcloneDataflow\b/g, "cloneViaSandbox"));

if (/\bcloneDataflow\b/.test(src)) throw new Error("cloneDataflow still referenced somewhere");

writeFileSync(MODULE, src);
console.log(`migrated: import rewired, ${n} references renamed in cellEditor`);
