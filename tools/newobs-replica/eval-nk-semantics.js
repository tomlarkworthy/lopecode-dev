// Dump every module's variables from a replica runtime, shaped like the live probe's vars-both.txt
// so the same variables->cells grouping validator runs against both.
// usage: EVAL=tools/newobs-replica/eval-nk-semantics.js bun tools/newobs-replica.ts <site> <page> dump
async (rt) => {
  if (!rt) return { error: "no __ojs_runtime" };
  const ids = new Map();
  ids.set(rt._builtin, "builtin");
  let n = 0;
  for (const v of rt._variables) if (!ids.has(v._module)) ids.set(v._module, "M" + ++n);
  const mid = (m) => ids.get(m) ?? "other";
  // The runtime marks unobserved variables with a `no_observer` SYMBOL, not false/null, so a bare
  // typeof cannot tell observed from unobserved. Name the sentinel instead.
  const obs = (v) => {
    const o = v._observer;
    if (typeof o === "symbol") return String(o.description ?? "symbol");
    if (o === false || o == null) return false;
    return typeof o === "object" ? "node" : typeof o;
  };
  const vars = [...rt._variables].map((v) => ({
    mod: mid(v._module),
    name: v._name === null || v._name === undefined ? null : String(v._name),
    type: v._type,
    obs: obs(v),
    inputs: (v._inputs ?? []).map((i) => (i._module === v._module ? String(i._name) : `${i._name}@${mid(i._module)}`)),
    outs: [...(v._outputs ?? [])].map((o) => `${o._name}@${mid(o._module)}`),
    // Import cells keep their full body: multi-import grouping needs the specifier enumeration
    // (`outputs.get("<local>")?.import(...)`), which runs well past any truncation.
    def: (() => {
      const s = String(v._definition).replace(/\s+/g, " ");
      return /_runtime\.module\(|__variable|t\.import\(/.test(s) ? s : s.slice(0, 300);
    })(),
  }));
  return {
    modules: [...ids.entries()].map(([m, id]) => ({
      id,
      builtins: [...(m._builtins?.keys?.() ?? [])],
      scope: [...(m._scope?.keys?.() ?? [])].map(String),
    })),
    counts: { variables: vars.length, modules: ids.size },
    vars,
  };
}
