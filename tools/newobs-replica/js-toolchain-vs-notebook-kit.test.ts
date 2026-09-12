// E6/E7: does js-toolchain agree with notebook-kit, and can it invert the fixture's js cells?
//
// tools/js-toolchain/transpile.js says it is a PORT of notebook-kit src/javascript/transpile.ts.
// A port is a claim, and until now the two had never been run side by side — the prototype suite
// tests the port against itself. Here both implementations are in one process: the vendored 2.5.6
// source and the prototype, over the same inputs.
//
// Scope: js-toolchain compiles js-mode cells, so only the fixture's js nodes are in scope
// (11, 12, 13, 14, 15, 32). The ojs nodes belong to observablejs-toolchain.
//
// Definition TEXT is deliberately not compared. js-toolchain emits the quoted projection
// `exports["a"]` (compile.js:35) while notebook-kit's runtime closes over `o` (define.ts:91) — a
// known, already-recorded difference. Names, inputs and outputs are the meaningful surface.
//
// run: bun test tools/newobs-replica/js-toolchain-vs-notebook-kit.test.ts
import { expect, test, describe } from "bun:test";
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { compile, decompile } from "../js-toolchain/compile.js";
import { transpileJavaScript as portTranspile } from "../js-toolchain/transpile.js";
import { transpileJavaScript as kitTranspile } from "../../vendor/notebook-kit/src/javascript/transpile.ts";
import { define } from "../../vendor/notebook-kit/src/runtime/define.ts";

const window = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment"]) {
  (globalThis as any)[k] = (window as any)[k];
}
(globalThis as any).document = window.document;

const trimNL = (s: string) => s.replace(/^\n/, "").replace(/\n$/, "");

// The js-mode nodes of @tomlarkworthy/notebook-kit-semantics, verbatim.
const fixtureJs = [
  { id: 11, value: "const a = 1, b = 2;" },
  { id: 12, value: "const {p, r} = ({p: 1, r: 2});" },
  { id: 13, value: "let m = 0;" },
  { id: 14, value: "const one = 1, two = 2, three = 3;" },
  { id: 15, value: "1 + 1" },
  { id: 32, value: 'const fromOjs = x + "!";' }
];

describe("the fixture's js cells round-trip through js-toolchain", () => {
  // Three shapes here are absent from tools/js-toolchain/corpus.js: a single statement with
  // SEVERAL declarators (the corpus's multi cases are separate statements), trailing semicolons
  // (the corpus almost always omits them), and destructuring from a parenthesized object literal.
  for (const { id, value } of fixtureJs) {
    test(JSON.stringify(value), () => {
      expect(decompile(compile(value, { id }))).toBe(trimNL(value));
    });
  }
});

describe("js-toolchain's transpile agrees with notebook-kit 2.5.6's", () => {
  for (const { id, value } of fixtureJs) {
    test(JSON.stringify(value), () => {
      const port = portTranspile(value);
      const kit = kitTranspile(value, { id });
      // No `?? []` here: a fallback would compare [] to [] and pass vacuously if notebook-kit ever
      // stopped returning these. Measured 2026-09-12 — both are real arrays on all six nodes.
      expect(Array.isArray(kit.outputs)).toBe(true);
      expect(Array.isArray(kit.inputs)).toBe(true);
      expect(port.outputs).toEqual(kit.outputs);
      expect(port.inputs).toEqual(kit.inputs);
      // the wrapper text itself is the port's core claim
      expect(port.body).toBe(String(kit.body));
    });
  }
});

describe("compile()'s cell set matches the variables notebook-kit's define() creates", () => {
  // exporter-4's core claim: a notebook-kit cell hosted as lopecode cells is the same thing.
  const variablesFromKit = (source: string, id: number) => {
    const runtime = new Runtime();
    const main = runtime.module();
    const state = { root: document.createElement("div"), expanded: [], variables: [] };
    const definition = kitTranspile(source, { id });
    let body: any;
    eval("body = " + definition.body);
    define(main as any, state as any, { ...definition, id, body } as any);
    const names = state.variables.map((v: any) => (v._name == null ? null : String(v._name)));
    runtime.dispose?.();
    return names;
  };

  for (const { id, value } of fixtureJs) {
    test(JSON.stringify(value), () => {
      const mine = compile(value, { id }).map((c: any) => c._name);
      expect(mine).toEqual(variablesFromKit(value, id));
    });
  }
});

describe("what the port drops: derived metadata, not source", () => {
  // notebook-kit returns three fields the port has no equivalent for (transpile.ts:115-118):
  //   files / databases / secrets, each a Set built from the parse.
  // Careful: JSON.stringify(new Set([...])) is "{}" whatever the contents, so a probe that
  // stringifies them cannot tell full from empty. Spread them.
  const metadata = [
    ['const data = await FileAttachment("x.csv").csv();', "files", ["x.csv"]],
    ['const a = FileAttachment("one.json"); const b = FileAttachment("two.png");', "files", ["one.json", "two.png"]],
    ['const db = DatabaseClient("mydb");', "databases", ["mydb"]],
    ['const k = Secret("API_KEY");', "secrets", ["API_KEY"]]
  ] as const;

  for (const [src, field, expected] of metadata) {
    test(`${field}: ${JSON.stringify(src)}`, () => {
      const kit: any = kitTranspile(src, { id: 99 });
      expect([...kit[field]]).toEqual(expected as unknown as string[]);
      // the port has no such field at all
      expect((portTranspile(src) as any)[field]).toBeUndefined();
      // ...but the BODY is unaffected and the source still round-trips losslessly, so the
      // invertibility invariant holds. rewriteFileExpressions only rewrites under resolveFiles
      // (the Vite path), not under a bare transpile call.
      expect(portTranspile(src).body).toBe(String(kit.body));
      expect(decompile(compile(src, { id: 99 }))).toBe(src);
    });
  }

  test("the fixture's own js cells carry no such metadata", () => {
    for (const { id, value } of fixtureJs) {
      const kit: any = kitTranspile(value, { id });
      expect([...kit.files, ...kit.databases, ...kit.secrets]).toEqual([]);
    }
  });
});

describe("decompile inverts LIVE runtime cells (gap closed 2026-09-12)", () => {
  // `decompile(compile(src))` always passed, but editing reads the RUNTIME, and the two spellings
  // differ: define.ts:91 closes over the name, so a live projection reads `exports[o]`, while
  // compile() emits `exports["a"]`. decompile recognised only the quoted form and threw.
  // It now classifies projections STRUCTURALLY (acorn, via parse.js) and takes the name from the
  // variable's own _name — the only place a bare subscript carries it, since `o` is a closure
  // variable and no amount of regex widening could read a name out of it.
  // These were written as gap pins and inverted when the fix landed, exactly as they predicted.
  const liveCells = (source: string, id: number) => {
    const runtime = new Runtime();
    const main = runtime.module();
    const state = { root: document.createElement("div"), expanded: [], variables: [] };
    const definition = kitTranspile(source, { id });
    let body: any;
    eval("body = " + definition.body);
    define(main as any, state as any, { ...definition, id, body } as any);
    const cells = state.variables.map((v: any) => ({
      _name: v._name ?? null,
      _inputs: (v._inputs || []).map((i: any) => i._name),
      _definition: v._definition
    }));
    runtime.dispose?.();
    return { cells, outputs: definition.outputs ?? [] };
  };

  test("a live multi-output cell decompiles back to its source", () => {
    const { cells } = liveCells("const a = 1, b = 2;", 11);
    expect(cells.map((c) => c._name)).toEqual(["cell 11", "a", "b"]);
    // still the bare, closed-over spelling — asserted because it is what makes the inversion
    // below meaningful rather than a restatement of decompile(compile(src))
    expect(String(cells[1]._definition).replace(/\s+/g, " ")).toBe("(exports) => exports[o]");
    expect(decompile(cells)).toBe("const a = 1, b = 2;");
  });

  test("every multi-output js node in the fixture inverts from live", () => {
    // node 11 alone would not show whether the closure generalises. Three shapes: several
    // declarators, destructuring from a parenthesized object literal, and three outputs.
    for (const [src, id] of [
      ["const a = 1, b = 2;", 11],
      ["const {p, r} = ({p: 1, r: 2});", 12],
      ["const one = 1, two = 2, three = 3;", 14]
    ] as const) {
      const { cells } = liveCells(src, id);
      expect(decompile(cells)).toBe(src);
    }
  });

  test("control: a live cell with NO projections round-trips fine", () => {
    // isolates the cause to PROJECTION rather than to the live path in general
    const { cells } = liveCells("1 + 1", 15);
    expect(cells.length).toBe(1);
    expect(decompile(cells)).toBe("1 + 1");
  });

  test("why it works: output names are recoverable from _name, in order", () => {
    // Nothing can read a name out of `exports[o]`, and nothing needs to — the variable is named, and
    // the order matches, which detranspileJavaScript requires when it rebuilds `return {a,b};`.
    for (const [src, id] of [
      ["const a = 1, b = 2;", 11],
      ["const one = 1, two = 2, three = 3;", 14],
      ["const {p, r} = ({p: 1, r: 2});", 12]
    ] as const) {
      const { cells, outputs } = liveCells(src, id);
      const projected = cells
        .filter((c) => /^\(\w+\)\s*=>\s*\w+\[\w+\]$/.test(String(c._definition).replace(/\s+/g, " ")))
        .map((c) => c._name);
      expect(projected).toEqual(outputs);
    }
  });
});

describe("holder ids are a caller's choice, not a limitation", () => {
  // plan/exporter-4-notebook-kit-research.md lists "unique holder ids (the prototype defaults every
  // holder to `cell 1`)" as a known gap. compile(source, {id}) takes the id; the default is just a
  // default. Recorded here so the doc's gap list can be corrected.
  test("distinct ids produce distinct holders", () => {
    expect(compile("const a = 1, b = 2;", { id: 11 })[0]._name).toBe("cell 11");
    expect(compile("const one = 1;", { id: 14 })[0]._name).toBe("cell 14");
    expect(compile("const a = 1, b = 2;")[0]._name).toBe("cell 1"); // the default
  });
});
