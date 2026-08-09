// bun test tools/compile-dataflow/
//
// One small test per feature. Fixtures are deliberately tiny — each builds only the variables the
// feature under test needs, so a failure names the feature.
import { test, expect } from "bun:test";
import { Runtime } from "../../vendor/observable-runtime/src/index.js";
import { input } from "../../vendor/observable-stdlib/src/generators/input.js";
import { observe } from "../../vendor/observable-stdlib/src/generators/observe.js";
import { Mutable } from "../../vendor/observable-stdlib/src/mutable.js";
import { compileDataflow } from "./compile-dataflow.mjs";

// Minimal builtins: the full stdlib Library pulls in d3-require, which isn't installed here.
const lib = { Generators: () => ({ input, observe }), Mutable: () => Mutable };

function mk(define) {
  const runtime = new Runtime(lib);
  const main = runtime.module();
  define(main);
  return { runtime, main };
}

const settle = () => new Promise((r) => setTimeout(r, 20));
const codes = (fn) => fn.diagnostics.map((d) => d.code);
// a stand-in for an Observable Inputs view: an object with a .value
const view = (value) => ({ value, addEventListener() {}, removeEventListener() {} });

// ===========================================================================
// core: parameters, body, captures
// ===========================================================================

test("a parameter replaces its variable and the graph downstream recompiles", async () => {
  const { main } = mk((m) => {
    m.define("a", [], () => 1);
    m.define("b", ["a"], (a) => a * 2);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  expect(await fn({ a: 5 })).toEqual({ b: 10 });
  expect(await fn({ a: 7 })).toEqual({ b: 14 });
});

test("outputs may be renamed by passing an object", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: { plusOne: "b" } });
  expect(await fn({ a: 1 })).toEqual({ plusOne: 2 });
});

test("a missing argument is a clear error, not undefined", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  await expect(fn({})).rejects.toThrow(/missing required argument "a"/);
});

test("anonymous cells compile (they are addressed by Variable, not name)", async () => {
  let anon;
  const { main } = mk((m) => {
    anon = m.variable(true).define(null, ["a"], (a) => a * 3);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: { tripled: anon } });
  expect(await fn({ a: 2 })).toEqual({ tripled: 6 });
});

// ===========================================================================
// the frontier: what gets recompiled vs captured
// ===========================================================================

test('frontier "params" recompiles only what varies with an argument', () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  expect(fn.body.map((v) => v._name)).toEqual(["b"]);
  expect(fn.captures.map((v) => v._name)).toEqual(["k"]); // constant w.r.t. `a`
});

test('frontier "all" recompiles every compilable ancestor', () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], frontier: "all" });
  expect(fn.body.map((v) => v._name).sort()).toEqual(["b", "k"]);
  expect(fn.captures).toEqual([]);
});

test("captures are re-read from the live runtime on every call", async () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  expect(await fn({ a: 1 })).toEqual({ b: 11 });
  main.redefine("k", [], () => 100);
  await settle();
  expect(await fn({ a: 1 })).toEqual({ b: 101 });
});

test("snapshot:true freezes captures at compile time", async () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], snapshot: true });
  expect(await fn({ a: 1 })).toEqual({ b: 11 });
  main.redefine("k", [], () => 100);
  await settle();
  expect(await fn({ a: 1 })).toEqual({ b: 11 });
});

test("an explicit variable list behaves like cloneDataflow's template argument", async () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 100);
    m.define("a", [], () => 1);
    m.define("b", ["a", "k"], (a, k) => a + k);
  });
  const fn = compileDataflow(["a", "b"], { module: main, inputs: ["a"], outputs: ["b"] });
  expect(fn.body.map((v) => v._name)).toEqual(["b"]);
  expect(await fn({ a: 5 })).toEqual({ b: 105 });
});

// ===========================================================================
// async
// ===========================================================================

test("an async cell is awaited before its dependents run", async () => {
  const { main } = mk((m) => {
    m.define("x", [], async () => (await settle(), 7));
    m.define("y", ["x", "k"], (x, k) => x * k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["k"], outputs: ["y"], frontier: "all" });
  expect(await fn({ k: 3 })).toEqual({ y: 21 });
});

// ===========================================================================
// viewof
// ===========================================================================

test("viewof: parameterising the VALUE never reaches the view", async () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => view(2));
    m.define("n", ["Generators", "viewof n"], (G, _) => G.input(_));
    m.define("sq", ["n"], (n) => n * n);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["sq"] });
  expect(fn.body.map((v) => v._name)).toEqual(["sq"]); // no view built, no Generators.input
  expect(await fn({ n: 5 })).toEqual({ sq: 25 });
});

test("viewof: a view kept in the body yields its first value", async () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => view(2));
    m.define("n", ["Generators", "viewof n"], (G, _) => G.input(_));
    m.define("sq", ["n"], (n) => n * n);
  });
  const fn = compileDataflow(null, { module: main, outputs: ["sq"], frontier: "all" });
  expect(fn.body.map((v) => v._name).sort()).toEqual(["n", "sq", "viewof n"]);
  expect(await fn({})).toEqual({ sq: 4 });
});

test("viewof: parameterising the value while the view is reachable is diagnosed", async () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => view(2));
    m.define("n", ["Generators", "viewof n"], (G, _) => G.input(_));
    m.define("label", ["viewof n", "n"], (v, n) => `${v.value}/${n}`);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["label"], frontier: "all" });
  expect(codes(fn)).toContain("param-shadowed-by-view");
  expect(await fn({ n: 9 })).toEqual({ label: "2/9" }); // the view sits at its own default
});

test("viewof: bindViews:true pushes the argument onto the rebuilt view", async () => {
  const { main } = mk((m) => {
    m.define("viewof n", [], () => view(2));
    m.define("n", ["Generators", "viewof n"], (G, _) => G.input(_));
    m.define("label", ["viewof n", "n"], (v, n) => `${v.value}/${n}`);
  });
  const fn = compileDataflow(null, {
    module: main,
    inputs: ["n"],
    outputs: ["label"],
    frontier: "all",
    bindViews: true
  });
  expect(await fn({ n: 9 })).toEqual({ label: "9/9" });
});

// ===========================================================================
// mutable
// ===========================================================================

const withMutable = (m, extra) => {
  m.define("initial total", [], () => 0);
  m.define("mutable total", ["Mutable", "initial total"], (M, _) => new M(_));
  m.define("total", ["mutable total"], (_) => _.generator);
  extra(m);
};

test("mutable: the compiler orders writers before readers", async () => {
  const { main } = mk((m) =>
    withMutable(m, (m) => {
      m.define("add", ["mutable total", "n"], (t, n) => void (t.value += n));
      m.define("report", ["add", "total"], (_, total) => total);
    })
  );
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["report"], frontier: "all" });
  expect(await fn({ n: 5 })).toEqual({ report: 5 });
  expect(codes(fn)).not.toContain("mutable-write-after-read");
});

test("mutable: a read-modify-write cell has no single-pass fixed point", () => {
  const { main } = mk((m) =>
    withMutable(m, (m) => {
      m.define("rmw", ["mutable total", "total", "n"], (t, total, n) => void (t.value = total + n));
    })
  );
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["rmw"], frontier: "all" });
  expect(codes(fn)).toContain("mutable-write-after-read");
});

test("mutable: writing to a CAPTURED mutable escapes into the live notebook", () => {
  const { main } = mk((m) =>
    withMutable(m, (m) => m.define("add", ["mutable total", "n"], (t, n) => void (t.value += n)))
  );
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["add"] });
  expect(codes(fn)).toContain("mutable-write-escapes");
});

test("mutable: compiling it at all is reported, because assignment stops being reactive", () => {
  const { main } = mk((m) =>
    withMutable(m, (m) => m.define("add", ["mutable total", "n"], (t, n) => void (t.value += n)))
  );
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["add"], frontier: "all" });
  expect(codes(fn)).toContain("mutable-in-body");
});

// ===========================================================================
// generators
// ===========================================================================

test("once mode takes a generator's first value", async () => {
  const { main } = mk((m) => {
    m.define("ticks", [], function* () {
      let i = 0;
      while (true) yield i++;
    });
    m.define("doubled", ["ticks"], (t) => t * 2);
  });
  const fn = compileDataflow(null, { module: main, outputs: ["doubled"] });
  expect(await fn({})).toEqual({ doubled: 0 });
});

test("once mode disposes the generator and reports the truncation", async () => {
  let disposed = false;
  const { main } = mk((m) => {
    m.define("ticks", [], function* () {
      try {
        let i = 0;
        while (true) yield i++;
      } finally {
        disposed = true;
      }
    });
    m.define("doubled", ["ticks"], (t) => t * 2);
  });
  const fn = compileDataflow(null, { module: main, outputs: ["doubled"] });
  const { truncated } = await fn.run({});
  expect(truncated).toEqual(["ticks"]);
  expect(disposed).toBe(true);
});

test("stream mode re-runs the downstream slice per yielded value", async () => {
  const { main } = mk((m) => {
    m.define("ticks", [], async function* () {
      for (let i = 0; i < 4; i++) yield i;
    });
    m.define("scaled", ["ticks", "k"], (t, k) => t * k);
  });
  const fn = compileDataflow(null, {
    module: main,
    inputs: ["k"],
    outputs: ["scaled"],
    mode: "stream",
    driver: "ticks"
  });
  const seen = [];
  for await (const v of fn({ k: 10 })) seen.push(v.scaled);
  expect(seen).toEqual([0, 10, 20, 30]);
});

test("stream mode pulls the driver into the body even when it is argument-independent", () => {
  const { main } = mk((m) => {
    m.define("ticks", [], async function* () {
      yield 1;
    });
    m.define("scaled", ["ticks", "k"], (t, k) => t * k);
  });
  const fn = compileDataflow(null, {
    module: main,
    inputs: ["k"],
    outputs: ["scaled"],
    mode: "stream",
    driver: "ticks"
  });
  expect(fn.body.map((v) => v._name)).toContain("ticks");
});

test('stream mode without a driver is refused', () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a));
  expect(() => compileDataflow(null, { module: main, outputs: ["b"], mode: "stream" })).toThrow(
    /requires options\.driver/
  );
});

// ===========================================================================
// runtime sentinels
// ===========================================================================

test("invalidation resolves when the call is disposed", async () => {
  const { main } = mk((m) =>
    m.define("res", ["invalidation"], (inv) => {
      let cleaned = false;
      inv.then(() => (cleaned = true));
      return () => cleaned;
    })
  );
  const fn = compileDataflow(null, { module: main, outputs: ["res"] });
  const { outputs, dispose } = await fn.run({});
  expect(outputs.res()).toBe(false);
  dispose();
  await settle();
  expect(outputs.res()).toBe(true);
});

test("visibility resolves immediately", async () => {
  const { main } = mk((m) => m.define("res", ["visibility"], async (vis) => await vis("shown")));
  const fn = compileDataflow(null, { module: main, outputs: ["res"] });
  expect(await fn({})).toEqual({ res: "shown" });
});

test("`this` is undefined and the risk is flagged", async () => {
  const { main } = mk((m) =>
    m.define("acc", ["n"], function (n) {
      return (this ?? 0) + n;
    })
  );
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["acc"] });
  expect(codes(fn)).toContain("this-reference");
  expect(await fn({ n: 3 })).toEqual({ acc: 3 });
  expect(await fn({ n: 3 })).toEqual({ acc: 3 }); // no accumulation across calls
});

// ===========================================================================
// things that cannot be recompiled
// ===========================================================================

test("an imported variable is captured, never recompiled", async () => {
  const runtime = new Runtime(lib);
  const other = runtime.module();
  other.define("shared", [], () => 42);
  const main = runtime.module();
  main.import("shared", other);
  main.define("uses", ["shared", "k"], (s, k) => s + k);

  const fn = compileDataflow(null, { module: main, inputs: ["k"], outputs: ["uses"], frontier: "all" });
  expect(fn.body.map((v) => v._name)).toEqual(["uses"]);
  expect(fn.captures.map((v) => v._name)).toEqual(["shared"]);
  expect(await fn({ k: 1 })).toEqual({ uses: 43 });
});

test("a referenced-but-undefined variable surfaces the runtime's own error", async () => {
  const { main } = mk((m) => m.define("uses", ["nowhere"], (n) => n));
  const fn = compileDataflow(null, { module: main, outputs: ["uses"] });
  expect(fn.captures.map((v) => v._name)).toEqual(["nowhere"]);
  await expect(fn({})).rejects.toThrow(/nowhere is not defined/);
});

test("a cycle inside the subgraph is a compile-time error", () => {
  const { main } = mk((m) => {
    m.define("a", ["b"], (b) => b);
    m.define("b", ["a"], (a) => a);
  });
  expect(() => compileDataflow(["a", "b"], { module: main, outputs: ["a"] })).toThrow(/circular dependency/);
});

test("an unknown name is rejected at compile time", () => {
  const { main } = mk((m) => m.define("a", [], () => 1));
  expect(() => compileDataflow(null, { module: main, outputs: ["nope"] })).toThrow(/no variable named "nope"/);
});

// ===========================================================================
// Notebook Kit 2.0 shapes
// ===========================================================================

test("2.0: a multi-output cell compiles as an exports object plus projections", async () => {
  const { main } = mk((m) => {
    m.define("cell 1", ["seed"], (seed) => ({ p: seed + 1, q: seed * 2 }));
    m.variable(true).define("p", ["cell 1"], (e) => e.p);
    m.variable(true).define("q", ["cell 1"], (e) => e.q);
    m.define("out", ["p", "q"], (p, q) => `${p}/${q}`);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["seed"], outputs: ["out"] });
  expect(await fn({ seed: 3 })).toEqual({ out: "4/6" });
});

test("2.0: viewof$x is handled by the same path as viewof x", async () => {
  const { main } = mk((m) => {
    m.define("viewof$sel", [], () => view("a"));
    m.define("sel", ["Generators", "viewof$sel"], (G, _) => G.input(_));
    m.define("out", ["sel"], (s) => s.toUpperCase());
  });
  const fn = compileDataflow(null, { module: main, outputs: ["out"], frontier: "all" });
  expect(await fn({})).toEqual({ out: "A" });
});

test("2.0: mutable$x is recognised as the settable handle", async () => {
  const { main } = mk((m) => {
    m.define("mutable count", [], () => 0); // 2.0 stores the INITIAL value under this name
    m.define("cell 1", ["mutable count"], (v) => {
      let value = v;
      const box = {
        get value() {
          return value;
        },
        set value(x) {
          value = x;
        }
      };
      return [{ current: () => value }, box];
    });
    m.define("count", ["cell 1"], ([live]) => live.current());
    m.define("mutable$count", ["cell 1"], ([, mutator]) => mutator);
    m.define("bump", ["mutable$count", "n"], (mut, n) => void (mut.value += n));
    m.define("after", ["bump", "count"], (_, count) => count);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["after"], frontier: "all" });
  expect(codes(fn)).toContain("mutable-in-body");
  expect(await fn({ n: 4 })).toEqual({ after: 4 });
});

test("2.0: the per-cell `display` shadow is replaced, not captured", async () => {
  const rendered = [];
  const { main } = mk((m) => {
    const v = m.variable(true, { shadow: { display: () => (x) => (rendered.push(x), x) } });
    v.define("cell 1", ["display", "n"], (display, n) => display(n * 2));
    m.define("uses", ["cell 1"], (c) => c + 1);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["n"], outputs: ["uses"], frontier: "all" });
  const { outputs, displayed } = await fn.run({ n: 5 });
  expect(outputs).toEqual({ uses: 11 });
  expect(displayed).toEqual([10]); // collected by the compiler...
  expect(rendered).toEqual([]); // ...not rendered into the original cell
});

test("2.0: options.shadows overrides the headless display", async () => {
  const seen = [];
  const { main } = mk((m) => {
    const v = m.variable(true, { shadow: { display: () => (x) => x } });
    v.define("cell 1", ["display", "n"], (display, n) => display(n));
  });
  const fn = compileDataflow(null, {
    module: main,
    inputs: ["n"],
    outputs: ["cell 1"],
    frontier: "all",
    shadows: { display: (x) => (seen.push(x), x) }
  });
  await fn({ n: 3 });
  expect(seen).toEqual([3]);
});

// ===========================================================================
// distilled source
// ===========================================================================

test("toSource emits standalone code with captures lifted to a parameter", async () => {
  const { main } = mk((m) => {
    m.define("scale", [], () => 3);
    m.define("y", ["x", "scale"], (x, s) => x * s);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["y"] });
  const { source, captures, params } = fn.toSource({ name: "scaleIt" });
  expect(captures).toEqual(["scale"]);
  expect(params).toEqual(["x"]);

  const file = `${import.meta.dir}/.tmp-distilled.mjs`;
  await Bun.write(file, source + "\nexport {scaleIt};");
  const mod = await import(file);
  expect(await mod.scaleIt({ x: 4 }, { scale: 3 })).toEqual({ y: 12 });
});

test("fn.source is the emitted body, in topological order", () => {
  const { main } = mk((m) => {
    m.define("b", ["a"], (a) => a + 1);
    m.define("c", ["b"], (b) => b * 2);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["c"] });
  expect(fn.source.indexOf("/* b */")).toBeLessThan(fn.source.indexOf("/* c */"));
});

// ===========================================================================
// a real lopecode module
// ===========================================================================

test("compiles a subgraph out of a real lopecode module (define(runtime, observer))", async () => {
  const { default: define } = await import("../../modules/@tomlarkworthy/invoke-variable.js");
  const runtime = new Runtime(lib);
  const main = runtime.module(define, () => true);
  await main.value("c"); // a + b = 1 + 3

  const fn = compileDataflow(null, { module: main, inputs: ["b"], outputs: ["c"] });
  expect(fn.body.map((v) => v._name)).toEqual(["c"]);
  expect(fn.captures.map((v) => v._name)).toEqual(["a"]); // `a` stays shared with the notebook
  expect(await fn({ b: 20 })).toEqual({ c: 21 });
});

// ===========================================================================
// staleness: compilation is a snapshot, not a reactive binding
// ===========================================================================

test("captures are re-read from the live runtime on every call", async () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 10);
    m.define("scale", ["x", "k"], (x, k) => x * k);
  });
  const fn = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["scale"] });
  expect(fn.captures.map((v) => v._name)).toEqual(["k"]);
  expect(await fn({ x: 2 })).toEqual({ scale: 20 });
  main.redefine("k", [], () => 100);
  await main.value("k");
  expect(await fn({ x: 2 })).toEqual({ scale: 200 });
});

test("body definitions are frozen at compile time; recompile to follow edits", async () => {
  const { main } = mk((m) => m.define("scale", ["x"], (x) => x * 10));
  const fn = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["scale"] });
  expect(await fn({ x: 2 })).toEqual({ scale: 20 });
  main.redefine("scale", ["x"], (x) => x * 10 + 1);
  await main.value("scale").catch(() => {});
  expect(await fn({ x: 2 })).toEqual({ scale: 20 });
  const fresh = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["scale"] });
  expect(await fresh({ x: 2 })).toEqual({ scale: 21 });
});

// ===========================================================================
// live: the handle is an async generator that re-emits on code change
// ===========================================================================

const ticks = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 5)); };

function manualWatch() {
  let notify = null;
  const watch = (cb) => { notify = cb; return () => (notify = null); };
  return { watch, fire: () => notify && notify(), get armed() { return !!notify; } };
}

test("the handle is generatorish, so the Observable runtime iterates it", () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  expect(typeof fn.next).toBe("function");
  expect(typeof fn.return).toBe("function");
  expect(fn.live).toBe(true);
});

test("live: false gives a bare function with no generator protocol", () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], live: false });
  expect(fn.next).toBeUndefined();
  expect(fn.return).toBeUndefined();
});

test("the first .next() yields the compiled function immediately", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"] });
  const { done, value } = await fn.next();
  expect(done).toBe(false);
  expect(await value({ a: 1 })).toEqual({ b: 2 });
  await fn.return();
});

test("a redefine in the body yields a freshly compiled function", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const w = manualWatch();
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], watch: w.watch });
  await fn.next();
  const pull = fn.next();
  await ticks(1);
  main.redefine("b", ["a"], (a) => a + 100);
  w.fire();
  const { done, value } = await pull;
  expect(done).toBe(false);
  expect(await value({ a: 1 })).toEqual({ b: 101 });
  await fn.return();
});

test("a notification with nothing changed does not yield", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const w = manualWatch();
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], watch: w.watch });
  await fn.next();
  let yielded = false;
  fn.next().then(() => (yielded = true));
  await ticks(1);
  w.fire();
  await ticks(2);
  expect(yielded).toBe(false);
  await fn.return();
});

test("without a watch it polls, and picks the change up", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], interval: 5 });
  await fn.next();
  const pull = fn.next();
  await ticks(1);
  main.redefine("b", ["a"], (a) => a * 3);
  const { value } = await pull;
  expect(await value({ a: 4 })).toEqual({ b: 12 });
  await fn.return();
});

test(".return() closes the stream and unsubscribes the watch", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const w = manualWatch();
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], watch: w.watch });
  await fn.next();
  const pull = fn.next();
  await ticks(1);
  expect(w.armed).toBe(true);
  expect(await fn.return()).toEqual({ done: true, value: undefined });
  expect(await pull).toEqual({ done: true, value: undefined });
  expect(w.armed).toBe(false);
  expect(await fn.next()).toEqual({ done: true, value: undefined });
});

test("the handle itself tracks the latest compilation", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const w = manualWatch();
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], watch: w.watch });
  expect(await fn({ a: 1 })).toEqual({ b: 2 });
  main.redefine("b", ["a"], (a) => a + 100);
  expect(fn.recompile()).not.toBeNull();
  expect(await fn({ a: 1 })).toEqual({ b: 101 }); // calling the handle runs the newest compilation
  expect(fn.source).toContain("/* b */");
  await fn.return();
});

test("as a cell value, the handle makes downstream recompute on a code change", async () => {
  const { main } = mk((m) => {
    m.define("k", [], () => 2);
    m.define("scale", ["x", "k"], (x, k) => x * k);
  });
  const w = manualWatch();
  main.define("compiled", [], () =>
    compileDataflow(null, { module: main, inputs: ["x"], outputs: ["scale"], watch: w.watch }));

  const seen = [];
  main.variable({ fulfilled: (v) => seen.push(v.scale) }).define("out", ["compiled"], (f) => f({ x: 3 }));
  await ticks();
  expect(seen).toEqual([6]);

  main.redefine("scale", ["x", "k"], (x, k) => x * k + 1);
  w.fire();
  await ticks();
  expect(seen).toEqual([6, 7]); // downstream saw a brand new function, with no runtime dependency on `scale`
});

// ===========================================================================
// resource release
// ===========================================================================

test(".return() releases contexts the compiled function still holds", async () => {
  let cleaned = 0;
  const { main } = mk((m) =>
    m.define("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x })));
  const fn = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["widget"] });
  await fn({ x: 1 });
  await fn({ x: 2 });
  await fn.next();
  expect(cleaned).toBe(0); // a built widget outlives the call — nothing is torn down early
  await fn.return();
  await ticks(2);
  expect(cleaned).toBe(2);
});

test("superseding a compilation disposes everything it built", async () => {
  let cleaned = 0;
  const { main } = mk((m) =>
    m.define("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x })));
  const w = manualWatch();
  const fn = compileDataflow(null, { module: main, inputs: ["x"], outputs: ["widget"], watch: w.watch });
  await fn({ x: 1 });
  await fn.next();
  const pull = fn.next();
  await ticks(1);
  main.redefine("widget", ["x", "invalidation"], (x, inv) => (inv.then(() => cleaned++), { x: x * 2 }));
  w.fire();
  await pull;
  await ticks(2);
  expect(cleaned).toBe(1);
  await fn.return();
});

test(".return() terminates a streaming cell's generator", async () => {
  let stopped = false;
  const { main } = mk((m) =>
    m.define("stream", ["x"], async function* (x) {
      try { for (let i = 1; ; i++) { yield x + i; await new Promise((r) => setTimeout(r, 5)); } }
      finally { stopped = true; }
    }));
  const fn = compileDataflow(null, {
    module: main, inputs: ["x"], outputs: ["stream"], mode: "stream", driver: "stream"
  });
  const it = fn({ x: 0 });
  expect((await it.next()).value).toEqual({ stream: 1 });
  await fn.next();
  await fn.return();
  await ticks(3);
  expect(stopped).toBe(true);
});

test("fn.dispose() reports how many contexts it released", async () => {
  const { main } = mk((m) => m.define("b", ["a"], (a) => a + 1));
  const fn = compileDataflow(null, { module: main, inputs: ["a"], outputs: ["b"], live: false });
  await fn({ a: 1 });
  await fn({ a: 2 });
  expect(fn.dispose()).toBe(2);
  expect(fn.dispose()).toBe(0);
});
