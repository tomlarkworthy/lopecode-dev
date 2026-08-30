// compileDataflow(variables, options) — compile a subgraph of an Observable runtime module
// into a plain JavaScript function. The static counterpart to `cloneDataflow`
// (@tomlarkworthy/dataflow-templating): instead of instantiating an isolated copy of the
// reactive graph, it emits straight-line code that runs the same computation once.
//
// Works on the LOW LEVEL runtime representation (Variable._name/_inputs/_definition), so
// `viewof`/`mutable`/multi-output cells need no special parsing, and Notebook 1 and
// Notebook Kit 2.0 modules compile through the same path.
//
// Two halves:
//   planSubgraph  decides WHAT is compiled — the body set, its topological order, which variables
//                 become parameters and which are read from outside (captures).
//   compileOnce   emits it, as a closure-free function whose every outside value is an argument.
//
// Self-contained: no imports, so the whole file can be pasted into one notebook cell.

const TYPE_IMPLICIT = 2;
const TYPE_DUPLICATE = 3;

const SENTINEL_NAMES = new Set(["invalidation", "visibility", "@variable"]);

const sanitize = (s) => String(s).replace(/[^\w$]/g, "_");

// The global object, obtained WITHOUT naming `globalThis`. This file is pasted into one Observable
// cell (see the header), and the Observable parser turns every free identifier into a cell
// dependency. `globalThis` is not on its globals list — the vendored lezer grammar predates it — so
// naming it made `compileDataflow` depend on an implicit variable of that name. `Function` is on the
// list, and `new Function` was already used here before this.
const HOST = Function("return this")();

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
 * Decide what a compilation covers. Emits nothing.
 *
 * @param {Array|null} variables  the subgraph to compile (Variables or names). Pass null to walk
 *                                back from `outputs`, stopping at `inputs` and at the boundaries
 *                                listed under "captures" below.
 * @param {object} options
 *   module      {Module}   module used to resolve names (default: the first output's module)
 *   inputs      {string[]|Variable[]} boundary variables that become function parameters
 *   outputs     {string[]|Variable[]|Object} results; an object maps resultKey -> variable
 *   frontier    {"params"|"all"}  how far back to recompile (default "params" when `inputs` is
 *                          given, else "all")
 * @returns {object} {module, order, params, captures, outputs, diagnostics}
 */
function planSubgraph(variables, options = {}) {
  const { inputs: inputSpec = [], outputs: outputSpec = [] } = options;

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

  // ---- ordering -----------------------------------------------------------
  const order = topoSort(body);

  // ---- classify every input ----------------------------------------------
  // Three buckets, and every input lands in exactly one: recompiled (it is in `body`), supplied by
  // the caller (`params`), or read from outside the subgraph (`captures`). The emitter turns the
  // last two into arguments, which is what makes the artifact closure-free.
  const captureList = [];
  const captureIndex = new Map();
  const captureOf = (v) => {
    if (!captureIndex.has(v)) {
      captureIndex.set(v, captureList.length);
      captureList.push(v);
    }
    return captureIndex.get(v);
  };
  for (const v of order)
    for (const i of v._inputs || []) {
      if (body.has(i) || params.has(i)) continue;
      // Neither of these has a name to be an argument by; the emitter refuses whatever reads them.
      if (isShadow(i) || (v._shadow && shadowNameOf(v, i))) continue; // Notebook Kit per-cell display/view
      if (nameOf(i) === "@variable") continue;
      captureOf(i);
    }
  // `invalidation` and `visibility` come through here like any other capture: the module resolves
  // each to one shared implicit Variable (checked: two cells referencing `invalidation` have the
  // identical object in `_inputs`), so they arrive as a single parameter each, named for the
  // sentinel. The caller owns the lifecycle; the compiler does not invent one.

  // An output that was not recompiled is returned straight from outside the subgraph.
  for (const [, v] of outputs) if (!body.has(v) && !params.has(v)) captureOf(v);

  diagnoseThis(order, note);
  diagnoseParamsShadowedByViews(params, body, captureList, note);

  return {
    module,
    order,
    params,
    paramNames: [...new Set([...params.values()])],
    captures: captureList,
    outputs,
    diagnostics
  };
}

// ---------------------------------------------------------------------------
// the live handle — a compiled function that is also an async generator
// ---------------------------------------------------------------------------

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
 * Compile a subgraph into a closure-free function, and keep compiling it. The returned handle is
 *
 *  - the compiled function itself — `handle(args, captures)` runs the latest compilation, and
 *    `handle.source` / `.body` / `.captures` / `.diagnostics` track it;
 *  - an async generator — `.next()` yields the compiled function, then yields a freshly compiled
 *    one every time the subgraph's code changes. The Observable runtime duck-types generators
 *    (`.next` + `.return`), so a cell whose value is this handle becomes reactive for free:
 *    edit a cell in the subgraph and every downstream consumer gets a new function.
 *
 * Nothing is scheduled until the first `.next()`, so plain (non-notebook) use costs nothing.
 * `.return()` — which the runtime calls on invalidation — stops the watcher.
 *
 * Options are `planSubgraph`'s (`module`, `inputs`, `outputs`, `frontier`), plus:
 *   live          {boolean}  default true. false returns the bare compiled function, no generator.
 *   watch         {(notify) => unsubscribe}  change source. `onCodeChange` from
 *                 @tomlarkworthy/runtime-sdk has exactly this shape. Default: polling.
 *   interval      {number}   polling period in ms, default 250. Only used without `watch`.
 *   name          {string}   the emitted function's name.
 *   views         {"refuse"|"snapshot"}  what to do with the value half of a `viewof`.
 *   async         {"auto"|boolean}  default "auto": async exactly when a definition is.
 *   parse         {Function} an ESTree parser (acorn's `parse`) to enable the identifier scan.
 *   globals       {string[]} extra names the scan should treat as resolvable.
 *   strictGlobals {boolean}  true turns an unresolved identifier into a compile-time throw.
 */
export function compileDataflow(variables, options = {}) {
  const compiled = compileOnce(variables, options);
  if (options.live === false) return compiled;
  return liveHandle(compileOnce, compiled, variables, options);
}

// `compile` is the single-shot compiler to re-run; `compiled` is its first result (already built, so
// a synchronous throw reaches the caller before any watcher is installed).
function liveHandle(compile, compiled, variables, options) {
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

  for (const key of compiled.$mirror)
    Object.defineProperty(handle, key, { get: () => current[key], enumerable: true });

  // Recompile now; returns the new compilation, or null if nothing that matters changed. Replacing a
  // compilation supersedes everything it built, so its outstanding contexts are disposed — the same
  // bargain the runtime strikes when a cell recomputes.
  handle.recompile = () => {
    const next = compile(variables, options);
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
// compileOnce — the emitter
// ---------------------------------------------------------------------------
//
// One emitter, one refusal axis: a cell whose value is a STREAM cannot be compiled, because one call
// produces one value and there is no honest choice of which of a stream's values that should be.
// Everything else is compiled — an `async` definition included, since it has exactly one value that
// merely arrives later, and the emitted function becomes `async` to await it.
//
// Everything the subgraph does not define is an argument: parameters in `$args`, captures in `$cap`.
// Nothing is read from a runtime when the function runs, which is what lets the emitted text be
// lifted out of the notebook and published.
//
// Two properties fall out, and they are different in kind:
//
//   Closure-free is GUARANTEED, not checked. The function is built with `new Function`, whose only
//   visible scope is the global one. A definition that referenced an enclosing local cannot capture
//   it; it throws ReferenceError instead. `unresolved` in the diagnostics lists the names that will
//   have to be globals at call time (see `strictGlobals`).
//
//   Pure is CLAIMED, not proved. Everything that flows in is an argument, and the compiler rejects
//   the constructs that carry hidden state across calls (generators, `mutable` accessors). It cannot
//   see a definition that writes to `document` or to an object it was handed. Emitted code is strict
//   mode, so an accidental global assignment throws rather than leaking.

// The stream axis. An earlier emitter took a generator's first value and disposed the rest, which
// answers a question the notebook never asked; refusing says so instead.
const STREAM_KINDS = {
  GeneratorFunction: "is a generator function, so its value is a stream",
  AsyncGeneratorFunction: "is an async generator function, so its value is a stream"
};

// Built the same way `new Function` is, and equally closure-free: the constructor is reached through
// a throwaway async function's prototype rather than named, since `AsyncFunction` is not a global.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// `x` in `viewof x = …` / `mutable x = …` is a separate variable whose whole job is to yield a
// generator of the view's or box's values. There is no synchronous compilation of it. Returns the
// view/box variable it accesses, and which kind, so the caller can decide what to do about it.
function generatorAccessor(v) {
  const n = nameOf(v);
  if (!n) return null;
  for (const i of v._inputs || []) {
    const inp = nameOf(i);
    if (inp === `viewof ${n}` || inp === `viewof$${n}`) return { kind: "view", of: i, inp };
    if (inp === `mutable ${n}` || inp === `mutable$${n}`) return { kind: "mutable", of: i, inp };
  }
  return null;
}

/**
 * Compile a subgraph once, into a closure-free function.
 *
 *   const fn = compileDataflow(template, {outputs: ["chart"], live: false});
 *   fn({}, {Plot, data})        // -> {chart: <svg>}
 *   fn.source                   // publishable text; the same body, as a named declaration
 *   await fn.run({})            // convenience: reads the captures out of the live runtime first
 *
 * `outputs` defaults to the sinks of `variables` — the members nothing else in the list reads.
 */
function compileOnce(variables, options = {}) {
  // Options of the earlier async emitter, all of which existed to iterate a stream or to reach into
  // a runtime at call time. Named individually so a stale call site gets told what happened.
  for (const gone of ["mode", "driver", "bindViews", "snapshot", "shadows"])
    if (options[gone] != null && !(gone === "mode" && options.mode === "once"))
      throw new Error(
        `compileDataflow: option ${JSON.stringify(gone)} no longer exists. It belonged to the async ` +
          `emitter, whose remaining job was iterating a generator — which is the one thing a compiled ` +
          `function cannot represent.`
      );

  if (options.async != null)
    throw new Error(
      `compileDataflow: option "async" no longer exists. Whether the function is async is derived, ` +
        `and so is where each await goes: an async definition is awaited outright, and every other ` +
        `cell is awaited only if it actually hands back a promise. fn.isAsync reports the outcome.`
    );

  const {
    name = "compiled", parse = null, globals = [], strictGlobals = false, views = "refuse"
  } = options;
  if (views !== "refuse" && views !== "snapshot")
    throw new Error(`compileDataflow: unknown views ${JSON.stringify(views)} (expected "refuse" or "snapshot")`);

  // Sinks first: the plan needs the outputs to name what the function returns, and with a variable
  // list in hand the useful default is "whatever nothing else in the list consumes".
  let outputSpec = options.outputs;
  if ((outputSpec == null || (Array.isArray(outputSpec) && !outputSpec.length)) && Array.isArray(variables)) {
    const list = variables.filter((v) => v && typeof v === "object");
    const consumed = new Set();
    for (const v of list) for (const i of v._inputs || []) consumed.add(i);
    outputSpec = list.filter((v) => !consumed.has(v) && nameOf(v));
    // A DAG always has a sink, so an empty result means a cycle. Hand the whole list on and let
    // topoSort produce the message that names the loop.
    if (!outputSpec.length) outputSpec = list.filter((v) => nameOf(v));
  }

  const plan = planSubgraph(variables, { ...options, outputs: outputSpec });

  const diagnostics = plan.diagnostics.slice();
  const refuse = [];
  const note = (level, code, message, variable) =>
    diagnostics.push({ level, code, message, variable: nameOf(variable) });

  for (const d of plan.diagnostics)
    if (d.level === "error") refuse.push(`${d.variable || "(anonymous)"}: ${d.message}`);

  // ---- what will not compile ----------------------------------------------
  const order = plan.order;
  const snapshots = new Map(); // value-half Variable -> the `viewof x` Variable to read .value from
  const asyncCells = [];       // body cells whose definition is an async function
  const awaited = new Set();   // …and the Variables themselves, so only those get an await
  for (const v of order) {
    const label = nameOf(v) || "(anonymous)";
    const accessor = generatorAccessor(v);
    if (accessor) {
      if (accessor.kind === "view" && views === "snapshot") {
        snapshots.set(v, accessor.of);
        note(
          "info",
          "view-snapshot",
          `${label} is read as ${accessor.inp}.value once, not subscribed to. A view that is recompiled ` +
            `gives its constructed default; a view that is captured gives whatever the live widget holds ` +
            `when the function is called.`,
          v
        );
        continue; // its own definition is never called, so nothing else about it matters
      }
      refuse.push(
        `${label} is the value half of "${accessor.inp}", so its value is a stream of the ` +
          (accessor.kind === "view" ? `view's values (pass views:"snapshot" to read it once instead)` : `box's values`)
      );
    }
    const def = v._definition;
    const kind = def && def.constructor && def.constructor.name;
    if (STREAM_KINDS[kind]) {
      refuse.push(`${label} ${STREAM_KINDS[kind]}`);
      continue;
    }
    if (kind === "AsyncFunction") {
      asyncCells.push(label);
      awaited.add(v);
    }
    const src = String(def);
    if (src.includes("[native code]")) {
      refuse.push(`${label} has a native or bound definition, which cannot be inlined as source`);
      continue;
    }
    for (const i of v._inputs || []) {
      const n = nameOf(i);
      // `invalidation` and `visibility` are captures like anything else the subgraph does not
      // define: named parameters the caller supplies. `@variable` is not — it is the importing
      // variable itself, and there is no value to pass.
      if (n === "@variable")
        refuse.push(`${label} reads the @variable sentinel, which has no value to pass as an argument`);
      // A shadow input carries no _name, so isShadow() cannot see it: membership in the OWNING
      // variable's _shadow map is the only signal there is.
      const sn = v._shadow ? shadowNameOf(v, i) : null;
      if (sn || isShadow(i))
        refuse.push(`${label} reads the per-cell builtin ${JSON.stringify(sn || "?")}, which writes to the original cell`);
    }
    const target = mutableAccessorTarget(v);
    if (target)
      refuse.push(
        `${label} constructs mutable ${target}; a Mutable is a live box whose writes are only observable ` +
          `through the generator half, which is a stream`
      );
  }

  // ---- captures become parameters -----------------------------------------
  // Snapshotting a view drops its `Generators` dependency, and it may be the only thing that needed
  // it — so the capture list is pruned to what the emitter actually references, further down.
  const captureList = plan.captures;
  const anon = captureList.filter((v) => !nameOf(v));
  if (anon.length)
    refuse.push(
      `${anon.length} captured variable(s) have no name, so they cannot become parameters. Widen the ` +
        `subgraph so they are recompiled, or name them.`
    );

  if (refuse.length)
    throw new Error(
      `compileDataflow: this subgraph cannot be compiled to a function.\n  - ${refuse.join("\n  - ")}`
    );

  const paramNames = plan.paramNames;
  const pId = paramNames.map((n, i) => `$p${i}_${sanitize(n)}`);
  const paramSlot = new Map(paramNames.map((n, i) => [n, pId[i]]));
  const capSlot = new Map(captureList.map((v, i) => [v, `$c${i}_${sanitize(nameOf(v))}`]));
  const slot = new Map(order.map((v, i) => [v, `$v${i}_${sanitize(nameOf(v) || "anon")}`]));

  // Nothing to configure: the function is async exactly when a definition in it is, and each await
  // goes where the promise is. An await is not free even on a plain value — it suspends the frame,
  // and restoring the frame costs in proportion to the locals live across it, so awaiting every
  // cell is quadratic in the size of the subgraph (measured: await-cost.mjs). A cell whose
  // definition is not async is instead awaited *conditionally*, which is a typeof and no suspend
  // when the value is ordinary. That covers the one case constructor.name cannot see — a sync
  // definition returning a promise, `data = FileAttachment("x.json").json()` — without a flag.
  const isAsync = asyncCells.length > 0 || options.$forceAsync === true;

  const usedCaptures = new Set();
  const ref = (v) => {
    if (slot.has(v)) return slot.get(v);
    if (capSlot.has(v)) {
      usedCaptures.add(v);
      return capSlot.get(v);
    }
    const n = nameOf(v);
    if (n && paramSlot.has(n)) return paramSlot.get(n);
    // planSubgraph puts every input in exactly one of the three buckets, so this is a bug here.
    throw new Error(`compileDataflow: ${JSON.stringify(n)} is in none of body/params/captures`);
  };

  // ---- emit ----------------------------------------------------------------
  // The dataflow is emitted first so `ref` has seen every reference: only then is it known which
  // captures the code actually reads and therefore which have to be required as arguments.
  const defLines = [];
  const flowLines = [];
  order.forEach((v, i) => {
    const label = JSON.stringify(nameOf(v) || "(anonymous)");
    if (snapshots.has(v)) {
      flowLines.push(`  const ${slot.get(v)} = ${ref(snapshots.get(v))}.value; // ${nameOf(v)}, snapshotted`);
      return;
    }
    defLines.push(`  const $d${i} = ${indentDefinition(String(v._definition))}; // ${nameOf(v) || "(anonymous)"}`);
    const args = (v._inputs || []).map(ref).join(", ");
    const s = slot.get(v);
    const call = `$d${i}.call(undefined${args ? ", " + args : ""})`;
    if (awaited.has(v)) flowLines.push(`  const ${s} = $check(${label}, await ${call});`);
    else if (isAsync)
      flowLines.push(`  let ${s} = $check(${label}, ${call}); if ($thenable(${s})) ${s} = await ${s};`);
    else flowLines.push(`  const ${s} = $check(${label}, ${call});`);
  });
  const outputs = plan.outputs;
  const returnLine = `  return {${outputs.map(([k, v]) => `${JSON.stringify(k)}: ${ref(v)}`).join(", ")}};`;

  const usedCaptureList = captureList.filter((v) => usedCaptures.has(v));
  const captureNames = usedCaptureList.map(nameOf);

  const lines = [prelude(isAsync)];
  if (paramNames.length) lines.push("  // arguments");
  paramNames.forEach((n, i) => lines.push(`  const ${pId[i]} = $need($args, ${JSON.stringify(n)}, "argument");`));
  if (captureNames.length) lines.push("  // captures — everything the subgraph reads but does not define");
  for (const v of usedCaptureList)
    lines.push(`  const ${capSlot.get(v)} = $need($cap, ${JSON.stringify(nameOf(v))}, "capture");`);
  if (defLines.length) lines.push("  // definitions, inlined verbatim from the module", ...defLines);
  lines.push("  // dataflow, in topological order", ...flowLines, returnLine);

  const body = lines.join("\n");
  // No default parameter values: a "use strict" directive is a SyntaxError in a function with a
  // non-simple parameter list, and $need already reports a null $args/$cap by name.
  const source = `${isAsync ? "async " : ""}function ${sanitize(name)}($args, $cap) {\n${body}\n}`;
  const fn = isAsync ? new AsyncFunction("$args", "$cap", body) : new Function("$args", "$cap", body);

  // ---- the identifier scan -------------------------------------------------
  let unresolved = [];
  if (parse) {
    const allow = new Set([...globals, ...paramNames, ...captureNames.map(sanitize)]);
    unresolved = undeclaredIdentifiers(order, parse, allow);
    if (unresolved.length) {
      const msg =
        `${unresolved.length} identifier(s) resolve to nothing lexical and must be globals at call time: ` +
        unresolved.map((u) => `${u.name} (in ${u.cell})`).join(", ") +
        `. The emitted function is closure-free either way — pasted into a scope that happens to define ` +
        `one of these names, it would silently bind to it.`;
      if (strictGlobals) throw new Error(`compileDataflow: ${msg}`);
      note("warn", "unresolved-identifier", msg, null);
    }
  } else {
    note(
      "info",
      "scan-skipped",
      "no options.parse, so the undeclared-identifier scan did not run. Pass acorn's parse to enable it.",
      null
    );
  }

  const call = (args = {}, cap = {}) => fn(args, cap);
  call.source = source;
  call.body = order;
  call.params = paramNames;
  call.captures = usedCaptureList; // what the emitted code actually reads, so it matches the signature
  call.captureNames = captureNames;
  call.snapshots = [...snapshots.keys()].map(nameOf);
  call.isAsync = isAsync;          // derived; `asyncCells` says which definitions forced it
  call.asyncCells = asyncCells;
  call.awaits = asyncCells.length;             // cells that always suspend
  call.maybeAwaits = isAsync ? order.length - asyncCells.length - snapshots.size : 0; // …and that suspend only if they return a promise
  call.outputs = outputs.map(([k]) => k);
  call.unresolved = unresolved;
  call.diagnostics = diagnostics;
  call.module = plan.module;
  call.live = false;
  // The one thing the derivation cannot see is a *sync* definition that hands back a promise
  // (`data = FileAttachment("x.json").json()`). In a subgraph that already has an async cell the
  // conditional await picks it up; in an all-sync one there is no await to reach for, so $check
  // throws and this is the way out — the same subgraph emitted async, built only if asked for.
  if (!isAsync) {
    let twin = null;
    Object.defineProperty(call, "asAsync", {
      get: () => (twin ||= compileOnce(variables, { ...options, $forceAsync: true }))
    });
  }
  call.dispose = () => 0; // nothing to release: no contexts, no generators, no timers
  // Reads the captures out of the live runtime, so a caller who is standing in the notebook does not
  // have to assemble `$cap` by hand. Async because reading a runtime variable is; the compiled
  // artifact still is not. `extra` overrides, and is the only way to supply a sentinel:
  //
  //   await m.value("invalidation")  never settles — the runtime awaits the cell's value, and an
  //                                  invalidation promise that never fires wedges it (measured:
  //                                  still pending after 200ms, and the process hangs)
  //   await m.value("visibility")    RuntimeError: visibility is not defined
  //
  // so both are skipped here. Left unsupplied, `$need` names the missing one at call time.
  const readable = usedCaptureList.filter((v) => !SENTINEL_NAMES.has(nameOf(v)));
  call.sentinels = usedCaptureList.filter((v) => SENTINEL_NAMES.has(nameOf(v))).map(nameOf);
  call.captureValues = async (extra = {}) => {
    const values = await Promise.all(readable.map(readVariable));
    return { ...Object.fromEntries(readable.map((v, i) => [nameOf(v), values[i]])), ...extra };
  };
  call.run = async (args = {}, extra = {}) => ({ outputs: await fn(args, await call.captureValues(extra)) });
  call.$mirror = [
    "source", "body", "params", "captures", "captureNames", "sentinels", "snapshots", "isAsync",
    "asyncCells", "awaits", "maybeAwaits", "asAsync", "outputs", "unresolved", "diagnostics", "module",
    "dispose",
    "captureValues", "run"
  ];
  return call;
}

// Defined inside the emitted function, so the function stays closure-free: `new Function` sees no
// enclosing scope, and these cannot be supplied from one.
const prelude = (isAsync) => `  "use strict";
  const $need = ($o, $k, $what) => {
    if ($o == null || !($k in $o)) throw new TypeError("missing " + $what + " " + JSON.stringify($k));
    return $o[$k];
  };
  const $check = ($n, $v) => {${
    isAsync
      ? ""
      : `
    if ($v != null && typeof $v.then === "function")
      throw new TypeError($n + " returned a Promise; this function is synchronous by construction — fn.asAsync awaits it");`
  }
    if ($v != null && typeof $v.next === "function" && typeof $v.return === "function")
      throw new TypeError($n + " returned a generator, which is a stream; one call gives one value");
    return $v;
  };${isAsync ? '\n  const $thenable = ($v) => $v != null && typeof $v.then === "function";' : ""}`;

// Definitions are emitted at one level of indentation, so their own line breaks have to follow.
const indentDefinition = (src) => src.replace(/\n/g, "\n  ");

// ---------------------------------------------------------------------------
// Undeclared-identifier scan
// ---------------------------------------------------------------------------

// Walks each definition's AST and reports identifiers in reference position that are not bound
// anywhere inside it and are not present on globalThis.
//
// Deliberately over-approximates the DECLARED set: it collects every binding introduced anywhere in
// the function rather than tracking scope properly, so a free `x` in one branch is silenced by a
// `let x` in another. That direction is the safe one — the scan can miss a name, but it never
// reports a name that is in fact bound, which would block a valid compilation.
function undeclaredIdentifiers(order, parse, allow) {
  const out = [];
  const seen = new Set();
  for (const v of order) {
    const cell = nameOf(v) || "(anonymous)";
    let ast;
    try {
      ast = parse(`(${String(v._definition)})`, { ecmaVersion: "latest" });
    } catch {
      continue; // a definition we cannot parse is one we cannot scan; codegen already inlined it
    }
    const declared = new Set();
    const referenced = new Set();
    collect(ast, null, null, declared, referenced);
    for (const name of referenced) {
      if (declared.has(name) || allow.has(name)) continue;
      if (name in HOST || name === "undefined" || name === "arguments") continue;
      const key = `${cell}\u0000${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ cell, name });
    }
  }
  return out;
}

// Every name a binding pattern introduces.
function patternNames(node, into) {
  if (!node || typeof node !== "object") return;
  switch (node.type) {
    case "Identifier": into.add(node.name); return;
    case "ObjectPattern": for (const p of node.properties) patternNames(p.value || p.argument, into); return;
    case "ArrayPattern": for (const e of node.elements) patternNames(e, into); return;
    case "AssignmentPattern": patternNames(node.left, into); return;
    case "RestElement": patternNames(node.argument, into); return;
    default: return;
  }
}

const FUNCTIONISH = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

// Generic ESTree walk, so any parser with an ESTree output works and no walker has to be injected.
function collect(node, parent, key, declared, referenced) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) collect(child, parent, key, declared, referenced);
    return;
  }
  if (typeof node.type !== "string") return;

  if (FUNCTIONISH.has(node.type)) {
    if (node.id) declared.add(node.id.name);
    for (const p of node.params) patternNames(p, declared);
  } else if (node.type === "VariableDeclarator") {
    patternNames(node.id, declared);
  } else if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
    if (node.id) declared.add(node.id.name);
  } else if (node.type === "CatchClause") {
    patternNames(node.param, declared);
  } else if (node.type === "Identifier") {
    // Reference position is everything the parent did not claim as a name.
    const named =
      (parent &&
        ((parent.type === "MemberExpression" && key === "property" && !parent.computed) ||
          ((parent.type === "Property" || parent.type === "PropertyDefinition" || parent.type === "MethodDefinition") &&
            key === "key" &&
            !parent.computed) ||
          (FUNCTIONISH.has(parent.type) && (key === "id" || key === "params")) ||
          (parent.type === "VariableDeclarator" && key === "id") ||
          ((parent.type === "ClassDeclaration" || parent.type === "ClassExpression") && key === "id") ||
          (parent.type === "CatchClause" && key === "param") ||
          (parent.type === "LabeledStatement" && key === "label") ||
          ((parent.type === "BreakStatement" || parent.type === "ContinueStatement") && key === "label") ||
          (parent.type === "ImportSpecifier" && key === "imported") ||
          (parent.type === "ExportSpecifier"))) ||
      false;
    if (!named) referenced.add(node.name);
    return;
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "start" || k === "end" || k === "loc" || k === "range") continue;
    collect(node[k], node, k, declared, referenced);
  }
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

function topoSort(body) {
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
    trail.pop();
    state.set(v, 1);
    order.push(v);
  };
  for (const v of body) visit(v, []);
  return order;
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
            `value and will NOT reflect the argument. Parameterise "${viewName}" instead.`
          : `${viewName} is captured from the live notebook while "${pn}" is a parameter: the shared view keeps ` +
            `whatever value the user last chose, which need not match the argument.`,
        v
      );
    }
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

export default compileDataflow;
