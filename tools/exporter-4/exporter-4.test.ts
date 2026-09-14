// exporter-4, headless: a module holding Notebook Kit cells (js-toolchain defineCell) is exported with
// exportModuleJS, loaded into a fresh runtime, exported again and loaded again. The variables, pids,
// values and display roots must match the source at every step, the second and third exports must be
// byte-identical, and a module with only classic cells must export exactly as exporter-3 writes it.
// exporter-3 is read from the lopepage-3 notebook, the copy exporter-4 was forked from.
//
// run: bun test tools/exporter-4/exporter-4.test.ts
import { test, expect, beforeAll, describe } from "bun:test";
import { Runtime } from "@observablehq/runtime";
import * as acorn from "acorn";
import * as acorn_walk from "acorn-walk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";
import { blockContent } from "../lib/notebook-blocks.ts";
import { nkRuntime, settle, snap } from "../js-toolchain/runtime/display-scenarios.ts";

// EXPORTER names another exporter module file to test (merge A: exporter-3 with exporter-4 merged in). It imports
// displayStateOf from js-toolchain, which cannot load headless, so the registry is injected as for exporter-4.
// DONOR names the notebook whose exporter-3 block is the classic-cell reference.
const E4 = process.env.EXPORTER ?? "modules/@tomlarkworthy/exporter-4.js";
const DONOR = process.env.DONOR ?? "lopebooks/notebooks/@tomlarkworthy_lopepage-3.html";
const OUT = "tools/exporter-4/.mutants";

let jtm: any, jt: any, sdkObserve: any, realize: any, persistentId: any, exporter3: any;

beforeAll(async () => {
  console.error = () => {};
  mkdirSync(OUT, { recursive: true });
  jtm = await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime, acorn, acorn_walk } });
  jt = await jtm.values(["defineCell", "displayStateOf", "attachDisplay", "transpileJavaScript"]);
  const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  ({ observe: sdkObserve, realize, persistentId } = await sdk.values(["observe", "realize", "persistentId"]));
  const exporter3Source = blockContent(readFileSync(DONOR, "utf8"), "@tomlarkworthy/exporter-3");
  if (!exporter3Source) throw new Error(`${DONOR} has no @tomlarkworthy/exporter-3 block`);
  writeFileSync(`${OUT}/exporter-3.js`, exporter3Source);
  exporter3 = await exporterFor(`${OUT}/exporter-3.js`, { nk: false });
});

async function exporterFor(path: string, { nk = true } = {}) {
  // exportModuleJS is always handed its runtime; _runtime is only its default
  const overrides: Record<string, unknown> = { pid: persistentId, acorn, _runtime: null };
  if (nk) overrides.displayStateOf = jt.displayStateOf;
  const m = await importNotebookModule(path, { overrides });
  const exportModuleJS = await m.value("exportModuleJS");
  return async (module: any, name = "@test/nk") =>
    (await exportModuleJS(name, { runtime: module._runtime, moduleNamesFn: () => new Map([[module, { name }]]) })).source as string;
}

// evaluated from text, not import()ed: bun transpiles an imported file, so the loaded bodies' toString()
// would be bun's reformatting (`return { a: n * 2, b: "x" }`) rather than the exported source
async function load(source: string) {
  const marker = "export default function define(";
  if (source.split(marker).length !== 2) throw new Error("export has no single default define");
  const define = new Function(source.replace(marker, "return function define("))();
  const runtime = new Runtime();
  const module = runtime.module(define);
  module.redefine("module @tomlarkworthy/js-toolchain", [], () => jtm.module);
  return module;
}

const SOURCES = [
  'const a = n * 2, b = "x";',
  'display("n is " + n);\ndisplay("twice that is " + n * 2);',
  'const k = view(Object.assign(document.createElement("input"), {type: "range", min: 0, max: 10, value: n}));',
  "k * n"
];

async function sourceModule() {
  const runtime = new Runtime();
  const module = runtime.module();
  module.variable().define("n", [], () => 3);
  for (const [i, source] of SOURCES.entries()) {
    const t = jt.transpileJavaScript(source);
    const [body] = await realize([t.body], runtime);
    jt.defineCell(module, { ...t, id: i + 1, body });
  }
  module.variable().define("after", ["a", "k"], (a: number, k: number) => `${a}:${k}`);
  // pids the way runtime-sdk leaves them after an edit: not derivable from the definition
  for (const v of runtime._variables) if (v._module === module && v._type === 1) v.pid = `_t${Math.random().toString(36).slice(2, 9)}`;
  return module;
}

const ownVariables = (module: any) => [...module._runtime._variables].filter((v: any) => v._module === module && v._type === 1 && !String(v._name).startsWith("module "));

const fingerprint = (module: any) => ownVariables(module).map((v: any) => {
  const state = jt.displayStateOf(v);
  return {
    name: v._name, pid: v.pid, inputs: v._inputs.map((i: any) => i._name),
    definition: state ? { ...state.definition, body: String(state.definition.body) } : String(v._definition),
    shadows: v._shadow ? [...v._shadow.keys()] : null,
    cell: state ? state.variables.map((x: any) => x.pid) : null
  };
});

// resolves once every head written by $nk has been rebuilt by defineCell
async function converted(module: any, heads: number) {
  for (let i = 0; i < 100; i++) {
    if (ownVariables(module).filter((v: any) => jt.displayStateOf(v)).length === heads) return;
    await settle();
  }
  // forcing a projection surfaces a rejected conversion; a pending one times out
  const reason = await Promise.race([module.value("a").then((a: any) => `a resolved to ${a}`, (e: any) => `a rejected: ${e?.stack ?? e}`), new Promise((r) => setTimeout(() => r("a still pending"), 500))]);
  throw new Error(`Notebook Kit cells were not rebuilt: ${reason}`);
}

async function observed(module: any) {
  const values: Record<string, any> = {};
  for (const name of ["n", "a", "b", "k", "after"]) values[name] = await module.value(name);
  const heads = ownVariables(module).filter((v: any) => jt.displayStateOf(v));
  const detach = heads.map((h: any) => jt.attachDisplay(h, sdkObserve));
  for (let i = 0; i < 5; i++) await settle();
  const roots = heads.map((h: any) => snap(jt.displayStateOf(h).root));
  detach.forEach((d: any) => d());
  return { values, roots };
}

const SCENARIOS: [string, (e4Path: string) => Promise<void>][] = [
  ["Notebook Kit cells survive export -> load -> export -> load", async (e4Path) => {
    const exporter4 = await exporterFor(e4Path);
    const src = await sourceModule();
    const before = fingerprint(src);
    const heads = before.filter((f) => f.cell).length;
    expect(heads).toBe(SOURCES.length);
    const want = await observed(src);
    expect(want.values).toEqual({ n: 3, a: 6, b: "x", k: 3, after: "6:3" });
    expect(want.roots[1].join("\n")).toContain("twice that is 6");

    const first = await exporter4(src);
    expect(first).toContain("$nk(");
    expect(first).toContain('main.define("module @tomlarkworthy/js-toolchain"');
    const load1 = await load(first);
    await converted(load1, heads);
    expect(fingerprint(load1)).toEqual(before);
    expect(await observed(load1)).toEqual(want);

    const second = await exporter4(load1);
    const load2 = await load(second);
    await converted(load2, heads);
    expect(fingerprint(load2)).toEqual(before);
    expect(await observed(load2)).toEqual(want);
    expect(await exporter4(load2)).toBe(second);
  }],
  ["a module without Notebook Kit cells exports exactly as exporter-3", async (e4Path) => {
    const exporter4 = await exporterFor(e4Path);
    const runtime = new Runtime();
    const module = runtime.module();
    module.variable().define("n", [], () => 3);
    module.variable().define(null, ["n"], (n: number) => n + 1);
    module.variable().define("viewof x", [], () => ({ value: 1 }));
    module.variable().define("x", ["Generators", "viewof x"], (G: any, _: any) => G.input(_));
    const e4 = await exporter4(module, "@test/classic");
    expect(e4).not.toContain("$nk");
    expect(e4).toBe(await exporter3(module, "@test/classic"));
  }]
];

describe("exporter-4", () => {
  for (const [label, run] of SCENARIOS) test(label, () => run(E4), 30000);
});

// Mutation controls: each deliberate break must fail at least one scenario.
const MUTANTS: [string, string, string][] = [
  ["exported variables written as classic cells", ...(process.env.EXPORTER
    ? ["(variables, states) => new Set(variables.flatMap(v => (states?.get(v) ?? displayStateOf(v))?.variables.slice(1) ?? []))", "(variables, states) => new Set()"]
    : ["variables => new Set(variables.flatMap(v => displayStateOf(v)?.variables.slice(1) ?? []))", "variables => new Set()"]) as [string, string]],
  ["exported variables not handed to $nk", "JSON.stringify(state.variables.slice(1).map(e => [pid(e), e._name]))", "'[]'"],
  ["head pid not restored", "    head.pid = pid;\n", "    void pid;\n"],
  ["exported variable pids not restored", "extra.pid = extraPid;", "void extraPid;"],
  ["defineCell given fresh variables", "defineCell(main, definition, { variables });", "defineCell(main, definition);"],
  ["head written from its body function", "  if (state) {\n    const {body, ...definition} = state.definition;", "  if (false) {\n    const {body, ...definition} = state.definition;"],
  ["$nk helper written into every module", "${ nk ? nkHelper : '' }", "${ nkHelper }"]
];

describe("mutation controls", () => {
  const src = readFileSync(E4, "utf8");
  for (const [label, from, to] of MUTANTS)
    test(label, async () => {
      expect(src.split(from).length).toBe(2);
      const path = `${OUT}/${label.replace(/\W+/g, "-")}.js`;
      writeFileSync(path, src.replace(from, to));
      let failures = 0;
      for (const [, run] of SCENARIOS) await run(path).catch(() => failures++);
      expect(failures).toBeGreaterThan(0);
    }, 120000);
});
