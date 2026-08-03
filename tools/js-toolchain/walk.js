// Ported from notebook-kit src/javascript/walk.ts.
// Notebook Kit passes @observablehq/parser's walk base to support ViewExpression/
// MutableExpression (ojs) nodes. js-toolchain targets standard JS only, so we use
// acorn-walk's default base.
import {ancestor as _ancestor, recursive as _recursive, simple as _simple} from "acorn-walk";

export function ancestor(node, visitors) {
  return _ancestor(node, visitors);
}

export function recursive(node, state, functions) {
  return _recursive(node, state, functions);
}

export function simple(node, visitors) {
  return _simple(node, visitors);
}
