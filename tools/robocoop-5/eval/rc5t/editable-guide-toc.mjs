// rc5-train eval (20260928-0847-w1): "a document I can edit in place" built with the builtin md.
// In run 20260928-0847-w1-before the agent wrote @user/robocoop-5-guide with the stdlib `md` and told the
// user "you can edit /src/@user/robocoop-5-guide.js in place". Clicking the rendered text does nothing.
// It never read important-modules.md, whose index title says "documents" but not "edit in place".
// @tomlarkworthy/editable-md is the published module for this.
//
// Behavioural check, so any in-place editor passes: setup.collect opens every module created during the
// turn in a pane, requires a title (h1), a contents cell with links to >= 3 section headings, then
//   1. clicks the contents cell's text, requires an editor to open, commits it unchanged (Shift+Enter),
//   2. clicks a section's paragraph, types a word, commits, requires the cell's definition to carry it,
//   3. clicks each contents link and requires the pane layout to survive and the heading to be on screen.
// Step 1 before step 3 catches an editor that drops `${linkTo(...)}` link-target holes on a round trip.

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

export const COLLECT = String.raw`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = () => [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars().length) return "no module was created";
  const mods = [...new Set(userVars().map(v => v._module))];
  const idOf = m => { for (const [k, v] of globalThis.__ojs_runtime.mains) if (v === m) return k; return null; };
  const ids = mods.map(idOf).filter(Boolean);
  if (!ids.length) return "created module has no id in mains";
  const LAYOUT = "#view=R100(S60(" + ids[0] + "),S40(@tomlarkworthy/robocoop-5))";
  const go = h => { history.pushState(null, "", h); dispatchEvent(new HashChangeEvent("hashchange")); };
  go(LAYOUT);
  await sleep(2500);
  const els = () => userVars().filter(v => v._value instanceof Element && v._value.isConnected);
  const norm = s => String(s).replace(/^[\s\d.)\-–—:]+/, "").replace(/\s+/g, " ").trim().toLowerCase();
  const find = () => {
    const title = els().find(v => v._value.querySelector("h1") || v._value.matches("h1"));
    const heads = els().flatMap(v => [...v._value.querySelectorAll("h2,h3")].map(h => ({ v, h })));
    const tocV = els().find(v => {
      const as = [...v._value.querySelectorAll("a[href]")];
      return heads.filter(x => x.v !== v && as.some(a => norm(a.textContent) && norm(x.h.textContent).includes(norm(a.textContent)))).length >= 3;
    });
    if (!tocV) return { title };
    const links = [...tocV._value.querySelectorAll("a[href]")].map(a => ({ a, x: heads.find(x => x.v !== tocV && norm(a.textContent) && norm(x.h.textContent).includes(norm(a.textContent))) })).filter(p => p.x);
    return { title, tocV, links };
  };
  let f = find();
  if (!f.title) return "no title (h1) rendered by the created module";
  if (!f.tocV) return "no contents cell linking to 3 section headings; headings: " + JSON.stringify(els().flatMap(v => [...v._value.querySelectorAll("h2,h3")].map(h => h.textContent.trim().slice(0, 40))));
  const editorIn = el => el.querySelector("[contenteditable=true], textarea, .cm-editor");
  const openEditor = async (v, target) => {
    target.click();
    for (let i = 0; i < 20; i++) { await sleep(150); if (v._value.isConnected && editorIn(v._value)) return editorIn(v._value); }
    return null;
  };
  const commit = async (ed) => {
    ed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    await sleep(1500);
  };
  // 1. contents cell: open and commit unchanged
  const tocEl = f.tocV._value;
  const tocText = [...tocEl.querySelectorAll("h1,h2,h3,h4,p,li,strong")].find(e => !e.closest("a") && !e.querySelector("a") && e.textContent.trim()) ||
    [...tocEl.querySelectorAll("li")].find(e => e.firstChild && e.firstChild.nodeType === 3) || tocEl;
  const ed1 = await openEditor(f.tocV, tocText);
  if (!ed1) return "clicking the contents text opened no editor: the document is not editable in place";
  await commit(ed1);
  // 2. a section paragraph: type a word, commit, require it in the cell's definition
  f = find();
  if (!f.tocV) return "after editing the contents cell in place it no longer links to 3 sections";
  const secV = f.links[0].x.v;
  const para = secV._value.querySelector("p") || secV._value;
  const ed2 = await openEditor(secV, para);
  if (!ed2) return "clicking section text opened no editor";
  ed2.focus();
  const sel = getSelection(); const r = document.createRange();
  const lastP = [...ed2.querySelectorAll("p")].pop() || ed2; r.selectNodeContents(lastP); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
  document.execCommand("insertText", false, " Zebrafinch42.");
  await sleep(300);
  await commit(ed2);
  if (!String(secV._definition).includes("Zebrafinch42")) return "an in-place edit of a section was not written into the cell's source";
  // 3. contents links scroll within the lopepage layout
  go(LAYOUT);
  await sleep(1500);
  f = find();
  if (!f.tocV) return "contents cell lost its links after the edits";
  for (const { a, x } of f.links.slice(0, 3)) {
    const href = a.getAttribute("href");
    if (/^https?:/i.test(href || "")) return "contents link " + JSON.stringify(a.textContent) + " points off the page: " + href;
    go(LAYOUT); await sleep(800);
    const g = find(); const p = g.links && g.links.find(q => q.a.textContent === a.textContent);
    if (!p) return "contents link " + JSON.stringify(a.textContent) + " vanished";
    p.a.scrollIntoView({ block: "start" }); await sleep(200);
    p.a.click(); await sleep(1500);
    const hash = decodeURIComponent(location.hash);
    if (!hash.includes("view=")) return "clicking " + JSON.stringify(a.textContent) + " (href " + href + ") lost the pane layout: " + JSON.stringify(location.hash.slice(0, 120));
    const h = find().links?.find(q => q.a.textContent === a.textContent)?.x.h || p.x.h;
    const t = h.getBoundingClientRect().top;
    if (!(t >= -5 && t < innerHeight - 40)) return "clicking " + JSON.stringify(a.textContent) + " (href " + href + ") did not bring its heading on screen: top " + Math.round(t) + "px of " + innerHeight;
  }
  return "ok";
})()`;

const ID = "@user/guide";
const link = n => "${linkTo('" + ID + "#" + n + "', { onObservable: false })}";
export const solution = (mdImport) => `const _title = function title(md){return(
md\`# Guide\`
)};
const _contents = function contents(md,linkTo){return(
md\`## Contents

1. [Getting started](${link("getting_started")})
2. [Settings](${link("settings")})
3. [Saving](${link("saving")})\`
)};
const _getting_started = function getting_started(md){return(
md\`## Getting started

Type a message in the chat and press Enter. The agent reads the notebook and replies.\`
)};
const _settings = function settings(md){return(
md\`## Settings

Open the settings panel to choose a model and enter an API key.\`
)};
const _saving = function saving(md){return(
md\`## Saving

Save the notebook to keep your changes. The file carries everything it needs.\`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_contents", "contents", ["md","linkTo"], _contents);
  $def("_getting_started", "getting_started", ["md"], _getting_started);
  $def("_settings", "settings", ["md"], _settings);
  $def("_saving", "saving", ["md"], _saving);
  ${mdImport}
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  return main;
}
`;

export const OBS_IMPORT = `main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));`;
export const PDS_IMPORT = `main.define("module @tomlarkworthy/editable-md", async () => "@tomlarkworthy/editable-md" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji")).default));`;

export default {
  id: "rc5t-editable-guide-toc",
  category: "rc5-train",
  question: "Write a short user guide for this notebook as a document I can edit in place: a title, three sections, and a table of contents that links to each section.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    // the defect: builtin md, so clicking the text opens no editor
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/important-modules.md" } },
    { tool: "write_file", args: { file_path: "/src/" + ID + ".js", content: solution(OBS_IMPORT) }, settleMs: 4000 },
  ],
};
