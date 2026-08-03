import {test, expect, describe} from "bun:test";
import {transpileJavaScript, detranspileJavaScript} from "./transpile.js";
import {compile, decompile} from "./compile.js";
import {
  trimNL, expressionCells, programCellsSingle, programCellsMulti,
  sideEffectCells, commentCells, adversarial, importsIdentity, observableImports
} from "./corpus.js";

// Each case must satisfy both invertability paths:
//   detranspile(transpile(src)) === trimNL(src)   [object form]
//   decompile(compile(src))     === trimNL(src)   [lopecode cell form]
function roundtrips(src) {
  const t = transpileJavaScript(src);
  expect(detranspileJavaScript(t)).toBe(trimNL(src));
  expect(decompile(compile(src))).toBe(trimNL(src));
}

const suites = {
  "expression cells (single output)": expressionCells,
  "program cells (one top-level declaration)": programCellsSingle,
  "program cells (multiple outputs)": programCellsMulti,
  "side-effect program cells (no output)": sideEffectCells,
  "comments are preserved": commentCells,
  "adversarial: parser/wrapper/projection edge cases": adversarial,
  "ES-module imports: identity round-trip": importsIdentity
};
for (const [name, cases] of Object.entries(suites)) {
  describe(name, () => {
    for (const src of cases) test(JSON.stringify(src), () => roundtrips(src));
  });
}

describe("ES-module imports: idempotent (canonicalised, not identity)", () => {
  // namespace import canonicalises to a dynamic import; stable on re-compile.
  const idem = (src) => {
    const d1 = decompile(compile(src));
    const d2 = decompile(compile(d1));
    expect(d2).toBe(d1);
  };
  test("namespace import -> dynamic import, then stable", () => {
    const d1 = decompile(compile(`import * as ns from "npm:d3"`));
    expect(d1).toBe(`const ns = await import("npm:d3")`);
    idem(`import * as ns from "npm:d3"`);
  });
  test("import below other code hoists to top, then stable", () => {
    idem(`const k = 1;\nimport {a} from "npm:d3"`);
  });
});

describe("genuine dynamic import in a program is preserved", () => {
  test("bare const = await import stays dynamic", () => {
    expect(decompile(compile(`const m = await import("npm:d3")`)))
      .toBe(`const m = await import("npm:d3")`);
  });
  test("await import value-expression cell stays an expression", () => {
    expect(decompile(compile(`await import("npm:d3")`))).toBe(`await import("npm:d3")`);
  });
});

describe("newline trim is the only normalization", () => {
  test("leading and trailing newline stripped once", () => {
    expect(decompile(compile(`\nconst x = 1\n`))).toBe(`const x = 1`);
  });
});

describe("reactive Observable imports (kind B): compile/decompile identity", () => {
  for (const src of observableImports) {
    test(JSON.stringify(src), () => expect(decompile(compile(src))).toBe(trimNL(src)));
  }
  test("bare @user/nb canonicalises to observable: then is stable", () => {
    const d1 = decompile(compile(`import {foo} from "@user/nb"`));
    expect(d1).toBe(`import {foo} from "observable:@user/nb"`);
    expect(decompile(compile(d1))).toBe(d1);
  });
  test("compile produces a module loader + one @variable/v.import cell per binding", () => {
    const cells = compile(`import {foo, bar as baz} from "observable:@user/nb"`);
    expect(cells.map((c) => c._name)).toEqual(["module @user/nb", "foo", "baz"]);
    expect(cells[1]._inputs).toEqual(["module @user/nb", "@variable"]);
    expect(cells[2]._definition).toBe(`(_, v) => v.import("bar", _)`);
  });
  test("viewof imports dedollar to runtime names", () => {
    const cells = compile(`import {viewof$chart} from "observable:@user/nb"`);
    expect(cells[1]._name).toBe("viewof chart");
    expect(cells[1]._definition).toBe(`(_, v) => v.import("viewof chart", _)`);
  });
});

describe("ts mode is intentionally unsupported in-browser", () => {
  test("compile rejects mode:ts with a clear message", () => {
    expect(() => compile(`const x = 1`, {mode: "ts"})).toThrow(/not supported in-browser/);
  });
  test("default mode is js and still works", () => {
    expect(decompile(compile(`const x = 1`))).toBe(`const x = 1`);
    expect(decompile(compile(`const x = 1`, {mode: "js"}))).toBe(`const x = 1`);
  });
});

describe("compile cell shape", () => {
  test("expression -> single anonymous cell", () => {
    const cells = compile(`1 + 1`);
    expect(cells.length).toBe(1);
    expect(cells[0]._name).toBe(null);
  });
  test("two declarations -> holder + 2 projections", () => {
    const cells = compile(`const a = 1;\nconst b = 2`, {id: 7});
    expect(cells.length).toBe(3);
    expect(cells[0]._name).toBe(`cell 7`);
    expect(cells.slice(1).map((c) => c._name)).toEqual(["a", "b"]);
    expect(cells[1]._inputs).toEqual([`cell 7`]);
  });
});
