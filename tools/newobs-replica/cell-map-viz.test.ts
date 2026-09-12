// The renderer's derivation, driven through the REAL module (CLAUDE.md rule 17).
//
// Covered: flatten, variableToCell, edges, defaultFilter — all pure — plus a real cell-map-2 output
// fed end to end, because a renderer that cannot consume actual cellMap output is the failure that
// matters.
//
// NOT covered, and deliberately not faked:
//
//   buildHierarchy — needs d3 (`hierarchy`, `tree`). No d3 is installed in this repo (no `d3`, no
//     `d3-hierarchy`, nothing in package.json, and no other suite imports one). The alternatives were
//     to add a dependency to shared project state for a test, or to hand-write a d3 stub — which
//     would test my reimplementation of d3 against my reading of d3, the same "suite tests the tool
//     against itself" trap that hid four misclassifications in this module's history. So the function
//     is untested and says so, here and in the module's own status prose.
//
//   the Plot marks — `render` needs Plot and a DOM, neither of which resolves headlessly.
//
// @tomlarkworthy/visualizer has no tests of any kind to compare against, so this is a floor.
//
// run: bun test tools/newobs-replica/cell-map-viz.test.ts
import { expect, test, beforeAll, afterAll } from "bun:test";
import { importNotebookModule } from "../notebook-import.ts";

let viz: any;
let flatten: any;
let variableToCell: any;
let defaultFilter: any;
let edges: any;
let SYMBOLS: any;
let symbolDomain: any;

beforeAll(async () => {
  viz = await importNotebookModule("modules/@tomlarkworthy/cell-map-viz.js");
  flatten = await viz.value("flatten");
  variableToCell = await viz.value("variableToCell");
  defaultFilter = await viz.value("defaultFilter");
  edges = await viz.value("edges");
  SYMBOLS = await viz.value("SYMBOLS");
  symbolDomain = await viz.value("symbolDomain");
});

afterAll(() => viz?.dispose());

test("the d3-dependent cells stay unevaluated rather than breaking the module", async () => {
  // notebook-import resolves no cross-module imports and no builtins, so `buildHierarchy` (d3) and
  // `render` (Plot) cannot compute. They must fail in isolation, leaving the pure cells usable —
  // which is what makes the rest of this suite meaningful.
  expect(typeof flatten).toBe("function");
  await expect(viz.value("buildHierarchy")).rejects.toBeDefined();
});

test("flatten attaches a module name, and never overwrites the cell's own", () => {
  const modA = {};
  const rows = flatten(
    new Map([[modA, [{ name: "x", type: "simple", variables: [] }]]]),
    new Map([[modA, { name: "@u/a" }]])
  );
  expect(rows.length).toBe(1);
  expect(rows[0].module).toBe("@u/a");
  expect(rows[0].mod).toBe(modA);
  // cell-map-2 rows already carry `module`; the fallback must not clobber it
  const own = flatten(new Map([[modA, [{ name: "x", module: "@u/own", variables: [] }]]]), null);
  expect(own[0].module).toBe("@u/own");
  // no moduleNames and no own module -> a placeholder string, not undefined (it becomes an axis key)
  const bare = flatten(new Map([[modA, [{ name: "x", variables: [] }]]]), null);
  expect(typeof bare[0].module).toBe("string");
});

test("edges resolve both endpoints through the map and drop dangling ones", () => {
  const vA: any = { _name: "a", _inputs: [] };
  const vB: any = { _name: "b", _inputs: [vA] };
  const cellA = { name: "a", module: "m", variables: [vA] };
  const cellB = { name: "b", module: "m", variables: [vB] };
  const rows = [cellA, cellB];
  const links = edges(rows, variableToCell(rows), () => true);
  expect(links.length).toBe(1);
  expect(links[0][0]).toBe(cellB); // source is the consumer
  expect(links[0][1]).toBe(cellA); // target is the input

  // an input belonging to no cell must not yield a half-edge
  const vC: any = { _name: "c", _inputs: [{ _name: "orphan", _inputs: [] }] };
  const cellC = { name: "c", module: "m", variables: [vC] };
  expect(edges([cellC], variableToCell([cellC]), () => true).length).toBe(0);
});

test("a filtered-out target removes the edge, not just the node", () => {
  // Otherwise the diagram draws an arrow into empty space.
  const vA: any = { _name: "a", _inputs: [] };
  const vB: any = { _name: "b", _inputs: [vA] };
  const cellA = { name: "a", module: "m", variables: [vA] };
  const cellB = { name: "b", module: "m", variables: [vB] };
  const rows = [cellA, cellB];
  const keepOnlyB = (c: any) => c.name === "b";
  expect(edges(rows, variableToCell(rows), keepOnlyB).length).toBe(0);
});

test("every cell type the grouping emits has a symbol, multi included", () => {
  // v1's domain is ["simple","mutable",undefined,"import"," ","viewof"] — no `multi`, so every
  // Notebook Kit multi-output holder drew as the unknown symbol.
  for (const t of ["simple", "viewof", "mutable", "import", "multi"]) expect(SYMBOLS[t]).toBeTruthy();
  expect(symbolDomain).toContain("multi");
});

test("the anonymous filter drops unnamed cells only when asked", () => {
  const anon = { name: 0, module: "m", variables: [] };
  const named = { name: "x", module: "m", variables: [] };
  expect(defaultFilter({ showAnon: true })(anon)).toBe(true);
  expect(defaultFilter({ showAnon: false })(anon)).toBe(false);
  expect(defaultFilter({ showAnon: false })(named)).toBe(true);
});

test("the builtin filter uses runtime identity, not a module-name string", () => {
  // v1 tested `v.module !== "builtin"` against the NAME field. cell-map-2 sets that to a resolved
  // module name, so the test never fires. This compares against the runtime's builtin module by
  // identity — and must still pass a cell whose chain is absent rather than guessing.
  const builtinModule: any = {};
  const rt: any = { _builtin: builtinModule };
  const ownModule: any = { _runtime: rt };
  const bridge: any = {
    _name: "md",
    _module: ownModule,
    _inputs: [{ _name: "md", _module: builtinModule }]
  };
  const ordinary: any = { _name: "x", _module: ownModule, _inputs: [] };

  const hide = defaultFilter({ showBuiltins: false });
  expect(hide({ name: "md", variables: [bridge] })).toBe(false);
  expect(hide({ name: "x", variables: [ordinary] })).toBe(true);
  expect(defaultFilter({ showBuiltins: true })({ name: "md", variables: [bridge] })).toBe(true);
  // a plain fixture with no runtime chain must not be mistaken for a builtin bridge
  expect(hide({ name: "y", variables: [{ _name: "y", _inputs: [] }] })).toBe(true);
  // nor must a cell with no variables at all
  expect(hide({ name: "z", variables: [] })).toBe(true);
});

test("a real cell-map-2 map flows through the whole derivation", async () => {
  // The integration that matters: actual grouping output, not a fixture shaped like it.
  const cm = await importNotebookModule("modules/@tomlarkworthy/cell-map-2.js");
  const groupCells = await cm.value("groupCells");
  const runtimeAccessors = await cm.value("runtimeAccessors");
  const vars = [...(cm.runtime as any)._variables].filter((v: any) => v._module === cm.module);
  const map = groupCells(vars, runtimeAccessors);

  const rows = flatten(map, null);
  expect(rows.length).toBeGreaterThan(0);
  const keep = defaultFilter({ showBuiltins: false, showAnon: true });
  const kept = rows.filter(keep);
  expect(kept.length).toBeGreaterThan(0);

  const links = edges(kept, variableToCell(rows), keep);
  // this module has real internal dependencies, so the graph must not be empty
  expect(links.length).toBeGreaterThan(0);
  for (const [source, target] of links) {
    expect(source).toBeDefined();
    expect(target).toBeDefined();
  }
  // every type present must be in the legend domain — catches a new grouping type arriving unhandled
  for (const c of kept) {
    expect(SYMBOLS[c.type] ?? "diamond").toBeTruthy();
    expect(symbolDomain.includes(c.type)).toBe(true);
  }
  cm.dispose();
});
