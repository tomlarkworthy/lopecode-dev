#!/usr/bin/env bun
// Import canonical notebook-module functionality into a node/bun script — instead of COPYING it.
//
// A lopecode module is `export default function define(runtime, observer)` registering reactive cells.
// This loads one such module into a headless @observablehq/runtime and lets you pull cell VALUES
// (cells that return functions give you reusable functions; data cells give you the computed data).
// Inject dependencies a cell needs (e.g. a browser-only or `require`-based builtin) via `overrides`.
//
//   const m = await importNotebookModule("modules/@tomlarkworthy/code-metrics.js", {
//     overrides: { acorn, acornWalk, allCells: myCells },   // replace named cells with your values
//   });
//   const halstead = await m.value("halstead");             // a function, reused verbatim
//   const rows     = await m.value("metricsRows");          // data computed by the real cells
//
// Notes:
// - `new Runtime()` (core, no stdlib) suffices for pure cells. For cells needing md/html/Inputs/require,
//   pass `builtins` (an @observablehq/stdlib Library or a {name: definition} object).
// - Only force cells you need via value(); cells whose (unprovided) deps would error stay un-evaluated.
// - Cross-module `import {…} from "@user/x"` is NOT resolved here (no importmap) — override those cells,
//   or load the full notebook via tools/lope-runtime.js `loadNotebook()` instead.

import { Runtime } from "@observablehq/runtime";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type ImportOptions = {
  /** Replace named cells with constant values (deps cleared). Use to inject builtins or feed inputs. */
  overrides?: Record<string, unknown>;
  /** Runtime builtins: an @observablehq/stdlib Library instance, or a {name: definition} object. */
  builtins?: unknown;
};

export type ImportedModule = {
  runtime: Runtime;
  module: any;
  /** Force-compute one cell and return its value. */
  value: (name: string) => Promise<any>;
  /** Force-compute several cells; returns {name: value}. */
  values: (names: string[]) => Promise<Record<string, any>>;
  dispose: () => void;
};

export async function importNotebookModule(jsPath: string, opts: ImportOptions = {}): Promise<ImportedModule> {
  const abs = resolve(jsPath);
  const ns = await import(pathToFileURL(abs).href);
  const define = ns.default;
  if (typeof define !== "function") throw new Error(`${jsPath}: no default export function define(runtime, observer)`);

  const runtime = new Runtime(opts.builtins as any);
  const main = runtime.module(define);

  for (const [name, val] of Object.entries(opts.overrides ?? {})) {
    main.redefine(name, [], () => val);
  }

  return {
    runtime,
    module: main,
    value: (name) => main.value(name),
    async values(names) {
      const out: Record<string, any> = {};
      for (const n of names) out[n] = await main.value(n);
      return out;
    },
    dispose: () => runtime.dispose?.(),
  };
}

// CLI: `bun tools/notebook-import.ts <module.js> <cell> [cell...]` — dump cell values (debug aid).
if (import.meta.main) {
  const [jsPath, ...cells] = process.argv.slice(2);
  if (!jsPath || !cells.length) { console.error("usage: notebook-import.ts <module.js> <cell> [cell...]"); process.exit(1); }
  const m = await importNotebookModule(jsPath);
  for (const c of cells) {
    try { const v = await m.value(c); console.log(`${c}:`, typeof v === "function" ? "[function]" : v); }
    catch (e: any) { console.log(`${c}: ERROR ${e.message}`); }
  }
  m.dispose();
}
