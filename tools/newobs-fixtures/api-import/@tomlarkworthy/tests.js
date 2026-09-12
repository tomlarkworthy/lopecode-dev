const _453 = function(tests){return(
tests({
  filter: (t) => t.computed
})
)};

const _376 = function viewof$example_type(Inputs){return(
Inputs.radio(
  ["success", "error", "pending", "changing"],
  {
    label: "case"
  }
)
)};

const _329 = async function* test_tests_example(example_type,invalidation)
{
  switch (example_type) {
    case "error":
      throw "Error";
    case "success":
      yield "Ok";
    case "pending":
      yield invalidation;
    case "changing":
      while (true) {
        yield Math.random();
        await new Promise((r) => setTimeout(r, 1000));
      }
  }
  yield invalidation;
}
;

const _88 = function modules(moduleMap,runtime){return(
moduleMap(runtime)
)};

const _53 = function viewof$testing_variables(scan,viewof$runtime_variables,modules,_,invalidation){return(
scan({
  view: viewof$runtime_variables,
  scan: (acc, value) => {
    const test_vars = [...value]
      .filter((v) => typeof v._name == "string" && v._name.startsWith("test_"))
      .map((v) => ({
        name: (modules.get(v._module)?.name || "") + "#" + v._name,
        running: v._reachable,
        variable: v
      }));
    return _.isEqual(acc, test_vars) ? undefined : test_vars;
  },
  invalidation
})
)};

const _169 = function(Inputs,testing_variables){return(
Inputs.table(testing_variables)
)};

const _557 = function isObservable(isOnObservableCom){return(
isOnObservableCom() &&
  !document.baseURI.startsWith(
    "https://observablehq.com/@tomlarkworthy/lopepage"
  )
)};

const _322 = function tests(background_task,Inputs,current,url,inspect){return(
({ filter = () => true } = {}) => {
  background_task;
  return Inputs.table(current.filter(filter), {
    rows: Infinity,
    columns: ["name", "state", "value"],
    reverse: true,
    format: {
      state: (state) =>
        state === "fulfilled"
          ? "✅"
          : state === "rejected"
          ? "❌"
          : state === "pending"
          ? "⌛️"
          : "⏸️",
      name: url,
      value: inspect
    },
    width: {
      state: "5%"
    },
    layout: "auto"
  });
}
)};

const _311 = function current(testing_variables,latest_state){return(
testing_variables
  .map((testing_variable) => ({
    name: testing_variable.name,
    state: "paused",
    ...latest_state.get(testing_variable.name),
    computed: testing_variable.running,
    variable: testing_variable.variable
  }))
  .sort((b, a) => {
    // 1) errors first
    if (a.error !== b.error) return a.error ? -1 : 1;
    // 2) “local” names (starting with ‘#’) next
    const aLocal = a.name.startsWith("#");
    const bLocal = b.name.startsWith("#");
    if (aLocal !== bLocal) return aLocal ? -1 : 1;
    // 3) finally, lexicographic by name
    return a.name.localeCompare(b.name);
  })
)};

const _517 = async (__variable) => {
const {linkTo} = await (import("./lopepage-urls").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("linkTo")?.import("linkTo", module);
  return {};
}));

return {linkTo};
};

const _496 = function url(isObservable,html,linkTo){return(
(name) => {
  if (isObservable) {
    return html`<a href="/${name}" target="_blank">${name}</a>`;
  } else {
    return html`<a href="${linkTo(name)}">${name}</a>`;
  }
}
)};

const _273 = function(Inputs,latest_state){return(
Inputs.table(
  [...latest_state.entries()].map(([name, state]) => ({
    name,
    ...state
  }))
)
)};

const _243 = function viewof$latest_state(Inputs){return(
Inputs.input(new Map())
)};

const _211 = function observers(){return(
new Map()
)};

const _217 = function changes(testing_variables,unorderedSync,observers){return(
testing_variables &&
  unorderedSync(
    testing_variables.filter((v) => v.running),
    [...observers.keys()],
    (a, b) => a.name == b
  )
)};

const _224 = function on_add(changes,observers,observe,viewof$latest_state,Event){return(
changes.add.forEach((testing_variable) => {
  observers.set(
    testing_variable.name,
    observe(testing_variable.variable, {
      fulfilled: (value) => {
        viewof$latest_state.value.set(testing_variable.name, {
          state: "fulfilled",
          value: value
        });
        viewof$latest_state.dispatchEvent(new Event("input"));
      },
      pending: (value) => {
        viewof$latest_state.value.set(testing_variable.name, {
          state: "pending"
        });
        viewof$latest_state.dispatchEvent(new Event("input"));
      },
      rejected: (error) => {
        viewof$latest_state.value.set(testing_variable.name, {
          state: "rejected",
          value: error
        });
        viewof$latest_state.dispatchEvent(new Event("input"));
      }
    })
  );
})
)};

const _293 = function on_remove(testing_variables,changes,observers,viewof$latest_state,Event)
{
  testing_variables;
  changes.remove.forEach((name) => {
    const current = observers.get(name);
    if (current) {
      current(); // deregister listener
      observers.delete(name);
    }
    viewof$latest_state.value.delete(name);
  });
  viewof$latest_state.dispatchEvent(new Event("input"));
}
;

const _478 = function tasks(on_add,on_remove,submit_summary)
{
  on_add;
  on_remove;
  submit_summary;
}
;

const _464 = function background_task(keepalive,testsModule){return(
keepalive(testsModule, "tasks")
)};

const _459 = function viewof$testsModule(thisModule){return(
thisModule()
)};

const _81 = async (__variable) => {
const {moduleMap, submit_summary} = await (import("./module-map").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("moduleMap")?.import("moduleMap", module);
  outputs.get("submit_summary")?.import("submit_summary", module);
  return {};
}));

return {moduleMap,submit_summary};
};

const _47 = async (__variable) => {
const {isOnObservableCom, runtime_variables, viewof$runtime_variables, runtime, unorderedSync, observe, thisModule, keepalive} = await (import("./runtime-sdk").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("isOnObservableCom")?.import("isOnObservableCom", module);
  outputs.get("runtime_variables")?.import("runtime_variables", module);
  outputs.get("viewof$runtime_variables")?.import("viewof runtime_variables", "viewof$runtime_variables", module);
  outputs.get("runtime")?.import("runtime", module);
  outputs.get("unorderedSync")?.import("unorderedSync", module);
  outputs.get("observe")?.import("observe", module);
  outputs.get("thisModule")?.import("thisModule", module);
  outputs.get("keepalive")?.import("keepalive", module);
  return {};
}));

return {isOnObservableCom,runtime_variables,viewof$runtime_variables,runtime,unorderedSync,observe,thisModule,keepalive};
};

const _55 = async (__variable) => {
const {scan} = await (import("./stream-operators").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("scan")?.import("scan", module);
  return {};
}));

return {scan};
};

const _485 = async (__variable) => {
const {inspect, Inspector} = await (import("./inspector").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("inspect")?.import("inspect", module);
  outputs.get("Inspector")?.import("Inspector", module);
  return {};
}));

return {inspect,Inspector};
};

export default function define(runtime) {
  const main = runtime.module();
  main.define("cell 453", ["tests"], _453);
  main.define("viewof example_type", ["Inputs"], _376);
  main.define("example_type", ["Generators", "viewof example_type"], (G, _) => G.input(_));
  main.define("test_tests_example", ["example_type","invalidation"], _329);
  main.define("modules", ["moduleMap","runtime"], _88);
  main.define("viewof testing_variables", ["scan","viewof runtime_variables","modules","_","invalidation"], _53);
  main.define("testing_variables", ["Generators", "viewof testing_variables"], (G, _) => G.input(_));
  main.define("cell 169", ["Inputs","testing_variables"], _169);
  main.define("isObservable", ["isOnObservableCom"], _557);
  main.define("tests", ["background_task","Inputs","current","url","inspect"], _322);
  main.define("current", ["testing_variables","latest_state"], _311);
  main.define("cell 517", ["@variable"], _517);
  main.define("linkTo", ["cell 517"], (_) => _.linkTo);
  main.define("url", ["isObservable","html","linkTo"], _496);
  main.define("cell 273", ["Inputs","latest_state"], _273);
  main.define("viewof latest_state", ["Inputs"], _243);
  main.define("latest_state", ["Generators", "viewof latest_state"], (G, _) => G.input(_));
  main.define("observers", [], _211);
  main.define("changes", ["testing_variables","unorderedSync","observers"], _217);
  main.define("on_add", ["changes","observers","observe","viewof latest_state","Event"], _224);
  main.define("on_remove", ["testing_variables","changes","observers","viewof latest_state","Event"], _293);
  main.define("tasks", ["on_add","on_remove","submit_summary"], _478);
  main.define("background_task", ["keepalive","testsModule"], _464);
  main.define("viewof testsModule", ["thisModule"], _459);
  main.define("testsModule", ["Generators", "viewof testsModule"], (G, _) => G.input(_));
  main.define("cell 81", ["@variable"], _81);
  main.define("moduleMap", ["cell 81"], (_) => _.moduleMap);
  main.define("submit_summary", ["cell 81"], (_) => _.submit_summary);
  main.define("cell 47", ["@variable"], _47);
  main.define("isOnObservableCom", ["cell 47"], (_) => _.isOnObservableCom);
  main.define("runtime_variables", ["cell 47"], (_) => _.runtime_variables);
  main.define("viewof$runtime_variables", ["cell 47"], (_) => _.viewof$runtime_variables);
  main.define("runtime", ["cell 47"], (_) => _.runtime);
  main.define("unorderedSync", ["cell 47"], (_) => _.unorderedSync);
  main.define("observe", ["cell 47"], (_) => _.observe);
  main.define("thisModule", ["cell 47"], (_) => _.thisModule);
  main.define("keepalive", ["cell 47"], (_) => _.keepalive);
  main.define("cell 55", ["@variable"], _55);
  main.define("scan", ["cell 55"], (_) => _.scan);
  main.define("cell 485", ["@variable"], _485);
  main.define("inspect", ["cell 485"], (_) => _.inspect);
  main.define("Inspector", ["cell 485"], (_) => _.Inspector);
  return main;
}
