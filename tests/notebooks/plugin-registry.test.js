// CI for @tomlarkworthy/plugin-registry — reactive named sets.
//
// Two parts:
//   1. Bundle invariants — read the shipped HTML, assert the module is embedded and boots under the
//      lopepage-2 frame. Node-safe, instant.
//   2. Behavioural — load the canonical /modules source in a headless @observablehq/runtime via
//      importNotebookModule and exercise the REAL cells (`createPlugins`, its `get` Generator, the
//      in-notebook test_*). No heavy frame, so it's fast and deterministic (the shipped HTML's module is
//      a round-trip copy of this same source, and is verified to boot in the browser separately).
//
// Part 2 needs Bun (importNotebookModule imports a .ts tool + @observablehq/runtime from tools/node_modules),
// so it is guarded to run only under Bun. Under plain node it is skipped, keeping `node --test` clean.
//
//   bun test tests/notebooks/plugin-registry.test.js          # full suite
//   node --experimental-vm-modules --test tests/notebooks/plugin-registry.test.js   # invariants only

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const NB = 'lopebooks/notebooks/@tomlarkworthy_plugin-registry.html';
const MODULE = 'modules/@tomlarkworthy/plugin-registry.js';

describe('@tomlarkworthy/plugin-registry bundle invariants', () => {
  const s = readFileSync(NB, 'utf8');
  it('embeds the module and boots it under the lopepage-2 frame', () => {
    assert.ok(s.includes('id="@tomlarkworthy/plugin-registry"'), 'module <script> block missing');
    assert.ok(s.includes('id="@tomlarkworthy/lopepage-2"'), 'lopepage-2 frame block missing');
    const mains = s.match(/"mains":\s*\[[^\]]*\]/g)?.find((m) => m.includes('plugin-registry'));
    assert.ok(mains, 'plugin-registry not in any bootconf mains → boots blank');
    assert.ok(mains.includes('lopepage-2'), 'bootconf mains not framed with lopepage-2');
  });
});

// Faithful Generators.observe for the headless runtime (no @observablehq/stdlib in node deps).
// Matches the real protocol: a SYNC iterator of promises — next() → {value: Promise<snapshot>} — that
// COALESCES (keeps only the latest pushed value), runs `initialize` immediately, and disposes on return().
function observe(initialize) {
  let pending, hasPending = false, resolveNext = null, disposed = false;
  const push = (v) => {
    if (resolveNext) { const r = resolveNext; resolveNext = null; r(v); }
    else { pending = v; hasPending = true; }        // coalesce: latest wins
  };
  const dispose = initialize(push);                  // registers the listener synchronously
  return {
    next() {
      const value = hasPending
        ? ((hasPending = false), Promise.resolve(pending))
        : new Promise((r) => (resolveNext = r));
      return { value, done: false };
    },
    return() {
      if (!disposed) { disposed = true; if (typeof dispose === 'function') dispose(); }
      return { value: undefined, done: true };
    },
    [Symbol.iterator]() { return this; },
  };
}

if (typeof Bun === 'undefined') {
  describe('@tomlarkworthy/plugin-registry behaviour (skipped — run with `bun test`)', () => {
    it.skip('requires Bun (importNotebookModule)', () => {});
  });
} else {
  const { importNotebookModule } = await import('../../tools/notebook-import.ts');
  const load = () => importNotebookModule(MODULE, { overrides: { Generators: { observe } } });
  const pump = (gen) => gen.next().value; // sync iterator of promises: next() → {value: Promise<snapshot>}

  describe('@tomlarkworthy/plugin-registry — reactive named sets', () => {
    let createPlugins;
    before(async () => { createPlugins = await (await load()).value('createPlugins'); });

    it('get(name) yields the current set immediately, then updates on add', async () => {
      const p = createPlugins();
      const gen = p.get('x');
      assert.equal((await pump(gen)).join(','), '');
      p.add('x', 1);
      assert.equal((await pump(gen)).join(','), '1');
      gen.return();
    });

    it('multiple providers accumulate under one name; independent consumers converge', async () => {
      const p = createPlugins();
      const a = p.get('x'), b = p.get('x');
      await pump(a); await pump(b);
      p.add('x', 'one');
      p.add('x', 'two');
      assert.equal((await pump(a)).slice().sort().join(','), 'one,two');
      assert.equal((await pump(b)).slice().sort().join(','), 'one,two');
      a.return(); b.return();
    });

    it('remove() takes exactly its value back out', async () => {
      const p = createPlugins();
      const gen = p.get('x');
      await pump(gen);
      const removeA = p.add('x', 'a');
      p.add('x', 'b');
      assert.equal((await pump(gen)).slice().sort().join(','), 'a,b');
      removeA();
      assert.equal((await pump(gen)).join(','), 'b');
      gen.return();
    });

    it('names are isolated: get(a) is unaffected by add(b)', async () => {
      const p = createPlugins();
      const gx = p.get('x'), gy = p.get('y');
      await pump(gx); await pump(gy);
      p.add('x', 1);
      p.add('y', 2);
      assert.equal((await pump(gx)).join(','), '1');
      assert.equal((await pump(gy)).join(','), '2');
      gx.return(); gy.return();
    });

    it('{invalidation} auto-removes the value when the promise settles', async () => {
      const p = createPlugins();
      let settle;
      p.add('x', 1, { invalidation: new Promise((r) => (settle = r)) });
      const gen = p.get('x');
      assert.equal((await pump(gen)).join(','), '1');
      settle();
      await Promise.resolve(); await Promise.resolve();
      assert.equal((await pump(gen)).join(','), '');
      gen.return();
    });

    it('disposing a get() Generator drops its per-name listener (no leak)', async () => {
      const p = createPlugins();
      assert.equal(p.listenerCount('x'), 0);
      const gen = p.get('x');
      await pump(gen);
      assert.equal(p.listenerCount('x'), 1);
      gen.return();
      assert.equal(p.listenerCount('x'), 0);
    });
  });

  describe('@tomlarkworthy/plugin-registry — in-notebook test_* cells all pass', () => {
    let m;
    before(async () => { m = await load(); });
    after(() => m.dispose());
    for (const name of [
      'test_get_reflects_add',
      'test_multi_provider_and_convergence',
      'test_remove_and_names_isolated',
      'test_invalidation_and_no_leak',
    ]) {
      it(name, async () => assert.match(String(await m.value(name)), /^✅/, `${name} should return a ✅ string`));
    }
  });
}
