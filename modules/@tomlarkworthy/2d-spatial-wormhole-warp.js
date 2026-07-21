const _1w14tc6 = function _1(md){return(
md`# Animated Wormhole with frame capture`
)};
const _1j9bzud = function _canvas_w(slider){return(
slider({
  min: 1,
  max: 1024,
  step: 1,
  value: 400,
  format: ",",
  description:
    "Width of canvas"
})
)};
const _1ladwmq = (G, _) => G.input(_);
const _ibb4wm = function _canvas_h(slider){return(
slider({
  min: 1,
  max: 1024,
  step: 1,
  value: 600,
  format: ",",
  description:
    "Height of canvas"
})
)};
const _1950heb = (G, _) => G.input(_);
const _4z9k0x = function* _animated_wormhole(DOM,canvas_w,canvas_h,foreground,wormholeFrame)
{
  var ctx = DOM.context2d(canvas_w, canvas_h);
  ctx.strokeStyle = foreground;
  ctx.lineCap = "round"; 
  
  while (true) {
    wormholeFrame(ctx, Date.now());
    yield ctx.canvas;
  }  
};
const _13q3i91 = (G, _) => G.input(_);
const _fjnxjf = function _wormholeFrame(canvas_w,canvas_h,wormhole_width,scale_x,scale_y_inv,scale_y,offset_y,lines,foreground,decoration,arcs){return(
(ctx, time) => {
   
  function unitToScreen(unitCoords) {
    return [0.5 * canvas_w + 0.5 * canvas_w * unitCoords[0],
            0.5 * canvas_h + 0.5 * canvas_h * unitCoords[1]];
  }
  
  function t_period(per_sec) {
    var per_millis = per_sec * 1000;
    return (time % (per_millis)) / per_millis;
  }
  
  function magnitude(vec2) {
    return Math.sqrt(vec2[0]*vec2[0] + vec2[1]*vec2[1]);
  }
  
  function wormDepth(vec2) {
    return Math.max(1.0 / (magnitude(vec2) + wormhole_width), 1);
  }
  
  function wormDeform(vec2) {
    var depth = wormDepth(vec2);
    return [
      (vec2[0]) * scale_x,
      (vec2[1] + scale_y_inv * depth) * scale_y + offset_y,
    ];
  };
  
  const gridStep = 2.0 / lines;
  const microStep = gridStep / 5;

  ctx.fillStyle = "black";
  ctx.fillRect(0,0, canvas_w, canvas_h);

  const dead_zone = 1;
  ctx.fillStyle = foreground;
  ctx.lineWidth = 1;


  // Grid between -1 and 1
  if (decoration) {
    for (var i = -1; i <= 1; i+=gridStep) {
      for (var j = -1; j <= 1; j+=gridStep) {
        for (var im = 0; im < gridStep; im += microStep) {
          if (magnitude([i + im, j]) < dead_zone) continue;
          ctx.beginPath();
          ctx.moveTo.apply(ctx, unitToScreen(wormDeform([i + im - microStep, j])));
          ctx.lineTo.apply(ctx, unitToScreen(wormDeform([i + im, j])));
          ctx.stroke();
        }
        for (var jm = 0; jm < gridStep; jm += microStep) {
          if (magnitude([i, j + jm]) < dead_zone) continue;
          ctx.beginPath();
          ctx.moveTo.apply(ctx, unitToScreen(wormDeform([i, j + jm - microStep])));
          ctx.lineTo.apply(ctx, unitToScreen(wormDeform([i, j + jm])));
          ctx.stroke();
        }
      } 
    }
  }
  

  // Draw fixed framing the wormhole
  ctx.beginPath();
  var radius = 1;
  var center = [0, 0];
  for (var theta = 0; theta <= 2 * Math.PI + 0.1; theta += 0.1) {
    ctx.lineTo.apply(ctx, unitToScreen(wormDeform([
      radius * Math.cos(theta) + center[0],
      radius * Math.sin(theta) + center[1]
    ])));
  }
  ctx.stroke();

  // Draw animated circles around the epicenter
  for (var i = -1; i < 0 - gridStep; i += gridStep) { 
    ctx.beginPath();
    var radius = i + t_period(1) * gridStep;
    var center = [0, 0];
    for (var theta = 0; theta <= 2 * Math.PI + 0.1; theta += 0.1) {
      ctx.lineTo.apply(ctx, unitToScreen(wormDeform([
        radius * Math.cos(theta) + center[0],
        radius * Math.sin(theta) + center[1]
      ])));
    }
    ctx.stroke();
  }

  // Draw radial arcs outwards around the epicenter
  for (var theta = 0; theta <= 2 * Math.PI; theta += 2 * Math.PI / arcs) {   
    var center = [0, 0];
    ctx.beginPath();
    for (var i = -1; i < 0; i += gridStep) { 
      var radius = i;
      ctx.lineTo.apply(ctx, unitToScreen(wormDeform([
        radius * Math.cos(theta) + center[0],
        radius * Math.sin(theta) + center[1]
      ])));
    }
    ctx.stroke();
  }

  // We will also some circles translating near the wormhole

  if (decoration) {
    for (var i = 0; i < 10; i++) {
      ctx.beginPath();
      var center = [
        Math.sin(time / (501 + i)),
        Math.sin(time / (601 + i))          
      ];
      for (var theta = 0; theta <= 2 * Math.PI; theta += 0.05) {
        ctx.lineTo.apply(ctx, unitToScreen(wormDeform([
          0.1 * Math.cos(theta) + center[0],
          0.1 * Math.sin(theta) + center[1]
        ])));
      }
      ctx.fill();
    }
  }
}
)};
const _1tsgu6g = function _foreground(color){return(
color({
  value: "#ff8300",
  title: "Foreground Color"
})
)};
const _17bgokh = (G, _) => G.input(_);
const _9vw4jt = function _decoration(checkbox){return(
checkbox({
  description: "Turn on extras",
  options: [{ value: "toggle", label: "On" }],
  value: ["toggle"]
})
)};
const _97odpi = (G, _) => G.input(_);
const _rgrt7q = function _lines(slider){return(
slider({
  min: 0,
  max: 64,
  step: 1,
  value: 14})
)};
const _1k99e5h = (G, _) => G.input(_);
const _17y4ah7 = function _arcs(slider){return(
slider({
  min: 0,
  max: 32,
  step: 1,
  value: 10})
)};
const _3w1px5 = (G, _) => G.input(_);
const _29bhwr = function _scale_x(slider){return(
slider({
  min: 0,
  max: 0.75,
  value: 1})
)};
const _2d41nn = (G, _) => G.input(_);
const _r62wx6 = function _scale_y(slider){return(
slider({
  min: 0,
  max: 1,
  value: 0.5})
)};
const _1om91lk = (G, _) => G.input(_);
const _1cvovh8 = function _scale_y_inv(slider){return(
slider({
  min: -2,
  max: 2,
  value: .9})
)};
const _1kqfxrk = (G, _) => G.input(_);
const _1t6sjw5 = function _offset_y(slider){return(
slider({
  min: -1,
  max: 1,
  value: -.9})
)};
const _mdnwyv = (G, _) => G.input(_);
const _uhv7cy = function _wormhole_width(slider){return(
slider({
  min: -0.5,
  max: 0.5,
  value: 0.3})
)};
const _y4ak4q = (G, _) => G.input(_);
const _f0xxzo = function _19(md){return(
md`## Render frames to a zip`
)};
const _eahkfc = function _capture(checkbox){return(
checkbox({
  description: "Turn on frame capture",
  options: [{ value: "toggle", label: "On" }]
})
)};
const _zkuu1c = (G, _) => G.input(_);
const _q18cvy = function _render_fps(slider){return(
slider({
  min: 0,
  max: 1024,
  steps:1,
  value: 30})
)};
const _1dgbtco = (G, _) => G.input(_);
const _lsoxhd = function _render_secs(slider){return(
slider({
  min: 0,
  max: 60,
  steps:1,
  value: 1})
)};
const _jjeoid = (G, _) => G.input(_);
const _1ag9eux = function* _preview(capture,DOM,canvas_w,canvas_h,foreground,render_fps,render_secs,wormholeFrame,$0)
{
  if (!capture) return;
  var ctx = DOM.context2d(canvas_w, canvas_h);
  ctx.strokeStyle = foreground;
  ctx.lineCap = "round"; 
  
  const tmpRenders = [];
  for (var frame = 0; frame < render_fps * render_secs; frame++) {
    wormholeFrame(ctx, (frame / render_fps) * 1000);
    var canvas = ctx.canvas;
    tmpRenders.push(canvas.toDataURL());
    yield canvas;
  }
  $0.value = tmpRenders;
};
const _n8skts = function _renders(){return(
[]
)};
const _18kg2mx = (M, _) => new M(_);
const _5k2hac = _ => _.generator;
const _31a3hv = function _JSZip(require){return(
require('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js')
)};
const _vm5jic = function _frames(renders,JSZip,html)
{
  if (!renders || renders.length == 0) return;
  function id(index) {
    var str = "" + index;
    return ('0000'+str).substring(str.length);
  }
  
  // https://stackoverflow.com/a/37138144
  function dataURLtoBlob(dataurl) {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      var n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], {type:mime});
  }
  
  var zip = new JSZip();
  
  for (var frame = 0; frame < renders.length; frame++) {
    // https://stackoverflow.com/a/37138144
    const imgData = renders[frame];
    const strDataURI = imgData.substr(22, imgData.length);
    const blob = dataURLtoBlob(imgData);
    const objurl = URL.createObjectURL(blob);
    
    zip.file("frame-" + id(frame) + ".png", strDataURI, {base64: true});
  }
 
  // Generate the zip file asynchronously
  return zip.generateAsync({type:"blob"})
    .then(function(content) {
    // Force down of the Zip file
    const zipUrl = URL.createObjectURL(content);
    return html`<a
         href=${zipUrl}
         download="frames.zip">
        frames.zip
       </a><br>`
  });
};
const _b34ib = function _28(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_1w14tc6", null, ["md"], _1w14tc6);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("color", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("color", _));  
  main.define("button", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("button", _));  
  main.define("checkbox", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("checkbox", _));  
  $def("_1j9bzud", "viewof canvas_w", ["slider"], _1j9bzud);  
  $def("_1ladwmq", "canvas_w", ["Generators","viewof canvas_w"], _1ladwmq);  
  $def("_ibb4wm", "viewof canvas_h", ["slider"], _ibb4wm);  
  $def("_1950heb", "canvas_h", ["Generators","viewof canvas_h"], _1950heb);  
  $def("_4z9k0x", "viewof animated_wormhole", ["DOM","canvas_w","canvas_h","foreground","wormholeFrame"], _4z9k0x);  
  $def("_13q3i91", "animated_wormhole", ["Generators","viewof animated_wormhole"], _13q3i91);  
  $def("_fjnxjf", "wormholeFrame", ["canvas_w","canvas_h","wormhole_width","scale_x","scale_y_inv","scale_y","offset_y","lines","foreground","decoration","arcs"], _fjnxjf);  
  $def("_1tsgu6g", "viewof foreground", ["color"], _1tsgu6g);  
  $def("_17bgokh", "foreground", ["Generators","viewof foreground"], _17bgokh);  
  $def("_9vw4jt", "viewof decoration", ["checkbox"], _9vw4jt);  
  $def("_97odpi", "decoration", ["Generators","viewof decoration"], _97odpi);  
  $def("_rgrt7q", "viewof lines", ["slider"], _rgrt7q);  
  $def("_1k99e5h", "lines", ["Generators","viewof lines"], _1k99e5h);  
  $def("_17y4ah7", "viewof arcs", ["slider"], _17y4ah7);  
  $def("_3w1px5", "arcs", ["Generators","viewof arcs"], _3w1px5);  
  $def("_29bhwr", "viewof scale_x", ["slider"], _29bhwr);  
  $def("_2d41nn", "scale_x", ["Generators","viewof scale_x"], _2d41nn);  
  $def("_r62wx6", "viewof scale_y", ["slider"], _r62wx6);  
  $def("_1om91lk", "scale_y", ["Generators","viewof scale_y"], _1om91lk);  
  $def("_1cvovh8", "viewof scale_y_inv", ["slider"], _1cvovh8);  
  $def("_1kqfxrk", "scale_y_inv", ["Generators","viewof scale_y_inv"], _1kqfxrk);  
  $def("_1t6sjw5", "viewof offset_y", ["slider"], _1t6sjw5);  
  $def("_mdnwyv", "offset_y", ["Generators","viewof offset_y"], _mdnwyv);  
  $def("_uhv7cy", "viewof wormhole_width", ["slider"], _uhv7cy);  
  $def("_y4ak4q", "wormhole_width", ["Generators","viewof wormhole_width"], _y4ak4q);  
  $def("_f0xxzo", null, ["md"], _f0xxzo);  
  $def("_eahkfc", "viewof capture", ["checkbox"], _eahkfc);  
  $def("_zkuu1c", "capture", ["Generators","viewof capture"], _zkuu1c);  
  $def("_q18cvy", "viewof render_fps", ["slider"], _q18cvy);  
  $def("_1dgbtco", "render_fps", ["Generators","viewof render_fps"], _1dgbtco);  
  $def("_lsoxhd", "viewof render_secs", ["slider"], _lsoxhd);  
  $def("_jjeoid", "render_secs", ["Generators","viewof render_secs"], _jjeoid);  
  $def("_1ag9eux", "preview", ["capture","DOM","canvas_w","canvas_h","foreground","render_fps","render_secs","wormholeFrame","mutable renders"], _1ag9eux);  
  $def("_n8skts", "initial renders", [], _n8skts);  
  $def("_18kg2mx", "mutable renders", ["Mutable","initial renders"], _18kg2mx);  
  $def("_5k2hac", "renders", ["mutable renders"], _5k2hac);  
  $def("_31a3hv", "JSZip", ["require"], _31a3hv);  
  $def("_vm5jic", "frames", ["renders","JSZip","html"], _vm5jic);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_b34ib", null, ["footer"], _b34ib);
  return main;
}