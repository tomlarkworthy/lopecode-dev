// visualizer-2, headless: panes over a module holding classic cells and js-toolchain notebook-kit
// cells. Every import is the real cell from its own module — cell-map-2 cellMap, js-toolchain
// defineCell/attachDisplay, runtime-sdk observe/lookupVariable, dataflow-templating
// instantiateDataflowFactory — and the Inspector is the @observablehq/inspector 5.0.1 that
// notebook-kit vendors, the same version @tomlarkworthy/inspector embeds.
//
// run: bun test tools/visualizer-2/visualizer-2.test.ts
import { test, expect, beforeAll, describe } from "bun:test";
import { Runtime } from "@observablehq/runtime";
import { Inspector } from "../../vendor/notebook-kit/node_modules/@observablehq/inspector";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";
import { nkRuntime, transpile } from "../js-toolchain/runtime/display-scenarios.ts";

const VIZ = "modules/@tomlarkworthy/visualizer-2.js";

let jt: any, observe: any, lookupVariable: any, cellMap: any, factory: any;

beforeAll(async () => {
  console.error = () => {};
  const jtm = await importNotebookModule("modules/@tomlarkworthy/js-toolchain.js", { overrides: { nkRuntime } });
  jt = { defineCell: await jtm.value("defineCell"), displayStateOf: await jtm.value("displayStateOf"), attachDisplay: await jtm.value("attachDisplay") };
  const sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  observe = await sdk.value("observe");
  lookupVariable = await sdk.value("lookupVariable");
  cellMap = await (await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js", { overrides: { runtime: null } })).value("cellMap");
  factory = await (await importNotebookModule("modules/@tomlarkworthy/dataflow-templating.js")).value("instantiateDataflowFactory");
});

async function until(pred: () => boolean, label: string, ms: number) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`timed out: ${label}`);
    await new Promise((r) => setTimeout(r, 5));
  }
}

const managed = (root: Element) => [...root.children].filter((c) => c.classList.contains("observablehq")) as any[];

async function setup(vizPath: string) {
  const trt = new Runtime();
  const target = trt.module();
  const instantiateDataflow = factory(Runtime);
  const vm = await importNotebookModule(vizPath, {
    overrides: {
      Inspector, observe, lookupVariable, instantiateDataflow,
      attachDisplay: jt.attachDisplay, displayStateOf: jt.displayStateOf,
      onCodeChange: () => () => {}, navHref: (o: any) => `#${JSON.stringify(o)}`,
      liveCellMap: new Map(), main: null, runtime: null
    }
  });
  vm.module.redefine("visualizer2Module", [], () => vm.module);
  const extra: any[] = [];
  const publish = () => {
    const map = cellMap([...trt._variables], new Map([[target, { name: "@test/target" }]]));
    if (extra.length) map.set(target, [...(map.get(target) ?? []), ...extra]);
    vm.module.redefine("liveCellMap", [], () => map);
  };
  const visualizer = await vm.value("visualizer");
  const pane = (opts: any = {}) => {
    let dispose!: () => void;
    const invalidation = new Promise<void>((r) => (dispose = r));
    const el = visualizer(null, { invalidation, module: target, ...opts });
    return { el, root: el.firstChild as Element, dispose };
  };
  // `other` holds variables a scenario hands to the pane through `extra` without cellMap grouping them
  return { target, other: trt.module(), instantiateDataflow, publish, pane, extra };
}

function seed(s: Awaited<ReturnType<typeof setup>>) {
  const a = s.target.variable().define("a", [], () => 21);
  const b = s.target.variable().define("b", ["a"], (a: number) => a * 2);
  const nk = jt.defineCell(s.target, transpile({ id: 7, mode: "js", value: 'display("one " + b); display("two");' }));
  return { a, b, nk };
}

// A js cell with no declarations gets an unnamed variable (define.ts: `output ?? (outputs.length ?
// "cell id" : null)`), so it carries no `cell` attribute — as an anonymous classic cell does in v1.
const SCENARIOS: [string, (vizPath: string, ms: number) => Promise<void>][] = [
  ["draws classic and notebook-kit cells in cell-map order, with cell attributes and variable back-references", async (vizPath, ms) => {
    const s = await setup(vizPath);
    const { a, b, nk } = seed(s);
    s.publish();
    const p = s.pane();
    await until(() => managed(p.root).length === 3 && (jt.displayStateOf(nk[0]).root.textContent ?? "").includes("two"), "3 nodes rendered", ms);
    const nodes = managed(p.root);
    expect(nodes.map((n) => n.getAttribute("cell"))).toEqual(["a", "b", null]);
    expect(nodes.map((n) => n.variable)).toEqual([a, b, nk[0]]);
    // the notebook-kit node is the display root itself, holding both display() calls
    expect(nodes[2]).toBe(jt.displayStateOf(nk[0]).root);
    expect(nodes[2].childNodes.length).toBe(2);
    expect(nodes[2].childNodes[0].textContent).toContain("one 42");
    expect(nodes[2].childNodes[1].textContent).toContain("two");
    await until(() => nodes[0].textContent.includes("21"), "classic value inspected", ms);
    p.dispose();
  }],
  ["a cell added, redefined in place and deleted is added, updated in place and removed", async (vizPath, ms) => {
    const s = await setup(vizPath);
    const { nk } = seed(s);
    s.publish();
    const p = s.pane();
    await until(() => managed(p.root).length === 3, "initial", ms);
    const cellsBefore = s.instantiateDataflow.stats().modules;

    const c = s.target.variable().define("c", [], () => "sea");
    s.publish();
    await until(() => managed(p.root).length === 4, "added", ms);
    expect(managed(p.root).at(-1).getAttribute("cell")).toBe("c");
    expect(s.instantiateDataflow.stats().modules).toBe(cellsBefore + 1);

    const node = managed(p.root)[2];
    const redefined = jt.defineCell(s.target, transpile({ id: 7, mode: "js", value: 'display("uno");' }), { variables: nk });
    expect(redefined[0]).toBe(nk[0]);
    s.publish();
    await until(() => (node.textContent ?? "").includes("uno") && !(node.textContent ?? "").includes("two"), "redefined in place", ms);
    expect(managed(p.root)[2]).toBe(node);

    c.delete();
    s.publish();
    await until(() => managed(p.root).length === 3, "deleted", ms);
    expect(managed(p.root).map((n) => n.getAttribute("cell"))).toEqual(["a", "b", null]);
    await until(() => s.instantiateDataflow.stats().modules === cellsBefore, "cell instance disposed", ms);
    p.dispose();
  }],
  ["the filter, an import header, and the drawn variable of a classic and a notebook-kit mutable", async (vizPath, ms) => {
    const s = await setup(vizPath);
    const { a, nk } = seed(s);
    // notebook-kit automutable: the display state belongs to the `q` getter, which is not index 2
    const q = jt.defineCell(s.target, transpile({ id: 9, mode: "ojs", value: "mutable q = a * 10" }));
    const seedVar = s.other.variable().define("initial m", [], () => 1);
    const mutableVar = s.other.variable().define("mutable m", ["initial m"], (x: number) => x);
    const liveVar = s.other.variable().define("m", ["mutable m"], (x: number) => x);
    s.extra.push(
      { name: "m", type: "mutable", lang: ["ojs"], variables: [seedVar, mutableVar, liveVar] },
      { name: "y", type: "import", lang: ["ojs"], variables: [a], importInfo: { type: "import", specifier: "@a/b", notebook: "@a/b", from: "@a/b", specifiers: [{ imported: "x", local: "y" }] } }
    );
    s.publish();
    const p = s.pane({ filter: (name: string) => name !== "b" });
    await until(() => managed(p.root).length === 5, "5 nodes", ms);
    const nodes = managed(p.root);
    expect(nodes.map((n) => n.variable)).toEqual([a, nk[0], q[0], liveVar, a]);
    expect(nodes[2]).toBe(jt.displayStateOf(q[0]).root);
    expect(nodes[3].variable).toBe(liveVar);
    expect(nodes[4].classList.contains("lope-viz-import")).toBe(true);
    expect(nodes[4].textContent).toBe('import {x as y} from "@a/b"');
    p.dispose();
  }],
  ["two panes share one display root: the last attached holds it, and it stays attached until both go", async (vizPath, ms) => {
    const s = await setup(vizPath);
    const { nk } = seed(s);
    s.publish();
    const state = jt.displayStateOf(nk[0]);
    const p1 = s.pane();
    await until(() => managed(p1.root).length === 3, "pane 1", ms);
    const p2 = s.pane();
    await until(() => managed(p2.root).length === 3, "pane 2", ms);
    expect(state.root.parentNode).toBe(p2.root);
    expect(state.attached).toBe(2);
    p2.dispose();
    await until(() => state.attached === 1, "one pane left", ms);
    p1.dispose();
    await until(() => state.attached === 0, "detached", ms);
  }],
  ["disposing the pane disposes every instance and detaches its root", async (vizPath, ms) => {
    const s = await setup(vizPath);
    seed(s);
    s.publish();
    const p = s.pane();
    await until(() => managed(p.root).length === 3, "rendered", ms);
    expect(s.instantiateDataflow.stats().modules).toBe(4);
    p.dispose();
    await until(() => s.instantiateDataflow.stats().modules === 0, "all instances disposed", ms);
    expect(p.el.parentNode).toBe(null);
    expect(p.root.parentNode).toBe(null);
  }]
];

describe("visualizer-2", () => {
  for (const [label, run] of SCENARIOS) test(label, () => run(VIZ, 3000));
});

// Mutation controls: each deliberate break must fail at least one scenario.
const MUTANTS: [string, string, string][] = [
  ["cell observation never released", "invalidation.then(release);", "void release;"],
  ["notebook-kit cells drawn through the inspector", "const displayed = vars.find((v) => displayStateOf(v));", "const displayed = null;"],
  ["vanished cells kept", "if (seenVars.has(v)) continue;", "continue;"],
  ["pane disposal leaves cell instances", "for (const entry of state.cells.values()) entry.instance.dispose();", ""]
];

describe("mutation controls", () => {
  const src = readFileSync(VIZ, "utf8");
  const dir = "tools/visualizer-2/.mutants";
  mkdirSync(dir, { recursive: true });
  for (const [label, from, to] of MUTANTS)
    test(label, async () => {
      expect(src.split(from).length).toBe(2);
      const path = `${dir}/${label.replace(/\W+/g, "-")}.js`;
      writeFileSync(path, src.replace(from, to));
      let failures = 0;
      for (const [, run] of SCENARIOS) await run(path, 600).catch(() => failures++);
      expect(failures).toBeGreaterThan(0);
    }, 60000);
});
