const _21 = function invokeVariable(lookupVariable)
{
  return async function invokeVariable(name, module, overrides = {}) {
    if (overrides == null || typeof overrides !== 'object')
      throw new TypeError('invokeVariable(name, module, {overrides}): overrides must be an object');
    // Accept a Variable reference directly as the first arg (skip the lookupVariable stall when
    // the caller already holds it); otherwise resolve by (name, module).
    let variable;
    if (name && typeof name === 'object' && typeof name._definition !== 'undefined') {
      variable = name;
      module = module ?? variable._module;
    } else {
      if (typeof name !== 'string' || !name.length)
        throw new TypeError('invokeVariable(name, module, \u2026): name must be a non-empty string');
      if (!module)
        throw new TypeError('invokeVariable(name, module, \u2026): module is required');
      variable = await lookupVariable(name, module);
      if (!variable)
        throw new Error(`invokeVariable: variable "${ name }" not found in module`);
    }
    module = module ?? variable._module;
    const label = variable._name ?? (typeof name === 'string' ? name : '(anonymous)');
    const inputs = Array.isArray(variable._inputs) ? variable._inputs : [];
    const inputNames = inputs.map(v => v?._name);
    for (const k of Object.keys(overrides)) {
      if (!inputNames.includes(k)) {
        throw new Error(`invokeVariable("${ label }"): override "${ k }" was provided but is not a declared dependency. Declared dependencies: ${ inputNames.filter(Boolean).join(', ') }`);
      }
    }
    const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const resolveDependency = async depName => {
      if (hasOwn(overrides, depName))
        return overrides[depName];
      const scopeVar = module?._scope?.get?.(depName) ?? module?._runtime?._builtin?._scope?.get?.(depName);
      if (scopeVar) {
        if (scopeVar._value !== undefined)
          return scopeVar._value;
        if (scopeVar._promise && typeof scopeVar._promise?.then === 'function')
          return await scopeVar._promise;
      }
      if (typeof module?.value === 'function') {
        try {
          return await module.value(depName);
        } catch (e) {
        }
      }
      if (module?._runtime && typeof module._runtime._global === 'function') {
        try {
          const g = module._runtime._global(depName);
          if (g !== undefined)
            return g;
        } catch (e) {
        }
      }
      throw new Error(`invokeVariable("${ label }"): could not resolve dependency "${ depName }" (no override and not found in module/builtins/global)`);
    };
    const args = [];
    for (const dep of inputs) {
      const depName = dep?._name;
      if (!depName) {
        args.push(undefined);
        continue;
      }
      args.push(await resolveDependency(depName));
    }
    const def = variable._definition;
    if (typeof def !== 'function') {
      throw new Error(`invokeVariable("${ label }"): target variable does not have an invokable function definition`);
    }
    return def(...args);
  };
}
;

const _25 = function a(){return(
1
)};

const _27 = function b(){return(
3
)};

const _29 = function c(a,b){return(
a + b
)};

const _31 = function(invokeVariable,invokeVariableModule){return(
invokeVariable("c", invokeVariableModule)
)};

const _33 = function(invokeVariable,invokeVariableModule){return(
invokeVariable("c", invokeVariableModule, { b: 20 })
)};

const _17 = function viewof$invokeVariableModule(thisModule){return(
thisModule()
)};

const _13 = async (__variable) => {
const {lookupVariable, thisModule} = await (import("./runtime-sdk").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("lookupVariable")?.import("lookupVariable", module);
  outputs.get("thisModule")?.import("thisModule", module);
  return {};
}));

return {lookupVariable,thisModule};
};

export default function define(runtime) {
  const main = runtime.module();
  main.define("invokeVariable", ["lookupVariable"], _21);
  main.define("a", [], _25);
  main.define("b", [], _27);
  main.define("c", ["a","b"], _29);
  main.define("cell 31", ["invokeVariable","invokeVariableModule"], _31);
  main.define("cell 33", ["invokeVariable","invokeVariableModule"], _33);
  main.define("viewof invokeVariableModule", ["thisModule"], _17);
  main.define("invokeVariableModule", ["Generators", "viewof invokeVariableModule"], (G, _) => G.input(_));
  main.define("cell 13", ["@variable"], _13);
  main.define("lookupVariable", ["cell 13"], (_) => _.lookupVariable);
  main.define("thisModule", ["cell 13"], (_) => _.thisModule);
  return main;
}
