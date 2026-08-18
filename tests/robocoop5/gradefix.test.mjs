/**
 * Pins the memoization semantics of the synthesized define() emulator in grade.mjs — the agent arm's
 * grading path (module mode: exports are CELL VALUES).
 *
 * History: `__compute` originally re-evaluated every dependency on every reference
 * (`deps.map((d) => __compute(d, new Set(seen)))`, no cache). Two consequences, both of which failed
 * CORRECT solutions on stateful-graph exercises:
 *   1. a cell shared by two exports was re-instantiated once per export, so state SPLIT
 *      (a shared registry counted 1,1 instead of 1,2);
 *   2. a diamond inside a single export lost identity (P === Q was false for two paths to the
 *      same cell).
 * The fix (a per-synthesis `__memo`) was developed as the fork grade-fixed.mjs, validated at 49/49
 * references and over a 291-candidate regrade (1 legitimate flip, 0 unflips — results/gradefix-regrade.json),
 * and merged into grade.mjs; the fork is gone. These are the two repro cases, now asserted against
 * the merged grader.
 *
 * Cycle detection is orthogonal to the cache and must survive it: the per-path `seen` set still has
 * to reject a self-referential cell rather than hang or memoize `undefined`.
 *
 * The grader is exercised through its exported synthesizeCJS (source text in, CJS program text out);
 * the program is executed here in-process with a supplied `module`/`console`, which is what
 * gradeSolution's spawned node would do.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { synthesizeCJS } from "../../tools/robocoop-5/eval/polyglot/grade.mjs";

// Run a synthesized CJS program and hand back its module.exports plus anything it logged to stderr
// (synthesizeCJS swallows a failing export into console.error rather than throwing).
function runSynth(program) {
  const mod = { exports: {} };
  const errs = [];
  const fakeConsole = { error: (...a) => errs.push(a.map(String).join(" ")), log: () => {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", "console", program)(mod, mod.exports, fakeConsole);
  return { exports: mod.exports, errs };
}

// A /src module in robocoop-5's compiled-Observable shape: `export default function define(...)`
// registering named cells with explicit dep lists.
const mod = (body) => `export default function define(runtime, observer) {
  const main = runtime.module();
${body}
  return main;
}`;
const cell = (name, deps, fn) =>
  `  main.variable(observer(${JSON.stringify(name)})).define(${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${fn});`;

// Repro 1 — one `registry` cell feeding two exports. Correct dataflow semantics: ONE registry,
// so A() then B() count 1 then 2.
const SHARED_STATE = mod([
  cell("registry", [], "function () { return { n: 0 }; }"),
  cell("A", ["registry"], "function (registry) { return () => ++registry.n; }"),
  cell("B", ["registry"], "function (registry) { return () => ++registry.n; }"),
].join("\n"));
const SHARED_PROBLEM = { slug: "t-shared", exports: ["A", "B"] };

// Repro 2 — a diamond inside ONE export: P and Q both read `base`, `check` reads both.
// Correct dataflow semantics: P === Q.
const DIAMOND = mod([
  cell("base", [], "function () { return { tag: 'base' }; }"),
  cell("P", ["base"], "function (base) { return base; }"),
  cell("Q", ["base"], "function (base) { return base; }"),
  cell("check", ["P", "Q"], "function (P, Q) { return P === Q; }"),
].join("\n"));
const DIAMOND_PROBLEM = { slug: "t-diamond", exports: ["check"] };

const CYCLE = mod(cell("loop", ["loop"], "function (loop) { return loop; }"));
const CYCLE_PROBLEM = { slug: "t-cycle", exports: ["loop"] };

describe("synthesizeCJS __compute memoization", () => {
  it("shares one registry cell across both exports that read it", () => {
    const { exports: ex } = runSynth(synthesizeCJS(SHARED_STATE, SHARED_PROBLEM));
    assert.equal(ex.A(), 1);
    assert.equal(ex.B(), 2, "state split — each export got its own registry (the pre-fix misgrade)");
  });

  it("preserves diamond identity within one export (P === Q)", () => {
    const { exports: ex } = runSynth(synthesizeCJS(DIAMOND, DIAMOND_PROBLEM));
    assert.equal(ex.check, true);
  });

  it("still rejects a self-referential cell as a cycle", () => {
    const { exports: ex, errs } = runSynth(synthesizeCJS(CYCLE, CYCLE_PROBLEM));
    assert.equal(ex.loop, undefined, "cyclic export must not resolve");
    assert.ok(errs.some((e) => /cycle at loop/.test(e)), `expected a cycle diagnostic, got ${JSON.stringify(errs)}`);
  });

  it("does not change a plain linear graph", () => {
    const LINEAR = mod([
      cell("a", [], "function () { return 2; }"),
      cell("b", ["a"], "function (a) { return a * 3; }"),
    ].join("\n"));
    assert.equal(runSynth(synthesizeCJS(LINEAR, { slug: "t-linear", exports: ["b"] })).exports.b, 6);
  });
});
