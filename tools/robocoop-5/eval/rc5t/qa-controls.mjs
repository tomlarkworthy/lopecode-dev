// rc5-train eval (20260928-0847-m4): QA an existing interactive module by using its controls.
// setup.files seeds @user/retro-title: the real @tomlarkworthy/retro-title-graphic (lopebooks, 13 cells,
// 7 sliders + 2 text boxes) with three seeded bugs. Every cell computes; no cell errors.
//   B1 the silver (top) line renders middleText, so typing in "Silver text" changes nothing
//   B2 square depends on "viewof corner_radius" (the element): path coordinates are NaN, the grid floor
//      vanishes and the corner_radius slider does nothing
//   B3 the visible ground rect is pinned at y="0", so the "horizon offset" slider never moves the horizon
// setup.collect drives the controls with real input events and reads the SVG: behaviour, not spelling.
const BUGGY = "const _d8kr5r = function _1(md){return(\nmd`# Retro Title Graphic`\n)};\nconst _1wdlnbt = function _gfx(svg,fov,width,horizonOffset,square,hackableY,topText,realtimeY,middleText){return(\nsvg`<svg viewBox=\"${-fov} ${-fov} ${2 * fov} ${2 * fov}\"\nwidth=\"${Math.min(width, 640)}px\" height=\"${\n  (Math.min(width, 640) * 630) / 1200\n}px\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <defs>\n\n    <linearGradient id=\"sky\" gradientTransform=\"rotate(90)\">\n      <stop offset=\"0%\" stop-color=\"#120017\" />\n      <stop offset=\"50%\" stop-color=\"#26117D\" />\n      <stop offset=\"80%\" stop-color=\"#D800AF\" />\n      <stop offset=\"90%\" stop-color=\"#FF9FB7\" />\n      <stop offset=\"100%\" stop-color=\"#6149ED\" />\n    </linearGradient>\n\n    <linearGradient id=\"rainbowFill\" gradientTransform=\"rotate(90)\">\n      <stop offset=\"20%\" stop-color=\"#ADA6FF\" />\n      <stop offset=\"45%\" stop-color=\"#404CFF\" />\n      <stop offset=\"55%\" stop-color=\"#3EFF94\" />\n      <stop offset=\"65%\" stop-color=\"#FF8F00\" />\n      <stop offset=\"90%\" stop-color=\"#FFA5A5\" />\n      <stop offset=\"100%\" stop-color=\"#FFCE29\" />\n    </linearGradient>\n\n    \n    <radialGradient id=\"groundFill\" cy=\"0%\" r=\"1\">\n      <stop offset=\"0%\" stop-color=\"#6149ED\"/>\n      <stop offset=\"100%\" stop-color=\"#120017\" />\n    </radialGradient>\n\n\n    <linearGradient id=\"surfaceFill\" gradientTransform=\"rotate(90)\">\n      <stop offset=\"0%\" stop-color=\"yellow\"  stop-opacity=\"0\"/>\n      <stop offset=\"13%\" stop-color=\"yellow\"  stop-opacity=\"0\"/>\n      <stop offset=\"16%\" stop-color=\"yellow\" />\n      <stop offset=\"100%\" stop-color=\"orange\" />\n    </linearGradient>\n\n\n    <linearGradient id=\"chromeFill\" gradientTransform=\"rotate(90)\">\n      <stop offset=\"15%\" stop-color=\"#4E4A5F\" />\n      <stop offset=\"20%\" stop-color=\"#C7C1EC\" />\n      <stop offset=\"30%\" stop-color=\"#C3C5DE\" />\n      <stop offset=\"45%\" stop-color=\"#DFD9DF\" />\n      <stop offset=\"60%\" stop-color=\"#837199\" />\n      <stop offset=\"65%\" stop-color=\"#271B5C\" />\n      <stop offset=\"75%\" stop-color=\"#D7DEF0\" />\n    </linearGradient>\n    \n    <rect id=\"ground\" x=\"-1\" y=\"0\" width= \"2\" height=\"${\n      1 * fov\n    }\" fill=\"url(#groundFill)\"/>\n\n    <rect id=\"surface\" x=\"-1\" y=\"0\" width= \"2\" height=\"${\n      1 * fov\n    }\" fill=\"url(#surfaceFill)\"/>\n\n      \n\n  </defs>\n  \n  <rect x=\"-1\" y=\"${-1 * fov}\" width= \"2\" height=\"${\n  1 * fov + horizonOffset\n}\" fill=\"url(#sky)\" />\n\n  \n  <rect id=\"ground\" x=\"-1\" y=\"0\" width= \"2\" height=\"${\n  1 * fov - horizonOffset\n}\" fill=\"url(#groundFill)\" />\n\n  \n    <clipPath id=\"cells\">\n      ${Array.from({ length: 4 * 15 }).map((_, xy) =>\n        square([(xy % 4) - 2, Math.floor(xy / 4), 1], \"url(#ground)\")\n      )}\n    </clipPath>\n\n  <use clip-path=\"url(#cells)\" href=\"#surface\" />\n\n  <text y=${hackableY} stroke=\"url(#chromeFill)\" stroke-width=\"0.005\" fill=\"url(#chromeFill)\"\n    text-anchor = \"middle\"\n    style=\"font: italic bold 0.15px sans-serif; font-family: helvetica; letter-spacing: 0px;\">\n    ${middleText}\n  </text>\n\n\n  <text y=${realtimeY}\n    fill=\"url(#rainbowFill)\"\n    stroke=\"url(#rainbowFill)\"\n    stroke-width=\"0.005\"\n    text-anchor = \"middle\"\n    style=\"font-weight: bold; font-size:  0.15px; font-family: arial; letter-spacing: 0px;\">\n    ${middleText}\n  </text>\n\n\n\n</svg>`\n)};\nconst _ub8ece = function _topText(Inputs){return(\nInputs.text({ label: \"Silver text\", value: \"Top\" })\n)};\nconst _inq1em = (G, _) => G.input(_);\nconst _j97w9r = function _middleText(Inputs){return(\nInputs.text({\n  label: \"Rainbow text\",\n  value: \"Rainbow Text\"\n})\n)};\nconst _3i7qkq = (G, _) => G.input(_);\nconst _ki7knl = function _fov(Inputs){return(\nInputs.range([0, 2], { value: 0.5, label: \"FOV\" })\n)};\nconst _1bwfjb9 = (G, _) => G.input(_);\nconst _ea76nl = function _corner_radius(Inputs){return(\nInputs.range([0, 1], {\n  value: 0.3,\n  label: \"corner_radius\"\n})\n)};\nconst _1ucvly6 = (G, _) => G.input(_);\nconst _1pdju9r = function _padding(Inputs){return(\nInputs.range([0, 1], {\n  value: 0.02,\n  label: \"padding\"\n})\n)};\nconst _1sz59vn = (G, _) => G.input(_);\nconst _1w6hdwu = function _horizonOffset(Inputs){return(\nInputs.range([-1, 1], {\n  value: 0.125,\n  label: \"horizon offset\"\n})\n)};\nconst _3kdxou = (G, _) => G.input(_);\nconst _fwksq = function _hackableY(Inputs){return(\nInputs.range([-1, 1], {\n  value: -0.23,\n  label: \"hackableY\"\n})\n)};\nconst _18hrbum = (G, _) => G.input(_);\nconst _1asuej3 = function _realtimeY(Inputs){return(\nInputs.range([-1, 1], {\n  value: 0.0065283621064848,\n  label: \"realtimeY\"\n})\n)};\nconst _1diurvu = (G, _) => G.input(_);\nconst _117sax8 = function _speed(Inputs){return(\nInputs.range([0, 10], {\n  value: 0.3,\n  label: \"speed\"\n})\n)};\nconst _ms03oh = (G, _) => G.input(_);\nconst _1oatmj6 = function _project(){return(\n(d) =>\n  d.map((d) => [\n    d[0] / (d[1] + 1), // screen x\n    d[2] / (d[1] + 1) // screen y\n  ])\n)};\nconst _1x5z634 = function _square(corner_radius,project,padding,speed){return(\n([dx, dy, dz], color) => {\n  const id = `s(${dx},${dy},${dz})`;\n  const rounding = corner_radius;\n\n  const p = project([\n    [dx + rounding + padding, dy + padding, dz],\n    [dx + 1 - rounding - padding, dy + padding, dz],\n    [dx + 1 - padding, dy + padding, dz],\n    [dx + 1 - padding, dy + rounding + padding, dz],\n    [dx + 1 - padding, dy + 1 - rounding - padding, dz],\n    [dx + 1 - padding, dy + 1 - padding, dz],\n    [dx + 1 - rounding - padding, dy + 1 - padding, dz],\n    [dx + rounding + padding, dy + 1 - padding, dz],\n    [dx + padding, dy + 1 - padding, dz],\n    [dx + padding, dy + 1 - rounding - padding, dz],\n    [dx + padding, dy + rounding + padding, dz],\n    [dx + padding, dy + padding, dz],\n\n    [dx + rounding + padding, dy + 1 + padding, dz],\n    [dx + 1 - rounding - padding, dy + 1 + padding, dz],\n    [dx + 1 - padding, dy + 1 + padding, dz],\n    [dx + 1 - padding, dy + 1 + rounding + padding, dz],\n    [dx + 1 - padding, dy + 1 + 1 - rounding - padding, dz],\n    [dx + 1 - padding, dy + 1 + 1 - padding, dz],\n    [dx + 1 - rounding - padding, dy + 1 + 1 - padding, dz],\n    [dx + rounding + padding, dy + 1 + 1 - padding, dz],\n    [dx + padding, dy + 1 + 1 - padding, dz],\n    [dx + padding, dy + 1 + 1 - rounding - padding, dz],\n    [dx + padding, dy + 1 + rounding + padding, dz],\n    [dx + padding, dy + 1 + padding, dz]\n  ]);\n  const coord = (index) => `${p[index][0]} ${p[index][1]}`;\n\n  const d0 = `M ${coord(0)}\nL ${coord(1)} \nC ${coord(2)}, ${coord(2)}, ${coord(3)}\nL ${coord(4)}\nC ${coord(5)},${coord(5)},${coord(6)}\nL ${coord(7)} \nC ${coord(8)},${coord(8)},${coord(9)}\nL ${coord(10)} \nC ${coord(11)},${coord(11)},${coord(0)}\nZ`;\n\n  const d1 = `M ${coord(0 + 12)}\nL ${coord(1 + 12)} \nC ${coord(2 + 12)}, ${coord(2 + 12)}, ${coord(3 + 12)}\nL ${coord(4 + 12)}\nC ${coord(5 + 12)},${coord(5 + 12)},${coord(6 + 12)}\nL ${coord(7 + 12)} \nC ${coord(8 + 12)},${coord(8 + 12)},${coord(9 + 12)}\nL ${coord(10 + 12)} \nC ${coord(11 + 12)},${coord(11 + 12)},${coord(0 + 12)}\nZ`;\n\n  return `<path id=${id} d=\"${d0}\" fill=\"${color}\">\n<animate xlink:href=\"#${id}\"\n    attributeName=\"d\"\n    attributeType=\"XML\"\n    begin=\"0s\"\n    from=\"${d1}\"\n    to=\"${d0}\"\n    dur=\"${speed}s\" repeatCount=\"indefinite\"\n/>\n\n</path>\n\n`;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_d8kr5r\", null, [\"md\"], _d8kr5r);  \n  $def(\"_1wdlnbt\", \"gfx\", [\"svg\",\"fov\",\"width\",\"horizonOffset\",\"square\",\"hackableY\",\"topText\",\"realtimeY\",\"middleText\"], _1wdlnbt);  \n  $def(\"_ub8ece\", \"viewof topText\", [\"Inputs\"], _ub8ece);  \n  $def(\"_inq1em\", \"topText\", [\"Generators\",\"viewof topText\"], _inq1em);  \n  $def(\"_j97w9r\", \"viewof middleText\", [\"Inputs\"], _j97w9r);  \n  $def(\"_3i7qkq\", \"middleText\", [\"Generators\",\"viewof middleText\"], _3i7qkq);  \n  $def(\"_ki7knl\", \"viewof fov\", [\"Inputs\"], _ki7knl);  \n  $def(\"_1bwfjb9\", \"fov\", [\"Generators\",\"viewof fov\"], _1bwfjb9);  \n  $def(\"_ea76nl\", \"viewof corner_radius\", [\"Inputs\"], _ea76nl);  \n  $def(\"_1ucvly6\", \"corner_radius\", [\"Generators\",\"viewof corner_radius\"], _1ucvly6);  \n  $def(\"_1pdju9r\", \"viewof padding\", [\"Inputs\"], _1pdju9r);  \n  $def(\"_1sz59vn\", \"padding\", [\"Generators\",\"viewof padding\"], _1sz59vn);  \n  $def(\"_1w6hdwu\", \"viewof horizonOffset\", [\"Inputs\"], _1w6hdwu);  \n  $def(\"_3kdxou\", \"horizonOffset\", [\"Generators\",\"viewof horizonOffset\"], _3kdxou);  \n  $def(\"_fwksq\", \"viewof hackableY\", [\"Inputs\"], _fwksq);  \n  $def(\"_18hrbum\", \"hackableY\", [\"Generators\",\"viewof hackableY\"], _18hrbum);  \n  $def(\"_1asuej3\", \"viewof realtimeY\", [\"Inputs\"], _1asuej3);  \n  $def(\"_1diurvu\", \"realtimeY\", [\"Generators\",\"viewof realtimeY\"], _1diurvu);  \n  $def(\"_117sax8\", \"viewof speed\", [\"Inputs\"], _117sax8);  \n  $def(\"_ms03oh\", \"speed\", [\"Generators\",\"viewof speed\"], _ms03oh);  \n  $def(\"_1oatmj6\", \"project\", [], _1oatmj6);  \n  $def(\"_1x5z634\", \"square\", [\"viewof corner_radius\",\"project\",\"padding\",\"speed\"], _1x5z634);\n  return main;\n}\n";

const FIXED = BUGGY
  .replace("    ${middleText}\n  </text>\n\n\n  <text y=${realtimeY}", "    ${topText}\n  </text>\n\n\n  <text y=${realtimeY}")
  .replace(`["viewof corner_radius","project"`, `["corner_radius","project"`)
  .replace(`<rect id="ground" x="-1" y="0" width= "2" height="\${\n  1 * fov - horizonOffset`, `<rect id="ground" x="-1" y="\${horizonOffset}" width= "2" height="\${\n  1 * fov - horizonOffset`);
if (FIXED.split("\n").filter((l, i) => l !== BUGGY.split("\n")[i]).length !== 3) throw new Error("retro-title eval: FIXED did not apply 3 edits");

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/retro-title")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const vars = () => [...rt._variables].filter(v => mods.includes(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)) };
  if (!vars().length) return { ...out, error: "no @user/retro-title or new module" };
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1500);
    const els = () => vars().map(v => v._value).filter(x => x instanceof Element);
    const svgEl = () => els().flatMap(e => e.matches("svg") ? [e] : [...e.querySelectorAll("svg")]).find(s => s.querySelector("text") && s.querySelector("rect"));
    const control = (re, sel) => els().flatMap(e => e.matches("form, div") ? [e] : []).map(f => ({ f, input: f.querySelector(sel) }))
      .find(({ f, input }) => input && re.test((f.querySelector("label")?.textContent || "")))?.input;
    const set = async (input, x) => { input.value = String(x); input.dispatchEvent(new Event("input", { bubbles: true })); await sleep(700); };
    const silver = control(/silver/i, "input[type=text]"), rainbow = control(/rainbow/i, "input[type=text]");
    const radius = control(/corner/i, "input[type=range]"), horizon = control(/horizon/i, "input[type=range]"), fov = control(/fov/i, "input[type=range]");
    out.controlsFound = [silver, rainbow, radius, horizon, fov].map(Boolean);
    if (!svgEl() || out.controlsFound.includes(false)) return { ...out, error: "svg or a control missing" };
    // B1: each text box drives its own line
    await set(silver, "ZQSILVER"); await set(rainbow, "ZQRAINBOW");
    const texts = [...svgEl().querySelectorAll("text")].map(t => t.textContent.trim());
    out.texts = texts;
    out.b1 = texts.filter(t => t.includes("ZQSILVER")).length === 1 && texts.filter(t => t.includes("ZQRAINBOW")).length === 1;
    // B2: the corner radius slider reshapes the floor tiles, with finite coordinates
    const paths = () => [...svgEl().querySelectorAll("clipPath path, path")].map(p => p.getAttribute("d") || "");
    await set(radius, 0.1); const d1 = paths();
    await set(radius, 0.4); const d2 = paths();
    out.pathCount = d2.length; out.nanPaths = d2.filter(d => /NaN|undefined|object/.test(d)).length;
    out.b2 = d2.length > 0 && out.nanPaths === 0 && d1.join() !== d2.join();
    // B3: the visible ground starts where the sky ends, at the horizon offset
    const rectsNow = () => [...svgEl().querySelectorAll("rect")].filter(r => !r.closest("defs"));
    const edge = () => {
      const g = rectsNow().find(r => /groundFill/.test(r.getAttribute("fill") || ""));
      const s = rectsNow().find(r => /#sky/.test(r.getAttribute("fill") || ""));
      return g && s ? { groundY: +g.getAttribute("y"), skyBottom: +s.getAttribute("y") + +s.getAttribute("height") } : null;
    };
    await set(horizon, -0.3); const e1 = edge();
    await set(horizon, 0.3); const e2 = edge();
    out.edges = [e1, e2];
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    out.b3 = !!(e1 && e2 && near(e1.groundY, -0.3) && near(e1.skyBottom, -0.3) && near(e2.groundY, 0.3) && near(e2.skyBottom, 0.3));
    // no regression: fov still sets the viewBox
    await set(fov, 1); const vb1 = svgEl().getAttribute("viewBox");
    await set(fov, 0.5); const vb2 = svgEl().getAttribute("viewBox");
    out.fovOk = /^-1 -1 2 2$/.test(vb1) && /^-0\.5 -0\.5 1 1$/.test(vb2);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-qa-controls",
  category: "rc5-train",
  question: "My notebook @user/retro-title draws a retro title graphic with some sliders and text boxes. Check my notebook actually works: try the controls like a user would and tell me what is broken, then fix it.",
  setup: { files: { "/src/@user/retro-title.js": BUGGY }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "b1", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "b2", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "b3", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "fovOk", equals: true }, weight: 1 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
    // the report is the deliverable: it names each broken control
    { name: "answer_matches", args: { pattern: "silver|top ?text|topText", flags: "i" }, weight: 1 },
    { name: "answer_matches", args: { pattern: "corner.?radius", flags: "i" }, weight: 1 },
    { name: "answer_matches", args: { pattern: "horizon", flags: "i" }, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/retro-title.js", content: FIXED } },
    { assistant: "Broken: the Silver text box changed nothing (the top line showed the rainbow text); the corner_radius slider did nothing and the floor grid was missing (NaN coordinates); the horizon offset slider did not move the horizon (ground pinned at y=0). All three are fixed." },
  ],
};
