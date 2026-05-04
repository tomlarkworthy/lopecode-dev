/**
 * Regression test for parseVariableGroups in tools/lope-push-ws.js.
 *
 * Observable's compiler emits cell function definitions in two forms:
 *   const _N = function inner(...) { ... }
 *   function _N(...) { ... }                  (bare top-level)
 *
 * The parser must recognise both. See issue #18.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseVariableGroups } from "../../tools/lope-push-ws.js";

const constFormSource = `
const _title = function _title(md){return(
md\`# Hello\`
)};

const _greet = function _greet(name){return(
\`Hi \${name}\`
)};

const main = runtime.module();
main.variable(observer("title")).define("title", ["md"], _title);
main.variable(observer("greet")).define("greet", ["name"], _greet);
`;

const bareFormSource = `
function _title(md){return(
md\`# Hello\`
)}

function _greet(name){return(
\`Hi \${name}\`
)}

const main = runtime.module();
main.variable(observer("title")).define("title", ["md"], _title);
main.variable(observer("greet")).define("greet", ["name"], _greet);
`;

const mixedFormSource = `
const _title = function _title(md){return(
md\`# Hello\`
)};

function _greet(name){return(
\`Hi \${name}\`
)}

const main = runtime.module();
main.variable(observer("title")).define("title", ["md"], _title);
main.variable(observer("greet")).define("greet", ["name"], _greet);
`;

describe("parseVariableGroups: cell declaration forms", () => {
  it("recognises `const _N = function ...` form", () => {
    const { groups } = parseVariableGroups(constFormSource);
    const names = groups.flat().map(g => g._name);
    assert.deepEqual(names.sort(), ["greet", "title"]);
  });

  it("recognises bare `function _N(...)` form", () => {
    const { groups } = parseVariableGroups(bareFormSource);
    const names = groups.flat().map(g => g._name);
    assert.deepEqual(names.sort(), ["greet", "title"]);
  });

  it("recognises a mix of both forms in one module", () => {
    const { groups } = parseVariableGroups(mixedFormSource);
    const names = groups.flat().map(g => g._name);
    assert.deepEqual(names.sort(), ["greet", "title"]);
  });

  it("captures function bodies with both forms", () => {
    const { groups } = parseVariableGroups(bareFormSource);
    const greet = groups.flat().find(g => g._name === "greet");
    assert.ok(greet, "greet variable should be parsed");
    assert.match(greet._definition, /^function\s+_greet\s*\(/);
    assert.match(greet._definition, /Hi \$\{name\}/);
  });
});
