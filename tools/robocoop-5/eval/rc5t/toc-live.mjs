// rc5-train eval (20260929-0620-m61): a table of contents that stays up to date.
// "Add a table of contents at the top of my notebook that links to each section and stays up to date when
// I add a new heading." Extends rc5t-toc-links-lopepage (links keep the lopepage layout) and
// rc5t-editable-guide-toc (contents of a new document); the new part is the user adding a heading AFTER
// the turn.
//
// setup.files seeds @user/vision: 11 md cells of @tomlarkworthy/lopecode-vision
// (lopebooks/notebooks/@tomlarkworthy_lopecode-vision.html; cells _1 _3 _4 _5 _7 _8 _9 _11 _12 _13 _14),
// all anonymous as in the original. Changed from the original: the builtin md instead of editable-md, and
// the `url(...)` holes of _5 are plain observablehq.com links. Headings below the title: h2 Overview,
// h2 What Lopecode Is, h3 Relationship to Observable, h2 Lopecode Features, h2 Why Durability Matters with
// four h3, h2 What I'm Exploring, h1 Research Areas and three h2.
//
// setup.collect opens @user/vision in a pane (#view=R100(S60(@user/vision),S40(@tomlarkworthy/robocoop-5)))
// and scores:
//   toc          an element in the pane holds links to >= 3 of the headings and precedes every section
//                heading (the title h1 may come before it)
//   listsAll     a link for every heading below the title
//   order        the links are in the headings' document order
//   levels       h1 entries are indented less than h2 entries, h2 less than h3 (link x position or
//                list nesting depth)
//   addedListed  the collect then adds a cell at the end of @user/vision the way editor-5 does
//                (module.variable({}) with a pid, md`## Further reading …`); within 3 s the TOC has a link for
//                it, after the other entries. A TOC typed as a copy of today's headings fails here.
//   clickScrolls for an h3, a late h2 and the added heading: scroll the pane to the top, click the entry;
//                the heading ends in the top half of the pane (the pane is the scroll container, m45)
//   layoutKept   those clicks leave location.hash's layout unchanged (a linkTo deep-link suffix
//                "@user/vision#cell" is allowed) and do not scroll the window
//   reopened     exportToHTML, boot the file in a sandboxed iframe with the same layout: the TOC lists every
//                heading including "Further reading"
// Negative controls in controls.mjs: the unmodified fixture, a hand-typed TOC (fails addedListed and
// reopened), a live TOC whose links call window.scrollTo (fails clickScrolls).

const M = "@user/vision";

const FIXTURE = "const _1f8i73v = function _1(md){return(\nmd`# Designing Immortal Software: [A Vision for Lopecode](https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_lopecode-vision.html)\n`\n)};\nconst _eprdhc = function _3(md){return(\nmd`\n---\n\n## Overview\n\nLopecode is a platform for building and sharing reactive, interactive computational media that can live forever. It\u2019s forkable, self-contained, and build-free. It borrows the liveness and expressiveness of systems like Observablehq Notebooks, Smalltalk, HyperCard, Visual Basic, and Spreadsheets\u2014but updates them with web-native technologies and a focus on long-term sustainability.\n\n\n---\n`\n)};\nconst _wfyjci = function _4(md){return(\nmd`## What Lopecode Is\n`\n)};\nconst _1sl2j9l = function _5(md){return(\nmd`\n### Relationship to Observable\n\nObservable Notebooks evolved the spreadsheet and code. It provides instant preview without any setup and offers a searchable corpus of reusable examples. It offers a polyglot literate programming with support for a variety of different media types. Lopecode builds directly on this foundation\u2014it reuses the [Observable reactive runtime engine](https://github.com/observablehq/runtime) and shares much of its programming model and visual aesthetics. Existing Observable notebook can be translated into Lopecode documents with [Jumpgate](https://observablehq.com/@tomlarkworthy/jumpgate#view=S100%28%40tomlarkworthy%2Fmodule-selection%29).\n\nWhere Lopecode diverges is in its focus on durability, malleability, and whole-runtime composition:\n\n- **Offline-first and Durable**: Lopecode notebooks are single static HTML files that are simple to store and send, that contain all assets needed to run without network connectivity.\n- **Multi-Notebook and Reflective by Default**: Observable focuses on a single notebook at a time. Lopecode supports multiple notebooks open simultaneously, communicating on the shared reactive runtime that supports self-reflection. This encourages modular design and enables global metaprogramming capabilities.\n  For example\n    - a **[testing notebook](https://observablehq.com/@tomlarkworthy/reactive-reflective-testing)** can scan the entire runtime for tests and generate unified test results across the aggregate.\n    - a **[debugging notebook](https://observablehq.com/@tomlarkworthy/debugger)** can generate a time series of all cell transitions across notebooks, helping debug interdependencies.\n    - an **[editor notebook](https://observablehq.com/@tomlarkworthy/editor-3)** enabled in-place mutation of other cells in any other notebook\n    - an **[LLM](https://observablehq.com/@tomlarkworthy/robocoop)** notebook can help explain how things work and help fix bugs and apply software modifications.\n- **Application Data Support**: Observable supports binary files through file attachments, however, they are strictly read-only. Lopecode goes beyond by offering userspace code to write back. Updated file attachments are re-serialized when exporting, enabling persistent application state to be continued and shared. For example, the [audio sequencer app](https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_sequencer.html).\n- ** No setup **: Most programming languages need a runtime to work, which adds friction. Observable's own export format is a zip of files that require a webserver to run locally. Local web servers are often needed because a HTML file served from a file domain is unable to make cross-origin request to static assets hosted relatively. Lopecode solves this by inlining all assets into a single file so no cross-origin requests are ever executed. If you want to understand the file format in more detail check out the [exporter](https://observablehq.com/@tomlarkworthy/exporter) notebook.\n\nWith Lopecode you build up a network of cooperating notebooks that collaborate. Each is a orthogonal literate programming slice of the whole programming system, you can edit any code and see the results immediately, even the notebooks used to create the editing experience.\n`\n)};\nconst _1vwiujk = function _7(md){return(\nmd`## Lopecode Features\n\nTo clarify the scope and implementation of Lopecode, here is a breakdown of its concrete features:\n\n- **Modular Reactive Notebooks**: built-in reactivity and componentized structure\n- **Live Interdependencies**: cells can reference and respond to changes in one another\n- **Namespaces**: scope cells into modules for clean organization\n- **Self-reflection**: cells have access to the runtime and can iterate and inspect other cells programatically.\n- **Meta programming**: cells can rewrite and create new cells programatically.\n- **Hypertext interface**: native support for hyperlinking between cell dependancies within the serialized graph\n- **Literate programming**: first class support for markdown, HTML, d3 cells for documentation, with programatic interpolation from live runtime values.\n- **Self-hosted**: no need for cloud services or remote runtimes, works from a \\`file://\\` domain\n- **Internal IDE**: fully featured notebook editor embedded in the platform\n- **Offline-first**: can be used and edited without network connectivity\n- **Self-exportable**: notebooks can be modified and rexported as a new single file\n- **Data/Dataviz Enabled**:\n  - Built-in support for **D3**, **Plot**, and other visualization libraries\n  - **FileAttachment** support for embedding datasets\n  - **Writable** file attachments for saving application state.\n- **Plain Text Serialization Format**:\n  - Fully **human-readable**\n  - **Git diff friendly** for collaboration\n- **Single HTML File Deployment**:\n  - Easy to host\u2014just upload the file to a static web host\n  - Easy to run\u2014works directly from the \\`file://\\` domain without a server\n- **Modular Internals**:\n  - Uses standard **JavaScript modules**\n  - Supports inclusion of **static file assets**, **images**, and **binary data**\n`\n)};\nconst _ep7sgw = function _8(md){return(\nmd`## Why Durability Matters\n\nDurability is not usually considered important in web based software stacks. In Lopecode, it\u2019s a core design principle we hope can unlock long-term impact.\n\n### Bitrot is unwelcome depreciation of an expensive asset.\n\nPlatform churn (new OS versions, changing APIs, shifting runtime environments) makes software expensive to maintain over time. This increases the cost of development through depreciation. This is painful for anyone that wants to create software, from solo developers, educators, researchers, and to non-software businesses. By making software trivially hostable, portable and executable, Lopecode lowers the **total cost of ownership** when writing custom code. One reason we have subscription pricing is because of the absurd cost of software maintenance.\n\n### Durability increases reuse\n\nSoftware that works years later is software that can make impact over longer time horizons. Each fork is a chance for reuse or reinterpretation. A reactive notebook that runs, and can be debugged, is a more valuable artefact than a blog post with outdated dead code blocks. A lopecode document you have a copy of, cannot be broken by software changes made by others, or taken away from you.\n\n### Durability as Ecosystem Infrastructure\n\nFast-moving platforms break content. Durable software, by contrast, provides a stable base for long-term knowledge creation. In science, we build on papers written decades ago. Why can\u2019t we do the same with interactive software?\n\n### Durability as a Design Constraint\n\nBy removing modern tooling (frameworks, cloud services, devops), Lopecode pushes toward systems that are understandable, inspectable, and self-reliant. This is a plus for software intended as a tool-for-thought.\n\nAs an example: React is a widely used frontend framework, but it's a durability liability. React apps typically depend on large toolchains, break between versions, and require active infrastructure. That\u2019s makes sense for commercial software but a poor match for personal, commons owned software.\n\nLopecode aims for durability by radically reducing dependencies. First, it is a single file. Computer files have been around since the 60s, and are the simplest sharable replicable unit that have stood the test of time. Second, it has no network dependencies and therefore no server or DNS dependencies that require active network connectivity to work. Thirdly it's web, as opposed to an OS-specific native solution. Multiple vendors supply standards-compliant web clients, thus its only real external dependency has multiple free implementations for all major operating systems. Browser ship their own dev tools, enabling state of the art-of-the-art debugging experiences ecosystem compatability. Finally, it's self-hosting\u2014there, is nothing else you need to work with it, as it bundles its own means of production.`\n)};\nconst _17biunv = function _9(md){return(\nmd`## What I\u2019m Exploring\n\nLopecode is both a platform and a hypothesis: that radically lowering the friction to share and remix interactive software will open up new possibilities for personal software, computational blogging, scientific publishing and educational media.\n\nImagine:\n\n- A layman curating data-driven applications that solve their individual needs, customised from ecosystem forked notebooks. \n- A research paper that includes not just charts, but live models you can fork and adjust\n- A blog post that\u2019s also a playground that a motivated reader can download, run locally and modify.\n- A demo that doesn\u2019t decay that you can rely to operate the same way everytime you run it.\n\nMost software today is brittle and ephemeral. Even well-crafted systems disappear when their hosting, dependencies, or toolchains break. Does programming need to be so fragile?\n\nI\u2019m interested in how much we can push toward this ideal by treating software more like durable documents.\n`\n)};\nconst _vt5tly = function _11(md){return(\nmd`# Research Areas\n\nThe grand vision is self-perpetuating, never breaking, forever useful software. There are many research threads that could contribute towards that goal.`\n)};\nconst _1uaem69 = function _12(md){return(\nmd`## How to make modification easy?\n\nLower the barrier of entry. Improve the development feedback loop. Simplify the programming model\n\n- Spreadsheet like reactivity\n  - New debugging paradigms as reactivity is complex at scale\n- Data viz augmented programming e.g. direct manipulation\n- Self-documenting architecture.\n- Merging histories\n- LLM modifications\n- Polyglot language support`\n)};\nconst _pi80zg = function _13(md){return(\nmd`## How to make reproduction easy\n\nEngineering a format that is powerful but easily run. Immortal software is programming + developer tooling + data\n\n- DOM representation\n- Single file web bundling tricks\n- Size minimization\n- Cross domain local-first data transfer\n- Multiplayer\n- Social transmision\n`\n)};\nconst _1oizkw4 = function _14(md){return(\nmd`## How to make software useful?\n\n- Data visualisation\n- Underserved niches\n- Valuable abstractions\n- Teaching aids\n`\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_1f8i73v\", null, [\"md\"], _1f8i73v);\n  $def(\"_eprdhc\", null, [\"md\"], _eprdhc);\n  $def(\"_wfyjci\", null, [\"md\"], _wfyjci);\n  $def(\"_1sl2j9l\", null, [\"md\"], _1sl2j9l);\n  $def(\"_1vwiujk\", null, [\"md\"], _1vwiujk);\n  $def(\"_ep7sgw\", null, [\"md\"], _ep7sgw);\n  $def(\"_17biunv\", null, [\"md\"], _17biunv);\n  $def(\"_vt5tly\", null, [\"md\"], _vt5tly);\n  $def(\"_1uaem69\", null, [\"md\"], _1uaem69);\n  $def(\"_pi80zg\", null, [\"md\"], _pi80zg);\n  $def(\"_1oizkw4\", null, [\"md\"], _1oizkw4);\n  return main;\n}\n";

function collect(M) {
  return (async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const T0 = Date.now();
    const LAYOUT = "#view=R100(S60(" + M + "),S40(@tomlarkworthy/robocoop-5))";
    const go = h => { history.pushState(null, "", h); dispatchEvent(new HashChangeEvent("hashchange")); };
    const out = { toc: false, listsAll: false, order: false, levels: false, addedListed: false, clickScrolls: false, layoutKept: false, reopened: false, why: [] };
    // shared with the reopened iframe: reads the TOC and the headings of one pane
    const analyse = (pane) => {
      const norm = s => String(s || "").replace(/[§#¶]/g, " ").replace(/^[\s\d.)\-–—:]+/, "").replace(/\s+/g, " ").trim().toLowerCase();
      const all = [...pane.querySelectorAll("h1,h2,h3,h4")].filter(h => norm(h.textContent));
      const same = (a, h) => { const x = norm(a.textContent), y = norm(h.textContent); return x.length >= 3 && (x === y || (y.startsWith(x) && x.length >= 8) || (x.startsWith(y) && y.length >= 8)); };
      const links = [...pane.querySelectorAll("a")].filter(a => !a.closest("h1,h2,h3,h4") && all.some(h => same(a, h) && !h.contains(a)));
      if (links.length < 3) return { found: false, why: "no element in the pane links to 3 headings (" + links.length + " heading links)" };
      // the smallest ancestor of the first heading link that holds >= 3 of them
      let toc = links[0];
      while (toc.parentElement && toc !== pane && links.filter(a => toc.contains(a)).length < Math.min(3, links.length)) toc = toc.parentElement;
      while (toc.parentElement && toc.parentElement !== pane && links.filter(a => toc.parentElement.contains(a)).length > links.filter(a => toc.contains(a)).length) toc = toc.parentElement;
      const tocLinks = links.filter(a => toc.contains(a));
      const heads = all.filter(h => !toc.contains(h));
      const before = heads.filter(h => h.compareDocumentPosition(toc) & Node.DOCUMENT_POSITION_FOLLOWING);
      const title = before.length === 1 && before[0].tagName === "H1" && heads[0] === before[0] ? before[0] : null;
      const expected = heads.filter(h => h !== title);
      const atTop = expected.every(h => toc.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING);
      const entries = expected.map(h => ({ h, text: h.textContent.trim(), level: +h.tagName[1], a: tocLinks.find(a => same(a, h)) }));
      const missing = entries.filter(e => !e.a).map(e => e.text);
      const got = entries.filter(e => e.a);
      const idx = got.map(e => tocLinks.indexOf(e.a));
      const order = idx.every((x, i) => i === 0 || x > idx[i - 1]);
      const depth = a => { let d = 0; for (let n = a; n && n !== toc; n = n.parentElement) if (/^(UL|OL|LI|DL|DD)$/.test(n.tagName)) d++; return d; };
      const left = a => { const r = document.createRange(); r.selectNodeContents(a); const b = r.getClientRects()[0] || a.getBoundingClientRect(); return Math.round(b.left); };
      const byLevel = f => got.every(x => got.every(y => !(x.level < y.level) || f(x.a) < f(y.a)));
      const levels = got.length > 0 && (byLevel(left) || byLevel(depth));
      return { found: true, toc, tocLinks, entries, atTop, missing, order, levels, title: title && title.textContent.trim(), n: entries.length };
    };
    const pane = () => document.querySelector('.lp2-pane[data-module="' + M + '"]');
    go(LAYOUT);
    for (let i = 0; i < 80 && !(pane() && /Overview/.test(pane().textContent)); i++) await sleep(250);
    if (!pane()) { out.why.push("no pane for " + M + " after opening " + LAYOUT); return out; }
    await sleep(1500);
    let a = analyse(pane());
    if (!a.found) { out.why.push(a.why); return out; }
    out.toc = a.atTop;
    if (!a.atTop) out.why.push("the TOC is not above the first section heading");
    out.listsAll = !a.missing.length;
    if (a.missing.length) out.why.push("TOC has no entry for: " + a.missing.join(" | "));
    out.order = a.order;
    if (!a.order) out.why.push("TOC entries are not in document order");
    out.levels = a.levels;
    if (!a.levels) out.why.push("TOC indentation does not follow heading levels (h<level>@<text x>): " + a.entries.filter(e => e.a).map(e => { const r = document.createRange(); r.selectNodeContents(e.a); return "h" + e.level + "@" + Math.round((r.getClientRects()[0] || e.a.getBoundingClientRect()).left); }).join(" "));
    // the user adds a heading, as editor-5's new-cell path does
    const mod = globalThis.__ojs_runtime.mains.get(M);
    const added = mod.variable({});
    added.pid = "_rc5tadd";
    added.define(["md"], new Function("md", "return md\x60## Further reading\n\nKleppmann et al., Local-first software (2019).\x60"));
    for (let i = 0; i < 12; i++) {
      await sleep(250);
      if (/Further reading/.test(pane()?.textContent || "") && analyse(pane()).entries?.find(e => e.text === "Further reading")?.a) break;
    }
    await sleep(500);
    a = analyse(pane());
    const fr = a.found && a.entries.find(e => e.text === "Further reading");
    if (!fr) out.why.push(/Further reading/.test(pane()?.textContent || "") ? "the added heading rendered but the pane analysis lost it" : "the added cell did not render in the pane");
    out.addedListed = !!(fr && fr.a && a.order);
    if (fr && !fr.a) out.why.push("after adding '## Further reading' the TOC still lists " + a.tocLinks.length + " entries without it");
    // save + reopen, started now (the added cell is part of the save) and run alongside the clicks: collect has 30 s
    const reopen = (async () => { try {
      const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
      const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
      const r = await exp({ mains: rt.mains });
      let html = typeof r === "string" ? r : r.source;
      const probe = "<script>(" + (async function (M, analyseSrc) {
        const analyse = (0, eval)("(" + analyseSrc + ")");
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const t0 = Date.now();
        let res = { found: false };
        let seen = 0;
        while (Date.now() - t0 < 17000) {
          await sleep(1000);
          const p = document.querySelector('.lp2-pane[data-module="' + M + '"]');
          if (!p || !/Further reading/.test(p.textContent)) { res = { found: false, why: p ? "pane without the added heading" : "no pane" }; continue; }
          seen++;
          const a = analyse(p);
          res = a.found ? { found: true, missing: a.missing, n: a.n, atTop: a.atTop, order: a.order } : a;
          if ((a.found && !a.missing.length) || seen >= 4) break;
        }
        parent.postMessage({ __tocProbe: res }, "*");
      }) + ")(" + JSON.stringify(M) + "," + JSON.stringify(String(analyse)) + ")<\/script>";
      html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, probe + "</body>");
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const frame = document.createElement("iframe");
      frame.sandbox = "allow-scripts";
      frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
      const got = new Promise(res => {
        addEventListener("message", e => { if (e.data && e.data.__tocProbe) res(e.data.__tocProbe); });
        setTimeout(() => res({ found: false, timeout: true }), 19000);
      });
      frame.src = url + LAYOUT;
      document.body.appendChild(frame);
      const d = await got;
      frame.remove();
      return d;
    } catch (e) { return { found: false, error: String(e && e.message || e) }; } })();
    // clicks
    const layout = h => decodeURIComponent(h).replace(/(@[\w-]+\/[\w.-]+)#[\w$]+/g, "$1");
    let informative = 0, clicksOk = true, layoutOk = true;
    const targets = ["Durability as a Design Constraint", "How to make software useful?", ...(fr && fr.a ? ["Further reading"] : [])];
    for (const t of targets) {
      go(LAYOUT); await sleep(500);
      const p = pane();
      p.scrollTop = 0; await sleep(200);
      const g = analyse(p);
      const e = g.found && g.entries.find(x => x.text === t);
      if (!e || !e.a) { clicksOk = false; out.why.push("no TOC entry to click for " + t); continue; }
      const rel = () => { const h = e.h.isConnected ? e.h : [...p.querySelectorAll("h1,h2,h3")].find(x => x.textContent.trim() === t); return h ? h.getBoundingClientRect().top - p.getBoundingClientRect().top : NaN; };
      const t0 = rel(), hash0 = location.hash, sy0 = scrollY;
      if (!(t0 >= -5 && t0 < p.clientHeight / 2)) informative++;
      e.a.scrollIntoView({ block: "nearest" });
      const href = e.a.getAttribute("href");
      e.a.click();
      await sleep(1200);
      const t1 = rel();
      if (layout(location.hash) !== layout(hash0) || scrollY !== sy0) {
        layoutOk = false;
        out.why.push("clicking " + JSON.stringify(t) + " (href " + href + ") changed the layout: hash " + JSON.stringify(location.hash.slice(0, 120)) + ", window scrollY " + sy0 + " -> " + scrollY);
      }
      // a heading near the end cannot reach the top half: then the pane must be scrolled to its end with the heading visible
      const atEnd = p.scrollTop >= p.scrollHeight - p.clientHeight - 2;
      if (!(t1 >= -5 && (t1 < p.clientHeight / 2 || (atEnd && t1 < p.clientHeight - 20)))) {
        clicksOk = false;
        out.why.push("clicking " + JSON.stringify(t) + " (href " + href + ") did not bring it into its pane: top " + Math.round(t0) + " -> " + Math.round(t1) + "px of " + p.clientHeight);
      }
    }
    if (!informative) { clicksOk = false; out.why.push("every target was already on screen before its click; the check measured nothing"); }
    out.clickScrolls = clicksOk;
    out.layoutKept = layoutOk && clicksOk;
    out.reopenedDetail = await reopen;
    const d = out.reopenedDetail;
    out.reopened = !!(d.found && !d.missing.length && d.atTop && d.n >= 15);
    if (!out.reopened) out.why.push("after save and reopen: " + JSON.stringify(d).slice(0, 300));
    out.ms = Date.now() - T0;
    return out;
  })();
}

export const COLLECT = "(" + String(collect) + ")(" + JSON.stringify(M) + ")";

export const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

// Oracle TOC. Link idiom: href="#" + onclick preventDefault + scrollIntoView, from
// @tomlarkworthy/lopecode-live-2026.ref (lopebooks/notebooks/tomlarkworthy_lopecode-newsletter-002.html).
// The pane is found with closest(".lp2-pane") as in @tomlarkworthy/markdown-wiki / robocoop-5.
// No corpus cell builds a contents list from the rendered headings; the MutationObserver is novel here.
export const TOC_CELL = String.raw`const _toc = function _toc(htl,invalidation){return(
(() => {
  const nav = htl.html${"`"}<nav><strong>Contents</strong><div></div></nav>${"`"};
  const list = nav.lastElementChild;
  let pane = null, seen = "";
  const headings = () => [...pane.querySelectorAll("h1,h2,h3")]
    .filter(h => !nav.contains(h) && (nav.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING));
  const build = () => {
    const hs = headings();
    const key = hs.map(h => h.tagName + h.textContent).join("\n");
    if (key === seen) return;
    seen = key;
    list.replaceChildren(...hs.map(h => {
      const text = h.textContent.trim(), level = +h.tagName[1];
      return htl.html${"`"}<a href="#" style="display:block; padding-left:${"$"}{(level - 1) * 1.2}em" onclick=${"$"}{e => {
        e.preventDefault();
        headings().find(x => x.textContent.trim() === text)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}>${"$"}{text}</a>${"`"};
    }));
  };
  // Only a mutation that adds, removes or edits a heading schedules a rebuild, at most one per frame;
  // the check costs the size of the mutation, not the size of the pane, so an animating cell is cheap.
  const H = "h1,h2,h3";
  const hasHeading = n => n.nodeType === 1 && (n.matches(H) || n.querySelector(H) !== null);
  const touchesHeading = r => r.type === "characterData"
    ? !!r.target.parentElement?.closest(H)
    : !!r.target.closest(H) || [...r.addedNodes, ...r.removedNodes].some(hasHeading);
  let queued = false;
  const observer = new MutationObserver(records => {
    if (queued || !records.some(touchesHeading)) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; build(); });
  });
  const attach = () => {
    if (!nav.isConnected) return requestAnimationFrame(attach);
    pane = nav.closest(".lp2-pane") || document.body;
    observer.observe(pane, { childList: true, subtree: true, characterData: true });
    build();
  };
  attach();
  invalidation.then(() => observer.disconnect());
  return nav;
})()
)};
`;

const withToc = (cell, deps) => FIXTURE.replace("export default function define", cell + "export default function define")
  .replace(/(\$def\("_1f8i73v"[^\n]*\n)/, "$1  $def(\"_toc\", \"toc\", " + JSON.stringify(deps) + ", _toc);\n");

export const SOLUTION = withToc(TOC_CELL, ["htl", "invalidation"]);

// negative control 1: a TOC typed from today's headings
const STATIC = [[2, "Overview"], [2, "What Lopecode Is"], [3, "Relationship to Observable"], [2, "Lopecode Features"], [2, "Why Durability Matters"],
  [3, "Bitrot is unwelcome depreciation of an expensive asset."], [3, "Durability increases reuse"], [3, "Durability as Ecosystem Infrastructure"],
  [3, "Durability as a Design Constraint"], [2, "What I’m Exploring"], [1, "Research Areas"], [2, "How to make modification easy?"],
  [2, "How to make reproduction easy"], [2, "How to make software useful?"]];
export const STATIC_TOC = String.raw`const _toc = function _toc(htl){return(
htl.html${"`"}<nav><strong>Contents</strong>${"$"}{${JSON.stringify(STATIC)}.map(([level, text]) => htl.html${"`"}<a href="#" style="display:block; padding-left:${"$"}{(level - 1) * 1.2}em" onclick=${"$"}{e => {
  e.preventDefault();
  [...e.target.closest(".lp2-pane").querySelectorAll("h1,h2,h3")].find(x => x.textContent.trim() === text)?.scrollIntoView({ behavior: "smooth", block: "start" });
}}>${"$"}{text}</a>${"`"})}</nav>${"`"}
)};
`;
export const STATIC_SOLUTION = withToc(STATIC_TOC, ["htl"]);

// negative control 2: live TOC, but the link scrolls the window
export const WINDOW_SOLUTION = SOLUTION.replace(
  '?.scrollIntoView({ behavior: "smooth", block: "start" });',
  ';{ const h = headings().find(x => x.textContent.trim() === text); if (h) window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY }); }');

export const CRITERIA = [
  { name: "collected_equals", args: { key: "toc", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "listsAll", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "order", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "levels", equals: true }, weight: 1 },
  // THE ask: a heading added after the turn is listed without the agent
  { name: "collected_equals", args: { key: "addedListed", equals: true }, weight: 3 },
  { name: "collected_equals", args: { key: "clickScrolls", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "layoutKept", equals: true }, weight: 1 },
  { name: "collected_equals", args: { key: "reopened", equals: true }, weight: 2 },
];

const base = (id, content) => ({
  id,
  category: "rc5-train",
  question: "Add a table of contents at the top of my notebook that links to each section and stays up to date when I add a new heading.",
  setup: { files: { ["/src/" + M + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: CRITERIA,
  oracle: content ? [{ tool: "write_file", args: { file_path: "/src/" + M + ".js", content }, settleMs: 3000 }] : [{ tool: "read_file", args: { file_path: "/src/" + M + ".js" } }],
});

export const CONTROLS = [
  base("rc5t-toc-live-ctl-unmodified", null),
  base("rc5t-toc-live-ctl-static", STATIC_SOLUTION),
  base("rc5t-toc-live-ctl-window", WINDOW_SOLUTION),
];

export default base("rc5t-toc-live", SOLUTION);
