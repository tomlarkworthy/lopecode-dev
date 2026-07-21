const _1dz4ftw = function _1(md){return(
md`# Tests`
)};
const _svrcyh = function _2(tests){return(
tests({
  filter: (t) => t.computed
})
)};
const _1rfwb8c = function _3(md){return(
md`## Low Boiler-plate

Any *cell*, that starts with \`test_\` is considered a test, whether in the main notebook or in a dependancy. The cell is considered "passing" if it evaluates to a non-error. Inspired by pytest auto-discovery.


The runner makes no assumption on how you actually test. You could use programatic tests or something more sophisticated like \`expect\`. Just throw something to indicate failure.

You can filter the tests to lower the quantity

\`\`\`js
import {tests} from "@tomlarkworthy/tests"
\`\`\``
)};
const _1sr7w7b = function _4(md){return(
md`## Interactive Examples

Demo of the test state is reactive, even with active dataflow.`
)};
const _8dmusz = function _example_type(Inputs){return(
Inputs.radio(
  ["success", "error", "pending", "changing"],
  {
    label: "case"
  }
)
)};
const _4jpb27 = (G, _) => G.input(_);
const _17ce9dw = async function* _test_tests_example(example_type)
{
  switch (example_type) {
    case "error":
      throw "Error";
    case "success":
      yield "Ok";
    case "pending":
      yield new Promise(() => {});
    case "changing":
      while (true) {
        yield Math.random();
        await new Promise((r) => setTimeout(r, 1000));
      }
  }
  yield new Promise(() => {});
};
const _178t107 = function _7(md){return(
md`## Testing variables

variables that start with "\`test_\`", sniffed from the runtime, updated reactively`
)};
const _kdc1xp = function _modules(moduleMap,runtime){return(
moduleMap(runtime)
)};
const _pvmmyu = function _testing_variables(scan,$0,modules,_,invalidation){return(
scan({
  view: $0,
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
const _f8uda4 = (G, _) => G.input(_);
const _10ijqbr = function _10(Inputs,testing_variables){return(
Inputs.table(testing_variables)
)};
const _1x5l69t = function _11(md){return(
md`## UI`
)};
const _1i63u1w = function _isObservable(isOnObservableCom){return(
isOnObservableCom() &&
  !document.baseURI.startsWith(
    "https://observablehq.com/@tomlarkworthy/lopepage"
  )
)};
const _1lcc2kp = function _tests(background_task,Inputs,current,url,inspect){return(
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
const _14i2w5u = function _current(testing_variables,latest_state){return(
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
const _marb2k = function _url(isObservable,html,linkTo){return(
(name) => {
  if (isObservable) {
    return html`<a href="/${name}" target="_blank">${name}</a>`;
  } else {
    return html`<a href="${linkTo(name)}">${name}</a>`;
  }
}
)};
const _1ucl8yc = function _17(md){return(
md`## Latest State

Variables update reactively, so observers are registered for running testing variables and update the latest state as information arrives. Only applied to running variables.`
)};
const _jjcune = function _18(Inputs,latest_state){return(
Inputs.table(
  [...latest_state.entries()].map(([name, state]) => ({
    name,
    ...state
  }))
)
)};
const _1yj8u7a = function _latest_state(Inputs){return(
Inputs.input(new Map())
)};
const _1oauj1h = (G, _) => G.input(_);
const _12gobz9 = function _observers(){return(
new Map()
)};
const _1f4s8vv = function _21(md){return(
md`### Observer syncronization`
)};
const _1tgtkh5 = function _changes(testing_variables,unorderedSync,observers){return(
testing_variables &&
  unorderedSync(
    testing_variables.filter((v) => v.running),
    [...observers.keys()],
    (a, b) => a.name == b
  )
)};
const _651fwr = function _on_add(changes,observers,observe,$0,Event){return(
changes.add.forEach((testing_variable) => {
  observers.set(
    testing_variable.name,
    observe(testing_variable.variable, {
      fulfilled: (value) => {
        $0.value.set(testing_variable.name, {
          state: "fulfilled",
          value: value
        });
        $0.dispatchEvent(new Event("input"));
      },
      pending: (value) => {
        $0.value.set(testing_variable.name, {
          state: "pending"
        });
        $0.dispatchEvent(new Event("input"));
      },
      rejected: (error) => {
        $0.value.set(testing_variable.name, {
          state: "rejected",
          value: error
        });
        $0.dispatchEvent(new Event("input"));
      }
    })
  );
})
)};
const _1xau6wo = function _on_remove(testing_variables,changes,observers,$0,Event)
{
  testing_variables;
  changes.remove.forEach((name) => {
    const current = observers.get(name);
    if (current) {
      current(); // deregister listener
      observers.delete(name);
    }
    $0.value.delete(name);
  });
  $0.dispatchEvent(new Event("input"));
};
const _1xl3w2k = function _25(md){return(
md`## Background Tasks`
)};
const _1ot9yzi = function _tasks(on_add,on_remove,submit_summary)
{
  on_add;
  on_remove;
  submit_summary;
};
const _1866ovz = function _background_task(keepalive,testsModule){return(
keepalive(testsModule, "tasks")
)};
const _1ggf21v = function _testsModule(thisModule){return(
thisModule()
)};
const _1t9t1fv = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  main.define("module @tomlarkworthy/module-map", async () => runtime.module((await import("/@tomlarkworthy/module-map.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/stream-operators", async () => runtime.module((await import("/@tomlarkworthy/stream-operators.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  $def("_1dz4ftw", null, ["md"], _1dz4ftw);  
  $def("_svrcyh", null, ["tests"], _svrcyh);  
  $def("_1rfwb8c", null, ["md"], _1rfwb8c);  
  $def("_1sr7w7b", null, ["md"], _1sr7w7b);  
  $def("_8dmusz", "viewof example_type", ["Inputs"], _8dmusz);  
  $def("_4jpb27", "example_type", ["Generators","viewof example_type"], _4jpb27);  
  $def("_17ce9dw", "test_tests_example", ["example_type"], _17ce9dw);  
  $def("_178t107", null, ["md"], _178t107);  
  $def("_kdc1xp", "modules", ["moduleMap","runtime"], _kdc1xp);  
  $def("_pvmmyu", "viewof testing_variables", ["scan","viewof runtime_variables","modules","_","invalidation"], _pvmmyu);  
  $def("_f8uda4", "testing_variables", ["Generators","viewof testing_variables"], _f8uda4);  
  $def("_10ijqbr", null, ["Inputs","testing_variables"], _10ijqbr);  
  $def("_1x5l69t", null, ["md"], _1x5l69t);  
  $def("_1i63u1w", "isObservable", ["isOnObservableCom"], _1i63u1w);  
  $def("_1lcc2kp", "tests", ["background_task","Inputs","current","url","inspect"], _1lcc2kp);  
  $def("_14i2w5u", "current", ["testing_variables","latest_state"], _14i2w5u);  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));  
  $def("_marb2k", "url", ["isObservable","html","linkTo"], _marb2k);  
  $def("_1ucl8yc", null, ["md"], _1ucl8yc);  
  $def("_jjcune", null, ["Inputs","latest_state"], _jjcune);  
  $def("_1yj8u7a", "viewof latest_state", ["Inputs"], _1yj8u7a);  
  $def("_1oauj1h", "latest_state", ["Generators","viewof latest_state"], _1oauj1h);  
  $def("_12gobz9", "observers", [], _12gobz9);  
  $def("_1f4s8vv", null, ["md"], _1f4s8vv);  
  $def("_1tgtkh5", "changes", ["testing_variables","unorderedSync","observers"], _1tgtkh5);  
  $def("_651fwr", "on_add", ["changes","observers","observe","viewof latest_state","Event"], _651fwr);  
  $def("_1xau6wo", "on_remove", ["testing_variables","changes","observers","viewof latest_state","Event"], _1xau6wo);  
  $def("_1xl3w2k", null, ["md"], _1xl3w2k);  
  $def("_1ot9yzi", "tasks", ["on_add","on_remove","submit_summary"], _1ot9yzi);  
  $def("_1866ovz", "background_task", ["keepalive","testsModule"], _1866ovz);  
  $def("_1ggf21v", "viewof testsModule", ["thisModule"], _1ggf21v);  
  $def("_1t9t1fv", "testsModule", ["Generators","viewof testsModule"], _1t9t1fv);  
  main.define("moduleMap", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("moduleMap", _));  
  main.define("submit_summary", ["module @tomlarkworthy/module-map", "@variable"], (_, v) => v.import("submit_summary", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("viewof runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("viewof runtime_variables", _));  
  main.define("runtime_variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime_variables", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("unorderedSync", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("unorderedSync", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("scan", ["module @tomlarkworthy/stream-operators", "@variable"], (_, v) => v.import("scan", _));  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));
  return main;
}