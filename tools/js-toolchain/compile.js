// compile(source) -> lopecode-style runtime cell array, and decompile(cells) -> source.
//
// A lopecode cell is {_name, _inputs, _definition}. For a Notebook Kit JS cell:
//   - expression / side-effect program (0 outputs): a single cell.
//   - program with N top-level declarations: 1 exports-holder cell named `cell <id>`
//     whose body returns {a,b,...}, plus N projection cells `(exports) => exports["a"]`,
//     mirroring notebook-kit src/runtime/define.ts.
//
// Invertability is the key invariant: decompile(compile(src)) === trimNewlines(src).
import {transpileJavaScript, detranspileJavaScript} from "./transpile.js";
import {compileObservableImports, decompileObservableImports} from "./observable-imports.js";
import {maybeParseJavaScript} from "./parse.js";

// A projection hands one output out of the holder's exports object. compile() emits the projected
// name as a string literal — `(exports) => exports["a"]` — but the live notebook-kit runtime spells
// the same shape with a bare subscript (`e => e[t]`, `exports[o2]`), where the name is a closure
// variable and is not recoverable from the source text at all. So match the STRUCTURE and read the
// name from the literal when there is one, else from the cell's own _name. A regex cannot do this:
// widening it would only recognise a shape whose key part is by then unreadable.
// Returns {name} (name null when the subscript is a bare identifier), or null if not a projection.
function projectionSubscript(def) {
  let parsed;
  try {
    parsed = maybeParseJavaScript(def);
  } catch {
    return null;
  }
  if (!parsed?.expression) return null;
  const fn = parsed.body;
  if (fn?.type !== "ArrowFunctionExpression") return null;
  if (fn.params.length !== 1 || fn.params[0].type !== "Identifier") return null;
  const body = fn.body;
  if (body?.type !== "MemberExpression" || !body.computed) return null;
  if (body.object?.type !== "Identifier" || body.object.name !== fn.params[0].name) return null;
  const key = body.property;
  if (key?.type === "Literal" && typeof key.value === "string") return {name: key.value};
  if (key?.type === "Identifier") return {name: null};
  return null;
}

// ts mode is intentionally not supported in-browser: type-stripping needs a TypeScript
// transpiler, and notebook-kit's own browser bundle stubs `typescript` out for the same
// reason (footprint). ts cells would also be lossy (decompile can only recover stripped
// js), so there is no invertible round-trip to offer. Author ts elsewhere; store js.
export function compile(source, {id = 1, mode = "js"} = {}) {
  if (mode !== "js") {
    throw new Error(
      `js-toolchain: mode "${mode}" is not supported in-browser; only "js". ` +
      `ts type-stripping is intentionally omitted (matches notebook-kit's browser bundle).`
    );
  }
  const obs = compileObservableImports(source, {id}); // import kind B: reactive notebook imports
  if (obs) return obs;
  const t = transpileJavaScript(source);
  if (t.outputs.length === 0) {
    return [{_name: null, _inputs: t.inputs, _definition: t.body}];
  }
  const holderName = `cell ${id}`;
  const cells = [{_name: holderName, _inputs: t.inputs, _definition: t.body}];
  for (const o of t.outputs) {
    cells.push({_name: o, _inputs: [holderName], _definition: `(exports) => exports[${JSON.stringify(o)}]`});
  }
  return cells;
}

export function decompile(cells) {
  if (!cells || cells.length === 0) throw new Error("js-toolchain: no cells to decompile");
  const obs = decompileObservableImports(cells); // import kind B: reactive notebook imports
  if (obs !== null) return obs;
  const projections = [];
  const others = [];
  for (const c of cells) {
    const def = typeof c._definition === "string" ? c._definition : String(c._definition);
    const p = (c._inputs?.length ?? 0) === 1 ? projectionSubscript(def) : null;
    if (p) {
      const name = p.name ?? (typeof c._name === "string" ? c._name : null);
      if (name === null) {
        throw new Error(
          "js-toolchain: projection cell has a bare subscript and no _name, so the projected " +
          "output cannot be named"
        );
      }
      projections.push(name);
    } else others.push(c);
  }
  if (others.length !== 1) {
    throw new Error(`js-toolchain: decompile expects exactly one holder cell, got ${others.length}`);
  }
  return reconstruct(others[0], projections);
}

function reconstruct(holder, outputs) {
  const inputs = holder._inputs ?? [];
  const body = typeof holder._definition === "string" ? holder._definition : String(holder._definition);
  const async = body.startsWith("async ");
  if (outputs.length > 0) {
    return detranspileJavaScript({body, inputs, outputs, expression: false, async});
  }
  // 0 outputs: expression cell (`return (...)`) or side-effect program (no return).
  try {
    return detranspileJavaScript({body, inputs, outputs: [], expression: true, async});
  } catch {
    return detranspileJavaScript({body, inputs, outputs: [], expression: false, async});
  }
}
