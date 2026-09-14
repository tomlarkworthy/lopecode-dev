// exporter-3's in-notebook tests, headless, with Notebook Kit's stdlib as the page builtins. On
// observablehq.com a viewed notebook gets Notebook Kit's `Mutable` and `Generators`, so a test that reads
// them from the page runs against these, not the classic stdlib lopecode ships.
//
// run: bun test tools/newobs-replica/exporter-3-on-notebook-kit.test.ts   (EXPORTER=<module.js> to test another copy)
import { test, expect } from "bun:test";
import * as acorn from "acorn";
import * as acorn_walk from "acorn-walk";
import { readFileSync } from "node:fs";
import { Runtime } from "@observablehq/runtime";
import { importNotebookModule } from "../notebook-import.ts";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// installs happy-dom's Element, Text and document, which define.ts and display() need as globals
import { nkRuntime, settle, snap } from "../js-toolchain/runtime/display-scenarios.ts";
import * as Generators from "../../vendor/notebook-kit/src/runtime/stdlib/generators/index.ts";
import { Mutable } from "../../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const EXPORTER = process.env.EXPORTER ?? "modules/@tomlarkworthy/exporter-3.js";

let jtm: any, sdk: any;
async function toolchain() {
  jtm ??= await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime, acorn, acorn_walk } });
  sdk ??= await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  return { jtm, sdk };
}

// displayStateOf is js-toolchain's registry: empty for cells Observable defined, filled for cells a loaded export rebuilt
async function exporter3({ displayStateOf = (_: any) => undefined } = {}) {
  const { sdk } = await toolchain();
  const pid = await sdk.value("persistentId");
  // exportModuleJS is always handed its runtime
  return importNotebookModule(EXPORTER, {
    builtins: { Generators: () => Generators, Mutable: () => Mutable },
    overrides: { acorn, pid, _runtime: null, displayStateOf, Runtime, expect }
  });
}

async function exporterFn(options?: { displayStateOf?: (v: any) => any }) {
  const exportModuleJS = await (await exporter3(options)).value("exportModuleJS");
  return async (module: any, name: string) =>
    (await exportModuleJS(name, { runtime: module._runtime, moduleNamesFn: () => new Map([[module, { name, module }]]) })).source as string;
}

// from text, not import(): bun reformats an imported function's toString(), and that text is what gets exported
const defineFrom = (source: string) => {
  const marker = "export default function define(";
  if (source.split(marker).length !== 2) throw new Error("source has no single default define");
  return new Function(source.replace(marker, "return function define("))();
};

// an export loaded the way an exported page loads it, with js-toolchain for its Notebook Kit cells
async function load(source: string, builtins?: Record<string, unknown>) {
  const { jtm } = await toolchain();
  const runtime = new Runtime(builtins as any);
  const module = runtime.module(defineFrom(source));
  if (module._scope.has("module @tomlarkworthy/js-toolchain")) module.redefine("module @tomlarkworthy/js-toolchain", [], () => jtm.module);
  return module;
}

const ownVariables = (module: any) => [...module._runtime._variables].filter((v: any) => v._module === module && v._type === 1);

test("Notebook Kit's Mutable is a bare generator, not the classic {generator, value} box", () => {
  const m: any = new (Mutable as any)(3);
  expect(m.generator).toBeUndefined();
  expect(typeof m.next).toBe("function");
});

test("test_exportModuleJS_round_trip passes with Notebook Kit's Mutable and Generators as page builtins", async () => {
  const m = await exporter3();
  expect(String(await m.value("test_exportModuleJS_round_trip"))).toStartWith("ok:");
});

// A module built the way observablehq.com builds a viewed notebook: Notebook Kit's transpiler and define.
// The import cell's specifier is swapped for a local module so the import runs and its outputs reach the
// rewired state a live page holds (see plan/exporter-4/live-notebook-kit-runtime-2026-09-12.md).
// Bun hands a data: URL import back as a string, so the library is a file.
const LIB = pathToFileURL(resolve(import.meta.dir, "fixtures/u-lib.js")).href;
const NODES = [
  { id: 1, mode: "ojs", value: 'import {x, x as y} from "@u/lib"' },
  { id: 2, mode: "ojs", value: "viewof v = Object.assign(new EventTarget(), {value: 5})" },
  { id: 3, mode: "ojs", value: "mutable m = 3" },
  { id: 4, mode: "js", value: "const a = 1, b = 2;" },
  { id: 5, mode: "js", value: "display(a + b);" }
];

async function notebookKitModule() {
  const runtime = new Runtime();
  const module = runtime.module();
  for (const node of NODES) {
    // one display state per cell, as the platform keeps it
    const state = { root: document.createElement("div"), expanded: [], variables: [] };
    const t = node.mode === "js" ? transpileJavaScript(node.value) : transpileObservable(node.value);
    let body = t.body;
    if (node.id === 1) {
      const specifier = JSON.stringify("https://api.observablehq.com/@u/lib.js?v=4");
      if (!body.includes(specifier)) throw new Error("import cell body no longer carries the expected specifier");
      body = body.replace(specifier, () => JSON.stringify(LIB));
    }
    // from text rather than import(), so a definition's toString() is the transpiled source
    define(module as any, state as any, { ...t, id: node.id, body: new Function(`return (${body})`)() });
  }
  return module;
}

test("exportModuleJS exports a module defined by Notebook Kit, import cells included", async () => {
  const module = await notebookKitModule();
  expect(await module.value("y")).toBe(1);
  const exportModuleJS = await (await exporter3()).value("exportModuleJS");
  const names = new Map([[module, { name: "@u/nk", module }]]);
  const { source } = await exportModuleJS("@u/nk", { runtime: module._runtime, moduleNamesFn: () => names });
  expect(source).toContain("export default function define(");
  // the runtime's own names, not the classic spellings
  expect(source).toContain('"viewof$v"');
  expect(source).toContain('"cell 4"');
});

test("a Notebook Kit module survives export -> load -> export -> load, and the second export is a fixed point", async () => {
  const { jtm } = await toolchain();
  const { displayStateOf, attachDisplay } = await jtm.values(["displayStateOf", "attachDisplay"]);
  const observe = await sdk.value("observe");
  const exportOf = await exporterFn({ displayStateOf });
  const values = async (module: any) => {
    const out: Record<string, unknown> = {};
    for (const name of ["x", "y", "v", "m", "a", "b"]) out[name] = await module.value(name);
    return out;
  };
  // the cells a loaded export rebuilds with js-toolchain, one per source node
  const converted = async (module: any) => {
    for (let i = 0; i < 100 && ownVariables(module).filter((v: any) => displayStateOf(v)).length < NODES.length; i++) await settle();
    return ownVariables(module).filter((v: any) => displayStateOf(v));
  };
  const displayed = async (module: any, heads: any[]) => {
    const head = heads.find((h) => displayStateOf(h).definition.inputs.includes("display"));
    const detach = attachDisplay(head, observe);
    for (let i = 0; i < 5; i++) await settle();
    const root = snap(displayStateOf(head).root);
    detach();
    return root;
  };

  const source = await notebookKitModule();
  const want = await values(source);
  expect(want).toEqual({ x: 1, y: 1, v: 5, m: 3, a: 1, b: 2 });

  const first = await exportOf(source, "@u/nk");
  const load1 = await load(first);
  const heads1 = await converted(load1);
  expect(heads1.map((h: any) => h._name)).toEqual(["cell 1", "viewof$v", "m", "cell 4", null]);
  expect(await values(load1)).toEqual(want);
  expect((await displayed(load1, heads1)).join("")).toContain('<span class="observablehq--number">3</span>');

  // the first load's js-toolchain module variable is the harness's, so the fixed point starts at the second export
  const second = await exportOf(load1, "@u/nk");
  expect(second.replace(/^\s*main\.define\("module @tomlarkworthy\/js-toolchain".*\n/gm, "")).toBe(first.replace(/^\s*main\.define\("module @tomlarkworthy\/js-toolchain".*\n/gm, ""));
  const load2 = await load(second);
  expect(await values(load2)).toEqual(want);
  await converted(load2);
  expect(await exportOf(load2, "@u/nk")).toBe(second);
}, 30000);

// Modules a viewed notebook imports reach the page through /api/import in a third form: named variables with
// no display state, spaced `viewof x`, a `mutator` trio on Notebook Kit's Mutable, and import cells that other
// variables project from. Recorded from observablehq.com (tools/newobs-fixtures/api-import).
const FIXTURES = resolve(import.meta.dir, "../newobs-fixtures/api-import/@tomlarkworthy");

test("an /api/import module's import cell exports verbatim, before and after it has run", async () => {
  const exportOf = await exporterFn();
  const text = readFileSync(`${FIXTURES}/invoke-variable.js`, "utf8");
  const specifier = '"./runtime-sdk"';
  if (text.split(specifier).length !== 2) throw new Error("invoke-variable fixture no longer imports ./runtime-sdk");
  // a local stand-in so the import can run
  const sdkStandIn = JSON.stringify(pathToFileURL(resolve(import.meta.dir, "fixtures/u-sdk.js")).href);
  const module = new Runtime().module(defineFrom(text.replace(specifier, () => sdkStandIn)));

  const before = await exportOf(module, "@tomlarkworthy/invoke-variable");
  const definitionOf = (source: string, name: string) => {
    const pid = source.match(new RegExp(`\\$def\\("(_\\w+)", ${JSON.stringify(name)}, (\\[[^\\]]*\\])`));
    return pid && { inputs: pid[2], body: source.match(new RegExp(`const ${pid[1]} = ([^\\n]*)`))?.[1] };
  };
  expect(definitionOf(before, "cell 13")).toEqual({ inputs: '["@variable"]', body: "async (__variable) => {" });
  expect(definitionOf(before, "lookupVariable")).toEqual({ inputs: '["cell 13"]', body: "(_) => _.lookupVariable;" });
  expect(before).not.toContain("module @tomlarkworthy/runtime-sdk");

  // running the import cell rewires lookupVariable and thisModule onto the module it loaded
  expect(await module.value("lookupVariable")).toBe("lookupVariable");
  expect(module._scope.get("lookupVariable")._inputs[0]._module).not.toBe(module);
  const after = await exportOf(module, "@tomlarkworthy/invoke-variable");
  expect(after).toBe(before);

  const loaded = await load(after);
  expect(await loaded.value("c")).toBe(4);
  expect(await loaded.value("thisModule")).toBe("thisModule");
  expect(await exportOf(loaded, "@tomlarkworthy/invoke-variable")).toBe(after);
});

test("an /api/import module's mutable exports with a Mutable an exported page can call without new", async () => {
  const exportOf = await exporterFn();
  const text = readFileSync(`${FIXTURES}/dependancy.js`, "utf8");
  // the page builtin Notebook Kit gives the module, which the mutator calls as a function
  const module = new Runtime({ Mutable: () => Mutable } as any).module(defineFrom(text));
  expect(await module.value("mutabledep")).toEqual({});

  const source = await exportOf(module, "@tomlarkworthy/dependancy");
  expect(source).toContain('main.builtin("Mutable"');
  expect(source).toContain('main.define("module @tomlarkworthy/js-toolchain"');
  // an exported page's stdlib Mutable is the classic constructor: withhold it so only the module's own can serve
  const loaded = await load(source, { Mutable: () => { throw new Error("the page's Mutable was used"); } });
  // observed, so the generator is not restarted between reads
  const observer = loaded.variable(true).define(null, ["mutabledep"], (x: unknown) => x);
  expect(await loaded.value("mutabledep")).toEqual({});
  const mutable = await loaded.value("mutable mutabledep");
  mutable.value = 7;
  await settle();
  expect(await loaded.value("mutabledep")).toBe(7);
  observer.delete();
  const again = await exportOf(loaded, "@tomlarkworthy/dependancy");
  const reloaded = await load(again);
  // once loaded: module.value's temporary reader of js-toolchain is itself a variable until it resolves
  expect(await reloaded.value("mutabledep")).toEqual({});
  expect(await exportOf(reloaded, "@tomlarkworthy/dependancy")).toBe(again);
});
