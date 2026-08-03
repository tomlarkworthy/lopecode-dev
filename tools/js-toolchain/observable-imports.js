// Reactive Observable imports for js-toolchain (import kind B).
//
// A Notebook Kit cell that is ONLY import declaration(s) whose specifier names an Observable
// notebook — `observable:@user/nb`, or a bare notebook id `@user/nb` / `d/<16hex>` — compiles
// to lopecode's native reactive cross-module import representation (the same shape
// @tomlarkworthy/observablejs-toolchain produces), NOT to a static `await import(...)`:
//
//   module loader :  {_name:"module @user/nb", _inputs:[],
//                     _definition:`async () => runtime.module((await import("/@user/nb.js?v=4")).default)`}
//   per binding   :  {_name:"local", _inputs:["module @user/nb","@variable"],
//                     _definition:`(_, v) => v.import("imported", _)`}
//
// These are truly reactive: when the source variable recomputes, importers update. `viewof`/
// `mutable` variables travel as `viewof$foo` in the ES specifier and dedollar to `viewof foo`
// at runtime (mirrors notebook-kit src/javascript/imports/observable.ts). Namespace and
// default imports are not supported (matches notebook-kit).
//
// This is import kind B; kind A (npm:/jsr:/relative ES modules, kept verbatim and resolved by
// es-module-shims) lives in imports-rewrite.js.
import {Parser} from "acorn";
import {acornOptions} from "./parse.js";

const NOTEBOOK_ID = /^(@[^/]+\/[^/]+|d\/[a-f0-9]{16}(@\d+)?)$/;

export function isObservableSpecifier(spec) {
  if (spec.startsWith("observable:")) return true;
  return NOTEBOOK_ID.test(spec);
}
const toNotebookId = (spec) => (spec.startsWith("observable:") ? spec.slice("observable:".length) : spec);

// "viewof$foo" -> "viewof foo", "$$" -> "$" (port of notebook-kit dedollar).
export function dedollar(input) {
  let dollars = 0, out = "";
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "$") { dollars++; continue; }
    if (dollars > 0) { out += (dollars === 1 ? " " : "$".repeat(dollars - 1)); dollars = 0; }
    out += input[i];
  }
  if (dollars > 0) out += (dollars === 1 ? " " : "$".repeat(dollars - 1));
  return out;
}
// Inverse: " " -> "$", literal "$" -> "$$".
export function redollar(input) {
  return input.replace(/\$/g, "$$$$").replace(/ /g, "$");
}

// COMPILE — returns a cell array if `source` is an observable-import-only cell, else null.
export function compileObservableImports(source, {id = 1} = {}) {
  let program;
  try {
    program = Parser.parse(source, acornOptions);
  } catch {
    return null;
  }
  if (program.body.length === 0) return null;
  if (!program.body.every((n) => n.type === "ImportDeclaration")) return null;
  const decls = program.body;
  // every declaration must target an Observable notebook, else this isn't a kind-B cell
  if (!decls.every((d) => typeof d.source.value === "string" && isObservableSpecifier(d.source.value))) {
    return null;
  }
  const cells = [];
  const seenModule = new Set();
  for (const d of decls) {
    const nb = toNotebookId(d.source.value);
    const moduleName = `module ${nb}`;
    if (!seenModule.has(moduleName)) {
      seenModule.add(moduleName);
      cells.push({
        _name: moduleName,
        _inputs: [],
        _definition: `async () => runtime.module((await import(${JSON.stringify(`/${nb}.js?v=4`)})).default)`
      });
    }
    for (const s of d.specifiers) {
      if (s.type !== "ImportSpecifier") {
        throw new Error("js-toolchain: observable imports support only named specifiers (no default/namespace)");
      }
      const imported = dedollar(s.imported.type === "Identifier" ? s.imported.name : s.imported.value);
      const local = dedollar(s.local.name);
      cells.push({
        _name: local,
        _inputs: [moduleName, "@variable"],
        _definition: `(_, v) => v.import(${JSON.stringify(imported)}, _)`
      });
    }
  }
  return cells;
}

const IMPORT_PROJECTION = /^\(_, v\) => v\.import\(("(?:[^"\\]|\\.)*"), _\)$/;
const MODULE_LOADER = /^async \(\) => runtime\.module\(\(await import\(("(?:[^"\\]|\\.)*")\)\)\.default\)$/;

// DECOMPILE — returns source if `cells` are an observable-import group, else null.
export function decompileObservableImports(cells) {
  if (!cells || cells.length === 0) return null;
  const loaders = new Map();   // moduleName -> notebook id
  const bindings = [];         // {moduleName, imported, local}
  for (const c of cells) {
    const def = typeof c._definition === "string" ? c._definition : String(c._definition);
    const name = c._name ?? "";
    const loader = def.match(MODULE_LOADER);
    if (loader && name.startsWith("module ")) {
      const path = JSON.parse(loader[1]);                 // "/@user/nb.js?v=4"
      loaders.set(name, path.replace(/^\//, "").replace(/\.js\?v=4$/, ""));
      continue;
    }
    const proj = def.match(IMPORT_PROJECTION);
    if (proj && (c._inputs?.length ?? 0) === 2 && c._inputs[1] === "@variable" && c._inputs[0].startsWith("module ")) {
      bindings.push({moduleName: c._inputs[0], imported: JSON.parse(proj[1]), local: name});
      continue;
    }
    return null; // a cell that isn't part of an import group -> not our shape
  }
  if (bindings.length === 0) return null;
  // group bindings by module, preserving first-seen module order
  const order = [];
  const byModule = new Map();
  for (const b of bindings) {
    if (!loaders.has(b.moduleName)) return null;
    if (!byModule.has(b.moduleName)) { byModule.set(b.moduleName, []); order.push(b.moduleName); }
    byModule.get(b.moduleName).push(b);
  }
  const lines = order.map((moduleName) => {
    const nb = loaders.get(moduleName);
    const specs = byModule.get(moduleName).map(({imported, local}) => {
      const i = redollar(imported), l = redollar(local);
      return i === l ? i : `${i} as ${l}`;
    });
    return `import {${specs.join(", ")}} from ${JSON.stringify(`observable:${nb}`)}`;
  });
  return lines.join("\n");
}
