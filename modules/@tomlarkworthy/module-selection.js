const _1umhlcn = function _1(md){return(
md`# Explorer: Module Selector`
)};
const _b6n8js = function _2(visualizeModules){return(
visualizeModules()
)};
const _1y97u4c = function _selected_modules(persistedAttachments,hash,getHashModules,currentModules,Inputs,html,linkTo)
{
  persistedAttachments; // load persisted modules as well
  hash; // recompute if hash changes
  const hashModules = getHashModules();
  const modules = [...currentModules.values()].map((m) => ({
    ...m,
    cell: hashModules.get(m.name)?.cell
  }));
  return Inputs.table(modules, {
    rows: Infinity,
    sort: "name",
    columns: ["name" /*, "cell"*/],
    required: false,
    value: modules.filter((m) => hashModules.get(m.name)),
    format: {
      name: (name) => html`<a href="${linkTo(name)}">${name}</a>`
    }
  });
};
const _1j5tq63 = (G, _) => G.input(_);
const _yiedgc = function _4(currentModules){return(
currentModules.values()
)};
const _y5ux30 = function _create_module(Inputs){return(
Inputs.text({
  label: "create module",
  width: "400px",
  submit: "create",
  placeholder: "@user/scratch",
  width: "400px",
  pattern: "^@[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$"
})
)};
const _1ll7bx3 = (G, _) => G.input(_);
const _1vrx9jk = function _additional_module(Inputs){return(
Inputs.text({
  label: "load module",
  placeholder: "@tomlarkworthy/debugger",
  width: "400px",
  pattern: "^@[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$",
  submit: "import"
})
)};
const _3ukf68 = (G, _) => G.input(_);
const _au41oe = function _remove_module(Inputs,currentModules){return(
Inputs.select([null, currentModules.values()], {
  label: "remove module",
  width: "400px",
  format: (module) => module?.name
})
)};
const _1iasv3r = (G, _) => G.input(_);
const _hj6sn = function _9(md){return(
md`## Additional Modules

Extra modules for dynamic loading are named as a JSON list in file attachment \`additionalModules.json\``
)};
const _17w9o9j = function _notebookModule(thisModule){return(
thisModule()
)};
const _1f136ll = (G, _) => G.input(_);
const _ngwjdv = async function _persistedAttachments(getFileAttachments,notebookModule,importNotebook)
{
  const attachments = getFileAttachments(notebookModule);
  if (attachments.has("additionalModules.json")) {
    const extras = new Set(
      await attachments.get("additionalModules.json").json()
    );
    await Promise.all(
      [...extras].map(async (notebook) => await importNotebook(notebook, []))
    );
    return extras;
  } else return new Set();
};
const _1huqss5 = function _additionalModules(persistedAttachments){return(
persistedAttachments || new Set()
)};
const _a2tw23 = function _addModuleAndPersist(additionalModules,setFileAttachment,jsonFileAttachment,notebookModule){return(
function addModuleAndPersist(name) {
  additionalModules.add(name);
  setFileAttachment(
    jsonFileAttachment("additionalModules.json", [...additionalModules]),
    notebookModule
  );
}
)};
const _vk2l4w = function _removeModuleAndPersist(additionalModules,setFileAttachment,jsonFileAttachment,notebookModule){return(
(name) => {
  additionalModules.delete(name);
  setFileAttachment(
    jsonFileAttachment("additionalModules.json", [...additionalModules]),
    notebookModule
  );
}
)};
const _iz3nhl = function _createModule($0,invalidation,create_module,notebookModule,addModuleAndPersist)
{
  const input = $0.querySelector("input");
  const report = () => $0.reportValidity();
  input.addEventListener("input", report);
  invalidation.then(() => input.removeEventListener("input", report));

  if (create_module && create_module !== "") {
    const runtime = notebookModule._runtime;
    const moduleSource = `export default function define(runtime, observer) {
      const main = runtime.module();
      main.variable(observer()).define(["md"], (md) => md\`# Untitled\`);
    }`;
    const blob = new Blob([moduleSource], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const variableSource = `async () => "${create_module}" && runtime.module((await import("${url}")).default)`;
    let definition;
    eval("definition = " + variableSource);
    const moduleVariable = notebookModule.define(
      `module ${create_module}`,
      [],
      definition
    );
    addModuleAndPersist(create_module);
    return moduleVariable;
  }
};
const _qq8c6a = async function _addModule($0,invalidation,additional_module,additionalModules,importNotebook,addModuleAndPersist)
{
  const input = $0.querySelector("input");
  const report = () => $0.reportValidity();
  input.addEventListener("input", report);
  invalidation.then(() => input.removeEventListener("input", report));
  if (
    additional_module &&
    additional_module !== "" &&
    !additionalModules.has(additional_module)
  ) {
    await importNotebook(additional_module, []);
    addModuleAndPersist(additional_module);
  }
};
const _7048bu = function _removeModule(remove_module,removeModuleAndPersist)
{
  if (remove_module) {
    removeModuleAndPersist(remove_module);
    const variables = [...remove_module.module._runtime._variables].filter(
      (v) =>
        v._module == remove_module.module ||
        v._name == `module ${remove_module.name}`
    );
    const entry = [...remove_module.module._runtime._modules.entries()].find(
      ([key, value]) => value == remove_module.module
    );

    if (entry) {
      const [define, module] = entry;
      remove_module.module._runtime._modules.delete(define);
    }

    variables.forEach((v) => v.delete());
    return remove_module;
  }
};
const _krx5v2 = function _20(moduleMap){return(
moduleMap()
)};
const _1y8y9do = function _21(md){return(
md`## URL encoding`
)};
const _1tr0cuo = function _getHashModules(URLSearchParams,location,listModules){return(
() => {
  const hashParams = new URLSearchParams(location.hash.slice(1));
  const view = hashParams.get("view");
  const open = hashParams.get("open");

  const base = (() => {
    try {
      const m = listModules(view);
      return m instanceof Map ? m : new Map(m);
    } catch (err) {
      return new Map();
    }
  })();

  if (open) {
    const [title, cell] = String(open).split("#");
    if (title) base.set(title, { title, cell: cell || null });
  }

  return new Map(base);
}
)};
const _lru2lz = function _25(md){return(
md`## Model`
)};
const _wcovkr = function _26(md){return(
md`## Background Tasks`
)};
const _a3xgg4 = function _navigator_jobs(updateNotebookImports,submit_summary,$0,currentModules)
{
  updateNotebookImports, submit_summary, $0, currentModules;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/import-notebook", async () => runtime.module((await import("/@tomlarkworthy/import-notebook.js?v=4")).default));  
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module d/57d79353bac56631@44", async () => runtime.module((await import("/d/57d79353bac56631@44.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  $def("_1umhlcn", null, ["md"], _1umhlcn);  
  $def("_b6n8js", null, ["visualizeModules"], _b6n8js);  
  $def("_1y97u4c", "viewof selected_modules", ["persistedAttachments","hash","getHashModules","currentModules","Inputs","html","linkTo"], _1y97u4c);  
  $def("_1j5tq63", "selected_modules", ["Generators","viewof selected_modules"], _1j5tq63);  
  $def("_yiedgc", null, ["currentModules"], _yiedgc);  
  $def("_y5ux30", "viewof create_module", ["Inputs"], _y5ux30);  
  $def("_1ll7bx3", "create_module", ["Generators","viewof create_module"], _1ll7bx3);  
  $def("_1vrx9jk", "viewof additional_module", ["Inputs"], _1vrx9jk);  
  $def("_3ukf68", "additional_module", ["Generators","viewof additional_module"], _3ukf68);  
  $def("_au41oe", "viewof remove_module", ["Inputs","currentModules"], _au41oe);  
  $def("_1iasv3r", "remove_module", ["Generators","viewof remove_module"], _1iasv3r);  
  main.define("cellMap", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("cellMap", _));  
  $def("_hj6sn", null, ["md"], _hj6sn);  
  $def("_17w9o9j", "viewof notebookModule", ["thisModule"], _17w9o9j);  
  $def("_1f136ll", "notebookModule", ["Generators","viewof notebookModule"], _1f136ll);  
  main.define("importNotebook", ["module @tomlarkworthy/import-notebook", "@variable"], (_, v) => v.import("importNotebook", _));  
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));  
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));  
  main.define("removeFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("removeFileAttachment", _));  
  main.define("getFileAttachments", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachments", _));  
  $def("_ngwjdv", "persistedAttachments", ["getFileAttachments","notebookModule","importNotebook"], _ngwjdv);  
  $def("_1huqss5", "additionalModules", ["persistedAttachments"], _1huqss5);  
  $def("_a2tw23", "addModuleAndPersist", ["additionalModules","setFileAttachment","jsonFileAttachment","notebookModule"], _a2tw23);  
  $def("_vk2l4w", "removeModuleAndPersist", ["additionalModules","setFileAttachment","jsonFileAttachment","notebookModule"], _vk2l4w);  
  $def("_iz3nhl", "createModule", ["viewof create_module","invalidation","create_module","notebookModule","addModuleAndPersist"], _iz3nhl);  
  $def("_qq8c6a", "addModule", ["viewof additional_module","invalidation","additional_module","additionalModules","importNotebook","addModuleAndPersist"], _qq8c6a);  
  $def("_7048bu", "removeModule", ["remove_module","removeModuleAndPersist"], _7048bu);  
  $def("_krx5v2", null, ["moduleMap"], _krx5v2);  
  $def("_1y8y9do", null, ["md"], _1y8y9do);  
  main.define("parseGoldenDSL", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("parseGoldenDSL", _));  
  main.define("listModules", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("listModules", _));  
  main.define("serializeGoldenDSL", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("serializeGoldenDSL", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  main.define("updateNotebookImports", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("updateNotebookImports", _));  
  $def("_1tr0cuo", "getHashModules", ["URLSearchParams","location","listModules"], _1tr0cuo);  
  main.define("hash", ["module d/57d79353bac56631@44", "@variable"], (_, v) => v.import("hash", _));  
  $def("_lru2lz", null, ["md"], _lru2lz);  
  $def("_wcovkr", null, ["md"], _wcovkr);  
  $def("_a3xgg4", "navigator_jobs", ["updateNotebookImports","submit_summary","viewof currentModules","currentModules"], _a3xgg4);  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("viewof currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("viewof currentModules", _));  
  main.define("currentModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("currentModules", _));  
  main.define("visualizeModules", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("visualizeModules", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));
  return main;
}