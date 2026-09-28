// rc5-train eval (20260928-0510-w25): temperature converter, two linked boxes.
// In the w25 eval-base run the agent wrote two Inputs.number views and guarded each input listener with
// `document.activeElement === viewof_celsius`, reading `viewof_celsius.valueAsNumber`. The view is a
// <form>; focus is on the <input> inside it, so the guard was always false and neither box ever updated.
// Every cell "computed with no runtime error" and the agent reported the converter working.
// Behavioural, so any correct build passes whatever the module id, cell names or input kind (text,
// number, Inputs.text/number, raw <input>). setup.collect keeps every cell of a module created during
// the turn reachable, finds the Celsius and Fahrenheit boxes by label, types into one (set value +
// dispatch "input"), and reads the other box's value. Boxes are re-found after every step, so a build
// that re-renders a box still passes the value checks; the typed-into box itself must stay attached and
// keep the typed text (a box rebuilt on each keystroke loses the user's cursor and input).
//   c->f   : C=100 gives F=212, C=-40 gives F=-40
//   f->c   : F=32 gives C=0, F=212 gives C=100
//   again  : C=37 after typing in F still updates F (98.6), i.e. the link works both ways repeatedly
//   stable : the box typed into is still connected and still holds what was typed

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
    await sleep(800);
    const boxes = () => {
      const out = [];
      for (const v of userVars) {
        const x = v._value;
        if (!(x instanceof Element)) continue;
        const all = x.matches("input") ? [x] : [...x.querySelectorAll("input")];
        for (const i of all) {
          if (!/^(text|number|search|)$/.test(i.type || "")) continue;
          if (out.some(o => o.el === i)) continue;
          const host = i.closest("form, label, div") || i.parentElement;
          const lab = (((i.labels && [...i.labels].map(l => l.textContent).join(" ")) || "") + " " +
            (i.getAttribute("aria-label") || "") + " " + (i.placeholder || "") + " " + (i.name || "") + " " + (i.id || "") + " " +
            (host ? host.textContent : "") + " " + v._name).toLowerCase();
          out.push({ el: i, lab });
        }
      }
      return out;
    };
    const find = () => {
      const bs = boxes();
      const c = bs.find(b => /celsius|°\s*c\b|\bc\b|centigrade/.test(b.lab) && !/fahrenheit|°\s*f\b/.test(b.lab));
      const f = bs.find(b => b !== c && /fahrenheit|°\s*f\b|\bf\b/.test(b.lab) && !/celsius|°\s*c\b/.test(b.lab));
      return { c: c && c.el, f: f && f.el, bs };
    };
    const num = el => parseFloat(String(el.value).replace(",", "."));
    const type = async (el, text) => {
      el.focus?.();
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(600);
    };
    let { c, f, bs } = find();
    if (!c || !f) return "could not find a Celsius and a Fahrenheit box among " + bs.length + " inputs: " + JSON.stringify(bs.map(b => b.lab.slice(0, 60)));
    const steps = [["c", "100", 212], ["f", "32", 0], ["c", "-40", -40], ["f", "212", 100], ["c", "37", 98.6]];
    for (const [which, text, want] of steps) {
      ({ c, f } = find());
      if (!c || !f) return "a box disappeared before typing " + which + "=" + text;
      const src = which === "c" ? c : f;
      await type(src, text);
      if (!src.isConnected) return "the " + which.toUpperCase() + " box typed into was replaced after typing " + text + " (the box is rebuilt on each input)";
      if (src.value !== text) return "the " + which.toUpperCase() + " box typed into no longer holds " + JSON.stringify(text) + ": " + JSON.stringify(src.value);
      ({ c, f } = find());
      if (!c || !f) return "a box disappeared after typing " + which + "=" + text;
      const dst = which === "c" ? f : c;
      const got = num(dst);
      if (!(Math.abs(got - want) <= 0.15)) return "typing " + which.toUpperCase() + "=" + text + " left the other box at " + JSON.stringify(dst.value) + ", wanted " + want;
    }
    return "ok";
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Two Inputs.number boxes, each a viewof; one cell listens for "input" on each view and writes the
// converted value to the other view's .value (no dispatch, so no echo). The form documented in
// knowledge/event-handlers-in-cells.md "two inputs that update each other". The corpus has no cell that
// links two views through a conversion; the equal-value form is Inputs.bind, e.g. @tomlarkworthy/atlas._5
// (lopecode/notebooks/@tomlarkworthy_atlas.html).
const SOLUTION = `const _intro = function intro(md){return( md\`# Temperature converter\` )};
const _celsius = function celsius(Inputs){return( Inputs.number({label: "Celsius (°C)", value: 0}) )};
const _celsius_v = (G, _) => G.input(_);
const _fahrenheit = function fahrenheit(Inputs){return( Inputs.number({label: "Fahrenheit (°F)", value: 32}) )};
const _fahrenheit_v = (G, _) => G.input(_);
const _link = function link($c, $f, invalidation){
  const onC = () => { if (Number.isFinite($c.value)) $f.value = Math.round(($c.value * 9 / 5 + 32) * 100) / 100; };
  const onF = () => { if (Number.isFinite($f.value)) $c.value = Math.round(($f.value - 32) * 5 / 9 * 100) / 100; };
  $c.addEventListener("input", onC);
  $f.addEventListener("input", onF);
  invalidation.then(() => { $c.removeEventListener("input", onC); $f.removeEventListener("input", onF); });
  return "linked";
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_celsius", "viewof celsius", ["Inputs"], _celsius);
  main.variable(observer("celsius")).define("celsius", ["Generators", "viewof celsius"], _celsius_v);
  $def("_fahrenheit", "viewof fahrenheit", ["Inputs"], _fahrenheit);
  main.variable(observer("fahrenheit")).define("fahrenheit", ["Generators", "viewof fahrenheit"], _fahrenheit_v);
  $def("_link", "link", ["viewof celsius", "viewof fahrenheit", "invalidation"], _link);
  return main;
}
`;

export default {
  id: "rc5t-temperature-two-way",
  category: "rc5-train",
  question: "Make a temperature converter with a Celsius box and a Fahrenheit box. Typing in either one updates the other.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/temperature-converter.js", content: SOLUTION } },
  ],
};
