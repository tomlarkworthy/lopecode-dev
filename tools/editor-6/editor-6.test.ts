// editor-6, headless: compile_and_update and decompile routed by cellLanguage. js cells go through
// the real js-toolchain cells (transpileJavaScript, defineCell, decompile) with runtime-sdk's real
// realize and repositionSetElement; observablejs-toolchain is a stub that records its calls, so the
// routing is what is under test, not the classic compiler.
//
// run: bun test tools/editor-6/editor-6.test.ts
import { test, expect, beforeAll, describe } from "bun:test";
import { Runtime } from "@observablehq/runtime";
import * as acorn from "acorn";
import * as acorn_walk from "acorn-walk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";
import { nkRuntime, settle } from "../js-toolchain/runtime/display-scenarios.ts";
// observablejs-toolchain loads its parser from an attachment; the vendored copy stands in for routing
import * as parser from "../../vendor/notebook-kit/node_modules/@observablehq/parser";

const ED = "modules/@tomlarkworthy/editor-6.js";

let jt: any, sdkObserve: any, realize: any, repositionSetElement: any;

beforeAll(async () => {
  console.error = () => {};
  const jtm = await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime, acorn, acorn_walk } });
  jt = await jtm.values(["defineCell", "displayStateOf", "attachDisplay", "transpileJavaScript", "decompile"]);
  const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  sdkObserve = await sdk.value("observe");
  realize = await sdk.value("realize");
  repositionSetElement = await sdk.value("repositionSetElement");
});

async function setup(edPath: string) {
  const trt = new Runtime();
  const target = trt.module();
  let n = 1;
  const nVar = target.variable().define("n", [], () => n);
  const ojsCalls: string[] = [];
  const ed = await importNotebookModule(edPath, {
    overrides: {
      runtime: trt, realize, repositionSetElement,
      transpileJavaScript: jt.transpileJavaScript, decompileJs: jt.decompile, defineCell: jt.defineCell, displayStateOf: jt.displayStateOf,
      parser,
      compile: (source: string) => { ojsCalls.push("compile"); return OJS_COMPILED[source] ?? []; },
      decompileOjs: async () => { ojsCalls.push("decompile"); return "<ojs>"; }
    }
  });
  // one observed variable keeps these reachable: values() observes a cell only until it resolves, so an
  // unobserved pinOnCreate is recomputed into a new Set that compile_and_update never saw
  ed.module.variable(true).define("editorHandles", ["compile_and_update", "decompile", "cellLanguage", "pinOnCreate"],
    (compile_and_update, decompile, cellLanguage, pinOnCreate) => ({ compile_and_update, decompile, cellLanguage, pinOnCreate }));
  const { compile_and_update, decompile, cellLanguage, pinOnCreate } = await ed.module.value("editorHandles");
  const cellOf = (variables: any[], lang: string[], cells: any[] = []) => ({ module: { module: target, cells }, variables, lang });
  // a js cell defined the way notebook-kit would, not through editor-6
  const defineJs = async (source: string, id: number) => {
    const t = jt.transpileJavaScript(source);
    const [body] = await realize([t.body], trt);
    return jt.defineCell(target, { ...t, id, body });
  };
  return { trt, target, setN: (x: number) => { n = x; nVar.define("n", [], () => n); }, ojsCalls, compile_and_update, decompile, cellLanguage, pinOnCreate, cellOf, defineJs };
}

// what the stub classic compiler returns, in observablejs-toolchain's shape
const OJS_COMPILED: Record<string, any[]> = {
  "viewof foo = 1": [
    { _name: "viewof foo", _inputs: [], _definition: "() => 1" },
    { _name: "foo", _inputs: ["viewof foo"], _definition: "(v) => v + 1" }
  ],
  "x = 5": [{ _name: "x", _inputs: [], _definition: "() => 5" }]
};

const rootText = (head: any) => [...jt.displayStateOf(head).root.childNodes].map((c: any) => c.textContent);

const SCENARIOS: [string, (edPath: string) => Promise<void>][] = [
  ["a new cell in a js module is a js cell, filled into the caller's array, placed after its anchor", async (edPath) => {
    const s = await setup(edPath);
    const seed = await s.defineJs('display("seed");', 1);
    const later = s.target.variable().define("later", [], () => 0);
    const anchor = s.cellOf(seed, ["ojs", "js"], [{ lang: ["ojs", "js"], variables: seed }]);
    const newVars: any[] = [];
    const out = await s.compile_and_update("const x = n * 2;", newVars, anchor);
    expect(out).toBe("const x = n * 2;");
    expect(newVars.map((v) => v._name)).toEqual(["cell 2", "x"]);
    expect(newVars.every((v) => typeof v.pid === "string")).toBe(true);
    const order = [...s.trt._variables];
    expect(order.indexOf(newVars[0])).toBe(order.indexOf(seed.at(-1)) + 1);
    expect(order.indexOf(later)).toBeGreaterThan(order.indexOf(newVars.at(-1)));
    expect(await s.target.value("x")).toBe(2);
    expect(s.ojsCalls).toEqual([]);
  }],
  ["editing a js cell keeps its head, renders the new displays, and reads back the typed source", async (edPath) => {
    const s = await setup(edPath);
    const vars = await s.defineJs('display("a " + n);', 1);
    const head = vars[0];
    const detach = jt.attachDisplay(head, sdkObserve);
    await settle();
    expect(rootText(head).join("|")).toContain("a 1");
    const source = 'display("b " + n);\ndisplay("c");';
    const out = await s.compile_and_update(source, vars, s.cellOf(vars, ["ojs", "js"]));
    expect(out).toBe(source);
    expect(vars[0]).toBe(head);
    await settle();
    const text = rootText(head);
    expect(text.length).toBe(2);
    expect(text[0]).toContain("b 1");
    expect(text[1]).toContain("c");
    expect(await s.decompile(vars)).toBe(source);
    detach();
    expect(s.ojsCalls).toEqual([]);
  }],
  ["a multi-declaration js cell grows its projections in place", async (edPath) => {
    const s = await setup(edPath);
    const vars = await s.defineJs("const a = n, b = 2;", 4);
    const head = vars[0];
    const out = await s.compile_and_update("const a = n, b = 2, c = 3;", vars, s.cellOf(vars, ["js"]));
    expect(out).toBe("const a = n, b = 2, c = 3;");
    expect(vars[0]).toBe(head);
    expect(vars.map((v) => v._name)).toEqual(["cell 4", "a", "b", "c"]);
    expect(await s.target.value("c")).toBe(3);
  }],
  ["an ojs cell, and a new cell in an ojs-only module, go to observablejs-toolchain", async (edPath) => {
    const s = await setup(edPath);
    const plain = s.target.variable().define("p", [], () => 1);
    await s.compile_and_update("p = 2", [plain], s.cellOf([plain], ["ojs"]));
    expect(s.ojsCalls[0]).toBe("compile");
    s.ojsCalls.length = 0;
    await s.compile_and_update("{}", [], s.cellOf([plain], ["ojs"], [{ lang: ["ojs"], variables: [plain] }]));
    expect(s.ojsCalls[0]).toBe("compile");
    expect(await s.decompile([plain])).toBe("<ojs>");
    // an anonymous classic cell reads as both languages but has no display state
    expect(s.cellLanguage([plain], { lang: ["ojs", "js"] })).toBe("ojs");
    // a platform multi cell with no display state is still js by lang
    expect(s.cellLanguage([plain], { lang: ["js"] })).toBe("js");
  }],
  ["Observable JS typed into a new cell of a js module is a classic cell", async (edPath) => {
    const s = await setup(edPath);
    const seed = await s.defineJs('display("seed");', 1);
    const anchor = s.cellOf(seed, ["ojs", "js"], [{ lang: ["ojs", "js"], variables: seed }]);
    const viewofVars: any[] = [];
    await s.compile_and_update("viewof foo = 1", viewofVars, anchor);
    expect(s.ojsCalls).toEqual(["compile", "decompile"]);
    expect(viewofVars.map((v) => v._name)).toEqual(["viewof foo", "foo"]);
    expect(await s.target.value("foo")).toBe(2);
    // Notebook Kit's parser rejects `x = 5` as an assignment to an external variable
    const namedVars: any[] = [];
    await s.compile_and_update("x = 5", namedVars, s.cellOf(viewofVars, ["ojs"], [{ lang: ["ojs", "js"], variables: seed }]));
    expect(s.ojsCalls).toEqual(["compile", "decompile", "compile", "decompile"]);
    expect(namedVars.map((v) => v._name)).toEqual(["x"]);
  }],
  ["a js cell switched to Observable JS keeps its place and pid; its head, projections and shadows are deleted", async (edPath) => {
    const s = await setup(edPath);
    const first = await s.defineJs("const a = 1;", 1);
    const vars = await s.defineJs('display("b " + n);', 2);
    const third = s.target.variable().define("third", [], () => 3);
    const head = vars[0];
    const shadows = [...head._shadow.values()];
    expect(shadows.length).toBeGreaterThan(0);
    head.pid = "p-switch";
    const out = await s.compile_and_update("viewof foo = 1", vars, s.cellOf(vars, ["ojs", "js"]));
    expect(out).toBe("<ojs>");
    expect(vars.map((v) => v._name)).toEqual(["viewof foo", "foo"]);
    expect(vars[0].pid).toBe("p-switch");
    expect(s.pinOnCreate.has("p-switch")).toBe(true);
    const order = [...s.trt._variables];
    expect(order.includes(head)).toBe(false);
    for (const shadow of shadows) expect(order.includes(shadow)).toBe(false);
    expect(order.indexOf(vars[0])).toBe(order.indexOf(first.at(-1)) + 1);
    expect(order.indexOf(third)).toBeGreaterThan(order.indexOf(vars.at(-1)));
    expect(await s.target.value("foo")).toBe(2);
  }],
  ["a classic cell switched to js keeps its place and pid", async (edPath) => {
    const s = await setup(edPath);
    const before = s.target.variable().define("before", [], () => 0);
    const plain = s.target.variable().define("p", [], () => 1);
    const after = s.target.variable().define("after", [], () => 0);
    plain.pid = "p-classic";
    const vars = [plain];
    const out = await s.compile_and_update("const q = n + 1;", vars, s.cellOf(vars, ["ojs", "js"]));
    expect(out).toBe("const q = n + 1;");
    expect(vars.map((v) => v._name)).toEqual(["cell 1", "q"]);
    expect(vars[0].pid).toBe("p-classic");
    const order = [...s.trt._variables];
    expect(order.includes(plain)).toBe(false);
    expect(order.indexOf(vars[0])).toBe(order.indexOf(before) + 1);
    expect(order.indexOf(after)).toBeGreaterThan(order.indexOf(vars.at(-1)));
    expect(await s.target.value("q")).toBe(2);
    expect(s.ojsCalls).toEqual([]);
  }],
  ["source valid in both languages keeps a js cell js", async (edPath) => {
    const s = await setup(edPath);
    const vars = await s.defineJs('display("a");', 1);
    const head = vars[0];
    await s.compile_and_update("1 + 2", vars, s.cellOf(vars, ["ojs", "js"]));
    expect(vars[0]).toBe(head);
    expect(s.ojsCalls).toEqual([]);
  }]
];

describe("editor-6", () => {
  for (const [label, run] of SCENARIOS) test(label, () => run(ED));
});

// Mutation controls: each deliberate break must fail at least one scenario.
const MUTANTS: [string, string, string][] = [
  ["every cell routed to observablejs-toolchain", 'if (variables.length) return variables.some(plainJs) || onlyJs(cell?.lang) ? "js" : "ojs";', 'if (variables.length) return "ojs";'],
  ["variables not filled into the caller's array", "variables.splice(0, variables.length, ...next);", "void next;"],
  ["head input names read from _inputs", "_inputs: displayStateOf(v)?.definition?.inputs ?? v._inputs.map((i) => i._name),", "_inputs: v._inputs.map((i) => i._name),"],
  ["new cells always id 1", "id = max + 1;", "id = 1;"],
  ["the source's parse ignored", 'if (js !== ojs) return js ? "js" : "ojs";', "void js;"],
  ["shadows left behind on a switch", "const own = new Set(variables.flatMap((v) => [v, ...(v._shadow?.values() ?? [])]));", "const own = new Set(variables);"],
  ["pid not carried across a switch", "next[0].pid = pid;", "void pid;"]
];

describe("mutation controls", () => {
  const src = readFileSync(ED, "utf8");
  const dir = "tools/editor-6/.mutants";
  mkdirSync(dir, { recursive: true });
  for (const [label, from, to] of MUTANTS)
    test(label, async () => {
      expect(src.split(from).length).toBe(2);
      const path = `${dir}/${label.replace(/\W+/g, "-")}.js`;
      writeFileSync(path, src.replace(from, to));
      let failures = 0;
      for (const [, run] of SCENARIOS) await run(path).catch(() => failures++);
      expect(failures).toBeGreaterThan(0);
    }, 60000);
});
