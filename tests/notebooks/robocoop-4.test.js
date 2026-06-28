// Node CI for robocoop-4: boot the shipped notebook headlessly and run its in-notebook test_rc4_*
// cells (the canonical tests). Mirrors observablejs-toolchain.test.js — the notebook is the source
// of truth for both the logic AND the tests; node just drives runTests over loadNotebook.
//
//   node --test tests/notebooks/robocoop-4.test.js

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadNotebook } from '../../tools/lope-runtime.js';

// Bundle invariants that full re-exports silently revert (text-only, no boot). Each has bitten before:
//   - summarizeJS clone fix (B22/B27): without it, summarizeJS(inspect) corrupts agent-built Inputs values
//   - tick=messageChannel: runtime steps in background tabs
//   - ocean-floor theme: the chosen dark theme
// If a re-export drops any of these, re-sync (summarizejs) / run tools/robocoop-4/restore-rc4-customizations.ts.
describe('@tomlarkworthy/robocoop-4 bundle invariants', () => {
  const FILES = [
    'lopebooks/notebooks/@tomlarkworthy_robocoop-4.html',
    'lopecode/notebooks/@tomlarkworthy_robocoop-4.html',
  ];
  for (const f of FILES) {
    it(`${f} retains re-export-fragile fixes`, () => {
      const s = readFileSync(f, 'utf8');
      // summarizeJS must clone before inspect (the block contains cloneNode near the fn definition)
      const block = s.slice(s.indexOf('function summarizeJS'), s.indexOf('function summarizeJS') + 600);
      assert.ok(s.includes('function summarizeJS'), `${f}: summarizeJS missing`);
      assert.ok(block.includes('cloneNode'), `${f}: summarizeJS is STALE (no clone fix) — re-sync @tomlarkworthy/summarizejs`);
      assert.ok(/"tick":\s*"messageChannel"/.test(s), `${f}: bootconf tick=messageChannel dropped`);
      assert.ok(s.includes('theme-ocean-floor.css'), `${f}: ocean-floor theme dropped`);
    });
  }
});

// Some tests can't run under the node DOM shim and run only in the browser (in-notebook test panel):
//   - test_rc4_fs_rename / test_rc4_hb_edit_tool_schemas: need the just-bash workspace (bundle won't load)
//   - test_rc4_hb_value_tool_schemas: valueTools depends on the live `currentModules` module-map
//     generator, which never yields headlessly.
// Pure core/session tests must all pass in node.
const BROWSER_ONLY = new Set([
  'test_rc4_fs_rename',
  'test_rc4_hb_edit_tool_schemas',
  'test_rc4_hb_value_tool_schemas',
]);

describe('@tomlarkworthy/robocoop-4', () => {
  let execution;

  before(async () => {
    execution = await loadNotebook('lopebooks/notebooks/@tomlarkworthy_robocoop-4.html', {
      settleTimeout: 30000,
    });
    // The test_rc4_* cells live in @tomlarkworthy/robocoop-4-tests, which the notebook does NOT boot by
    // default (it isn't a main), so loadNotebook never instantiates it and runTests would find 0 tests.
    // Instantiate it into the runtime here (same no-op observer factory loadNotebook uses) so its cells
    // exist; runTests then force-observes them.
    const ns = await execution.importShim('@tomlarkworthy/robocoop-4-tests');
    execution.runtime.module(ns.default, () => ({}));
    execution.runtime._computeNow?.();
    await new Promise((r) => setTimeout(r, 500));
  });

  after(() => {
    if (execution) execution.dispose();
  });

  it('in-notebook test_rc4_* cells pass', async () => {
    // 12s cap: every real test settles in <8s; the browser-only just-bash fs test always times out in node
    // (it's excluded from the pass check below), so a lower cap just avoids waiting the full 30s for it.
    const results = await execution.runTests(12000, 'test_rc4_');
    const tests = results.tests.filter((t) => t.name.startsWith('test_rc4_'));
    assert.ok(tests.length >= 7, `expected the rc4 test suite, got ${tests.length}`);

    const core = tests.filter((t) => !BROWSER_ONLY.has(t.name));
    const failed = core.filter((t) => t.state !== 'passed');
    assert.equal(
      failed.length,
      0,
      `${failed.length} core test(s) failed:\n` +
        failed.map((t) => `  ${t.name} (${t.state}): ${t.error || ''}`).join('\n'),
    );

    const passed = core.filter((t) => t.state === 'passed');
    assert.ok(passed.length >= 7, `expected >=7 passing core tests, got ${passed.length}`);
  });
});
