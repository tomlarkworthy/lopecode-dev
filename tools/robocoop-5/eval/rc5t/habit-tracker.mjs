// rc5t-habit-tracker (run 20260928-0240-w36): habits added by the user, a 14-day grid toggled by clicking,
// a current streak per habit, a Download CSV button, and the data kept in the saved file.
// In the baseline run the agent read keeping-user-state-in-the-saved-notebook.md at 11 s, then spent
// 49-408 s grepping /src, /notebook and /content for sticky (not there until a module imports it), and at
// 627 s wrote the state to localStorage ("shouldn't introduce unnecessary complexity with imports"). The same
// module keyed days with `new Date(today + 'T00:00:00').toISOString().slice(0,10)`, which in a UTC+ zone
// names every day one day early, so the grid never shows today.
// setup.collect (habit-tracker.collect.js) acts as the user; each part is its own key (see that file).
// The clock is pinned to Mon 2026-09-28 00:20 Europe/Berlin (Sun 22:20 UTC): any UTC-derived date is a day off.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const NOW_UTC = Date.UTC(2026, 8, 27, 22, 20);

// Same clock pin as rc5t/forecast-window.mjs, without its fetch emulator.
const INIT = `(() => {
  if (globalThis.__clockPinned) return; globalThis.__clockPinned = true;
  const NOW_UTC = ${NOW_UTC};
  const RealDate = Date, realNow = RealDate.now.bind(RealDate), off = NOW_UTC - realNow();
  function FakeDate(...a) {
    if (!new.target) return new RealDate(realNow() + off).toString();
    return a.length ? new RealDate(...a) : new RealDate(realNow() + off);
  }
  FakeDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(FakeDate, RealDate);
  FakeDate.now = () => realNow() + off;
  FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  globalThis.Date = FakeDate;
})();`;

// State via sticky and the view contract, copied from rc5t-kanban-drag-persist's oracle and
// @tomlarkworthy/codestrates.codestratePlace (lopebooks tomlarkworthy_codestrates.html): the setter re-renders,
// every edit dispatches `input`. Local calendar date as in @tomlarkworthy/robocoop-5-core (environment stamp:
// getFullYear() + pad(getMonth() + 1) + pad(getDate())). The file is handed over with a Blob URL and an
// anchor click, as @tomlarkworthy/exporter-3 does (`dl.href = blobUrl; dl.download = filename; dl.click()`).
export const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Habit tracker

Click a day to mark a habit done. Habits and marks are kept in this cell's source by \\\`sticky\\\`, so saving the notebook saves them.\` )};

const _dayKey = function dayKey(){return(
function dayKey(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
)};

const _lastDays = function lastDays(dayKey){return(
function lastDays(n) {
  const now = new Date();
  return Array.from({length: n}, (_, i) => dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1 - i))));
}
)};

const _streak = function streak(dayKey){return(
function streak(done) {
  const now = new Date();
  let s = 0;
  while (done[dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - s))]) s++;
  return s;
}
)};

const _habitTracker = function habitTracker(htl, lastDays, streak){return(
function habitTracker() {
  let state = {habits: []};
  const input = htl.html\`<input type=text placeholder="New habit">\`;
  const add = htl.html\`<button>Add habit</button>\`;
  const dl = htl.html\`<button>Download CSV</button>\`;
  const grid = htl.html\`<div>\`;
  const el = htl.html\`<div>\${input}\${add} \${dl}\${grid}</div>\`;
  const commit = () => { render(); el.dispatchEvent(new Event("input", {bubbles: true})); };
  function render() {
    const days = lastDays(14);
    grid.replaceChildren(htl.html\`<table style="border-collapse:collapse">
      <thead><tr><th>Habit</th>\${days.map(d => htl.html\`<th style="font-size:11px">\${d.slice(5)}</th>\`)}<th>Streak</th></tr></thead>
      <tbody>\${state.habits.map((h, i) => htl.html\`<tr><td>\${h.name}</td>\${days.map(d => {
        const td = htl.html\`<td style="border:1px solid #ccc;width:22px;text-align:center;cursor:pointer">\${h.done[d] ? "✓" : ""}</td>\`;
        td.onclick = () => {
          const done = {...h.done};
          if (done[d]) delete done[d]; else done[d] = true;
          state = {habits: state.habits.map((x, j) => j === i ? {...x, done} : x)};
          commit();
        };
        return td;
      })}<td>\${streak(h.done)}</td></tr>\`)}</tbody>
    </table>\`);
  }
  add.onclick = () => {
    const name = input.value.trim();
    if (!name) return;
    state = {habits: [...state.habits, {name, done: {}}]};
    input.value = "";
    commit();
  };
  input.onkeydown = (e) => { if (e.key === "Enter") add.click(); };
  dl.onclick = () => {
    const days = lastDays(14);
    const q = (s) => /[",\\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    const csv = [["habit", ...days].join(","), ...state.habits.map(h => [q(h.name), ...days.map(d => h.done[d] ? 1 : 0)].join(","))].join("\\n");
    const blobUrl = URL.createObjectURL(new Blob([csv], {type: "text/csv"}));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "habits.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };
  Object.defineProperty(el, "value", {
    get: () => state,
    set: (v) => { state = v && Array.isArray(v.habits) ? v : {habits: []}; render(); }
  });
  render();
  return el;
}
)};

const _viewof_tracker = function viewof_tracker(sticky, habitTracker){return( sticky(habitTracker(), {habits: []}) )};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_dayKey", "dayKey", [], _dayKey);
  $def("_lastDays", "lastDays", ["dayKey"], _lastDays);
  $def("_streak", "streak", ["dayKey"], _streak);
  $def("_habitTracker", "habitTracker", ["htl", "lastDays", "streak"], _habitTracker);
  $def("_viewof_tracker", "viewof tracker", ["sticky", "habitTracker"], _viewof_tracker);
  $def("_tracker", "tracker", ["Generators", "viewof tracker"], (G, v) => G.input(v));
  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
`;

export default {
  id: "rc5t-habit-tracker",
  category: "rc5-train",
  question: "I want a little habit tracker: a list of habits I can add, a grid of the last 14 days where I click a cell to mark a habit done that day, a current-streak number per habit, and a Download CSV button that exports the grid. Keep my data when I save the notebook.",
  setup: {
    initScript: INIT,
    timezoneId: "Europe/Berlin",
    init: `globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys()); globalThis.__habitInit = ${JSON.stringify(INIT)};`,
    collect: readFileSync(resolve(here, "habit-tracker.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "added", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "downloaded", equals: true }, weight: 1 },
    // the user's last 14 local days; a toISOString() key is a day early at 00:20 Berlin
    { name: "collected_equals", args: { key: "window", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "toggled", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "streak", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "marksKept", equals: true }, weight: 1 },
    // THE defect of run 20260928-0240-w36-before: state in localStorage is not in the saved file
    { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 3 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/keeping-user-state-in-the-saved-notebook.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/habit-tracker.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
