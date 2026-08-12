// node:module — createRequire backed by the shared shim registry.
import { register, lookup } from "./registry.mjs";

function makeRequire() {
  const require = function (spec) {
    const m = lookup(spec);
    if (m !== undefined) return m;
    const err = new Error(`Cannot find module '${spec}' (browser-native has no such builtin)`);
    err.code = "MODULE_NOT_FOUND";
    throw err;
  };
  require.resolve = function (spec) {
    if (lookup(spec) !== undefined) return spec;
    const err = new Error(`Cannot find module '${spec}'`); err.code = "MODULE_NOT_FOUND"; throw err;
  };
  require.resolve.paths = () => null;
  require.cache = Object.create(null);
  require.extensions = Object.create(null);
  require.main = undefined;
  return require;
}

export function createRequire(_from) { return makeRequire(); }
export const builtinModules = ["fs", "path", "os", "crypto", "util", "stream", "events", "buffer", "process", "http", "https", "net", "tls", "zlib", "url", "async_hooks", "child_process", "readline", "module", "assert", "constants"];
export function isBuiltin(name) { const n = name.startsWith("node:") ? name.slice(5) : name; return lookup(n) !== undefined || builtinModules.includes(n); }
export class Module { constructor() {} }
Module.createRequire = createRequire;
Module.builtinModules = builtinModules;
Module.isBuiltin = isBuiltin;
Module._resolveFilename = (r) => r;

const mod = { createRequire, builtinModules, isBuiltin, Module, default: undefined };
register("module", mod);
export default Module;
export { Module as _Module };
