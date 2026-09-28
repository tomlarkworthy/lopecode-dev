const _intro = function intro(md){return( md`# Pendulum` )};
const _viewof_length = function viewof_length(Inputs){return( Inputs.range([0.2, 3], {label: "Length (m)", step: 0.01, value: 1}) )};
const _length = (G, _) => G.input(_);
const _viewof_gravity = function viewof_gravity(Inputs){return( Inputs.range([1, 25], {label: "Gravity (m/s²)", step: 0.01, value: 9.81}) )};
const _gravity = (G, _) => G.input(_);
const _initial_running = function initial_running(){return( true )};
const _mutable_running = function mutable_running(Mutable, initial_running){return( new Mutable(initial_running) )};
const _running = function running(mutable_running){return( mutable_running.generator )};
// The swing's state lives in its own cell with no slider inputs, so a slider change re-runs only the
// loop below and the swing carries on (as @tomlarkworthy/liquid-timer keeps `liquid` apart from `mainLoop`).
const _state = function state(){return( {theta: 0.2, omega: 0, t: 0, history: []} )};
const _toggle = function toggle(htl, running, $running){return( htl.html`<button onclick=${() => { $running.value = !running; }}>${running ? "⏸ Pause" : "▶ Resume"}</button>` )};
const _stage = function stage(htl){
  const svg = htl.svg`<svg width=300 height=260 viewBox="-150 -20 300 260" style="background:#f6f6f6">
    <line x1=0 y1=0 x2=0 y2=100 stroke="#333" stroke-width=2></line>
    <circle cx=0 cy=100 r=12 fill="steelblue"></circle>
  </svg>`;
  const plot = htl.html`<div></div>`;
  return htl.html`<div style="display:flex;gap:16px;align-items:flex-start">${svg}${plot}</div>`;
};
const _mainLoop = function mainLoop(state, length, gravity, running, stage, Plot, invalidation){
  const line = stage.querySelector("line"), bob = stage.querySelector("circle"), plotBox = stage.children[1];
  const draw = () => {
    const r = 200 * Math.min(1, length / 3) + 20;
    const x = r * Math.sin(state.theta), y = r * Math.cos(state.theta);
    line.setAttribute("x2", x); line.setAttribute("y2", y);
    bob.setAttribute("cx", x); bob.setAttribute("cy", y);
  };
  const drawPlot = () => {
    const h = state.history.filter(p => p.t >= state.t - 10);
    state.history = h;
    plotBox.replaceChildren(Plot.plot({width: 360, height: 220, x: {label: "t (s)", domain: [state.t - 10, state.t]}, y: {label: "θ (rad)"}, marks: [Plot.ruleY([0]), Plot.line(h, {x: "t", y: "theta"})]}));
  };
  draw(); drawPlot();
  if (!running) return "paused";
  let last = performance.now(), lastPlot = 0, frame;
  const loop = (now) => {
    frame = requestAnimationFrame(loop);
    let dt = Math.min(now - last, 100) / 1000;
    last = now;
    const h = 1 / 1000;
    for (; dt > 0; dt -= h) {
      const s = Math.min(h, dt);
      state.omega += -(gravity / length) * Math.sin(state.theta) * s;
      state.theta += state.omega * s;
      state.t += s;
    }
    state.history.push({t: state.t, theta: state.theta});
    draw();
    if (now - lastPlot > 100) { lastPlot = now; drawPlot(); }
  };
  frame = requestAnimationFrame(loop);
  invalidation.then(() => cancelAnimationFrame(frame));
  return "running";
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_length", "viewof length", ["Inputs"], _viewof_length);
  $def("_length", "length", ["Generators", "viewof length"], _length);
  $def("_viewof_gravity", "viewof gravity", ["Inputs"], _viewof_gravity);
  $def("_gravity", "gravity", ["Generators", "viewof gravity"], _gravity);
  $def("_initial_running", "initial running", [], _initial_running);
  $def("_mutable_running", "mutable running", ["Mutable", "initial running"], _mutable_running);
  $def("_running", "running", ["mutable running"], _running);
  $def("_state", "state", [], _state);
  $def("_toggle", "toggle", ["htl", "running", "mutable running"], _toggle);
  $def("_stage", "stage", ["htl"], _stage);
  $def("_mainLoop", "mainLoop", ["state", "length", "gravity", "running", "stage", "Plot", "invalidation"], _mainLoop);
  return main;
}
