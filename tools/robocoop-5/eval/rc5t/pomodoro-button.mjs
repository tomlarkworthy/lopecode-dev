// rc5-train eval (20260927-2243-w1): a Start button whose handler never binds.
// In run 20260927-2243-w1-before the agent built the button with the `html` builtin and
// `onclick=${() => …}`. `html` is the legacy stdlib template: it stringifies the arrow, the `>` of `=>`
// closes the tag, and the button renders `{ mru.value = !mru.value; }> ▶ Start` with no listener. Every
// cell "computed with no runtime error"; the timer never started.
//
// The check is behavioural, so any correct build passes (htl.html handler, addEventListener,
// Inputs.button, a checkbox): setup.collect keeps every cell of a module created during the turn
// reachable, finds a Start control, clicks it, requires an mm:ss countdown to advance, then clicks Pause
// and requires it to stop.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

// Runs after the turn on the live page. Every module created during the turn, whatever the agent named it.
const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return "no module was created";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(800);
    const texts = () => userVars.map(v => {
      const x = v._value;
      if (x instanceof Element) return x.textContent;
      return typeof x === "string" || typeof x === "number" ? String(x) : "";
    }).join(" | ");
    const clock = () => {
      const hits = [...texts().matchAll(/(?<!\d)(\d{1,2})\s*:\s*([0-5]\d)(?!\d)/g)].map(m => +m[1] * 60 + +m[2]).filter(s => s > 0 && s <= 1500);
      return hits.length ? Math.min(...hits) : null;
    };
    const controls = sel => userVars.flatMap(v => {
      const x = v._value;
      if (!(x instanceof Element)) return [];
      return [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)];
    });
    const buttons = () => controls("button");
    // a labelled button, else a checkbox toggle in the required state
    const find = (re, checked) => buttons().find(b => re.test(b.textContent)) ||
      controls("input[type=checkbox]").find(c => c.checked === checked);
    const before = clock();
    if (before == null) return "no mm:ss countdown rendered: " + texts().slice(0, 200);
    const start = find(/start|resume|play|▶/i, false);
    if (!start) return "no Start button or unchecked toggle (buttons: " + JSON.stringify(buttons().map(b => b.textContent.trim().slice(0, 40))) + ")";
    start.click();
    await sleep(2200);
    const ran = clock();
    if (!(ran <= before - 2)) return "countdown did not advance after Start: " + before + "s -> " + ran + "s; button text " + JSON.stringify(start.textContent.trim().slice(0, 60));
    const pause = find(/pause|stop|⏸/i, true) || (start.isConnected && start.matches("button") ? start : null);
    if (!pause) return "no Pause button after starting";
    pause.click();
    await sleep(200);
    const p1 = clock();
    await sleep(1100);
    const p2 = clock();
    if (p1 !== p2) return "countdown kept running after Pause: " + p1 + "s -> " + p2 + "s";
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SOLUTION = `const _intro = function intro(md){return( md\`# Pomodoro timer\` )};
const _duration = function duration(){return( 25 * 60 )};
const _initial_remaining = function initial_remaining(duration){return( duration )};
const _mutable_remaining = function mutable_remaining(Mutable, initial_remaining){return( new Mutable(initial_remaining) )};
const _remaining = function remaining(mutable_remaining){return( mutable_remaining.generator )};
const _initial_running = function initial_running(){return( false )};
const _mutable_running = function mutable_running(Mutable, initial_running){return( new Mutable(initial_running) )};
const _running = function running(mutable_running){return( mutable_running.generator )};
const _initial_sessions = function initial_sessions(){return( 0 )};
const _mutable_sessions = function mutable_sessions(Mutable, initial_sessions){return( new Mutable(initial_sessions) )};
const _sessions = function sessions(mutable_sessions){return( mutable_sessions.generator )};
const _ticker = function ticker(running, mutable_remaining, mutable_sessions, duration, invalidation){
  if (!running) return "paused";
  const id = setInterval(() => {
    if (mutable_remaining.value <= 1) { mutable_sessions.value += 1; mutable_remaining.value = duration; }
    else mutable_remaining.value -= 1;
  }, 1000);
  invalidation.then(() => clearInterval(id));
  return "running";
};
const _clock = function clock(remaining){return( String(Math.floor(remaining / 60)).padStart(2, "0") + ":" + String(remaining % 60).padStart(2, "0") )};
// the handler form of @tomlarkworthy/gallery.card (lopebooks/notebooks/@tomlarkworthy_gallery.html):
// htl.html\`<button onclick=\${(e) => { … $edits.value = current; }}>…</button>\`, $edits being its "mutable edits" input
const _toggle = function toggle(htl, running, $running){return( htl.html\`<button onclick=\${() => { $running.value = !running; }}>\${running ? "⏸ Pause" : "▶ Start"}</button>\` )};
const _display = function display(htl, clock, sessions, ticker){return( htl.html\`<div><div style="font-size:3em">\${clock}</div><div>Completed sessions: \${sessions}</div></div>\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_duration", "duration", [], _duration);
  $def("_initial_remaining", "initial remaining", ["duration"], _initial_remaining);
  $def("_mutable_remaining", "mutable remaining", ["Mutable", "initial remaining"], _mutable_remaining);
  $def("_remaining", "remaining", ["mutable remaining"], _remaining);
  $def("_initial_running", "initial running", [], _initial_running);
  $def("_mutable_running", "mutable running", ["Mutable", "initial running"], _mutable_running);
  $def("_running", "running", ["mutable running"], _running);
  $def("_initial_sessions", "initial sessions", [], _initial_sessions);
  $def("_mutable_sessions", "mutable sessions", ["Mutable", "initial sessions"], _mutable_sessions);
  $def("_sessions", "sessions", ["mutable sessions"], _sessions);
  $def("_ticker", "ticker", ["running", "mutable remaining", "mutable sessions", "duration", "invalidation"], _ticker);
  $def("_clock", "clock", ["remaining"], _clock);
  $def("_toggle", "toggle", ["htl", "running", "mutable running"], _toggle);
  $def("_display", "display", ["htl", "clock", "sessions", "ticker"], _display);
  return main;
}
`;

export default {
  id: "rc5t-pomodoro-button",
  category: "rc5-train",
  question: "Build me a pomodoro timer: a start/pause button, a 25-minute countdown that updates every second, and a running tally of completed sessions that survives pausing. The start/pause control is one button whose label switches between Start and Pause. Show the time, the button and the tally together in one styled card.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // the defect: Start must start the countdown and Pause must stop it
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/pomodoro.js", content: SOLUTION } },
  ],
};
