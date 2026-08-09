// bun test tools/dataflow-templating-2/
//
// The load-bearing test is "primary runtime variable count stays flat" — that is the whole reason
// this exists. The rest guard the mechanics that make it possible.
//
// vendor/ is not checked out in the worktree (no network to clone submodules here), so these
// resolve to the main checkout at <repo>/vendor — the worktree is always <repo>/worktrees/<name>.
import { test, expect } from "bun:test";
import { Runtime } from "../../../../vendor/observable-runtime/src/index.js";
import { input } from "../../../../vendor/observable-stdlib/src/generators/input.js";
import { observe } from "../../../../vendor/observable-stdlib/src/generators/observe.js";
import { Mutable } from "../../../../vendor/observable-stdlib/src/mutable.js";
import { instantiateDataflowFactory } from "./instantiate-dataflow.mjs";

const lib = { Generators: () => ({ input, observe }), Mutable: () => Mutable };
const settle = (n = 6) => new Promise((r) => setTimeout(r, n * 8));

function primary(define) {
  const runtime = new Runtime(lib);
  const main = runtime.module();
  define(main);
  return { runtime, main };
}

const pick = (main, names) => names.map((n) => main._scope.get(n));
const countPrimary = (runtime) => runtime._variables.size;

// ---------------------------------------------------------------------------
// mechanics
// ---------------------------------------------------------------------------

test("instantiates a template into a separate runtime and computes it", async () => {
  const { runtime, main } = primary((m) => {
    m.define("base", [], () => 2);
    m.define("doubled", ["base"], (b) => b * 2);
    m.define("label", ["doubled"], (d) => `v=${d}`);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["doubled", "label"]));

  expect(await inst.value("label")).toBe("v=4");
  expect(inst.module._runtime).not.toBe(runtime);
  expect(inst.captures).toEqual(["base"]);
  make.destroy();
});

test("body variables keep their real names — no uid mangling", async () => {
  const { main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("doubled", ["base"], (b) => b * 2);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["doubled"]));
  await inst.value("doubled");
  expect([...inst.module._scope.keys()]).toContain("doubled");
  expect([...inst.module._scope.keys()].some((n) => n.startsWith("dynamic "))).toBe(false);
  make.destroy();
});

test("captures stay live across the runtime boundary", async () => {
  const { main } = primary((m) => {
    m.define("viewof src", [], () => ({ value: 1, addEventListener() {}, removeEventListener() {} }));
    m.define("src", ["Generators", "viewof src"], (G, v) => G.input(v));
    m.define("doubled", ["src"], (s) => s * 2);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["doubled"]));

  const seen = [];
  inst.observe("doubled", { fulfilled: (v) => seen.push(v) });
  await settle();
  expect(seen).toEqual([2]);

  const view = await main.value("viewof src");
  view.value = 5;
  view.dispatchEvent = undefined;
  // Generators.input listens for "input"; drive the primary variable directly instead.
  main.redefine("src", [], () => 5);
  await settle();
  expect(seen).toEqual([2, 10]);
  make.destroy();
});

test("params are injected and shadow a template variable of the same name", async () => {
  const { main } = primary((m) => {
    m.define("seed", [], () => 1);
    m.define("total", ["seed"], (s) => s + 100);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["seed", "total"]), { params: { seed: 7 } });
  expect(await inst.value("total")).toBe(107);
  // the origin is untouched
  expect(await main.value("total")).toBe(101);
  make.destroy();
});

test("observers receive values, same shape as cloneDataflow's observerFactory", async () => {
  const { main } = primary((m) => {
    m.define("base", [], () => 3);
    m.define("out", ["base"], (b) => b * 3);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const got = [];
  const inst = make(pick(main, ["out"]), {
    observers: (name) => (name === "out" ? { fulfilled: (v) => got.push(v) } : {})
  });
  await settle();
  expect(got).toEqual([9]);
  make.destroy();
});

test("sentinels are not bridged — invalidation resolves in the sandbox", async () => {
  const { main } = primary((m) => {
    m.define("thing", ["invalidation"], (inv) => {
      const box = { closed: false };
      inv.then(() => (box.closed = true));
      return box;
    });
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["thing"]));
  expect(inst.captures).not.toContain("invalidation");
  const box = await inst.value("thing");
  expect(box.closed).toBe(false);
  inst.dispose();
  await settle();
  expect(box.closed).toBe(true);
  make.destroy();
});

// ---------------------------------------------------------------------------
// the point of the exercise
// ---------------------------------------------------------------------------

test("primary runtime variable count stays flat as instances multiply", async () => {
  const { runtime, main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("scale", [], () => 10);
    m.define("a", ["base", "scale"], (b, s) => b * s);
    m.define("b", ["a"], (a) => a + 1);
    m.define("c", ["b"], (b) => `#${b}`);
  });
  const template = pick(main, ["a", "b", "c"]);
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });

  const before = countPrimary(runtime);
  const instances = [];
  for (let i = 0; i < 50; i++) instances.push(make(template));
  await Promise.all(instances.map((i) => i.value("c")));
  const after = countPrimary(runtime);

  // 50 instances x 3 body variables would be 150 under cloneDataflow.
  expect(after - before).toBe(2); // one bridge each for `base` and `scale`
  expect(make.stats().bridges).toBe(2);
  expect(make.stats().modules).toBe(50);

  for (const i of instances) i.dispose();
  await settle();
  expect(countPrimary(runtime)).toBe(before);
  expect(make.stats().bridges).toBe(0);
  make.destroy();
});

test("no variable in the primary runtime is named `dynamic ` except bridges", async () => {
  const { runtime, main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("out", ["base"], (b) => b + 1);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["out"]));
  await inst.value("out");
  const dyn = [...runtime._variables].filter(
    (v) => typeof v._name === "string" && v._name.startsWith("dynamic ")
  );
  expect(dyn.length).toBe(1);
  expect(dyn[0]._name).toMatch(/^dynamic bridge base /);
  make.destroy();
});

// ---------------------------------------------------------------------------
// lifecycle
// ---------------------------------------------------------------------------

test("dispose tears the instance down and is idempotent", async () => {
  const { main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("out", ["base"], (b) => b + 1);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make(pick(main, ["out"]));
  await inst.value("out");
  expect(inst.module._scope.size).toBeGreaterThan(0);
  expect(inst.dispose()).toBe(true);
  expect(inst.dispose()).toBe(false);
  expect(inst.module._scope.size).toBe(0);
  make.destroy();
});

test("bridges are shared by name and refcounted, not created per instance", async () => {
  const { main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("out", ["base"], (b) => b + 1);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const a = make(pick(main, ["out"]));
  const b = make(pick(main, ["out"]));
  await Promise.all([a.value("out"), b.value("out")]);
  expect(make.stats().bridges).toBe(1);

  a.dispose();
  expect(make.stats().bridges).toBe(1); // still held by b
  b.dispose();
  expect(make.stats().bridges).toBe(0);
  make.destroy();
});

test("watch re-defines a body variable whose source definition changed", async () => {
  const { main } = primary((m) => {
    m.define("base", [], () => 1);
    m.define("out", ["base"], (b) => b + 1);
  });
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  let fire = null;
  const seen = [];
  const inst = make(pick(main, ["out"]), {
    watch: (cb) => ((fire = cb), () => (fire = null)),
    observers: (n) => (n === "out" ? { fulfilled: (v) => seen.push(v) } : {})
  });
  await settle();
  expect(seen).toEqual([2]);

  main.redefine("out", ["base"], (b) => b + 1000);
  fire();
  await settle();
  expect(seen).toEqual([2, 1001]);
  make.destroy();
});

test("diagnostics flag a template spanning two modules", async () => {
  const runtime = new Runtime(lib);
  const a = runtime.module();
  const b = runtime.module();
  a.define("x", [], () => 1);
  b.define("y", [], () => 2);
  const make = instantiateDataflowFactory(Runtime, { builtins: lib });
  const inst = make([a._scope.get("x"), b._scope.get("y")]);
  expect(inst.diagnostics.map((d) => d.code)).toContain("warn/mixed-modules");
  make.destroy();
});
