// A test cell that threw before the reporter looked must report as failed, with its message.
//
// The runtime keeps a rejection only in `_promise`: it never writes `_error`, and an observer
// attached afterwards is not called until the next compute, which does not come for a cell
// that is already reachable. Both reporters then waited out the timer and printed a timeout
// (cloud-brain's test_issues_* cells, 2026-10-10: the tests module had run them at boot).
//
//   node --experimental-vm-modules --test tests/notebooks/throw-is-a-failure.test.js
import { test } from "node:test";
import assert from "node:assert";
import { loadNotebook } from "../../tools/lope-runtime.js";

test("runTests reports a cell that threw as failed, with the message, computed before or not", async () => {
  const ex = await loadNotebook("lopecode/notebooks/@tomlarkworthy_flow-queue.html", {
    settleTimeout: 30000,
    log: () => {},
  });
  try {
    // defineVariable observes what it defines, so these have run before runTests looks.
    ex.defineVariable("test_zy_sync_throw", [], () => { throw new Error("sync boom"); });
    ex.defineVariable("test_zy_async_throw", [], async () => {
      await new Promise((r) => setTimeout(r, 20));
      throw new Error("async boom");
    });
    ex.defineVariable("test_zy_slow_throw", [], async () => {
      await new Promise((r) => setTimeout(r, 1500));
      throw new Error("slow boom");
    });
    ex.defineVariable("test_zy_slow_pass", [], async () => {
      await new Promise((r) => setTimeout(r, 1500));
      return "held";
    });
    ex.defineVariable("test_zy_pass", [], () => "held");
    await new Promise((r) => setTimeout(r, 300));

    const t0 = Date.now();
    const { tests, summary } = await ex.runTests(8000, "test_zy_");
    const byName = new Map(tests.map((r) => [r.name, [r.state, r.error ?? r.value]]));
    assert.deepEqual(Object.fromEntries(byName), {
      test_zy_sync_throw: ["failed", "sync boom"],
      test_zy_async_throw: ["failed", "async boom"],
      test_zy_slow_throw: ["failed", "slow boom"],
      test_zy_slow_pass: ["passed", "held"],
      test_zy_pass: ["passed", "held"],
    });
    assert.deepEqual([summary.failed, summary.passed, summary.timeout], [3, 2, 0]);
    assert.ok(Date.now() - t0 < 6000, "answered before the timer");

    // A cell nothing has computed is still run, not read as passed from its unset promise.
    const mod = ex._findModule(null);
    mod.variable().define("test_zx_unreached_throw", [], () => { throw new Error("late boom"); });
    mod.variable().define("test_zx_unreached_pass", [], () => "ran");
    const late = await ex.runTests(8000, "test_zx_");
    assert.deepEqual(Object.fromEntries(late.tests.map((r) => [r.name, [r.state, r.error ?? r.value]])), {
      test_zx_unreached_throw: ["failed", "late boom"],
      test_zx_unreached_pass: ["passed", "ran"],
    });

    // Two definitions of one name: each variable rejects, and neither may wait out the timer
    // (review 1: a guard keyed on the name left the second one's timer to overwrite the failure).
    mod.variable().define("test_zw_dup", [], () => "one");
    mod.variable().define("test_zw_dup", [], () => "two");
    const t1 = Date.now();
    const dup = await ex.runTests(4000, "test_zw_");
    assert.deepEqual(dup.tests.map((r) => [r.name, r.state, r.error]), [
      ["test_zw_dup", "failed", "test_zw_dup is defined more than once"],
    ]);
    assert.ok(Date.now() - t1 < 3000, "the duplicate pair answered before the timer");
  } finally {
    ex.dispose();
  }
});
