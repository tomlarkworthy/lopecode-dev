// runHook and the hook_* cells (robocoop-5-core), createRegistry (robocoop-5-tools): spec R7, R9, R12.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { importNotebookModule } from "../../tools/notebook-import.ts";

const mod = (n) => fileURLToPath(new URL(`../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
// plugin-registry's contract, in memory: add returns remove, get yields the set on every change
export const memoryPlugins = () => {
  const sets = new Map(), subs = new Map();
  const notify = (n) => { for (const f of subs.get(n) ?? []) f(); };
  return {
    add(n, v) { if (!sets.has(n)) sets.set(n, new Set()); sets.get(n).add(v); notify(n); return () => { sets.get(n)?.delete(v); notify(n); }; },
    get(n) {
      let wake = null, dirty = true, live = true;
      const f = () => { dirty = true; wake?.(); };
      if (!subs.has(n)) subs.set(n, new Set()); subs.get(n).add(f);
      return { async next() { while (live && !dirty) await new Promise((r) => (wake = r)); dirty = false; return live ? { done: false, value: [...(sets.get(n) ?? [])] } : { done: true }; },
        return() { live = false; subs.get(n).delete(f); wake?.(); return { done: true }; } };
    },
  };
};

let runHook, hooks, createRegistry;
before(async () => {
  const core = await importNotebookModule(mod("-core"));
  runHook = await core.value("runHook");
  hooks = {};
  for (const n of ["context", "beforeStep", "beforeTool", "afterTool", "turnEnd"]) hooks[n] = await core.value("hook_" + n);
  const tools = await importNotebookModule(mod("-tools"), { overrides: { plugins: memoryPlugins() } });
  createRegistry = await tools.value("createRegistry");
});
const rule = (hook, id, order, check) => ({ id, hook, order, check });
const boom = (hook) => rule(hook, "boom", 1, () => { throw new Error("boom"); });

describe("hook cells", () => {
  it("declare name, compose and onThrow", () => {
    for (const [n, h] of Object.entries(hooks)) { assert.equal(h.name, n); assert.ok(["first", "join", "list", "chain"].includes(h.compose), n); assert.ok(["skip", "refuse"].includes(h.onThrow), n); }
    assert.equal(hooks.beforeTool.onThrow, "refuse");
  });
});
describe("runHook", () => {
  it("first: lowest order wins, later rules do not run", () => {
    let ran = 0;
    const r = runHook(hooks.turnEnd, [rule("turnEnd", "b", 20, () => { ran++; return { continue: "b" }; }), rule("turnEnd", "a", 10, () => ({ continue: "a" }))], {});
    assert.deepEqual(r, { continue: "a" }); assert.equal(ran, 0);
  });
  it("a rule runs only on its own hook", () => assert.equal(runHook(hooks.beforeTool, [rule("turnEnd", "a", 1, () => "x")], {}), null));
  it("equal orders keep registration order", () => assert.deepEqual(runHook(hooks.beforeStep, [rule("beforeStep", "a", 5, () => "a"), rule("beforeStep", "b", 5, () => "b")], {}), ["a", "b"]));
  it("list: flattens arrays, drops null and empty", () => assert.deepEqual(runHook(hooks.beforeStep, [rule("beforeStep", "a", 1, () => ["x", "y"]), rule("beforeStep", "b", 2, () => null), rule("beforeStep", "c", 3, () => ""), rule("beforeStep", "d", 4, () => "z")], {}), ["x", "y", "z"]));
  it("join: with the hook's separator", () => assert.equal(runHook({ name: "p", compose: "join", sep: "\n\n", onThrow: "skip" }, [rule("p", "a", 1, () => "A"), rule("p", "b", 2, () => "B")], {}), "A\n\nB"));
  it("chain: each rule sees the last result", () => assert.equal(runHook(hooks.afterTool, [rule("afterTool", "a", 1, (c) => c.result + "1"), rule("afterTool", "b", 2, (c) => c.result + "2")], { result: "r" }), "r12"));
  it("a throw is skipped and the rest still run", () => assert.deepEqual(runHook(hooks.turnEnd, [boom("turnEnd"), rule("turnEnd", "a", 2, () => ({ end: true }))], {}), { end: true }));
  it("a throw on beforeTool refuses the call", () => assert.match(runHook(hooks.beforeTool, [boom("beforeTool")], {}), /^REFUSED: rule boom failed: boom/));
  it("stays synchronous when every check is, and awaits one that is not", async () => {
    const p = runHook(hooks.turnEnd, [rule("turnEnd", "a", 1, async () => null), rule("turnEnd", "b", 2, () => ({ continue: "b" }))], {});
    assert.equal(typeof p.then, "function"); assert.deepEqual(await p, { continue: "b" });
    await assert.doesNotReject(runHook(hooks.turnEnd, [rule("turnEnd", "a", 1, async () => { throw new Error("x"); })], {}));
    assert.match(await runHook(hooks.beforeTool, [rule("beforeTool", "a", 1, async () => { throw new Error("x"); })], {}), /^REFUSED/);
  });
});
describe("createRegistry", () => {
  it("replaces by id, lists synchronously, removes only the registered object", () => {
    const r = createRegistry("t-" + Math.random());
    const a1 = { id: "a", v: 1 }, a2 = { id: "a", v: 2 }, b = { id: "b" };
    r.register(a1); r.register(b); r.register(a2);
    assert.deepEqual(r.list(), [b, a2]);
    r.unregister("a", a1); assert.deepEqual(r.list(), [b, a2]);
    r.unregister("a", a2); assert.deepEqual(r.list(), [b]);
  });
  it("validates, and a yielding item never displaces one that does not yield", () => {
    const r = createRegistry("t-" + Math.random(), { validate: (x) => { if (!x.check) throw new Error("needs check"); }, yields: (next, prev) => !!next.weak && !prev.weak });
    assert.throws(() => r.register({ id: "a" }), /needs check/);
    assert.throws(() => r.register({ check() {} }), /needs an id/);
    const strong = { id: "a", check() {} }; r.register(strong); r.register({ id: "a", weak: true, check() {} });
    assert.deepEqual(r.list(), [strong]);
  });
  it("a view holds what was registered at once, and what another module added to the set later", async () => {
    const set = "t-" + Math.random(), plugins = memoryPlugins();
    const tools = await importNotebookModule(mod("-tools"), { overrides: { plugins } });
    const r = (await tools.value("createRegistry"))(set);
    const view = r.view(new Promise(() => {}));
    const a = { id: "a" }, direct = { id: "direct" };
    r.register(a); assert.deepEqual(view.value, [a]);
    plugins.add(set, direct); await new Promise((f) => setTimeout(f, 5));
    assert.deepEqual(view.value, [a, direct]);
  });
});
