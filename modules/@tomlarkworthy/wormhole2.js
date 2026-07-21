const _1vyz4mb = async function _1(md,FileAttachment){return(
md`# Animated Wormhole V2
Lorentzian Wormholes: _a throat joining two asymptotically flat regions_ [1]
![](${await FileAttachment("image.png").url()})

### References
[1] [_"On the Construction and Traversability of Lorentzian Wormholes"_](https://uu.diva-portal.org/smash/get/diva2:1333284/FULLTEXT01.pdf), Maximilian Svensson
`
)};
const _ktaafz = function _2(md){return(
md`# Displacement

Let one side be x = +1 and the other x = -1. The width of the throat be _w_. The contours of the wormhole are _u_. At u = 0 we are in the throat. When _u_ is _+ve_ infinity, _x_ is 1 and _r_ is infinity.
`
)};
const _162vc41 = function _3(md){return(
md`## Contours of wormhole are _theta_ and _u_

Lets figure out equations describing 3d coordinate given _u_ and _theta_. Theta is simple, so lets concentrate on the profile bases on _u_ first.
`
)};
const _v9iwjf = function _4(md){return(
md`Step *u_steps* times from *-u_max* to *+u_max*:`
)};
const _1m2l5mg = function _u_in(range,c,u_step){return(
range(c.u_steps).map(x => u_step * x - c.u_max)
)};
const _btclqb = function _u_step(c){return(
(c.u_max * 2.0) / (c.u_steps-1)
)};
const _8f6hdz = function _7(md){return(
md`The radius should rapidly increases as we get further from u = 0

I can't figure out the equations in the Physics papers so I will just use two exponetials so away from zero the value is really high.
`
)};
const _1temjw6 = function _r(){return(
u => Math.exp(u) + Math.exp(-u) + 1
)};
const _1rwa1pw = function _9(svg,u_in,r){return(
svg`<svg width="300" height="300" viewBox="-10 -10 20 10">
  ${u_in.map(u => svg`<circle cx=${u} cy=${-r(u * 0.4)} r="0.1" />`)}
`
)};
const _ueutz6 = function _10(md){return(
md`The x value should tend towards 1 or -1 as _u_ gets big. I used a neural network sigmoid function`
)};
const _16tagma = function _x(){return(
u => Math.exp(u) / (Math.exp(u) + 1)
)};
const _15rznt9 = function _12(svg,u_in,x){return(
svg`<svg width="300" height="300" viewBox="-10 -1 20 1">
  ${u_in.map(u => svg`<circle cx=${u} cy=${-x(u * 0.9)} r="0.1" />`)}
`
)};
const _q2yran = function _13(md){return(
md`# Parameterized an put it all together`
)};
const _1ilzisi = function _14(c){return(
c
)};
const _1ybc37a = function _c(verticalSliders)
{
  const names = ["th_steps", "u_max", "u_steps", "m_steps", "line_width", "v", "u", "rx", "ry", "rz", "s"];
  return verticalSliders({
    values: [8, 5.8, 20, 10, 0.001, 22, 0.5, 0.5, 0.31, 24, 3],
    maxs: [100, 10, 50, 20, 1, 100, 1, 1, 1, 100, 10],
    mins: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -10],
    steps: [1, "any", 1, 1, "any", "any", "any", "any", "any", "any", "any"],
    names,
    labels: names
  })
};
const _5gdu53 = (G, _) => G.input(_);
const _rwwb7m = function _wormhole(wormholeFrame,c,now){return(
wormholeFrame(c.s*now / 1000)
)};
const _1ixw3f2 = function _xyz(c,r,x){return(
([th, u]) => [
  Math.sin(th * Math.PI * 2 / c.th_steps) * r(u),
  Math.cos(th * Math.PI * 2 / c.th_steps) * r(u),
  -x(u)
]
)};
const _15x3r50 = function _view(c){return(
([x, y, z]) => [
  x * c.rx,
  y * c.ry + z * c.rz + c.rz
]
)};
const _1k5bbc9 = function _loop(c,u_step){return(
c.s*u_step * 2
)};
const _3fq1c4 = function _wormholeFrame(svg,c,cartesian,u_in,range,e_eq,u_step,view,xyz,d3,steps)
{
  return (t) => svg`<svg xmlns="http://www.w3.org/2000/svg"
                         width="400"
                         height="400"
                         viewBox="${-c.v} ${-c.v} ${2*c.v} ${2*c.v}">
    <style>
      polygon {
        stroke-width: ${c.line_width}px
      }
    </style>
    <rect x=${-c.v} y=${-c.v} width=${2*c.v} height=${2*c.v} style="fill:black" />
    ${cartesian(u_in, range(c.th_steps)).map(([u_base, th]) => {
      if (e_eq(u_base, c.u_max)) return;
      const u = u_base + -t % (2 * u_step);
    debugger;
      // The 4 corners
      const s = view(xyz([th, u]))
      const s_th = view(xyz([th + 1, u]))
      const s_u_th  = view(xyz([th + 1, u + u_step]))
      const s_u  = view(xyz([th, u + u_step]))
      const u_i = u_in.indexOf(u_base)
      // Now make a filled polygon using microsteps
      return svg.fragment`
        <polygon 
            fill=${((u_i + th) % 2) ? d3.interpolateGreys(1 - Math.abs(u) / c.u_max) : "black"} stroke="red"
            points="
              ${steps(th, th + 1,    c.m_steps).map(th_i => view(xyz([th_i  , u])).join())}
              ${steps(u, u + u_step, c.m_steps).map( u_i => view(xyz([th + 1, u_i])).join())}
              ${steps(th + 1, th,    c.m_steps).map(th_i => view(xyz([th_i, u + u_step])).join())}
              ${steps(u + u_step, u, c.m_steps).map( u_i => view(xyz([th, u_i])).join())}
            "
        />
      `
    })}
  </svg>`
};
const _19b3r61 = function _21(cartesian,range,u_in){return(
cartesian(range(3), u_in)
)};
const _t701k1 = function _steps(){return(
(from, to, steps) => Array(steps).fill(0).map((_, i) => i * (to - from) / steps + from)
)};
const _cke2fg = function _range(){return(
(n) => Array(n).fill(0).map((_, i) => i)
)};
const _1ebbgge = function _vrange(cartesian,range){return(
(array) => cartesian(...array.map(d => range(d)))
)};
const _10hn6je = function _cartesian(){return(
(...a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())))
)};
const _xlv8el = function _e_eq(){return(
(a, b) => a > b - 0.0001 && a < b + 0.0001
)};
const _1eelfwh = function _d3(require){return(
require("d3-scale-chromatic@1", "d3-interpolate@1")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["image.png"].map((name) => {
    const module_name = "@tomlarkworthy/wormhole2";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/vertical-sliders", async () => runtime.module((await import("/@tomlarkworthy/vertical-sliders.js?v=4")).default));  
  $def("_1vyz4mb", null, ["md","FileAttachment"], _1vyz4mb);  
  $def("_ktaafz", null, ["md"], _ktaafz);  
  $def("_162vc41", null, ["md"], _162vc41);  
  $def("_v9iwjf", null, ["md"], _v9iwjf);  
  $def("_1m2l5mg", "u_in", ["range","c","u_step"], _1m2l5mg);  
  $def("_btclqb", "u_step", ["c"], _btclqb);  
  $def("_8f6hdz", null, ["md"], _8f6hdz);  
  $def("_1temjw6", "r", [], _1temjw6);  
  $def("_1rwa1pw", null, ["svg","u_in","r"], _1rwa1pw);  
  $def("_ueutz6", null, ["md"], _ueutz6);  
  $def("_16tagma", "x", [], _16tagma);  
  $def("_15rznt9", null, ["svg","u_in","x"], _15rznt9);  
  $def("_q2yran", null, ["md"], _q2yran);  
  $def("_1ilzisi", null, ["c"], _1ilzisi);  
  $def("_1ybc37a", "viewof c", ["verticalSliders"], _1ybc37a);  
  $def("_5gdu53", "c", ["Generators","viewof c"], _5gdu53);  
  $def("_rwwb7m", "wormhole", ["wormholeFrame","c","now"], _rwwb7m);  
  $def("_1ixw3f2", "xyz", ["c","r","x"], _1ixw3f2);  
  $def("_15x3r50", "view", ["c"], _15x3r50);  
  $def("_1k5bbc9", "loop", ["c","u_step"], _1k5bbc9);  
  $def("_3fq1c4", "wormholeFrame", ["svg","c","cartesian","u_in","range","e_eq","u_step","view","xyz","d3","steps"], _3fq1c4);  
  $def("_19b3r61", null, ["cartesian","range","u_in"], _19b3r61);  
  $def("_t701k1", "steps", [], _t701k1);  
  $def("_cke2fg", "range", [], _cke2fg);  
  $def("_1ebbgge", "vrange", ["cartesian","range"], _1ebbgge);  
  $def("_10hn6je", "cartesian", [], _10hn6je);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  $def("_xlv8el", "e_eq", [], _xlv8el);  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));  
  main.define("verticalSliders", ["module @tomlarkworthy/vertical-sliders", "@variable"], (_, v) => v.import("verticalSliders", _));  
  $def("_1eelfwh", "d3", ["require"], _1eelfwh);
  return main;
}