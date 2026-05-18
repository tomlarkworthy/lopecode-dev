/**
 * Regression test for extractCellName in tools/lope-push-ws.js.
 *
 * On Observable, a cell whose source starts with a `// ---` banner — e.g.
 * the lopepage-urls `convertToGoldenLayout` cell — must still match its
 * name so `--cells` replaces it in place. The earlier regex anchored at
 * source[0], so a leading comment caused extractCellName to return null
 * and the `--cells` push silently inserted a duplicate cell at the end
 * of the notebook (recovered manually via remove_node on the duplicate).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractCellName } from "../../tools/lope-push-ws.js";

describe("extractCellName", () => {
  it("returns null for null/empty sources", () => {
    assert.equal(extractCellName(null), null);
    assert.equal(extractCellName(""), null);
  });

  it("extracts `name = ...` form", () => {
    assert.equal(extractCellName("foo = 1"), "foo");
    assert.equal(extractCellName("convertToGoldenLayout = function () {}"), "convertToGoldenLayout");
  });

  it("extracts `viewof name = ...` and `mutable name = ...`", () => {
    assert.equal(extractCellName("viewof slider = Inputs.range([0, 100])"), "viewof slider");
    assert.equal(extractCellName("mutable counter = 0"), "mutable counter");
  });

  it("extracts `function name(...)` declarations", () => {
    assert.equal(extractCellName("function foo() { return 1; }"), "foo");
    assert.equal(extractCellName("async function bar() {}"), "bar");
  });

  it("extracts `class Name`", () => {
    assert.equal(extractCellName("class Widget extends HTMLElement {}"), "Widget");
  });

  it("returns the full source for imports", () => {
    const src = `import { md } from "@tomlarkworthy/notebook"`;
    assert.equal(extractCellName(src), src);
  });

  it("strips leading line comments before matching name", () => {
    const src = `// --- Conversion to Golden Layout Config ---
// Convert DSL AST into a Golden Layout–style config.
function convertToGoldenLayout(intermediate) {
  return null;
}`;
    assert.equal(extractCellName(src), "convertToGoldenLayout");
  });

  it("strips leading block comments before matching name", () => {
    const src = `/* hello
   world */
foo = 42`;
    assert.equal(extractCellName(src), "foo");
  });

  it("strips a mix of leading whitespace + comments", () => {
    const src = `
  // header
  /* inner */
  // more
  parseGoldenDSL = (dsl) => dsl
`;
    assert.equal(extractCellName(src), "parseGoldenDSL");
  });

  it("strips leading comments before import", () => {
    const src = `// imports below\nimport {md} from "@user/notebook"`;
    assert.equal(extractCellName(src), `import {md} from "@user/notebook"`);
  });
});
