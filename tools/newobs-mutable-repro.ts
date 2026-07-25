// Local repro of the new.observablehq.com breakage, using notebook-kit's stdlib Mutable
// with @observablehq/runtime 6 (exactly what new.observablehq.com ships).
//
// Legacy Observable compiles `mutable x = 0` to three variables, where "mutable x" is
// `new Mutable(initial x)` and is expected to be a {generator, value} BOX.
// notebook-kit's Mutable instead returns the GENERATOR ITSELF (with a .value accessor),
// so the runtime unwraps it and "mutable x" settles to the yielded value (0).
// Any legacy cell that writes `mutableX.value = ...` then throws
//   TypeError: Cannot create property 'value' on number '0'
// which is what breaks @mootari/access-runtime@939 -> @tomlarkworthy/runtime-sdk `runtime`.
import { Runtime } from "../vendor/notebook-kit/node_modules/@observablehq/runtime/src/index.js";
import { Mutable } from "../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";

const builtins = { Mutable: () => Mutable };

function observeOnce(name: string) {
  let resolve: (v: any) => void, reject: (e: any) => void;
  const promise = new Promise<any>((res, rej) => ((resolve = res), (reject = rej)));
  return {
    promise,
    observer: {
      pending: () => {},
      fulfilled: (v: any) => resolve(v),
      rejected: (e: any) => reject(e),
    },
  };
}

// ---- arm A: access-runtime@939 (legacy `mutable`) --------------------------------
function defineLegacy(runtime: any, observer: any) {
  const main = runtime.module();
  main.variable(observer("runtime")).define("runtime", ["recomputeTrigger", "captureRuntime"], (a: any, b: any) => (a, b));
  main.variable(observer("captureRuntime")).define("captureRuntime", ["mutable recomputeTrigger"], ($0: any) =>
    new Promise((resolve) => {
      const forEach = Set.prototype.forEach;
      Set.prototype.forEach = function (...args: any[]) {
        const thisArg = args[1];
        (forEach as any).apply(this, args);
        if (thisArg && thisArg._modules) {
          Set.prototype.forEach = forEach;
          resolve(thisArg);
        }
      };
      $0.value = $0.value + 1;
    })
  );
  main.define("initial recomputeTrigger", () => 0);
  main.variable(observer("mutable recomputeTrigger")).define("mutable recomputeTrigger", ["Mutable", "initial recomputeTrigger"], (M: any, _: any) => new M(_));
  main.variable(observer("recomputeTrigger")).define("recomputeTrigger", ["mutable recomputeTrigger"], (_: any) => _.generator);
  return main;
}

// ---- arm B: the duck-typed box (access-runtime@950+ / proposed runtime-sdk cells) --
function defineFixed(runtime: any, observer: any) {
  const main = runtime.module();
  main.variable(observer("recomputeMutable")).define("recomputeMutable", ["Mutable"], (M: any) =>
    ((m: any) =>
      m.generator
        ? m
        : Object.defineProperties({}, {
            [Symbol.toStringTag]: { value: "Mutable" },
            generator: { value: m },
            value: Object.getOwnPropertyDescriptor(m, "value")!,
          }))(new M(0))
  );
  main.variable(observer("recomputeTrigger")).define("recomputeTrigger", ["recomputeMutable"], (m: any) => m.generator);
  main.variable(observer("capturedRuntime")).define("capturedRuntime", ["recomputeMutable"], (m: any) =>
    new Promise((resolve) => {
      const forEach = Set.prototype.forEach;
      Set.prototype.forEach = function (...args: any[]) {
        const thisArg = args[1];
        (forEach as any).apply(this, args);
        if (thisArg && thisArg._modules) {
          Set.prototype.forEach = forEach;
          resolve(thisArg);
        }
      };
      m.value = m.value + 1;
    })
  );
  main.variable(observer("runtime")).define("runtime", ["recomputeTrigger", "capturedRuntime"], (a: any, b: any) => (a, b));
  return main;
}

async function run(label: string, def: any) {
  const { promise, observer } = observeOnce("runtime");
  const runtime = new Runtime(builtins);
  const named = (name?: string) => (name === "runtime" ? observer : { pending() {}, fulfilled() {}, rejected() {} });
  def(runtime, named);
  try {
    const v = await Promise.race([
      promise,
      new Promise((_, r) => setTimeout(() => r(new Error("timeout (5s)")), 5000)),
    ]);
    console.log(`${label}: OK -> runtime captured?`, !!(v && v._variables), v?.constructor?.name);
    return true;
  } catch (err: any) {
    console.log(`${label}: FAIL -> ${err?.message ?? err}`);
    return false;
  }
}

// ---- arms C/D: the REAL modules Observable serves ---------------------------------
const real939 = (await import("./newobs-fixtures/access-runtime-939.js")).default;
const real950 = (await import("./newobs-fixtures/access-runtime-950.js")).default;

const a = await run("arm A  synthetic legacy `mutable`      ", defineLegacy);
const b = await run("arm B  synthetic duck-typed box        ", defineFixed);
const c = await run("arm C  REAL access-runtime@939 (pinned)", real939);
const d = await run("arm D  REAL access-runtime@950 (latest)", real950);

const ok = a === false && b === true && c === false && d === true;
console.log(`\nbug reproduced under notebook-kit stdlib: ${a === false && c === false}`);
console.log(`pinning access-runtime@950 fixes it:        ${b === true && d === true}`);
process.exit(ok ? 0 : 1);
