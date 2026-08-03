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

const PROJECTION = /^\((\w+)\)\s*=>\s*\1\[("(?:[^"\\]|\\.)*")\]$/;

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
    const m = def.match(PROJECTION);
    if (m && (c._inputs?.length ?? 0) === 1) projections.push(JSON.parse(m[2]));
    else others.push(c);
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
