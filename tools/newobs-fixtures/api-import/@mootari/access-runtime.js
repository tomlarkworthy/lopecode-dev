const _135 = function(md){return(
md`---`
)};

const _733 = function runtime(recomputeTrigger,captureRuntime){return(
recomputeTrigger, captureRuntime
)};

const _421 = function main(modules){return(
Array.from(modules).find(d => d[1] === 'main')[0]
)};

const _92 = function modules(runtime)
{
  // Builtins are stored in a separate module.
  const builtin = runtime._builtin;
  // Imported modules are keyed by their define() functions, which we don't need here.
  const imports = new Set(runtime._modules.values());
  // Find all modules by retrieving them directly from the variables.
  // Derived modules are "anonymous" but keep a reference to their source module.
  const source = m => !m._source ? m : source(m._source);
  const modules = new Set(Array.from(runtime._variables, v => source(v._module)));
  // When you edit a notebook on observablehq.com, Observable defines the
  // variables dynamically on main instead of creating a separate module.
  // When embedded however the entry notebook also becomes a Runtime module.
  const main = [...modules].find(m => m !== builtin && !imports.has(m));
  
  const _imports = [...imports];
  const labels = [
    [builtin, 'builtin'],
    [main || _imports.shift(), 'main'],
    ..._imports.map((m, i) => [m, `child${i+1}`]),
  ];
  
  return new Map(labels);
}
;

const _425 = function observed(no_observer,runtime){return(
function observed(variable = null) {
  const _observed = v => v._observer !== no_observer;
  if(variable !== null) return _observed(variable);
  const vars = new Set();
  for(const v of runtime._variables) _observed(v) && vars.add(v);
  return vars;
}
)};

const _423 = function no_observer(main)
{
  const v = main.variable();
  const o = v._observer;
  v.delete();
  return o;
}
;

const _678 = function captureRuntime(mutable_recomputeTrigger){return(
new Promise(resolve => {
  const forEach = Set.prototype.forEach;
  Set.prototype.forEach = function(...args) {
    const thisArg = args[1];
    forEach.apply(this, args);
    if(thisArg && thisArg._modules) {
      Set.prototype.forEach = forEach;
      resolve(thisArg);
    }
  };
  mutable_recomputeTrigger.value = mutable_recomputeTrigger.value + 1;
})
)};

const _736 = function mutable_recomputeTrigger(Mutable){return(
(m => m.generator ? m : Object.defineProperties({}, {
  [Symbol.toStringTag]: {value: "Mutable"},
  generator: {value: m},
  value: Object.getOwnPropertyDescriptor(m, "value"),
}))(new Mutable(0))
)};

const _941 = function recomputeTrigger(mutable_recomputeTrigger){return(
mutable_recomputeTrigger.generator
)};

const _522 = function viewof$ex_refresh(Inputs){return(
Inputs.button('Refresh')
)};

const _827 = function ex_vars(ex_refresh,runtime,modules,no_observer){return(
ex_refresh, Array.from(runtime._variables).map(v => ({
  name : v._name,
  module: modules.get(v._module),
  type: [, 'normal', 'implicit', 'duplicate'][v._type],
  observed: v._observer !== no_observer,
  inputs: v._inputs.length,
  outputs: v._outputs.size,
}))
)};

const _831 = function viewof$ex_vars_filters(ex_vars,Inputs)
{
  const unique = (arr, acc) => Array.from(new Set(arr.map(acc))).sort((a, b) => a?.localCompare?.(b));
  const modules = unique(ex_vars, v => v.module);
  const types = unique(ex_vars, v => v.type);
  const value = this?.value ?? {};
  
  return Inputs.form({
    modules: Inputs.checkbox(modules, {
      label: 'Modules',
      value: value.modules ?? modules,
    }),
    types: Inputs.checkbox(types, {
      label: 'Types',
      value: value.types ?? types,
    }),
    features: Inputs.checkbox(['named', 'observed', 'inputs', 'outputs'], {
      label: 'Features',
      value: value.features ?? [],
    })
  });
}
;

const _380 = function ex_vars_table(ex_vars_filters,ex_vars,Inputs)
{
  const flags = (arr) => Object.fromEntries(arr.map(v => [v, true]));
  const modules = flags(ex_vars_filters.modules);
  const types = flags(ex_vars_filters.types);
  const {named, observed, inputs, outputs} = flags(ex_vars_filters.features);

  const data = ex_vars.filter(d => true
    && modules[d.module]
    && types[d.type]
    && (!named || d.name != null)
    && (!observed || d.observed)
    && (!inputs || d.inputs)
    && (!outputs || d.outputs)
  );
  return Inputs.table(data);
}
;

const _501 = function ex_deps(ex_refresh,observed,Inputs,htl)
{
  ex_refresh;
  
  const vars = Array.from(observed(), d => ({
    name: d._name,
    inputs: Array.from(d._inputs, d => d._name)
  }));
  const inputs = new Set();
  for(const {inputs: i} of vars) for(const n of i) inputs.add(n);

  return Inputs.table(
    vars.map(d => ({
      '': d.name,
      ...Object.fromEntries(d.inputs.map(n => [n, '✔️'])),
    })),
    {
      columns: ['', ...Array.from(inputs).sort((a, b) => a.localeCompare(b))],
      header: {
        '': htl.html`<em>_name`
      }
    }
  );
  
}
;

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 135", ["md"], _135);
  main.define("runtime", ["recomputeTrigger","captureRuntime"], _733);
  main.define("main", ["modules"], _421);
  main.define("modules", ["runtime"], _92);
  main.define("observed", ["no_observer","runtime"], _425);
  main.define("no_observer", ["main"], _423);
  main.define("captureRuntime", ["mutable_recomputeTrigger"], _678);
  main.define("mutable_recomputeTrigger", ["Mutable"], _736);
  main.define("recomputeTrigger", ["mutable_recomputeTrigger"], _941);
  main.define("viewof ex_refresh", ["Inputs"], _522);
  main.define("ex_refresh", ["Generators", "viewof ex_refresh"], (G, _) => G.input(_));
  main.define("ex_vars", ["ex_refresh","runtime","modules","no_observer"], _827);
  main.define("viewof ex_vars_filters", ["ex_vars","Inputs"], _831);
  main.define("ex_vars_filters", ["Generators", "viewof ex_vars_filters"], (G, _) => G.input(_));
  main.define("ex_vars_table", ["ex_vars_filters","ex_vars","Inputs"], _380);
  main.define("ex_deps", ["ex_refresh","observed","Inputs","htl"], _501);
  return main;
}
