// rc5-train eval (20260929-0620-m62): cite a claim in paragraph 2 and add a references section at the end.
// setup.files seeds @user/essay. Its prose is adapted from @tomlarkworthy/lopecode-vision cells _3 and _5
// (lopecode/notebooks/@tomlarkworthy_lopecode-vision.html): paragraph 2 is the "polyglot literate programming"
// claim. Added where the original lacks them: a `viewof sizeMb` range read by an md hole in paragraph 3, and
// curly quotes in paragraphs 1, 3 and 4.
// Corpus citation idiom (for the oracle): `bibliography` object + `cite(key)` returning an author-year anchor +
// `references` <ol> with <li id="ref-key">, in @tomlarkworthy/lopecode-live-2026 (lopebooks
// tomlarkworthy_lopecode-live-2026.html) and tomlarkworthy_lopecode-newsletter-002.html.
// setup.collect scores:
//   marker        paragraph 2's rendered text gains one short insertion holding a number or "Knuth"/"1984"
//   p2Kept        paragraph 2 minus that insertion equals the original text (not reworded)
//   refsEntry     some other rendered cell lists Knuth, 1984, "Literate Programming", The Computer Journal
//   refsAtEnd     that cell is defined after the last essay cell (_p4), or is _p4 with the entry after its prose
//   markerMatches the marker links to the entry (href="#id"), or its number / author-year names the entry
//   untouched     the other prose and code cells are byte-equal in the saved source (curly quotes included)
//   holeLive      paragraph 3's ${sizeMb} hole still follows the range
//   reopened      after exportToHTML + boot in a sandboxed blob: iframe, paragraph 2 carries the marker and
//                 the entry is shown
// p2Kept/untouched/holeLive/refsAtEnd count only once a marker or an entry exists, so the unmodified
// module scores 0.

const MOD = "@user/essay";
const BT = "`";

const P1 = "Lopecode is a platform for building and sharing reactive, interactive computational media that can live forever. It’s forkable, self-contained, and build-free. It borrows the liveness and expressiveness of systems like Observablehq Notebooks, Smalltalk, HyperCard, Visual Basic, and Spreadsheets—but updates them with web-native technologies and a focus on long-term sustainability.";
const P2 = "Observable Notebooks evolved the spreadsheet and code. It provides instant preview without any setup and offers a searchable corpus of reusable examples. It offers a polyglot literate programming with support for a variety of different media types. Lopecode builds directly on this foundation—it reuses the Observable reactive runtime engine and shares much of its programming model and visual aesthetics.";
const P3 = "Lopecode notebooks are single static HTML files, typically around ${sizeMb} MB, that are simple to store and send. They contain all assets needed to run without network connectivity. The file’s own tooling re-exports it after you edit it, so there is no “build step” to lose.";
const P4 = "With Lopecode you build up a network of cooperating notebooks. Each is an orthogonal slice of the whole programming system: you can edit any code and see the results immediately, even the notebooks used to create the editing experience. That’s the sense in which the software is “immortal”.";
const TITLE = "# Designing Immortal Software";
const RANGE = `Inputs.range([1, 5], { step: 1, value: 3, label: "Typical file size (MB)" })`;

const FIXTURE = `const _title = function title(md){return(
md${BT}${TITLE}${BT}
)};
const _p1 = function p1(md){return(
md${BT}${P1}${BT}
)};
const _p2 = function p2(md){return(
md${BT}${P2}${BT}
)};
const _viewof_sizeMb = function viewof_sizeMb(Inputs){return(
${RANGE}
)};
const _sizeMb = function sizeMb(Generators, viewof_sizeMb){return(
Generators.input(viewof_sizeMb)
)};
const _p3 = function p3(md, sizeMb){return(
md${BT}${P3}${BT}
)};
const _p4 = function p4(md){return(
md${BT}${P4}${BT}
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_title", "title", ["md"], _title);
  $def("_p1", "p1", ["md"], _p1);
  $def("_p2", "p2", ["md"], _p2);
  $def("_viewof_sizeMb", "viewof sizeMb", ["Inputs"], _viewof_sizeMb);
  $def("_sizeMb", "sizeMb", ["Generators", "viewof sizeMb"], _sizeMb);
  $def("_p3", "p3", ["md", "sizeMb"], _p3);
  $def("_p4", "p4", ["md"], _p4);
  return main;
}
`;

// byte-equal in the saved source, whatever the agent does to the function headers
const KEEP = [TITLE, P1, P3, P4, RANGE, "Generators.input(viewof_sizeMb)"];

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = [...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== ${JSON.stringify(MOD)}); })()`;

// runs in the page and in the reopened iframe: find paragraph 2 and the entry among the user modules' elements
const ANALYSE = String.raw`function analyse(els, P2) {
  const norm = s => s.replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
  const P = norm(P2);
  const res = { marker: false, p2Kept: false, refsEntry: false, markerMatches: false };
  const p2el = els.find(e => e.textContent.includes("Observable Notebooks evolved the spreadsheet"));
  const isEntry = t => /Knuth/.test(t) && /1984/.test(t) && /literate programming/i.test(t) && /computer journal/i.test(t);
  const refEls = els.filter(e => e !== p2el && isEntry(e.textContent));
  res.refsEntry = refEls.length > 0;
  if (!p2el) { res.p2 = "missing"; return res; }
  const T = norm(p2el.textContent);
  res.p2Text = T.slice(0, 600);
  let i = 0; while (i < P.length && i < T.length && P[i] === T[i]) i++;
  let j = 0; while (j < P.length - i && j < T.length - i && P[P.length - 1 - j] === T[T.length - 1 - j]) j++;
  const ins = T.slice(i, T.length - j);
  const del = P.slice(i, P.length - j);
  res.inserted = ins; res.deleted = del;
  res.marker = del.trim() === "" && ins.trim().length > 0 && ins.trim().length <= 40 && /\d|Knuth/.test(ins);
  res.p2Kept = res.marker || T === P;
  if (!res.marker || !res.refsEntry) return res;
  const m = ins.trim();
  // 1. a link to an element that holds the entry
  const a = [...p2el.querySelectorAll("a[href^='#']")].find(a => m.includes(a.textContent.trim()) || a.textContent.trim().includes(m.replace(/[()\[\]]/g, "").trim()));
  const target = a && a.getAttribute("href").length > 1 && refEls.some(r => { try { const t = r.querySelector(a.getAttribute("href")) || (r.matches(a.getAttribute("href")) ? r : null); return t && /Knuth/.test(t.textContent); } catch { return false; } });
  // 2. author-year
  const authorYear = /Knuth/.test(m) && /1984/.test(m);
  // 3. numbered: the n-th <li> of an <ol>, or "[n]" / "n." just before Knuth
  let numbered = false;
  const n = (m.match(/\d+/) || [])[0];
  if (!authorYear && n) {
    for (const r of refEls) {
      for (const ol of r.querySelectorAll("ol")) { const li = ol.querySelectorAll(":scope > li")[Number(n) - (Number(ol.getAttribute("start")) || 1)]; if (li && /Knuth/.test(li.textContent)) numbered = true; }
      if (new RegExp("(\\[\\s*" + n + "\\s*\\]|(^|\\s)" + n + "[.)]|\\^?" + n + ")\\s*[^\\n]{0,12}Knuth").test(r.textContent)) numbered = true;
      const hit = [...r.querySelectorAll("[id]")].find(x => new RegExp("(^|\\D)" + n + "$").test(x.id) && /Knuth/.test(x.textContent));
      if (hit) numbered = true;
    }
  }
  res.markerHow = target ? "link" : authorYear ? "author-year" : numbered ? "number" : "none";
  res.markerMatches = !!(target || authorYear || numbered);
  return res;
}`;

const COLLECT = String.raw`(async () => {
  const MOD = ${JSON.stringify(MOD)};
  const P2 = ${JSON.stringify(P2)};
  const P4 = ${JSON.stringify(P4)};
  const KEEP = ${JSON.stringify(KEEP)};
  const analyse = ${ANALYSE};
  const rt = globalThis.__ojs_runtime;
  const base = new Set(globalThis.__rc5tBaseMods || []);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  let host = null;
  for (const m of rt.mains.values()) { const r = m && m._runtime; if (!r) continue;
    for (const v of r._variables) if (v._name === "rc5_host") { host = v._value; break; } if (host) break; }
  const files = host && host.snapshotFiles ? await host.snapshotFiles() : {};
  const src = files["/notebook/" + MOD + ".js"] || files["/src/" + MOD + ".js"] || "";
  out.srcFrom = files["/notebook/" + MOD + ".js"] ? "/notebook" : files["/src/" + MOD + ".js"] ? "/src" : "none";
  const userMods = [...rt.mains].filter(([n]) => !base.has(n)).map(([, m]) => m);
  out.userMods = [...rt.mains.keys()].filter(n => !base.has(n));
  const vars = () => [...rt._variables].filter(v => userMods.includes(v._module) && !String(v._name || "").startsWith("module ") && v._name !== "@variable");
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name ?? ""], x => x)); } catch {} }
  try {
    // force anonymous cells too
    for (const v of vars()) if (!v._name) { try { v._reachable = true; } catch {} }
    rt._computeNow && rt._computeNow();
    await sleep(2000);
    const els = () => vars().map(v => v._value).filter(e => e instanceof Element);
    Object.assign(out, analyse(els(), P2));
    const edited = out.marker || out.refsEntry;
    // clicking a linked marker must not replace lopepage's layout hash
    out.linkSafe = !!out.marker;
    { const p2el = els().find(e => e.textContent.includes("Observable Notebooks evolved the spreadsheet"));
      const a = p2el && [...p2el.querySelectorAll("a")].find(a => /\d|Knuth/.test(a.textContent));
      if (a && out.marker) {
        const before = location.hash;
        a.click(); await sleep(600);
        out.hashBefore = before.slice(0, 120); out.hashAfter = location.hash.slice(0, 120);
        out.linkSafe = !/view=/.test(before) || /view=/.test(location.hash);
        if (location.hash !== before) { history.replaceState(null, "", before || "#"); dispatchEvent(new HashChangeEvent("hashchange")); await sleep(600); }
      } }
    out.p2Kept = edited && out.p2Kept;
    // refs at the end: the entry's cell comes after _p4 in the saved $def order
    const order = [...src.matchAll(/\$def\(\s*"([^"]+)"/g)].map(m => m[1]);
    out.order = order;
    const p4i = order.indexOf("_p4");
    const entryVars = vars().filter(v => v._value instanceof Element && /Knuth/.test(v._value.textContent) && /1984/.test(v._value.textContent) && !v._value.textContent.includes("Observable Notebooks evolved the spreadsheet"));
    out.entryPids = entryVars.map(v => v.pid ?? null);
    out.refsAtEnd = edited && p4i >= 0 && entryVars.some(v => {
      const k = order.indexOf(v.pid);
      if (k > p4i) return true;
      if (k === p4i) { const t = v._value.textContent; return t.indexOf("Knuth") > t.indexOf("immortal"); }
      return false;
    });
    // untouched prose and code
    out.changed = KEEP.filter(k => !src.includes(k)).map(k => k.slice(0, 60));
    out.untouched = edited && out.changed.length === 0;
    // hole
    const range = els().flatMap(e => e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")])[0];
    const text = () => els().map(e => e.textContent).join(" | ").replace(/\s+/g, " ");
    if (!range) out.holeStage = "no range input";
    else {
      const set = async (x) => { range.value = String(x); range.dispatchEvent(new Event("input", { bubbles: true })); await sleep(800); };
      await set(5); const t5 = text(); await set(2); const t2 = text(); await set(3);
      out.holeLive = edited && /around 5 MB/.test(t5) && /around 2 MB/.test(t2) && !/around 5 MB/.test(t2);
    }
    out.holeLive = !!out.holeLive;
  } finally { for (const k of keepers) { try { k.delete(); } catch {} } }

  // save + reopen
  out.reopened = false;
  if (out.marker) try {
    const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    out.exportedBytes = html.length;
    const reporter = "<script>const __citeAnalyse = " + String(analyse) + ";(" + (async function (P2, base) {
      const analyse = __citeAnalyse;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = Date.now();
      let res = { marker: false, refsEntry: false };
      while (Date.now() - t0 < 14000) {
        await sleep(1000);
        const rt = globalThis.__ojs_runtime;
        if (!rt || !rt.mains || !rt.mains.size) continue;
        const mods = [...rt.mains].filter(([n]) => !base.includes(n)).map(([, m]) => m);
        const els = [];
        for (const m of mods) for (const v of [...rt._variables].filter(v => v._module === m)) {
          if (!v._name) { try { v._reachable = true; rt._computeSoon(); } catch {} }
          let x = v._value;
          if (v._name && !(x instanceof Element)) { try { x = await Promise.race([m.value(v._name), sleep(1500).then(() => undefined)]); } catch { x = undefined; } }
          if (x instanceof Element) els.push(x);
        }
        res = analyse(els, P2);
        res.mods = mods.length;
        if ((res.marker && res.refsEntry) || Date.now() - t0 > 12000) break;
      }
      parent.postMessage({ __citeProbe: res }, "*");
    }) + ")(" + JSON.stringify(P2) + "," + JSON.stringify([...base]) + ")<\/script>";
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    const got = new Promise(res => {
      addEventListener("message", e => { if (e.data && e.data.__citeProbe) res(e.data.__citeProbe); });
      setTimeout(() => res({ timeout: true }), 18000);
    });
    frame.src = url;
    document.body.appendChild(frame);
    out.reopenedDetail = await got;
    frame.remove();
    out.reopened = !!(out.reopenedDetail.marker && out.reopenedDetail.refsEntry);
  } catch (e) { out.reopenError = String(e && e.message || e); }
  return out;
})()`;

export const CRITERIA = [
  // THE ask: a marker in paragraph 2's rendered text
  { name: "collected_equals", args: { key: "marker", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "refsEntry", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "markerMatches", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "refsAtEnd", equals: true }, weight: 1 },
  // a linked marker keeps the lopepage layout when clicked (href="#ref-x" replaces the whole #view=… hash)
  { name: "collected_equals", args: { key: "linkSafe", equals: true }, weight: 1 },
  // the user's words: paragraph 2 not reworded, other cells byte-equal, the hole still live
  { name: "collected_equals", args: { key: "p2Kept", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "untouched", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "holeLive", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 2 },
  // the tool must not tell the agent to "FIX" the compiled viewof reader `function sizeMb(Generators, viewof_sizeMb)`
  // (base: "parameter viewof_sizeMb is bound to input viewof sizeMb … FIX before task_complete" on every write)
  { name: "no_tool_result_matches", args: { pattern: "parameter (viewof|mutable)_\\w+ is bound to input (viewof|mutable) " }, weight: 1 },
];

// Oracle: the corpus idiom, copied from @tomlarkworthy/lopecode-newsletter-002 cite / bibliography
// (lopebooks tomlarkworthy_lopecode-newsletter-002.html) and @tomlarkworthy/lopecode-live-2026 references.
// href="#" + onclick scrollIntoView: lopepage owns the hash, so href="#ref-…" would replace the layout.
const ORACLE_CELLS = `const _bibliography = function bibliography(){return({
  knuth1984: {
    label: 'Knuth 1984',
    authors: 'Knuth, D. E.',
    year: 1984,
    title: 'Literate Programming',
    venue: 'The Computer Journal, 27(2), 97–111',
    url: 'https://doi.org/10.1093/comjnl/27.2.97'
  }
})};
const _cite = function cite(bibliography, htl){return((key) => {
  const e = bibliography[key];
  if (!e) return htl.html${BT}<strong style="color:#c96a6a">[missing ref: \${key}]</strong>${BT};
  return htl.html${BT}<a
    href="#"
    title="\${e.authors} (\${e.year}). \${e.title}. \${e.venue}."
    onclick=\${(ev) => { ev.preventDefault(); document.getElementById(${BT}ref-\${key}${BT})?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
  >[\${e.label}]</a>${BT};
})};
const _refsh = function refsh(md){return(
md${BT}## References${BT}
)};
const _references = function references(bibliography, htl){return(
htl.html${BT}<ol>\${Object.entries(bibliography).map(([key, e]) => htl.html${BT}<li id="ref-\${key}">\${e.authors} (\${e.year}). <a href=\${e.url}><em>\${e.title}</em></a>. \${e.venue}.</li>${BT})}</ol>${BT}
)};
`;

const replaceOnce = (s, a, b) => { if (s.split(a).length !== 2) throw new Error("cite eval: not exactly one " + JSON.stringify(a)); return s.replace(a, () => b); };

export const ORACLE_SRC = [
  ["It offers a polyglot literate programming with support for a variety of different media types.", "It offers a polyglot literate programming with support for a variety of different media types ${cite('knuth1984')}."],
  ["const _p2 = function p2(md){return(", "const _p2 = function p2(md, cite){return("],
  ['$def("_p2", "p2", ["md"], _p2);', '$def("_p2", "p2", ["md", "cite"], _p2);'],
  ["export default function define", ORACLE_CELLS + "export default function define"],
  ['  return main;', '  $def("_refsh", null, ["md"], _refsh);\n  $def("_references", "references", ["bibliography", "htl"], _references);\n  $def("_bibliography", "bibliography", [], _bibliography);\n  $def("_cite", "cite", ["bibliography", "htl"], _cite);\n  return main;'],
].reduce((s, [a, b]) => replaceOnce(s, a, b), FIXTURE);

export { FIXTURE, MOD, INIT, COLLECT, P2, replaceOnce, ORACLE_CELLS };

export default {
  id: "rc5t-cite-knuth",
  category: "rc5-train",
  question: "Add a citation for the claim in my second paragraph to Donald Knuth's \"Literate Programming\" (The Computer Journal, 1984), and add a references section at the end of the notebook.",
  setup: { files: { ["/src/" + MOD + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: CRITERIA,
  oracle: [
    { tool: "read_file", args: { file_path: "/src/" + MOD + ".js" } },
    { tool: "write_file", args: { file_path: "/src/" + MOD + ".js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
