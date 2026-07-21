const _qbzbkv = function _1(md){return(
md`# Notebook in VR
`
)};
const _18von5g = async function _aframe(require)
{
  const aframe = (window.aframe = await require("aframe"));
  await require("aframe-environment-component").catch(() => {}); // Adds environment preset:starry
  return aframe;
};
const _qf9npo = function _runDemo(Inputs,run){return(
Inputs.button("run", {
  reduce: run
})
)};
const _5iqgpg = (G, _) => G.input(_);
const _1aw6psz = function _aframeRig(width,overlay,aframe,htl){return(
htl.html`<a-scene
    debug
    embedded
    style="width: ${width}px; height: 400px;"
    environment="preset:starry"
    webxr="requiredFeatures: hit-test,local-floor,dom-overlay;
           overlayElement: #${overlay.id};">
  ${aframe && ''}
  <a-entity id="cameraRig">
    <a-entity camera position="0 1.5 0" look-controls wasd-controlsw>
    </a-entity>
  </a-entity>

  <a-entity id="circles">
  </a-entity>
</a-scene>`
)};
const _1ae0boz = function _5(aframeRig){return(
aframeRig.systems.webxr.sceneEl
)};
const _ongggi = function _6(aframeRig){return(
aframeRig.systems.webxr.sceneEl
)};
const _18y18wo = function _overlay(htl,Inputs){return(
htl.html`<div id="overlay">
${Inputs.range()}
</div>`
)};
const _1s8ttla = function _interpolatePositionList(){return(
function(d, i, nodeList) {
  let a = nodeList[i].attributes.position.value
  let [x, y, z] = a.split(/\s+/).map(Number)
  return (t) => `${(1-t) * x + t*d.x} ${(1-t) * y + t*d.y} ${(1-t) * z + t * z}`
}
)};
const _1v9q6t2 = function _opts(){return(
{
  numCircles: 500,
  size: 10,
  maxRadius: 0.3,
  minRadius: 0.05,
  range: 10
}
)};
const _a8ssh4 = function _color(d3){return(
d3
  .scaleSequential()
  .domain([0, 2 * Math.PI])
  .interpolator(d3.interpolateRainbow)
)};
const _bh3gyg = function _run(d3,aframeRig,opts,color,interpolatePositionList){return(
() => {
  console.log("running packing demo");
  let scene = d3.select(aframeRig).select("a-scene");

  var circles = d3
    .packSiblings(
      d3
        .range(opts.numCircles)
        .map(d3.randomUniform(opts.minRadius, opts.maxRadius))
        .map(function (r) {
          return { r: r };
        })
    )
    .filter(function (d) {
      return (
        -opts.range < d.x &&
        d.x < opts.range &&
        -opts.range < d.y &&
        d.y < opts.range
      );
    });

  let cs = scene.select("a-entity#circles").attr("position", "0 10 -10");

  let circleEls = cs.selectAll("a-circle").data(circles);

  circleEls
    .enter()
    .append("a-circle")
    .merge(circleEls)
    .attr("emissive", function (d) {
      return color((d.angle = Math.atan2(d.y, d.x)));
    })
    .attr(
      "position",
      (d) =>
        `${Math.cos(d.angle) * (opts.size / Math.SQRT2 + 1)} ${
          Math.sin(d.angle) * (opts.size / Math.SQRT2 + 1)
        } 0`
    )
    .attr("radius", function (d) {
      return d.r - 0.005;
    })
    .transition()
    .ease(d3.easeCubicOut)
    .delay(function (d) {
      return Math.sqrt(d.x * d.x + d.y * d.y) * 1000;
    })
    .duration(1000)
    .attrTween("position", interpolatePositionList);
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_qbzbkv", null, ["md"], _qbzbkv);  
  $def("_18von5g", "aframe", ["require"], _18von5g);  
  $def("_qf9npo", "viewof runDemo", ["Inputs","run"], _qf9npo);  
  $def("_5iqgpg", "runDemo", ["Generators","viewof runDemo"], _5iqgpg);  
  $def("_1aw6psz", "aframeRig", ["width","overlay","aframe","htl"], _1aw6psz);  
  $def("_1ae0boz", null, ["aframeRig"], _1ae0boz);  
  $def("_ongggi", null, ["aframeRig"], _ongggi);  
  $def("_18y18wo", "overlay", ["htl","Inputs"], _18y18wo);  
  $def("_1s8ttla", "interpolatePositionList", [], _1s8ttla);  
  $def("_1v9q6t2", "opts", [], _1v9q6t2);  
  $def("_a8ssh4", "color", ["d3"], _a8ssh4);  
  $def("_bh3gyg", "run", ["d3","aframeRig","opts","color","interpolatePositionList"], _bh3gyg);
  return main;
}