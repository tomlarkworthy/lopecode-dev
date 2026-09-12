// Exercises @tomlarkworthy/notebook-kit-semantics headlessly, against the REAL notebook-kit 2.5.6.
//
// The fixture's point is to produce genuine Notebook Kit variables, so a hand-rolled stand-in for
// `kit` would test nothing. `vendor/notebook-kit` is the actual source and bun imports its
// TypeScript directly, so `kit` here is the real transpiler and the real `define`.
//
// `define` MUST come from src/runtime/define.ts, not the package's runtime/index.ts: the latter
// exports `defaultNotebook.define.bind(defaultNotebook)`, a 3-arg function bound to notebook-kit's
// own main module, which would define every fixture cell into the wrong module.
//
// run: bun test tools/newobs-replica/nk-semantics.test.ts
import { expect, test, beforeAll, afterAll } from "bun:test";
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { importNotebookModule } from "../notebook-import.ts";
import { transpileJavaScript } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../vendor/notebook-kit/src/javascript/observable.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const kit = { transpileJavaScript, transpileObservable, define };

// A DOM is required, not a convenience. define.ts:71-73 calls clear(state) for every cell without
// autodisplay and clear() reads `state.root.childNodes` (display.ts:48); the ojs single-output cells
// DO set autodisplay, so observe().fulfilled runs display() -> isDisplayable(), which needs the
// `Element` and `Text` constructors as globals (display.ts:40). Detached nodes suffice throughout.
const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) {
  (globalThis as any)[k] = (window as any)[k];
}
(globalThis as any).document = window.document;

// Two error classes are EXPECTED here and are not failures of the fixture:
//   - "Inputs is not defined": nkFixtureRuntime is `new Runtime(() => ({}))`, which supplies no
//     builtins, so cell 22's VALUE errors. Its variables still exist, which is what is under test.
//   - ENOENT on api.observablehq.com/@tomlarkworthy/dependancy.js: no importmap and no lopecode
//     network interception headlessly. Again a resolution failure, not a shape failure.
const unexpected: string[] = [];
process.on("unhandledRejection", (e: any) => {
  const msg = String(e?.message ?? e);
  if (!/Inputs is not defined|dependancy\.js|ENOENT/.test(msg)) unexpected.push(msg.slice(0, 120));
});

// Stand-in for realize's FALLBACK branch only (runtime-sdk cannot load without an importmap).
// It is NOT evidence that the `<script type="module-shim">` path works — that is proven separately
// and differentially by tools/newobs-replica/realize-shim-page.mjs (2026-09-12: realize resolved an
// embedded module with 0 requests to a route-blocked api.observablehq.com, eval failed with 1).
// What this stand-in does preserve is the batching contract: one array in, same order out, which
// `define` relies on to name holders `cell <id>`.
let realizeCalls = 0;
const realizeFallback = async (sources: string[]) => {
  realizeCalls++;
  if (!Array.isArray(sources)) throw new Error("realize expects an array of sources");
  return sources.map((src) => {
    let f: any;
    eval("f = " + src);
    return f;
  });
};
const runtimeStub = { _global: () => undefined };

let m: any;
let names: string[];

beforeAll(async () => {
  // `kit`/`Runtime` as before; `realize`/`runtime` because buildNkFixture now depends on them and
  // their runtime-sdk loader is unresolvable headlessly. thisModule/tests are still never forced.
  m = await importNotebookModule("modules/@tomlarkworthy/notebook-kit-semantics.js", {
    overrides: { kit, Runtime, realize: realizeFallback, runtime: runtimeStub }
  });
  const fixture = await m.value("nkFixture");
  names = [...fixture.module._runtime._variables]
    .filter((v: any) => v._module === fixture.module)
    .map((v: any) => String(v._name));
});

afterAll(() => m?.dispose());

test("the fixture's own test cells pass against real notebook-kit", async () => {
  expect(await m.value("test_fixture_defines_every_node")).toMatch(/^ok/);
  expect(await m.value("test_multi_output_emits_holder_and_projections")).toBe("ok");
  expect(await m.value("test_dialects_interoperate")).toBe("ok");
});

test("14 document nodes become 34 runtime variables", async () => {
  const doc = await m.value("nkFixtureDoc");
  expect(doc.length).toBe(14);
  expect(names.length).toBe(34);
});

test("multi-output nodes emit a `cell <id>` holder named after the document node", () => {
  // define.ts:45 — `const vid = output ?? (outputs.length ? `cell ${id}` : null)`. The ids in
  // nkFixtureDoc are deliberately non-contiguous so a holder named after the wrong thing shows up.
  for (const want of ["cell 11", "a", "b", "cell 12", "p", "r", "cell 13", "m", "cell 14", "one", "two", "three"]) {
    expect(names).toContain(want);
  }
  // a bare expression cell (id 15, `1 + 1`) has neither output nor outputs, so vid is null
  expect(names.filter((n) => n === "null").length).toBe(1);
  // 1.0 single-output cells must NOT gain a holder
  expect(names).not.toContain("cell 21");
  expect(names).not.toContain("cell 24");
});

test("autoview and automutable emit the shapes cell-map-2 groups on", () => {
  // define.ts:76-88. autoview adds `view` from `viewof$view`; automutable emits FOUR variables, and
  // both the spaced and the `$` spelling of mutable are live at once — which is why groupCells has
  // to match /^(mutable|initial)[$ ]/ rather than either spelling alone.
  expect(names).toContain("viewof$view");
  expect(names).toContain("view");
  expect(names).toContain("mutable q"); // initial value, spaced (from the ojs transpiler's output)
  expect(names).toContain("cell 23"); // the Mutator holder
  expect(names).toContain("mutable$q"); // the mutator itself
  expect(names).toContain("q"); // the live value
});

test("three imports of ONE module stay three distinct cells", () => {
  // The cell-map defect this whole line of work exists to fix, now confirmed structurally: each
  // import node gets its own `cell <id>` holder plus one variable per imported symbol. Resolution
  // fails headlessly (no importmap) but the SHAPES are what grouping keys on.
  expect(names).toContain("cell 41");
  expect(names).toContain("dep");
  expect(names).toContain("cell 42");
  expect(names).toContain("dep2");
  expect(names).toContain("viewdep");
  expect(names).toContain("viewof$viewdep");
  expect(names).toContain("cell 43");
  expect(names).toContain("mutabledep");
  expect(names).toContain("mutable$mutabledep");
  const holders = names.filter((n) => /^cell 4\d$/.test(n));
  expect(holders.sort()).toEqual(["cell 41", "cell 42", "cell 43"]);
});

test("no error classes beyond the two expected ones", () => {
  expect(unexpected).toEqual([]);
});

test("bodies are realized in ONE batched call, in node order", async () => {
  // realize injects a single <script type="module-shim"> per call on lopecode, so batching is the
  // point; and `define` names holders `cell <id>` positionally, so order must survive the round trip.
  expect(realizeCalls).toBe(1);
  const doc = await m.value("nkFixtureDoc");
  const buildNkFixture = await m.value("buildNkFixture");
  const Rt: any = Runtime;
  const seen: string[] = [];
  const ordered = async (sources: string[]) => {
    seen.push(...sources.map((s) => String(s).slice(0, 24)));
    return sources.map((src) => {
      let f: any;
      eval("f = " + src);
      return f;
    });
  };
  // exercise the {realize} injection point itself
  const mod = new Rt(() => ({})).module();
  const state = await buildNkFixture(mod, doc, { realize: ordered });
  expect(seen.length).toBe(doc.length);

  // TWO different counts, and conflating them is easy: `state.variables` is what define() PUSHED
  // (33), while a module census additionally contains the implicit `@variable` the runtime
  // materialises when resolving the import cells' `@variable` input (34). Measured: the difference
  // is exactly ["@variable"], with nothing present in state but absent from the census.
  const stateNames = state.variables.map((v: any) => (v._name == null ? "null" : String(v._name)));
  const census = [...(mod as any)._runtime._variables]
    .filter((v: any) => v._module === mod)
    .map((v: any) => (v._name == null ? "null" : String(v._name)));
  expect(stateNames.length).toBe(33);
  expect(census.length).toBe(34);
  expect(census.filter((n) => !stateNames.includes(n))).toEqual(["@variable"]);
  expect(stateNames.filter((n) => !census.includes(n))).toEqual([]);
});
