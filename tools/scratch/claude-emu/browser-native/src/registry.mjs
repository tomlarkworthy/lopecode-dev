// Shared synchronous module registry backing createRequire().
// Every node:* shim registers its module object here at import time.
// Since cli.js statically imports all 22 builtins, they are all registered
// before cli.js's body (and thus any require() call) runs.
export const reg = Object.create(null);

export function register(name, mod) {
  reg[name] = mod;
  return mod;
}

// Normalise "node:fs" and "fs" to the same key.
export function lookup(spec) {
  const key = spec.startsWith("node:") ? spec.slice(5) : spec;
  if (key in reg) return reg[key];
  // Aliases that share an implementation.
  if (key === "node:events" || key === "events") return reg["events"];
  return undefined;
}
