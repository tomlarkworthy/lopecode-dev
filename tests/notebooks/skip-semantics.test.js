// A test that declines to run must not report as one that ran.
//
// The corpus already writes `return "skipped: <why>"` when a scenario cannot run
// (ui-testing's own `test_ui_button_by_text`, every gated `test_lp2_*`). Both
// reporters used to classify any settled value as `passed`, so a suite that
// executed nothing reported all green — and a baseline diff saw no change.
//
// Booting a notebook needs SyntheticModule:
//   node --experimental-vm-modules --test tests/notebooks/skip-semantics.test.js
import { test } from "node:test";
import assert from "node:assert";
import { LopecodeExecution } from "../../tools/lope-runtime.js";

const { skipReason } = LopecodeExecution;

test("the string marker is recognised, and its reason kept", () => {
  assert.equal(skipReason("skipped: no layout engine"), "no layout engine");
  assert.equal(skipReason("  Skipped : turn on the toggle "), "turn on the toggle");
  assert.equal(skipReason("SKIPPED:x"), "x");
});

test("a skip with no reason still skips", () => {
  assert.equal(skipReason("skipped:"), "");
});

test("the object marker is recognised", () => {
  assert.equal(skipReason({ skipped: true, reason: "no DataTransfer" }), "no DataTransfer");
  assert.equal(skipReason({ __skip: true, why: "unmounted" }), "unmounted");
  assert.equal(skipReason({ skipped: true }), "no reason given");
});

test("an ordinary passing value is not a skip", () => {
  // The words have to be the whole claim, not buried in a sentence a real test returns.
  assert.equal(skipReason("parse ∘ serialize is identity"), null);
  assert.equal(skipReason("this scenario is skipped: no"), null);
  assert.equal(skipReason(42), null);
  assert.equal(skipReason(true), null);
  assert.equal(skipReason({ ok: true }), null);
  assert.equal(skipReason(null), null);
  assert.equal(skipReason(undefined), null);
});

test("`skipped` as a field is not enough — it must be true", () => {
  assert.equal(skipReason({ skipped: false, reason: "ran fine" }), null);
  assert.equal(skipReason({ skipped: "yes" }), null);
});

// End-to-end through the reporter the pairing channel and the headless host use.
test("runTests reports a skip as skipped, not passed", async (t) => {
  const { loadNotebook } = await import("../../tools/lope-runtime.js");
  const ex = await loadNotebook("lopecode/notebooks/@tomlarkworthy_flow-queue.html", {
    settleTimeout: 30000,
    log: () => {},
  });
  try {
    ex.defineVariable("test_zz_declines", [], () => "skipped: no layout engine");
    ex.defineVariable("test_zz_runs", [], () => "an actual assertion held");
    const { tests, summary } = await ex.runTests(8000, "test_zz_");

    const byName = new Map(tests.map((r) => [r.name, r]));
    assert.equal(byName.get("test_zz_declines").state, "skipped");
    assert.equal(byName.get("test_zz_declines").reason, "no layout engine");
    assert.equal(byName.get("test_zz_runs").state, "passed");
    assert.equal(summary.skipped, 1);
    assert.equal(summary.passed, 1);
  } finally {
    ex.dispose();
  }
});
