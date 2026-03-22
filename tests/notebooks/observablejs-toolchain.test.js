import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadNotebook } from '../../tools/lope-runtime.js';

// Known failures due to Node VM environment differences (not bugs):
// - test_compile_import_*: produce importShim() instead of import() because globalThis.importShim exists
// - test_decompile_import_*: observable.Runtime not available in Node shim
// - test_decompile_class_with_property: escodegen shim gap
// - test_all_cells_*: depend on reference notebook document loading
// - test_async_interpolation: depends on FileAttachment resolving
const KNOWN_FAILURES = new Set([
  'test_compile_import_notebook',
  'test_compile_import_alias_single',
  'test_compile_import_viewof_single',
  'test_compile_import_mutable_single',
  'test_compile_import_mutable_data_alias_single',
  'test_compile_import_view_data_alias_single',
  'test_compile_import_plain_single',
  'test_decompile_import_variable',
  'test_decompile_import_variable_alias',
  'test_decompile_import_many',
  'test_decompile_class_with_property',
  'test_all_cells_decompilable',
  'test_all_cells_roundtrippable',
  'test_async_interpolation',
]);

describe('@tomlarkworthy/observablejs-toolchain', () => {
  let execution;

  before(async () => {
    execution = await loadNotebook('lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html', {
      settleTimeout: 30000,
    });
  });

  after(() => {
    if (execution) execution.dispose();
  });

  it('in-notebook compile and decompile tests pass', async () => {
    const results = await execution.runTests(30000, 'test_');
    const toolchainTests = results.tests.filter(t =>
      t.name.startsWith('test_compile_') ||
      t.name.startsWith('test_decompile_') ||
      t.name.startsWith('test_all_cells_') ||
      t.name === 'test_async_interpolation'
    );
    assert.ok(toolchainTests.length > 0, 'Expected toolchain tests');

    const unexpected = toolchainTests.filter(t =>
      t.state !== 'passed' && !KNOWN_FAILURES.has(t.name)
    );
    const passed = toolchainTests.filter(t => t.state === 'passed');

    assert.equal(unexpected.length, 0,
      `${unexpected.length} unexpected failure(s):\n` +
      unexpected.map(t => `  ${t.name} (${t.state}): ${t.error || ''}`).join('\n')
    );
    assert.ok(passed.length >= 30,
      `Expected at least 30 passing tests, got ${passed.length}`
    );
  });
});
