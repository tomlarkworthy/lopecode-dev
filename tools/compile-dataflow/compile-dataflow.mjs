// compileDataflow(variables, options) — compile a subgraph of an Observable runtime module
// into a plain JavaScript function. The static counterpart to `cloneDataflow`
// (@tomlarkworthy/dataflow-templating): instead of instantiating an isolated copy of the
// reactive graph, it emits straight-line code that runs the same computation once.
//
// Works on the LOW LEVEL runtime representation (Variable._name/_inputs/_definition), so
// `viewof`/`mutable`/multi-output cells need no special parsing, and Notebook 1 and
// Notebook Kit 2.0 modules compile through the same path.
//
// Self-contained: no imports, so the whole file can be pasted into one notebook cell.

function generatorish(value) {
  return value && typeof value.next === "function" && typeof value.return === "function";
}

const TYPE_IMPLICIT = 2;
const TYPE_DUPLICATE = 3;

const SENTINEL_NAMES = new Set(["invalidation", "visibility", "@variable"]);

const sanitize = (s) => String(s).replace(/[^\w$]/g, "_");

// ---------------------------------------------------------------------------
// Variable classification (works for both Observable 1.0 and Notebook Kit 2.0 shapes)
// ---------------------------------------------------------------------------

const nameOf = (v) => (v && v._name) || null;

// `mutable x` (1.0: inputs are [Mutable, initial x]) or `mutable$x` (2.0) — the settable handle.
function mutableAccessorTarget(v) {
  const n = nameOf(v);
  if (!n) return null;
  if (n.startsWith("mutable$")) return n.slice(8);
  if (n.startsWith("mutable ")) {
    const inputs = (v._inputs || []).map(nameOf);
    return inputs[0] === "Mutable" ? n.slice(8) : null; // 2.0 reuses "mutable x" for the INITIAL value
  }
  return null;
}

// A variable that cannot be recompiled: it is a cross-module import handle.
function importReason(v, module) {
  const inputs = v._inputs || [];
  for (const i of inputs) {
    const n = nameOf(i);
    if (n === "@variable") return "depends on the @variable sentinel (it redefines itself on import)";
    if (n && n.startsWith("module ")) return `imports from ${n.slice(7)}`;
    if (i._module && v._module && i._module !== v._module) return "is an import from another module";
  }
  if (module && v._module && v._module !== module) return "belongs to another module";
  return null;
}

// A shadow variable (Notebook Kit 2.0 `display`/`view`) is reachable through Variable._shadow but
// is not registered in module scope, so it has no stable identity to recompile against.
function isShadow(v) {
  const n = nameOf(v);
  if (!n) return false;
  const scope = v._module && v._module._scope;
  return !!scope && scope.get(n) !== v;
}

// Shadow variables carry no _name; the owning variable's _shadow map is the only place they are named.
function shadowNameOf(owner, v) {
  for (const [name, sv] of owner._shadow) if (sv === v) return name;
  return null;
}

// ---------------------------------------------------------------------------
// compileDataflow
// ---------------------------------------------------------------------------

/**
 * @param {Array|null} variables  the subgraph to compile (Variables or names). Pass null to walk
 *                                back from `outputs`, stopping at `inputs` and at the boundaries
 *                                listed under "captures" below.
 * @param {object} options
 *   module      {Module}   module used to resolve names (default: the first output's module)
 *   inputs      {string[]|Variable[]} boundary variables that become function parameters
 *   outputs     {string[]|Variable[]|Object} results; an object maps resultKey -> variable
 *   mode        {"once"|"stream"}  default "once"
 *   driver      {string|Variable}  in "stream" mode, the single generator cell to iterate
 *   bindViews   {boolean}  after building `viewof x`, assign the parameter `x` onto view.value
 *   snapshot    {boolean}  read captured (out-of-subgraph) values once at compile time instead of
 *                          on every call. Default false: captures stay live, like cloneDataflow's
 *                          un-cloned variables.
 *   name        {string}   name of the emitted function (debugging)
 * @returns {Function} async fn(args) -> {outputKey: value}; also fn.run/fn.source/fn.toSource/
 *                     fn.diagnostics/fn.body/fn.captures
 */
function compileOnce(variables, options = {}) {
  const {
    inputs: inputSpec = [],
    outputs: outputSpec = [],
    mode = "once",
    bindViews = false,
    snapshot = false,
    name = "compiledDataflow"
  } = options;

  const diagnostics = [];
  const note = (level, code, message, variable) =>
    diagnostics.push({ level, code, message, variable: nameOf(variable) });

  // ---- resolve names ------------------------------------------------------
  const outputEntries = normalizeOutputs(outputSpec);
  let module =
    options.module ||
    (outputEntries.length && typeof outputEntries[0][1] === "object" ? outputEntries[0][1]._module : null) ||
    (Array.isArray(variables) && variables.length && typeof variables[0] === "object" ? variables[0]._module : null);

  const resolve = (x) => {
    if (x && typeof x === "object" && "_inputs" in x) return x;
    if (typeof x !== "string") throw new TypeError(`compileDataflow: expected a Variable or name, got ${x}`);
    if (!module) throw new Error("compileDataflow: options.module is required to resolve names");
    const v = module._scope.get(x);
    if (!v) throw new Error(`compileDataflow: no variable named ${JSON.stringify(x)} in this module`);
    return v;
  };

  const outputs = outputEntries.map(([key, spec]) => [key, resolve(spec)]);
  if (!module && outputs.length) module = outputs[0][1]._module;

  const params = new Map(); // Variable -> parameter name
  for (const spec of arrify(inputSpec)) {
    const v = resolve(spec);
    params.set(v, typeof spec === "string" ? spec : nameOf(v) || `arg${params.size}`);
  }

  // ---- body set -----------------------------------------------------------
  function compilable(v) {
    if (SENTINEL_NAMES.has(nameOf(v))) return false;
    if (v._type === TYPE_IMPLICIT) return false;
    if (v._type === TYPE_DUPLICATE) return false;
    if (isShadow(v)) return false;
    if (importReason(v, module)) return false;
    return true;
  }

  // Does this variable's value vary with a parameter? Non-compilable variables terminate the walk:
  // we cannot re-run them, so their value cannot respond to our arguments either.
  const varies = new Map();
  function dependsOnParam(v, seen = new Set()) {
    if (params.has(v)) return true;
    if (varies.has(v)) return varies.get(v);
    if (seen.has(v)) return false;
    seen.add(v);
    const r = compilable(v) && (v._inputs || []).some((i) => dependsOnParam(i, seen));
    varies.set(v, r);
    return r;
  }

  // "params": recompile only what actually varies with an argument; everything else is captured
  // from the live runtime (the same split cloneDataflow makes between cloned and shared variables).
  // "all": recompile every compilable ancestor (notebook-distiller style, self-contained output).
  const frontier = options.frontier || (params.size ? "params" : "all");
  if (frontier !== "params" && frontier !== "all")
    throw new Error(`compileDataflow: unknown frontier ${JSON.stringify(frontier)}`);

  const body = new Set();
  if (variables) {
    for (const spec of variables) {
      const v = resolve(spec);
      if (!params.has(v)) body.add(v);
    }
  } else {
    const stack = outputs.map(([, v]) => v);
    while (stack.length) {
      const v = stack.pop();
      if (body.has(v) || params.has(v)) continue;
      if (!compilable(v)) continue; // becomes a capture
      if (frontier === "params" && !dependsOnParam(v)) continue; // constant w.r.t. the arguments
      body.add(v);
      for (const i of v._inputs || []) stack.push(i);
    }
  }

  for (const [key, v] of outputs) {
    if (body.has(v) || params.has(v)) continue;
    const why = explainIncompilable(v, module);
    note(
      why ? "error" : "info",
      why ? "output-not-compilable" : "output-captured",
      why
        ? `output ${JSON.stringify(key)} (${nameOf(v)}) cannot be recompiled: ${why}. It is read from the live runtime.`
        : `output ${JSON.stringify(key)} (${nameOf(v)}) does not depend on any parameter; it is read from the live runtime.`,
      v
    );
  }

  // Diagnose anything the caller explicitly listed but we cannot honour.
  for (const v of body) {
    if (v._type === TYPE_IMPLICIT)
      note("error", "implicit-variable", `${nameOf(v)} is referenced but never defined`, v);
    if (v._type === TYPE_DUPLICATE)
      note("error", "duplicate-definition", `${nameOf(v)} has multiple definitions`, v);
    const why = importReason(v, module);
    if (why) note("error", "import-variable", `${nameOf(v)} cannot be recompiled: it ${why}`, v);
    if (isShadow(v))
      note("error", "shadow-variable", `${nameOf(v)} is a per-cell shadow builtin (Notebook Kit display/view)`, v);
  }

  // ---- driver (stream mode) must be recompiled even if it is constant w.r.t. the arguments ----
  const driver = options.driver != null ? resolve(options.driver) : null;
  if (mode === "stream" && !driver)
    throw new Error('compileDataflow: mode "stream" requires options.driver (the generator cell to iterate)');
  if (driver && !variables && !body.has(driver)) {
    if (!compilable(driver))
      throw new Error(
        `compileDataflow: driver ${nameOf(driver)} cannot be recompiled: ${explainIncompilable(driver, module)}`
      );
    const stack = [driver];
    while (stack.length) {
      const v = stack.pop();
      if (body.has(v) || params.has(v) || !compilable(v)) continue;
      body.add(v);
      for (const i of v._inputs || []) stack.push(i);
    }
  }
  if (driver && !body.has(driver))
    throw new Error(`compileDataflow: driver ${nameOf(driver)} is not in the compiled subgraph`);

  // ---- ordering -----------------------------------------------------------
  // A mutable's writers must run before its readers for a single pass to land on the reactive
  // fixed point, so add a synthetic edge writer -> value-variable where that does not create a cycle.
  const extraEdges = mutableOrderingEdges(body, note);
  const order = topoSort(body, extraEdges);

  // ---- classify every input ----------------------------------------------
  const captureList = []; // Variables read from the live runtime
  const captureIndex = new Map();
  const captureOf = (v) => {
    if (!captureIndex.has(v)) {
      captureIndex.set(v, captureList.length);
      captureList.push(v);
    }
    return captureIndex.get(v);
  };

  const slot = new Map(); // body Variable -> JS identifier
  order.forEach((v, i) => slot.set(v, `$v${i}_${sanitize(nameOf(v) || "anon")}`));

  const paramNames = [...new Set([...params.values()])];

  // `owner` is the variable being emitted: Notebook Kit's per-cell `display`/`view` builtins live in
  // owner._shadow, are unnamed, and are bound to the ORIGINAL cell's DOM slot — so they are replaced
  // with compiler-provided implementations rather than captured.
  const ref = (v, owner) => {
    if (slot.has(v)) return slot.get(v);
    if (params.has(v)) return `$p_${sanitize(params.get(v))}`;
    const shadowName = owner && owner._shadow ? shadowNameOf(owner, v) : null;
    if (shadowName === "display" || shadowName === "view") return `$rt.${shadowName}`;
    if (shadowName)
      note("warn", "unknown-shadow", `shadow builtin "${shadowName}" is captured from the original cell`, owner);
    const n = nameOf(v);
    if (n === "invalidation") return "$rt.invalidation";
    if (n === "visibility") return "$rt.visibility";
    if (n === "@variable") return "undefined /* @variable is not available in compiled code */";
    return `$c[${captureOf(v)}]`;
  };

  // ---- semantic diagnostics ----------------------------------------------
  diagnoseThis(order, note);

  // ---- codegen ------------------------------------------------------------
  const lines = [];
  const emitCall = (v, i) => {
    const args = (v._inputs || []).map((inp) => ref(inp, v));
    const comment = `/* ${nameOf(v) || "(anonymous)"} */`;
    return { lhs: slot.get(v), call: `$rt.d[${i}].call(undefined${args.length ? ", " + args.join(", ") : ""})`, comment };
  };

  const defs = order.map((v) => v._definition);
  const defIndex = new Map(order.map((v, i) => [v, i]));

  for (const pn of paramNames) lines.push(`  const $p_${sanitize(pn)} = $rt.param($args, ${JSON.stringify(pn)});`);

  const returnObject = `{${outputs.map(([k, v]) => `${JSON.stringify(k)}: ${ref(v)}`).join(", ")}}`;

  if (mode === "once") {
    for (const v of order) {
      const { lhs, call, comment } = emitCall(v, defIndex.get(v));
      lines.push(`  const ${lhs} = await $rt.first(${call}, ${JSON.stringify(nameOf(v))}); ${comment}`);
      if (bindViews) lines.push(...bindLine(v, params, lhs));
    }
    lines.push(`  return ${returnObject};`);
  } else {
    // Split the order at the driver: everything downstream of it re-runs per yielded value.
    const downstream = descendantsWithin(driver, order);
    const before = order.filter((v) => v !== driver && !downstream.has(v));
    const after = order.filter((v) => downstream.has(v));
    for (const v of before) {
      const { lhs, call, comment } = emitCall(v, defIndex.get(v));
      lines.push(`  const ${lhs} = await $rt.first(${call}, ${JSON.stringify(nameOf(v))}); ${comment}`);
      if (bindViews) lines.push(...bindLine(v, params, lhs));
    }
    const d = emitCall(driver, defIndex.get(driver));
    lines.push(`  const $src = await ${d.call}; ${d.comment}`);
    lines.push(`  for await (const ${slot.get(driver)} of $rt.iterate($src)) {`);
    for (const v of after) {
      const { lhs, call, comment } = emitCall(v, defIndex.get(v));
      lines.push(`    const ${lhs} = await $rt.first(${call}, ${JSON.stringify(nameOf(v))}); ${comment}`);
    }
    lines.push(`    yield ${returnObject};`);
    lines.push(`  }`);
  }

  // captureList is only complete once ref() has seen every input
  diagnoseParamsShadowedByViews(params, body, captureList, note);
  diagnoseMutables(order, captureIndex, note);
  for (const v of captureList)
    if (!nameOf(v))
      note(
        "warn",
        "anonymous-capture",
        `an unnamed variable was captured. It has no name to look up, so it is read from its own promise and ` +
          `reflects whatever the runtime last computed — if the runtime never computed it, the value is undefined.`,
        v
      );

  const header = `${mode === "stream" ? "async function*" : "async function"} ${sanitize(name)}($args, $rt)`;
  const source = `${header} {\n  const $c = await $rt.captures();\n${lines.join("\n")}\n}`;

  const emitted = new Function(`return (${source});`)();

  // ---- runtime shim -------------------------------------------------------
  let snapshotted = null;
  const readCaptures = () =>
    snapshot
      ? (snapshotted ??= Promise.all(captureList.map(readVariable)))
      : Promise.all(captureList.map(readVariable));

  const makeCtx = () => {
    let invalidate;
    const invalidation = new Promise((r) => (invalidate = r));
    const truncated = [];
    const disposers = [];
    const displayed = [];
    const shadows = options.shadows || {};
    return {
      d: defs,
      invalidation,
      visibility: (value) => Promise.resolve(value),
      // Notebook Kit 2.0 per-cell builtins, headless. `display` collects instead of rendering into
      // the original cell; `view` returns the node's current value (no element-type coercion —
      // pass options.shadows.view for Inputs-style semantics).
      display: shadows.display || ((value) => (displayed.push(value), value)),
      view: shadows.view || ((node) => (displayed.push(node), node && node.value)),
      displayed,
      captures: readCaptures,
      param(args, key) {
        if (!args || !(key in args))
          throw new Error(`${name}: missing required argument ${JSON.stringify(key)}`);
        return args[key];
      },
      async first(value, label) {
        value = await value;
        if (!generatorish(value)) return value;
        truncated.push(label);
        try {
          const { done, value: first } = await value.next();
          return done ? undefined : await first;
        } finally {
          try {
            value.return();
          } catch {}
        }
      },
      async *iterate(value) {
        if (!generatorish(value)) return void (yield value);
        disposers.push(() => {
          try {
            value.return();
          } catch {}
        });
        while (true) {
          const { done, value: v } = await value.next();
          if (done) return;
          yield await v;
        }
      },
      bindView(view, args, key) {
        if (view && key in args) {
          try {
            view.value = args[key];
          } catch {}
        }
      },
      truncated,
      dispose() {
        invalidate();
        for (const d of disposers.splice(0)) d();
      }
    };
  };

  // Every call gets its own context, holding that call's `invalidation` promise and the disposers for
  // any generator it is draining. A context outlives the call — the widget it built is still on
  // screen — so it is released either by the caller (`run().dispose()`) or by fn.dispose() when the
  // whole compilation is superseded.
  const liveContexts = new Set();
  const track = () => {
    const ctx = makeCtx();
    liveContexts.add(ctx);
    const inner = ctx.dispose;
    ctx.dispose = () => {
      liveContexts.delete(ctx);
      inner();
    };
    return ctx;
  };

  const run = async (args = {}) => {
    const ctx = track();
    if (mode === "stream")
      return { iterator: emitted(args, ctx), truncated: ctx.truncated, displayed: ctx.displayed, dispose: ctx.dispose };
    const outputsValue = await emitted(args, ctx);
    return {
      outputs: outputsValue,
      truncated: ctx.truncated,
      displayed: ctx.displayed,
      dispose: ctx.dispose
    };
  };

  const fn =
    mode === "stream"
      ? (args = {}) => emitted(args, track())
      : async (args = {}) => (await run(args)).outputs;

  fn.run = run;
  fn.source = source;
  fn.body = order;
  fn.params = paramNames;
  fn.captures = captureList;
  fn.diagnostics = diagnostics;
  fn.module = module;
  fn.live = false;
  fn.dispose = () => {
    const n = liveContexts.size;
    for (const ctx of [...liveContexts]) ctx.dispose();
    return n;
  };
  fn.toSource = (opts) => toSource(source, order, captureList, paramNames, opts);
  return fn;
}

// ---------------------------------------------------------------------------
// compileDataflow — a live handle that is also an async generator
// ---------------------------------------------------------------------------

// Properties mirrored from the current compilation onto the live handle.
const COMPILED_KEYS = ["run", "source", "body", "params", "captures", "diagnostics", "module", "toSource", "dispose"];

// What makes a compilation stale: the emitted code, the identity of each recompiled definition
// (redefining a cell replaces `_definition`), and which variables sit on the frontier.
function stamp(f) {
  return {
    source: f.source,
    defs: f.body.map((v) => v._definition),
    caps: f.captures.slice()
  };
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameStamp = (a, b) => a.source === b.source && sameList(a.defs, b.defs) && sameList(a.caps, b.caps);

// Cheap staleness probe, so polling does not recompile 4x a second for nothing. A change that could
// alter the compilation must either replace a `_definition` we already depend on, or add/remove a
// variable from module scope.
function probe(f) {
  const p = [f.module && f.module._scope ? f.module._scope.size : 0];
  for (const v of f.body) p.push(v._definition);
  for (const v of f.captures) p.push(v._definition);
  return p;
}

/**
 * Compile a subgraph, and keep compiling it. The returned handle is
 *
 *  - the compiled function itself — `await handle(args)` runs the latest compilation, and
 *    `handle.source` / `.body` / `.captures` / `.diagnostics` / `.toSource()` track it;
 *  - an async generator — `.next()` yields the compiled function, then yields a freshly compiled
 *    one every time the subgraph's code changes. The Observable runtime duck-types generators
 *    (`.next` + `.return`), so a cell whose value is this handle becomes reactive for free:
 *    edit a cell in the subgraph and every downstream consumer gets a new function.
 *
 * Nothing is scheduled until the first `.next()`, so plain (non-notebook) use costs nothing.
 * `.return()` — which the runtime calls on invalidation — stops the watcher.
 *
 * Extra options:
 *   live      {boolean}  default true. false returns the bare compiled function, no generator.
 *   watch     {(notify) => unsubscribe}  change source. `onCodeChange` from
 *             @tomlarkworthy/runtime-sdk has exactly this shape. Default: polling.
 *   interval  {number}   polling period in ms, default 250. Only used without `watch`.
 */
export function compileDataflow(variables, options = {}) {
  const compiled = compileOnce(variables, options);
  if (options.live === false) return compiled;

  const { watch, interval = 250 } = options;
  let current = compiled;
  let mark = stamp(current);
  let probeMark = probe(current);
  let started = false;
  let closed = false;
  let pending = null; // resolve of the promise .next() is parked on
  let unwatch = null;

  const wake = () => {
    const p = pending;
    pending = null;
    if (p) p();
  };

  const start = () => {
    if (started || closed) return;
    started = true;
    if (watch) {
      unwatch = watch(wake);
    } else {
      const timer = setInterval(() => {
        const now = probe(current);
        if (sameList(now, probeMark)) return;
        probeMark = now;
        wake();
      }, interval);
      if (timer && typeof timer.unref === "function") timer.unref(); // never hold a process open
      unwatch = () => clearInterval(timer);
    }
  };

  const stop = () => {
    started = false;
    if (unwatch) try { unwatch(); } catch {}
    unwatch = null;
    wake();
  };

  const handle = (...args) => current(...args);

  for (const key of COMPILED_KEYS)
    Object.defineProperty(handle, key, { get: () => current[key], enumerable: true });

  // Recompile now; returns the new compilation, or null if nothing that matters changed. Replacing a
  // compilation supersedes everything it built, so its outstanding contexts are disposed — the same
  // bargain the runtime strikes when a cell recomputes.
  handle.recompile = () => {
    const next = compileOnce(variables, options);
    const nextMark = stamp(next);
    if (sameStamp(nextMark, mark)) {
      probeMark = probe(current); // re-baseline, or the poller reports the same non-change forever
      return null;
    }
    const superseded = current;
    current = next;
    mark = nextMark;
    probeMark = probe(current);
    superseded.dispose();
    return next;
  };

  handle.live = true;

  let delivered = false;
  handle.next = async () => {
    if (closed) return { done: true, value: undefined };
    if (!delivered) {
      delivered = true;
      return { done: false, value: current };
    }
    start();
    while (!closed) {
      await new Promise((resolve) => (pending = resolve));
      if (closed) break;
      const next = handle.recompile();
      if (next) return { done: false, value: next };
    }
    return { done: true, value: undefined };
  };

  // The runtime calls this on invalidation. Release everything: the watcher, and every context the
  // current compilation still has open.
  handle.return = (value) => {
    closed = true;
    stop();
    current.dispose();
    return Promise.resolve({ done: true, value });
  };

  handle[Symbol.asyncIterator] = () => handle;
  return handle;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const arrify = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

function normalizeOutputs(spec) {
  if (Array.isArray(spec)) return spec.map((s) => [typeof s === "string" ? s : nameOf(s) || "value", s]);
  if (spec && typeof spec === "object" && !("_inputs" in spec)) return Object.entries(spec);
  return [[typeof spec === "string" ? spec : nameOf(spec) || "value", spec]];
}

function explainIncompilable(v, module) {
  if (SENTINEL_NAMES.has(nameOf(v))) return `${nameOf(v)} is a runtime sentinel, not a value`;
  if (v._type === TYPE_IMPLICIT) return "it is referenced but never defined";
  if (v._type === TYPE_DUPLICATE) return "it has duplicate definitions";
  if (isShadow(v)) return "it is a per-cell shadow builtin";
  const why = importReason(v, module);
  if (why) return `it ${why}`;
  return null;
}

function topoSort(body, extraEdges = new Map()) {
  const order = [];
  const state = new Map(); // 0 = visiting, 1 = done
  const visit = (v, trail) => {
    const s = state.get(v);
    if (s === 1) return;
    if (s === 0) {
      const cycle = [...trail.slice(trail.indexOf(v)), v].map((x) => nameOf(x) || "(anonymous)").join(" -> ");
      throw new Error(`compileDataflow: circular dependency ${cycle}`);
    }
    state.set(v, 0);
    trail.push(v);
    for (const i of v._inputs || []) if (body.has(i)) visit(i, trail);
    for (const i of extraEdges.get(v) || []) if (body.has(i)) visit(i, trail);
    trail.pop();
    state.set(v, 1);
    order.push(v);
  };
  for (const v of body) visit(v, []);
  return order;
}

// Does `a` transitively depend on `b`, staying inside `body`?
function dependsOn(a, b, body, seen = new Set()) {
  if (a === b) return true;
  if (seen.has(a)) return false;
  seen.add(a);
  for (const i of a._inputs || []) if (body.has(i) && dependsOn(i, b, body, seen)) return true;
  return false;
}

// extraEdges: value-variable -> [writers that must precede it]
function mutableOrderingEdges(body, note) {
  const edges = new Map();
  const byName = new Map();
  for (const v of body) if (nameOf(v)) byName.set(nameOf(v), v);
  for (const accessor of body) {
    const target = mutableAccessorTarget(accessor);
    if (!target) continue;
    const valueVar = byName.get(target);
    if (!valueVar) continue;
    for (const writer of body) {
      if (writer === valueVar || writer === accessor) continue;
      if (!(writer._inputs || []).includes(accessor)) continue;
      if (dependsOn(writer, valueVar, body)) {
        note(
          "error",
          "mutable-write-after-read",
          `${nameOf(writer) || "(anonymous)"} both reads and writes mutable ${target}; a single pass cannot ` +
            `reproduce the reactive fixed point, so the write is invisible to everything that already read it.`,
          writer
        );
        continue;
      }
      if (!edges.has(valueVar)) edges.set(valueVar, []);
      edges.get(valueVar).push(writer);
    }
  }
  return edges;
}

function descendantsWithin(root, order) {
  const set = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of order) {
      if (set.has(v)) continue;
      for (const i of v._inputs || []) {
        if (i === root || set.has(i)) {
          set.add(v);
          changed = true;
          break;
        }
      }
    }
  }
  return set;
}

// Read a variable's current value from the live runtime. module.value() forces computation of
// cells nothing is observing; shadow variables are not addressable by name, so fall back to the
// variable's own promise (which is only populated if the runtime already computed it).
async function readVariable(v) {
  const n = nameOf(v);
  const module = v._module;
  if (n && !isShadow(v) && module && typeof module.value === "function") return await module.value(n);
  return await v._promise;
}

function bindLine(v, params, lhs) {
  const n = nameOf(v);
  if (!n) return [];
  const target = n.startsWith("viewof ") ? n.slice(7) : n.startsWith("viewof$") ? n.slice(7) : null;
  if (!target) return [];
  for (const [pv, pn] of params) if (pn === target || nameOf(pv) === target)
    return [`  $rt.bindView(${lhs}, $args, ${JSON.stringify(pn)});`];
  return [];
}

// Parameterising `x` while `viewof x` is still reachable is the one place the low-level view of the
// graph bites: the two variables are siblings, so nothing keeps the view's .value in step with the
// argument you passed for its value.
function diagnoseParamsShadowedByViews(params, body, captureList, note) {
  const byName = new Map();
  for (const v of body) if (nameOf(v)) byName.set(nameOf(v), ["body", v]);
  for (const v of captureList) if (nameOf(v)) byName.set(nameOf(v), ["capture", v]);
  for (const [, pn] of params) {
    for (const viewName of [`viewof ${pn}`, `viewof$${pn}`]) {
      const hit = byName.get(viewName);
      if (!hit) continue;
      const [where, v] = hit;
      note(
        "warn",
        "param-shadowed-by-view",
        where === "body"
          ? `${viewName} is recompiled while "${pn}" is a parameter: the fresh view sits at its own default ` +
            `value and will NOT reflect the argument. Pass bindViews:true, or parameterise "${viewName}" instead.`
          : `${viewName} is captured from the live notebook while "${pn}" is a parameter: the shared view keeps ` +
            `whatever value the user last chose, which need not match the argument.`,
        v
      );
    }
  }
}

function diagnoseMutables(order, captureIndex, note) {
  for (const v of order) {
    const target = mutableAccessorTarget(v);
    if (target)
      note(
        "info",
        "mutable-in-body",
        `mutable ${target} is compiled as a plain box: assignments do not re-run downstream cells, they are ` +
          `only visible to cells the compiler ordered after the writer.`,
        v
      );
  }
  // A mutable that stayed outside the subgraph is the NOTEBOOK's mutable — writing to it from
  // compiled code mutates the live document, and the effect persists across calls.
  for (const v of order)
    for (const i of v._inputs || []) {
      const target = mutableAccessorTarget(i);
      if (target && captureIndex.has(i))
        note(
          "warn",
          "mutable-write-escapes",
          `${nameOf(v) || "(anonymous)"} writes mutable ${target}, which was captured rather than recompiled: ` +
            `the assignment mutates the live notebook. Widen the subgraph (frontier:"all") to get a private copy.`,
          v
        );
    }
}

function diagnoseThis(order, note) {
  for (const v of order) {
    const src = String(v._definition);
    if (/(^|[^.\w$])this([^\w$]|$)/.test(src.slice(src.indexOf("{"))))
      note(
        "info",
        "this-reference",
        `${nameOf(v) || "(anonymous)"} may reference \`this\` (the cell's previous value); ` +
          `in compiled code it is always undefined, matching a first evaluation.`,
        v
      );
  }
}

// Emit standalone source: definitions inlined, captures lifted to a second parameter object.
function toSource(source, order, captureList, paramNames, opts = {}) {
  const fnName = opts.name || "compiled";
  const missing = captureList.filter((v) => !nameOf(v));
  const capNames = captureList.map((v, i) => nameOf(v) || `$anon${i}`);
  const defsSrc = order.map((v, i) => `const $d${i} = ${String(v._definition)}; // ${nameOf(v) || "(anonymous)"}`);
  const body = source
    .replace(/\$rt\.d\[(\d+)\]/g, "$d$1")
    .replace(/\$c\[(\d+)\]/g, (_, i) => `$cap[${JSON.stringify(capNames[+i])}]`)
    .replace(/^\s*const \$c = await \$rt\.captures\(\);\n/m, "")
    .replace(/\$rt\.first\(/g, "$first(")
    .replace(/\$rt\.iterate\(/g, "$iterate(")
    .replace(/\$rt\.param\(\$args, /g, "$param($args, ")
    .replace(/\$rt\.invalidation/g, "$invalidation")
    .replace(/\$rt\.visibility/g, "$visibility")
    .replace(/\$rt\.bindView\(/g, "$bindView(")
    .replace(/\$rt\.display/g, "$display")
    .replace(/\$rt\.view/g, "$view");
  return {
    warnings: missing.length ? [`${missing.length} anonymous capture(s) have no name and cannot be addressed`] : [],
    captures: capNames,
    params: paramNames,
    source: [
      HELPER_SOURCE,
      ...defsSrc,
      body.replace(/\$args, \$rt\)/, "$args, $cap = {})").replace(/\bcompiledDataflow\b/, fnName)
    ].join("\n\n")
  };
}

const HELPER_SOURCE = `const $generatorish = (v) => v && typeof v.next === "function" && typeof v.return === "function";
const $invalidation = new Promise(() => {});
const $visibility = (v) => Promise.resolve(v);
const $param = ($args, k) => { if (!$args || !(k in $args)) throw new Error("missing argument " + k); return $args[k]; };
const $bindView = (view, $args, k) => { if (view && k in $args) try { view.value = $args[k]; } catch {} };
const $displayed = [];
const $display = (value) => ($displayed.push(value), value);
const $view = (node) => ($displayed.push(node), node && node.value);
async function $first(v) {
  v = await v;
  if (!$generatorish(v)) return v;
  try { const {done, value} = await v.next(); return done ? undefined : await value; }
  finally { try { v.return(); } catch {} }
}
async function* $iterate(v) {
  if (!$generatorish(v)) return void (yield v);
  while (true) { const {done, value} = await v.next(); if (done) return; yield await value; }
}`;

export default compileDataflow;
