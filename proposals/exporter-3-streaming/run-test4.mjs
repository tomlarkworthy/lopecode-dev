import define from './exporter-3.js';
import { Runtime } from './runtime6.mjs';

const cells = {};
function shimRuntime() {
  const main = {
    variable() { return { define(name, deps, fn) {
      if (typeof deps === 'function') { fn = deps; deps = []; }
      cells[name] = { deps: deps || [], fn }; return { set pid(v){}, get pid(){return '';} };
    } }; },
    define(name, deps, fn) {
      if (typeof deps === 'function') cells[name] = { deps: [], fn: deps, stub: true };
      else cells[name] = { deps, fn, stub: true };
      return { set pid(v){}, get pid(){return '';} };
    },
    builtin() {},
  };
  return { module: () => main };
}
define(shimRuntime(), () => () => {});

const values = { Runtime };
function resolve(name) {
  if (name in values) return values[name];
  const c = cells[name]; if (!c || c.stub) return undefined;
  values[name] = undefined; return (values[name] = c.fn(...c.deps.map(resolve)));
}
function expect(actual){const j=JSON.stringify;return{
  toBe:e=>{if(actual!==e)throw new Error(`expected ${j(actual)} toBe ${j(e)}`);},
  toBeLessThan:e=>{if(!(actual<e))throw new Error(`expected ${actual} < ${e}`);},
};}
values.expect = expect;

// sanity: does the real runtime expose _variables / _module / _name?
const rt = new Runtime(); const mod = rt.module();
mod.variable().define("module @x/y", [], () => 1);
console.log('runtime _variables is iterable:', !!rt._variables && typeof rt._variables[Symbol.iterator]==='function');
const sample=[...rt._variables].find(v=>v._name==='module @x/y');
console.log('var._module present:', !!(sample&&sample._module), ' var._name:', sample&&sample._name);

console.log('=== exporter-3 streaming Runtime test ===');
try { const r = resolve('test_streaming_order_runtime'); console.log('  PASS test_streaming_order_runtime ->', r); }
catch (e) { console.log('  FAIL test_streaming_order_runtime:', e.message); process.exit(1); }
