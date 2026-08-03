// ES-module import handling for js-toolchain (import kind A).
//
// Static `import` declarations can't live inside a cell's function body, so compile
// rewrites them to leading `const <pattern> = await import(<specifier>)` lines. Unlike
// notebook-kit we keep the specifier VERBATIM (no npm:/jsr: resolution — that is the
// es-module-shims resolve hook's job), and emit one line per import (no Promise.all),
// so the transform is invertible. decompile reverses it.
//
// Round-trip fidelity:
//   named / default / default+named / side-effect imports  -> identity (modulo quote style)
//   namespace `import * as ns`                              -> canonicalised to `const ns = await import(...)`
//                                                             (equivalent; idempotent thereafter)
// Resolution of protocol specifiers is intentionally NOT handled here.
import {Parser} from "acorn";
import {acornOptions} from "./parse.js";
import {simple} from "./walk.js";

// COMPILE — mutates `output` (a Sourcemap). Returns the number of import decls rewritten.
export function rewriteImportDeclarations(output, body) {
  const decls = [];
  simple(body, {
    ImportDeclaration(node) {
      if (node.source.type === "Literal" && typeof node.source.value === "string") {
        decls.push(node);
      }
    }
  });
  if (decls.length === 0) return 0;
  const lines = [];
  for (const node of decls) {
    // delete the declaration in place, plus a trailing newline if present
    output.delete(node.start, node.end + (output.input[node.end] === "\n" ? 1 : 0));
    const spec = JSON.stringify(node.source.value);
    const pattern = bindingPattern(node);
    lines.push(pattern ? `const ${pattern} = await import(${spec});\n` : `await import(${spec});\n`);
  }
  output.insertLeft(0, lines.join("")); // hoist to the top of the body, in source order
  return decls.length;
}

function bindingPattern(node) {
  const named = [];
  let def = null;
  let ns = null;
  for (const s of node.specifiers) {
    if (s.type === "ImportDefaultSpecifier") def = s.local.name;
    else if (s.type === "ImportNamespaceSpecifier") ns = s.local.name;
    else {
      const imported = s.imported.type === "Identifier" ? s.imported.name : s.imported.value;
      named.push(imported === s.local.name ? imported : `${imported}: ${s.local.name}`);
    }
  }
  if (ns && !def && named.length === 0) return ns; // namespace-only -> bare identifier
  const props = [];
  if (def) props.push(`default: ${def}`);
  props.push(...named);
  return props.length ? `{${props.join(", ")}}` : null; // null -> side-effect import
}

// DECOMPILE — reverse leading const-await-import / await-import statements back to static
// `import` declarations. Conservative: only touches contiguous leading statements that
// match the generated shape, and never bare `const x = await import(...)` (left as a
// genuine dynamic import). Call only on program-cell inner source, never expressions.
export function derewriteImports(source) {
  if (!/\bawait\s+import\s*\(/.test(source)) return source;
  let program;
  try {
    program = Parser.parse(source, acornOptions);
  } catch {
    return source;
  }
  const imports = [];
  let consumed = 0;
  for (const stmt of program.body) {
    const text = matchImportStatement(stmt, source);
    if (text == null) break;
    imports.push(text);
    consumed = stmt.end;
  }
  if (imports.length === 0) return source;
  const rest = source.slice(consumed).replace(/^\n/, "");
  // Strip the trailing-newline artifact the generated import lines / hoist leave behind;
  // scoped to import cells, so the general (no-import) round-trip contract is untouched.
  return (imports.join("\n") + (rest ? "\n" + rest : "")).replace(/\n+$/, "");
}

function matchImportStatement(stmt, source) {
  // side-effect: `await import("x");`
  if (stmt.type === "ExpressionStatement") {
    const spec = awaitImportSpecifier(stmt.expression);
    return spec == null ? null : `import ${spec}`;
  }
  // bound: `const <pattern> = await import("x");`
  if (stmt.type !== "VariableDeclaration" || stmt.kind !== "const" || stmt.declarations.length !== 1) {
    return null;
  }
  const [d] = stmt.declarations;
  const spec = d.init && awaitImportSpecifier(d.init);
  if (spec == null) return null;
  if (d.id.type === "Identifier") {
    // namespace import canonicalised to a dynamic import; re-emit cleanly (consumes the
    // generated line's trailing artifact and stays idempotent).
    return `const ${d.id.name} = await import(${spec})`;
  }
  if (d.id.type !== "ObjectPattern") return null;
  const {def, named} = readPattern(d.id);
  if (def == null && named.length === 0) return null;
  const clause = [def, named.length ? `{${named.join(", ")}}` : null].filter(Boolean).join(", ");
  return `import ${clause} from ${spec}`;
}

function awaitImportSpecifier(node) {
  if (node?.type !== "AwaitExpression") return null;
  const arg = node.argument;
  if (arg?.type !== "ImportExpression") return null;
  if (arg.source?.type !== "Literal" || typeof arg.source.value !== "string") return null;
  return arg.source.raw; // preserve the literal's quote style
}

function readPattern(pattern) {
  let def = null;
  const named = [];
  for (const p of pattern.properties) {
    if (p.type !== "Property") continue;
    const key = p.key.type === "Identifier" ? p.key.name : p.key.value;
    const value = p.value.name;
    if (key === "default") def = value;
    else named.push(key === value ? key : `${key} as ${value}`);
  }
  return {def, named};
}
