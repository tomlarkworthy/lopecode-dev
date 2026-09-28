// rc5-train eval (20260928-0847-m29): a maintenance goal. The matrix-rain animation gets faster and jerkier
// every time the user moves a slider, and the laptop fan spins up.
// setup.files seeds @user/matrix-rain (fixtures/matrix-rain.js, provenance in fixtures/PROVENANCE.txt), re-homed
// from @tomlarkworthy/matrix-background (lopebooks/notebooks/@tomlarkworthy_matrix-background.html). Seeded
// defect: the anonymous loop cell (inputs canvas, rain, fade, frequency, speed) starts a requestAnimationFrame
// loop that draws into the canvas owned by the `canvas` cell and advances the drops owned by the `rain` cell,
// and never cancels it on `invalidation`. Each slider change starts one more loop: the rain falls N times faster.
//
// setup.initScript tags timers: a requestAnimationFrame / setTimeout / setInterval called while a cell body of the
// module runs (collect wraps each definition) starts a tagged loop, and a call made inside a tagged callback
// continues that loop. A loop is live while it has a pending callback or an uncleared interval. It also records
// fillText calls on the canvas collect is tracking, and counts page frames with its own rAF loop.
// setup.collect (behaviour, not spelling). It observes every cell of the module and re-defines each own cell, as a
// reload would: loops a buggy version left running earlier in the session are not the fixed code's behaviour.
//   runs    - at speed 1, the leftmost column's glyphs advance (px per page frame > 0)
//   loops   - after moving the speed slider 5 times (2, 0.5, 3, 1.5, 1) at most 1 tagged loop is live
//   rate    - back at speed 1, the fall rate equals the rate measured at speed 1 before the moves, within 10%
//   slider  - then at speed 2, the fall rate is 2x that rate, within 10%
//   edit    - each cell that started a live loop is re-created from its source text (as a cell-editor edit does):
//             the loop from before stops, at most 1 loop is live, the cell does not error, the rate stays 2x
//   errors  - no cell (anonymous included) errors
// Rate = (leftmost-column draws per page frame) x (median positive y step between those draws). N loops sharing
// the drops draw that column N times a frame, each one step on.
// M29_NEG=unchanged|stopped|globalflag|canvasflag|throttle|fnhandle swaps the oracle for a negative control (must score low);
// M29_NEG=ok2|ok3 are other correct fixes (must score 1.00).
const FIXTURE = "const _1hn3lw0 = function _1(md){return(\nmd`# Matrix Background\n\nModified from the work of Boujjou Achraf on [codepen](https://codepen.io/wefiy/pen/WPpEwo)`\n)};\nconst _1c60uq3 = function _frequency(Inputs){return(\nInputs.range([0, 1], {\n  label: \"frequency\"\n})\n)};\nconst _18cwxn4 = (G, _) => G.input(_);\nconst _1mbwas9 = function _fade(Inputs){return(\nInputs.range([0, 1], {\n  label: \"fade\",\n  value: 0.1\n})\n)};\nconst _1g214ra = (G, _) => G.input(_);\nconst _m29spd = function _speed(Inputs){return(\nInputs.range([0.25, 4], {\n  label: \"speed\",\n  value: 1,\n  step: 0.25\n})\n)};\nconst _m29spd2 = (G, _) => G.input(_);\nconst _1skykci = function _canvas(htl){return(\nhtl.html`<canvas width=\"640\" height=\"320\" style=\"display:block;max-width:100%;background:#fff;\"></canvas>`\n)};\nconst _m29rain = function _rain(canvas){return(\n(() => {\n  const fontSize = 12;\n  const columns = Math.ceil(canvas.width / fontSize);\n  const drops = Array.from(\n    { length: columns },\n    () => 1 + (Math.random() * canvas.height) / fontSize\n  );\n  return { fontSize, drops };\n})()\n)};\nconst _1w4tlk2 = function _6(canvas,rain,fade,frequency,speed){return(\n(() => {\n  const ctx = canvas.getContext(\"2d\");\n  const chars =\n    \"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}\".split(\n      \"\"\n    );\n  const { fontSize, drops } = rain;\n\n  function frame() {\n    const w = canvas.width;\n    const h = canvas.height;\n\n    ctx.shadowColor = \"transparent\";\n    ctx.shadowBlur = 0;\n\n    ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;\n    ctx.fillRect(0, 0, w, h);\n\n    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace`;\n\n    for (let i = 0; i < drops.length; i++) {\n      const x = i * fontSize;\n      const y = drops[i] * fontSize;\n      const ch = chars[(Math.random() * chars.length) | 0];\n\n      const head = Math.random() < 0.035;\n      ctx.fillStyle = head\n        ? \"rgba(10, 110, 85, 0.85)\"\n        : \"rgba(30, 55, 60, 0.50)\";\n      ctx.shadowColor = head ? \"rgba(0, 140, 110, 0.25)\" : \"transparent\";\n      ctx.shadowBlur = head ? 6 : 0;\n\n      ctx.fillText(ch, x, y);\n\n      if (y > h && Math.random() > frequency) drops[i] = 0;\n      drops[i] += speed;\n    }\n\n    requestAnimationFrame(frame);\n  }\n\n  requestAnimationFrame(frame);\n\n  return canvas;\n})()\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_1hn3lw0\", null, [\"md\"], _1hn3lw0);  \n  $def(\"_1c60uq3\", \"viewof frequency\", [\"Inputs\"], _1c60uq3);  \n  $def(\"_18cwxn4\", \"frequency\", [\"Generators\",\"viewof frequency\"], _18cwxn4);  \n  $def(\"_1mbwas9\", \"viewof fade\", [\"Inputs\"], _1mbwas9);  \n  $def(\"_1g214ra\", \"fade\", [\"Generators\",\"viewof fade\"], _1g214ra);  \n  $def(\"_m29spd\", \"viewof speed\", [\"Inputs\"], _m29spd);  \n  $def(\"_m29spd2\", \"speed\", [\"Generators\",\"viewof speed\"], _m29spd2);  \n  $def(\"_1skykci\", \"canvas\", [\"htl\"], _1skykci);  \n  $def(\"_m29rain\", \"rain\", [\"canvas\"], _m29rain);  \n  $def(\"_1w4tlk2\", null, [\"canvas\",\"rain\",\"fade\",\"frequency\",\"speed\"], _1w4tlk2);  \n  return main;\n}\n";

const INITSCRIPT = String.raw`(() => {
  const rAF = window.requestAnimationFrame.bind(window), cAF = window.cancelAnimationFrame.bind(window);
  const sT = window.setTimeout.bind(window), cT = window.clearTimeout.bind(window);
  const sI = window.setInterval.bind(window), cI = window.clearInterval.bind(window);
  let ctx = null, next = 1;
  const pendRaf = new Map(), pendTo = new Map(), intervals = new Map();
  const owner = new Map();
  const tagFor = () => { if (!ctx) return null; if (!ctx.fresh) return ctx; const t = { chain: next++ }; owner.set(t.chain, ctx.owner); return t; };
  const runIn = (tag, fn, args) => { const prev = ctx; ctx = tag; try { return fn(...args); } finally { ctx = prev; } };
  window.requestAnimationFrame = function (cb) {
    const tag = tagFor();
    if (!tag) return rAF(cb);
    const id = rAF((t) => { pendRaf.delete(id); return runIn(tag, cb, [t]); });
    pendRaf.set(id, tag.chain);
    return id;
  };
  window.cancelAnimationFrame = function (id) { pendRaf.delete(id); return cAF(id); };
  window.setTimeout = function (cb, ms, ...rest) {
    const tag = tagFor();
    if (!tag || typeof cb !== "function") return sT(cb, ms, ...rest);
    const id = sT(() => { pendTo.delete(id); return runIn(tag, cb, rest); }, ms);
    pendTo.set(id, tag.chain);
    return id;
  };
  window.clearTimeout = function (id) { pendTo.delete(id); return cT(id); };
  window.setInterval = function (cb, ms, ...rest) {
    const tag = tagFor();
    if (!tag || typeof cb !== "function") return sI(cb, ms, ...rest);
    const id = sI(() => runIn(tag, cb, rest), ms);
    intervals.set(id, tag.chain);
    return id;
  };
  window.clearInterval = function (id) { intervals.delete(id); return cI(id); };
  let frames = 0;
  const tick = () => { frames++; rAF(tick); };
  rAF(tick);
  let tracked = null, draws = [];
  const fT = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (s, x, y, ...r) {
    if (tracked && tracked.has(this.canvas)) draws.push({ c: this.canvas, x: +x, y: +y });
    return fT.call(this, s, x, y, ...r);
  };
  globalThis.__m29 = {
    wrap: (def, name) => function (...a) { const prev = ctx; ctx = { fresh: true, owner: name }; try { return def.apply(this, a); } finally { ctx = prev; } },
    liveChains: () => [...new Set([...pendRaf.values(), ...pendTo.values(), ...intervals.values()])],
    liveLoops: () => new Set([...pendRaf.values(), ...pendTo.values(), ...intervals.values()]).size,
    owner: (chain) => owner.get(chain),
    frames: () => frames,
    track: (canvases) => { tracked = new Set(canvases); draws = []; },
    draws: () => draws,
  };
})();`;

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/matrix-rain")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const M = globalThis.__m29;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = { runs: "not run", loops: "not run", rate: "not run", slider: "not run", edit: "not run", errors: "not run", verdict: "not run" };
  if (!M) { out.verdict = "initScript missing"; return out; }
  const mod = rt.mains.get("@user/matrix-rain") || [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m)[0];
  if (!mod) { out.verdict = "no @user/matrix-rain module"; return out; }
  const own = () => [...rt._variables].filter(v => v._module === mod && v._type === 1 && !String(v._name ?? "").startsWith("module ") && v._name !== "@variable");
  const observed = [];
  const errSeen = new Set();
  const noteErrs = () => { for (const v of own()) if (v._error != null) errSeen.add((v._name || "(anonymous)") + ": " + String(v._error?.message ?? v._error).slice(0, 160)); };
  const settle = async (ms = 1000) => { await sleep(ms); noteErrs(); };
  const els = () => own().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);
  // rate in px per page frame of the leftmost column, over ms
  const measure = async (ms = 2000) => {
    M.track(all("canvas"));
    const f0 = M.frames();
    const loopSamples = [];
    for (let i = 0; i < 10; i++) { await sleep(ms / 10); loopSamples.push(M.liveLoops()); }
    const frames = M.frames() - f0;
    const d = M.draws();
    const loops = loopSamples.sort((a, b) => a - b)[5];
    if (!d.length || !frames) return { frames, draws: d.length, rate: 0, loops };
    const byCanvas = new Map(); for (const r of d) byCanvas.set(r.c, (byCanvas.get(r.c) || 0) + 1);
    const c = [...byCanvas].sort((a, b) => b[1] - a[1])[0][0];
    const mine = d.filter(r => r.c === c);
    const minX = Math.min(...mine.map(r => r.x));
    const col = mine.filter(r => Math.abs(r.x - minX) < 0.5).map(r => r.y);
    const steps = col.slice(1).map((y, i) => y - col[i]).filter(s => s > 0).sort((a, b) => a - b);
    const step = steps.length ? steps[steps.length >> 1] : 0;
    const perFrame = col.length / frames;
    return { frames, draws: d.length, colDraws: col.length, perFrame: +perFrame.toFixed(3), step, rate: +(perFrame * step).toFixed(3), loops };
  };
  try {
    for (const v of own()) if (typeof v._observer === "symbol") { observed.push([v, v._observer]); v._observer = {}; rt._dirty.add(v); }
    rt._computeSoon();
    await settle(1000);
    // re-run every own cell, as a reload would, with each body wrapped so the loops it starts are tagged
    const skipped = [], origDef = new Map();
    for (const v of own()) {
      if (typeof v._definition !== "function" || v._inputs.some(i => i._module !== mod && i._module !== rt._builtin)) { skipped.push(v._name || "(anon)"); continue; }
      try { const d = v._definition, key = v._name ?? "(anon)#" + origDef.size; origDef.set(v, d); v.define(v._name ?? null, v._inputs.map(i => i._name), M.wrap(d, key)); v.__m29key = key; } catch (e) { skipped.push((v._name || "(anon)") + " threw"); }
    }
    out.notRedefined = skipped;
    await settle(2000);
    const speedIn = () => { const r = all("input[type=range]"); return r.find(e => /speed/i.test(e.closest("form, label, div")?.textContent || "")) || r.find(e => +e.min === 0.25 && +e.max === 4); };
    if (!speedIn()) { out.verdict = "no speed slider found"; noteErrs(); out.errors = errSeen.size ? [...errSeen].join("; ") : "none"; return out; }
    const set = async (x) => { const r = speedIn(); r.value = String(x); r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); await settle(800); };
    if (+speedIn().value !== 1) await set(1);
    const ref = await measure();
    out.ref = ref;
    out.runs = ref.rate > 0 ? "ok" : "the rain does not move at speed 1 (" + ref.draws + " glyphs drawn in " + ref.frames + " frames)";
    for (const s of [2, 0.5, 3, 1.5, 1]) await set(s);
    const back = await measure();
    out.back = back;
    out.loops = back.loops <= 1 ? "ok" : back.loops + " animation loops live after 5 slider moves (want at most 1)";
    const ratio1 = ref.rate > 0 ? back.rate / ref.rate : 0;
    out.rate = ref.rate > 0 && Math.abs(ratio1 - 1) <= 0.1 ? "ok" : "back at speed 1 after 5 moves the rain falls at " + ratio1.toFixed(2) + "x its first speed (want 1.00 +-0.10)";
    await set(2);
    const two = await measure();
    out.two = two;
    const ratio2 = ref.rate > 0 ? two.rate / ref.rate : 0;
    out.slider = ref.rate > 0 && Math.abs(ratio2 / 2 - 1) <= 0.1 ? "ok" : "at speed 2 the rain falls at " + ratio2.toFixed(2) + "x its speed-1 rate (want 2.00 +-0.20)";
    // edit: re-create each cell that started a live loop from its source text, as an edit in the cell editor
    // does; the loop from before must stop, at most one loop stays live, and the cell must not error
    const before = M.liveChains();
    const owners = new Set(before.map(c => M.owner(c)));
    const edited = own().filter(v => owners.has(v.__m29key));
    out.editedCells = edited.map(v => v._name || "(anonymous)");
    const editErrs = [];
    for (const v of edited) {
      let fresh;
      try { fresh = (0, eval)("(" + origDef.get(v).toString() + ")"); } catch (e) { editErrs.push("source does not compile alone: " + e.message); continue; }
      v.define(v._name ?? null, v._inputs.map(i => i._name), M.wrap(fresh, v.__m29key));
    }
    await settle(1500);
    for (const v of edited) if (v._error != null) editErrs.push((v._name || "(anonymous)") + " errors after the edit: " + String(v._error?.message ?? v._error).slice(0, 160));
    out.editedState = edited.map(v => ({ error: v._error == null ? null : String(v._error?.message ?? v._error).slice(0, 120), value: v._value instanceof Element ? v._value.tagName : typeof v._value, observed: typeof v._observer }));
    const afterEdit = await measure();
    const survivors = before.filter(c => M.liveChains().includes(c));
    out.afterEdit = { ...afterEdit, survivors: survivors.length };
    out.edit = editErrs.length ? editErrs.join("; ")
      : survivors.length ? survivors.length + " loop(s) started before the edit still running after it"
      : afterEdit.loops > 1 ? afterEdit.loops + " loops live after the edit"
      : ref.rate > 0 && Math.abs(afterEdit.rate / ref.rate / 2 - 1) > 0.1 ? "after the edit the rain falls at " + (afterEdit.rate / ref.rate).toFixed(2) + "x (want 2.00, speed is 2)"
      : "ok";
    noteErrs();
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = [out.runs, out.loops, out.rate, out.slider, out.edit].every(x => x === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { for (const [v, o] of observed) { v._observer = o; rt._dirty.add(v); } rt._computeSoon(); }
})()`;

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("m29 eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
const LOOP_DEF = '$def("_1w4tlk2", null, ["canvas","rain","fade","frequency","speed"], _1w4tlk2);';
const withDeps = (src, deps) => rep(src, LOOP_DEF, `$def("_1w4tlk2", null, ${JSON.stringify(deps)}, _1w4tlk2);`);

// the fix: cancel the frame on invalidation, as @tomlarkworthy/matrix-background (the original of this cell) does
const OK = withDeps(rep(rep(FIXTURE,
  "const _1w4tlk2 = function _6(canvas,rain,fade,frequency,speed){return(", "const _1w4tlk2 = function _6(canvas,rain,fade,frequency,speed,invalidation){return("),
  "    requestAnimationFrame(frame);\n  }\n\n  requestAnimationFrame(frame);\n",
  "    raf = requestAnimationFrame(frame);\n  }\n\n  let raf = requestAnimationFrame(frame);\n  invalidation.then(() => cancelAnimationFrame(raf));\n"),
  ["canvas", "rain", "fade", "frequency", "speed", "invalidation"]);
// other correct fix: a generator cell; the runtime pulls one frame at a time and drops it when the cell re-runs
// (form of @tomlarkworthy/lazer-light spring: while (true) { ...draw...; yield ctx.canvas })
const OK2 = rep(rep(FIXTURE,
  "const _1w4tlk2 = function _6(canvas,rain,fade,frequency,speed){return(\n(() => {", "const _1w4tlk2 = function* _6(canvas,rain,fade,frequency,speed)\n{\n  {"),
  "    requestAnimationFrame(frame);\n  }\n\n  requestAnimationFrame(frame);\n\n  return canvas;\n})()\n)};",
  "  }\n\n  while (true) {\n    frame();\n    yield canvas;\n  }\n  }\n};");
// other correct fix: the loop lists the viewofs and reads .value each frame, so it starts once
const OK3 = withDeps(rep(rep(rep(FIXTURE,
  "const _1w4tlk2 = function _6(canvas,rain,fade,frequency,speed){return(", "const _1w4tlk2 = function _6(canvas,rain,viewof_fade,viewof_frequency,viewof_speed){return("),
  "ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;", "ctx.fillStyle = `rgba(255, 255, 255, ${viewof_fade.value})`;"),
  "if (y > h && Math.random() > frequency) drops[i] = 0;\n      drops[i] += speed;", "if (y > h && Math.random() > viewof_frequency.value) drops[i] = 0;\n      drops[i] += viewof_speed.value;"),
  ["canvas", "rain", "viewof fade", "viewof frequency", "viewof speed"]);
// negative: one frame, no loop
const STOPPED = rep(FIXTURE, "    requestAnimationFrame(frame);\n  }\n\n  requestAnimationFrame(frame);\n", "  }\n\n  frame();\n");
// negative: a global flag starts the loop once per page
const GLOBALFLAG = rep(FIXTURE, "  const { fontSize, drops } = rain;\n", "  const { fontSize, drops } = rain;\n  if (window.__matrixRunning) return canvas;\n  window.__matrixRunning = true;\n");
// negative: a flag on the canvas starts the loop once, with the speed it had then
const CANVASFLAG = rep(FIXTURE, "  const { fontSize, drops } = rain;\n", "  const { fontSize, drops } = rain;\n  if (canvas.__running) return canvas;\n  canvas.__running = true;\n");
// negative: a shared throttle lets one loop draw per frame; every loop keeps running
const THROTTLE = rep(FIXTURE,
  "  function frame() {\n", "  function frame(now) {\n    if (now - (rain.last ?? -1e9) < 12) { requestAnimationFrame(frame); return; }\n    rain.last = now;\n");

// negative (replay of 20260928-0847-m29 base run): the frame id kept on the cell's compiled function object
const FNHANDLE = rep(rep(rep(FIXTURE,
  "  const ctx = canvas.getContext(\"2d\");\n", "  // Cancel the previous animation loop when this cell re-runs\n  if (_1w4tlk2._id) cancelAnimationFrame(_1w4tlk2._id);\n\n  const ctx = canvas.getContext(\"2d\");\n"),
  "    requestAnimationFrame(frame);\n  }\n", "    _1w4tlk2._id = requestAnimationFrame(frame);\n  }\n"),
  "  }\n\n  requestAnimationFrame(frame);\n", "  }\n\n  _1w4tlk2._id = requestAnimationFrame(frame);\n");
const SOLUTIONS = { fnhandle: FNHANDLE, ok: OK, ok2: OK2, ok3: OK3, unchanged: FIXTURE, stopped: STOPPED, globalflag: GLOBALFLAG, canvasflag: CANVASFLAG, throttle: THROTTLE };
const NEG = globalThis.process?.env?.M29_NEG;

export default {
  id: "rc5t-animation-loop-leak",
  category: "rc5-train",
  question: "In my matrix rain notebook (@user/matrix-rain): the animation gets faster and jerkier every time I move the slider, and my laptop fan spins up. Fix it.",
  setup: { files: { "/src/@user/matrix-rain.js": FIXTURE }, initScript: INITSCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 6 },
    { name: "collected_equals", args: { key: "loops", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "rate", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "slider", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "edit", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "runs", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/matrix-rain.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/matrix-rain.js", content: SOLUTIONS[NEG || "ok"] } },
  ],
};
