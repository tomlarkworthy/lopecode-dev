// Does a template cell that writes to a CAPTURED mutable still write through under
// instantiateDataflow? The plan doc asserted it does not. That was a design-time prediction,
// written before the bridge existed and never tested.
import { test, expect } from "bun:test";
import { Runtime } from "../../vendor/observable-runtime/src/index.js";
import { Mutable } from "../../vendor/observable-stdlib/src/mutable.js";
import { instantiateDataflowFactory } from "./instantiate-dataflow.mjs";

const settle = (ms = 200) => new Promise((r) => setTimeout(r, ms));

// mutable count = 0  compiles to three variables; the writer is a separate cell taking
// "mutable count" as an input and assigning .value, exactly as the compiler emits it.
function makeOrigin() {
  const rt = new Runtime({ Mutable: () => Mutable });
  const main = rt.module();
  main.variable().define("initial count", [], () => 0);
  main.variable().define("mutable count", ["Mutable", "initial count"], (M, i) => new M(i));
  main.variable().define("count", ["mutable count"], (m) => m.generator);
  // keep `count` live, as a rendered notebook would
  const seen = [];
  main.variable({ pending() {}, fulfilled(v) { seen.push(v); }, rejected() {} })
      .define("watch count", ["count"], (c) => c);
  const writer = main.variable().define("bump", ["mutable count"], (m) => {
    m.value = 42;
    return "wrote 42";
  });
  return { rt, main, writer, seen };
}

test("cloneDataflow's arrangement: a clone in the origin module writes through", async () => {
  const { main, writer, seen } = makeOrigin();
  await settle();
  const before = seen[seen.length - 1];
  // what cloneDataflow does: define the clone into the SAME module under a mangled name
  main.variable({ pending() {}, fulfilled() {}, rejected() {} })
      .define("dynamic bump x1", ["mutable count"], writer._definition);
  await settle(400);
  expect(before).toBe(0);
  expect(seen[seen.length - 1]).toBe(42);
});

test("instantiateDataflow: a captured mutable is written through the bridge too", async () => {
  const { rt, main, writer, seen } = makeOrigin();
  await settle();
  expect(seen[seen.length - 1]).toBe(0);

  const make = instantiateDataflowFactory(Runtime, {});
  const inst = make([writer], {
    observers: () => ({ pending() {}, fulfilled() {}, rejected() {} })
  });
  expect(inst.captures).toContain("mutable count");

  await settle(600);
  // The origin's `count` generator should have yielded the value the sandbox cell wrote.
  expect(await inst.value("bump")).toBe("wrote 42");
  expect(seen[seen.length - 1]).toBe(42);

  inst.dispose();
  make.destroy();
  rt.dispose();
});

test("round trip: sandbox writes the mutable, sandbox reads the new value back", async () => {
  const { rt, main } = makeOrigin();
  // a reader cell that depends on the captured `count`, and a writer, both in the template
  const reader = main.variable().define("readback", ["count"], (c) => c);
  const writer2 = main.variable().define("bump2", ["mutable count"], (m) => {
    m.value = 7;
    return "wrote 7";
  });
  await settle();

  const make = instantiateDataflowFactory(Runtime, {});
  const got = [];
  const inst = make([writer2, reader], {
    observers: (name) => ({
      pending() {},
      fulfilled(v) { if (name === "readback") got.push(v); },
      rejected() {}
    })
  });
  expect(inst.captures.sort()).toEqual(["count", "mutable count"]);
  await settle(800);
  // The write left the sandbox, mutated the origin's Mutable, and the new value came back in.
  expect(got[got.length - 1]).toBe(7);

  inst.dispose();
  make.destroy();
  rt.dispose();
});
