// rc5-train eval (20260929-0620-m64): "Export my notebook's writing as a markdown file I can download."
// setup.files seeds @user/bitcoin-energy, the prose of @tomlarkworthy/bitcoin-energy
// (lopebooks/notebooks/@tomlarkworthy_bitcoin-energy.html): headings, a link, an image, and the
// "about 0.4% of worldwide consumption" argument. Seeded where the original lacks them: the image is an
// https URL (the original is a FileAttachment), the three estimates the prose quotes are also a list and a
// table, the share is an inline ${share} hole over a code cell, and the estimates are a Plot bar chart.
//
// setup.collect acts as the user. It looks in @user/bitcoin-energy and every module created during the
// turn for a control labelled download/export/markdown/save, clicks it, intercepts the offered file
// (an <a download> clicked in or out of the document) and reads its text.
//   downloads    - a file is offered
//   isMarkdown   - named *.md and not HTML: no <h1>/<p>/<ul>/<table>/<a href>, no &lt; entities
//   headings     - the four headings, as ATX headings at their levels (# / ##)
//   list         - the three estimates as list items
//   links        - [HN](…) link and ![…](https://…) image as markdown
//   table        - a pipe table: header row, --- separator, a row with 87.1
//   interpolated - the hole's current rendered value "0.396%"; no "${", no "[object"
//   cellsHandled - the chart and code cells are omitted, or inside ``` fences, or the chart is an image
//                  link: outside fences there is no <svg, no Plot./=> source, no chart axis text
//                  ("Annual electricity"), no raw estimates data ({source: …})
//   tracksEdits  - after the turn the collect redefines hashRateText with new prose (as an edit in the
//                  editor does) and downloads again: the new sentence is there and the old one gone. A
//                  file assembled from a copy of the prose passes every other check and fails this one
//                  (run 20260929-0620-m64 base: the agent pasted the four md cells' text into a string
//                  cell and imported only `share`).
//   ownOnly      - the file holds this notebook only: none of the tooling modules' text (robocoop,
//                  lopepage, markdown-wiki, …) and under 12000 characters (the fixture's prose is ~1300)
// Any correct build passes: the control can live in the fixture or a new module, the markdown can come
// from the rendered md cells or from their source with the holes evaluated, heading/list markers and
// table alignment can vary.

const FIX = "@user/bitcoin-energy";

const FIXTURE = String.raw`const _intro = function _intro(md){return(
md` + "`" + String.raw`# Bitcoin Energy Use

Some people think Bitcoin is an ecological disaster. Other people think the ecological case is overblown ([HN](https://news.ycombinator.com/item?id=25881088)).

I feel the root of the problem is scale. How much electricity does Bitcoin burn, relative to how much electricity in general we have?` + "`" + String.raw`
)};
const _hashRateText = function _hashRateText(md){return(
md` + "`" + String.raw`## Hash Rate over time

The network hashrate is how much computation is being performed and is recorded publicly on the blockchain.

![Network hash rate](https://www.blockchain.com/charts/hash-rate.png)` + "`" + String.raw`
)};
const _estimatesText = function _estimatesText(md){return(
md` + "`" + String.raw`## Realistic energy usage

Estimates of the electricity Bitcoin uses in a year:

- de Vries (2019), a market dynamics approach: 87.1 TWh
- Statista (2020), levelling off: 80 TWh
- the best available ASICs mining the recorded hash rate: about 10x less

| Source | TWh per year |
| --- | --- |
| de Vries 2019 | 87.1 |
| Statista 2020 | 80 |
| Optimal ASICs | 8.7 |` + "`" + String.raw`
)};
const _estimates = function _estimates(){return(
[{source: "de Vries 2019", twh: 87.1}, {source: "Statista 2020", twh: 80}, {source: "Optimal ASICs", twh: 8.7}]
)};
const _chart = function _chart(Plot,estimates){return(
Plot.plot({marginLeft: 110, x: {label: "Annual electricity (TWh)"}, marks: [Plot.barX(estimates, {x: "twh", y: "source", fill: "steelblue"}), Plot.ruleX([0])]})
)};
const _share = function _share(estimates){return(
(estimates[0].twh / 22000 * 100).toFixed(3)
)};
const _worldText = function _worldText(md,share){return(
md` + "`" + String.raw`## Worldwide electricity usage

Worldwide energy consumption for *everything* is in the order of 22,000 TWh, thus Bitcoin is around ${"${"}share}% of worldwide consumption.` + "`" + String.raw`
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_hashRateText", "hashRateText", ["md"], _hashRateText);
  $def("_estimatesText", "estimatesText", ["md"], _estimatesText);
  $def("_estimates", "estimates", [], _estimates);
  $def("_chart", "chart", ["Plot", "estimates"], _chart);
  $def("_share", "share", ["estimates"], _share);
  $def("_worldText", "worldText", ["md", "share"], _worldText);
  return main;
}
`;

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const FIX = "@user/bitcoin-energy";
  const mains = globalThis.__ojs_runtime.mains;
  const rt = [...mains.values()].find(m => m && m._runtime)._runtime;
  const fixMod = mains.get(FIX);
  const out = { downloads: false, isMarkdown: false, headings: false, list: false, links: false, table: false, interpolated: false, cellsHandled: false, ownOnly: false, tracksEdits: false, why: [] };
  const isUser = v => (v._module === fixMod || !globalThis.__rc5tBefore.has(v._module)) && v._type === 1 && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable";
  const users = () => [...rt._variables].filter(isUser);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of users()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  await sleep(800);
  const els = () => users().map(v => v._value).filter(x => x instanceof Element);
  const all = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;z-index:99999;background:#fff";
  document.body.appendChild(host);
  const files = [];
  const record = a => {
    if (!(a && a.hasAttribute && a.hasAttribute("download") && a.href)) return;
    const f = { href: a.href, name: a.download || a.getAttribute("download") };
    f.blob = fetch(a.href).then(r => r.blob()).catch(e => { f.err = String(e); return null; });
    files.push(f);
  };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { record(this); };
  const onDocClick = e => { const a = e.composedPath().find(n => n instanceof HTMLAnchorElement && n.hasAttribute("download")); if (a) { e.preventDefault(); record(a); } };
  document.addEventListener("click", onDocClick, true);
  const label = b => (b.textContent || b.value || b.title || b.getAttribute("aria-label") || "").trim();
  const controls = () => [...all("button"), ...all("a[download]"), ...all("input[type=button]")];
  const dlBtn = () => controls().find(b => /download|export|markdown|\.md\b|save/i.test(label(b)) || (b.matches("a[download]") && /\.md$/i.test(b.getAttribute("download") || "")));
  try {
    for (const x of els()) if (!x.isConnected) host.appendChild(x);
    if (!dlBtn()) { out.why.push("no download control (controls: " + JSON.stringify(controls().map(label).map(s => s.slice(0, 30))) + ")"); return out; }
    const download = async () => {
      const n = files.length;
      for (let k = 0; k < 2 && files.length === n; k++) {
        for (const x of els()) if (!x.isConnected) host.appendChild(x);
        const b = dlBtn(); if (!b) return null;
        b.click();
        for (let t = 0; t < 30 && files.length === n; t++) await sleep(100);
      }
      return files.length > n ? files[files.length - 1] : null;
    };
    const f = await download();
    const b = dlBtn() || { textContent: "?" };
    out.downloads = !!f;
    if (!f) { out.why.push("clicking " + JSON.stringify(label(b)) + " offered no file"); return out; }
    const blob = await f.blob;
    if (!blob) { out.downloads = false; out.why.push("the offered href could not be read: " + f.err); return out; }
    const text = await blob.text();
    out.name = f.name; out.chars = text.length; out.head = text.slice(0, 400);
    const prose = text.replace(/^(\x60{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
    out.isMarkdown = /\.(md|markdown)$/i.test(f.name || "") && !/<(h[1-6]|p|ul|ol|li|table|tr|td|div)\b[^>]*>|<a\s+href|&lt;|&gt;/i.test(prose);
    if (!out.isMarkdown) out.why.push("not markdown: name " + JSON.stringify(f.name) + ", html in text: " + JSON.stringify((prose.match(/<(h[1-6]|p|ul|ol|li|table|tr|td|div)\b[^>]*>|<a\s+href|&lt;|&gt;/i) || [""])[0]));
    const hs = [/^#\s+Bitcoin Energy Use\s*$/m, /^##\s+Hash Rate over time\s*$/m, /^##\s+Realistic energy usage\s*$/m, /^##\s+Worldwide electricity usage\s*$/m];
    out.headings = hs.every(r => r.test(prose));
    if (!out.headings) out.why.push("headings missing: " + hs.filter(r => !r.test(prose)).map(String).join(" "));
    const li = [/^\s*([-*+]|\d+[.)])\s+de Vries \(2019\)/m, /^\s*([-*+]|\d+[.)])\s+Statista \(2020\)/m, /^\s*([-*+]|\d+[.)])\s+the best available ASICs/m];
    out.list = li.every(r => r.test(prose));
    if (!out.list) out.why.push("list items missing: " + li.filter(r => !r.test(prose)).map(String).join(" "));
    const link = /\[HN\]\(https:\/\/news\.ycombinator\.com\/item\?id=25881088\)/.test(prose);
    const img = /!\[[^\]]*\]\(https:\/\/www\.blockchain\.com\/charts\/hash-rate\.png\)/.test(prose);
    out.links = link && img;
    if (!out.links) out.why.push("link " + link + " image " + img);
    const lines = prose.split("\n").map(s => s.trim());
    const hi = lines.findIndex(s => /^\|?\s*Source\s*\|\s*TWh per year\s*\|?$/.test(s));
    out.table = hi >= 0 && /^\|?\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|?$/.test(lines[hi + 1] || "") && lines.slice(hi + 2, hi + 6).some(s => /^\|?\s*de Vries 2019\s*\|\s*87\.1\s*\|?$/.test(s));
    if (!out.table) out.why.push("pipe table not found" + (hi >= 0 ? " (header at line " + hi + ", next " + JSON.stringify(lines[hi + 1]) + ")" : ""));
    out.interpolated = /around 0\.396% of worldwide/.test(prose) && !/\$\{/.test(prose) && !/\[object /.test(text);
    if (!out.interpolated) out.why.push("interpolation: " + JSON.stringify((prose.match(/Bitcoin is around[^\n]{0,40}/) || ["<sentence missing>"])[0]));
    const leaks = [/<svg/i, /\bPlot\./, /=>/, /Annual electricity/, /\{\s*"?source"?\s*:/, /\[object /];
    out.cellsHandled = leaks.every(r => !r.test(prose));
    if (!out.cellsHandled) out.why.push("chart/code outside a fence: " + leaks.filter(r => r.test(prose)).map(String).join(" "));
    const tooling = /robocoop|lopepage|markdown-wiki|save-in-place|module-selection|command-palette|exporter-3|claude-code-pairing/i;
    out.ownOnly = !tooling.test(text) && text.length < 12000;
    if (!out.ownOnly) out.why.push("tooling text or oversize: " + text.length + " chars, " + JSON.stringify((text.match(tooling) || [""])[0]));
    // the user edits a paragraph after the turn; a new download must carry the edit
    const v = [...rt._variables].find(x => x._module === fixMod && x._name === "hashRateText");
    if (!v) { out.why.push("hashRateText cell not found in " + FIX); return out; }
    v.define("hashRateText", ["md"], new Function("md", "return md\x60## Hash Rate over time\n\nEdited after the export: miners report the hash rate 7Q.\x60"));
    await sleep(1500);
    const g = await download();
    const t2 = g && await (await g.blob)?.text?.();
    out.tracksEdits = !!t2 && /Edited after the export: miners report the hash rate 7Q\./.test(t2) && !/is recorded publicly on the blockchain/.test(t2);
    if (!out.tracksEdits) out.why.push(!g ? "second click offered no file" : "after editing hashRateText the download still reads " + JSON.stringify((t2.match(/## Hash Rate over time\s*\n+[^\n]*/) || [""])[0].slice(0, 160)));
    return out;
  } finally {
    HTMLAnchorElement.prototype.click = origClick;
    document.removeEventListener("click", onDocClick, true);
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

// The click-time Blob + <a download> is @tomlarkworthy/suminagashi._download
// (lopebooks/notebooks/@tomlarkworthy_suminagashi.html). No corpus cell converts rendered markdown back to
// markdown (turndown / toMarkdown / htmlToMarkdown: 0 files), so the walker below has no precedent.
export const DOWNLOAD_CELL = String.raw`const _download = function _download(html,intro,hashRateText,estimatesText,worldText){return(
(() => {
  const inline = n => [...n.childNodes].map(c => {
    if (c.nodeType === 3) return c.textContent;
    if (c.nodeType !== 1) return "";
    const t = c.tagName.toLowerCase(), s = inline(c);
    if (t === "a") return "[" + s + "](" + c.getAttribute("href") + ")";
    if (t === "img") return "![" + (c.getAttribute("alt") || "") + "](" + c.getAttribute("src") + ")";
    if (t === "em" || t === "i") return "*" + s + "*";
    if (t === "strong" || t === "b") return "**" + s + "**";
    if (t === "code") return "\x60" + s + "\x60";
    return s;
  }).join("");
  const block = c => {
    const t = c.tagName.toLowerCase();
    if (/^h[1-6]$/.test(t)) return "#".repeat(+t[1]) + " " + inline(c).trim();
    if (t === "ul" || t === "ol") return [...c.children].map((li, i) => (t === "ul" ? "- " : (i + 1) + ". ") + inline(li).trim()).join("\n");
    if (t === "table") {
      const rows = [...c.rows].map(r => "| " + [...r.cells].map(x => inline(x).trim()).join(" | ") + " |");
      return [rows[0], "| " + [...c.rows[0].cells].map(() => "---").join(" | ") + " |", ...rows.slice(1)].join("\n");
    }
    if (t === "pre") return "\x60\x60\x60\n" + c.textContent.replace(/\n$/, "") + "\n\x60\x60\x60";
    return inline(c).trim();
  };
  const blocks = el => (el instanceof HTMLDivElement ? [...el.children] : [el]).map(block).join("\n\n");
  const button = html${"`"}<button>Download markdown</button>${"`"};
  button.onclick = () => {
    const text = [intro, hashRateText, estimatesText, worldText].map(blocks).join("\n\n") + "\n";
    const link = html${"`"}<a download="bitcoin-energy.md" href=${"$"}{URL.createObjectURL(new Blob([text], {type: "text/markdown"}))}>${"`"};
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return button;
})()
)};
`;

export const SOLUTION = FIXTURE.replace("export default function define", DOWNLOAD_CELL + "export default function define")
  .replace("  return main;\n}", "  $def(\"_download\", \"download\", [\"html\", \"intro\", \"hashRateText\", \"estimatesText\", \"worldText\"], _download);\n  return main;\n}");

export const criteria = [
  { name: "collected_equals", args: { key: "downloads", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "isMarkdown", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "headings", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "list", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "links", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "table", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "interpolated", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "cellsHandled", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "ownOnly", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "tracksEdits", equals: true }, weight: 2 },
];

export default {
  id: "rc5t-markdown-download",
  category: "rc5-train",
  question: "Export my notebook's writing as a markdown file I can download.",
  setup: { files: { ["/src/" + FIX + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria,
  oracle: [
    { tool: "write_file", args: { file_path: "/src/" + FIX + ".js", content: SOLUTION }, settleMs: 2000 },
  ],
};
