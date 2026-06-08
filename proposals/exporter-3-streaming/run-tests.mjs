import define from './exporter-3.js';

// --- minimal Observable-runtime shim to capture cell definitions from define() ---
const cells = {};
function shimRuntime() {
  const main = {
    variable() {
      return { define(name, deps, fn) {
        if (typeof deps === 'function') { fn = deps; deps = []; }
        cells[name] = { deps: deps || [], fn };
        return { set pid(v){}, get pid(){ return ''; } };
      } };
    },
    define(name, deps, fn) {              // module loaders (2-arg) + import bridges (3-arg)
      if (typeof deps === 'function') cells[name] = { deps: [], fn: deps, stub: true };
      else cells[name] = { deps, fn, stub: true };
      return { set pid(v){}, get pid(){ return ''; } };
    },
    builtin() {},
  };
  return { module: () => main };
}
define(shimRuntime(), () => () => {});

// --- resolver: compute a cell by name, with overrides for builtins/bridges ---
const values = {};
function resolve(name) {
  if (name in values) return values[name];
  const cell = cells[name];
  if (!cell) return undefined;            // unknown builtin
  if (cell.stub) return undefined;        // module import/loader bridge (overridden where needed)
  values[name] = undefined;               // cycle guard
  return (values[name] = cell.fn(...cell.deps.map(resolve)));
}

// --- jest-ish expect ---
function expect(actual) {
  const j = JSON.stringify;
  return {
    toBe: (e) => { if (actual !== e) throw new Error(`expected ${j(actual)} toBe ${j(e)}`); },
    toBeGreaterThan: (e) => { if (!(actual > e)) throw new Error(`expected ${actual} > ${e}`); },
    toBeLessThan: (e) => { if (!(actual < e)) throw new Error(`expected ${actual} < ${e}`); },
  };
}
values.expect = expect;
values.diskDataUrl = 'data:image/svg+xml;base64,STUB';   // avoid pulling html builtin via disk_svg

function run(name) {
  try { const r = resolve(name); console.log(`  PASS ${name} -> ${r}`); return true; }
  catch (e) { console.log(`  FAIL ${name}: ${e.message}`); return false; }
}

console.log('=== exporter-3 streaming tests (non-Runtime) ===');
let ok = true;
ok &= run('test_networking_script_is_streaming');
ok &= run('test_lopebook_main_at_top_with_sentinel');
ok &= run('test_streaming_order_prioritizes_mains');
process.exit(ok ? 0 : 1);
