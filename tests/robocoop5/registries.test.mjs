// One registry (spec R9): a context provider and a monitor are entries of rc5-hooks, and registerContext /
// registerMonitor / contextView / monitorsView keep their contracts.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { memoryPlugins, hold } from "./lib/engine.mjs";

const mod = (n) => fileURLToPath(new URL(`../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
let t, runHook, hook_beforeStep;
before(async () => {
  const core = await importNotebookModule(mod("-core"));
  runHook = await core.value("runHook"); hook_beforeStep = await core.value("hook_beforeStep");
  const m = await importNotebookModule(mod("-tools"), { overrides: { plugins: memoryPlugins() } });
  t = {};
  for (const n of ["registerContext", "unregisterContext", "contextView", "registerMonitor", "unregisterMonitor", "monitorsView", "rulesView", "registerRule"]) t[n] = await hold(m, n);
});
const ids = (list) => list.map((x) => x.id);

describe("one registry", () => {
  it("a context provider is a rule on the context hook, and is in contextView", () => {
    const p = t.registerContext({ id: "page", label: "Page", render: () => "p" });
    assert.equal(p.id, "page");
    assert.deepEqual(t.rulesView.value.filter((r) => r.hook === "context").map((r) => r.id), ["page"]);
    assert.deepEqual(ids(t.contextView.value), ["page"]);
    assert.equal(t.contextView.value[0].render(), "p");
    t.unregisterContext("page");
    assert.deepEqual(ids(t.contextView.value), []);
  });
  it("a weak provider does not displace one already there; a strong one replaces it", () => {
    t.registerContext({ id: "sel", render: () => "strong" });
    t.registerContext({ id: "sel", weak: true, render: () => "weak" });
    assert.equal(t.contextView.value.find((x) => x.id === "sel").render(), "strong");
    t.registerContext({ id: "sel", render: () => "newer" });
    assert.equal(t.contextView.value.find((x) => x.id === "sel").render(), "newer");
    t.unregisterContext("sel");
  });
  it("a monitor is a deferred rule on beforeStep: in monitorsView, and not called by the hook", () => {
    let called = 0;
    t.registerMonitor({ id: "m", check: async () => { called++; return "verdict"; } });
    assert.deepEqual(ids(t.monitorsView.value), ["m"]);
    const r = t.rulesView.value.find((x) => x.id === "m");
    assert.equal(r.hook, "beforeStep"); assert.equal(r.defer, true);
    const out = runHook(hook_beforeStep, t.rulesView.value, {});
    assert.deepEqual(out, []); assert.equal(called, 0);
    t.unregisterMonitor("m");
    assert.deepEqual(ids(t.monitorsView.value), []);
  });
  it("a context provider, a monitor and a rule may share an id", () => {
    t.registerContext({ id: "x", render: () => "c" });
    t.registerMonitor({ id: "x", check: () => null });
    t.registerRule({ id: "x", hook: "turnEnd", check: () => null });
    assert.equal(t.rulesView.value.filter((r) => r.id === "x").length, 3);
    t.unregisterContext("x"); t.unregisterMonitor("x");
    assert.deepEqual(t.rulesView.value.filter((r) => r.id === "x").map((r) => r.hook), ["turnEnd"]);
  });
  it("registerMonitor still refuses a monitor with no check, registerContext one with no id", () => {
    assert.throws(() => t.registerMonitor({ id: "m" }), /check/);
    assert.throws(() => t.registerContext({ render: () => "" }), /id/);
  });
});
