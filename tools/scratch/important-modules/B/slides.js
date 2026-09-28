const _viewof_myModule = function myModule(thisModule){return(thisModule())};
const _myModule = (G, v) => G.input(v);
const _deck = function deck(slideshow, runtime, invalidation, myModule){return(
slideshow(runtime, {
  invalidation,
  module: myModule,
  slides: [
    {cell: "intro", layout: "central"},
    {cell: ["viewof n", "bars"], layout: "columns", ratios: [1, 2]}
  ]
})
)};
const _intro = function intro(md){return(md`# My talk
## subtitle`)};
const _viewof_n = function n(Inputs){return(Inputs.range([1, 10], {label: "n", step: 1, value: 4}))};
const _n = (G, v) => G.input(v);
const _bars = function bars(n, htl){return(htl.svg`<svg viewBox="0 0 200 100">${Array.from({length: n}, (_, i) => htl.svg`<rect x=${i * 20} y=${100 - i * 10} width=18 height=${i * 10 + 5} fill="steelblue"/>`)}</svg>`)};
const _check = function check(deck, myModule){return(
  new Promise(r => setTimeout(r, 2000)).then(() => ({slides: deck.querySelectorAll(".slides > section").length, hasIntro: deck.textContent.includes("My talk"), hasSvg: !!deck.querySelector(".slides svg"), module: myModule._name}))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_viewof_myModule", "viewof myModule", ["thisModule"], _viewof_myModule);
  $def("_myModule", "myModule", ["Generators", "viewof myModule"], _myModule);
  $def("_deck", "deck", ["slideshow", "runtime", "invalidation", "myModule"], _deck);
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_n", "viewof n", ["Inputs"], _viewof_n);
  $def("_n", "n", ["Generators", "viewof n"], _n);
  $def("_bars", "bars", ["n", "htl"], _bars);
  $def("_check", "check", ["deck", "myModule"], _check);
  main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
