const _1iogq99 = function _1(md){return(
md`# Programmatic \`importNotebook\`

\`importNotebook\` is a programmatic version of \`import\`. After an export, the import becomes "baked in" and offline-first.


Issues:-
- Observable dependancy resolution can miss, leading to new modules which look similar but are not the same
- Would be better to import to an isolated module, reserialize, and depend on that.
- By the time the module is running we lost import map magic though.
- Maybe esModuleShim can help import a module but hook the resolution. Also supports dynamic import maps.`
)};
const _1n7w35r = function _2(runtime){return(
runtime._modules
)};
const _1kixzlo = function _3(importNotebook)
{
  importNotebook("@tomlarkworthy/exporter-2", [
    {
      imported: "exporter",
      /* optional */ local: "exporter2"
    }
  ]);
};
const _1w278sp = function _4(md){return(
md`The following cell demonstrate the imported cell works. Also, its the exporter dependancy so you can see that the import continues to work after export, and even offline.`
)};
const _1phzazj = function _5(exporter2){return(
exporter2()
)};
const _1g7x12j = function _importNotebook(runtime,resolutions_key,main,md){return(
async (notebook, specifiers = []) => {
  runtime;
  let fn;
  const importKeyword = window.importShim ? "importShim" : "import";
  for (const url of [
    notebook,
    `https://api.observablehq.com/${notebook}.js?v=4&${resolutions_key}`
  ]) {
    try {
      fn = eval(
        `async () => runtime.module((await ${importKeyword}("${url}")).default)`
      );
      await fn();
      break;
    } catch {}
  }
  if (!fn) throw `Can't resolve ${notebook}`;

  const module_variable = `module ${notebook}`;

  if (!main._scope.has(module_variable)) {
    main.define(module_variable, fn);
  }

  for (let { imported, local = null } of specifiers) {
    if (!local) local = imported;
    if (!main._scope.has(local)) {
      main.define(local, [module_variable, "@variable"], (_, v) =>
        v.import(imported, local, _)
      );
    } else {
      main.redefine(local, [module_variable, "@variable"], (_, v) =>
        v.import(imported, local, _)
      );
    }
  }

  return md`~~~js
importNotebook("${notebook}", ${JSON.stringify(specifiers)})
~~~`;
}
)};
const _huzc31 = function _resolutions_key(isOnObservableCom,runtime)
{
  if (isOnObservableCom()) {
    for (let v of runtime._variables) {
      let match;
      if (
        v._value?._scope &&
        (match = /(resolutions=[a-f0-9]+@\d+)/.exec(v._definition.toString()))
      ) {
        return match[1];
      }
    }
  }
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_1iogq99", null, ["md"], _1iogq99);  
  $def("_1n7w35r", null, ["runtime"], _1n7w35r);  
  $def("_1kixzlo", null, ["importNotebook"], _1kixzlo);  
  $def("_1w278sp", null, ["md"], _1w278sp);  
  $def("_1phzazj", null, ["exporter2"], _1phzazj);  
  $def("_1g7x12j", "importNotebook", ["runtime","resolutions_key","main","md"], _1g7x12j);  
  $def("_huzc31", "resolutions_key", ["isOnObservableCom","runtime"], _huzc31);  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));
  return main;
}