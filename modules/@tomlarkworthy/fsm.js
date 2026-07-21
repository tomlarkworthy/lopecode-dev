const _1wd5f7s = function _1(md){return(
md`#  👋 Hello, [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) ⨯ [Plot](https://observablehq.com/plot/) 

\`\`\`js
import {StateMachine, visualizeFsm} from "@tomlarkworthy/fsm"
\`\`\``
)};
const _1atz4bm = async function _StateMachine() {
    return (await import('https://esm.sh/javascript-state-machine@3.1.0')).default;
};
const _1a27h8a = function _visualizeFsm(d3,Plot){return(
(
  fsm,
  {
    layout = (state, index) =>
      d3.pointRadial(((2 - index) * 2 * Math.PI) / fsm.allStates().length, 100)
  } = {}
) => {
  const nodes = new Map(fsm.allStates().map((m, i) => [m, layout(m, i)]));
  const edges = Object.entries(fsm._fsm.config.map).flatMap(
    ([from, transtions], i) =>
      Object.entries(transtions).map(([name, transtion], j) => [
        [from, nodes.get(from)],
        [name, nodes.get(transtion.to)]
      ])
  );
  return Plot.plot({
    inset: 60,
    aspectRatio: 1,
    axis: null,
    marks: [
      Plot.dot(nodes.entries(), {
        x: ([k, c]) => c[0],
        y: ([k, c]) => c[1],
        r: 40,
        stroke: ([k, c]) => (k == fsm.state ? "blue" : "black"),
        strokeWidth: ([k, c]) => (k == fsm.state ? 4 : 2)
      }),
      Plot.arrow(edges, {
        x1: ([[, [x1]]]) => x1,
        y1: ([[, [, y1]]]) => y1,
        x2: ([, [, [x2]]]) => x2,
        y2: ([, [, [, y2]]]) => y2,
        bend: true,
        //strokeWidth: ([, , value]) => value,
        strokeLinejoin: "miter",
        headLength: 24,
        inset: 48
      }),
      Plot.text(nodes.entries(), {
        x: ([k, c]) => c[0],
        y: ([k, c]) => c[1],
        text: ([k, c]) => k
      }),
      Plot.text(edges, {
        x: ([[, [x1, y1]], [, [x2, y2]]]) => (x1 + x2) / 2 + (y1 - y2) * 0.15,
        y: ([[, [x1, y1]], [, [x2, y2]]]) => (y1 + y2) / 2 - (x1 - x2) * 0.15,
        text: ([[, [x1, y1]], [label, [x2, y2]]]) => label
      })
    ]
  });
}
)};
const _4sn5ra = function _4(md){return(
md`# Example`
)};
const _1gd9gxj = function _5(output,visualizeFsm,fsm){return(
output && visualizeFsm(fsm)
)};
const _1e53etc = function _output(Inputs){return(
Inputs.text({ label: "output", disabled: true, value: " " })
)};
const _ei7ugd = (G, _) => G.input(_);
const _6foqhj = function _state(output,Inputs,fsm){return(
output &&
  Inputs.text({ label: "state", disabled: true, value: fsm.state })
)};
const _1a6q803 = (G, _) => G.input(_);
const _1bwr7c7 = function _8(output,fsm,htl,Inputs,html){return(
htl.html`<div style="display: flex;">
  ${output && fsm.allTransitions().map((state) => htl.html`<div style="width: 100px">${
    Inputs.button(html`<span style="color: ${!fsm.transitions().includes(state)? 'black': 'green'};">${state}</span>`, {
      reduce: () => fsm[state](),
      width: 100,
      disabled: !fsm.transitions().includes(state)
    })
}`)}
</div>`
)};
const _1hmvuz4 = function _fsm(StateMachine,$0,Event){return(
new StateMachine({
  init: "solid",
  transitions: [
    { name: "melt", from: "solid", to: "liquid" },
    { name: "freeze", from: "liquid", to: "solid" },
    { name: "vaporize", from: "liquid", to: "gas" },
    { name: "condense", from: "gas", to: "liquid" }
  ],
  methods: {
    onMelt: function () {
      $0.value = "I melted";
    },
    onFreeze: function () {
      $0.value = "I froze";
    },
    onVaporize: function () {
      $0.value = "I vaporized";
    },
    onCondense: function () {
      $0.value = "I condensed";
    },
    // Always trigger dataflow on output cell after a change
    onAfterTransition: () => $0.dispatchEvent(new Event("input"))
  }
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1wd5f7s", null, ["md"], _1wd5f7s);  
  $def("_1atz4bm", "StateMachine", [], _1atz4bm);  
  $def("_1a27h8a", "visualizeFsm", ["d3","Plot"], _1a27h8a);  
  $def("_4sn5ra", null, ["md"], _4sn5ra);  
  $def("_1gd9gxj", null, ["output","visualizeFsm","fsm"], _1gd9gxj);  
  $def("_1e53etc", "viewof output", ["Inputs"], _1e53etc);  
  $def("_ei7ugd", "output", ["Generators","viewof output"], _ei7ugd);  
  $def("_6foqhj", "viewof state", ["output","Inputs","fsm"], _6foqhj);  
  $def("_1a6q803", "state", ["Generators","viewof state"], _1a6q803);  
  $def("_1bwr7c7", null, ["output","fsm","htl","Inputs","html"], _1bwr7c7);  
  $def("_1hmvuz4", "fsm", ["StateMachine","viewof output","Event"], _1hmvuz4);
  return main;
}