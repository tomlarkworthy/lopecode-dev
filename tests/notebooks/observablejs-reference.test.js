import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadNotebook } from '../../tools/lope-runtime.js';

describe('@tomlarkworthy/observablejs-reference', () => {
  let execution;

  before(async () => {
    execution = await loadNotebook('lopecode/notebooks/tomlarkworthy_observablejs-reference.html', {
      settleTimeout: 30000,
    });
  });

  after(() => {
    if (execution) execution.dispose();
  });

  it('in-notebook reference tests pass', async () => {
    const results = await execution.runTests(30000, 'test_');
    const tests = results.tests.filter(t => t.name.startsWith('test_') && t.module === '@tomlarkworthy/observablejs-reference');
    assert.ok(tests.length > 0, 'Expected reference tests');

    const failed = tests.filter(t => t.state !== 'passed');
    assert.equal(failed.length, 0,
      `${failed.length} failure(s) of ${tests.length}:\n` +
      failed.map(t => `  ${t.name} (${t.state}): ${t.error || ''}`).join('\n')
    );
  });
});
