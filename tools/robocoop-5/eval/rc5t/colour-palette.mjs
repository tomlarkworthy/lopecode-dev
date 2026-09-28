// rc5-train eval (20260928-0450-w23): colour palette tool, checked by behaviour.
// setup.collect keeps every cell of a module created during the turn reachable, sets the first colour
// input to #3366cc (hue 220, s 60%, l 50%: at l 50% hue rotation and RGB inversion agree, so either
// "complementary" convention passes), requires the complementary (#cc9933), both triadic (#cc3366,
// #66cc33) and a symmetric analogous pair (hue ±15..45°) to be shown as hex text, then clicks the
// #cc3366 swatch and requires exactly that hex to reach the clipboard (navigator.clipboard.writeText,
// navigator.clipboard.write, or execCommand("copy") are all intercepted).

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
  const hsl2rgb = (h, s, l) => { h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r, g, b].map(v => Math.round((v + m) * 255)); };
  const parse = hx => { hx = hx.replace("#", ""); return [0, 2, 4].map(i => parseInt(hx.slice(i, i + 2), 16)); };
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 3);
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const nav = navigator, clipDesc = Object.getOwnPropertyDescriptor(nav, "clipboard"), exec = document.execCommand;
  try {
    await sleep(1000);
    const roots = () => userVars.map(v => v._value).filter(x => x instanceof Element);
    const all = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]);
    const input = all("input[type=color]")[0] || all("input").find(i => /^#?[0-9a-f]{6}$/i.test(i.value));
    if (!input) return "no colour input found";
    input.value = input.type === "color" ? "#3366cc" : (input.value.startsWith("#") ? "#3366cc" : "3366cc");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(1200);
    const text = roots().map(r => r.textContent).join(" ");
    const shown = [...new Set([...text.matchAll(/#[0-9a-f]{6}|\b[0-9a-f]{6}\b/gi)].map(m => m[0]))].map(h => ({ h, rgb: parse(h) }));
    const has = deg => shown.find(s => near(s.rgb, hsl2rgb(220 + deg, 0.6, 0.5)));
    const miss = [];
    if (!has(0)) miss.push("base #3366cc");
    if (!has(180)) miss.push("complementary #cc9933");
    if (!has(120)) miss.push("triadic #cc3366");
    if (!has(240)) miss.push("triadic #66cc33");
    let ana = null; for (let d = 15; d <= 45 && !ana; d++) if (has(d) && has(-d)) ana = d;
    if (!ana) miss.push("an analogous pair at ±15..45°");
    if (miss.length) return "after picking #3366cc, missing hex text: " + miss.join(", ") + "; shown: " + JSON.stringify(shown.map(s => s.h).slice(0, 20));
    // clipboard interception
    let copied = null;
    Object.defineProperty(nav, "clipboard", { configurable: true, value: {
      writeText: async t => { copied = String(t); },
      write: async items => { for (const it of items) { for (const ty of it.types || []) if (/text\/plain/.test(ty)) copied = await (await it.getType(ty)).text(); } },
      readText: async () => copied ?? "",
    } });
    document.execCommand = function (cmd, ...rest) {
      if (String(cmd).toLowerCase() === "copy") { const a = document.activeElement; copied = (a && "value" in a && a.value) || String(document.getSelection()); return true; }
      return exec.call(document, cmd, ...rest);
    };
    const target = has(120), want = target.rgb;
    const bg = el => { const m = getComputedStyle(el).backgroundColor.match(/\d+/g); return m && m.length >= 3 && near(m.slice(0, 3).map(Number), want); };
    const byText = all("*").filter(e => e.textContent.includes(target.h) && ![...e.children].some(c => c.textContent.includes(target.h)));
    const byBg = all("*").filter(bg);
    const cands = [...byBg, ...byText];
    if (!cands.length) return "no swatch element for " + target.h;
    for (const el of cands) { el.click(); await sleep(300); if (copied != null) break; }
    if (copied == null) return "clicking the " + target.h + " swatch (" + cands.length + " candidate elements) copied nothing";
    const c = copied.trim();
    if (!/^#?[0-9a-f]{6}$/i.test(c) || !near(parse(c), want)) return "clicking the " + target.h + " swatch copied " + JSON.stringify(c.slice(0, 80));
    return "ok";
  } finally {
    if (clipDesc) Object.defineProperty(nav, "clipboard", clipDesc); else delete nav.clipboard;
    document.execCommand = exec;
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SOLUTION = `const _intro = function intro(md){return( md\`# Colour palette\` )};
const _viewof_base = function viewof_base(Inputs){return( Inputs.color({label: "Base colour", value: "#4682b4"}) )};
const _base = function base(Generators, viewof_base){return( Generators.input(viewof_base) )};
const _rotate = function rotate(d3){return( (hex, deg) => { const c = d3.hsl(hex); c.h = (c.h + deg + 360) % 360; return c.formatHex(); } )};
const _palettes = function palettes(rotate, base){return( {
  Complementary: [base, rotate(base, 180)],
  Triadic: [base, rotate(base, 120), rotate(base, 240)],
  Analogous: [rotate(base, -30), base, rotate(base, 30)]
} )};
// copy helper: copyTextToClipboard in module d/c2dae147641e012a (lopecode/notebooks/quick_start.html)
const _copy = function copy(){return( async text => { await navigator.clipboard.writeText(String(text)); return true; } )};
// handler form: htl.html\`<button onclick=\${…}>\` as in @tomlarkworthy/gallery.card (lopebooks/notebooks/@tomlarkworthy_gallery.html)
const _view = function view(htl, palettes, copy){return( htl.html\`<div>\${Object.entries(palettes).map(([name, hexes]) => htl.html\`<h3>\${name}</h3><div style="display:flex;gap:8px">\${hexes.map(h => htl.html\`<button style="width:90px;height:90px;background:\${h};border:0;border-radius:8px;cursor:pointer" onclick=\${async (e) => { await copy(h); e.currentTarget.title = "copied"; }}><code style="background:#fff;padding:2px">\${h}</code></button>\`)}</div>\`)}</div>\` )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_base", "viewof base", ["Inputs"], _viewof_base);
  $def("_base", "base", ["Generators", "viewof base"], _base);
  $def("_rotate", "rotate", ["d3"], _rotate);
  $def("_palettes", "palettes", ["rotate", "base"], _palettes);
  $def("_copy", "copy", [], _copy);
  $def("_view", "view", ["htl", "palettes", "copy"], _view);
  return main;
}
`;

export default {
  id: "rc5t-colour-palette",
  category: "rc5-train",
  question: "Make a colour palette tool: I pick a base colour and it shows complementary, triadic and analogous swatches with their hex codes, and clicking a swatch copies its hex.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/colour-palette.js", content: SOLUTION } },
  ],
};
