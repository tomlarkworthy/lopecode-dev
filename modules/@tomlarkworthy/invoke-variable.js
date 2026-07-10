const _zkje0r = function _1(md){return(
md`# \`invokeVariable(<name>, <module>, overrides = {})\`

Test individual variables by calling them with injected values. Lets you test different scenarios without changing your core logic. Pairs with [@tomlarkworthy/tester](https://observablehq.com/@tomlarkworthy/tester)`
)};
const _kfe4ll = function _invokeVariable(lookupVariable){return(
async function invokeVariable(name, module, overrides = {}) {
  if (overrides == null || typeof overrides !== "object")
    throw new TypeError(
      "invokeVariable(name, module, {overrides}): overrides must be an object"
    );

  // Accept a Variable reference directly as the first arg (skip the lookupVariable stall when
  // the caller already holds it); otherwise resolve by (name, module).
  let variable;
  if (name && typeof name === "object" && typeof name._definition !== "undefined") {
    variable = name;
    module = module ?? variable._module;
  } else {
    if (typeof name !== "string" || !name.length)
      throw new TypeError(
        "invokeVariable(name, module, …): name must be a non-empty string"
      );
    if (!module)
      throw new TypeError("invokeVariable(name, module, …): module is required");
    variable = await lookupVariable(name, module);
    if (!variable)
      throw new Error(`invokeVariable: variable "${name}" not found in module`);
  }
  module = module ?? variable._module;
  const label = variable._name ?? (typeof name === "string" ? name : "(anonymous)");

  const inputs = Array.isArray(variable._inputs) ? variable._inputs : [];
  const inputNames = inputs.map((v) => v?._name);

  for (const k of Object.keys(overrides)) {
    if (!inputNames.includes(k)) {
      throw new Error(
        `invokeVariable("${label}"): override "${k}" was provided but is not a declared dependency. Declared dependencies: ${inputNames
          .filter(Boolean)
          .join(", ")}`
      );
    }
  }

  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  const resolveDependency = async (depName) => {
    if (hasOwn(overrides, depName)) return overrides[depName];

    const scopeVar =
      module?._scope?.get?.(depName) ??
      module?._runtime?._builtin?._scope?.get?.(depName);

    if (scopeVar) {
      if (scopeVar._value !== undefined) return scopeVar._value;
      if (scopeVar._promise && typeof scopeVar._promise?.then === "function")
        return await scopeVar._promise;
    }

    if (typeof module?.value === "function") {
      try {
        return await module.value(depName);
      } catch (e) {}
    }

    if (module?._runtime && typeof module._runtime._global === "function") {
      try {
        const g = module._runtime._global(depName);
        if (g !== undefined) return g;
      } catch (e) {}
    }

    throw new Error(
      `invokeVariable("${label}"): could not resolve dependency "${depName}" (no override and not found in module/builtins/global)`
    );
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
  if (typeof def !== "function") {
    throw new Error(
      `invokeVariable("${label}"): target variable does not have an invokable function definition`
    );
  }
  return def(...args);
}
)};
const _jtrr9m = function _3(md){return(
md`### Example

let c = a + b`
)};
const _1v2c0s1 = function _a(){return(
1
)};
const _ywl8oh = function _b(){return(
3
)};
const _1mc3tpl = function _c(a,b){return(
a + b
)};
const _o5e50u = function _7(md){return(
md`If we invoke c without any overrides we get the notebook behaviour (i.e. the answer is 4, as a is 1 and b is 3)`
)};
const _tnoyf9 = function _8(invokeVariable,invokeVariableModule){return(
invokeVariable("c", invokeVariableModule)
)};
const _smh5by = function _9(md){return(
md`But we can set b to 20, and then we get the answer 21.`
)};
const _d996jo = function _10(invokeVariable,invokeVariableModule){return(
invokeVariable("c", invokeVariableModule, { b: 20 })
)};
const _qh0yhm = function _11(md){return(
md`To call invokeVariable we need a reference to the module, which we can obtain with thisModule() (see runtime-sdk)`
)};
const _1hy0qcz = function _invokeVariableModule(thisModule){return(
thisModule()
)};
const _jno7wc = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_zkje0r", null, ["md"], _zkje0r);  
  $def("_kfe4ll", "invokeVariable", ["lookupVariable"], _kfe4ll);  
  $def("_jtrr9m", null, ["md"], _jtrr9m);  
  $def("_1v2c0s1", "a", [], _1v2c0s1);  
  $def("_ywl8oh", "b", [], _ywl8oh);  
  $def("_1mc3tpl", "c", ["a","b"], _1mc3tpl);  
  $def("_o5e50u", null, ["md"], _o5e50u);  
  $def("_tnoyf9", null, ["invokeVariable","invokeVariableModule"], _tnoyf9);  
  $def("_smh5by", null, ["md"], _smh5by);  
  $def("_d996jo", null, ["invokeVariable","invokeVariableModule"], _d996jo);  
  $def("_qh0yhm", null, ["md"], _qh0yhm);  
  $def("_1hy0qcz", "viewof invokeVariableModule", ["thisModule"], _1hy0qcz);  
  $def("_jno7wc", "invokeVariableModule", ["Generators","viewof invokeVariableModule"], _jno7wc);  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
