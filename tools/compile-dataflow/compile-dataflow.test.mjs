// bun test tools/compile-dataflow/compile-dataflow.test.mjs
//
// The contract is mostly about what it REFUSES, so most of these assert on the throw and on the
// text of the message — a refusal that does not name the cell is not actionable.
import { test, expect } from "bun:test";
import { Runtime } from "../../vendor/observable-runtime/src/index.js";
import { input } from "../../vendor/observable-stdlib/src/generators/input.js";
import { Mutable } from "../../vendor/observable-stdlib/src/mutable.js";
import { parse } from "../node_modules/acorn/dist/acorn.mjs";
import { compileDataflow } from "./compile-dataflow.mjs";

const lib = { Generators: () => ({ input }), Mutable: () => Mutable };

function mk(define) {
  const runtime = new Runtime(lib);
  const main = runtime.module();
  define(main);
  return { runtime, main };
}

const settle = () => new Promise((r) => setTimeout(r, 20));
const scope = (main, ...names) => names.map((n) => main._scope.get(n));
const bare = (variables, options) => compileDataflow(variables, { live: false, ...options });

// ===========================================================================
// the happy path
// ===========================================================================

test("emits a synchronous function; calling it needs no runtime and no await", () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 3);
    m.define("b", ["a"], (a) => a * 2);
    m.define("c", ["a", "b"], (a, b) => a + b);
  });
  const fn = bare(scope(main, "a", "b", "c"));
  const out = fn(); // not a promise
  expect(out).toEqual({ c: 9 });
  expect(fn.source.startsWith("function compiled(")).toBe(true);
  expect(fn.source).not.toMatch(/\basync\b|\bawait\b|\byield\b/); // nothing async in this subgraph
});

test("outputs default to the sinks of the given variables", () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a + 1);
    m.define("c", ["a"], (a) => a + 2);
  });
  expect(bare(scope(main, "a", "b", "c")).outputs.sort()).toEqual(["b", "c"]);
});

test("parameters and captures are both explicit arguments", () => {
  const { main } = mk((m) => {
    m.define("scale", [], () => 10);
    m.define("x", [], () => 2);
    m.define("y", ["x", "scale"], (x, s) => x * s);
  });
  // `scale` is outside the compiled set, so it is a capture rather than a recompiled cell
  const fn = bare(scope(main, "x", "y"), { inputs: ["x"], outputs: ["y"] });
  expect(fn.params).toEqual(["x"]);
  expect(fn.captureNames).toEqual(["scale"]);
  expect(fn({ x: 4 }, { scale: 100 })).toEqual({ y: 400 });
});

test("a missing argument or capture is named in the error", () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 1);
    m.define("x", [], () => 2);
    m.define("y", ["x", "k"], (x, k) => x + k);
  });
  const fn = bare(scope(main, "x", "y"), { inputs: ["x"], outputs: ["y"] });
  expect(() => fn({}, { k: 1 })).toThrow(/missing argument "x"/);
  expect(() => fn({ x: 1 }, {})).toThrow(/missing capture "k"/);
});

// ===========================================================================
// closure-freeness and purity
// ===========================================================================

// `let`, not `const`: bun's transpiler constant-folds a captured `const` straight into the arrow
// (verified — `const secret = 42; () => secret + 1` stringifies as `() => 43`), which would make this
// test pass without the compiler doing anything.
test("the emitted function has no closure: a definition that captured a local throws ReferenceError", () => {
  const { main } = mk((m) => {
    let secret = 42;
    m.define("a", [], () => secret + 1); // closes over `secret` in the test's scope
  });
  const fn = bare(scope(main, "a"), { parse });
  expect(fn.unresolved.map((u) => u.name)).toEqual(["secret"]);
  expect(() => fn()).toThrow(ReferenceError);
});

test("strictGlobals turns an unresolved identifier into a compile-time throw", () => {
  const { main } = mk((m) => {
    let secret = 42;
    m.define("a", [], () => secret + 1);
  });
  expect(() => bare(scope(main, "a"), { parse, strictGlobals: true })).toThrow(/secret \(in a\)/);
});

test("globals and locals are not reported as unresolved", () => {
  const { main } = mk((m) => {
    m.define("a", [], () => {
      const local = Math.max(1, 2);
      const [x, ...rest] = [local, 3];
      const { p: renamed = 0 } = { p: 4 };
      try { JSON.parse("{}"); } catch (err) { return String(err); }
      return x + rest.length + renamed;
    });
  });
  const fn = bare(scope(main, "a"), { parse, strictGlobals: true });
  expect(fn.unresolved).toEqual([]);
  expect(fn()).toEqual({ a: 7 }); // 2 + rest.length 1 + 4
});

test("options.globals covers a global the compiling environment does not have", () => {
  const { main } = mk((m) => m.define("a", [], () => typeof document));
  expect(() => bare(scope(main, "a"), { parse, strictGlobals: true })).toThrow(/document \(in a\)/);
  expect(bare(scope(main, "a"), { parse, strictGlobals: true, globals: ["document"] }).unresolved).toEqual([]);
});

test("emitted code is strict, so an accidental global assignment throws", () => {
  const { main } = mk((m) => m.define("a", [], function () { leak = 1; return 1; })); // eslint-disable-line
  const fn = bare(scope(main, "a"), { parse });
  expect(() => fn()).toThrow(ReferenceError);
});

test("without options.parse the scan is skipped and says so", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  expect(bare(scope(main, "a")).diagnostics.map((d) => d.code)).toContain("scan-skipped");
});

// ===========================================================================
// loud refusals
// ===========================================================================

const refusal = (define, names, options) => {
  const { main } = mk(define);
  try {
    bare(scope(main, ...names), options);
  } catch (e) {
    return e.message;
  }
  throw new Error("expected compileDataflow to refuse");
};

test("an async definition compiles to `await`, and the function becomes async", async () => {
  const { main } = mk((m) => {
    m.define("a", [], async () => 1);
    m.define("b", ["a"], (a) => a + 1);
  });
  const fn = bare(scope(main, "a", "b"));
  expect(fn.isAsync).toBe(true);
  expect(fn.asyncCells).toEqual(["a"]);
  expect(fn.source.startsWith("async function")).toBe(true);
  expect(await fn()).toEqual({ b: 2 });
});

test("only the async definitions are awaited, not every cell downstream of one", async () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], async (a) => a + 1); // the only async cell
    m.define("c", ["b"], (b) => b * 2);
    m.define("d", ["c"], (c) => c + 5);
  });
  const fn = bare(scope(main, "a", "b", "c", "d"));
  expect(fn.isAsync).toBe(true);
  expect(fn.awaits).toBe(1);
  expect((fn.source.match(/await \$d/g) || []).length).toBe(1);  // one cell suspends unconditionally
  expect((fn.source.match(/\$thenable/g) || []).length).toBe(4); // the other three test, 1 declaration
  expect(fn.maybeAwaits).toBe(3);
  // the crux: `c` reads b's RESOLVED value, because the await sits on b's own assignment. If it did
  // not, `b * 2` would be NaN rather than 4.
  expect(await fn()).toEqual({ d: 9 });
});

test("a subgraph with nothing async stays synchronous", () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a + 1);
  });
  const fn = bare(scope(main, "a", "b"));
  expect(fn.isAsync).toBe(false);
  expect(fn()).toEqual({ b: 2 }); // not a promise
});

test("a sync definition that returns a promise is picked up when the graph is already async", async () => {
  const { main } = mk((m) => {
    m.define("data", [], () => Promise.resolve(41)); // sync fn, promise value: constructor.name says "Function"
    m.define("tick", [], async () => 1);
    m.define("out", ["data", "tick"], (d, t) => d + t);
  });
  const fn = bare(scope(main, "data", "tick", "out"));
  expect(fn.awaits).toBe(1);      // only `tick` is known to suspend
  expect(await fn()).toEqual({ out: 42 }); // …and `data` suspends anyway, because the value said so
});

test("alone in a sync graph that promise throws, and fn.asAsync is the way out", async () => {
  const { main } = mk((m) => m.define("a", [], () => Promise.resolve(7)));
  const fn = bare(scope(main, "a"));
  expect(fn.isAsync).toBe(false);
  expect(() => fn()).toThrow(/a returned a Promise/);
  expect(fn.asAsync.isAsync).toBe(true);
  expect(fn.asAsync.awaits).toBe(0);       // nothing is known to suspend; the conditional finds it
  expect(await fn.asAsync()).toEqual({ a: 7 });
  expect(fn.asAsync).toBe(fn.asAsync);     // built once, on demand
});

test("the async option is gone, and says so rather than being ignored", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  for (const v of [true, false, "auto", "yes"])
    expect(() => bare(scope(main, "a"), { async: v })).toThrow(/option "async" no longer exists/);
});

test("a generator definition is refused", () => {
  const msg = refusal((m) => {
    m.define("ticks", [], function* () { yield 1; });
    m.define("b", ["ticks"], (t) => t);
  }, ["ticks", "b"]);
  expect(msg).toMatch(/ticks is a generator function, so its value is a stream/);
});

test("an async generator definition is refused", () => {
  const msg = refusal((m) => {
    m.define("ticks", [], async function* () { yield 1; });
    m.define("b", ["ticks"], (t) => t);
  }, ["ticks", "b"]);
  expect(msg).toMatch(/ticks is an async generator function, so its value is a stream/);
});

test("the value half of a viewof is refused", () => {
  const msg = refusal((m) => {
    m.define("viewof n", [], () => ({ value: 1, addEventListener() {}, removeEventListener() {} }));
    m.define("n", ["Generators", "viewof n"], (G, v) => G.input(v));
    m.define("double", ["n"], (n) => n * 2);
  }, ["viewof n", "n", "double"]);
  expect(msg).toMatch(/n is the value half of "viewof n", so its value is a stream/);
});

test('views:"snapshot" reads the view once instead of refusing it', () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => ({ value: 7, addEventListener() {}, removeEventListener() {} }));
    m.define("n", ["Generators", "viewof n"], (G, v) => G.input(v));
    m.define("double", ["n"], (n) => n * 2);
  });
  const fn = bare(scope(main, "viewof n", "n", "double"), { views: "snapshot", outputs: ["double"] });
  expect(fn.snapshots).toEqual(["n"]);
  expect(fn()).toEqual({ double: 14 });
  // the Generators builtin was only there to make the generator; snapshotting drops the requirement
  expect(fn.captureNames).toEqual([]);
  expect(fn.source).toContain(".value; // n, snapshotted");
});

test('views:"snapshot" on a CAPTURED view reads the live widget through the capture parameter', () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => ({ value: 7, addEventListener() {}, removeEventListener() {} }));
    m.define("n", ["Generators", "viewof n"], (G, v) => G.input(v));
    m.define("double", ["n"], (n) => n * 2);
  });
  // only the value half and its consumer are compiled, so `viewof n` stays outside as a capture
  const fn = bare(scope(main, "n", "double"), { views: "snapshot", outputs: ["double"] });
  expect(fn.captureNames).toEqual(["viewof n"]);
  const widget = { value: 20 };
  expect(fn({}, { "viewof n": widget })).toEqual({ double: 40 });
  widget.value = 3; // read at call time, not compile time
  expect(fn({}, { "viewof n": widget })).toEqual({ double: 6 });
});

test('views:"snapshot" still refuses a mutable — a box exists to be written to', () => {
  const { main } = mk((m) => {
    m.define("initial c", [], () => 0);
    m.define("mutable c", ["Mutable", "initial c"], (M, i) => new M(i));
    m.define("c", ["mutable c"], (mc) => mc.generator);
  });
  expect(() => bare(scope(main, "initial c", "mutable c", "c"), { views: "snapshot" })).toThrow(
    /value half of "mutable c", so its value is a stream/
  );
});

test("an unknown views mode is refused rather than ignored", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  expect(() => bare(scope(main, "a"), { views: "live" })).toThrow(/unknown views "live"/);
});

test("a mutable is refused on both halves", () => {
  const msg = refusal((m) => {
    m.define("initial count", [], () => 0);
    m.define("mutable count", ["Mutable", "initial count"], (M, i) => new M(i));
    m.define("count", ["mutable count"], (mc) => mc.generator);
  }, ["initial count", "mutable count", "count"]);
  expect(msg).toMatch(/mutable count constructs mutable count/);
  expect(msg).toMatch(/count is the value half of "mutable count", so its value is a stream/);
});

test("invalidation and visibility become ordinary capture parameters", async () => {
  const cleaned = [];
  const { main } = mk((m) => {
    // returning the sentinel is not the point (a promise would fail $check) — registering a
    // teardown against it is what cells actually do with it
    m.define("a", ["invalidation"], (inv) => (inv.then(() => 0), 1));
    m.define("b", ["invalidation", "visibility"], (inv, vis) => (inv.then(() => 0), typeof vis === "function" ? 2 : 0));
    m.define("out", ["a", "b"], (a, b) => a + b);
  });
  const fn = bare(scope(main, "a", "b", "out"));
  // one parameter per sentinel, however many cells read it: the module resolves each to one Variable
  expect(fn.captureNames.sort()).toEqual(["invalidation", "visibility"]);
  expect(fn.sentinels.sort()).toEqual(["invalidation", "visibility"]);
  let invalidate;
  const invalidation = new Promise((r) => (invalidate = r));
  expect(fn({}, { invalidation, visibility: (v) => Promise.resolve(v) })).toEqual({ out: 3 });
  // the caller owns the lifecycle, so the caller can actually fire it
  invalidation.then(() => cleaned.push("torn down"));
  invalidate();
  await Promise.resolve();
  expect(cleaned).toEqual(["torn down"]);
});

test("a cell reading @variable is still refused: there is no value to pass", () => {
  const msg = refusal((m) => {
    m.define("a", ["@variable"], (v) => v);
  }, ["a"]);
  expect(msg).toMatch(/@variable/);
});

test("captureValues() skips the sentinels rather than wedging on them", async () => {
  // module.value("invalidation") never settles — the runtime awaits the cell's value, and an
  // invalidation promise that never fires hangs the read. So run() must not attempt it.
  const { main } = mk((m) => {
    m.define("k", [], () => 2);
    m.define("a", ["invalidation", "k"], (inv, k) => k);
  });
  const fn = bare(scope(main, "a"));
  const never = new Promise(() => {});
  const caps = await Promise.race([
    fn.captureValues({ invalidation: never }),
    new Promise((r) => setTimeout(() => r("WEDGED"), 500))
  ]);
  expect(caps).not.toBe("WEDGED");
  expect(caps.k).toBe(2);
  expect((await fn.run({}, { invalidation: never })).outputs).toEqual({ a: 2 });
});

test("an implicit variable is refused rather than compiled to undefined", () => {
  const msg = refusal((m) => m.define("b", ["missing"], (x) => x), ["b", "missing"]);
  expect(msg).toMatch(/referenced but never defined/);
});

test("a cycle is refused", () => {
  const msg = refusal((m) => {
    m.define("a", ["b"], (b) => b + 1);
    m.define("b", ["a"], (a) => a + 1);
  }, ["a", "b"]);
  expect(msg).toMatch(/circular dependency/);
});

test("the deleted async-emitter options are refused by name, not ignored", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  expect(() => bare(scope(main, "a"), { mode: "stream" })).toThrow(/"mode" no longer exists/);
  expect(() => bare(scope(main, "a"), { bindViews: true })).toThrow(/"bindViews" no longer exists/);
  expect(() => bare(scope(main, "a"), { snapshot: true })).toThrow(/"snapshot" no longer exists/);
});

// ===========================================================================
// the runtime guard — what static analysis cannot see
// ===========================================================================

test("a sync definition that returns a Promise throws at call time, naming the cell", () => {
  const { main } = mk((m) => m.define("a", [], () => Promise.resolve(1)));
  const fn = bare(scope(main, "a"));
  expect(() => fn()).toThrow(/a returned a Promise; this function is synchronous by construction/);
});

test("a sync definition that returns a generator throws at call time", () => {
  const { main } = mk((m) => {
    m.define("a", [], () => {
      function* g() { yield 1; }
      return g();
    });
  });
  expect(() => bare(scope(main, "a"))()).toThrow(/a returned a generator, which is a stream/);
});

// ===========================================================================
// reactivity
// ===========================================================================

test("the live handle yields a new function when a cell is redefined", async () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a * 2);
  });
  const handle = compileDataflow(scope(main, "a", "b"), { interval: 10 });

  const first = (await handle.next()).value;
  expect(first()).toEqual({ b: 2 });
  expect(handle()).toEqual({ b: 2 });

  const pending = handle.next();
  await settle();
  main.redefine("a", [], () => 5);

  const second = (await pending).value;
  expect(second()).toEqual({ b: 10 });
  expect(handle()).toEqual({ b: 10 }); // the handle itself tracks the latest compilation
  expect(first()).toEqual({ b: 2 }); // and the superseded one still runs
  await handle.return();
});

test("a redefinition that makes the subgraph async flips the emitted function to async", async () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a * 2);
  });
  const handle = compileDataflow(scope(main, "a", "b"), { interval: 10 });
  await handle.next();
  expect(handle.isAsync).toBe(false);
  main.redefine("a", [], async () => 5);
  expect(handle.recompile()).not.toBeNull();
  expect(handle.isAsync).toBe(true);
  expect(await handle()).toEqual({ b: 10 });
  await handle.return();
});

test("a redefinition that turns a cell into a stream is refused on recompile, not truncated", async () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a * 2);
  });
  const handle = compileDataflow(scope(main, "a", "b"), { interval: 10 });
  await handle.next();
  main.redefine("a", [], function* () { yield 1; yield 2; });
  expect(() => handle.recompile()).toThrow(/a is a generator function, so its value is a stream/);
  await handle.return();
});

// ===========================================================================
// the artifact
// ===========================================================================

test("fn.source is the same code, and is publishable on its own", () => {
  const { main } = mk((m) => {
    m.define("gain", [], () => 3);
    m.define("x", [], () => 2);
    m.define("y", ["x", "gain"], (x, g) => x * g);
  });
  const fn = bare(scope(main, "x", "y"), { inputs: ["x"], outputs: ["y"], name: "amplify", parse });
  expect(fn.source).toContain("function amplify($args, $cap)");
  // eval it in a scope that has NO access to this test's bindings beyond what it declares
  const standalone = new Function(`return (${fn.source});`)();
  expect(standalone({ x: 5 }, { gain: 7 })).toEqual({ y: 35 });
});

test("run() reads the captures out of the live runtime for you", async () => {
  const { main } = mk((m) => {
    m.define("gain", [], () => 3);
    m.define("x", [], () => 2);
    m.define("y", ["x", "gain"], (x, g) => x * g);
  });
  const fn = bare(scope(main, "x", "y"), { inputs: ["x"], outputs: ["y"] });
  expect((await fn.run({ x: 5 })).outputs).toEqual({ y: 15 });
});

// ===========================================================================
// the point of the exercise
// ===========================================================================

test("an async subgraph suspends per async definition, not per cell", async () => {
  const { main } = mk((m) => {
    m.define("x", [], () => 1);
    for (let i = 0; i < 30; i++) m.define(`c${i}`, [i ? `c${i - 1}` : "x"], (p) => p + 1);
  });
  const names = ["x", ...Array.from({ length: 30 }, (_, i) => `c${i}`)];
  const sync30 = bare(scope(main, ...names), { inputs: ["x"], outputs: ["c29"] });
  const async30 = sync30.asAsync; // same subgraph, same definitions, emitted async

  expect(sync30({ x: 0 })).toEqual({ c29: 30 });
  expect(await async30({ x: 0 }, {})).toEqual({ c29: 30 });
  // Structural, because it is the property that bounds the cost: an await that suspends costs in
  // proportion to the locals live across it, and there are none of those here. What one costs is
  // measured in tools/compile-dataflow/bench.mjs, not asserted against a clock in a unit test.
  expect(async30.awaits).toBe(0);
  expect(async30.source).not.toMatch(/await \$d/);
  expect(async30.maybeAwaits).toBe(30); // `x` is an argument, so 30 cells rather than 31
});

// ===========================================================================
// the plan: what is recompiled, what is captured
// ===========================================================================

test('frontier "params" recompiles only what varies with an argument', () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = bare(null, { module: main, inputs: ["a"], outputs: ["b"] });
  expect(fn.body.map((v) => v._name)).toEqual(["b"]);
  expect(fn.captureNames).toEqual(["k"]); // constant w.r.t. `a`
  expect(fn({ a: 1 }, { k: 10 })).toEqual({ b: 11 });
});

test('frontier "all" recompiles every compilable ancestor, leaving nothing to capture', () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = bare(null, { module: main, inputs: ["a"], outputs: ["b"], frontier: "all" });
  expect(fn.body.map((v) => v._name).sort()).toEqual(["b", "k"]);
  expect(fn.captureNames).toEqual([]);
  expect(fn({ a: 1 })).toEqual({ b: 11 });
});

test("an explicit variable list behaves like cloneDataflow's template argument", () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 100);
    m.define("a", [], () => 1);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = bare(["a", "b"], { module: main, inputs: ["a"], outputs: ["b"] });
  expect(fn.body.map((v) => v._name)).toEqual(["b"]);
  expect(fn({ a: 5 }, { k: 100 })).toEqual({ b: 105 });
});

test("an imported variable is captured, never recompiled", () => {
  const runtime = new Runtime(lib);
  const other = runtime.module();
  other.define("shared", [], () => 42);
  const main = runtime.module();
  main.import("shared", other);
  main.define("uses", ["shared", "k"], (s, k) => s + k);

  const fn = bare(null, { module: main, inputs: ["k"], outputs: ["uses"], frontier: "all" });
  expect(fn.body.map((v) => v._name)).toEqual(["uses"]);
  expect(fn.captureNames).toEqual(["shared"]);
  expect(fn({ k: 1 }, { shared: 42 })).toEqual({ uses: 43 });
});

test("an unknown name is rejected at compile time", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  expect(() => bare(null, { module: main, outputs: ["nope"] })).toThrow(/no variable named "nope"/);
});

// ===========================================================================
// Notebook Kit 2.0 shapes
// ===========================================================================

test("2.0: a multi-output cell compiles as an exports object plus projections", () => {
  const { main } = mk((m) => {
    m.define("cell 1", ["seed"], (seed) => ({ p: seed + 1, q: seed * 2 }));
    m.variable(true).define("p", ["cell 1"], (e) => e.p);
    m.variable(true).define("q", ["cell 1"], (e) => e.q);
    m.define("out", ["p", "q"], (p, q) => `${p}/${q}`);
  });
  const fn = bare(null, { module: main, inputs: ["seed"], outputs: ["out"] });
  expect(fn({ seed: 3 })).toEqual({ out: "4/6" });
});

test("2.0: viewof$x goes down the same path as viewof x", () => {
  const { main } = mk((m) => {
    m.define("viewof$sel", [], () => ({ value: "a", addEventListener() {}, removeEventListener() {} }));
    m.define("sel", ["Generators", "viewof$sel"], (G, v) => G.input(v));
    m.define("out", ["sel"], (s) => s.toUpperCase());
  });
  expect(() => bare(null, { module: main, outputs: ["out"], frontier: "all" })).toThrow(
    /sel is the value half of "viewof\$sel"/
  );
  const fn = bare(null, { module: main, outputs: ["out"], frontier: "all", views: "snapshot" });
  expect(fn.snapshots).toEqual(["sel"]);
  expect(fn()).toEqual({ out: "A" });
});

test("2.0: the per-cell display shadow is refused, because it writes to the original cell", () => {
  const { main } = mk((m) => {
    const v = m.variable(true, { shadow: { display: () => (x) => x } });
    v.define("cell 1", ["display", "n"], (display, n) => display(n * 2));
    m.define("uses", ["cell 1"], (c) => c + 1);
  });
  expect(() => bare(null, { module: main, inputs: ["n"], outputs: ["uses"], frontier: "all" })).toThrow(
    /reads the per-cell builtin "display"/
  );
});

// ===========================================================================
// a real lopecode module
// ===========================================================================

test("compiles a subgraph out of a real lopecode module (define(runtime, observer))", async () => {
  const { default: define } = await import("../../modules/@tomlarkworthy/invoke-variable.js");
  const runtime = new Runtime(lib);
  const main = runtime.module(define, () => true);
  await main.value("c"); // a + b = 1 + 3

  const fn = bare(null, { module: main, inputs: ["b"], outputs: ["c"] });
  expect(fn.body.map((v) => v._name)).toEqual(["c"]);
  expect(fn.captureNames).toEqual(["a"]); // `a` stays outside, supplied by the caller
  expect(fn({ b: 20 }, { a: 1 })).toEqual({ c: 21 });
  expect((await fn.run({ b: 20 })).outputs).toEqual({ c: 21 }); // or read out of the live runtime
});
