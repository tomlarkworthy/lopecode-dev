// CI for @tomlarkworthy/runtime-sdk `observe` — multi-observer delivery on one variable.
//
// Two views commonly observe the SAME variable (a lopepage pane + an embedding widget like
// snap-grid). Views remount, so attach/cancel order interleaves: the widget's new instance
// attaches BEFORE its old instance's invalidation teardown runs. Delivery to every live
// observer must survive any cancel order, and cancelling all observers must restore the
// variable's original observer.
//
// Loads the REAL `observe` cell headlessly (no browser). Requires Bun:
//   bun test tests/notebooks/runtime-sdk-observe.test.js

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const MODULE = 'modules/@tomlarkworthy/runtime-sdk.js';
const isBun = typeof Bun !== 'undefined';

class FakeElement {}
class FakeText {}
const noObs = Symbol('no-observer');

const makeVar = (name, value) => ({
  _name: name,
  _version: 1,
  _observer: noObs,
  _reachable: false,
  _module: { _runtime: { _dirty: new Set(), _updates: new Set() } },
  _value: value,
  _promise: null
});

const mkObs = (id, calls) => ({
  _node: null,
  pending: () => {},
  fulfilled: (value) => calls.push([id, value]),
  rejected: () => {}
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('runtime-sdk observe: multi-observer chain integrity', { skip: !isBun }, () => {
  let observe;
  before(async () => {
    const { importNotebookModule } = await import('../../tools/notebook-import.ts');
    const m = await importNotebookModule(MODULE, {
      overrides: {
        Element: FakeElement,
        Text: FakeText,
        trace_variable: '---',
        'mutable trace_history': { value: [] },
        no_observer: noObs,
        queueMicrotask: globalThis.queueMicrotask.bind(globalThis)
      }
    });
    observe = await m.value('observe');
  });

  it('delivers to every live observer regardless of cancel order (remount case)', async () => {
    const v = makeVar('wavePlot', undefined);
    const calls = [];
    observe(v, mkObs('L', calls)); // lopepage pane, attached at boot
    const cancelA = observe(v, mkObs('A', calls)); // widget instance A
    observe(v, mkObs('B', calls)); // widget instance B attaches on remount...
    cancelA(); // ...then A's invalidation teardown fires (non-LIFO)
    await flush();
    calls.length = 0;

    v._observer.fulfilled('tick', v._name); // runtime recompute delivery
    const ids = calls.map(([id]) => id);
    assert.ok(ids.includes('L'), `L missed delivery, got ${JSON.stringify(ids)}`);
    assert.ok(ids.includes('B'), `B missed delivery after A cancelled, got ${JSON.stringify(ids)}`);
    assert.ok(!ids.includes('A'), `cancelled A still delivered, got ${JSON.stringify(ids)}`);
  });

  it('delivers in attach order (last attached adopts element values last, so it owns the node)', async () => {
    const v = makeVar('wavePlot', undefined);
    const calls = [];
    observe(v, mkObs('L', calls));
    observe(v, mkObs('B', calls));
    await flush();
    calls.length = 0;

    v._observer.fulfilled('tick', v._name);
    assert.deepEqual(calls.map(([id]) => id), ['L', 'B']);
  });

  it('cancelling all observers restores the original observer', async () => {
    const v = makeVar('waveStats', undefined);
    const calls = [];
    const cancelL = observe(v, mkObs('L', calls));
    const cancelB = observe(v, mkObs('B', calls));
    cancelL();
    cancelB();
    await flush();
    assert.equal(v._observer, noObs);
  });

  it('marks unobserved variables reachable and replays the current value on attach', async () => {
    const v = makeVar('waveStats', { mean: 1 });
    const calls = [];
    observe(v, mkObs('L', calls));
    assert.equal(v._reachable, true);
    await flush();
    assert.deepEqual(calls.at(-1), ['L', { mean: 1 }]);
  });

  it('exposes the pre-existing observer _node through the dispatcher (editor/observablehq reverse-lookup)', async () => {
    const inspectorNode = new FakeElement();
    const v = makeVar('plot', undefined);
    // pre-existing real observer, e.g. the notebook Inspector rendered at boot
    v._observer = { _node: inspectorNode, pending() {}, fulfilled() {}, rejected() {} };

    const cancel = observe(v, mkObs('view', [])); // a view attaches on top
    // divToVar / module-map / observablehq.com read v._observer._node — must still resolve
    assert.equal(v._observer._node, inspectorNode, 'dispatcher masked the Inspector node');

    cancel();
    await flush();
    // all external listeners gone: the original Inspector is restored verbatim
    assert.equal(v._observer._node, inspectorNode);
  });

  it('exposes the owning view _node when there is no pre-existing observer', async () => {
    const a = new FakeElement();
    const b = new FakeElement();
    const v = makeVar('plot', undefined);
    const mkNodeObs = (node) => ({ _node: node, pending() {}, fulfilled() {}, rejected() {} });

    observe(v, mkNodeObs(a));
    assert.equal(v._observer._node, a);
    observe(v, mkNodeObs(b)); // last-attached view owns the node
    assert.equal(v._observer._node, b, 'expected the last-attached view to own _node');
  });

  it('survives repeated remounts: N attach/cancel cycles never orphan the live observer', async () => {
    const v = makeVar('wavePlot', undefined);
    const calls = [];
    observe(v, mkObs('L', calls));
    let prevCancel = observe(v, mkObs('gen0', calls));
    for (let i = 1; i <= 5; i++) {
      const cancelNew = observe(v, mkObs(`gen${i}`, calls)); // new instance attaches first
      prevCancel(); // then old instance tears down
      prevCancel = cancelNew;
    }
    await flush();
    calls.length = 0;

    v._observer.fulfilled('tick', v._name);
    const ids = calls.map(([id]) => id);
    assert.deepEqual(ids, ['L', 'gen5'], `expected only L and gen5 live, got ${JSON.stringify(ids)}`);
  });
});
