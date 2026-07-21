const _1udv1iq = function _1(md){return(
md`# Animated Wormhole
This notebook is fractal and self-referential
`
)};
const _vrfqdv = function _2(tweet){return(
tweet("1213219519096926216")
)};
const _17ksipp = function _canvas_w(slider){return(
slider({
  min: 1,
  max: 1024,
  step: 1,
  value: 512,
  format: ",",
  description:
    "Width of canvas"
})
)};
const _1ladwmq = (G, _) => G.input(_);
const _4kgft1 = function _canvas_h(slider){return(
slider({
  min: 1,
  max: 1024,
  step: 1,
  value: 384,
  format: ",",
  description:
    "Height of canvas"
})
)};
const _1950heb = (G, _) => G.input(_);
const _1kbo0fo = function* _animated_wormhole(DOM,canvas_w,canvas_h,scale_x,offset_y,scale_y_inv,scale_y,skew_y,segments,thickness,foreground,arcs,lines)
{
  var ctx = DOM.context2d(canvas_w, canvas_h);
  // We flush fill the foreground color so that it fades into the natural minimum
  // of the foreground will
  ctx.lineCap = "round"; 
  
  var seg_scale_z = 0.1;
  var lineSegStep = 0.1;
  var thetaOffset = 0.5;
  
  function unitToScreen(unitCoords) {
    return [0.5 * canvas_w + 0.5 * canvas_w * unitCoords[0],
            0.5 * canvas_h + 0.5 * canvas_h * unitCoords[1]];
  }
  
  function quadratic(x, a, b, c) {
    return x * a * a + x * b + c;
  }
  
  function arcPoint(arc, segment) {
    return [segment * scale_x * seg_scale_z * Math.cos(2 * arc * Math.PI),
            offset_y + scale_y_inv / (segment * segment + 1) + quadratic(segment, 0, scale_y, skew_y) * Math.sin(2 * arc * Math.PI)];
  }
  
  function segment_f(segment) {
    return (1 + segment) - (Date.now() % 1000) / 1000;
  }
  
  function line_w(segment) {
    var unit = segment_f(segment) / segments;
    return Math.max((unit + Math.min(0, - 2 * unit + 1)) * thickness, 0.1);
  }
  
  while (true) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas_w, canvas_h);
    ctx.globalCompositeOperation = "source-over";
    
    // Rings
    for (var segment = 0; segment < segments; segment++) {
      ctx.lineWidth = line_w(segment);
      ctx.strokeStyle = foreground;
      ctx.beginPath();
      
      for (var arc = thetaOffset; arc <= arcs + thetaOffset; arc++) {
        var arc_f = arc / arcs;
        var arc_pos = unitToScreen(arcPoint(arc_f, segment_f(segment)));
        ctx.lineTo.apply(ctx, arc_pos);
      }
      ctx.stroke();
    }
    // Inward lines
    for (var line = thetaOffset; line < lines; line++) {
      ctx.strokeStyle = foreground;
      ctx.beginPath();
      var line_f = line / lines;
      for (var segment = -3; segment < segments-1; segment+= lineSegStep) {
        ctx.beginPath();
        ctx.moveTo.apply(ctx, unitToScreen(arcPoint(line_f, segment_f(segment - lineSegStep))));
        var arc_pos = unitToScreen(arcPoint(line_f, segment_f(segment)));
        ctx.lineTo.apply(ctx, arc_pos);
        ctx.lineWidth = line_w(segment);
        ctx.stroke();
      }
    }
    
    yield ctx.canvas
  }  
};
const _13q3i91 = (G, _) => G.input(_);
const _5hmhzl = function _foreground(color){return(
color({
  value: "#ffeb34",
  title: "Foreground Color"
})
)};
const _17bgokh = (G, _) => G.input(_);
const _1qn558e = function _thickness(slider){return(
slider({
  min: 1,
  max: 10,
  value: 6
})
)};
const _iux5lo = (G, _) => G.input(_);
const _106xdfj = function _segments(slider){return(
slider({
  min: 1,
  max: 24,
  step: 1,
  value: 12
})
)};
const _1odf9y2 = (G, _) => G.input(_);
const _1l0gz5g = function _arcs(slider){return(
slider({
  min: 3,
  max: 50,
  step: 1,
  value: 32,
})
)};
const _3w1px5 = (G, _) => G.input(_);
const _rgrt7q = function _lines(slider){return(
slider({
  min: 0,
  max: 64,
  step: 1,
  value: 14})
)};
const _1k99e5h = (G, _) => G.input(_);
const _1zip29 = function _scale_x(slider){return(
slider({
  min: 0,
  max: 5,
  value: 0.73})
)};
const _2d41nn = (G, _) => G.input(_);
const _18ip9m5 = function _scale_y(slider){return(
slider({
  min: 0,
  max: 1,
  value: 0.04})
)};
const _1om91lk = (G, _) => G.input(_);
const _90zfrt = function _scale_y_inv(slider){return(
slider({
  min: -2,
  max: 2,
  value: .95})
)};
const _1kqfxrk = (G, _) => G.input(_);
const _fylxmw = function _offset_y(slider){return(
slider({
  min: -1,
  max: 1,
  value: -0.13})
)};
const _mdnwyv = (G, _) => G.input(_);
const _wvnilr = function _skew_y(slider){return(
slider({
  min: -1,
  max: 1,
  value: 0})
)};
const _h3yjl2 = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @mbostock/tweet", async () => runtime.module((await import("/@mbostock/tweet.js?v=4")).default));  
  $def("_1udv1iq", null, ["md"], _1udv1iq);  
  $def("_vrfqdv", null, ["tweet"], _vrfqdv);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("color", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("color", _));  
  main.define("tweet", ["module @mbostock/tweet", "@variable"], (_, v) => v.import("tweet", _));  
  $def("_17ksipp", "viewof canvas_w", ["slider"], _17ksipp);  
  $def("_1ladwmq", "canvas_w", ["Generators","viewof canvas_w"], _1ladwmq);  
  $def("_4kgft1", "viewof canvas_h", ["slider"], _4kgft1);  
  $def("_1950heb", "canvas_h", ["Generators","viewof canvas_h"], _1950heb);  
  $def("_1kbo0fo", "viewof animated_wormhole", ["DOM","canvas_w","canvas_h","scale_x","offset_y","scale_y_inv","scale_y","skew_y","segments","thickness","foreground","arcs","lines"], _1kbo0fo);  
  $def("_13q3i91", "animated_wormhole", ["Generators","viewof animated_wormhole"], _13q3i91);  
  $def("_5hmhzl", "viewof foreground", ["color"], _5hmhzl);  
  $def("_17bgokh", "foreground", ["Generators","viewof foreground"], _17bgokh);  
  $def("_1qn558e", "viewof thickness", ["slider"], _1qn558e);  
  $def("_iux5lo", "thickness", ["Generators","viewof thickness"], _iux5lo);  
  $def("_106xdfj", "viewof segments", ["slider"], _106xdfj);  
  $def("_1odf9y2", "segments", ["Generators","viewof segments"], _1odf9y2);  
  $def("_1l0gz5g", "viewof arcs", ["slider"], _1l0gz5g);  
  $def("_3w1px5", "arcs", ["Generators","viewof arcs"], _3w1px5);  
  $def("_rgrt7q", "viewof lines", ["slider"], _rgrt7q);  
  $def("_1k99e5h", "lines", ["Generators","viewof lines"], _1k99e5h);  
  $def("_1zip29", "viewof scale_x", ["slider"], _1zip29);  
  $def("_2d41nn", "scale_x", ["Generators","viewof scale_x"], _2d41nn);  
  $def("_18ip9m5", "viewof scale_y", ["slider"], _18ip9m5);  
  $def("_1om91lk", "scale_y", ["Generators","viewof scale_y"], _1om91lk);  
  $def("_90zfrt", "viewof scale_y_inv", ["slider"], _90zfrt);  
  $def("_1kqfxrk", "scale_y_inv", ["Generators","viewof scale_y_inv"], _1kqfxrk);  
  $def("_fylxmw", "viewof offset_y", ["slider"], _fylxmw);  
  $def("_mdnwyv", "offset_y", ["Generators","viewof offset_y"], _mdnwyv);  
  $def("_wvnilr", "viewof skew_y", ["slider"], _wvnilr);  
  $def("_h3yjl2", "skew_y", ["Generators","viewof skew_y"], _h3yjl2);
  return main;
}