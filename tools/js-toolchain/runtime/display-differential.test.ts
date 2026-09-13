// Differential test of js-toolchain's defineCell against notebook-kit 2.5.6's own define.
//
// Reference arm: vendor/notebook-kit define with its observer at construction, one DefineState per
// cell as vite/observable.ts:222-240 builds them, `display` on for js cells only.
// Our arm: the shipped module cells (defineCell, attachDisplay) loaded through notebook-import, with
// notebook-kit's observer attached afterwards through runtime-sdk's real `observe`.
// Both arms share the same display/inspect code, so roots must be equal node for node.
//
// run: bun test tools/js-toolchain/runtime/display-differential.test.ts
import { test, expect, describe, beforeAll } from "bun:test";
import { Runtime } from "@observablehq/runtime";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { importNotebookModule } from "../../notebook-import.ts";
import { nkRuntime, settle, snap, transpile, makeGate, SCENARIOS, ATTACH, drive, referenceSnaps } from "./display-scenarios.ts";
import type { Node, Scenario } from "./display-scenarios.ts";

const MODULE = "modules/@tomlarkworthy/js-toolchain.js";

function ourArm(jt: any, sdkObserve: any, nodes: Node[]) {
  const rt = new Runtime();
  const m = rt.module();
  const g = makeGate();
  let n = 1;
  const nVar = m.variable().define("n", [], () => n);
  m.define("gate", [], () => g.gate);
  const heads = new Map<number, any>();
  const detachers = new Map<number, any>();
  const variables = new Map<number, any[]>();
  for (const node of nodes) {
    const vars = jt.defineCell(m, transpile(node));
    variables.set(node.id, vars);
    heads.set(node.id, vars[0]);
  }
  const roots = new Map<number, any>();
  for (const [id, v] of heads) roots.set(id, jt.displayStateOf(v).root);
  return {
    roots,
    variables,
    attach: () => {
      for (const [id, v] of heads) if (!detachers.get(id)) detachers.set(id, jt.attachDisplay(v, sdkObserve));
    },
    detach: () => { for (const [id, d] of detachers) { d?.(); detachers.delete(id); } },
    redefine: (node: Node) => { variables.set(node.id, jt.defineCell(m, transpile(node), { variables: variables.get(node.id) })); },
    setN: (x: number) => { n = x; nVar.define("n", [], () => n); },
    resolve: g.resolve,
    dispose: () => rt.dispose()
  };
}

async function ourSnaps(jt: any, sdkObserve: any, sc: Scenario, mode: (typeof ATTACH)[number]) {
  const arm = ourArm(jt, sdkObserve, sc.nodes);
  if (mode === "before first run") arm.attach();
  const out: string[][][] = [];
  const last = sc.steps.length - 1;
  await drive(arm, sc, () => out.push(sc.nodes.map((nd) => snap(arm.roots.get(nd.id)))), {
    afterStep: (i) => {
      if (mode === "after first run" && i === 0) arm.attach();
      if (mode === "after last step" && i === last) arm.attach();
      if (mode === "detached mid-run, re-attached") {
        if (i === 0) arm.attach();
        if (i === 0 && last > 0) arm.detach();
        if (i === last) arm.attach();
      }
    }
  });
  arm.dispose();
  return out;
}

let jt: any;
let sdk: any;
let sdkObserve: any;

beforeAll(async () => {
  console.error = () => {};
  jt = await importNotebookModule(MODULE, { overrides: { nkRuntime } });
  sdk = await importNotebookModule("modules/@tomlarkworthy/runtime-sdk.js", {
    overrides: { no_observer: Symbol("no-observer"), trace_variable: undefined, "mutable trace_history": { value: [] } }
  });
  sdkObserve = await sdk.value("observe");
  jt = { defineCell: await jt.value("defineCell"), displayStateOf: await jt.value("displayStateOf"), attachDisplay: await jt.value("attachDisplay") };
});

describe("null control: the reference arm agrees with itself", () => {
  for (const sc of SCENARIOS)
    test(sc.name, async () => {
      expect(await referenceSnaps(sc)).toEqual(await referenceSnaps(sc));
    });
});

describe("our arm equals notebook-kit once settled after attach", () => {
  for (const sc of SCENARIOS)
    for (const mode of ATTACH)
      test(`${sc.name} / attach ${mode}`, async () => {
        const ref = await referenceSnaps(sc);
        const ours = await ourSnaps(jt, sdkObserve, sc, mode);
        const last = sc.steps.length - 1;
        // Before attach there is no observer, so only steps at or after the attach point are comparable.
        const from = mode === "before first run" ? 0 : mode === "after first run" ? 0 : last;
        expect(ours.slice(from)).toEqual(ref.slice(from));
      });
});

test("attachDisplay attaches notebook-kit's observer once for two panes, and detaches on the last", async () => {
  const rt = new Runtime();
  const m = rt.module();
  m.define("n", [], () => 1);
  const [v] = jt.defineCell(m, transpile({ id: 1, mode: "js", value: "display(n);" }));
  let attaches = 0, cancels = 0;
  const spy = (variable: any, obs: any) => { attaches++; const c = sdkObserve(variable, obs); return () => { cancels++; c(); }; };
  const d1 = jt.attachDisplay(v, spy);
  const d2 = jt.attachDisplay(v, spy);
  await settle();
  expect([attaches, cancels]).toEqual([1, 0]);
  d1(); d1();
  expect(cancels).toBe(0);
  d2();
  expect([attaches, cancels]).toEqual([1, 1]);
  rt.dispose();
});

// Redefinition has no notebook-kit counterpart (vite/observable.ts only ever defines), so it is
// checked as a property: after redefining in place, the root equals a fresh reference define of the
// new source. Returns the number of mismatches so the mutation controls can reuse it.
const REDEFINES: [string, Node, Node][] = [
  ["display to display", { id: 1, mode: "js", value: 'display("old " + n);' }, { id: 1, mode: "js", value: 'display("new " + n); display("again");' }],
  ["display to an expression", { id: 1, mode: "js", value: 'display("old " + n);' }, { id: 1, mode: "js", value: "n + 100" }],
  // define.ts's display branch does not clear at define time; only autoclear in observe.fulfilled
  // removes the old output when the new body does not call display on its first run.
  ["display to a display it does not call", { id: 1, mode: "js", value: 'display("old " + n);' }, { id: 1, mode: "js", value: 'if (n > 5) display("big " + n);' }],
  ["expression to display", { id: 1, mode: "js", value: '"expr " + n' }, { id: 1, mode: "js", value: 'display("shown " + n);' }]
];

async function redefineMismatches(api: any) {
  let mismatches = 0;
  for (const [, before, after] of REDEFINES) {
    const arm = ourArm(api, sdkObserve, [before]);
    arm.attach();
    await settle();
    const head = arm.variables.get(1)![0];
    const root = arm.roots.get(1);
    arm.redefine(after);
    await settle();
    const ref = await referenceSnaps({ name: "fresh", nodes: [after], steps: [{}] });
    const same = arm.variables.get(1)![0] === head && api.displayStateOf(head).root === root;
    if (!same || JSON.stringify([snap(root)]) !== JSON.stringify(ref[0])) mismatches++;
    arm.dispose();
  }
  return mismatches;
}

describe("redefining in place keeps the head variable and its root, and renders like a fresh define", () => {
  for (const [label, before, after] of REDEFINES)
    test(label, async () => {
      const arm = ourArm(jt, sdkObserve, [before]);
      arm.attach();
      await settle();
      const head = arm.variables.get(1)![0];
      const root = arm.roots.get(1);
      arm.redefine(after);
      await settle();
      expect(arm.variables.get(1)![0]).toBe(head);
      expect(jt.displayStateOf(head).root).toBe(root);
      const ref = await referenceSnaps({ name: "fresh", nodes: [after], steps: [{}] });
      expect([snap(root)]).toEqual(ref[0]);
      arm.dispose();
    });
});

// Mutation controls: each deliberate break must make at least one comparison fail.
const MUTANTS: [string, string, string][] = [
  ["autoclear never set", "state.autoclear = true;", "state.autoclear = false;"],
  ["no clear on a new version", "else if (version > displayVersion) clear(state);", "else if (false) clear(state);"],
  ["no stale check", 'if (version < displayVersion) throw new Error("stale display");', "if (false) {}"],
  ["head built without shadows", "main.variable(undefined, { shadow: {} })", "main.variable()"]
];

describe("mutation controls", () => {
  const src = readFileSync(MODULE, "utf8");
  const dir = "tools/js-toolchain/runtime/.mutants";
  mkdirSync(dir, { recursive: true });
  for (const [label, from, to] of MUTANTS)
    test(label, async () => {
      expect(src.includes(from)).toBe(true);
      const path = `${dir}/${label.replace(/\W+/g, "-")}.js`;
      writeFileSync(path, src.replace(from, to));
      const mod = await importNotebookModule(path, { overrides: { nkRuntime } });
      const mjt = { defineCell: await mod.value("defineCell"), displayStateOf: await mod.value("displayStateOf"), attachDisplay: await mod.value("attachDisplay") };
      let mismatches = await redefineMismatches(mjt).catch(() => 1);
      for (const sc of SCENARIOS) {
        try {
          const ref = await referenceSnaps(sc);
          const ours = await ourSnaps(mjt, sdkObserve, sc, "before first run");
          if (JSON.stringify(ref) !== JSON.stringify(ours)) mismatches++;
        } catch {
          mismatches++;
        }
      }
      mod.dispose();
      expect(mismatches).toBeGreaterThan(0);
    });
});
