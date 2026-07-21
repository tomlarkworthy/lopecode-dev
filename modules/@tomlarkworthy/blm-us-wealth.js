const _18vm5li = function _1(md){return(
md`# Black Lives Matter: Wealth share in the US

_"You’ve been waiting for the crumbs to fall off the white man’s table"_ - Malcolm X, 1965

`
)};
const _1sz29jl = function _gfx(svg,width)
{
  const dw = 8;
  const dh = 6.5;
  const padding = 1;
  const mh = padding + (dh-padding*2)/2 + 0.3;
  const overlapx = 1.36 + 2.55 - 3.21; 
  const mx = 5.33
  const ad = 1.04
  const atop = mh - ad
  const abot = mh + ad
  return svg`<svg viewBox="0 0 ${dw} ${dh}" width="${Math.min(width, 640)}px">
    <style>
      svg text {
        font-size: 0.02em;
        fill: black;
      }
    </style>
    <rect width=${dw} height=${dh} fill="black" />
    <circle fill="white" r="2.55" cy=${mh} cx=${3} />
    <circle fill="white" r="1.36" cy=${mh} cx=${3 + 3.21} />
    <path d="M ${mx} ${abot} A 3.21 3.21 0 0 0 ${mx} ${atop} A 1.36 1.36 0 0 0 ${mx} ${abot} z" fill="black"/>
    <text x=${3} y=${mh} text-anchor="middle">white wealth</text>
    <text x=${3 + 3.21} y=${mh} text-anchor="middle">
      <tspan x=${3 + 3.21} dy="-0.6em">white</tspan>
      <tspan x=${3 + 3.21} dy="1.2em">lives</tspan>
    </text>
    <text x=0.5 y=0.6 style="fill:white" >2019 US Wealth and Demographics</text>

    <path d="M ${mx} ${mh + 0.5} L ${mx + 0.6} 5.4" stroke="white" stroke-width="0.03" stroke-linecap="round" />

    <text x=6 y=5.5 style="fill:white" >
      <tspan>Black wealth</tspan>
      <tspan x=6 dy="1.2em">Black lives</tspan>
    </text>
  </svg>`
};
const _i1e7y4 = function _3(md){return(
md`

While things have improved since Malcolm X's days, as this graphic shows, _there is still_ serious wealth imbalances which puts the black community in a disadvantaged position for capturing compounding wealth. 


Economy: Black 4% of US wealth ($4.6 trillion), White (84% $94 trillion) 2019
Demographics: Black (13.4%), White (76.3%)

Checkout [W.E.B. Du Bois'](https://www.smithsonianmag.com/history/first-time-together-and-color-book-displays-web-du-bois-visionary-infographics-180970826/) iconic racial infographics for other insights.`
)};
const _1oq2hiw = function _4(md){return(
md`### Calculations`
)};
const _xo9t0l = function _5(md){return(
md`

[source](
https://www.brookings.edu/blog/up-front/2020/12/08/the-black-white-wealth-gap-left-black-households-more-vulnerable/)
`
)};
const _121ibvy = function _black_white_wealth_ratio(){return(
4.6 / (4.6 + 94)
)};
const _1m9o91t = function _black_white_deomgraphic_ratio(){return(
0.134 / (0.134 + 0.783)
)};
const _8povr = function _normalized_wealth_pie(black_white_wealth_ratio){return(
(1 - black_white_wealth_ratio) / black_white_wealth_ratio
)};
const _193urzb = function _normalized_deomgraphic_pie(black_white_deomgraphic_ratio){return(
(1 - black_white_deomgraphic_ratio) / black_white_deomgraphic_ratio
)};
const _1uuvgr6 = function _10(md){return(
md`[Area accurate Venn diagram](https://observablehq.com/@omnizach/accurate-area-venn-diagram) by Zach Young`
)};
const _afra1d = function _11(FileAttachment){return(
FileAttachment("image@1.png").image()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image@1.png"].map((name) => {
    const module_name = "@tomlarkworthy/blm-us-wealth";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  $def("_18vm5li", null, ["md"], _18vm5li);  
  $def("_1sz29jl", "gfx", ["svg","width"], _1sz29jl);  
  $def("_i1e7y4", null, ["md"], _i1e7y4);  
  $def("_1oq2hiw", null, ["md"], _1oq2hiw);  
  $def("_xo9t0l", null, ["md"], _xo9t0l);  
  $def("_121ibvy", "black_white_wealth_ratio", [], _121ibvy);  
  $def("_1m9o91t", "black_white_deomgraphic_ratio", [], _1m9o91t);  
  $def("_8povr", "normalized_wealth_pie", ["black_white_wealth_ratio"], _8povr);  
  $def("_193urzb", "normalized_deomgraphic_pie", ["black_white_deomgraphic_ratio"], _193urzb);  
  $def("_1uuvgr6", null, ["md"], _1uuvgr6);  
  $def("_afra1d", null, ["FileAttachment"], _afra1d);  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));
  return main;
}