// rc5-train eval (20260929-0620-m46): a self-upgrade. The user asks for a new theme in the notebook's Theme
// picker (@tomlarkworthy/themes, `themes` Map -> `viewof theme_assets` Inputs.select). setup.collect acts as the
// user after the turn: the picker lists Solarized Light and has it selected; the page is painted base3 #fdf6e3
// with base00 #657b83 (or base01 #586e75) text; picking near-midnight and then Solarized Light again works; the
// exported file reopens (sandboxed blob: iframe) with Solarized Light selected and painted. Injecting CSS
// without a picker entry scores 0. Any mechanism passes (a data: URL, an embedded stylesheet, a new theme file).
//
// rc5t-try-control-select-label: the harness defect met on the way. In 20260929-0620-m46-before the agent
// called try_control {control: "viewof theme_assets", value: "solarized-light"}; the tool wrote the label into
// the Inputs.select .value setter, theme_assets became null and css/apply_theme threw. It is scored on the
// tool's report of a label pick on the real picker (no model needed: the oracle is the call itself).
const COLLECT = "// Page-side (setup.collect) for rc5t-solarized-theme. Acts as the user after the turn:\n// 1. live: the Theme picker (viewof theme_assets, @tomlarkworthy/themes) has an option named Solarized\n//    Light, it is the selected one, and the page's computed background and text colours are Solarized\n//    base3 #fdf6e3 and base00 #657b83 (text may be base01 #586e75).\n// 2. switch: pick near-midnight through the picker (page goes dark), pick Solarized Light again (page is\n//    Solarized again).\n// 3. saved: export the notebook, boot the file in a sandboxed blob: iframe, and with no user action the\n//    picker must still show Solarized Light and the page must be painted with it.\n// Any mechanism passes (a data: URL, an embedded stylesheet, a CSS-text entry) as long as the picker offers it.\n(async () => {\n  const probe = async function (inFrame) {\n    const sleep = ms => new Promise(r => setTimeout(r, ms));\n    const rgb = s => (String(s).match(/[\\d.]+/g) || []).slice(0, 4).map(Number);\n    const opaque = s => { const v = rgb(s); return v.length >= 3 && (v.length < 4 || v[3] > 0.5) && !/^color\\(/.test(s) || (/^color\\(/.test(s) && (rgb(s)[3] ?? 1) > 0.5); };\n    const toRgb = s => { let [r, g, b] = rgb(s); if (/^color\\(/.test(s)) { r *= 255; g *= 255; b *= 255; } return [r, g, b]; };\n    const near = (s, hex, tol = 24) => { const [r, g, b] = toRgb(s); const h = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return [r, g, b].every((c, i) => Math.abs(c - h[i]) <= tol); };\n    const pageBg = () => { for (const e of [document.body, document.documentElement]) { const c = getComputedStyle(e).backgroundColor; if (opaque(c)) return c; } return \"transparent\"; };\n    const pageFg = () => getComputedStyle(document.body).color;\n    const t0 = Date.now();\n    let vv, tv;\n    while (Date.now() - t0 < (inFrame ? 20000 : 8000)) {\n      const rt = globalThis.__ojs_runtime;\n      if (!rt) { await sleep(300); continue; }\n      vv = [...rt._variables].find(v => v._name === \"viewof theme_assets\" && v._value instanceof Element && v._value.querySelector(\"select\"));\n      tv = [...rt._variables].find(v => v._name === \"themes\" && v._value instanceof Map && v._value.has(\"near-midnight\"));\n      if (vv && tv) break;\n      await sleep(300);\n    }\n    if (!vv || !tv) return { stage: \"no theme picker\" };\n    const view = vv._value, themes = tv._value;\n    const key = [...themes.keys()].find(k => /solari[sz]ed[\\s_-]*light/i.test(k));\n    const optionText = [...view.querySelectorAll(\"select option\")].map(o => o.textContent.trim());\n    const out = { keys: [...themes.keys()], listed: !!key && optionText.some(t => /solari[sz]ed[\\s_-]*light/i.test(t)) };\n    if (!key) return { ...out, stage: \"no Solarized Light entry in themes\" };\n    const selected = () => view.value === themes.get(key) && /solari[sz]ed[\\s_-]*light/i.test(view.querySelector(\"select\")?.selectedOptions?.[0]?.textContent || \"\");\n    const painted = () => near(pageBg(), \"#fdf6e3\") && (near(pageFg(), \"#657b83\") || near(pageFg(), \"#586e75\"));\n    const until = async (f, ms) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await sleep(300); await sleep(300); return f(); };\n    out.selected = selected();\n    out.painted = await until(painted, inFrame ? 10000 : 4000);\n    out.colours = { bg: pageBg(), fg: pageFg() };\n    if (inFrame) return out;\n    const pick = assets => { view.value = assets; view.dispatchEvent(new Event(\"input\", { bubbles: true })); };\n    pick(themes.get(\"near-midnight\"));\n    out.away = await until(() => !near(pageBg(), \"#fdf6e3\", 40) && toRgb(pageBg()).reduce((a, b) => a + b, 0) < 200, 8000);\n    pick(themes.get(key));\n    out.back = await until(() => painted() && selected(), 8000);\n    return out;\n  };\n\n  const live = await probe(false);\n  const res = { live };\n  const rt = globalThis.__ojs_runtime;\n  const exp = [...rt._variables].find(v => v._name === \"exportToHTML\" && typeof v._value === \"function\")?._value;\n  if (exp && live.listed) {\n    const r = await exp({ mains: rt.mains });\n    let html = typeof r === \"string\" ? r : r.source;\n    const reporter = `<script>(async () => { const probe = ${probe.toString()}; let res; try { res = await probe(true); } catch (e) { res = { stage: \"threw \" + e.message }; } parent.postMessage({ __solProbe: res }, \"*\"); })()<\\/script>`;\n    html = html.replace(/<\\/body>(?![\\s\\S]*<\\/body>)/i, reporter + \"</body>\");\n    const frame = document.createElement(\"iframe\");\n    frame.sandbox = \"allow-scripts\";\n    frame.style.cssText = \"position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none\";\n    const got = new Promise(ok => {\n      addEventListener(\"message\", e => { if (e.data && e.data.__solProbe) ok(e.data.__solProbe); });\n      setTimeout(() => ok({ stage: \"timeout\" }), 30000);\n    });\n    frame.src = URL.createObjectURL(new Blob([html], { type: \"text/html\" }));\n    document.body.appendChild(frame);\n    res.saved = await got;\n    frame.remove();\n  } else res.saved = { stage: exp ? \"not listed, not saved\" : \"no exportToHTML\" };\n  return {\n    listed: !!live.listed,\n    live: !!(live.selected && live.painted),\n    switchBack: !!(live.away && live.back),\n    saved: !!(res.saved.listed && res.saved.selected && res.saved.painted),\n    detail: res,\n  };\n})()\n";
const M = "/src/@tomlarkworthy/themes.js";
// Solarized (Ethan Schoonover): base3 #fdf6e3 background, base00 #657b83 body text, blue #268bd2 focus.
// The --theme-* names are notebook-kit's, as theme-air.css sets them; abstract-light.css derives the rest.
const SOLARIZED = `:root {
  --theme-foreground: #657b83;
  --theme-foreground-focus: #268bd2;
  --theme-background-a: #fdf6e3;
  --theme-error: #dc322f;
  --syntax-keyword: #859900;
  --syntax-string: #2aa198;
  --syntax-comment: #93a1a1;
  --syntax-literal: #d33682;
  --syntax-atom: #6c71c4;
  --syntax-definition: #268bd2;
  --syntax-variable: #b58900;
}`;
const LAST_ENTRY = `      baseURL + 'theme-sun-faded.css',
      baseURL + 'abstract-dark.css',
      baseURL + 'syntax-dark.css'
    ]
  }));`;
const WITH_SOLARIZED = `      baseURL + 'theme-sun-faded.css',
      baseURL + 'abstract-dark.css',
      baseURL + 'syntax-dark.css'
    ],
    'Solarized Light': [
      baseURL + 'global.css',
      baseURL + 'inspector.css',
      baseURL + 'highlight.css',
      baseURL + 'plot.css',
      baseURL + 'index.css',
      baseURL + 'abstract-light.css',
      baseURL + 'syntax-light.css',
      'data:text/css,' + encodeURIComponent(${JSON.stringify(SOLARIZED)})
    ]
  }));`;
const SWITCH = `viewof_theme_assets.value = themes.get('Solarized Light');
viewof_theme_assets.dispatchEvent(new Event('input', { bubbles: true }));
return theme_name;`;

export default [
  {
    id: "rc5t-solarized-theme",
    category: "rc5-train",
    question: 'Add a new theme called "Solarized Light" to the notebook\'s theme picker, using the Solarized palette, and switch the notebook to it.',
    setup: { collect: COLLECT },
    criteria: [
      { name: "collected_equals", args: { key: "listed", equals: true }, weight: 1 },
      { name: "collected_equals", args: { key: "live", equals: true }, weight: 3 },
      { name: "collected_equals", args: { key: "switchBack", equals: true }, weight: 2 },
      { name: "collected_equals", args: { key: "saved", equals: true }, weight: 2 },
    ],
    oracle: [
      { tool: "edit_file", args: { file_path: M, old_string: LAST_ENTRY, new_string: WITH_SOLARIZED }, settleMs: 1500 },
      { tool: "eval_js", args: { module: "@tomlarkworthy/themes", code: SWITCH }, settleMs: 2500 },
    ],
  },
];
