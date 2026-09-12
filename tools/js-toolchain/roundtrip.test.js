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

// The runtime spells projections differently from the compiler, and decompile only ever saw the
// compiler's spelling — the mirror image of the defect cell-map-2's GLUE had. Classification is
// structural (acorn), so both spellings are recognised; the NAME is what differs, since a bare
// subscript is a closure variable that carries no name at all.
describe("projection classification is structural, not textual", () => {
  const src = `const a = 1;\nconst b = 2`;

  test("the compiler's quoted form still round-trips", () => {
    expect(decompile(compile(src))).toBe(src);
  });

  test("a minified runtime projection (bare subscript) is recognised, named from _name", () => {
    const cells = compile(src, {id: 7});
    const runtime = cells.map((c, i) => (i === 0 ? c : {...c, _definition: `e => e[t]`}));
    expect(decompile(runtime)).toBe(src);
  });

  test("a whitespace-free quoted projection is recognised", () => {
    const cells = compile(src, {id: 7});
    const tight = cells.map((c, i) =>
      i === 0 ? c : {...c, _definition: `e=>e[${JSON.stringify(c._name)}]`}
    );
    expect(decompile(tight)).toBe(src);
  });

  test("a source cell that merely mimics a projection is not one", () => {
    expect(decompile(compile(`(exports) => exports["x"]`))).toBe(`(exports) => exports["x"]`);
  });

  test("a non-computed member access is not a projection", () => {
    const cells = compile(src, {id: 7});
    const dotted = cells.map((c, i) => (i === 0 ? c : {...c, _definition: `e => e.a`}));
    expect(() => decompile(dotted)).toThrow(/exactly one holder/);
  });

  test("a subscript on some OTHER object is not a projection", () => {
    const cells = compile(src, {id: 7});
    const other = cells.map((c, i) => (i === 0 ? c : {...c, _definition: `e => q["a"]`}));
    expect(() => decompile(other)).toThrow(/exactly one holder/);
  });

  test("a bare subscript with no _name errors clearly rather than guessing", () => {
    const cells = compile(src, {id: 7});
    const anon = cells.map((c, i) =>
      i === 0 ? c : {...c, _name: null, _definition: `e => e[t]`}
    );
    expect(() => decompile(anon)).toThrow(/cannot be named/);
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
