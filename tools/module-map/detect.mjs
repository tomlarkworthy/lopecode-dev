// Environment-agnostic import detection for @tomlarkworthy/module-map.
//
// The three runtimes module-map runs on all use @observablehq/runtime, but they
// represent notebook imports differently:
//
//   A) classic observablehq.com — statically bundles the whole import tree into
//      one compiled document; one Module per imported notebook (deduped at
//      compile time). Import declarations compile to a "module N" holder
//      variable (def calls importShim("/d/<id>@<ver>.js", ".../@ns/name.js"))
//      plus identity-defined alias variables.
//   B) new.observablehq.com — resolves each import as its own versioned fetch;
//      the SAME notebook can appear as several Modules (e.g. d/<id>@939,
//      d/<id>@950 and the @ns/slug). Same "module N" + identity-alias shape as A.
//   C) Notebook Kit (notebook-kit / older new builds) — compiles
//      `import {x} from "@u/nb" with {type:"observable"}` into a single cell whose
//      body calls __ojs_runtime.module(...) then main.variable().import("x", m).
//
// Common invariant across A/B/C: an imported alias is a Variable whose
// _definition === the runtime's `identity` and whose single input lives in the
// source module. That gives us universal *edge* detection. Naming and dedup are
// the environment-specific parts handled below.

/** Derive this runtime's `identity` definition (used for every import alias). */
export function deriveIdentity(runtime) {
  const a = runtime.module();
  const b = runtime.module();
  const s = b.variable().define("__module_map_probe__", [], () => 1);
  const imp = a.variable().import("__module_map_probe__", b);
  const id = imp._definition;
  imp.delete();
  s.delete();
  return id;
}

/**
 * Universal edge detection. Returns one entry per import-alias variable:
 * { host, source, local, remote } where host/source are Module objects.
 * Builtin imports are excluded. Works on environments A, B and C.
 */
export function detectImportEdges(runtime, identity = deriveIdentity(runtime)) {
  const builtin = runtime._builtin;
  const edges = [];
  for (const v of runtime._variables) {
    if (v._definition !== identity) continue;
    if (!v._inputs || v._inputs.length !== 1) continue;
    const source = v._inputs[0]._module;
    if (source === builtin || source === v._module) continue;
    edges.push({ host: v._module, source, local: v._name, remote: v._inputs[0]._name });
  }
  return edges;
}

/**
 * Parse a notebook reference out of a module-loader / kit-import definition
 * string. Recognises:
 *   importShim("/d/<id>@<ver>.js?v=4", "https://api.observablehq.com/@ns/name.js?v=4")
 *   import("/d/<id>@<ver>.js?v=4")
 *   import("https://api.observablehq.com/@ns/name.js?v=4")
 *   "d/<id>@<ver>" / "@ns/name" bare specifiers
 * Returns { id, slug, version, canonical, name } (fields null when absent).
 * `canonical` prefers the stable notebook id so slug/d-id/version variants of the
 * same notebook collapse together; `name` prefers the human slug for display.
 */
export function parseNotebookRef(defString) {
  const s = String(defString ?? "");
  const refs = [
    ...s.matchAll(/(?:importShim|import)\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*["'`]([^"'`]+)["'`])?/g)
  ].flatMap((m) => [m[1], m[2]]).filter(Boolean);
  const bare = [...s.matchAll(/["'`](d\/[0-9a-f]{16}(?:@\d+)?|@[\w-]+\/[\w-]+)["'`]/g)].map((m) => m[1]);
  const urls = refs.concat(bare);

  let id = null;
  let slug = null;
  let version = null;
  for (const u of urls) {
    const d =
      u.match(/\/d\/([0-9a-f]{16})(?:@(\d+))?/) ||
      u.match(/\/([0-9a-f]{16})(?:@(\d+))?\.js/) ||
      u.match(/(?:^|["'`])d?\/?([0-9a-f]{16})(?:@(\d+))?(?:$|["'`.?])/);
    if (d) {
      id = id || d[1];
      version = version || d[2] || null;
    }
    const sl = u.match(/(@[\w-]+\/[\w-]+)/);
    if (sl) slug = slug || sl[1];
  }
  const canonical = id || slug || null;
  const name = slug || (id ? `d/${id}${version ? "@" + version : ""}` : null);
  return { id, slug, version, canonical, name };
}

/**
 * Collapse nodes that refer to the same notebook (by `canonical`) into one,
 * unioning their dependency edges. `nodes` is an array of
 * { module, name, canonical, dependsOn:[], dependedBy:[] }. The `canonical` of
 * special nodes (main, builtin, bootloader) should be unique (e.g. the module
 * object itself) so they never merge. Returns a new array of merged nodes.
 */
export function dedupeNodes(nodes) {
  const byKey = new Map();
  for (const n of nodes) {
    const key = n.canonical ?? n.module ?? n.name;
    let merged = byKey.get(key);
    if (!merged) {
      merged = { ...n, dependsOn: [...(n.dependsOn || [])], dependedBy: [...(n.dependedBy || [])], modules: [n.module] };
      byKey.set(key, merged);
    } else {
      // prefer a slug display name over a d/<id> one
      if (/^@/.test(n.name || "") && !/^@/.test(merged.name || "")) merged.name = n.name;
      merged.dependsOn.push(...(n.dependsOn || []));
      merged.dependedBy.push(...(n.dependedBy || []));
      merged.modules.push(n.module);
    }
  }
  for (const m of byKey.values()) {
    m.dependsOn = [...new Set(m.dependsOn)].filter((x) => x !== m.name);
    m.dependedBy = [...new Set(m.dependedBy)].filter((x) => x !== m.name);
  }
  return [...byKey.values()];
}
