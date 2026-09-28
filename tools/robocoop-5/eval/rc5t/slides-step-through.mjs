// rc5-train eval (20260928-0847-w5): a presentation the reader steps through, one slide at a time.
// In run 20260928-0847-w5-before the agent never read important-modules.md (which names
// @tomlarkworthy/slides) and hand-built a deck: four slide cells, a range input, and a `slides` card
// that shows `[slide1, …, slide4][slideIndex - 1]`. Each slide cell also renders in its own place, so
// at boot all four slides are on screen at once; moving the slider moves one slide's node into the
// card and drops the previous one. Every cell "computes with no runtime error".
//
// The check is behavioural and does not care how the deck is built (the slides module, a hand-built
// deck with buttons, keyboard or a slider): setup.collect keeps every cell of a module created
// during the turn reachable, reads the visible text of its rendered cells, steps forward with the
// first control it finds (a Next button, else ArrowRight on the deck, else a range/number input),
// and requires 4 steps each showing text seen at no other step: one slide visible at a time.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) return "no module was created";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(4000);
    const els = () => userVars.map(v => v._value).filter(x => x instanceof Element && x.isConnected);
    const snapshot = () => new Set(els().flatMap(e => (e.innerText || "").split("\n"))
      .map(s => s.trim()).filter(s => s.length > 3 && !/^\d+\s*\/\s*\d+$/.test(s)));
    const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);
    const label = b => (b.getAttribute("aria-label") || "") + " " + (b.textContent || "") + " " + (b.className?.baseVal ?? b.className ?? "");
    const next = () => all("button, [role=button], a").find(b => !b.disabled && /next|forward|navigate-right|→|›|»|▶|▸|>/i.test(label(b)) && !/prev|back|left|←|‹|«/i.test(label(b)));
    let how = null;
    const step = async () => {
      const b = next();
      if (b) { how = "button"; b.click(); await sleep(900); return true; }
      const deck = all(".reveal")[0] || null;
      const range = all("input[type=range], input[type=number]")[0];
      if (!range || deck) {
        how = "ArrowRight";
        document.activeElement?.blur?.();
        for (const t of [deck, ...els(), document.body, document].filter(Boolean))
          t.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowRight", code: "ArrowRight", keyCode: 39, bubbles: true}));
        await sleep(900); return true;
      }
      how = "range";
      range.value = String(+range.value + (+range.step || 1));
      range.dispatchEvent(new Event("input", {bubbles: true}));
      await sleep(900); return true;
    };
    const shots = [snapshot()];
    for (let i = 0; i < 5; i++) { await step(); shots.push(snapshot()); }
    const views = [...new Map(shots.map(s => [[...s].sort().join("\\n"), s])).values()];
    const uniq = views.map((s, k) => [...s].filter(line => views.every((o, j) => j === k || !o.has(line))));
    const distinct = uniq.filter(u => u.length).length;
    if (distinct < 4) return "stepping forward 5 times (" + how + ") gave " + views.length + " distinct views, " + distinct + " with text seen in no other view; want 4 (one slide at a time). unique per view: " +
      JSON.stringify(uniq.map(u => u.slice(0, 2).map(s => s.slice(0, 30))));
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Import lines copied from important-modules.md "slides" and "How the imports work".
export const ID = "@user/water-cycle-deck";
export const SOLUTION = `const _s1 = function evaporation(md){return( md\`## 1. Evaporation

The sun heats oceans, lakes and rivers, and water rises as vapour.\` )};
const _s2 = function condensation(md){return( md\`## 2. Condensation

The vapour cools as it rises and condenses into clouds.\` )};
const _s3 = function precipitation(md){return( md\`## 3. Precipitation

Cloud droplets grow heavy and fall as rain, snow, sleet or hail.\` )};
const _s4 = function collection(md){return( md\`## 4. Collection

Water gathers in rivers, lakes, oceans and groundwater, and the cycle starts again.\` )};
const _deck = function deck(slideshow, runtime, invalidation, myModule){return(
slideshow(runtime, {
  invalidation, module: myModule,
  slides: [{cell: "evaporation", layout: "central"}, {cell: "condensation", layout: "central"}, {cell: "precipitation", layout: "central"}, {cell: "collection", layout: "central"}]
})
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_s1", "evaporation", ["md"], _s1);
  $def("_s2", "condensation", ["md"], _s2);
  $def("_s3", "precipitation", ["md"], _s3);
  $def("_s4", "collection", ["md"], _s4);
  $def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
  $def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
  $def("_deck", "deck", ["slideshow", "runtime", "invalidation", "myModule"], _deck);
  main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
  main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
`;

export default {
  id: "rc5t-slides-step-through",
  category: "rc5-train",
  question: "Make a 4-slide presentation about the water cycle that I can step through.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // the defect: every slide cell rendered in its own place, so stepping does not show one slide at a time
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/" + ID + ".js", content: SOLUTION }, settleMs: 8000 },
  ],
};
