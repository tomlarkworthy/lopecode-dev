// rc5-train eval (20260928-0205-w14): a keyboard-driven real-time module (a snake game) that the user can
// play, restart, and that the agent can keep editing.
// In run 20260928-0205-w14-before the agent built the game with a `document` keydown listener that never
// called preventDefault (the arrow keys also scroll the page, and reach the game while the user types in
// the chat), started the loop at once (the snake hit the wall ~1.2 s after the write, before anyone
// could press a key), and wired Restart to `location.reload()`, which in Lopecode reloads the notebook
// file and discards the unsaved module the agent had just written. Every cell "computed with no runtime
// error".
//
// setup.init wraps addEventListener/removeEventListener, setInterval/setTimeout/requestAnimationFrame to
// count, per function, the listeners and ticks whose source appears inside a cell of a module created
// during the turn (attribution by source containment, so the notebook's own UI is not counted).
// setup.collect then plays the module as a user would and returns one boolean per requirement.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
  const S = globalThis.__rc5tSnake = { keys: new Set(), ticks: new Map() };
  const ET = EventTarget.prototype, add = ET.addEventListener, rem = ET.removeEventListener;
  const key = t => /^key(down|up|press)$/.test(t);
  ET.addEventListener = function (type, fn, opts) {
    if (key(type) && typeof fn === "function") S.keys.add({ target: new WeakRef(this), type, fn });
    return add.call(this, type, fn, opts);
  };
  ET.removeEventListener = function (type, fn, opts) {
    if (key(type)) for (const k of S.keys) if (k.fn === fn && k.type === type && k.target.deref() === this) { S.keys.delete(k); break; }
    return rem.call(this, type, fn, opts);
  };
  const wrap = orig => function (fn, ...rest) {
    if (typeof fn !== "function") return orig.call(this, fn, ...rest);
    return orig.call(this, function (...a) { S.ticks.set(fn, (S.ticks.get(fn) || 0) + 1); return fn.apply(this, a); }, ...rest);
  };
  globalThis.setInterval = wrap(globalThis.setInterval);
  globalThis.setTimeout = wrap(globalThis.setTimeout);
  globalThis.requestAnimationFrame = wrap(globalThis.requestAnimationFrame);
})()`;

const COLLECT = String.raw`(async () => {
  const S = globalThis.__rc5tSnake;
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const isUser = v => !globalThis.__rc5tBefore.has(v._module) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const out = { renders: false, arrowsClaimed: false, othersFree: false, restartSurvives: false, restartResets: false, noLeak: false, why: [] };
  if (!users().length) { out.why.push("no module was created"); return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const src = () => users().map(v => String(v._definition)).join("\n");
  const mine = fn => { const s = String(fn); return s.length > 8 && !/\[native code\]/.test(s) && src().includes(s); };
  const els = () => users().map(v => v._value).filter(x => x instanceof Element && x.isConnected);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const text = () => els().map(x => x.textContent).join(" | ");
  const score = () => {
    const m = text().match(/score\D{0,12}?(\d+)/i);
    if (m) return +m[1];
    const v = users().find(v => /score/i.test(v._name) && typeof v._value === "number");
    return v ? v._value : null;
  };
  const target = () => all("[tabindex]").find(x => x.tabIndex >= 0 && !x.matches("button,input,textarea,select,a")) ||
    all("canvas")[0] || all("svg")[0] || els().find(x => !x.matches("button,input"));
  const press = (k, at) => {
    const t = at || (document.activeElement && document.activeElement !== document.body ? document.activeElement : target());
    if (!t) return false;
    const e = new KeyboardEvent("keydown", { key: k, code: k, bubbles: true, cancelable: true, composed: true });
    t.dispatchEvent(e);
    t.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: k, bubbles: true, cancelable: true, composed: true }));
    return e.defaultPrevented;
  };
  const engage = async () => {
    // a game that waits for a Start/Play button is started first, as a player would; a combined
    // "Start / Restart" or a plain Restart button is pressed too (it starts a fresh game)
    const start = all("button").find(b => /start|play|▶/i.test(b.textContent));
    if (start) { start.click(); await sleep(100); }
    const t = target();
    if (!t) return null;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    t.focus?.();
    await sleep(50);
    return t;
  };
  // a key listener counts while its target can still receive events: window, document, or a connected node
  const liveKeys = () => [...S.keys].filter(k => {
    const t = k.target.deref();
    return t && mine(k.fn) && (t === window || t === document || (t instanceof Node && t.isConnected));
  }).length;
  const rate = async ms => {
    const snap = () => { let n = 0; for (const [fn, c] of S.ticks) if (mine(fn)) n += c; return n; };
    const n0 = snap(); await sleep(ms);
    return (snap() - n0) * 1000 / ms;
  };
  const restartBtn = () => all("button").find(b => /restart|reset|new game|play again|again|↻|🔄/i.test(b.textContent)) ||
    all("input[type=button],input[type=submit]").find(b => /restart|reset|new game|again/i.test(b.value));
  try {
    await sleep(800);
    // 1. it renders a board and a score
    const s0 = score();
    // the score may be drawn on the canvas, where it cannot be read: then it is not checked
    out.renders = !!target();
    if (!out.renders) { out.why.push("no game element and score (vars " + JSON.stringify(users().map(v => v._name + ":" + (v._value instanceof Element ? v._value.tagName + (v._value.isConnected ? "" : "(detached)") : typeof v._value))).slice(0, 300) + ", text " + JSON.stringify(text().slice(0, 160)) + ")"); return out; }
    // 2. arrow keys reach the focused game and are claimed (preventDefault), so they do not scroll the page
    await engage();
    out.arrowsClaimed = ["ArrowUp", "ArrowRight", "ArrowDown"].map(k => press(k)).some(Boolean);
    if (!out.arrowsClaimed) out.why.push("arrow keydown on the focused game was not preventDefault()ed: the page scrolls while playing");
    // 3. arrow keys typed elsewhere (chat, editor) are left alone
    const ta = document.createElement("textarea");
    document.body.appendChild(ta); ta.focus();
    const stolen = ["ArrowLeft", "ArrowRight", "ArrowUp"].map(k => press(k, ta)).some(Boolean);
    ta.remove();
    out.othersFree = !stolen;
    if (stolen) out.why.push("arrow keys typed into a textarea outside the game were preventDefault()ed");
    // 4. restart keeps the page (no reload) and resets the score
    const btn = restartBtn();
    if (!btn) { out.why.push("no Restart button (buttons: " + JSON.stringify(all("button").map(b => b.textContent.trim().slice(0, 30))) + ")"); return out; }
    const board = () => text() + all("canvas").map(c => { try { return c.toDataURL(); } catch { return ""; } }).join() + all("svg").map(x => x.innerHTML).join();
    const b0 = board();
    globalThis.__rc5tAlive = 1;
    btn.click();
    await sleep(600);
    out.restartSurvives = globalThis.__rc5tAlive === 1 && users().length > 0;
    out.restartResets = (s0 == null || score() === 0) && board() !== b0;
    if (!out.restartResets) out.why.push("after Restart: score " + score() + ", board " + (board() === b0 ? "unchanged" : "changed"));
    // 5. no leak: redefining the cells (as every edit does) and restarting must not add key listeners or speed the loop up
    const t0 = target(), gameMods = new Set(users().filter(v => v._value instanceof Element && t0 && v._value.contains(t0)).map(v => v._module));
    const redefine = () => { for (const v of users().filter(v => gameMods.has(v._module))) { try { v.define(v._name, v._inputs.map(i => i._name), v._definition); } catch {} } };
    redefine(); await sleep(600);
    await engage(); press("ArrowDown");
    const k1 = liveKeys(), r1 = await rate(1200);
    for (let i = 0; i < 2; i++) { restartBtn()?.click(); await sleep(150); redefine(); await sleep(300); }
    await engage(); press("ArrowDown");
    const k2 = liveKeys(), r2 = await rate(1200);
    out.noLeak = k2 <= k1 && r2 <= r1 * 1.5 + 3;
    out.why.push("key listeners " + k1 + " -> " + k2 + ", ticks/s " + r1.toFixed(1) + " -> " + r2.toFixed(1));
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Keyboard idiom from @tomlarkworthy/daw.keys (lopebooks/notebooks/tomlarkworthy_daw.html): a div with
// tabIndex = 0, keydown on that element, preventDefault only for the keys it handles.
// Restart idiom from @tomlarkworthy/liquid-timer (lopebooks/notebooks/@tomlarkworthy_liquid-timer.html):
// `viewof reset = Inputs.button("restart")`, the simulation cell depends on `reset`, and the loop cell
// cancels its frame on invalidation.
const SOLUTION = `const _intro = function intro(md){return( md\`# Snake

Click the board, then steer with the arrow keys.\` )};
const _viewof_restart = function viewof_restart(Inputs){return( Inputs.button("Restart") )};
const _restart = (G, _) => G.input(_);
const _game = function game(restart, invalidation){
  const N = 20, C = 16;
  const el = document.createElement("div");
  el.tabIndex = 0;
  el.style.cssText = "display:inline-block;outline:none;font:14px sans-serif";
  const scoreEl = document.createElement("div");
  const status = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = N * C;
  canvas.style.border = "1px solid #888";
  el.append(scoreEl, canvas, status);
  const ctx = canvas.getContext("2d");
  let snake = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}], dir = {x: 1, y: 0}, next = dir, score = 0, alive = true, started = false;
  const place = () => { let f; do f = {x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N)}; while (snake.some(s => s.x === f.x && s.y === f.y)); return f; };
  let food = place();
  const draw = () => {
    ctx.fillStyle = "#111"; ctx.fillRect(0, 0, N * C, N * C);
    ctx.fillStyle = "#e33"; ctx.fillRect(food.x * C, food.y * C, C - 1, C - 1);
    ctx.fillStyle = alive ? "#4c4" : "#777";
    for (const s of snake) ctx.fillRect(s.x * C, s.y * C, C - 1, C - 1);
    scoreEl.textContent = "Score: " + score;
    status.textContent = !alive ? "Game over. Press Restart." : started ? "" : "Click the board, then press an arrow key.";
  };
  const tick = () => {
    if (!alive || !started) return;
    dir = next;
    const h = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(s => s.x === h.x && s.y === h.y)) { alive = false; draw(); return; }
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) { score++; food = place(); } else snake.pop();
    draw();
  };
  const DIRS = {ArrowUp: {x: 0, y: -1}, ArrowDown: {x: 0, y: 1}, ArrowLeft: {x: -1, y: 0}, ArrowRight: {x: 1, y: 0}};
  el.addEventListener("keydown", e => {
    const d = DIRS[e.key];
    if (!d) return;
    e.preventDefault();
    if (d.x === -dir.x && d.y === -dir.y) return;
    next = d;
    started = true;
  });
  canvas.addEventListener("pointerdown", () => el.focus());
  const id = setInterval(tick, 120);
  invalidation.then(() => clearInterval(id));
  draw();
  return el;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_restart", "viewof restart", ["Inputs"], _viewof_restart);
  $def("_restart", "restart", ["Generators", "viewof restart"], _restart);
  $def("_game", "game", ["restart", "invalidation"], _game);
  return main;
}
`;

export default {
  id: "rc5t-snake-keyboard",
  category: "rc5-train",
  question: "Make a playable snake game controlled with the arrow keys, with a score and a restart button.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "renders", equals: true }, weight: 1 },
    // arrow keys on the focused game are claimed, so the page does not scroll
    { name: "collected_equals", args: { key: "arrowsClaimed", equals: true }, weight: 1 },
    // arrow keys typed into the chat or an editor are not swallowed
    { name: "collected_equals", args: { key: "othersFree", equals: true }, weight: 1 },
    // THE defect: Restart must not reload the notebook (that discards the unsaved module)
    { name: "collected_equals", args: { key: "restartSurvives", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "restartResets", equals: true }, weight: 1 },
    // restarting / redefining must not add key listeners or speed the loop up
    { name: "collected_equals", args: { key: "noLeak", equals: true }, weight: 2 },
    // the page was read (the write-triggers on location.reload / global key listeners enforce it)
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keyboard-input-and-loops-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/snake.js", content: SOLUTION }, settleMs: 1500 },
  ],
};

