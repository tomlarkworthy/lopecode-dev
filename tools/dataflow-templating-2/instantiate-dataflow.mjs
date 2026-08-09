// instantiateDataflow — cloneDataflow, but the instance lives in a sandbox Runtime.
//
// cloneDataflow defines its clones into the module it copied from, so every instance is a variable
// in the primary runtime. Seven unrelated modules carry a `dynamic ` name filter to keep those out
// of the exporter, the change history, the cell map and three cell lists. This instantiates into a
// separate Runtime instead, so there is nothing to filter.
//
// Import-free on purpose: `make-cells.mjs` lifts this file into notebook cells verbatim, so the
// Runtime constructor arrives as a factory argument rather than an import.

const SENTINELS = new Set(["invalidation", "visibility", "@variable"]);

const sanitize = (s) => String(s).replace(/[^\w$]/g, "_");

// A one-way live edge from a variable in the primary runtime into the sandbox. One per
// (module, name), shared by every instance that captures it, refcounted.
function makeBridge(originModule, name, uid) {
  const waiters = new Set();
  let state = { v: -1, s: "pending" };
  let seq = 0;

  const emit = (next) => {
    state = next;
    for (const w of waiters) w();
    waiters.clear();
  };

  const holder = originModule
    .variable({
      pending() {},
      fulfilled(value) {
        emit({ v: seq++, s: "ok", value });
      },
      rejected(error) {
        emit({ v: seq++, s: "err", error });
      }
    })
    // `dynamic ` prefix so the five existing corpus guards that test for it already exclude these.
    .define(`dynamic bridge ${sanitize(name)} ${uid}`, [name], (x) => x);

  const changed = () => new Promise((r) => waiters.add(r));

  // Yields only when the upstream value actually changes; re-yielding on every pull would spin the
  // runtime, which schedules the next `next()` immediately after each yield.
  async function* follow() {
    let seen = -1;
    for (;;) {
      while (state.v === seen || state.s === "pending") await changed();
      seen = state.v;
      if (state.s === "err") throw state.error;
      yield state.value;
    }
  }

  return {
    name,
    follow,
    refs: 0,
    variable: holder,
    destroy() {
      holder.delete();
      waiters.clear();
    }
  };
}

export function instantiateDataflowFactory(Runtime, options = {}) {
  const { builtins = {} } = options;

  let sandbox = null;
  const sandboxOf = () => sandbox || (sandbox = new Runtime(builtins));

  // module -> name -> bridge
  const bridges = new Map();
  // runtime._modules is keyed by the define function and only records runtime.module(define),
  // so anonymous instance modules never appear there — count them here instead.
  const live = new Set();
  let uidSeq = 0;
  const nextUid = () => `b${(uidSeq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  function acquire(originModule, name) {
    let byName = bridges.get(originModule);
    if (!byName) bridges.set(originModule, (byName = new Map()));
    let bridge = byName.get(name);
    if (!bridge) byName.set(name, (bridge = makeBridge(originModule, name, nextUid())));
    bridge.refs++;
    return bridge;
  }

  function release(originModule, bridge) {
    if (--bridge.refs > 0) return;
    const byName = bridges.get(originModule);
    if (byName) byName.delete(bridge.name);
    bridge.destroy();
  }

  /**
   * variables  Variable[]   the template, exactly as cloneDataflow takes it
   * options
   *   params     {name: value}      injected; shadows a template variable of the same name
   *   observers  (name) => observer same shape as cloneDataflow's observerFactory
   *   watch      (cb) => unsub      fires when upstream code may have changed (pass observeSet)
   */
  function instantiateDataflow(variables, opts = {}) {
    if (!variables || !variables.length) throw new Error("instantiateDataflow: no variables");
    const { params = {}, observers = () => ({}), watch = null } = opts;

    const originModule = variables[0]._module;
    const templateNames = new Set(variables.map((v) => v._name));
    const paramNames = new Set(Object.keys(params));
    const mod = sandboxOf().module();
    live.add(mod);

    const diagnostics = [];
    for (const v of variables) {
      if (v._module !== originModule)
        diagnostics.push({ code: "warn/mixed-modules", name: v._name });
      if (v._shadow && v._shadow.size)
        diagnostics.push({ code: "warn/shadowed", name: v._name });
    }

    const created = [];
    const held = [];

    for (const [name, value] of Object.entries(params))
      created.push(mod.variable().define(name, [], () => value));

    const captured = new Set();
    for (const v of variables) {
      if (paramNames.has(v._name)) continue;
      for (const i of v._inputs) {
        const n = i._name;
        if (typeof n !== "string") continue;
        if (templateNames.has(n) || paramNames.has(n) || SENTINELS.has(n)) continue;
        captured.add(n);
      }
    }
    for (const name of captured) {
      const bridge = acquire(originModule, name);
      held.push(bridge);
      created.push(mod.variable().define(name, [], () => bridge.follow()));
    }

    // The body, under its real names — no uid mangling, because the module is private.
    const body = new Map();
    for (const v of variables) {
      if (paramNames.has(v._name)) continue;
      const inputs = v._inputs.map((i) => i._name);
      const t = mod.variable(observers(v._name)).define(v._name, inputs, v._definition);
      body.set(v._name, t);
      created.push(t);
    }

    // Same trigger cloneDataflow uses: re-define a clone whose source definition changed.
    let unwatch = null;
    if (watch) {
      unwatch = watch(() => {
        for (const v of variables) {
          if (paramNames.has(v._name)) continue;
          const t = body.get(v._name);
          if (!t || v._definition === t._definition) continue;
          t.define(v._name, v._inputs.map((i) => i._name), v._definition);
        }
      });
    }

    let disposed = false;
    return {
      module: mod,
      variables: body,
      captures: [...captured],
      diagnostics,
      value: (name) => mod.value(name),
      observe(name, observer) {
        const v = mod.variable(observer).define(null, [name], (x) => x);
        created.push(v);
        return () => v.delete();
      },
      dispose() {
        if (disposed) return false;
        disposed = true;
        if (unwatch) try { unwatch(); } catch {}
        // Reverse order, then sweep. Deleting a variable that still has outputs does not free its
        // scope entry — variable.js:129-137 substitutes a fresh implicit variable so references
        // stay wired — so dependents must go first, and whatever survives is swept afterwards.
        for (let i = created.length - 1; i >= 0; i--) created[i].delete();
        created.length = 0;
        for (let guard = 0; guard < 8 && mod._scope.size; guard++)
          for (const v of [...mod._scope.values()]) v.delete();
        body.clear();
        live.delete(mod);
        for (const b of held) release(originModule, b);
        held.length = 0;
        return true;
      }
    };
  }

  instantiateDataflow.stats = () => {
    let total = 0;
    for (const byName of bridges.values()) total += byName.size;
    return { sandboxRuntime: sandbox, bridges: total, modules: live.size };
  };
  instantiateDataflow.destroy = () => {
    for (const [m, byName] of bridges) for (const b of byName.values()) b.destroy();
    bridges.clear();
    live.clear();
    if (sandbox) sandbox.dispose();
    sandbox = null;
  };

  return instantiateDataflow;
}

export default instantiateDataflowFactory;
