const _a2hdr = function _a2hdr(md){return(
md`# Annotate

Notes pinned to things. Select a phrase, click a chart, click a shape — a note appears,
with an arrow to what it is about.

Every note on this page is one, already placed. Read them.`
)};
const _a2docUse = function _a2docUse(md){return(
md`## Using it

**Arm it** — 💬 *Annotate* in the burger menu, or ⌘K → *Annotate*. **Point at something** —
drag across prose to quote it, or click a target; the layer disarms after one placement.
**Write** — click a note to edit it in place; ✎ opens the full cell editor, so a note can be
a plot, an input, a table. **Adjust** — drag the title bar to move, the corner grip to
resize, ⌖ to re-aim or re-anchor, ✕ to delete.

The toggle hides and shows the layer.`
)};
const _a2ven = function _a2venf(Inputs){return(
Inputs.toggle({label: "Annotations", value: true})
)};
const _a2venv = (G, _) => G.input(_);
const _a2docDemos = function _a2docDemos(md){return(
md`---

# Demos

Each section is a case an anchor has to survive. Move the sliders and press the buttons —
the notes are the thing being demonstrated.`
)};
const _a2demoProse = function _a2demoProse(md){return(
md`## Prose that reflows

A text anchor is a quote, not a position: the phrase itself, plus a little of the text either
side of it. Resize the pane and the highlight reflows with the sentence, because character
offsets do not care about layout. Repeated phrases are told apart by their surroundings —
this sentence says *told apart* twice, so the note has something to be told apart from.`
)};
const _a2docChart = function _a2docChart(md){return(
md`## A chart, in data space

Drag the slider: it pans the window the chart plots. The note is fixed to a *datum*, so it
slides with the data — and once that datum is outside the window, it says so rather than
pointing at empty page.`
)};
const _a2vpw = function _a2vpwf(Inputs){return(
Inputs.range([0, 12], {label: "pan (weeks)", step: 1, value: 4})
)};
const _a2vpwv = (G, _) => G.input(_);
const _a2demoPlot = function _a2demoPlot(Plot,demoSeries,demoPlotPan){return(
Plot.plot({
  width: 640,
  height: 220,
  marginLeft: 45,
  x: {domain: [demoSeries[demoPlotPan].date, demoSeries[demoPlotPan + 11].date]},
  y: {grid: true, domain: [90, 220], label: "value"},
  marks: [
    Plot.line(demoSeries, {x: "date", y: "value", stroke: "#4a90d9", clip: true}),
    Plot.dot(demoSeries, {x: "date", y: "value", fill: "#4a90d9", r: 3, clip: true})
  ]
})
)};
const _a2docVector = function _a2docVector(md){return(
md`## Vector graphics that zoom

Drag the zoom slider.`
)};
const _a2vsz = function _a2vszf(Inputs){return(
Inputs.range([1, 4], {label: "zoom", step: 0.1, value: 1})
)};
const _a2vszv = (G, _) => G.input(_);
const _a2demoSvg = function _a2demoSvg(demoSvgZoom)
{
  const z = demoSvgZoom || 1;
  const vb = [100 - 100 / z, 50 - 50 / z, 200 / z, 100 / z].map((n) => n.toFixed(2)).join(" ");
  const div = window.document.createElement("div");
  div.style.cssText = "width:100%;max-width:420px";
  div.innerHTML =
    '<svg viewBox="' + vb + '" style="width:100%;height:auto;aspect-ratio:2/1;display:block;background:var(--theme-background-alt,#f4f4f4);border-radius:4px">' +
    '<circle cx="50" cy="50" r="30" fill="#4a90d9"/>' +
    '<rect x="120" y="25" width="50" height="50" fill="#d97a4a"/>' +
    "</svg>";
  return div;
};
const _a2docBitmap = function _a2docBitmap(md){return(
md`## A bitmap`
)};
const _a2demoImage = function _a2demoImage()
{
  const img = window.document.createElement("img");
  img.src = "data:image/svg+xml," + window.encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60">' +
    '<rect width="120" height="60" fill="#7a4ad9"/>' +
    '<circle cx="30" cy="30" r="15" fill="#fff"/></svg>');
  img.style.cssText = "width:100%;max-width:260px;display:block;border-radius:4px";
  img.alt = "annotate demo image";
  return img;
};
const _a2docUnnamed = function _a2docUnnamed(md){return(
md`## Cells with no name

The title at the top of this page is an anonymous cell — no name to address it by. The note
up there is anchored to it anyway, by **persistent id**, which every cell has and which
survives a rename.`
)};
const _a2docBeside = function _a2docBeside(md){return(
md`## Content mounted beside a cell

Some tools mount their UI as a *sibling* of a cell rather than inside it — editor-5 does this
when you open a cell editor, so that content sits inside no cell at all. It is anchored
relative to the nearest cell above it: open an editor here and annotate a line of its code.`
)};
const _a2docAdrift = function _a2docAdrift(md){return(
md`## When the target goes away

Press the button.`
)};
const _a2vsh = function _a2vshf(Inputs){return(
Inputs.button("rewrite the paragraph", {value: 0, reduce: (n) => n + 1})
)};
const _a2vshv = (G, _) => G.input(_);
const _a2demoVolatile = function _a2demoVolatile(md,demoShuffle){return(
md`The measurement settled at **${["4.71", "12.09", "0.38", "88.2", "17.6"][(demoShuffle || 0) % 5]}
${["mm", "seconds", "kg", "counts", "%"][(demoShuffle || 0) % 5]}**, which is
${["higher", "lower", "flatter", "noisier", "cleaner"][(demoShuffle || 0) % 5]} than the
previous run.`
)};
const _a2docAuthored = function _a2docAuthored(md){return(
md`## Annotations written as code

Anything that can define a cell can make an annotation — the editor, an agent over the
pairing channel, or you, typing. The note pointing at the title of this page is these two
cells, and nothing else:

\`\`\`js
annotation_tour_title = annotation({
  pid: "_a2hdr",
  quote: {exact: "Annotate"},
  box: {dx: 150, dy: 40, w: 250}
})
\`\`\`
\`\`\`js
annotation_tour_title_note = md\`Hello. I am an annotation…\`
\`\`\`

No id, no surface, no registration: \`annotation()\` fills those in, the surface is inferred
from the keys present, and the runtime's dependency graph is the index. Extra keys —
\`author\`, \`severity\`, whatever you need — are kept verbatim.`
)};
const _a2docImpl = function _a2docImpl(md){return(
md`---

# How it works

Below here is the implementation, in dependency order.`
)};
const _a2docSurfaces = function _a2docSurfaces(md){return(
md`## Surfaces: one coordinate space each

\`a2Anchors\` splits anchoring in two. Finding the *node* is shared: persistent id → cell →
\`region: "after"\` for content mounted beside it → a \`nth-of-type\` path within. Finding the
*place inside that node* belongs to a **surface**, which is a coordinate space with four
methods:

| | |
|---|---|
| \`pick(el, loc)\` | is this click mine? |
| \`describe(target, x, y, loc)\` | click → coordinates in my units |
| \`find(loc, a)\` | which node holds those units now? |
| \`place(target, a, loc)\` | coordinates → a screen point |

Built in, most specific first: **text** (0), **plot** (10, data space via the chart's
\`scale().invert\`), **svg** (20, user units through \`getScreenCTM()\`), **image** (30) and
**element** (90), which matches everything. \`image\` and \`element\` are the same box-fraction
helpers pointed at different nodes.

A surface this build does not recognise is reported adrift rather than painted at a
plausible-looking fraction — a wrong position that looks authoritative is worse than an
honest one that looks lost.`
)};
const _a2anch = function _a2Anchors(runtime,persistentId,getVariableByPersistentId)
{
  const doc = window.document;
  const CELL_SEL = ".observablehq[cell]"; // legacy: named cells only, kept for callers
  const PANE_SEL = ".lp2-pane[data-module]";

  const cssq = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  // ---- per-pass memo -----------------------------------------------------
  // A render resolves every annotation, and a render is driven by *other people's* DOM
  // mutations — a cell animating at 60fps drags each anchor down the ladder every frame.
  // Anything a pass reads out of the whole runtime or the whole document is therefore
  // computed once and shared, then dropped on the next task: a pass is synchronous, so a
  // microtask is exactly its end, and no caller has to know a cache exists.
  let pass = null;
  const passCache = () => {
    if (pass) return pass;
    pass = { nodes: null, text: null, byName: null, pid: new Map() };
    window.queueMicrotask(() => { pass = null; });
    return pass;
  };
  const hashText = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = window.Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  };
  const cellHashOf = (cellNode) =>
    cellNode ? hashText((cellNode.getAttribute("cell") || "") + " " + (cellNode.textContent || "").slice(0, 500)) : null;

  // A cell's identity is its *variable*, not its `cell` attribute: unnamed cells have no
  // attribute at all, and a rename would otherwise orphan every annotation on it.
  const varForNode = (node) =>
    !node || !runtime ? null
      : node.variable || [...runtime._variables].find((v) => v._observer && v._observer._node === node) || null;
  const pidOf = (node) => {
    const v = varForNode(node);
    try { return v ? persistentId(v) : null; } catch (e) { return null; }
  };
  const cellIdOf = (cellNode) => cellNode
    ? { cell: cellNode.getAttribute("cell"), pid: pidOf(cellNode) }
    : { cell: null, pid: null };

  // The cell div is the outermost `.observablehq` — the Inspector stamps that class on
  // inner nodes too, and closest() would stop at the wrong one.
  const outermostCellDiv = (el) => {
    let found = null, n = el;
    while (n && n.nodeType === 1) {
      if (n.classList && n.classList.contains("observablehq")) found = n;
      n = n.parentElement;
    }
    return found;
  };

  // The host is what a quote/path is measured against. Usually the cell div; for an
  // editor-5 editor it is the editor itself, which is mounted as the cell div's *sibling*
  // (`div.after(editor)`), so nothing inside it has a cell ancestor to find.
  const hostOf = (el) => {
    const paneNode = el && el.closest ? el.closest(PANE_SEL) : null;
    let cellNode = outermostCellDiv(el);
    if (cellNode) return { cellNode, hostNode: cellNode, paneNode, region: "cell", afterIndex: 0 };
    let n = el;
    while (n && n.nodeType === 1 && n !== doc.body) {
      let prev = n.previousElementSibling, back = 0;
      // nearest *preceding* cell div, not strictly the immediate sibling: the pane puts a
      // spacer between cells, and an editor may not be the first thing after its cell.
      while (prev && !(prev.classList && prev.classList.contains("observablehq"))) { prev = prev.previousElementSibling; back++; }
      if (prev) return { cellNode: prev, hostNode: n, paneNode, region: "after", afterIndex: back };
      n = n.parentElement;
    }
    return { cellNode: null, hostNode: null, paneNode, region: "cell", afterIndex: 0 };
  };

  // nth-of-type chain from `root` down to `el`, so it survives sibling text edits.
  const pathWithin = (root, el) => {
    if (!el || el === root || !root.contains(el)) return null;
    const parts = [];
    let node = el;
    while (node && node !== root) {
      const parent = node.parentElement;
      if (!parent) return null;
      let i = 1;
      for (const sib of parent.children) {
        if (sib === node) break;
        if (sib.tagName === node.tagName) i++;
      }
      parts.unshift(node.tagName.toLowerCase() + ":nth-of-type(" + i + ")");
      node = parent;
    }
    return parts.length ? parts.join(" > ") : null;
  };
  const queryPath = (root, path) => {
    try { return root.querySelector(":scope > " + path); } catch (e) { return null; }
  };

  // The cell attribute is a lopepage convention; observablehq.com renders plain
  // `.observablehq` divs. The variable knows its own display node either way.
  const moduleNamed = (name) =>
    (name && runtime.mains && runtime.mains.get ? runtime.mains.get(name) : null) || null;
  // One scan of the runtime per pass instead of one per annotation: a notebook that boots
  // the whole corpus has thousands of variables and this used to be walked per anchor.
  const nodeIndex = () => {
    const c = passCache();
    if (c.byName) return c.byName;
    const m = new Map();
    for (const v of runtime._variables) {
      if (!v._name) continue;
      const n = v._observer && v._observer._node;
      if (!n || n.nodeType !== 1 || !n.isConnected) continue;
      let a = m.get(v._name);
      if (!a) m.set(v._name, a = []);
      a.push({ mod: v._module, node: n });
    }
    c.byName = m;
    return m;
  };
  const nodeForVariable = (moduleName, name, pane) => {
    const mod = moduleNamed(moduleName);
    let loose = null;
    for (const e of nodeIndex().get(name) || []) {
      const n = e.node;
      if (mod && e.mod === mod) return n;
      if (pane && pane.contains(n)) return n;
      if (!loose) loose = n;
    }
    // A named module that does not have this cell is a miss, not an invitation to take
    // some other module's cell of the same name.
    return mod ? null : loose;
  };

  // Last rung: the words themselves. No cell, no pid, no attribute — re-find the quote in the
  // page text the way a web annotator does, and take whatever cell it landed in.
  const UNRENDERED = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TITLE: 1 };
  // Our own boxes, and any code view: an open cell editor shows the annotation's own
  // source, which would make its quote look ambiguous and lose the anchor.
  const SKIP_SEL = "[data-a2-root],[data-a2-layer],.cm-editor,[data-a2-editor]";
  const docTextNodes = () => {
    const c = passCache();
    if (c.nodes) return c.nodes;
    const out = [];
    // Reject the excluded *subtree* rather than asking every text node for its ancestors:
    // `closest()` per text node was a quarter of a profiled frame on a page that mutates
    // every frame. A lopecode notebook also carries every module as a
    // `<script type="text/plain">` — text in the DOM but not on the page, containing the
    // annotation's own source, so including it makes every quote look ambiguous
    // (measured: 3.4MB of text, all misses).
    const w = doc.createTreeWalker(
      doc.body,
      window.NodeFilter.SHOW_ELEMENT | window.NodeFilter.SHOW_TEXT,
      {
        acceptNode: (n) =>
          n.nodeType !== 1 ? window.NodeFilter.FILTER_ACCEPT
            : UNRENDERED[n.tagName] || (n.matches && n.matches(SKIP_SEL))
            ? window.NodeFilter.FILTER_REJECT
            : window.NodeFilter.FILTER_SKIP
      }
    );
    while (w.nextNode()) out.push(w.currentNode);
    c.nodes = out;
    return out;
  };
  // Document-wide, so ambiguity is a miss rather than a guess: context first, and the bare
  // quote only when it occurs once on the whole page.
  const quoteInDoc = (text, quote) => {
    if (!quote || !quote.exact) return -1;
    const want = (quote.prefix || "") + quote.exact + (quote.suffix || "");
    const at = text.indexOf(want);
    if (at !== -1) return text.indexOf(want, at + 1) === -1 ? at + (quote.prefix || "").length : -1;
    const i = text.indexOf(quote.exact);
    return i !== -1 && text.indexOf(quote.exact, i + 1) === -1 ? i : -1;
  };
  const docText = (nodes) => {
    const c = passCache();
    if (c.text === null) c.text = nodes.map((n) => n.nodeValue).join("");
    return c.text;
  };
  const cellForQuote = (quote) => {
    const nodes = docTextNodes();
    const at = quoteInDoc(docText(nodes), quote);
    if (at === -1) return null;
    let acc = 0;
    for (const n of nodes) {
      const len = n.nodeValue.length;
      if (acc + len > at) return outermostCellDiv(n.parentElement);
      acc += len;
    }
    return null;
  };

  // Where a page has no panes (observablehq.com, a bare notebook) the document itself is the
  // scroll container, and boxes belong in page coordinates rather than clamped to the viewport.
  const docScroller = () => doc.scrollingElement || doc.documentElement;

  // Structural locator: (module, pid|cell, region, path) -> live nodes. Every rung optional.
  // pid first — it survives a rename and is the only handle an unnamed cell has.
  const locate = (a) => {
    const pane = a.module ? doc.querySelector('.lp2-pane[data-module="' + cssq(a.module) + '"]') : null;
    const scope = pane || doc;
    let cellNode = null;
    if (a.pid && getVariableByPersistentId) {
      // sdk needs the runtime to scan on a cache miss, and a miss is not cached there — so
      // an anchor whose cell is not on this page rescanned every variable, every frame.
      const c = passCache();
      let v;
      if (c.pid.has(a.pid)) v = c.pid.get(a.pid);
      else c.pid.set(a.pid, v = getVariableByPersistentId(a.pid, runtime));
      const n = v && v._observer && v._observer._node;
      if (n && n.nodeType === 1 && n.isConnected) cellNode = n;
    }
    if (!cellNode && a.cell) cellNode = scope.querySelector('.observablehq[cell="' + cssq(a.cell) + '"]');
    if (!cellNode && a.cell) cellNode = nodeForVariable(a.module, a.cell, pane);
    if (!cellNode && a.quote) cellNode = cellForQuote(a.quote);
    let hostNode = cellNode;
    if (a.region === "after") {
      const sibs = [];
      for (let n = cellNode && cellNode.nextElementSibling; n; n = n.nextElementSibling) {
        if (n.classList && n.classList.contains("observablehq")) break; // next cell — ours is gone
        sibs.push(n);
      }
      // Content, then position: whatever now sits beside the cell and still carries the
      // quote is the host; the recorded index only decides ties (and non-text anchors).
      const want = a.quote && a.quote.exact;
      hostNode = (want ? sibs.find((n) => (n.textContent || "").indexOf(want) !== -1) : null)
        || sibs[a.afterIndex || 0] || null;
    }
    let target = hostNode || pane || null;
    let degraded = a.region === "after" && !hostNode;
    if (hostNode && a.path) {
      const inner = queryPath(hostNode, a.path);
      if (inner) target = inner; else degraded = true;
    }
    // A hand-written anchor often names only the cell. Recover the pane from the node it
    // resolved to: without one the box is painted in viewport space and clamped to the
    // window instead of scrolling with its text.
    const node = hostNode || cellNode;
    const pane2 = pane || (node && node.closest ? node.closest(PANE_SEL) : null)
      || (node ? docScroller() : null);
    return { pane: pane2, cellNode, hostNode, target, degraded };
  };

  // ---- text: character offsets <-> DOM Ranges ---------------------------
  const textOffsets = (cellNode, range) => {
    const pre = doc.createRange();
    pre.selectNodeContents(cellNode);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    return { start, end: start + range.toString().length };
  };
  const rangeFromOffsets = (root, start, end) => {
    const walker = doc.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
    let acc = 0, sNode = null, sOff = 0, eNode = null, eOff = 0;
    while (walker.nextNode()) {
      const n = walker.currentNode, len = n.nodeValue.length;
      if (!sNode && acc + len >= start) { sNode = n; sOff = start - acc; }
      if (acc + len >= end) { eNode = n; eOff = end - acc; break; }
      acc += len;
    }
    if (!sNode || !eNode) return null;
    const r = doc.createRange();
    r.setStart(sNode, sOff);
    r.setEnd(eNode, eOff);
    return r;
  };
  // Re-find a quote in the current text. Prefix/suffix break ties; the hint offset
  // breaks the remainder. -1 = not found (the anchor goes adrift), never a guess.
  const findQuote = (text, quote, hint) => {
    if (!quote || !quote.exact) return -1;
    const idxs = [];
    let i = text.indexOf(quote.exact);
    while (i !== -1) { idxs.push(i); i = text.indexOf(quote.exact, i + 1); }
    if (!idxs.length) return -1;
    if (idxs.length === 1) return idxs[0];
    const score = (at) => {
      let s = 0;
      const pre = text.slice(window.Math.max(0, at - (quote.prefix || "").length), at);
      const post = text.slice(at + quote.exact.length, at + quote.exact.length + (quote.suffix || "").length);
      if (quote.prefix && pre === quote.prefix) s += 2;
      if (quote.suffix && post === quote.suffix) s += 2;
      if (hint && typeof hint.start === "number") s -= window.Math.abs(at - hint.start) / 1e9;
      return s;
    };
    return idxs.slice().sort((a, b) => score(b) - score(a))[0];
  };

  // ---- surfaces: one coordinate space each ------------------------------
  // A surface answers two questions: given a click, what are the coordinates (`describe`),
  // and given those coordinates, where is that now (`find` + `place`). Locating the *node*
  // is shared — pid -> cell -> region -> path — so a surface only owns the space inside it.
  // `order` decides which surface claims a click; the most specific goes first.
  const surfaces = new Map();
  const registerSurface = (s) => {
    if (s && s.name) surfaces.set(s.name, s);
    return s;
  };
  const pointSurfaces = () =>
    [...surfaces.values()].filter((s) => s.pick).sort((a, b) => (a.order || 50) - (b.order || 50));

  const boxDescribe = (el, cx, cy) => {
    const r = el.getBoundingClientRect();
    return { frac: { fx: r.width ? (cx - r.left) / r.width : 0, fy: r.height ? (cy - r.top) / r.height : 0 } };
  };
  const boxPlace = (el, a) => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    const f = a.frac || { fx: 0, fy: 0 };
    return { kind: "point", x: r.left + f.fx * r.width, y: r.top + f.fy * r.height };
  };
  const ctmOf = (el) => (el && el.getScreenCTM ? el.getScreenCTM() : null);

  // text — character offsets in a rendered text stream, re-found as a quote
  registerSurface({
    name: "text", order: 0, rung: "quote", // selection-driven, so no `pick`
    find: (loc) => loc.hostNode,
    place: (host, a) => {
      const text = host.textContent || "";
      const at = findQuote(text, a.quote, a.hint);
      if (at === -1) return null;
      const range = rangeFromOffsets(host, at, at + a.quote.exact.length);
      if (!range) return null;
      const rects = [...range.getClientRects()].filter((r) => r.width || r.height);
      if (!rects.length) return null;
      return { kind: "rects", rects, x: rects[0].left, y: rects[0].top + rects[0].height / 2 };
    }
  });

  // plot — *data* space. The most durable anchor there is: the note stays on the same datum
  // through a resize, a rescale or a new domain, where a pixel fraction would slide off.
  // Observable Plot hangs `scale(name)` (with apply/invert) on the node it returns.
  const plotNode = (el) => {
    let n = el;
    while (n && n.nodeType === 1) { if (typeof n.scale === "function") return n; n = n.parentElement; }
    return null;
  };
  const plotIn = (host) => {
    if (!host) return null;
    if (typeof host.scale === "function") return host;
    for (const n of host.querySelectorAll("svg, figure")) if (typeof n.scale === "function") return n;
    return null;
  };
  const plotSvg = (n) => (n && n.localName === "svg" ? n : n && n.querySelector ? n.querySelector("svg") : null);
  const withinRange = (v, range) => {
    if (!range || range.length < 2) return true;
    const lo = window.Math.min(range[0], range[range.length - 1]);
    const hi = window.Math.max(range[0], range[range.length - 1]);
    return v >= lo - 1 && v <= hi + 1;
  };
  const plotScales = (node) => {
    try {
      const sx = node.scale("x"), sy = node.scale("y");
      return sx && sy ? { sx, sy } : null;
    } catch (e) { return null; }
  };
  // JSON has no Date; a temporal scale gets one back on the way in
  const asData = (v) => (v instanceof window.Date ? v.toISOString() : v);
  const fromData = (scale, v) =>
    scale && (scale.type === "utc" || scale.type === "time") && typeof v === "string" ? new window.Date(v) : v;

  registerSurface({
    name: "plot", order: 10, rung: "plot",
    pick: (el) => plotNode(el),
    describe: (node, cx, cy, loc) => {
      const ctm = ctmOf(plotSvg(node));
      const sc = plotScales(node);
      if (!ctm || !sc || !sc.sx.invert || !sc.sy.invert) return null;
      const p = new window.DOMPoint(cx, cy).matrixTransform(ctm.inverse());
      return {
        surface: "plot",
        path: loc.hostNode ? pathWithin(loc.hostNode, node) : null,
        data: { x: asData(sc.sx.invert(p.x)), y: asData(sc.sy.invert(p.y)) }
      };
    },
    find: (loc) => (loc.target && typeof loc.target.scale === "function" ? loc.target : plotIn(loc.hostNode)),
    place: (node, a) => {
      const ctm = ctmOf(plotSvg(node));
      const sc = plotScales(node);
      if (!ctm || !sc || !a.data) return null;
      const px = sc.sx.apply(fromData(sc.sx, a.data.x));
      const py = sc.sy.apply(fromData(sc.sy, a.data.y));
      if (!window.isFinite(px) || !window.isFinite(py)) return null;
      // Scales extrapolate happily past their domain, so a datum the chart no longer plots
      // would get a confident position out in the page. It is off-screen, and says so.
      if (!withinRange(px, sc.sx.range) || !withinRange(py, sc.sy.range))
        return { miss: "outside the plotted domain" };
      const p = new window.DOMPoint(px, py).matrixTransform(ctm);
      return { kind: "point", x: p.x, y: p.y };
    }
  });

  // svg — user units through the CTM: survives viewBox change, zoom and pan
  registerSurface({
    name: "svg", order: 20, rung: "svg",
    pick: (el) => (el.closest ? el.closest("svg") : null),
    describe: (svgRoot, cx, cy, loc) => {
      const ctm = ctmOf(svgRoot);
      if (!ctm) return null;
      const p = new window.DOMPoint(cx, cy).matrixTransform(ctm.inverse());
      return {
        surface: "svg",
        path: loc.hostNode ? pathWithin(loc.hostNode, svgRoot) : null,
        svg: { x: p.x, y: p.y }
      };
    },
    find: (loc) => (loc.target && loc.target.localName === "svg" ? loc.target
      : loc.hostNode ? loc.hostNode.querySelector("svg") : null),
    place: (svgEl, a) => {
      const ctm = ctmOf(svgEl);
      if (!ctm || !a.svg) return null;
      const p = new window.DOMPoint(a.svg.x, a.svg.y).matrixTransform(ctm);
      return { kind: "point", x: p.x, y: p.y };
    }
  });

  // image and element are one mechanism — a fraction of a box — differing only in which
  // node they select. Neither survives anything but a resize.
  registerSurface({
    name: "image", order: 30, rung: "image",
    pick: (el) => (el.tagName === "IMG" ? el : null),
    describe: (el, cx, cy, loc) => window.Object.assign(
      { surface: "image", path: loc.hostNode ? pathWithin(loc.hostNode, el) : null },
      boxDescribe(el, cx, cy)),
    find: (loc) => (loc.target && loc.target.tagName === "IMG" ? loc.target
      : loc.hostNode ? loc.hostNode.querySelector("img") : null),
    place: boxPlace
  });

  registerSurface({
    name: "element", order: 90,
    pick: (el) => el, // last resort: everything is an element
    describe: (el, cx, cy, loc) => {
      const inner = loc.hostNode && el !== loc.hostNode ? el : null;
      const target = inner || loc.hostNode || doc.body;
      return window.Object.assign(
        { surface: "element", path: inner ? pathWithin(loc.hostNode, inner) : null },
        boxDescribe(target, cx, cy));
    },
    find: (loc) => loc.target,
    place: boxPlace
  });

  // ---- describe: build an anchor from a user action ---------------------
  const describeSelection = (sel) => {
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    const { cellNode, hostNode, paneNode, region, afterIndex } = hostOf(node);
    if (!hostNode) return null;
    const text = hostNode.textContent || "";
    const { start, end } = textOffsets(hostNode, range);
    const exact = text.slice(start, end);
    if (!exact.trim()) return null;
    return window.Object.assign({
      surface: "text",
      module: paneNode ? paneNode.dataset.module : null,
      region,
      afterIndex
    }, cellIdOf(cellNode), {
      quote: {
        prefix: text.slice(window.Math.max(0, start - 32), start),
        exact,
        suffix: text.slice(end, end + 32)
      },
      hint: { start, end },
      cellHash: cellHashOf(cellNode)
    });
  };

  const describePoint = (clientX, clientY, hit) => {
    const el = hit || doc.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const loc = hostOf(el);
    const base = window.Object.assign({
      module: loc.paneNode ? loc.paneNode.dataset.module : null,
      region: loc.region,
      afterIndex: loc.afterIndex,
      cellHash: cellHashOf(loc.cellNode)
    }, cellIdOf(loc.cellNode));
    for (const s of pointSurfaces()) {
      const target = s.pick(el, loc);
      if (!target) continue;
      const fields = s.describe(target, clientX, clientY, loc);
      if (fields) return window.Object.assign(base, fields);
    }
    return null;
  };

  // ---- resolve: anchor -> screen geometry, never null --------------------
  // An anchor that no longer resolves is not parked in a rail of its own — it slides down
  // the ladder to the top of its cell, then the top of its pane, then the top of the page.
  // A note can drift, but it cannot be lost, and it never guesses a new exact position.
  const topOf = (el, rung, pane) => {
    const r = el.getBoundingClientRect();
    return { kind: "point", x: r.left + 12, y: r.top + 8, rung, adrift: true, pane };
  };
  const adrift = (a, loc, stale, why) => {
    let res;
    if (loc.hostNode && loc.hostNode.isConnected) res = topOf(loc.hostNode, "cell", loc.pane);
    else if (loc.cellNode && loc.cellNode.isConnected) res = topOf(loc.cellNode, "cell", loc.pane);
    else if (loc.pane && loc.pane.isConnected) res = topOf(loc.pane, "pane", loc.pane);
    // last resort: the top of the page, in viewport space, where nothing can clip it away
    else res = { kind: "point", x: 12, y: 12, rung: "page", adrift: true, pane: null };
    res.stale = stale;
    res.why = why;
    return res;
  };

  const resolve = (a) => {
    if (!a) return null;
    const loc = locate(a);
    const stale = !!(a.cellHash && loc.cellNode && cellHashOf(loc.cellNode) !== a.cellHash);
    // A surface this build does not know about is honestly adrift: its coordinates are
    // uninterpretable, and painting them at some box fraction would look authoritative.
    const s = surfaces.get(a.surface || "element");
    if (!s) return adrift(a, loc, stale, "unknown surface " + a.surface);
    const target = s.find(loc, a);
    if (!target) return adrift(a, loc, stale, "target gone");
    const out = s.place(target, a, loc);
    if (!out || out.miss) return adrift(a, loc, stale, (out && out.miss) || "not placeable");
    const rung = s.rung
      ? (loc.degraded && s.name !== "text" ? "cell" : s.rung)
      : a.path && !loc.degraded ? "path"
      : loc.cellNode ? "cell"
      : loc.pane ? "pane"
      : "page";
    out.rung = rung;
    out.stale = stale || (!s.rung && loc.degraded);
    out.pane = loc.pane;
    return out;
  };

  const visible = (res) => {
    if (!res) return false;
    if (res.pane && res.pane !== docScroller()) {
      const p = res.pane.getBoundingClientRect();
      if (res.y < p.top || res.y > p.bottom || res.x < p.left || res.x > p.right) return false;
    }
    return res.x >= -50 && res.x <= window.innerWidth + 50 && res.y >= -50 && res.y <= window.innerHeight + 50;
  };

  return { CELL_SEL, PANE_SEL, describeSelection, describePoint, resolve, visible,
           pathWithin, queryPath, cellHashOf, findQuote, rangeFromOffsets, locate,
           hostOf, cellIdOf, varForNode, surfaces, registerSurface, pointSurfaces,
           nodeForVariable, cellForQuote, docScroller };
};
const _a2docApi = function _a2docApi(md){return(
md`## The cell is the API

There is no registry to keep in step, because the record cell takes \`annotation\` as an
**input** — so the runtime's own dependency graph already lists every annotation in the
notebook. Discovery walks that variable's consumers, following import bridges one hop into
other modules; deleting a cell removes it for free. \`id\`, \`home\` and the note's cell name are
derived at read time, not stored.

\`surface()\` works the same way: a new coordinate space is a cell that depends on it, so
registering is a side effect of existing.`
)};
const _a2ann = function _a2annotation(){return(
(spec) => {
  // An annotation is a cell: `annotation_<id> = annotation({...})`. The wrapper is what makes
  // it discoverable — the cell takes `annotation` as an input, so the runtime's own dependency
  // graph already lists every annotation in the notebook (walk this variable's `_outputs`).
  // No index cell, no name convention, and deleting the cell removes it for free.
  // It also normalises: anchor keys may be written flat, and the surface is inferred.
  const ANCHOR_KEYS = ["module", "cell", "pid", "region", "afterIndex", "surface",
                       "quote", "hint", "svg", "frac", "data", "path", "cellHash"];
  const s = spec || {};
  const anchor = window.Object.assign({}, s.anchor || {});
  const rest = {};
  for (const k of window.Object.keys(s)) {
    if (k === "anchor") continue;
    if (ANCHOR_KEYS.indexOf(k) !== -1) { if (anchor[k] === undefined) anchor[k] = s[k]; }
    else rest[k] = s[k];
  }
  if (!anchor.surface) {
    anchor.surface = anchor.quote ? "text" : anchor.data ? "plot"
      : anchor.svg ? "svg" : anchor.frac ? "image" : "element";
  }
  const rec = window.Object.assign({ box: { dx: 120, dy: -80, w: 240 }, state: "open" }, rest);
  rec.anchor = anchor;
  return rec;
}
)};
const _a2surf = function _a2surface(a2Anchors){return(
(s) => {
  // Contribute a coordinate space as a cell: `mySurface = surface({name, order, pick, describe,
  // find, place})`. Same trick as `annotation()` — the cell depends on this, so it registers by
  // existing. A surface owns only the space *inside* a node; finding the node is shared.
  a2Anchors.registerSurface(s);
  return s;
}
)};
const _a2docStore = function _a2docStore(md){return(
md`## The store

\`a2Store\` writes cells and reads them back. Writes go through the toolchain compiler, so a
record is readable, editable source rather than an opaque literal, and both cells are tagged
with provenance for local-change-history. Reads come from the dependency-graph walk plus a
name scan that backstops it for cells nothing is observing. External edits arrive through
\`onCodeChange\`. \`viewof annotations\` is only a cache of what the cells say — losing it loses
nothing.`
)};
const _a2vann = function _a2vannf(Inputs){return(
Inputs.input([])
)};
const _a2vannv = (G, _) => G.input(_);
const _a2self = function _a2self(thisModule){return(
thisModule()
)};
const _a2selfv = (G, _) => G.input(_);
const _a2ced = function _a2cellEditor(runtime,importShim){
  // Lazy on purpose: computing editor-5's `cellEditor` wakes a chain that mints an editor
  // dataflow for every newly created cell, which would make placing an annotation look like
  // an edit to the notebook. Resolved on the first ✎ click instead, then memoised.
  let pending = null;
  return () => (pending = pending || (async () => {
    const live = runtime.mains && runtime.mains.get ? runtime.mains.get("@tomlarkworthy/editor-5") : null;
    const mod = live || runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default);
    return mod.value("cellEditor");
  })());
};
const _a2store = async function _a2Store(runtime,$0,compile,importShim,onCodeChange,invalidation,$1)
{
  // `$1` is `viewof a2Self`: its getter starts the search and fires `input` when it lands.
  const self = $1.value || await window.Promise.race([
    new window.Promise((r) => $1.addEventListener("input", () => r($1.value), { once: true })),
    new window.Promise((r) => window.setTimeout(() => r(null), 3000))
  ]) || (runtime.mains && runtime.mains.get && runtime.mains.get("@tomlarkworthy/annotate"));
  // The writer. Each annotation is a pair of cells **in the module it annotates**, so they
  // travel with that module through save-in-place, export, sync-module and jumpgate, and
  // local-change-history records them as edits to that notebook:
  //
  //   annotation_<id>      = annotation({...})      the record — plain source, editable
  //   annotation_<id>_note = md`…`                  the note — any cell at all
  //
  // Anything that can define a cell can therefore create an annotation; this store is a
  // convenience over that, not a gatekeeper. `viewof annotations` is a derived cache.
  const DATA = "@tomlarkworthy/annotate-data";
  const EMD = "module @tomlarkworthy/editable-md";
  const SELF = "module @tomlarkworthy/annotate";
  const LEGACY_INDEX = "annotation_index";
  const TYPE_NORMAL = 1; // runtime variable.js: 2 = TYPE_IMPLICIT (created on reference)
  const DERIVED = ["id", "home", "cell", "varName"];
  const RECORD_RE = /^annotation_\w+$/;

  const SELF_NAME = "@tomlarkworthy/annotate";
  const mains = () => (runtime.mains ? [...runtime.mains.entries()] : []);
  // `runtime.mains` is a lopecode registry; observablehq.com has no module names at all, so
  // a record living in this very notebook has to be recognised by identity. Without this the
  // lookup falls through to the data module and every note reads as missing.
  const moduleNamed = (name) =>
    (name && runtime.mains && runtime.mains.get ? runtime.mains.get(name) : null)
    || (name === SELF_NAME ? self : null) || null;
  const nameOfModule = (mod) => {
    for (const [n, m] of mains()) if (m === mod) return n;
    return mod === self ? SELF_NAME : DATA;
  };
  // Modules worth scanning for annotation cells: every main, plus this one and the data
  // module (which are not in `mains` when there is no lopecode host).
  const scanModules = () => {
    const set = new window.Set(mains().map((e) => e[1]));
    if (self) set.add(self);
    if (fallback) set.add(fallback);
    return [...set];
  };

  // The already-booted copy of a submodule, found through the import var that boots it.
  const liveModule = (moduleVarName) => {
    for (const v of runtime._variables) {
      if (v._name === moduleVarName && v._value && v._value._scope) return v._value;
    }
    return null;
  };

  let fallback = null;
  // Only race the data module's boot when this document actually carries it; a host that
  // never ships one (a blank notebook, observablehq.com) would otherwise stall 3s per boot.
  const dataTries = window.document.getElementById(DATA) ? 30 : 1;
  for (let i = 0; i < dataTries && !fallback; i++) {
    fallback = moduleNamed(DATA);
    if (!fallback) await new window.Promise((r) => window.setTimeout(r, 100));
  }
  // No data module here: this one is the home. Synthesising one and registering it in
  // runtime.mains would declare it into every copy the user saves, because save-in-place
  // exports mains from the live runtime rather than from the file.
  if (!fallback) fallback = self;

  const homeName = (a) => (a && (a.home || (a.anchor && a.anchor.module))) || SELF_NAME;
  const homeOf = (a) => moduleNamed(homeName(a)) || fallback;
  const lookup = (mod, name) => (mod && mod._scope && mod._scope.get ? mod._scope.get(name) : null) || null;

  // ---- lazy imports into the annotated module ----------------------------
  // A module that only *references* a name has an implicit variable (_type 2); one that
  // defines or imports its own has _type 1 and is left alone.
  //
  // The loader must carry its module's URL as a STRING LITERAL even when it never runs.
  // toolchain's findModuleName identifies a module by parsing `import(...)` /
  // `importShim(...)` out of the loader's own source, and module-map's resolve_modules
  // prefers that over the name a module is registered under. A loader with nothing to
  // parse resolved to `<unknown ${Math.random()}>`, and cell-map and exporter-3 then wrote
  // the block as `id="<unknown 0.x>"` while bootconf still asked for the real name: the
  // saved file 404ed and booted with no annotations, and the next save-in-place pruned the
  // block outright. `live || importShim("…")` short-circuits on the already-booted module,
  // so the URL is documentation the resolver can read, not a fetch.
  const ensureImport = (mod, moduleVar, name, load) => {
    const cur = lookup(mod, name);
    if (cur && cur._type === TYPE_NORMAL) return false;
    const mv = lookup(mod, moduleVar);
    if (!mv || mv._type !== TYPE_NORMAL) mod.define(moduleVar, [], load);
    mod.define(name, [moduleVar, "@variable"], (_, v) => v.import(name, _));
    return true;
  };
  // `md` must be editable-md's for click-to-edit to work — its parser only recognises a
  // template tagged with the identifier `md`, so an alias would break the round trip.
  const ensureMd = (mod) => ensureImport(mod, EMD, "md", () =>
    liveModule(EMD) || import("/@tomlarkworthy/editable-md.js?v=4").then((m) => runtime.module(m.default)));
  const ensureAnnotation = (mod) => mod === self ? false : ensureImport(mod, SELF, "annotation", () =>
    self || import("/@tomlarkworthy/annotate.js?v=4").then((m) => runtime.module(m.default)));

  const defineIn = (mod, name, inputs, def) => {
    if (def && !def.__provenance) {
      try {
        window.Object.defineProperty(def, "__provenance", {
          value: { source: "annotate" },
          configurable: true
        });
      } catch (e) { /* frozen env */ }
    }
    let v;
    try { v = mod.redefine(name, inputs, def); }
    catch (e) { v = mod.variable().define(name, inputs, def); }
    if (v && !v.pid) v.pid = "_" + name;
    return v;
  };
  const deleteCell = (mod, name) => {
    const v = lookup(mod, name);
    if (v && v.delete) v.delete();
  };

  const noteName = (varName) => varName + "_note";
  const NOTE_SRC = "md`note…`";
  const mdEscape = (s) =>
    String(s).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  const defineCompiled = (mod, name, fullSource) => {
    ensureMd(mod);
    ensureAnnotation(mod);
    const spec = compile(fullSource)[0];
    const def = new window.Function("return (" + spec._definition + ")")();
    return defineIn(mod, name, spec._inputs, def);
  };
  const defineSource = (mod, name, expr) => defineCompiled(mod, name, name + " = " + expr);
  // `<` escaped so a note or a metadata string containing a closing script tag cannot break
  // the HTML block on export.
  const defineSpec = (mod, name, spec) =>
    defineSource(mod, name, "annotation(" +
      window.JSON.stringify(spec, null, 1).replace(/</g, "\\u003c") + ")");
  const specOf = (rec) => {
    const out = {};
    for (const k of window.Object.keys(rec)) if (DERIVED.indexOf(k) === -1) out[k] = rec[k];
    return out;
  };

  const normalise = await self.value("annotation");

  // ---- discovery: ask the runtime, don't keep an index -------------------
  const idFromName = (n) => (n.indexOf("annotation_") === 0 ? n.slice(11) : n);
  const cellsInGraph = () => {
    const out = new Map();
    const root = lookup(self, "annotation"); // sync — runtime-sdk's lookupVariable is async
    if (!root) return out;
    const seen = new Set();
    const walk = (v, depth) => {
      if (!v || seen.has(v) || depth > 4) return;
      seen.add(v);
      for (const o of v._outputs) {
        if (o._name === "annotation") { walk(o, depth + 1); continue; } // an import bridge
        if (o._name) out.set(o, { name: o._name, mod: o._module });
      }
    };
    walk(root, 0);
    return out;
  };
  // Two cases the graph alone misses: records written before the wrapper existed (plain
  // object literals, no dependency to walk), and a wrapper cell in a module with no pane —
  // nothing observes it, so it never computes and the import bridge never binds. Both are
  // still found by name, and `readRecords(true)` forces the value.
  const cellsByName = () => {
    const out = new Map();
    for (const mod of scanModules()) {
      if (!mod._scope) continue;
      for (const [name, v] of mod._scope) {
        if (!RECORD_RE.test(name) || name.endsWith("_note") || v._type !== TYPE_NORMAL) continue;
        out.set(v, { name, mod });
      }
    }
    return out;
  };
  const readRecords = async (force) => {
    const found = new Map([...cellsInGraph(), ...cellsByName()]);
    const recs = [];
    let pending = 0;
    for (const [v, info] of found) {
      let val = v._value;
      if ((val === undefined || val === null) && force) {
        try { val = await info.mod.value(info.name); } catch (e) { val = null; }
      }
      if (val === undefined || val === null) { pending++; continue; }
      if (typeof val !== "object" || !val.anchor) continue;
      recs.push(window.Object.assign({}, normalise(val), {
        id: val.id || idFromName(info.name),
        home: nameOfModule(info.mod),
        cell: val.cell || noteName(info.name),
        varName: info.name
      }));
    }
    recs.pending = pending;
    return recs;
  };

  const commit = (list) => {
    $0.value = list;
    $0.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  commit(await readRecords(true));

  const newId = () => "a2" + window.Math.random().toString(36).slice(2, 10);

  // Which modules have anything rendered right now. Asked once per annotation per render,
  // and the render is driven by any DOM mutation on the page, so it is answered from one
  // scan of the runtime per pass — a pass being synchronous, a microtask ends it.
  let shownPass = null;
  const modulesOnPage = () => {
    if (shownPass) return shownPass;
    shownPass = new window.Set();
    for (const v of runtime._variables) {
      const n = v._observer && v._observer._node;
      if (n && n.nodeType === 1 && n.isConnected) shownPass.add(v._module);
    }
    window.queueMicrotask(() => { shownPass = null; });
    return shownPass;
  };

  const store = {
    // the fallback module, kept for anchors that belong to no pane
    module: fallback,
    homeName,
    homeOf,
    all: () => $0.value || [],
    get: (id) => (store.all()).find((a) => a.id === id) || null,
    varOf: (a) => (a && a.varName) || "annotation_" + (a && a.id),
    noteVar: (a) => (a && a.cell ? lookup(homeOf(a), a.cell) : null),
    // Is any of this note's document actually on the page? A module that is booted but not
    // displayed has no observer nodes. This module is a main in the blank notebook, so
    // without the test its own six documentation notes would paint over every notebook that
    // boots it — as adrift, which is the wrong word: they are not lost, they are elsewhere.
    onPage: (a) => {
      const shown = modulesOnPage();
      return shown.has(homeOf(a)) || shown.has(moduleNamed(a && a.anchor && a.anchor.module));
    },
    setSource: (name, fullSource, a) => defineCompiled(homeOf(a || store.all().find((x) => x.cell === name)), name, fullSource),
    // Repair path: a record whose note cell is missing (deleted, or a legacy text-only
    // record) gets one minted from its text. Idempotent — the caller may retry.
    ensureNote: (a) => {
      if (!a) return null;
      const mod = homeOf(a);
      const name = a.cell || noteName(store.varOf(a));
      let v = lookup(mod, name);
      if (!v) v = defineSource(mod, name, a.text ? "md`" + mdEscape(a.text) + "`" : NOTE_SRC);
      if (a.cell !== name) store.patch(a.id, { cell: name });
      return v;
    },
    create: (anchor, fields) => {
      if (!anchor) return null;
      const id = newId();
      const home = anchor.module || SELF_NAME;
      const mod = moduleNamed(home) || fallback;
      const varName = "annotation_" + id;
      const f = window.Object.assign({}, fields || {});
      const src = f.src;
      delete f.src;
      const spec = window.Object.assign({ anchor: anchor }, f,
        { createdAt: new window.Date().toISOString() });
      defineSource(mod, noteName(varName), src || NOTE_SRC);
      defineSpec(mod, varName, spec);
      const a = window.Object.assign({}, normalise(spec),
        { id, home, cell: noteName(varName), varName });
      commit(store.all().concat([a]));
      return a;
    },
    patch: (id, fields) => {
      const prev = store.get(id);
      if (!prev) return;
      const rec = window.Object.assign({}, prev, fields);
      // re-anchoring into another pane moves the annotation's cells to that module
      const from = homeName(prev);
      // Stay where the cells already are unless the anchor names another module. A
      // hand-written anchor often gives only a cell, and defaulting to the data module
      // would migrate the annotation out of the notebook it was authored in.
      rec.home = (rec.anchor && rec.anchor.module) || from;
      const to = rec.home;
      if (window.JSON.stringify(rec) === window.JSON.stringify(prev)) return;
      const fromMod = moduleNamed(from) || fallback;
      const toMod = moduleNamed(to) || fallback;
      const varName = store.varOf(prev);
      if (from !== to) {
        // carry the note's own definition across rather than re-compiling its source
        const nv = lookup(fromMod, rec.cell);
        if (nv) {
          ensureMd(toMod);
          defineIn(toMod, rec.cell, [...(nv._inputs || [])].map((i) => i._name), nv._definition);
          deleteCell(fromMod, rec.cell);
        }
        deleteCell(fromMod, varName);
      }
      defineSpec(toMod, varName, specOf(rec));
      commit(store.all().map((a) => (a.id === id ? rec : a)));
    },
    remove: (id) => {
      const a = store.get(id);
      if (!a) return;
      const mod = homeOf(a);
      if (a.cell) deleteCell(mod, a.cell);
      deleteCell(mod, store.varOf(a));
      commit(store.all().filter((x) => x.id !== id));
    },
    refresh: () => refresh(true)
  };

  // A cell defined by anything else — the editor, an agent, a hand-typed cell — is an
  // annotation as soon as it exists. Poll the graph on code change rather than requiring
  // every writer to come through this store.
  let timer = null, retry = 0;
  const refresh = async (force) => {
    const recs = await readRecords(!!force);
    if (window.JSON.stringify(recs) !== window.JSON.stringify(store.all())) commit(recs);
    // a cell defined a moment ago may not have computed yet; look again, forcing once
    if (recs.pending && retry < 2) { retry++; window.setTimeout(() => refresh(true), 250); }
    else retry = 0;
  };
  const stop = onCodeChange(() => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => { timer = null; refresh(false); }, 150);
  });
  invalidation.then(() => { stop(); if (timer) window.clearTimeout(timer); });

  // annotation_index is dead bookkeeping now that the graph is the index; clear it out of
  // any module that still carries one.
  for (const mod of scanModules()) if (lookup(mod, LEGACY_INDEX)) deleteCell(mod, LEGACY_INDEX);

  return store;
};
const _a2docLayer = function _a2docLayer(md){return(
md`## The layer

\`a2Layer\` paints boxes, leaders and highlights into a wrapper inside each pane's own scroll
content, at content coordinates — so an annotation scrolls and clips with the text it points
at, and the runtime's visibility gate keeps working because the note's node is never removed.
Drags preview live and commit once, so one gesture is one entry in the history.`
)};
const _a2layer = function _a2Layer($0,annotationsEnabled,a2Anchors,a2Store,invalidation,observe,Inspector,cellEditor,decompile,$1,isOnObservableCom)
{
  const doc = window.document;
  const view = $0;
  const A = a2Anchors;
  // No lopecode host to save into: annotations placed here are runtime-only.
  const readOnlyHost = () => { try { return !!isOnObservableCom(); } catch (e) { return false; } };
  const store = a2Store;
  const NS = "http://www.w3.org/2000/svg";
  const ACCENT = "var(--theme-foreground-focus, #0085ff)";
  const BG = "var(--theme-background-alt, #fff)";
  const FG = "var(--theme-foreground, #1a1a2e)";
  const FAINT = "var(--theme-foreground-faint, #999)";

  const status = doc.createElement("div");
  status.style.cssText = "font:12px var(--monospace, monospace); color: var(--theme-foreground-muted, #666)";
  let lastStatus = null;
  const setStatus = (s) => {
    if (s === lastStatus) return;
    lastStatus = s;
    status.textContent = s;
  };

  // The layer's verb, exposed on the returned value so menu/palette plugins can drive it
  // without any floating chrome of their own. `armOnEnable` hands the intent across the
  // recompute that turning the layer on causes.
  const enable = () => {
    if ($1.value === true) return false;
    $1.value = true;
    $1.dispatchEvent(new window.Event("input", { bubbles: true }));
    return true;
  };

  if (!annotationsEnabled) {
    setStatus("layer off · " + (view.value || []).length + " stored");
    status.enabled = false;
    status.isArmed = () => false;
    status.disarm = () => {};
    // turning the layer on rebuilds this cell; the new instance picks the intent up
    status.arm = () => { $1.__a2armOnEnable = true; enable(); };
    status.toggle = () => enable();
    return status;
  }

  // ---- roots -------------------------------------------------------------
  const root = doc.createElement("div");
  root.setAttribute("data-a2-root", "");
  root.style.cssText = "position:fixed; left:0; top:0; right:0; bottom:0; pointer-events:none; z-index:2147483000";
  const svg = doc.createElementNS(NS, "svg");
  svg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible";
  root.appendChild(svg);
  doc.body.appendChild(root);

  // Boxes live in their pane's scroll content, not the viewport. The pane then scrolls
  // and clips them like the text they point at, and the runtime's own `visibility` gate —
  // an IntersectionObserver on the note's display node (variable_intersector) — keeps
  // reporting the truth, because IntersectionObserver honours scroll-container clipping.
  // `root` stays fixed for viewport chrome (the ✎ chip) and as the fallback
  // layer for anchors that have no pane.
  const layers = new Map(); // pane element (or null for the fixed fallback) -> layer
  layers.set(null, { el: root, svg, pane: null });
  const layerFor = (pane) => {
    let L = layers.get(pane || null);
    if (L) return L;
    const el = doc.createElement("div");
    el.setAttribute("data-a2-layer", "");
    el.style.cssText = "position:absolute; left:0; top:0; overflow:hidden; pointer-events:none; z-index:50";
    const lsvg = doc.createElementNS(NS, "svg");
    lsvg.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible";
    el.appendChild(lsvg);
    // A page with no panes scrolls as one document; the layer goes in the body at page
    // coordinates so notes scroll with the text instead of being clamped to the viewport.
    const isDoc = pane === A.docScroller();
    if (isDoc) {
      el.style.overflow = "visible"; // nothing to clip: the document is the scroll container
      doc.body.appendChild(el);
    } else pane.appendChild(el);
    L = { el, svg: lsvg, pane, doc: isDoc };
    layers.set(pane, L);
    return L;
  };
  // The wrapper is sized to the pane's content box and overflow:hidden — without that, a
  // box hung past the content grows the pane's scrollable area (measured +380px).
  const sizeLayer = (L) => {
    if (!L.pane) return { w: window.innerWidth, h: window.innerHeight };
    // The document layer's wrapper stays 0x0 and only *measures* the page: sizing it to the
    // document would make the layer itself part of what the document has to scroll. Its svg
    // does need real pixels — an svg viewport of zero width or height renders nothing, so the
    // leaders were being drawn and never painted.
    if (L.doc) {
      const dw = L.pane.clientWidth, dh = L.pane.scrollHeight;
      if (L.w !== dw) { L.svg.style.width = dw + "px"; L.w = dw; }
      if (L.h !== dh) { L.svg.style.height = dh + "px"; L.h = dh; }
      return { w: dw, h: dh };
    }
    const w = L.pane.clientWidth, h = L.pane.scrollHeight;
    if (L.w !== w) { L.el.style.width = w + "px"; L.w = w; }
    if (L.h !== h) { L.el.style.height = h + "px"; L.h = h; }
    return { w, h };
  };

  const edgePoint = (cx, cy, hw, hh, tx, ty) => {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const sx = dx ? hw / window.Math.abs(dx) : Number.POSITIVE_INFINITY;
    const sy = dy ? hh / window.Math.abs(dy) : Number.POSITIVE_INFINITY;
    const s = window.Math.min(sx, sy);
    return [cx + dx * s, cy + dy * s];
  };

  const parts = new Map();

  // Mid-gesture writes are previews, not commits (the svg-lens rule): moves buffer into
  // `pending`, which render() overlays on the stored record; only pointerup patches the
  // store. Without this every pointermove redefines the annotation's variable — observed:
  // one short box drag minted 24 history entries.
  const pending = new Map();
  const eff = (a) => {
    const p = pending.get(a.id);
    return p ? window.Object.assign({}, a, p) : a;
  };

  const capture = (el, ev) => { try { el.setPointerCapture(ev.pointerId); } catch (e) {} };
  const release = (el, ev) => { try { el.releasePointerCapture(ev.pointerId); } catch (e) {} };
  const drag = (onMove, onUp) => {
    const move = (e) => onMove(e);
    const up = () => {
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      for (const p of parts.values()) p.box.style.pointerEvents = "auto";
      if (onUp) onUp();
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
  };

  const makeParts = (a, L) => {
    const line = doc.createElementNS(NS, "path");
    line.setAttribute("data-a2-line", a.id);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", ACCENT);
    line.setAttribute("stroke-width", "1.5");
    // dotted: the leader crosses the content it points at, so it should read as a hint
    // rather than a rule. The head stays solid so direction is still legible.
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-dasharray", "1 4");
    line.setAttribute("stroke-opacity", "0.45");
    const head = doc.createElementNS(NS, "polygon");
    head.setAttribute("data-a2-head", a.id);
    head.setAttribute("fill", ACCENT);
    head.setAttribute("fill-opacity", "0.7");
    L.svg.appendChild(line);
    L.svg.appendChild(head);

    const hl = doc.createElement("div");
    hl.setAttribute("data-a2-hl", a.id);
    hl.style.cssText = "position:absolute; left:0; top:0; pointer-events:none";
    L.el.appendChild(hl);

    const box = doc.createElement("div");
    box.setAttribute("data-ann-id", a.id);
    box.style.cssText =
      "position:absolute; pointer-events:auto; box-sizing:border-box; border:1px solid " + ACCENT +
      "; border-radius:6px; background:" + BG + "; color:" + FG +
      "; box-shadow:0 2px 10px rgba(0,0,0,.18); font:12px/1.4 system-ui, sans-serif; display:flex; flex-direction:column";

    const bar = doc.createElement("div");
    bar.style.cssText =
      "display:flex; align-items:center; gap:6px; padding:3px 6px; cursor:move; border-bottom:1px solid " +
      FAINT + "; font-size:11px; color:" + FAINT;
    const label = doc.createElement("span");
    label.style.cssText = "flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap";
    const edit = doc.createElement("button");
    edit.setAttribute("data-a2-edit", a.id);
    edit.textContent = "✎";
    edit.title = "Edit this annotation's cell";
    edit.style.cssText = "border:none; background:none; cursor:pointer; color:" + FAINT + "; font-size:12px; padding:0 2px";
    const grab = doc.createElement("button");
    grab.textContent = "⌖";
    grab.title = "Click to pick a new anchor · drag to re-aim";
    grab.style.cssText = "border:none; background:none; cursor:crosshair; color:" + ACCENT + "; font-size:13px; padding:0 2px";
    const del = doc.createElement("button");
    del.textContent = "×";
    del.title = "Delete";
    del.style.cssText = "border:none; background:none; cursor:pointer; color:" + FAINT + "; font-size:14px; padding:0 2px";
    bar.appendChild(label);
    bar.appendChild(edit);
    bar.appendChild(grab);
    bar.appendChild(del);

    // The note is a cell: this is its observer node. The value lands here through
    // runtime-sdk `observe` (detachNodes so we adopt the live element), inspected
    // like any other cell — so a note can be markdown, a plot, an input, anything.
    const body = doc.createElement("div");
    body.setAttribute("data-a2-body", a.id);
    // Deliberately NOT class "observablehq": the editing frame scans for those and would
    // mint a cell editor for every annotation box the moment it appeared.
    body.className = "a2-note";
    body.style.cssText = "padding:2px 7px; min-height:22px; max-height:340px; overflow:auto";

    const editorHost = doc.createElement("div");
    editorHost.setAttribute("data-a2-editor", a.id);
    editorHost.style.cssText = "display:none; border-top:1px solid " + FAINT + "; max-height:320px; overflow:auto";

    // Size is part of the record (box.w / box.h). Drag the grip to set it, double-click
    // to go back to fitting the note.
    const grip = doc.createElement("div");
    grip.setAttribute("data-a2-grip", a.id);
    grip.title = "Drag to resize · double-click to fit the note";
    grip.style.cssText =
      "position:absolute; right:0; bottom:0; width:14px; height:14px; cursor:nwse-resize; pointer-events:auto;" +
      "background:linear-gradient(135deg, transparent 0 55%, " + FAINT + " 55% 62%, transparent 62% 74%, " +
      FAINT + " 74% 81%, transparent 81%)";

    box.appendChild(bar);
    box.appendChild(body);
    box.appendChild(editorHost);
    box.appendChild(grip);
    L.el.appendChild(box);

    const p = { line, head, box, bar, label, body, editorHost, edit, grab, del, hl, grip,
                layer: L, insp: null, cancel: null, editor: null, editing: false, mounted: null };
    ro.observe(box);
    wire(a.id, p);
    return p;
  };

  // ---- the note cell: mount / edit ----------------------------------------
  const mount = (id, p, a) => {
    if (p.mounted === a.cell) return;
    const v = store.noteVar(a) || store.ensureNote(a);
    if (!v) return;
    if (p.cancel) { p.cancel(); p.cancel = null; }
    p.mounted = a.cell;
    p.insp = new Inspector(p.body);
    // Inspector's constructor stamps `observablehq` on its container, and editor-5's
    // auto-attach walks exactly that selector — leaving it on would staple a cell editor
    // into every annotation box (and log an edit) the moment one appeared.
    p.body.classList.remove("observablehq");
    p.cancel = observe(v, {
      _node: p.body,
      pending: () => p.insp.pending(),
      fulfilled: (val, name) => { p.insp.fulfilled(val, name); schedule(); },
      rejected: (err, name) => { p.insp.rejected(err, name); schedule(); }
    }, { detachNodes: true });
  };

  const closeEditor = (p) => {
    if (!p.editing && !p.editor) return;
    try { if (p.editor && p.editor.dispose) p.editor.dispose(); } catch (e) { /* editor already gone */ }
    p.editorHost.innerHTML = "";
    p.editorHost.style.display = "none";
    p.editor = null;
    p.editing = false;
    schedule();
  };

  const openEditor = async (id, p) => {
    if (p.editing) return;
    const a = store.get(id);
    const v = a && store.noteVar(a);
    if (!v) return;
    p.editing = true; // claimed before the await, so a double click cannot open two
    schedule();
    let ed;
    try {
      ed = (await cellEditor())(v, { pinned: true });
    } catch (err) {
      // Fallback: raw source. Same contract — compile the text, redefine the cell.
      ed = doc.createElement("textarea");
      ed.setAttribute("data-a2-src", id);
      ed.style.cssText = "width:100%; min-height:90px; box-sizing:border-box; border:none; outline:none; " +
        "background:transparent; color:inherit; font:11px/1.4 var(--monospace, monospace); padding:5px 7px";
      decompile([v]).then((src) => { ed.value = src; });
      ed.addEventListener("change", () => {
        try { store.setSource(a.cell, ed.value, a); } catch (e) { window.console.warn("annotate: " + e.message); }
      });
    }
    p.editorHost.innerHTML = "";
    // observablehq.com has no save-in-place: cells minted at runtime are not part of the
    // document, so an edit made here lives until reload. Say so rather than imply a save.
    if (readOnlyHost()) {
      const hint = doc.createElement("div");
      hint.setAttribute("data-a2-readonly", id);
      hint.textContent = "Runtime only here — paste this into a cell to keep it.";
      hint.style.cssText = "padding:3px 7px; font:10px/1.4 system-ui, sans-serif; color:" + FAINT +
        "; border-bottom:1px solid " + FAINT;
      p.editorHost.appendChild(hint);
    }
    p.editorHost.appendChild(ed);
    p.editorHost.style.display = "block";
    p.editor = ed;
    p.editing = true;
    schedule();
  };

  const wire = (id, p) => {
    p.del.addEventListener("click", () => store.remove(id));
    p.edit.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (p.editing) closeEditor(p); else openEditor(id, p);
    });
    p.box.addEventListener("pointerdown", () => select(id), true);

    p.bar.addEventListener("pointerdown", (ev) => {
      if (ev.target === p.grab || ev.target === p.del || ev.target === p.edit) return;
      ev.preventDefault();
      const a = store.get(id);
      if (!a) return;
      const res = A.resolve(a.anchor);
      if (!res) return;
      const ox = ev.clientX - (res.x + a.box.dx);
      const oy = ev.clientY - (res.y + a.box.dy);
      capture(p.bar, ev);
      drag((e) => {
        const cur = store.get(id);
        if (!cur) return;
        const r = A.resolve(eff(cur).anchor);
        if (!r) return;
        pending.set(id, { box: window.Object.assign({}, cur.box, { dx: e.clientX - ox - r.x, dy: e.clientY - oy - r.y }) });
        schedule();
      }, () => {
        const fin = pending.get(id);
        pending.delete(id);
        if (fin) store.patch(id, fin);
      });
      window.addEventListener("pointerup", () => release(p.bar, ev), { once: true, capture: true });
    });

    // Resize: same preview/commit rule as the box drag — moves paint, release commits one
    // patch. Width and height both live in the record, so a size survives export.
    p.grip.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      select(id);
      const a = store.get(id);
      if (!a) return;
      capture(p.grip, ev);
      const x0 = ev.clientX, y0 = ev.clientY;
      const w0 = p.box.offsetWidth, h0 = p.box.offsetHeight;
      drag((e) => {
        const cur = store.get(id);
        if (!cur) return;
        pending.set(id, {
          box: window.Object.assign({}, cur.box, {
            w: window.Math.round(window.Math.max(140, w0 + e.clientX - x0)),
            h: window.Math.round(window.Math.max(48, h0 + e.clientY - y0))
          })
        });
        schedule();
      }, () => {
        const fin = pending.get(id);
        pending.delete(id);
        if (fin) store.patch(id, fin);
      });
      window.addEventListener("pointerup", () => release(p.grip, ev), { once: true, capture: true });
    });
    p.grip.addEventListener("dblclick", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const a = store.get(id);
      if (!a || !a.box || !a.box.h) return;
      const box = window.Object.assign({}, a.box);
      delete box.h;
      store.patch(id, { box });
    });

    // ⌖ is two gestures on one control: drag re-aims the tip live (point surfaces only),
    // a click arms re-anchor mode, which can also re-target a text selection.
    p.grab.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      select(id);
      capture(p.grab, ev);
      const x0 = ev.clientX, y0 = ev.clientY;
      let moved = false;
      for (const q of parts.values()) q.box.style.pointerEvents = "none";
      drag((e) => {
        if (!moved && window.Math.abs(e.clientX - x0) + window.Math.abs(e.clientY - y0) < 5) return;
        moved = true;
        const hit = doc.elementFromPoint(e.clientX, e.clientY);
        if (!hit || hit.closest("[data-a2-root],[data-a2-layer]")) return;
        const anchor = A.describePoint(e.clientX, e.clientY, hit);
        if (anchor) { pending.set(id, { anchor }); schedule(); }
      }, () => {
        const fin = pending.get(id);
        pending.delete(id);
        if (moved) { if (fin) store.patch(id, fin); }
        else arm(id);
      });
      window.addEventListener("pointerup", () => release(p.grab, ev), { once: true, capture: true });
    });
  };

  // ---- render ------------------------------------------------------------
  const render = () => {
    const list = view.value || [];
    const live = new Set();
    let adriftCount = 0;
    let adriftAtPage = 0;

    for (const a0 of list) {
      const a = eff(a0); // overlay any in-flight gesture preview
      // A note whose document is not on this page is not adrift, it is elsewhere: skip it
      // silently rather than stacking it in the corner of an unrelated notebook. Asked
      // *before* resolving, because resolving is the expensive part and there is nothing
      // to paint either way — this module is a main in the blank notebook, so its own six
      // documentation notes were walking every other notebook's DOM once per frame.
      if (!store.onPage(a)) continue;
      const res = A.resolve(a.anchor);
      if (!res) continue;
      if (res.adrift) {
        adriftCount++;
        // several notes adrift on the page itself would stack exactly; cascade them
        if (res.rung === "page") res.y += 26 * adriftAtPage++;
      }
      live.add(a.id);
      // No cull: existence follows the anchor. The pane clips a box whose text is
      // scrolled away, and the runtime's visibility gate stays attached — removing the
      // box would drop the note's observer node and the gate degrades open
      // (variable_intersector: visible = !node).
      const L = layerFor(res.pane);
      const dim = sizeLayer(L);
      // viewport -> layer-content coordinates. The document layer measures its own origin
      // instead: body margins and positioning vary by host page, the layer's own rect does not.
      const pr = L.pane && !L.doc ? L.pane.getBoundingClientRect() : null;
      const lr = L.doc ? L.el.getBoundingClientRect() : null;
      const O = lr ? { x: -lr.left, y: -lr.top }
        : pr ? { x: L.pane.scrollLeft - pr.left, y: L.pane.scrollTop - pr.top }
        : { x: 0, y: 0 };
      const ax = res.x + O.x, ay = res.y + O.y;
      let p = parts.get(a.id);
      if (!p) { p = makeParts(a, L); parts.set(a.id, p); }
      else if (p.layer !== L) {
        // the anchor moved to another pane (re-anchor): take the same nodes along, so the
        // note's observer node and any open editor survive the move
        L.el.appendChild(p.hl); L.el.appendChild(p.box);
        L.svg.appendChild(p.line); L.svg.appendChild(p.head);
        p.layer = L;
      }

      // highlights (text surface only)
      p.hl.innerHTML = "";
      if (res.kind === "rects") {
        for (const r of res.rects) {
          const d = doc.createElement("div");
          d.style.cssText = "position:absolute; background:rgba(0,133,255,.16); border-radius:2px;" +
            "left:" + (r.left + O.x) + "px; top:" + (r.top + O.y) + "px; width:" + r.width + "px; height:" + r.height + "px";
          p.hl.appendChild(d);
        }
      }
      mount(a.id, p, a);

      const sel = a.id === selectedId;
      const reanchoring = a.id === armedFor;
      const w = p.editing ? window.Math.max((a.box && a.box.w) || 240, 460) : (a.box && a.box.w) || 240;
      p.box.style.width = w + "px";
      // An explicit height means the note scrolls inside the box; without one the box
      // fits its note, which is the default.
      const h = a.box && a.box.h ? (p.editing ? window.Math.max(a.box.h, 320) : a.box.h) : null;
      p.box.style.height = h ? h + "px" : "";
      p.body.style.flex = h ? "1 1 auto" : "";
      p.body.style.maxHeight = h ? "none" : "340px";
      // Clamp within the layer's content box, not the viewport — the box stays near its
      // text and scrolls with it; the record keeps the offset the user dragged.
      const bw = p.box.offsetWidth || w;
      const bh = p.box.offsetHeight || 60;
      const bx = window.Math.max(4, window.Math.min(ax + a.box.dx, dim.w - bw - 4));
      const by = window.Math.max(4, window.Math.min(ay + a.box.dy, dim.h - bh - 4));
      p.box.style.left = bx + "px";
      p.box.style.top = by + "px";
      p.box.style.zIndex = sel ? "2" : "1";
      p.box.style.opacity = res.stale ? "0.65" : "1";
      p.box.style.borderWidth = sel || reanchoring ? "2px" : "1px";
      p.box.style.borderColor = reanchoring || res.adrift ? "#b45309" : ACCENT;
      p.box.style.borderStyle = res.rung === "quote" || res.rung === "svg" || res.rung === "image" || res.rung === "path" ? "solid" : "dashed";
      p.line.setAttribute("stroke-width", sel || reanchoring ? "2.5" : "1.5");
      p.line.setAttribute("stroke-dasharray", sel || reanchoring ? "1.5 5" : "1 4");
      // faint by default so a leader crossing prose does not compete with it; the
      // selected annotation's leader comes forward.
      p.line.setAttribute("stroke-opacity", sel || reanchoring ? "0.85" : "0.45");
      p.head.setAttribute("fill-opacity", sel || reanchoring ? "1" : "0.7");
      const drifted = reanchoring || res.adrift;
      p.line.setAttribute("stroke", drifted ? "#b45309" : ACCENT);
      p.head.setAttribute("fill", drifted ? "#b45309" : ACCENT);
      // adrift on the page itself: there is nothing left to point at
      const noTarget = res.rung === "page";
      p.line.style.display = noTarget ? "none" : "";
      p.head.style.display = noTarget ? "none" : "";
      p.edit.style.color = p.editing ? ACCENT : FAINT;
      const lab = reanchoring
        ? "⌖ pick a new anchor…"
        : (a.anchor.cell || (a.anchor.pid ? "cell " + a.anchor.pid : null) || a.anchor.module || "page") +
          " · " + res.rung + (res.adrift ? " (adrift)" : res.stale ? " (changed)" : "");
      if (p.label.textContent !== lab) p.label.textContent = lab;

      const cx = bx + bw / 2, cy = by + bh / 2;
      // Aim at the nearest edge of the quote rather than its start, or the arrow strikes
      // through the very text it points at.
      let tx = ax, ty = ay;
      if (res.kind === "rects") {
        // rects are viewport-space; search there, then shift into layer space
        const cxv = cx - O.x, cyv = cy - O.y;
        let best = null;
        for (const r of res.rects) {
          const px = window.Math.max(r.left, window.Math.min(cxv, r.right));
          const py = window.Math.max(r.top, window.Math.min(cyv, r.bottom));
          const d = (px - cxv) * (px - cxv) + (py - cyv) * (py - cyv);
          if (!best || d < best.d) best = { d, x: px, y: py };
        }
        if (best) { tx = best.x + O.x; ty = best.y + O.y; }
      }
      const [ex, ey] = edgePoint(cx, cy, bw / 2, bh / 2, tx, ty);
      p.line.setAttribute("d", "M " + ex + " " + ey + " L " + tx + " " + ty);
      const ang = window.Math.atan2(ty - ey, tx - ex);
      const hlen = 9, hw2 = 4;
      p.head.setAttribute(
        "points",
        tx + "," + ty + " " +
        (tx - hlen * window.Math.cos(ang) + hw2 * window.Math.sin(ang)) + "," + (ty - hlen * window.Math.sin(ang) - hw2 * window.Math.cos(ang)) + " " +
        (tx - hlen * window.Math.cos(ang) - hw2 * window.Math.sin(ang)) + "," + (ty - hlen * window.Math.sin(ang) + hw2 * window.Math.cos(ang))
      );
    }

    for (const [id, p] of parts) {
      if (live.has(id)) continue;
      if (p.cancel) { p.cancel(); p.cancel = null; }
      closeEditor(p);
      ro.unobserve(p.box);
      p.line.remove(); p.head.remove(); p.box.remove(); p.hl.remove();
      parts.delete(id);
    }

    setStatus(armedFor === "new"
      ? "annotating · select text or click a target"
      : armedFor
      ? "re-anchoring " + armedFor + " · select text or click a target"
      : list.length + " annotation" + (list.length === 1 ? "" : "s") +
        (adriftCount ? " · " + adriftCount + " adrift" : "") + " · layer active");
  };

  // ---- scheduling --------------------------------------------------------
  // rAF coalesces; the macrotask fallback keeps a backgrounded tab correct.
  let queued = false, deferred = null, lastCost = 0, lastEnd = 0;
  const run = () => {
    if (!queued) return;
    queued = false;
    if (deferred) { window.clearTimeout(deferred); deferred = null; }
    const t0 = window.performance.now();
    render();
    lastEnd = window.performance.now();
    lastCost = lastEnd - t0;
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(run);
    window.setTimeout(run, 250);
  };
  // Mutation-driven renders get a duty cycle. Scroll, resize and our own edits are the
  // user's own gesture and stay on the next frame, but a cell that rewrites its DOM every
  // frame (a video pipeline, an animation) would otherwise re-anchor every annotation
  // 60 times a second on the main thread. After a render costing t, the next
  // mutation-driven one waits 4t: measured, so a cheap page still tracks every frame and
  // an expensive one caps the layer near a fifth of the thread.
  const DUTY = 4, MAX_DEFER = 250;
  const scheduleSoft = () => {
    if (queued || deferred) return;
    if (!(view.value || []).length && !parts.size) return; // nothing to paint, nothing to do
    const wait = window.Math.min(
      MAX_DEFER,
      window.Math.max(0, lastEnd + lastCost * DUTY - window.performance.now())
    );
    if (!wait) return schedule();
    deferred = window.setTimeout(() => { deferred = null; schedule(); }, wait);
  };

  view.addEventListener("input", schedule);
  doc.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  const ro = new window.ResizeObserver(schedule);
  // Ignore our own mutations, or render() -> mutation -> render() spins forever.
  const mo = new window.MutationObserver((records) => {
    for (const r of records) {
      const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (t && t.closest && t.closest("[data-a2-root],[data-a2-layer]")) continue;
      scheduleSoft();
      return;
    }
  });
  mo.observe(doc.body, { childList: true, subtree: true, characterData: true });
  for (const pane of doc.querySelectorAll(A.PANE_SEL)) ro.observe(pane);

  // ---- selection chip (text surface) -------------------------------------
  const chip = doc.createElement("button");
  chip.setAttribute("data-a2-chip", "");
  chip.textContent = "✎ annotate";
  chip.style.cssText =
    "position:absolute; display:none; pointer-events:auto; cursor:pointer; border:1px solid " + ACCENT +
    "; border-radius:12px; background:" + BG + "; color:" + ACCENT +
    "; font:11px system-ui, sans-serif; padding:3px 9px; box-shadow:0 2px 8px rgba(0,0,0,.2)";
  root.appendChild(chip);
  const hideChip = () => { chip.style.display = "none"; };
  let chipTimer = null;
  const onSelectionChange = () => {
    if (chipTimer) window.clearTimeout(chipTimer);
    chipTimer = window.setTimeout(() => {
      chipTimer = null;
      const sel = doc.getSelection();
      if (armedFor) return hideChip();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return hideChip();
      let n = sel.anchorNode;
      if (n && n.nodeType !== 1) n = n.parentElement;
      // Gate on a resolvable host, not on `.observablehq[cell]`: unnamed cells carry no
      // `cell` attribute, and editor-5 content sits beside its cell div rather than inside it.
      if (!n || !n.closest || n.closest("[data-a2-root],[data-a2-layer]") || !A.hostOf(n).hostNode) return hideChip();
      const rects = sel.getRangeAt(0).getClientRects();
      if (!rects.length) return hideChip();
      const last = rects[rects.length - 1];
      chip.style.left = window.Math.min(last.right + 6, window.innerWidth - 110) + "px";
      chip.style.top = window.Math.max(4, last.top - 30) + "px";
      chip.style.display = "block";
    }, 150);
  };
  doc.addEventListener("selectionchange", onSelectionChange);
  const chipScrollHide = () => hideChip();
  doc.addEventListener("scroll", chipScrollHide, true);
  chip.addEventListener("pointerdown", (ev) => {
    ev.preventDefault(); // keep the selection alive through the press
    ev.stopPropagation();
    const anchor = A.describeSelection(doc.getSelection());
    hideChip();
    const sel = doc.getSelection();
    if (sel) sel.removeAllRanges();
    if (anchor) select((store.create(anchor) || {}).id);
  });

  // ---- armed point placement (svg / image / element) ----------------------
  // No affordance of its own: arming is a verb the notebook's own chrome offers (burger
  // menu, ⌘K palette). Armed state reads out through `status` and the crosshair cursor.
  // One armed mechanism serves both "place a new annotation" and "re-anchor this one"
  // (`armedFor` is "new" or an annotation id). The press is NOT swallowed — that would
  // kill text selection — so a drag over prose yields a quote anchor and a plain click
  // yields a point anchor. Only the trailing `click` is eaten, which is what would
  // otherwise open the target cell's inline editor and re-apply its definition.
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
  let armedFor = null;
  let downPt = null;

  const armedDown = (ev) => {
    const hit = doc.elementFromPoint(ev.clientX, ev.clientY);
    downPt = hit && hit.closest("[data-a2-root],[data-a2-layer]") ? null : { x: ev.clientX, y: ev.clientY, hit };
  };
  const armedUp = () => {
    if (!downPt) return;
    const start = downPt;
    downPt = null;
    const target = armedFor;
    doc.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => doc.removeEventListener("click", swallow, true), 400);
    disarm();

    const sel = doc.getSelection();
    let anchor = sel && !sel.isCollapsed && sel.rangeCount ? A.describeSelection(sel) : null;
    if (anchor && sel) sel.removeAllRanges();
    if (!anchor) anchor = A.describePoint(start.x, start.y, start.hit);
    if (!anchor) return;
    if (target === "new") select((store.create(anchor) || {}).id);
    else store.patch(target, { anchor });
  };

  const disarm = () => {
    if (!armedFor) return;
    armedFor = null;
    downPt = null;
    doc.removeEventListener("pointerdown", armedDown, true);
    doc.removeEventListener("pointerup", armedUp, true);
    doc.documentElement.style.cursor = "";
    schedule();
  };
  const arm = (target) => {
    if (armedFor) disarm();
    armedFor = target;
    hideChip();
    doc.documentElement.style.cursor = "crosshair";
    doc.addEventListener("pointerdown", armedDown, true);
    doc.addEventListener("pointerup", armedUp, true);
    schedule();
  };

  // ---- selection ----------------------------------------------------------
  let selectedId = null;
  const select = (id) => {
    if (selectedId === id) return;
    selectedId = id || null;
    schedule();
  };
  const onDocDown = (ev) => {
    const t = ev.target;
    if (t && t.closest && t.closest("[data-ann-id]")) return;
    select(null);
  };
  doc.addEventListener("pointerdown", onDocDown, true);
  const onKey = (ev) => {
    if (ev.key !== "Escape") return;
    if (armedFor) disarm();
    else select(null);
  };
  doc.addEventListener("keydown", onKey, true);

  // ---- teardown -----------------------------------------------------------
  invalidation.then(() => {
    disarm();
    hideChip();
    for (const p of parts.values()) {
      if (p.cancel) p.cancel();
      closeEditor(p);
    }
    parts.clear();
    if (chipTimer) window.clearTimeout(chipTimer);
    if (deferred) { window.clearTimeout(deferred); deferred = null; }
    queued = false;
    doc.removeEventListener("pointerdown", onDocDown, true);
    doc.removeEventListener("keydown", onKey, true);
    doc.removeEventListener("selectionchange", onSelectionChange);
    doc.removeEventListener("scroll", chipScrollHide, true);
    view.removeEventListener("input", schedule);
    doc.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
    ro.disconnect();
    mo.disconnect();
    for (const L of layers.values()) if (L.pane) L.el.remove();
    root.remove();
  });

  status.enabled = true;
  status.isArmed = () => armedFor !== null;
  status.arm = () => (armedFor ? disarm() : arm("new"));
  status.disarm = () => disarm();
  status.toggle = () => {
    $1.value = false;
    $1.dispatchEvent(new window.Event("input", { bubbles: true }));
    return false;
  };

  render();
  if ($1.__a2armOnEnable) { $1.__a2armOnEnable = false; arm("new"); }
  return status;
};
const _a2docPlugins = function _a2docPlugins(md){return(
md`## No chrome of its own

Annotating is a global verb, so it is offered by the page's own chrome: a menu item and a
command, both registered on shared plugin buses. This module imports neither lopepage-2 nor
the command palette — they read the registry. The only floating affordance is the ✎ chip
that follows a text selection.`
)};
const _a2menu = function _a2MenuItem(plugins,a2Layer,invalidation)
{
  // Annotating is a global verb, so it belongs in the page's own chrome rather than in a
  // floating button annotate paints over the document. Registers straight onto the
  // shared plugin-registry "lp2-menu" set — no import of lopepage-2.
  plugins.add("lp2-menu", {
    id: "annotate",
    order: 4,
    label: "Annotate",
    svg: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M2.4 3.4h11.2v7.2H6.9L3.9 13.2v-2.6H2.4Z"/><path d="M5.2 6.1h5.6M5.2 8.2h3.4"/></svg>',
    action: () => a2Layer.arm()
  }, { invalidation });
  return "registered: annotate menu item";
};
const _a2cmds = function _a2Commands(plugins,a2Layer,invalidation)
{
  // ⌘K provider. Commands carry an `action`, so they run the verb instead of navigating.
  const WORDS = ["annotate", "annotation", "note", "comment", "callout", "highlight"];
  const provider = (query) => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return [];
    // Scored above the cell/module finders (which top out around 200): typing "ann" in a
    // notebook full of annotation_* cells buried the verb under its own data.
    let score = 0;
    for (const w of WORDS) {
      if (w.startsWith(q)) score = window.Math.max(score, 1000);
      else if (w.indexOf(q) !== -1) score = window.Math.max(score, 900);
    }
    if (!score) return [];
    const on = a2Layer.enabled !== false;
    const armed = typeof a2Layer.isArmed === "function" && a2Layer.isArmed();
    return [
      {
        label: "\uD83D\uDCAC Annotate",
        module: "annotate",
        hint: armed ? "armed — select text or click a target" : "select text or click a target",
        badge: armed ? "armed" : null,
        action: () => a2Layer.arm(),
        score: score
      },
      {
        label: "\uD83D\uDCAC Annotations: " + (on ? "hide the layer" : "show the layer"),
        module: "annotate",
        action: () => a2Layer.toggle(),
        score: score - 10
      }
    ];
  };
  plugins.add("lopecode_commands", provider, { invalidation });
  return "registered: annotate commands";
};
const _a2docTourCells = function _a2docTourCells(md){return(
md`## The notes on this page

Here they are, as cells. Six records and six notes, defined in this module like everything
else — which is why they are still here after an export, and why deleting one deletes the
note it describes.`
)};
const _a2tourTitle = function _a2tourTitle(annotation){return(
annotation({
  pid: "_a2hdr",
  quote: {prefix: "", exact: "Annotate", suffix: "\nNotes pinned to things. Select "},
  box: {dx: 300, dy: 10, w: 270}
})
)};
const _a2tourTitleNote = function _a2tourTitleNote(md){return(
md`Hello. I am an annotation: this note, plus a record cell saying I point at that word.
Two cells in this notebook — delete them and I am gone.`
)};
const _a2tourProse = function _a2tourProse(annotation){return(
annotation({
  cell: "demoProse",
  pid: "_a2demoProse",
  quote: {prefix: "so the note has something to be ", exact: "told apart", suffix: " from."},
  box: {dx: 320, dy: 10, w: 260}
})
)};
const _a2tourProseNote = function _a2tourProseNote(md){return(
md`I quote the third *told apart*, not the first. My record keeps the words either side of
mine, and that is how the finder tells them apart.`
)};
const _a2tourPlot = function _a2tourPlot(annotation){return(
annotation({
  cell: "demoPlot",
  pid: "_a2demoPlot",
  path: "svg:nth-of-type(1)",
  data: {x: "2026-03-12T00:00:00.000Z", y: 122},
  box: {dx: 300, dy: -40, w: 260}
})
)};
const _a2tourPlotNote = function _a2tourPlotNote(md){return(
md`I am pinned to a datum — 12 March, 122 — not to a pixel. Pan the chart and I travel with
it; pan past me and I go amber, because a scale will happily extrapolate a point the chart
is no longer drawing.`
)};
const _a2tourSvg = function _a2tourSvg(annotation){return(
annotation({
  cell: "demoSvg",
  pid: "_a2demoSvg",
  path: "div:nth-of-type(1) > svg:nth-of-type(1)",
  svg: {x: 50, y: 50},
  box: {dx: 260, dy: -40, w: 250}
})
)};
const _a2tourSvgNote = function _a2tourSvgNote(md){return(
md`I live at (50, 50) in the drawing's own units. Zoom in — the circle and I move together,
because my position is re-projected each frame rather than remembered in pixels.`
)};
const _a2tourImage = function _a2tourImage(annotation){return(
annotation({
  cell: "demoImage",
  pid: "_a2demoImage",
  path: "img:nth-of-type(1)",
  frac: {fx: 0.25, fy: 0.5},
  box: {dx: 200, dy: -20, w: 260}
})
)};
const _a2tourImageNote = function _a2tourImageNote(md){return(
md`A bitmap has no coordinate system of its own to appeal to, so I am a quarter across and
half way down the box. A resize is all I survive.`
)};
const _a2tourVolatile = function _a2tourVolatile(annotation){return(
annotation({
  cell: "demoVolatile",
  pid: "_a2demoVolatile",
  quote: {prefix: "mm, which is\nhigher ", exact: "than the", suffix: "\nprevious run."},
  box: {dx: 260, dy: 40, w: 270}
})
)};
const _a2tourVolatileNote = function _a2tourVolatileNote(md){return(
md`Press the button above. My quote disappears, and rather than guess at a new position I
slide to the top of my cell and turn amber. ⌖ re-anchors me.`
)};
const _a2demoSeries = function _a2demoSeries()
{
  const out = [];
  const t0 = window.Date.UTC(2026, 0, 1);
  for (let i = 0; i < 24; i++) {
    out.push({
      date: new window.Date(t0 + i * 86400000 * 7),
      value: window.Math.round(100 + 40 * window.Math.sin(i / 3) + 3 * i)
    });
  }
  return out;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_a2hdr", null, ["md"], _a2hdr);  
  $def("_a2docUse", null, ["md"], _a2docUse);  
  $def("_a2ven", "viewof annotationsEnabled", ["Inputs"], _a2ven);  
  $def("_a2venv", "annotationsEnabled", ["Generators","viewof annotationsEnabled"], _a2venv);  
  $def("_a2docDemos", null, ["md"], _a2docDemos);  
  $def("_a2demoProse", "demoProse", ["md"], _a2demoProse);  
  $def("_a2docChart", null, ["md"], _a2docChart);  
  $def("_a2vpw", "viewof demoPlotPan", ["Inputs"], _a2vpw);  
  $def("_a2vpwv", "demoPlotPan", ["Generators","viewof demoPlotPan"], _a2vpwv);  
  $def("_a2demoPlot", "demoPlot", ["Plot","demoSeries","demoPlotPan"], _a2demoPlot);  
  $def("_a2docVector", null, ["md"], _a2docVector);  
  $def("_a2vsz", "viewof demoSvgZoom", ["Inputs"], _a2vsz);  
  $def("_a2vszv", "demoSvgZoom", ["Generators","viewof demoSvgZoom"], _a2vszv);  
  $def("_a2demoSvg", "demoSvg", ["demoSvgZoom"], _a2demoSvg);  
  $def("_a2docBitmap", null, ["md"], _a2docBitmap);  
  $def("_a2demoImage", "demoImage", [], _a2demoImage);  
  $def("_a2docUnnamed", null, ["md"], _a2docUnnamed);  
  $def("_a2docBeside", null, ["md"], _a2docBeside);  
  $def("_a2docAdrift", null, ["md"], _a2docAdrift);  
  $def("_a2vsh", "viewof demoShuffle", ["Inputs"], _a2vsh);  
  $def("_a2vshv", "demoShuffle", ["Generators","viewof demoShuffle"], _a2vshv);  
  $def("_a2demoVolatile", "demoVolatile", ["md","demoShuffle"], _a2demoVolatile);  
  $def("_a2docAuthored", null, ["md"], _a2docAuthored);  
  $def("_a2docImpl", null, ["md"], _a2docImpl);  
  $def("_a2docSurfaces", null, ["md"], _a2docSurfaces);  
  $def("_a2anch", "a2Anchors", ["runtime","persistentId","getVariableByPersistentId"], _a2anch);  
  $def("_a2docApi", null, ["md"], _a2docApi);  
  $def("_a2ann", "annotation", [], _a2ann);  
  $def("_a2surf", "surface", ["a2Anchors"], _a2surf);  
  $def("_a2docStore", null, ["md"], _a2docStore);  
  $def("_a2vann", "viewof annotations", ["Inputs"], _a2vann);  
  $def("_a2vannv", "annotations", ["Generators","viewof annotations"], _a2vannv);  
  $def("_a2self", "viewof a2Self", ["thisModule"], _a2self);  
  $def("_a2selfv", "a2Self", ["Generators","viewof a2Self"], _a2selfv);  
  $def("_a2ced", "cellEditor", ["runtime","importShim"], _a2ced);  
  $def("_a2store", "a2Store", ["runtime","viewof annotations","compile","importShim","onCodeChange","invalidation","viewof a2Self"], _a2store);  
  $def("_a2docLayer", null, ["md"], _a2docLayer);  
  $def("_a2layer", "a2Layer", ["viewof annotations","annotationsEnabled","a2Anchors","a2Store","invalidation","observe","Inspector","cellEditor","decompile","viewof annotationsEnabled","isOnObservableCom"], _a2layer);  
  $def("_a2docPlugins", null, ["md"], _a2docPlugins);  
  $def("_a2menu", "a2MenuItem", ["plugins","a2Layer","invalidation"], _a2menu);  
  $def("_a2cmds", "a2Commands", ["plugins","a2Layer","invalidation"], _a2cmds);  
  $def("_a2docTourCells", null, ["md"], _a2docTourCells);  
  $def("_a2tourTitle", "annotation_tour_title", ["annotation"], _a2tourTitle);  
  $def("_a2tourTitleNote", "annotation_tour_title_note", ["md"], _a2tourTitleNote);  
  $def("_a2tourProse", "annotation_tour_prose", ["annotation"], _a2tourProse);  
  $def("_a2tourProseNote", "annotation_tour_prose_note", ["md"], _a2tourProseNote);  
  $def("_a2tourPlot", "annotation_tour_plot", ["annotation"], _a2tourPlot);  
  $def("_a2tourPlotNote", "annotation_tour_plot_note", ["md"], _a2tourPlotNote);  
  $def("_a2tourSvg", "annotation_tour_svg", ["annotation"], _a2tourSvg);  
  $def("_a2tourSvgNote", "annotation_tour_svg_note", ["md"], _a2tourSvgNote);  
  $def("_a2tourImage", "annotation_tour_image", ["annotation"], _a2tourImage);  
  $def("_a2tourImageNote", "annotation_tour_image_note", ["md"], _a2tourImageNote);  
  $def("_a2tourVolatile", "annotation_tour_volatile", ["annotation"], _a2tourVolatile);  
  $def("_a2tourVolatileNote", "annotation_tour_volatile_note", ["md"], _a2tourVolatileNote);  
  $def("_a2demoSeries", "demoSeries", [], _a2demoSeries);  
  main.define("module @tomlarkworthy/plugin-registry", async () => runtime.module((await import("/@tomlarkworthy/plugin-registry.js?v=4")).default));  
  main.define("plugins", ["module @tomlarkworthy/plugin-registry", "@variable"], (_, v) => v.import("plugins", _));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("importShim", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("importShim", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("persistentId", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("persistentId", _));  
  main.define("getVariableByPersistentId", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("getVariableByPersistentId", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("isOnObservableCom", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("isOnObservableCom", _));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));  
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}
