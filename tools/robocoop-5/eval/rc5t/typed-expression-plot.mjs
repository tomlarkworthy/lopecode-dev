// rc5-train eval (20260928-0315-w20): a plot of a typed expression that breaks on what the user types.
// In run 20260928-0315-w20-before the agent compiled the text with
// `Function("x", ...Object.getOwnPropertyNames(Math), `"use strict"; return (${fn})`)` inside the data
// cell, with no try/catch, and filtered non-finite y out of the data. Every write reported "all 6 cells
// compute with no runtime error" because only the default `sin(x) * x` was ever evaluated:
//   - `x^2` is JS XOR, so it silently plotted 3^2 === 1 instead of a parabola;
//   - a half-typed `sin(` (every keystroke is a value of Generators.input) threw a SyntaxError out of
//     the data cell and the plot cell, so the chart was replaced by an error.
//
// The check is behavioural, so any correct build passes (new Function + with(Math), mathjs, a
// hand-written parser; Plot or d3; a live or a submit-button text box). setup.collect keeps every cell
// of a module created during the turn reachable, types into the first text input it finds, and reads
// the plotted points: from a data array ({x, y} objects or [x, y] pairs) if one exists, else by
// inverting a Plot figure's path through its x/y scales.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = () => [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars().length) return { plot: "no module was created", caret: "no module", invalid: "no module" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const els = () => userVars().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);
  const text = () => els().map(e => e.textContent).join(" | ");
  const errored = async () => {
    const bad = [];
    for (const v of userVars()) {
      const e = await Promise.race([Promise.resolve(v._promise).then(() => null, e => e), sleep(400).then(() => null)]);
      if (e) bad.push(v._name + ": " + String(e && e.message || e).slice(0, 80));
    }
    return bad;
  };
  const num = x => typeof x === "number" ? x : (x != null && x !== "" && !isNaN(+x) ? +x : NaN);
  const fromArrays = () => {
    const cands = userVars().map(v => v._value).filter(a => Array.isArray(a) && a.length >= 20).map(a => {
      const pts = a.map(d => Array.isArray(d) ? [num(d[0]), num(d[1])] : d && typeof d === "object" ? [num(d.x), num(d.y)] : null)
        .filter(p => p && Number.isFinite(p[0]));
      return pts.length >= a.length * 0.9 ? pts : null;
    }).filter(Boolean);
    return cands.sort((a, b) => b.length - a.length)[0] || null;
  };
  const fromPlot = () => {
    for (const s of all("svg")) {
      const fig = typeof s.scale === "function" ? s : s.closest && s.closest("figure");
      const host = typeof s.scale === "function" ? s : (fig && typeof fig.scale === "function" ? fig : null);
      if (!host) continue;
      let sx, sy; try { sx = host.scale("x"); sy = host.scale("y"); } catch { continue; }
      if (!sx || !sy || typeof sx.invert !== "function" || typeof sy.invert !== "function") continue;
      const pts = [];
      const lines = s.querySelectorAll('[aria-label="line"] path');
      for (const p of lines.length ? lines : s.querySelectorAll("path")) {
        const d = p.getAttribute("d") || "";
        if (!/^M[^A-Za-z]*L/.test(d)) continue;
        for (const m of d.matchAll(/[ML]\s*(-?[\d.]+(?:e-?\d+)?)[ ,](-?[\d.]+(?:e-?\d+)?)/g)) pts.push([sx.invert(+m[1]), sy.invert(+m[2])]);
      }
      if (pts.length >= 20) return pts;
    }
    return null;
  };
  const points = () => fromArrays() || fromPlot();
  const yAt = (pts, x0) => {
    let best = null;
    for (const p of pts) if (Math.abs(p[0] - x0) <= 0.1 && (!best || Math.abs(p[0] - x0) < Math.abs(best[0] - x0))) best = p;
    return best ? best[1] : undefined;
  };
  const input = () => all("input, textarea").find(i => !i.type || /^(text|search)$/i.test(i.type) || i.matches("textarea"));
  const type = async s => {
    const i = input();
    if (!i) return false;
    i.value = s;
    i.dispatchEvent(new Event("input", { bubbles: true }));
    i.dispatchEvent(new Event("change", { bubbles: true }));
    const form = i.closest("form");
    const btn = form && form.querySelector("button[type=submit], button:not([type])");
    if (btn) btn.click();
    await sleep(1500);
    return true;
  };
  const out = {};
  try {
    await sleep(800);
    if (!input()) return { plot: "no text input found", caret: "no text input", invalid: "no text input" };
    const near = (a, b, t) => typeof a === "number" && Math.abs(a - b) <= t;
    // 1. sin(x)*x over [-10, 10]
    await type("sin(x)*x");
    let pts = points();
    let bad = await errored();
    if (bad.length) out.plot = "cells error on sin(x)*x: " + bad.join("; ");
    else if (!pts) out.plot = "no plotted points found (no {x,y} array, no invertible Plot path)";
    else {
      const xs = pts.map(p => p[0]).filter(Number.isFinite);
      const lo = Math.min(...xs), hi = Math.max(...xs), y2 = yAt(pts, 2), y7 = yAt(pts, -7);
      if (lo > -9.5 || hi < 9.5) out.plot = "x range " + lo.toFixed(2) + ".." + hi.toFixed(2) + ", wanted -10..10";
      else if (pts.length < 100) out.plot = "only " + pts.length + " points";
      else if (!near(y2, 2 * Math.sin(2), 0.1) || !near(y7, -7 * Math.sin(-7), 0.15)) out.plot = "sin(x)*x wrong: y(2)=" + y2 + " y(-7)=" + y7;
      else out.plot = "ok";
    }
    // 2. x^2: a parabola, or an explained refusal; never the silent XOR (3^2 === 1)
    await type("x^2");
    pts = points(); bad = await errored();
    const y3 = pts ? yAt(pts, 3) : undefined;
    if (near(y3, 9, 0.2) && near(yAt(pts, -2), 4, 0.2)) out.caret = "ok";
    else if (near(y3, 1, 0.01)) out.caret = "x^2 plotted as XOR: y(3)=" + y3;
    else if (!bad.length && /\^|\*\*|pow|power|error|invalid|not supported/i.test(text())) out.caret = "ok";
    else out.caret = "x^2 neither a parabola nor explained: y(3)=" + y3 + (bad.length ? "; errors " + bad.join("; ") : "");
    // 3. a half-typed expression: a message, no erroring cell; then recovery
    await type("sin(");
    bad = await errored();
    const msg = /error|invalid|unexpected|syntax|missing|expected|can.?t|cannot|could not|parse/i.test(text());
    if (bad.length) out.invalid = "cells error on 'sin(': " + bad.join("; ");
    else if (!msg) out.invalid = "no error message shown for 'sin(': " + text().slice(0, 200);
    else {
      await type("sin(x)*x");
      pts = points(); bad = await errored();
      out.invalid = !bad.length && pts && near(yAt(pts, 2), 2 * Math.sin(2), 0.1) ? "ok" : "did not recover after 'sin(': " + (bad.join("; ") || "y(2)=" + (pts && yAt(pts, 2)));
    }
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// The error-tolerant compile follows @observablehq/plot-exploration-penguins.renderSnippet
// (embedded in lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html): new Function over the typed text,
// inside try/catch, so a bad string never throws out of the cell.
const SOLUTION = `const _title = function title(md){return( md\`# Plot f(x)\` )};
const _viewof_expr = function viewof_expr(Inputs){return( Inputs.text({label: "f(x) =", value: "sin(x)*x", width: 320}) )};
const _expr = function expr(Generators, viewof_expr){return( Generators.input(viewof_expr) )};
const _f = function f(expr){
  const src = String(expr).replace(/\\^/g, "**");
  try {
    const g = new Function("x", "with (Math) { return (" + src + "); }");
    g(0.5);
    return {fn: g};
  } catch (e) {
    return {error: e.message};
  }
};
const _data = function data(f){
  if (f.error) return [];
  return Array.from({length: 2001}, (_, i) => {
    const x = -10 + i / 100;
    let y;
    try { y = +f.fn(x); } catch (e) { y = NaN; }
    return {x, y: Number.isFinite(y) ? y : NaN};
  });
};
const _plot = function plot(f, data, Plot, htl){
  if (f.error) return htl.html\`<div style="color:#b00020">Can't plot: \${f.error}</div>\`;
  return Plot.plot({x: {domain: [-10, 10]}, marks: [Plot.ruleY([0]), Plot.line(data, {x: "x", y: "y"})]});
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_viewof_expr", "viewof expr", ["Inputs"], _viewof_expr);
  $def("_expr", "expr", ["Generators", "viewof expr"], _expr);
  $def("_f", "f", ["expr"], _f);
  $def("_data", "data", ["f"], _data);
  $def("_plot", "plot", ["f", "data", "Plot", "htl"], _plot);
  return main;
}
`;

export default {
  id: "rc5t-typed-expression-plot",
  category: "rc5-train",
  question: "Let me type a math function of x, like sin(x)*x, and plot it from -10 to 10.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "plot", equals: "ok" }, weight: 1 },
    // the defects: x^2 silently XOR, and a half-typed expression erroring the cells
    { name: "collected_equals", args: { key: "caret", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "invalid", equals: "ok" }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/evaluating-user-typed-expressions.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/plot-fx.js", content: SOLUTION } },
  ],
};
