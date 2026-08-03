// Port of notebook-kit src/javascript/transpile.ts (transpileJavaScript, js mode core),
// plus invertible ES-module import handling (see imports-rewrite.js).
//
// We extend the result object with `expression` and `async` flags (not present in
// notebook-kit's TranspiledJavaScript) so detranspile() can invert exactly without
// re-parsing.
import {parseJavaScript} from "./parse.js";
import {Sourcemap} from "./sourcemap.js";
import {rewriteImportDeclarations, derewriteImports} from "./imports-rewrite.js";

export function transpileJavaScript(input) {
  const cell = parseJavaScript(input);
  let async = cell.async;
  const inputs = Array.from(new Set(cell.references.map((r) => r.name)));
  const outputs = Array.from(new Set((cell.declarations ?? []).map((r) => r.name)));
  const output = new Sourcemap(input).trim();
  if (rewriteImportDeclarations(output, cell.body) > 0) async = true;
  if (cell.expression) output.insertLeft(0, `return (\n`);
  output.insertLeft(0, `${async ? "async " : ""}(${inputs}) => {\n`);
  if (outputs.length > 0) output.insertRight(input.length, `\nreturn {${outputs}};`);
  if (cell.expression) output.insertRight(input.length, `\n)`);
  output.insertRight(input.length, "\n}");
  const body = String(output);
  const autodisplay = cell.expression && !(inputs.includes("display") || inputs.includes("view"));
  return {body, inputs, outputs, autodisplay, expression: cell.expression, async};
}

// Inverse of transpileJavaScript. Reconstructs the exact wrapper text that
// transpileJavaScript inserted from {inputs, outputs, expression, async} and slices
// it off, recovering the (newline-trimmed) original source verbatim — including
// parentheses and comments.
export function detranspileJavaScript({body, inputs = [], outputs = [], expression, async}) {
  const head = `${async ? "async " : ""}(${inputs}) => {\n` + (expression ? `return (\n` : ``);
  let tail = `\n}`;
  if (outputs.length > 0) tail = `\nreturn {${outputs}};` + tail;
  else if (expression) tail = `\n)` + tail;
  if (!body.startsWith(head) || !body.endsWith(tail)) {
    throw new Error("js-toolchain: body does not match expected wrapper; cannot detranspile");
  }
  const inner = body.slice(head.length, body.length - tail.length);
  // Expression bodies never contain (rewritten) import declarations; only de-rewrite
  // program bodies so a genuine `await import(...)` value expression is left untouched.
  return expression ? inner : derewriteImports(inner);
}
