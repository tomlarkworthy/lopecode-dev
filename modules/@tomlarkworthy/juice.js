const _4ss9q3 = function _1(md){return(
md`# Squeezing more _Juice_ out of UI libraries

Sometimes you want the configuration of a view component to be reactive. You want the arguments in the constructor to become part of the value in a view. For example, making the *options* in a *select* part of the value enables you to back-write into the view to update the drop down. You don't want to do this using *dataflow* because its part of a single cell UI.

This utility moves configuration parameters into the value. Hopefully this helps us squeeze a little more juice out of existing Input libraries, a useful technique for [scaling UI development](https://observablehq.com/@tomlarkworthy/ui-development)

This utility was created in response to conversations with [@mkfreeman](/@mkfreeman) and [@dleeftink](/@dleeftink) who both independently had a requirement for a select with mutable options. I decided it would be useful to solve this problem in a general way so we could take any UI component and pull out its configuration to suit.

~~~js
import {juice} from '@tomlarkworthy/juice'
~~~

`
)};
const _1l72j3 = function _2(md){return(
md`## fastest way to make UI components

Convert static renderers into reactive components:
\`\`\`js
(name, age) => html\`Your name is \${name} your age is \${age}\`
\`\`\``
)};
const _njzq1s = function _profile(juice,html){return(
juice((name, age) => html`Your name is ${name} your age is ${age}`, {
  name: "[0]", // we index into the ...arguments array
  age: "[1]"
})
)};
const _hbxfse = function _example(profile){return(
profile("tom", 21)
)};
const _4me580 = (G, _) => G.input(_);
const _j9ia46 = function _5(Inputs,$0){return(
Inputs.bind(Inputs.range([0, 99]), $0.age)
)};
const _14o5ib9 = function _6(md){return(
md`## *juice* API

~~~
    juice(VIEW_BUILDER, JUICE_CONFIG) => NEW_VIEW_BUILDER
~~~

### 1st arg is a view builder

_**juice**_ is a higher order function that takes a **view builder** function as its **1st arg**, and returns a new **view builder** function. *Inputs.select* is an example of a view builder function that can be found in the standard library. View builders are a common form of packaging a UI component on Observable. 

*A view builder is a function that takes some configuration as its arguments and returns a view*

~~~js
    juice(VIEW_BUILDER, ???) => VIEW_BUILDER
~~~

### 2nd arg is the argument remapping

The 2nd argument of juice configures how static configuration arguments are moved the view's value output. It is is expressed as an *key-value* object dictionary. The *key* is the property name in the resultant composite view, the *value* is a lodash path into the view builders configuration *...arg* array, have a look at the examples below to see how the path syntax works.

~~~js
    juice(VIEW_BUILDER, {subview => ...args path}) => VIEW_BUILDER
~~~

### Returns a view builder with a composite value

The result of applying *juice* is a new view builder. 

The new builder has an identical argument list to the original one. Input arguments form the base args for internal calls to the view builder. 


The new builder has a very different value type though. The value becomes a dictionary of values. One entry *"result"* is the original return value.  The other entries correspond to entries in the *argument remapping* configuration mentioned above. Note the fields are mutable, and you can write back into them to update the UI configuration.


`
)};
const _7w3qr2 = function _7(md){return(
md`### Works with any functional UI

You can animate your own custom constructors or [D3 charts](https://observablehq.com/@tomlarkworthy/juice-and-charts)`
)};
const _1ipve8x = function _8(md){return(
md`#### Example

If we *juice* the *range* builder:
~~~js
dynamicRange = juice(Inputs.range, {
  label: "[1].label",
  min: "[0][0]", 
  max: "[0][1]", 
})
~~~

We can instantiate ranges as normal:-

~~~js
viewof myDynamicRange = dynamicRange([0, 10], {label: "cool"})
~~~

But we end up with a view whose value is of the form

~~~js
{label: "...", min: -1, max: 1, result: 0}
~~~

And we back-write into it from anywhere else in the notebook

~~~js
{
  viewof myDynamicRange.max.value = 1000;
  viewof myDynamicRange.max.dispatchEvent(new Event('input', {bubbles: true}));
}
~~~

Because the value is a nested view, each subview supports *Inputs.bind* individually, see [scaling UI development](https://observablehq.com/@tomlarkworthy/ui-development#nesting-views-with-the-view-literal-https-observablehq-com-tomlarkworthy-view-) for why this is important.

`
)};
const _1cytzbi = function _9(md){return(
md`### Open Issues

##### DOM state lost when parameters

When a configuration parameter is updated, the DOM node is deleted and replaced with a fresh node, this breaks things like mouse event handlers, caret position etc. My normal goto solution for DOM state loss is nanomorph, but nanomorph does not work with Inputs ([bug](https://github.com/observablehq/inputs/issues/184)). So, for now, we do the crude DOM swap and live with the UI state loss glitches.
`
)};
const _isi6mb = function _stateLostExample(dynamicRange){return(
dynamicRange()
)};
const _1v8uoev = (G, _) => G.input(_);
const _e98f39 = function* _stateLostExampleUpdater(Promises,stateLostExample)
{
  let i = 0;
  const banner = "Label updates break the slider :( ";
  while (true) {
    yield Promises.delay(100);
    stateLostExample.label = (banner + banner).substring(i, i + 15);
    i = (i + 1) % banner.length;
  }
};
const _eyxqdq = function _12(md){return(
md`## Implementation`
)};
const _171tguy = function _juice(proxyVariable,variable,_,view){return(
(builder, targets = {}) => (...args) => {
  const result = proxyVariable({
    name: "result",
    get: () => viewUI.value,
    set: (newVal) => (viewUI.value = newVal)
  });

  const proxyPassthrough = (evt) => {
    result.dispatchEvent(new CustomEvent("input", evt));
  };

  let viewUI = builder(...args);
  viewUI.addEventListener("input", proxyPassthrough);

  const vars = Object.fromEntries(
    Object.entries(targets)
      .filter(([target, _]) => target !== "result") // result var is handled a bit differently
      .map(([target, path]) => {
        const v = variable(_.get(args, path), { name: target });
        v.addEventListener("assign", () => {
          // Patch the args based on the current values in the variables
          Object.keys(targets).forEach((target) => {
            const path = targets[target];
            // Current value, normally pulled from the vairable but special case for the 'result'
            const value =
              target === "result" ? viewUI.value : vars[target].value;
            _.update(args, path, () => value);
          });
          // We create a whole new view and substitute it in
          const newView = builder(...args);
          viewUI.replaceWith(newView); // A fair amount of state is lost here, but reconcile doesn't work
          viewUI.removeEventListener("input", proxyPassthrough);
          viewUI = newView;
          viewUI.addEventListener("input", proxyPassthrough);
        });
        return [target, v];
      })
  );
  const ui = view`<span>${["...", vars]}${["result", result]}${viewUI}`;
  return ui;
}
)};
const _7q4c22 = function _14(md){return(
md`### helpers`
)};
const _iks1x5 = function _proxyVariable(){return(
function proxyVariable({ name = "variable", get, set } = {}) {
  const self = document.createComment(name);
  return Object.defineProperties(self, {
    value: {
      get: get,
      set: set,
      enumerable: true
    },
    toString: {
      value: () => `${get()}`
    }
  });
}
)};
const _1eo6wjv = function _16(md){return(
md`## Range with dynamic max and min

Here we extract the ranges first arg, *max* and *min* to be their own backwritable subviews
`
)};
const _115d3ny = function _dynamicRange(juice,Inputs){return(
juice(Inputs.range, {
  label: "[1].label",
  min: "[0][0]", // "range" is first arg (index 0), the min is the 1st arg of the range array
  max: "[0][1]", // "range" is first arg, the max is the 2nd paramater of that array
  result: "[1].value" // "result" can be set in the options.value, options being the 2nd arg (index 0)
})
)};
const _ma221o = function _dynamicRangeExample(dynamicRange){return(
dynamicRange([-1, 1], { label: "dynamic range" })
)};
const _6b9mse = (G, _) => G.input(_);
const _ur3djb = function _19(dynamicRangeExample){return(
dynamicRangeExample
)};
const _b9vak7 = function _20(dynamicRangeExample){return(
dynamicRangeExample
)};
const _1kd7bvv = function _dynamicRangeMin(dynamicRange){return(
dynamicRange([-1, 1], {
  label: "dynamic range min",
  value: -1
})
)};
const _164j60k = (G, _) => G.input(_);
const _19ralz1 = function _22(dynamicRangeMin){return(
dynamicRangeMin
)};
const _1l5j5m6 = function _dynamicRangeMax(dynamicRange){return(
dynamicRange([-1, 1], {
  label: "dynamic range max",
  value: 1
})
)};
const _1ww2jfa = (G, _) => G.input(_);
const _93nq8j = function _24(dynamicRangeMax){return(
dynamicRangeMax
)};
const _xmsxlq = function _minMaxConstraints(Inputs,$0,$1,$2)
{
  // We want dynamicRangeMax to constrain the dynamic range's max and min
  Inputs.bind($0.max, $1.result);
  Inputs.bind($0.min, $2.result);
  // Of course, the max of the min should also be constrained by the max too
  Inputs.bind($2.max, $1.result);
  Inputs.bind($1.min, $2.result);
};
const _1vovmtj = function _26(md){return(
md`### Select with Dynamic Options`
)};
const _15szfuo = function _dynamicSelect(juice,Inputs){return(
juice(Inputs.select, {
  label: "[1].label",
  options: "[0]", // "options" is first arg (index 0) of Inputs.select
  result: "[1].value" // "result" can be set in the options.value, options being the 2nd arg (index 0)
})
)};
const _1a0ur3r = function _28(Inputs,$0,Event){return(
Inputs.button("deal", {
  reduce: () => {
    const rndCard = () => {
      const card = Math.floor(Math.random() * 52);
      return (
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"][
          card % 14
        ] + ["♠", "♥", "♦", "♣"][Math.floor(card / 14)]
      );
    };
    $0.options.value = [rndCard(), rndCard()];
    $0.options.dispatchEvent(new Event("input"));
  }
})
)};
const _1oapfrs = function _exampleSelect(dynamicSelect){return(
dynamicSelect([], { label: "play a card" })
)};
const _1rgnru0 = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));  
  main.define("module @tomlarkworthy/viewroutine", async () => runtime.module((await import("/@tomlarkworthy/viewroutine.js?v=4")).default));  
  $def("_4ss9q3", null, ["md"], _4ss9q3);  
  $def("_1l72j3", null, ["md"], _1l72j3);  
  $def("_njzq1s", "profile", ["juice","html"], _njzq1s);  
  $def("_hbxfse", "viewof example", ["profile"], _hbxfse);  
  $def("_4me580", "example", ["Generators","viewof example"], _4me580);  
  $def("_j9ia46", null, ["Inputs","viewof example"], _j9ia46);  
  $def("_14o5ib9", null, ["md"], _14o5ib9);  
  $def("_7w3qr2", null, ["md"], _7w3qr2);  
  $def("_1ipve8x", null, ["md"], _1ipve8x);  
  $def("_1cytzbi", null, ["md"], _1cytzbi);  
  $def("_isi6mb", "viewof stateLostExample", ["dynamicRange"], _isi6mb);  
  $def("_1v8uoev", "stateLostExample", ["Generators","viewof stateLostExample"], _1v8uoev);  
  $def("_e98f39", "stateLostExampleUpdater", ["Promises","stateLostExample"], _e98f39);  
  $def("_eyxqdq", null, ["md"], _eyxqdq);  
  $def("_171tguy", "juice", ["proxyVariable","variable","_","view"], _171tguy);  
  $def("_7q4c22", null, ["md"], _7q4c22);  
  $def("_iks1x5", "proxyVariable", [], _iks1x5);  
  $def("_1eo6wjv", null, ["md"], _1eo6wjv);  
  $def("_115d3ny", "dynamicRange", ["juice","Inputs"], _115d3ny);  
  $def("_ma221o", "viewof dynamicRangeExample", ["dynamicRange"], _ma221o);  
  $def("_6b9mse", "dynamicRangeExample", ["Generators","viewof dynamicRangeExample"], _6b9mse);  
  $def("_ur3djb", null, ["dynamicRangeExample"], _ur3djb);  
  $def("_b9vak7", null, ["dynamicRangeExample"], _b9vak7);  
  $def("_1kd7bvv", "viewof dynamicRangeMin", ["dynamicRange"], _1kd7bvv);  
  $def("_164j60k", "dynamicRangeMin", ["Generators","viewof dynamicRangeMin"], _164j60k);  
  $def("_19ralz1", null, ["dynamicRangeMin"], _19ralz1);  
  $def("_1l5j5m6", "viewof dynamicRangeMax", ["dynamicRange"], _1l5j5m6);  
  $def("_1ww2jfa", "dynamicRangeMax", ["Generators","viewof dynamicRangeMax"], _1ww2jfa);  
  $def("_93nq8j", null, ["dynamicRangeMax"], _93nq8j);  
  $def("_xmsxlq", "minMaxConstraints", ["Inputs","viewof dynamicRangeExample","viewof dynamicRangeMax","viewof dynamicRangeMin"], _xmsxlq);  
  $def("_1vovmtj", null, ["md"], _1vovmtj);  
  $def("_15szfuo", "dynamicSelect", ["juice","Inputs"], _15szfuo);  
  $def("_1a0ur3r", null, ["Inputs","viewof exampleSelect","Event"], _1a0ur3r);  
  $def("_1oapfrs", "viewof exampleSelect", ["dynamicSelect"], _1oapfrs);  
  $def("_1rgnru0", "exampleSelect", ["Generators","viewof exampleSelect"], _1rgnru0);  
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));  
  main.define("variable", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("variable", _));  
  main.define("viewroutine", ["module @tomlarkworthy/viewroutine", "@variable"], (_, v) => v.import("viewroutine", _));  
  main.define("ask", ["module @tomlarkworthy/viewroutine", "@variable"], (_, v) => v.import("ask", _));
  return main;
}