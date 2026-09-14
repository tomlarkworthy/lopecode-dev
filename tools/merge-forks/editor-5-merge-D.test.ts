// merge D, headless: tools/editor-6/editor-6.test.ts pointed at the merged editor-5, read from the lopebooks canonical (lopebooks 25c445e3).
// Option B: js-toolchain is not overridden cell by cell; the real instance is reached through a `modules`
// map entry, as jsToolchain reads it. displayStateOf is the merged module's own registry cell.
// Decision 2: JavaScript-only source in a module with no Notebook Kit cell stays classic.
//
// run: bun test tools/merge-forks/editor-5-merge-D.test.ts
import { test, expect, beforeAll, describe } from "bun:test";
import { Runtime } from "@observablehq/runtime";
import * as acorn from "acorn";
import * as acorn_walk from "acorn-walk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";
import { nkRuntime, settle } from "../js-toolchain/runtime/display-scenarios.ts";
import * as parser from "../../vendor/notebook-kit/node_modules/@observablehq/parser";

const ED = "tools/merge-forks/.out/editor-5-merge-D.js";
mkdirSync("tools/merge-forks/.out", { recursive: true });
writeFileSync(ED, Bun.spawnSync(["bun", "tools/lope-reader.ts", "lopebooks/notebooks/@tomlarkworthy_editor-5.html", "--get-module", "@tomlarkworthy/editor-5"]).stdout);

let jt: any, jtm: any, sdkObserve: any, realize: any, repositionSetElement: any;

beforeAll(async () => {
  console.error = () => {};
  jtm = await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime, acorn, acorn_walk } });
  jt = await jtm.values(["defineCell", "displayStateOf", "attachDisplay", "transpileJavaScript", "decompile"]);
  const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  sdkObserve = await sdk.value("observe");
  realize = await sdk.value("realize");
  repositionSetElement = await sdk.value("repositionSetElement");
});

// the shape @tomlarkworthy/modules yields: module -> {name, title, module, variable}; reads are counted
const modulesMap = (loaded: boolean) => {
  const m: any = new Map(loaded ? [[jtm.module, { name: "@tomlarkworthy/js-toolchain", title: "js-toolchain", module: jtm.module }]] : []);
  m.reads = 0;
  const values = m.values.bind(m);
  m.values = () => { m.reads++; return values(); };
  return m;
};

async function setup(edPath: string, { loaded = true } = {}) {
  const trt = new Runtime();
  const target = trt.module();
  let n = 1;
  const nVar = target.variable().define("n", [], () => n);
  const ojsCalls: string[] = [];
  const modules = modulesMap(loaded);
  const ed = await importNotebookModule(edPath, {
    overrides: {
      runtime: trt, realize, repositionSetElement, modules, parser,
      compile: (source: string) => { ojsCalls.push("compile"); return OJS_COMPILED[source] ?? []; },
      decompileOjs: async () => { ojsCalls.push("decompile"); return "<ojs>"; }
    }
  });
  const handles = async () => {
    ed.module.variable(true).define("editorHandles", ["compile_and_update", "decompile", "cellLanguage", "pinOnCreate"],
      (compile_and_update, decompile, cellLanguage, pinOnCreate) => ({ compile_and_update, decompile, cellLanguage, pinOnCreate }));
    return ed.module.value("editorHandles");
  };
  const { compile_and_update, decompile, cellLanguage, pinOnCreate } = await handles();
  const cellOf = (variables: any[], lang: string[], cells: any[] = []) => ({ module: { module: target, cells }, variables, lang });
  const defineJs = async (source: string, id: number) => {
    const t = jt.transpileJavaScript(source);
    const [body] = await realize([t.body], trt);
    return jt.defineCell(target, { ...t, id, body });
  };
  return { trt, ed, target, modules, setN: (x: number) => { n = x; nVar.define("n", [], () => n); }, ojsCalls, compile_and_update, decompile, cellLanguage, pinOnCreate, cellOf, defineJs };
}

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
    expect(s.cellLanguage([plain], { lang: ["ojs", "js"] })).toBe("ojs");
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
  // decision 2 (replaces editor-6's "a classic cell switched to js keeps its place and pid")
  ["in a module with no Notebook Kit cell, JavaScript-only source stays classic and js-toolchain is not read", async (edPath) => {
    const s = await setup(edPath);
    const plain = s.target.variable().define("p", [], () => 1);
    plain.pid = "p-classic";
    const vars = [plain];
    await s.compile_and_update("const q = n + 1;", vars, s.cellOf(vars, ["ojs", "js"], [{ lang: ["ojs", "js"], variables: [plain] }]));
    expect(s.ojsCalls[0]).toBe("compile");
    expect(s.modules.reads).toBe(0);
    expect(s.target._scope.has("q")).toBe(false);
    expect([...s.trt._variables].some((v) => /^cell /.test(v._name ?? ""))).toBe(false);
  }],
  ["in a module that holds a Notebook Kit cell, a classic cell switched to js keeps its place and pid", async (edPath) => {
    const s = await setup(edPath);
    const seed = await s.defineJs('display("seed");', 1);
    const before = s.target.variable().define("before", [], () => 0);
    const plain = s.target.variable().define("p", [], () => 1);
    const after = s.target.variable().define("after", [], () => 0);
    plain.pid = "p-classic";
    const vars = [plain];
    const cells = [{ lang: ["ojs", "js"], variables: seed }, { lang: ["ojs", "js"], variables: [plain] }];
    const out = await s.compile_and_update("const q = n + 1;", vars, s.cellOf(vars, ["ojs", "js"], cells));
    expect(out).toBe("const q = n + 1;");
    expect(vars.map((v) => v._name)).toEqual(["cell 2", "q"]);
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
  }],
  // option B
  ["js-toolchain never loaded: classic edits and decompiles work, a new cell is classic, a js cell is not switched", async (edPath) => {
    const s = await setup(edPath, { loaded: false });
    const plain = s.target.variable().define("p", [], () => 1);
    await s.compile_and_update("p = 2", [plain], s.cellOf([plain], ["ojs"]));
    expect(await s.decompile([plain])).toBe("<ojs>");
    const seed = await s.defineJs('display("seed");', 1);
    const newVars: any[] = [];
    await s.compile_and_update("const y = 1;", newVars, s.cellOf(seed, ["ojs", "js"], [{ lang: ["ojs", "js"], variables: seed }]));
    expect(s.ojsCalls).toEqual(["compile", "decompile", "decompile", "compile", "decompile"]);
    expect(newVars.length).toBe(0);
    const head = seed[0];
    // defineJsCell throws (caught and logged by compile_and_update); the js cell is left as it was
    await s.compile_and_update("viewof foo = 1", seed, s.cellOf(seed, ["ojs", "js"]));
    expect(seed[0]).toBe(head);
    expect([...s.trt._variables].includes(head)).toBe(true);
    expect(s.ojsCalls.length).toBe(5);
    // decompile of a js cell falls back to the classic decompiler
    expect(await s.decompile([head])).toBe("<ojs>");
  }],
  ["js-toolchain loaded after editor-5 computed: the next modules map reaches compile_and_update", async (edPath) => {
    const s = await setup(edPath, { loaded: false });
    const seed = await s.defineJs('display("seed");', 1);
    const anchor = s.cellOf(seed, ["ojs", "js"], [{ lang: ["ojs", "js"], variables: seed }]);
    s.ed.module.redefine("modules", [], () => modulesMap(true));
    const fresh = await s.ed.module.value("editorHandles");
    const newVars: any[] = [];
    expect(await fresh.compile_and_update("const z = n + 3;", newVars, anchor)).toBe("const z = n + 3;");
    expect(newVars.map((v) => v._name)).toEqual(["cell 2", "z"]);
    // a handle captured before the new map still reads the old one
    const staleVars: any[] = [];
    await s.compile_and_update("const w = 1;", staleVars, anchor);
    expect(s.target._scope.has("w")).toBe(false);
  }]
];

describe("editor-5 (merge D)", () => {
  for (const [label, run] of SCENARIOS) test(label, () => run(ED));
});

const MUTANTS: [string, string, string][] = [
  ["every cell routed to observablejs-toolchain", 'if (variables.length) return variables.some(plainJs) || onlyJs(cell?.lang) ? "js" : "ojs";', 'if (variables.length) return "ojs";'],
  ["variables not filled into the caller's array", "variables.splice(0, variables.length, ...next);", "void next;"],
  ["head input names read from _inputs", "_inputs: displayStateOf(v)?.definition?.inputs ?? v._inputs.map((i) => i._name),", "_inputs: v._inputs.map((i) => i._name),"],
  ["new cells always id 1", "id = max + 1;", "id = 1;"],
  ["the source's parse ignored", 'if (js !== ojs) return js ? "js" : "ojs";', "void js;"],
  ["shadows left behind on a switch", "const own = new Set(variables.flatMap((v) => [v, ...(v._shadow?.values() ?? [])]));", "const own = new Set(variables);"],
  ["pid not carried across a switch", "next[0].pid = pid;", "void pid;"],
  // merge D
  ["decision 2 guard removed", 'if (cellLanguage(variables, cell) !== "js" && cellLanguage([], cell) !== "js") return "ojs";', "void 0;"],
  ["js-toolchain looked up under the wrong name", 'if (record.name === "@tomlarkworthy/js-toolchain") return', 'if (record.name === "@tomlarkworthy/js-toolchain-x") return'],
  ["a js cell switched to classic when js-toolchain is absent", 'if (!transpileJavaScript) return variables.length ? cellLanguage(variables, cell) : "ojs";', 'if (!transpileJavaScript) return "ojs";'],
  ["sourceLanguage not awaited", "const language = await sourceLanguage(source, variables, cell);", "const language = sourceLanguage(source, variables, cell);"],
  ["decompile without js-toolchain throws", "if (!decompileJs) return decompileOjs(variables);", "void 0;"]
];

describe("mutation controls", () => {
  const src = readFileSync(ED, "utf8");
  const dir = "tools/merge-forks/.out/D-mutants";
  mkdirSync(dir, { recursive: true });
  test("control: an unmutated copy written the same way fails no scenario", async () => {
    const path = `${dir}/control.js`;
    writeFileSync(path, src);
    let failures = 0;
    for (const [, run] of SCENARIOS) await run(path).catch(() => failures++);
    expect(failures).toBe(0);
  }, 60000);
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
