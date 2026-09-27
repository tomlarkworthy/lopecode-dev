const _intro = function intro(md){return(
md`# My Slide Deck
## A presentation built with cells`
)};
const _agenda = function agenda(md){return(
md`## Agenda
- Slide content is just cells
- Edits update slides live
- Inputs drive the whole notebook`
)};
const _demo_chart = function demo_chart(d3){
  const w = 640, h = 400, n = 20;
  const data = Array.from({length: n}, (_, i) => ({
    x: i,
    y: Math.sin(i * 0.5) * 100 + 150 + Math.random() * 30
  }));
  const x = d3.scaleLinear().domain([0, n - 1]).range([40, w - 20]);
  const y = d3.scaleLinear().domain([0, 300]).range([h - 20, 20]);
  const line = d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(d3.curveCatmullRom);
  return {
    toString() {
      return `<svg viewBox="0 0 ${w} ${h}" style="max-width:100%">
        <path d="${line(data)}" fill="none" stroke="#2a76dd" stroke-width="3"/>
        ${data.map(d => `<circle cx="${x(d.x)}" cy="${y(d.y)}" r="4" fill="#2a76dd"/>`).join("")}
      </svg>`;
    }
  };
};
const _viewof_n = function viewof_n(Inputs){return(
Inputs.range([1, 20], {label: "Number of points", step: 1, value: 8})
)};
const _n = function n(Generators, viewof_n){return(
Generators.input(viewof_n)
)};
const _bar_chart = function bar_chart(d3, n){
  const w = 640, h = 400;
  const data = Array.from({length: n}, (_, i) => ({
    label: `Item ${i + 1}`,
    value: Math.floor(Math.random() * 100) + 10
  }));
  const x = d3.scaleBand().domain(data.map(d => d.label)).range([60, w - 20]).padding(0.3);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([h - 40, 20]);
  return {
    toString() {
      return `<svg viewBox="0 0 ${w} ${h}" style="max-width:100%">
        ${data.map(d => `<rect x="${x(d.label)}" y="${y(d.value)}" width="${x.bandwidth()}" height="${h - 40 - y(d.value)}" fill="#2a76dd" rx="3"/>`).join("")}
        <line x1="50" x2="${w - 10}" y1="${h - 40}" y2="${h - 40}" stroke="#999"/>
        ${data.map(d => `<text x="${x(d.label) + x.bandwidth() / 2}" y="${h - 24}" text-anchor="middle" font-size="11" fill="#666">${d.label}</text>`).join("")}
      </svg>`;
    }
  };
};
const _closing = function closing(md){return(
md`## Thank you!
Press **F** for fullscreen, **O** for overview.
Use **✎ Edit slides** to rearrange.`
)};
const _deck = function deck(slideshow, runtime, invalidation, main){return(
slideshow(runtime, {
  invalidation,
  module: main,
  slides: [
    {cell: "intro", layout: "upper"},
    {cell: "agenda", layout: "left"},
    {cell: "demo_chart", layout: "fit"},
    {cell: ["viewof_n", "bar_chart"], layout: "columns", ratios: [1, 2]},
    {cell: "closing", layout: "central"}
  ],
  width: 1600,
  height: 900,
  transition: "none",
  builder: true,
  persist: true,
  filename: "my-slides.html"
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));  
  main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));  
  $def("_intro", "intro", ["md"], _intro);  
  $def("_agenda", "agenda", ["md"], _agenda);  
  $def("_demo_chart", "demo_chart", ["d3"], _demo_chart);  
  $def("_viewof_n", "viewof_n", ["Inputs"], _viewof_n);  
  $def("_n", "n", ["Generators","viewof_n"], _n);  
  $def("_bar_chart", "bar_chart", ["d3","n"], _bar_chart);  
  $def("_closing", "closing", ["md"], _closing);  
  $def("_deck", "deck", ["slideshow","runtime","invalidation","main"], _deck);  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  return main;
}
