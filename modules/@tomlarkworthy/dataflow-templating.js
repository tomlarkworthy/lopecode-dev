const _vnsmd3 = function _1(md){return(
md`# Dataflow Templating

## The missing generative abstraction for dataflow programming.

`
)};
const _1edhe6y = function _2(md){return(
md`\`\`\`js

import {cloneDataflow, thisModule, lookupVariable} from '@tomlarkworthy/dataflow-templating'
\`\`\``
)};
const _190zbgd = function _3(md){return(
md`### Why?

There is a reusability gap with notebooks (and spreadsheets for that matter). When you express a complex chain of computation, they build upon a set of initial inputs, unrolled across a series of cells. But then you realize, there is no way you can reuse the same logic with a different set of inputs in the same way you can with a function. The cells are single use.

But I love dataflow, notebooks, inspectable cells and the accompanying documentation! The inspectability of intermediate steps with dataflow programming speeds development through tight feedback. I love that I can build a program up one step at a time incrementally without needing to know the end game and without having to frequently rerun a program from scratch. However, the reusability gap bites hard when trying to generalize from a notebook's incrementally developed single solution to reusable library functions.

Dataflow templating addresses this reusability problem. We take a working dataflow graph and logically clone it. The clones contain distinct isolated reactive variables, but identical computation, so the values flowing through them can be different, but they all compute the same thing. This avoids workarounds such as a single dataflow chain processing collection values [[1](https://observablehq.com/@tomlarkworthy/visualizer)], or using queues to process values one-at-a-time [[2](https://observablehq.com/@tomlarkworthy/flow-queue)]. 
`
)};
const _5lhlvo = function _dataflow_templating1(FileAttachment){return(
FileAttachment("dataflow_templating@1.svg").image()
)};
const _qnb9rg = function _5(md){return(
md`# Example: A Dashboard Charting Widget`
)};
const _o0p2px = function _6(md){return(
md`With a dashboard we often want to show multiple slices of a high dimensional datasource but with a shared time axis.

We start with defining the prototype.`
)};
const _zsq9gu = function _dataset(pizza){return(
pizza
)};
const _1nczpsq = function _time(startDay,endDay){return(
[startDay, endDay]
)};
const _zjnnri = function _startDay(Inputs,d3,dataset){return(
Inputs.date({
  label: "startDay",
  value: d3.min(dataset, (d) => d.order_date)
})
)};
const _1k1jdoe = (G, _) => G.input(_);
const _2dyf7j = function _endDay(Inputs,d3,dataset){return(
Inputs.date({
  label: "endDay",
  value: d3.max(dataset, (d) => d.order_date)
})
)};
const _1hf869l = (G, _) => G.input(_);
const _uaibrg = function _11(md){return(
md`For each widget should look at a different dimension.`
)};
const _ymldlm = function _dimension(Inputs,dataset){return(
Inputs.select(Object.getOwnPropertyNames(dataset[0]), {
  label: "dimension",
  value: "orders"
})
)};
const _l8gwg6 = (G, _) => G.input(_);
const _1xcup9l = function _pizzaChoices(dataset){return(
[...new Set(dataset.map((d) => d.name))]
)};
const _zi7ddc = function _14(md){return(
md`and slice by pizza type.`
)};
const _fr8ij5 = function _pizzaChoice(Inputs,pizzaChoices){return(
Inputs.select(pizzaChoices, {
  label: "pizza"
})
)};
const _1k33rhf = (G, _) => G.input(_);
const _1k27be5 = function _16(md){return(
md`With a dimension and slice, we can plot a timeseries. Note the chart is reactive to the UI earlier in the dataflow. If you change the \`startDay\` or \`endDay\` the chart axis updates`
)};
const _tanvcq = function _chart(Plot,pizzaChoice,dimension,time,dataset){return(
Plot.plot({
  title: `${pizzaChoice}, ${dimension}`,
  x: {
    domain: time
  },
  marks: [
    Plot.dot(
      dataset.filter((d) => d.name == pizzaChoice),
      {
        x: "order_date",
        y: dimension,
        symbol: "dot" // or square?
      }
    )
  ]
})
)};
const _1n5lea9 = function _18(md){return(
md`We want to combine all our UI controls and the chart into a single HTML widget`
)};
const _1qzri0n = function _combine(Inputs){return(
Inputs.toggle({ label: "smoosh into single component" })
)};
const _1h8337z = (G, _) => G.input(_);
const _c6rtsv = function _20(md){return(
md`#### assembled widget prototype`
)};
const _gwotsx = function _widget(combine,htl,$0,$1,chart){return(
combine
  ? htl.html`<div>
  ${$0}
  ${$1}
  ${chart}
</div>`
  : "You need to tick combine to see the UI assembled into a element"
)};
const _19pbjd6 = function _22(md){return(
md`## Cloning the dataflow`
)};
const _9j1dnu = function _23(md){return(
md`Now that example was cool, we built it up incrementally. It is interactive, so we can test it easily, but it's a single chart, and we want a dashboard! So this is where cloning the dataflow will allow us to extract this chain of logic into a single programmable unit, based on the prototype.

First we gain access to the enclosing module hosting the variables via \`thisModule\` from the \`runtime-sdk\`.`
)};
const _14bivfb = function _myModule(thisModule){return(
thisModule()
)};
const _1cir47e = (G, _) => G.input(_);
const _13lls96 = function _25(md){return(
md`Then we find the variables we wish to clone, using \`lookupVariable\` from \`runtime-sdk\`. Note a \`viewof\` is really two reactive variables so you need them both (\`viewof foo\` _and_ \`foo\`)`
)};
const _1of2lsp = function _template(lookupVariable,myModule){return(
lookupVariable(
  [
    "viewof dimension",
    "dimension",
    "viewof pizzaChoice",
    "pizzaChoice",
    "chart",
    "widget"
  ],
  myModule
)
)};
const _16o06u5 = function _27(md){return(
md`Then we call \`cloneDataflow\` with the variables to be extracted and an Observer factory to be notified of value changes. The Observer factory argument is the same signature used in the [Observable Runtime API](https://github.com/observablehq/runtime?tab=readme-ov-file#runtimemoduledefine-observer). 

\`\`\`js
observer: (name: string) => ({
  fulfilled: (value) => unknown,
  error: (error) => unknown,
  pending: () => unknown
}) | null
\`\`\``
)};
const _xsuuoq = function _28(md){return(
md`For simple rendering of a repeated UI component, we listen only to the "widget" values, and pipe the fulfilled values to an enclosing Generator's\\* notify, so that the HTML element in the clone becomes exposed to the top level notebook.

\\* [Introduction to Generators](https://observablehq.com/@observablehq/introduction-to-generators)`
)};
const _clzbq6 = function _29(Generators,cloneDataflow,template){return(
Generators.observe((notify) => {
  return cloneDataflow(
    // variables we wish to duplicate
    template,
    // Observer factory to pass to the template variables (same as Runtime API)
    (name) => {
      if (name == "widget")
        // we only care about the internal "widget" cell.
        return {
          // We stream the widget variable's values (a HTML form)
          // to be the result of this enclosing cells Generator.
          fulfilled: notify
        };
    }
  );
})
)};
const _1c4ixq7 = function _auto_smoosh(visibility,$0,Event)
{
  visibility().then(() => {
    $0.value = true;
    $0.dispatchEvent(new Event("input"));
  });
};
const _odkt2w = function _31(md){return(
md`This is cool, we have a totally independent copy of the original dataflow. This is useful enough for templating common UI components that are always intended to be top level cells.



`
)};
const _1vpk201 = function _32(md){return(
md`The other cool thing to note is that we did not include the timerange when cloning. That variable was not templated so all the widgets share that reactive reference and so have aligned time ranges.`
)};
const _ogdjgg = function _33(md){return(
md`### One-to-many, Reading and Writing

For a dashboard we want to create \`n\` widgets and arrange them on a single HTML element. Reading out a single dataflow element and putting in a cell can be done with a generator, but when we want to create many, we can't associate every widget with a unique parent reactive variable.

Instead, we can use the Observable inspector (itself an implementor of the Observer API) to stream the cell changes to a DOM element. Furthermore, sometimes we want to manipulate the dataflow inside the clones programatically. To achieve this we resolve the first value of a control view to a promise, gaining access to the underlying view.`
)};
const _1qtev37 = function _dataflows(widgetCount,invalidation,cloneDataflow,template,Inspector){return(
Array.from({ length: widgetCount }).map(() => {
  const widget = document.createElement("DIV");
  const control = new Promise((resolve) => {
    invalidation.then(
      cloneDataflow(template, (name) => {
        if (name == "widget") {
          return new Inspector(widget);
        }
        if (name == "viewof pizzaChoice") {
          return {
            fulfilled: resolve
          };
        }
      })
    );
  });
  return {
    widget,
    control
  };
})
)};
const _1zsm12 = function _widgetCount(Inputs){return(
Inputs.range([1, 4], {
  label: "widget count",
  step: 1,
  value: 2
})
)};
const _1f1j1ct = (G, _) => G.input(_);
const _m7ki73 = function _36(md){return(
md`From the array of DOM elements we can easily render them to a container HTML element`
)};
const _13jogyr = function _37(htl,width,widgetCount,dataflows){return(
htl.html`<div style="display: flex;">
  <style>
    .widget {
      max-width: ${width / widgetCount}px
    }
  </style>
  ${dataflows.map((df) => df.widget)}

</div>`
)};
const _4t7fj0 = function _38(Inputs,$0){return(
Inputs.bind(
  Inputs.date({
    label: "startDay"
  }),
  $0
)
)};
const _6wg77q = function _39(Inputs,$0){return(
Inputs.bind(
  Inputs.date({
    label: "endDay"
  }),
  $0
)
)};
const _13qy39p = function _40(md){return(
md`An array of views also can be manipulated programmatically, which is changing the individual dataflow values inside the clones.
`
)};
const _1qgx7wb = function _controls(dataflows){return(
Promise.all(dataflows.map((df) => df.control))
)};
const _j91b5b = function _42(Inputs,controls,pizzaChoices,Event){return(
Inputs.button("randomize pizzaChoices", {
  reduce: () => {
    controls.forEach((control) => {
      control.value =
        pizzaChoices[Math.floor(Math.random() * pizzaChoices.length)];
      control.dispatchEvent(new Event("input"));
    });
  }
})
)};
const _1u7xzh9 = function _43(md){return(
md`### Reactive code updates

So far we have shown how to duplicate dataflow logic and pass independent data through the clones. There is one more trick that allows changes to the source dataflow logic to propagate to the clones. Try changing the chart plot's symbol \`dot\` mark to \`square\` [here](#chart) in source code to see for yourself.... all the clones update when the source dataflow's logic changes too.`
)};
const _78dkom = function _44(md){return(
md`### ⚠️ Dataflow topological changes

Beyond changing the code of an individual variable, you might add or remove variables from the source dataflow, changing the topology of the dataflow. There is no support for reacting to that. Generally you will need to change the templating parameters anyway so it did not seem worth dealing with the complexity when often you will cause a broken state anyway if the \`cloneDataflow\` call is not adjusted. 
`
)};
const _7bk64o = function _45(md){return(
md`## Releasing Resources

\`cloneDataflow\` creates non-visible reactive variables. These will accumulate over time unless you call the returned disposal function. You can use the [dataflow debugger](https://observablehq.com/@tomlarkworthy/debugger) to help identify leaks as it is able to plot a variables in the runtime, even those not visible in the notebook.`
)};
const _jw42sg = function _46(md){return(
md`---`
)};
const _12alikv = function _47(md){return(
md`## cloneDataflow`
)};
const _ifa1z4 = function _cloneDataflow(observeSet){return(
function cloneDataflow(variables, observerFactory = () => ({})) {
  const uid = Math.random().toString(36).slice(2);
  const sanitize = (s) => s.replace(/[^\w$]/g, "_");
  const cloneNameOf = (v) => `dynamic ${sanitize(v._name)} ${uid}`;
  const sources = new Map(variables.map((v) => [v._name, v]));
  const clones = new Map();
  let runtime;
  for (const [name, v] of sources) {
    const inputs = v._inputs.map((i) =>
      sources.has(i._name) ? cloneNameOf(i) : i._name
    );
    const t = v._module
      .variable(observerFactory(v._name))
      .define(cloneNameOf(v), inputs, v._definition);
    clones.set(name, t);
    if (!runtime) runtime = t._module._runtime;
  }
  const unobserve = observeSet(runtime._variables, () => {
    for (const [name, v] of sources) {
      const t = clones.get(name);
      if (v._definition !== t._definition) {
        const inputs = v._inputs.map((i) =>
          sources.has(i._name) ? cloneNameOf(i) : i._name
        );
        t.define(cloneNameOf(v), inputs, v._definition);
      }
    }
  });
  return () => {
    for (const [name, v] of clones) v.delete();
    sources.clear();
    clones.clear();
    unobserve();
  };
}
)};
const _1nie1nr = function _49(md){return(
md`## References

While this Dataflow Templating implementation is for Observable Runtime Dataflow. The overarching concept is applicable to any dataflow languages in the style of \`FrTime\`, see _"Embedding Dynamic Dataflow in a Call-by-Value Language"_ 2006, Gregory H. Cooper, Shriram Krishnamurthi ([pdf](https://cs.brown.edu/~sk/Publications/Papers/Published/ck-frtime/paper.pdf))`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["dataflow_templating@1.svg"].map((name) => {
    const module_name = "@tomlarkworthy/dataflow-templating";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  $def("_vnsmd3", null, ["md"], _vnsmd3);  
  $def("_1edhe6y", null, ["md"], _1edhe6y);  
  $def("_190zbgd", null, ["md"], _190zbgd);  
  $def("_5lhlvo", "dataflow_templating1", ["FileAttachment"], _5lhlvo);  
  $def("_qnb9rg", null, ["md"], _qnb9rg);  
  $def("_o0p2px", null, ["md"], _o0p2px);  
  $def("_zsq9gu", "dataset", ["pizza"], _zsq9gu);  
  $def("_1nczpsq", "time", ["startDay","endDay"], _1nczpsq);  
  $def("_zjnnri", "viewof startDay", ["Inputs","d3","dataset"], _zjnnri);  
  $def("_1k1jdoe", "startDay", ["Generators","viewof startDay"], _1k1jdoe);  
  $def("_2dyf7j", "viewof endDay", ["Inputs","d3","dataset"], _2dyf7j);  
  $def("_1hf869l", "endDay", ["Generators","viewof endDay"], _1hf869l);  
  $def("_uaibrg", null, ["md"], _uaibrg);  
  $def("_ymldlm", "viewof dimension", ["Inputs","dataset"], _ymldlm);  
  $def("_l8gwg6", "dimension", ["Generators","viewof dimension"], _l8gwg6);  
  $def("_1xcup9l", "pizzaChoices", ["dataset"], _1xcup9l);  
  $def("_zi7ddc", null, ["md"], _zi7ddc);  
  $def("_fr8ij5", "viewof pizzaChoice", ["Inputs","pizzaChoices"], _fr8ij5);  
  $def("_1k33rhf", "pizzaChoice", ["Generators","viewof pizzaChoice"], _1k33rhf);  
  $def("_1k27be5", null, ["md"], _1k27be5);  
  $def("_tanvcq", "chart", ["Plot","pizzaChoice","dimension","time","dataset"], _tanvcq);  
  $def("_1n5lea9", null, ["md"], _1n5lea9);  
  $def("_1qzri0n", "viewof combine", ["Inputs"], _1qzri0n);  
  $def("_1h8337z", "combine", ["Generators","viewof combine"], _1h8337z);  
  $def("_c6rtsv", null, ["md"], _c6rtsv);  
  $def("_gwotsx", "widget", ["combine","htl","viewof dimension","viewof pizzaChoice","chart"], _gwotsx);  
  $def("_19pbjd6", null, ["md"], _19pbjd6);  
  $def("_9j1dnu", null, ["md"], _9j1dnu);  
  $def("_14bivfb", "viewof myModule", ["thisModule"], _14bivfb);  
  $def("_1cir47e", "myModule", ["Generators","viewof myModule"], _1cir47e);  
  $def("_13lls96", null, ["md"], _13lls96);  
  $def("_1of2lsp", "template", ["lookupVariable","myModule"], _1of2lsp);  
  $def("_16o06u5", null, ["md"], _16o06u5);  
  $def("_xsuuoq", null, ["md"], _xsuuoq);  
  $def("_clzbq6", null, ["Generators","cloneDataflow","template"], _clzbq6);  
  $def("_1c4ixq7", "auto_smoosh", ["visibility","viewof combine","Event"], _1c4ixq7);  
  $def("_odkt2w", null, ["md"], _odkt2w);  
  $def("_1vpk201", null, ["md"], _1vpk201);  
  $def("_ogdjgg", null, ["md"], _ogdjgg);  
  $def("_1qtev37", "dataflows", ["widgetCount","invalidation","cloneDataflow","template","Inspector"], _1qtev37);  
  $def("_1zsm12", "viewof widgetCount", ["Inputs"], _1zsm12);  
  $def("_1f1j1ct", "widgetCount", ["Generators","viewof widgetCount"], _1f1j1ct);  
  $def("_m7ki73", null, ["md"], _m7ki73);  
  $def("_13jogyr", null, ["htl","width","widgetCount","dataflows"], _13jogyr);  
  $def("_4t7fj0", null, ["Inputs","viewof startDay"], _4t7fj0);  
  $def("_6wg77q", null, ["Inputs","viewof endDay"], _6wg77q);  
  $def("_13qy39p", null, ["md"], _13qy39p);  
  $def("_1qgx7wb", "controls", ["dataflows"], _1qgx7wb);  
  $def("_j91b5b", null, ["Inputs","controls","pizzaChoices","Event"], _j91b5b);  
  $def("_1u7xzh9", null, ["md"], _1u7xzh9);  
  $def("_78dkom", null, ["md"], _78dkom);  
  $def("_7bk64o", null, ["md"], _7bk64o);  
  $def("_jw42sg", null, ["md"], _jw42sg);  
  $def("_12alikv", null, ["md"], _12alikv);  
  $def("_ifa1z4", "cloneDataflow", ["observeSet"], _ifa1z4);  
  $def("_1nie1nr", null, ["md"], _1nie1nr);  
  main.define("getPromiseState", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getPromiseState", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("toObject", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("toObject", _));  
  main.define("observeSet", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observeSet", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("inspect", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("inspect", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));
  return main;
}