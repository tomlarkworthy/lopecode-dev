// Slim port of notebook-kit src/javascript/imports.ts — only the helpers the core
// parse/transpile path needs. Import *rewriting* (npm:/jsr:/observable: -> URLs) is
// added in a later task; see js-toolchain task list.
import {syntaxError} from "./syntaxError.js";
import {simple} from "./walk.js";

/** Throws a syntax error if any export declarations are found. */
export function checkExports(body, {input}) {
  function checkExport(child) {
    throw syntaxError("Unexpected token 'export'", child, input);
  }
  simple(body, {
    ExportAllDeclaration: checkExport,
    ExportNamedDeclaration: checkExport
  });
}

/** Returns true if the body includes an import declaration. */
export function hasImportDeclaration(body) {
  let has = false;
  simple(body, {
    ImportDeclaration() {
      has = true;
    }
  });
  return has;
}
