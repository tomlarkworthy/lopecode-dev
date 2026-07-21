const _na0s9l = function _1(md){return(
md`# Lazer Light`
)};
const _1dk1grr = function* _spring(DOM,canvas_w,canvas_h,drawLazerPath)
{
  var ctx = DOM.context2d(canvas_w, canvas_h);
  // We flush fill the foreground color so that it fades into the natural minimum
  // of the foreground will
  ctx.lineCap = "round";
  
  function vortexPoints(offset, coils, tightness, scale_x, scale_y) {
    var points = [];
    for (var theta = offset; theta < offset + coils * 2 * Math.PI; theta += 0.3) {
      const width = (coils * 2 * Math.PI - (theta-offset -10)) / (coils * 2 * Math.PI);
      const shakeyness = 30;
      const shake = (Math.random() / shakeyness + (1 - 1 / shakeyness) );
      points.push([
        width * Math.cos(theta) * scale_x * canvas_w * 0.5 * shake + canvas_w / 2,
        width * Math.sin(theta) * scale_y * canvas_h * shake + (theta - offset) * tightness + canvas_h / 2
      ]);
    }
    return points;
  }
  const start_time = Date.now();
  while (true) {
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas_w, canvas_h);
    drawLazerPath(ctx, vortexPoints(
      - 2 * Math.PI * ((Date.now() - start_time) / 500),
      10,
      4,
      0.25,
      0.1
    ));
    
    yield ctx.canvas
  }  
};
const _1l72qb9 = (G, _) => G.input(_);
const _idkc1c = function* _spring_beam(DOM,canvas_w,canvas_h,tickBeam)
{
  var ctx = DOM.context2d(canvas_w, canvas_h);
  // We flush fill the foreground color so that it fades into the natural minimum
  // of the foreground will
  ctx.lineCap = "round";
  
  function vortexPoints(start, end, scale_x, scale_y) {
    var points = [];
    var step = (end - start) / 10;
    for (var theta = start; theta <= end + step / 2; theta += step) {
      const width = 3;
      points.push([
        width * Math.cos(theta * Math.PI * 2) * scale_x * canvas_w * 0.5 + canvas_w / 2,
        width * Math.sin(theta * Math.PI * 2) * scale_y * canvas_h * 0.5 + canvas_h / 2
      ]);
    }
    return points;
  }
  var beam_state = undefined;
  var velocity = 1;
  var t_prev = (((Date.now() - 10) / 1000) * velocity);
  while (true) {
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas_w, canvas_h);
    var t_now = (Date.now() / 1000 * velocity);
    var points = vortexPoints(
      t_prev,
      t_now,
      0.25,
      0.1
    );
    t_prev = t_now;
    beam_state = tickBeam(ctx, Date.now(), points, beam_state);
    
    yield ctx.canvas
  }  
};
const _5un8yz = (G, _) => G.input(_);
const _1ntsz8x = function _canvas_w(slider){return(
slider({
  min: 1,
  max: 1024,
  step: 1,
  value: 800,
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
const _66kh8x = function _halo_color(color){return(
color({
  value: "#80182c",
  title: "Midground Color"
})
)};
const _1cnz3b6 = (G, _) => G.input(_);
const _1q8qufh = function _saturation_color(color){return(
color({
  value: "#fff6fb",
  title: "Foreground Color"
})
)};
const _1icmtto = (G, _) => G.input(_);
const _ftovf3 = function _lazer_power(slider){return(
slider({
  min: 0,
  max: 5,
  value: 2.6
})
)};
const _qbkda4 = (G, _) => G.input(_);
const _biyhdm = function _power_decay_exponent(slider){return(
slider({
  min: -2,
  max: -0.1,
  value: -.33 
})
)};
const _1fo9cli = (G, _) => G.input(_);
const _rshvj4 = function _floor(slider){return(
slider({
  min: 0,
  max: 1,
  value: 0.5
})
)};
const _1swwosk = (G, _) => G.input(_);
const _h6niwo = function _sqrt_width_px(slider){return(
slider({
  min: 1,
  max: 20,
  step: 1,
  value: 11
})
)};
const _1ttz54o = (G, _) => G.input(_);
const _1vx1i8a = function _drawLazerPath(lazer_power,d3,halo_color,sqrt_width_px,power_decay_exponent,floor){return(
(ctx, points, options) => {
  options = options || {};
  options.power = options.power || lazer_power;
  const hue = d3.hsl(halo_color).h;
  for (var i = sqrt_width_px; i > 0; i--) {
    const distance = i*i;
    const saturation = options.power * Math.pow(distance, power_decay_exponent) - floor;
    const lightness = saturation;
    ctx.strokeStyle = d3.hsl(hue, saturation, lightness);
    ctx.lineWidth = distance;
    ctx.beginPath();
    ctx.moveTo.apply(ctx, points[0]);
    for (var p = 1; p < points.length; p++) {
      ctx.lineTo.apply(ctx, points[p]);
    }
    ctx.stroke();
  }
}
)};
const _1qs0o91 = function _tickBeam(lazer_power,drawLazerPath){return(
function tickBeam(ctx, t, path, beam_state) {
  const frames = 20;
  const beam_power = lazer_power;
  const previousCompositeOperation = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighten";
  beam_state = beam_state || {
    paths: []
  };
  // Push latest path on memory
  beam_state.paths.unshift(path);
  while (beam_state.paths.length >= frames) {
    beam_state.paths.pop();
  };
  //drawLazerPath(ctx, path);
  // Draw each beam, last-to-first
  for (var frame = beam_state.paths.length - 1; frame >= 0; frame--) {
    var power = beam_power * (1 - (frame/frames)); // should be affected by length of path too
    //var power = Math.pow(beam_power, -frames); // should be affected by length of path too
    drawLazerPath(ctx, beam_state.paths[frame], {
      power: power
    });
  }
  ctx.globalCompositeOperation = previousCompositeOperation;
  return beam_state;
}
)};
const _qa3khx = function* _scribble(canvas_w,canvas_h,DOM,drawLazerPath)
{
  var rand2d = () => [Math.random() * canvas_w, Math.random() * canvas_h];
  var avg = (a, b) => {
    var result = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      result[i] = (a[i] + b[i]) / 2;
    }
    return result;
  }
  var ctx = DOM.context2d(canvas_w, canvas_h);
  // We flush fill the foreground color so that it fades into the natural minimum
  // of the foreground will
  ctx.lineCap = "round";
  
  var last_pos = rand2d();
  while (true) {
    ctx.fillStyle = "black";
    ctx.fillRect(0,0, canvas_w, canvas_h);
    var new_pos = avg(avg(rand2d(), last_pos), last_pos);
    drawLazerPath(ctx, [last_pos, new_pos]);
    last_pos = new_pos;
    
    yield ctx.canvas
  }  
};
const _13tso50 = (G, _) => G.input(_);
const _rz8q4c = function _d3(require){return(
require("d3")
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @jashkenas/inputs", async () => runtime.module((await import("/@jashkenas/inputs.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_na0s9l", null, ["md"], _na0s9l);  
  $def("_1dk1grr", "viewof spring", ["DOM","canvas_w","canvas_h","drawLazerPath"], _1dk1grr);  
  $def("_1l72qb9", "spring", ["Generators","viewof spring"], _1l72qb9);  
  $def("_idkc1c", "viewof spring_beam", ["DOM","canvas_w","canvas_h","tickBeam"], _idkc1c);  
  $def("_5un8yz", "spring_beam", ["Generators","viewof spring_beam"], _5un8yz);  
  $def("_1ntsz8x", "viewof canvas_w", ["slider"], _1ntsz8x);  
  $def("_1ladwmq", "canvas_w", ["Generators","viewof canvas_w"], _1ladwmq);  
  $def("_ibb4wm", "viewof canvas_h", ["slider"], _ibb4wm);  
  $def("_1950heb", "canvas_h", ["Generators","viewof canvas_h"], _1950heb);  
  $def("_66kh8x", "viewof halo_color", ["color"], _66kh8x);  
  $def("_1cnz3b6", "halo_color", ["Generators","viewof halo_color"], _1cnz3b6);  
  $def("_1q8qufh", "viewof saturation_color", ["color"], _1q8qufh);  
  $def("_1icmtto", "saturation_color", ["Generators","viewof saturation_color"], _1icmtto);  
  $def("_ftovf3", "viewof lazer_power", ["slider"], _ftovf3);  
  $def("_qbkda4", "lazer_power", ["Generators","viewof lazer_power"], _qbkda4);  
  $def("_biyhdm", "viewof power_decay_exponent", ["slider"], _biyhdm);  
  $def("_1fo9cli", "power_decay_exponent", ["Generators","viewof power_decay_exponent"], _1fo9cli);  
  $def("_rshvj4", "viewof floor", ["slider"], _rshvj4);  
  $def("_1swwosk", "floor", ["Generators","viewof floor"], _1swwosk);  
  $def("_h6niwo", "viewof sqrt_width_px", ["slider"], _h6niwo);  
  $def("_1ttz54o", "sqrt_width_px", ["Generators","viewof sqrt_width_px"], _1ttz54o);  
  $def("_1vx1i8a", "drawLazerPath", ["lazer_power","d3","halo_color","sqrt_width_px","power_decay_exponent","floor"], _1vx1i8a);  
  $def("_1qs0o91", "tickBeam", ["lazer_power","drawLazerPath"], _1qs0o91);  
  $def("_qa3khx", "viewof scribble", ["canvas_w","canvas_h","DOM","drawLazerPath"], _qa3khx);  
  $def("_13tso50", "scribble", ["Generators","viewof scribble"], _13tso50);  
  $def("_rz8q4c", "d3", ["require"], _rz8q4c);  
  main.define("slider", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("slider", _));  
  main.define("color", ["module @jashkenas/inputs", "@variable"], (_, v) => v.import("color", _));  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));
  return main;
}