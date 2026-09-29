// rc5-train eval (20260929-0620-m45): add "Word count" and "Scroll to top" to the Cmd+K palette.
// In run 20260929-0620-m45-before2 the agent registered both on the "lopecode_commands" plugin bus from
// @user/my-commands (the palette's extension point) and checked only that the rows were listed. Its
// Scroll to top ran `window.scrollTo({top: 0})`. In a lopepage notebook the window does not scroll: each
// pane (`.lp2-pane`) is its own scroll container, so the command did nothing (panes 1403px and 1690px down
// before, the same after). Its Word count summed the md cells of every loaded module (the tooling's docs
// included), not the user's.
//
// setup.files seeds @user/first-post: the prose of @tomlarkworthy/blog-first-post._content
// (lopebooks/notebooks/@tomlarkworthy_blog-first-post.html) split into md cells, with its ${…} holes,
// iframe and image removed. setup.collect acts as the user:
//   listed         - Cmd+K (a keydown on document) opens the palette; typing "word" lists a Word count row
//                    and typing "scroll" lists a Scroll to top row
//   wordCount      - running Word count shows (alert, new page text, or the row itself) a number within 5%
//                    of the fixture's word count, measured both on the rendered text and on the md source
//   scrolledTop    - with every pane scrolled to the bottom, running Scroll to top brings the fixture's
//                    pane back to the top
//   reopenedListed - after exportToHTML and booting the export in a sandboxed blob: iframe, Cmd+K lists both
// Any correct build passes: the command can live in any module, count via source or rendered text, and
// scroll one pane or all of them.

const FIXTURE = String.raw`const _title = function _title(md){return(
md` + "`" + String.raw`# First Post: Static site generation in Observable` + "`" + String.raw`
)};
const _p1 = function _p1(md){return(
md` + "`" + String.raw`This post was authored in [_Observable_](https://observablehq.com/) at [_@tomlarkworthy/blog-first-post_](https://observablehq.com/@tomlarkworthy/blog-first-post). I love programming in _Observable_. I have always felt limited by the expressivity of CRMs like WordPress and Contentful. I want to blog using code. I want to use Observable as an interface to a static site.` + "`" + String.raw`
)};
const _h1 = function _h1(md){return(
md` + "`" + String.raw`## Write with Code` + "`" + String.raw`
)};
const _p2 = function _p2(md){return(
md` + "`" + String.raw`With _Observable_ I can generate static prose programatically, and this is generated and embedded into a pure HTML site.` + "`" + String.raw`
)};
const _h2 = function _h2(md){return(
md` + "`" + String.raw`## Animate with Code` + "`" + String.raw`
)};
const _p3 = function _p3(md){return(
md` + "`" + String.raw`So now I have a kick-ass static site that's super easy to update! I don't need to run a CLI command or do a PR to update it. All features can be done in the browser, including the build chain. The whole thing is entirely in _Observable_. Furthermore, it's all backed by CDN and is super fast, there are no compromises on the output, exactly because it's self authored.` + "`" + String.raw`
)};
const _h3 = function _h3(md){return(
md` + "`" + String.raw`## Tech Used` + "`" + String.raw`
)};
const _p4 = function _p4(md){return(
md` + "`" + String.raw`By default, the preview page renders every visit. This is somewhat slow, taking around 2-3 seconds, but it means published changes are reflected quickly. However, it is a horrible URL and too slow for production.` + "`" + String.raw`
)};
const _p5 = function _p5(md){return(
md` + "`" + String.raw`I give the page a nice URL using Netlify. To make the production page fast, I max the shared cache settings in the serverside cell when a production _X-Version_ header is present. Thus, so we lean heavily on the integrated CDN.` + "`" + String.raw`
)};
const _p6 = function _p6(md){return(
md` + "`" + String.raw`On the Netlify end, I set up the page to redirect to the serverside cell URL and add a custom _X-Version_ header. When the production page is updated, the version header is bumped, so the upstream cache is invalidated.` + "`" + String.raw`
)};
const _h4 = function _h4(md){return(
md` + "`" + String.raw`## Stay tuned` + "`" + String.raw`
)};
const _p7 = function _p7(md){return(
md` + "`" + String.raw`The personal webpage is a work in progress. Meta tags are missing, the RSS feed doesn't work and it doesn't support more than one page yet! But I will add to this over the next few weeks and hopefully get it to a state where anybody can create a page easily.` + "`" + String.raw`
)};
const _rule = function _rule(){return(
(input) => input.map((_, i) => ((input[i - 1] || 0) ^ ((input[i] || 0) | (input[i + 1] || 0))))
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_p1", "p1", ["md"], _p1);
  $def("_h1", "h1", ["md"], _h1);
  $def("_p2", "p2", ["md"], _p2);
  $def("_h2", "h2", ["md"], _h2);
  $def("_p3", "p3", ["md"], _p3);
  $def("_h3", "h3", ["md"], _h3);
  $def("_p4", "p4", ["md"], _p4);
  $def("_p5", "p5", ["md"], _p5);
  $def("_p6", "p6", ["md"], _p6);
  $def("_h4", "h4", ["md"], _h4);
  $def("_p7", "p7", ["md"], _p7);
  $def("_rule", "rule", [], _rule);
  return main;
}
`;

const INIT = String.raw`(() => { globalThis.__rc5tBase = new Set(globalThis.__ojs_runtime.mains.keys()); })()`;

const COLLECT = String.raw`(async () => {
  const FIX = "@user/first-post";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const out = { newModules: [...rt.mains.keys()].filter(n => !globalThis.__rc5tBase?.has(n)) };
  // expected count, from the fixture itself: rendered text and md source
  const fixMod = rt.mains.get(FIX);
  if (!fixMod) return { ...out, stage: "fixture module missing" };
  const fixVars = [...rt._variables].filter(v => v._module === fixMod && (v._inputs || []).some(i => i._name === "md"));
  let rendered = 0, source = 0;
  for (const v of fixVars) {
    const el = await Promise.race([fixMod.value(v._name), sleep(5000)]);
    rendered += (String(el?.textContent ?? "").match(/\S+/g) || []).length;
    const m = String(v._definition).match(/md\x60([\s\S]*)\x60/);
    source += ((m ? m[1] : "").match(/\S+/g) || []).length;
  }
  out.expected = [Math.floor(Math.min(rendered, source) * 0.95), Math.ceil(Math.max(rendered, source) * 1.05)];

  // show the fixture in a narrow main pane so it scrolls
  history.pushState(null, "", "#view=R100(S35(" + FIX + "),S65(@tomlarkworthy/robocoop-5))");
  dispatchEvent(new HashChangeEvent("hashchange"));
  await sleep(3000);

  const messages = [], pageErrors = [];
  addEventListener("error", e => pageErrors.push(String(e.message)));
  addEventListener("unhandledrejection", e => pageErrors.push(String(e.reason)));
  for (const k of ["alert", "confirm", "prompt"]) window[k] = m => { messages.push(String(m)); return k === "confirm" ? true : null; };
  const overlay = () => [...document.querySelectorAll(".command-palette-overlay")].find(o => o.isConnected && !o.hidden);
  const openPalette = async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", metaKey: true, bubbles: true, cancelable: true }));
    await sleep(400);
    return overlay();
  };
  const search = async (ov, text) => {
    const i = ov.querySelector(".command-palette-input");
    i.value = text; i.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(300);
    return [...ov.querySelectorAll(".command-palette-result")];
  };
  // the command's row, not a cell-search hit on a cell named wordCountPlugin
  const pick = (rows, re) => { const hits = rows.filter(r => re.test(r.querySelector(".command-palette-label")?.textContent ?? "")); return hits.find(r => "commandAction" in r.dataset) || hits[0]; };
  const WORD = /^\s*word\s*count\b/i, SCROLL = /^\s*scroll\s*to\s*(the\s*)?top\b/i;
  const close = ov => { if (ov && !ov.hidden) ov.querySelector(".command-palette-input").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); };

  let ov = await openPalette();
  if (!ov) return { ...out, listed: false, stage: "Cmd+K did not open the palette" };
  const wordRow = pick(await search(ov, "word"), WORD);
  const wordRowText = wordRow ? wordRow.textContent : "";
  close(ov);
  ov = await openPalette();
  const scrollRow = pick(await search(ov, "scroll"), SCROLL);
  close(ov);
  out.listed = !!(wordRow && scrollRow);
  if (!out.listed) return { ...out, stage: "palette rows: word count " + !!wordRow + ", scroll to top " + !!scrollRow };

  // Word count
  const added = [];
  const mo = new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") added.push(m.target.nodeValue); for (const n of m.addedNodes) if (!n.parentElement?.closest?.(".command-palette-overlay")) added.push(n.textContent || ""); } });
  mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  ov = await openPalette();
  const wr = pick(await search(ov, "word"), WORD);
  wr.click();
  await sleep(1500);
  mo.disconnect();
  // a number next to the word "word(s)", in an alert, new page text or the palette row
  const shown = [wordRowText, ...messages, ...added].join(" \n ");
  const nums = [...shown.matchAll(/(\d[\d,]*)\s*(?:markdown\s+)?words?\b|\bwords?\b[^\d\n]{0,40}?(\d[\d,]*)/gi)].map(m => +(m[1] || m[2]).replace(/,/g, ""));
  out.pageErrors = pageErrors.slice(0, 5);
  out.messages = messages.slice(0, 3);
  out.numbersShown = [...new Set(nums)].slice(0, 20);
  out.wordCount = nums.some(n => n >= out.expected[0] && n <= out.expected[1]);
  close(overlay());

  // Scroll to top
  const fixPane = [...document.querySelectorAll(".lp2-pane")].find(p => p.dataset.module === FIX);
  out.panes = [...document.querySelectorAll(".lp2-pane")].map(p => p.dataset.module + ":" + p.scrollHeight + "/" + p.clientHeight);
  out.hash = decodeURIComponent(location.hash);
  if (!fixPane) return { ...out, stage: "fixture pane not in layout" };
  for (const p of document.querySelectorAll(".lp2-pane")) p.scrollTop = p.scrollHeight;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(500);
  out.paneDown = fixPane.scrollTop;
  if (out.paneDown < 100) return { ...out, stage: "fixture pane does not scroll (" + fixPane.scrollHeight + "/" + fixPane.clientHeight + ")" };
  ov = await openPalette();
  const sr = pick(await search(ov, "scroll"), SCROLL);
  sr.click();
  await sleep(2000);
  out.paneAfter = fixPane.scrollTop;
  out.scrolledTop = fixPane.scrollTop <= 5;
  close(overlay());

  // save + reopen
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  const reporter = "<script>(" + (async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = Date.now();
    let res = { word: false, scroll: false };
    while (Date.now() - t0 < 25000) {
      await sleep(1000);
      if (!globalThis.__ojs_runtime?.mains?.size) continue;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK", metaKey: true, bubbles: true, cancelable: true }));
      await sleep(300);
      const ov = [...document.querySelectorAll(".command-palette-overlay")].find(o => !o.hidden);
      if (!ov) continue;
      const i = ov.querySelector(".command-palette-input");
      const rows = async t => { i.value = t; i.dispatchEvent(new Event("input", { bubbles: true })); await sleep(300); return [...ov.querySelectorAll(".command-palette-label")].map(r => r.textContent); };
      res.word = (await rows("word")).some(t => /^\s*word\s*count\b/i.test(t));
      res.scroll = (await rows("scroll")).some(t => /^\s*scroll\s*to\s*(the\s*)?top\b/i.test(t));
      i.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      if (res.word && res.scroll) break;
    }
    parent.postMessage({ __paletteProbe: res }, "*");
  }).toString() + ")()<\/script>";
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__paletteProbe) res(e.data.__paletteProbe); });
    setTimeout(() => res({ timeout: true }), 30000);
  });
  frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  document.body.appendChild(frame);
  out.reopened = await got;
  out.reopenedListed = !!(out.reopened.word && out.reopened.scroll);
  frame.remove();
  out.stage = "done";
  return out;
})()`;

// Registration copied from @tomlarkworthy/annotate._a2Commands (lopebooks/notebooks/tomlarkworthy_code-facts.html):
// a provider with `action`, plugins.add("lopecode_commands", provider, {invalidation}).
// Scroller copied from @tomlarkworthy/lopecode-live-2026._cite: el.closest('.lp2-pane') ?? document.scrollingElement.
const SOLUTION = String.raw`const _intro = function intro(md){return(
md` + "`" + String.raw`# My palette commands` + "`" + String.raw`
)};
const _myCommands = function myCommands(plugins, runtime, invalidation){
  const TOOLING = /^@tomlarkworthy\//;
  const countWords = () => {
    let total = 0;
    for (const v of runtime._variables) {
      const mod = v._module;
      const name = [...globalThis.__ojs_runtime.mains].find(([, m]) => m === mod)?.[0];
      if (!name || TOOLING.test(name) || name === "@user/my-palette") continue;
      if (!(v._inputs || []).some(i => i._name === "md")) continue;
      const m = String(v._definition).match(/md\x60([\s\S]*)\x60/);
      total += ((m ? m[1] : "").match(/\S+/g) || []).length;
    }
    return total;
  };
  const scrollToTop = () => {
    for (const pane of document.querySelectorAll(".lp2-pane")) pane.scrollTo({ top: 0, behavior: "smooth" });
    document.scrollingElement.scrollTo({ top: 0, behavior: "smooth" });
  };
  const provider = (query) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return [];
    const out = [];
    if ("word count".includes(q) || q.includes("word")) out.push({ label: "Word count", action: () => window.alert(countWords() + " words in the markdown cells"), score: 1000 });
    if ("scroll to top".includes(q) || q.includes("scroll")) out.push({ label: "Scroll to top", action: scrollToTop, score: 1000 });
    return out;
  };
  plugins.add("lopecode_commands", provider, { invalidation });
  return "registered";
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_myCommands", "myCommands", ["plugins", "runtime", "invalidation"], _myCommands);
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  return main;
}
`;

export default {
  id: "rc5t-palette-commands",
  category: "rc5-train",
  question: "Add two commands to the Cmd+K command palette: \"Word count\", which shows how many words are in the markdown cells of my notebook, and \"Scroll to top\", which scrolls the page back to the top.",
  setup: { files: { "/src/@user/first-post.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "listed", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "wordCount", equals: true }, weight: 2 },
    // THE defect: window.scrollTo in a lopepage notebook moves nothing; the panes scroll
    { name: "collected_equals", args: { key: "scrolledTop", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "reopenedListed", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/scrolling-a-lopepage-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/my-palette.js", content: SOLUTION }, settleMs: 3000 },
  ],
};
