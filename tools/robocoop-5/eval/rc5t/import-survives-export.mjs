// rc5-train eval (20260928-0130-w12): an import of a published notebook must survive saving.
// In run 20260928-0130-w12-before the agent wrote a correct module importing Legend from
// @d3/color-legend; every cell computed. The export held the imported notebook as
// id="<unknown 0.50…>" and the importer's loader became import("/<unknown 0.50…>.js?v=4"). The first
// reopen still booted; the second save dropped the block and Legend was "not defined". Cause: file-sync
// jbApply rebuilds the loader as `async () => runtime.module((await import(path)).default)`, and
// findModuleName names a module from a string literal in its loader's source.
//
// setup.collect exports the live page (exportToHTML, as save does) and reads it back: key `export`
// catches the defect; key `legend` checks the task (a legend whose colours cover every bar fill).
// api.observablehq.com/@d3/color-legend.js is routed to a fixture fetched 2026-09-28.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(here, "fixtures/d3-color-legend.js"), "utf8");
const TRACE_MODULE = readFileSync(join(here, "fixtures/import-survives-export.trace-module.js"), "utf8");

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { export: "not run", legend: "not run" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mains = globalThis.__ojs_runtime.mains;
  const fresh = new Set([...rt._variables].map(v => v._module).filter(m => !globalThis.__rc5tBefore.has(m)));
  const userMods = [...mains.entries()].filter(([, m]) => fresh.has(m));
  if (!userMods.length) return { export: "no module was created", legend: "no module was created" };
  const userVars = [...rt._variables].filter(v => userMods.some(([, m]) => m === v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    await sleep(1500);
    // --- export: the imported notebook is embedded under its own id and nothing is <unknown …>
    try {
      const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
      const r = await f({ mains });
      const html = typeof r === "string" ? r : r.source;
      const ids = [...html.matchAll(/<script[^>]*\bid="([^"]*)"/g)].map(x => x[1]);
      const unknown = ids.filter(i => /<unknown/.test(i));
      if (unknown.length) out.export = "export names a module " + JSON.stringify(unknown);
      else if (!ids.includes("@d3/color-legend")) out.export = "no @d3/color-legend block in the export";
      else out.export = "ok";
    } catch (e) { out.export = "export threw: " + (e?.message ?? e); }
    // --- legend: an element with >= 10 filled bars, and a legend whose colours cover every bar fill
    const els = userVars.map(v => v._value).filter(x => x instanceof Element);
    const rgb = s => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = "#000"; c.fillStyle = s; c.fillRect(0, 0, 1, 1); return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const svgs = [...new Set(els.flatMap(e => [...(e.matches("svg") ? [e] : []), ...e.querySelectorAll("svg")]))];
    const barsOf = s => [...s.querySelectorAll("rect")].filter(r => { const f = r.getAttribute("fill") || r.style.fill; return f && f !== "none" && !/^url/.test(f); });
    const chart = svgs.map(s => [s, barsOf(s)]).filter(([, b]) => b.length >= 10).sort((a, b) => a[1].length - b[1].length)[0];
    if (!chart) out.legend = "no svg with >= 10 filled bars";
    else {
      const fills = chart[1].map(r => rgb(r.getAttribute("fill") || r.style.fill));
      const palette = [];
      for (const s of svgs) {
        if (s === chart[0]) continue;
        for (const im of s.querySelectorAll("image")) {
          const href = im.getAttribute("href") || im.getAttribute("xlink:href");
          if (!href) continue;
          const img = new Image(); img.src = href; await img.decode().catch(() => {});
          const c = document.createElement("canvas"); c.width = img.width || 1; c.height = img.height || 1;
          const g = c.getContext("2d"); g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, c.width, 1).data;
          for (let i = 0; i < d.length; i += 4) palette.push([d[i], d[i + 1], d[i + 2]]);
        }
        for (const r of barsOf(s)) palette.push(rgb(r.getAttribute("fill") || r.style.fill));
      }
      if (!palette.length) out.legend = "no legend (no other svg with a colour ramp or swatches)";
      else if (new Set(fills.map(String)).size < 2) out.legend = "bars are all one colour";
      else {
        const dist = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
        const miss = fills.filter(f => Math.min(...palette.map(p => dist(f, p))) > 12);
        out.legend = miss.length ? miss.length + " of " + fills.length + " bar colours are not in the legend, e.g. rgb(" + miss[0] + ")" : "ok";
      }
    }
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-import-survives-export",
  category: "rc5-train",
  question: "Import the Legend function from the @d3/color-legend notebook on Observable and use it to add a colour legend above a bar chart of 10 random values coloured by value.",
  setup: {
    init: INIT,
    collect: COLLECT,
    routes: [{ url: "**/api.observablehq.com/@d3/color-legend.js*", contentType: "text/javascript", body: FIXTURE }],
  },
  criteria: [
    // the defect: the saved file must carry the imported notebook under its own id
    { name: "collected_equals", args: { key: "export", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "legend", equals: "ok" }, weight: 1 },
  ],
  // the module the agent wrote in 20260928-0130-w12-before; correct, so it scores 1.00 once the harness is fixed
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/color-bar-chart.js", content: TRACE_MODULE } },
  ],
};
