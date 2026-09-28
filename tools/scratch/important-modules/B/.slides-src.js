const _n7suop = function _title(md){return(
md`# Slides

A slideshow that is a view over a notebook's cells. Each slide shows the live output of one or more named cells, and the deck owns only their order. The presentation layer, layouts and keyboard controls follow [@jwolondon/observable-embedded-slideshow](https://observablehq.com/@jwolondon/observable-embedded-slideshow), which wraps [reveal.js](https://revealjs.com). reveal.js 6.0.2 comes from [@tomlarkworthy/reveal-js-6](https://observablehq.com/@tomlarkworthy/reveal-js-6), which stores it in the notebook file, so the deck works offline.`
)};
const _1k593zg = function _deck(slideshow,runtime,invalidation,slidesModule){return(
slideshow(runtime, {
  invalidation,
  module: slidesModule,
  filename: "slides.html",
  slides: [
    {cell: "title_slide", layout: "upper"},
    {cell: "lens_slide", layout: "left"},
    {cell: ["viewof frequency", "wave_plot"], layout: "columns", ratios: [1, 2]},
    {cell: "stripes", layout: "fit"},
    {cell: "closing_slide", layout: "central"}
  ]
})
)};
const _11piquc = function _usage(md){return(
md`## Using it

~~~js
import {slideshow} from "@tomlarkworthy/slides"

deck = slideshow(runtime, {
  invalidation,             // required: tears down the deck and returns adopted cells
  module,                   // module whose cells are slides, default main
  slides: [                 // the order; rewritten in place by the builder
    "intro",                                        // one cell, reveal's default layout
    {cell: "chart", layout: "fit"},                 // one cell, a built-in layout
    {cell: ["viewof n", "chart2"], layout: "columns", ratios: [1, 2]},
    {cell: "outro", layout: "central", notes: "thank the audience"}
  ],
  width: 1600, height: 900, // reveal.js slide size; the deck scales to fit
  transition: "none",       // other options are passed to reveal.js
  builder: true,            // show the ✎ Edit slides strip
  persist: true,            // write builder changes back into this cell's source
  filename: "talk.html"     // show a download link that saves the notebook under this name
})
~~~

\`runtime\` comes from \`@tomlarkworthy/runtime-sdk\`. A slide entry is a cell name, an array of names (a columns slide), or an object with \`cell\` plus any of \`layout\` (\`default\`, \`central\`, \`upper\`, \`left\`, \`columns\`, \`fit\`), \`ratios\`, \`notes\`, \`timing\`, \`className\`, \`contentClassName\` and the reveal.js \`background*\` keys. Use the \`viewof\` name to put an input on a slide.

**Controls.** Click the deck to give it keyboard focus. → ↓ PageDown N Space go forward; ← ↑ PageUp P Shift+Space go back; Home and End jump to the ends; F toggles full screen; O toggles the overview; B V or . pause.

**Presenting offline.** With \`filename\` set, the bar under the deck has a ⤓ link. It calls \`downloadAnchor\` from \`@tomlarkworthy/exporter-3\`, which serialises the whole notebook — every module, the embedded reveal.js and the current cell sources — into one HTML file under that name. Open that file from disk and the deck runs with no network.

**Editing.** ✎ Edit slides opens a strip of cards, one per slide, with the current slide highlighted. Under the strip, each cell on the current slide has its source open in an editor; change slide, by clicking a card or with the keyboard, and the editors follow. Drag a card to reorder, pick a layout, ⇥ merges a slide into the next as columns, ⇤ splits it again, ✕ removes it, and ＋ add cell lists the module's named cells not yet on a slide. Every arrangement change rewrites the \`slides:\` literal of the calling cell, so the order is ordinary source code that exports, diffs and undoes like any other edit.`
)};
const _lqs3bv = function _lens(md){return(
md`## Why a lens

A slide is not a copy of a cell. The deck observes each named cell and adopts its live output, so editing a cell updates its slide, and an input on a slide drives the rest of the notebook. The frequency slider on slide 3 is the cell \`viewof frequency\`; \`wave_plot\` depends on it and recomputes as it moves.

The deck stores one thing: the \`slides:\` list. It is both the set of cells shown and their order, so there is no second list to drift out of step with it — the failure \`@tomlarkworthy/grid-container\` has to guard against with its separate \`include:\` and \`layout:\` literals. Delete the \`deck\` cell and every slide cell keeps computing, with its output back in the notebook; put it back and the same deck returns.

The difference from [@tomlarkworthy/sheet](https://observablehq.com/@tomlarkworthy/sheet) is where order comes from. A sheet derives position from the cell's name (\`B3\`), so it needs no stored layout at all. Slides have a free order that no name encodes, so the deck owns it, the same way grid-container owns positions.`
)};
const _1tj0d1b = function _demo_cells(md){return(
md`## The demo deck's cells

These are ordinary cells. While the deck above is showing them, their output lives on the slides, and each appears here as an empty slot.`
)};
const _ukavys = function _title_slide(md){return(
md`# Slides as cells
## A lens from notebook cells to a reveal.js deck`
)};
const _1feppgf = function _lens_slide(md){return(
md`## Each slide is a live cell
- The deck names cells; it does not copy them
- Edit a cell and its slide updates
- Inputs on a slide drive the notebook
- The order is one literal, rewritten by the builder`
)};
const _13ib75n = function _frequency(Inputs){return(
Inputs.range([1, 12], {label: "frequency", step: 1, value: 3})
)};
const _18cwxn4 = (G, _) => G.input(_);
const _f8uns3 = function _wave_plot(frequency,htl)
{
  const w = 640, h = 360, n = 400;
  const points = Array.from({length: n}, (_, i) => {
    const x = i / (n - 1);
    return [x * w, h / 2 - Math.sin(x * frequency * 2 * Math.PI) * h * 0.4];
  });
  return htl.svg`<svg viewBox="0 0 ${w} ${h}" style="max-width: 100%">
    <line x1="0" x2="${w}" y1="${h / 2}" y2="${h / 2}" stroke="#bbb" />
    <path d="M${points.join("L")}" fill="none" stroke="#2a76dd" stroke-width="4" />
  </svg>`;
};
const _1e4zsb1 = function _stripes(htl)
{
  const w = 1600, h = 900, bands = 24;
  return htl.svg`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
    ${Array.from({length: bands}, (_, i) => htl.svg`<rect x="${(i * w) / bands}" y="0" width="${w / bands + 1}" height="${h}" fill="hsl(${(i * 360) / bands} 65% 60%)" />`)}
    <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="120" font-family="sans-serif" fill="white">layout: "fit"</text>
  </svg>`;
};
const _39lx92 = function _closing_slide(md){return(
md`## Try it
Open **✎ Edit slides** below the deck,
drag a card, then read the \`deck\` cell's source.`
)};
const _yr9aur = function _slidesModule(thisModule){return(
thisModule()
)};
const _1hi1xa = (G, _) => G.input(_);
const _k2hmhs = function _slideshow(main,slideBuilder,coreSlideStyle,liveDecks,cellEditor,htl,Node,Inspector,observe,columnTracks,decompile,spliceSlides,compile,realize,downloadAnchor,Reveal,onCodeChange) {
  const canonName = (n) => typeof n === "string" ? n.replace(/^(viewof|mutable)\$/, "$1 ") : n;
  const platformName = (n) => String(n).replace(/^(viewof|mutable) /, "$1$");
  const lookup = (m, n) => m._scope.get(n) ?? m._scope.get(platformName(n));
  const LAYOUTS = {
    default: {},
    central: { className: "slide-central" },
    upper: { className: "slide-central slide-central--upper" },
    left: { className: "slide-body" },
    columns: { className: "slide-columns-page", contentClassName: "slide-columns" },
    fit: { className: "slide-fit-page", contentClassName: "slide-fit" }
  };
  const BACKGROUND_KEYS = ["backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat",
    "backgroundOpacity", "backgroundTransition", "backgroundColor", "backgroundGradient"];
  const normalise = (entry) => {
    const d = typeof entry === "string" || Array.isArray(entry) ? { cell: entry } : { ...entry };
    d.cells = (Array.isArray(d.cell) ? d.cell : [d.cell]).filter((c) => typeof c === "string");
    return d;
  };
  const literal = (v) => Array.isArray(v) ? `[${v.map(literal).join(", ")}]` : JSON.stringify(v);
  const serialiseEntry = (d) => {
    const { cells, ...rest } = d;
    const cell = cells.length === 1 ? cells[0] : cells;
    const keys = Object.keys(rest).filter((k) => k !== "cell" && rest[k] !== undefined);
    if (!keys.length && typeof cell === "string") return JSON.stringify(cell);
    return "{" + [["cell", cell], ...keys.map((k) => [k, rest[k]])]
      .map(([k, v]) => `${k}: ${literal(v)}`).join(", ") + "}";
  };
  const isImportVar = (v) => v._inputs?.some((i) => i._name === "@variable");

  const make = (rt, {
    invalidation,
    module = main,
    slides = [],
    width = 1600,
    height = 900,
    transition = "none",
    builder = true,
    persist = true,
    filename = null,
    ...config
  } = {}) => {
    // imports settle over several recomputes at boot; each re-runs this cell, so an unchanged
    // deck is handed back as-is instead of being rebuilt (which blanks every slide for a frame)
    const key = JSON.stringify({ slides, width, height, transition, builder, persist, filename, config }) +
      String(make) + String(slideBuilder) + String(coreSlideStyle);
    const prev = liveDecks.get(module);
    if (prev && prev.rt === rt && prev.key === key && !prev.disposed) {
      prev.claim(invalidation, cellEditor);
      return prev.wrap;
    }
    const remembered = prev?.memory || {};
    prev?.dispose();
    const entry = { rt, key, memory: null, disposed: false };
    liveDecks.set(module, entry);
    let latestCellEditor = cellEditor;

    const deckState = slides.map(normalise);

    const frame = htl.html`<div class="reveal observable-deck-frame"></div>`;
    const root = htl.html`<div class="reveal observable-deck" tabindex="0"><div class="slides"></div></div>`;
    frame.append(coreSlideStyle(), root);
    const wrap = htl.html`<div class="slideshow">${frame}</div>`;
    let disposed = false;
    const container = root.querySelector(".slides");
    const cleanups = [];
    const self = () => [...rt._variables].find((v) => v._value === wrap);

    // --- the lens: each slide adopts the live DOM of the cells it names
    const renderValue = (value, name) => {
      if (value instanceof Node) return value;
      const node = document.createElement("div");
      new Inspector(node).fulfilled(value, name);
      return node;
    };
    const renderError = (error, name) => {
      const node = document.createElement("pre");
      node.className = "slide-error";
      node.textContent = `${name}: ${error?.message ?? error}`;
      return node;
    };
    const mount = (body, name) => {
      let current = document.createElement("div");
      current.className = "slide-placeholder";
      body.append(current);
      const v = lookup(module, name);
      if (!v || v._type !== 1) {
        current.replaceWith((current = renderError("no cell with this name", name)));
        return;
      }
      const place = (node) => {
        if (node === current) return;
        if (current.parentNode === body) current.replaceWith(node);
        else body.append(node);
        current = node;
      };
      const observer = {
        _node: body,
        pending() {},
        fulfilled: (value) => place(renderValue(value, name)),
        rejected: (error) => place(renderError(error, name))
      };
      const cancel = observe(v, observer, { detachNodes: true });
      v._module._runtime._computeSoon();
      cleanups.push(() => {
        cancel();
        // hand an adopted element back to the notebook's own view
        // (the Inspector renders an element that still has a parent as an object, so detach first)
        if (v._value instanceof Node && v._value.parentNode === body && v._observer?.fulfilled) {
          v._value.remove();
          v._observer.fulfilled(v._value, v._name);
        }
      });
    };

    deckState.forEach((d) => {
      const layout = LAYOUTS[d.layout] || LAYOUTS.default;
      const section = document.createElement("section");
      section.className = [layout.className, d.className].filter(Boolean).join(" ");
      const body = document.createElement("div");
      body.className = ["slide-content", layout.contentClassName, d.contentClassName].filter(Boolean).join(" ");
      d.cells.forEach((name) => mount(body, name));
      if (body.classList.contains("slide-columns"))
        body.style.setProperty("--slide-columns", columnTracks(d.cells.length, d.ratios));
      section.append(body);
      for (const k of BACKGROUND_KEYS) if (d[k] != null) section.dataset[k] = String(d[k]);
      if (d.backgroundImage != null) {
        section.dataset.backgroundSize ??= "contain";
        section.dataset.backgroundPosition ??= "center";
        section.dataset.backgroundRepeat ??= "no-repeat";
      }
      if (d.notes != null) {
        const aside = document.createElement("aside");
        aside.className = "notes";
        aside.textContent = d.notes;
        section.append(aside);
      }
      if (d.timing != null) section.dataset.timing = String(d.timing);
      container.append(section);
    });
    if (!deckState.length) {
      const section = document.createElement("section");
      section.className = "slide-central";
      section.innerHTML = `<div class="slide-content"><p>No slides yet. Open the builder below and add a cell.</p></div>`;
      container.append(section);
    }

    // --- persistence: the order lives in the calling cell's own `slides:` literal
    const writeOrder = async (next) => {
      if (!persist) return;
      const v = self();
      if (!v) return console.warn("slideshow: defining cell not found; order not saved");
      const idx = deck?.getIndices?.() || {};
      entry.memory = { h: idx.h, v: idx.v, editing: strip?.open };
      const source = "[\n    " + next.map(serialiseEntry).join(",\n    ") + "\n  ]";
      const src = await decompile([v]);
      if (v._value !== wrap) return;
      const out = spliceSlides(src, source);
      if (!out || out === src) return;
      const [spec] = compile(out);
      const [fn] = await realize([spec._definition.toString()], rt);
      v.define(spec._name, spec._inputs, fn);
    };

    // --- the builder: order, layout, add, remove, edit — every action is a source rewrite
    let strip = null;
    const edit = (fn) => {
      const next = deckState.map((d) => ({ ...d, cells: [...d.cells] }));
      fn(next);
      writeOrder(next);
    };
    const candidates = () => {
      const used = new Set(deckState.flatMap((d) => d.cells));
      const me = self();
      return [...module._scope]
        .filter(([n, v]) => typeof n === "string" && v._type === 1 && v !== me)
        .map(([n, v]) => [canonName(n), v])
        .filter(([n, v]) => !/^(module |initial |mutable |cell )/.test(n) && !isImportVar(v))
        .filter(([n]) => !used.has(n) && !lookup(module, "viewof " + n))
        .filter(([, v]) => typeof v._value !== "function" && !v._value?.slideshow)
        .map(([n]) => n)
        .sort();
    };
    wrap.slideshow = {
      module,
      get order() { return deckState.map((d) => ({ ...d, cells: [...d.cells] })); },
      candidates,
      add: (name, at = deckState.length) => edit((s) => s.splice(at, 0, { cells: [name] })),
      remove: (i) => edit((s) => s.splice(i, 1)),
      move: (from, to) => edit((s) => s.splice(to, 0, ...s.splice(from, 1))),
      setLayout: (i, layout) => edit((s) => { s[i].layout = layout === "default" ? undefined : layout; }),
      setNotes: (i, notes) => edit((s) => { s[i].notes = notes || undefined; }),
      merge: (i) => edit((s) => { if (s[i + 1]) { s[i].cells.push(...s[i + 1].cells); s[i].layout = "columns"; s.splice(i + 1, 1); } }),
      split: (i) => edit((s) => { const [first, ...rest] = s[i].cells; s.splice(i, 1, { ...s[i], cells: [first], layout: s[i].layout === "columns" ? undefined : s[i].layout }, ...rest.map((c) => ({ cells: [c] }))); })
    };
    // an offline copy is the whole notebook, so the deck keeps working with the network unplugged
    const download = filename
      ? downloadAnchor({ className: "sl-download", title: `Save this notebook as ${filename} to present offline` }, `⤓ ${filename}`, { filename, mains: rt.mains })
      : null;
    if (builder || download) {
      strip = slideBuilder(wrap, { cellEditor: (...a) => latestCellEditor(...a), lookup: (n) => lookup(module, n), layouts: Object.keys(LAYOUTS), open: remembered.editing, arrange: builder, download });
      wrap.append(strip);
    }

    // --- Reveal needs the deck in the document to measure it
    let deck = null;
    wrap.ready = (async () => {
      while (!frame.isConnected) {
        await new Promise((r) => requestAnimationFrame(r));
        if (disposed) return null;
      }
      owner = self();
      deck = new Reveal(root, { ...config, width, height, transition, embedded: true, keyboard: false });
      await deck.initialize();
      if (disposed) { deck.destroy(); return null; }
      if (remembered.h != null) deck.slide(Math.min(remembered.h, deckState.length - 1), remembered.v);
      wrap.deck = deck;
      deck.on("slidechanged", () => strip?.sync(deck.getIndices().h));
      strip?.sync(deck.getIndices().h);
      root.addEventListener("keydown", onKeydown);
      return deck;
    })();

    const onKeydown = (event) => {
      if (event.ctrlKey || event.metaKey || event.target.closest?.("input, textarea, select, [contenteditable='true'], .cm-editor")) return;
      const nav = { skipFragments: event.altKey };
      switch (event.key) {
        case "ArrowRight": case "ArrowDown": case "PageDown": case "n": case "N": deck.next(nav); break;
        case "ArrowLeft": case "ArrowUp": case "PageUp": case "p": case "P": deck.prev(nav); break;
        case " ": event.shiftKey ? deck.prev(nav) : deck.next(nav); break;
        case "Home": deck.slide(0); break;
        case "End": deck.slide(deck.getHorizontalSlides().length - 1); break;
        case "o": case "O": deck.toggleOverview(); break;
        case "f": case "F": {
          const viewport = deck.getViewportElement();
          const doc = viewport.ownerDocument;
          (doc.fullscreenElement ? doc.exitFullscreen() : viewport.requestFullscreen())
            .catch((e) => console.warn("slideshow: fullscreen change refused", e));
          break;
        }
        case "b": case "B": case "v": case "V": case ".": deck.togglePause(); break;
        default: return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    // `invalidation` covers redefinition; deleting the cell never resolves it, so watch for that too
    let owner = null;
    let teardown = null;
    const dispose = () => {
      if (disposed) return;
      disposed = entry.disposed = true;
      clearTimeout(teardown);
      if (liveDecks.get(module) === entry) liveDecks.delete(module);
      offCodeChange();
      root.removeEventListener("keydown", onKeydown);
      for (const c of cleanups) c();
      strip?.dispose?.();
      deck?.destroy();
    };
    const offCodeChange = onCodeChange(({ variable, previous }) => {
      if (!variable && owner && previous?.variable === owner) dispose();
    });
    // a re-run that keeps this deck claims it before the grace period ends
    const claim = (inv, editor) => {
      clearTimeout(teardown);
      teardown = null;
      latestCellEditor = editor;
      inv?.then(() => { teardown = setTimeout(dispose, 3000); });
    };
    Object.assign(entry, { wrap, dispose, claim });
    claim(invalidation, cellEditor);
    return wrap;
  };
  return make;
};
const _nz9017 = function _slideBuilder(htl,CSS){return(
(wrap, { cellEditor, lookup, layouts, open = false, arrange = true, download = null }) => {
  const api = wrap.slideshow;
  const order = api.order;
  const el = htl.html`<div class="sl-builder">
  <div class="sl-bar">
    <button class="sl-toggle" type="button"></button>
    <span class="sl-count"></span>
    <span class="sl-hint">click the deck, then ← → to navigate · F fullscreen · O overview</span>
  </div>
  <div class="sl-panel">
    <ol class="sl-strip"></ol>
    <div class="sl-editor"></div>
  </div>
</div>`;
  const toggle = el.querySelector(".sl-toggle");
  const panel = el.querySelector(".sl-panel");
  const list = el.querySelector(".sl-strip");
  const editorHost = el.querySelector(".sl-editor");
  const count = el.querySelector(".sl-count");
  const setOpen = (b) => {
    el.open = b;
    panel.hidden = !b;
    toggle.textContent = b ? "✓ Done editing" : "✎ Edit slides";
    showEditors();
  };
  toggle.onclick = () => setOpen(!el.open);
  toggle.hidden = !arrange;
  if (download) toggle.after(download);

  const button = (text, title, onclick) => {
    const b = htl.html`<button type="button" title=${title}>${text}</button>`;
    b.onclick = (e) => { e.stopPropagation(); onclick(); };
    return b;
  };
  // while editing, the current slide's cells each get an editor-5 editor under the strip
  let current = 0, shown = null;
  function showEditors() {
    const d = el.open ? order[current] : null;
    const key = d ? `${current}:${d.cells.join("|")}` : null;
    if (key === shown) return;
    shown = key;
    editorHost.replaceChildren(...(d?.cells ?? []).map((name) => {
      const v = lookup(name);
      let ed;
      try { ed = v ? cellEditor(v, { pinned: true }) : htl.html`<em>no cell named ${name}</em>`; }
      catch (err) { ed = htl.html`<pre>editor failed: ${String(err)}</pre>`; }
      return htl.html`<div class="sl-cell-editor" data-cell=${name}><div class="sl-editor-head">${name}</div>${ed}</div>`;
    }));
  }
  const focusEditor = (name) => editorHost.querySelector(`[data-cell="${CSS.escape(name)}"]`)?.scrollIntoView({ block: "nearest" });

  // pointer events, not HTML5 drag-and-drop: mobile browsers do not fire dragstart for touch
  let drag = null, suppressClick = false;
  const cardAt = (x, y) => {
    const root = list.getRootNode();
    const hit = (root.elementFromPoint ? root : document).elementFromPoint(x, y)?.closest?.(".sl-card[data-i]");
    return hit && list.contains(hit) ? hit : null;
  };
  order.forEach((d, i) => {
    const layout = htl.html`<select title="layout">${layouts.map((l) => htl.html`<option>${l}`)}</select>`;
    layout.value = d.layout && layouts.includes(d.layout) ? d.layout : "default";
    layout.onchange = () => api.setLayout(i, layout.value);
    layout.onclick = (e) => e.stopPropagation();
    const names = htl.html`<div class="sl-names">${d.cells.map((n) => {
      const chip = htl.html`<span class="sl-name" title="edit ${n}">${n}</span>`;
      chip.onclick = (e) => { e.stopPropagation(); wrap.deck?.slide(i); focusEditor(n); };
      return chip;
    })}</div>`;
    const card = htl.html`<li class="sl-card" data-i=${i}>
  <div class="sl-card-head"><span class="sl-grip" title="drag to reorder">⠿</span><span class="sl-num">${i + 1}</span>${layout}</div>
  ${names}
  <div class="sl-actions"></div>
</li>`;
    const actions = card.querySelector(".sl-actions");
    if (i < order.length - 1) actions.append(button("⇥", "merge with next slide into columns", () => api.merge(i)));
    if (d.cells.length > 1) actions.append(button("⇤", "split into one slide per cell", () => api.split(i)));
    actions.append(button("✕", "remove from deck (the cell is kept)", () => api.remove(i)));
    card.onclick = () => { if (!suppressClick) wrap.deck?.slide(i); };
    card.onpointerdown = (e) => {
      if (e.button !== 0 || e.target.closest("select, button, .sl-name")) return;
      // touch drags only from the grip so the strip still scrolls
      if (e.pointerType !== "mouse" && !e.target.closest(".sl-grip")) return;
      drag = { from: i, x: e.clientX, y: e.clientY, active: false, over: null };
      card.setPointerCapture(e.pointerId);
    };
    card.onpointermove = (e) => {
      if (drag?.from !== i) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
        drag.active = true;
        card.classList.add("sl-dragging");
      }
      e.preventDefault();
      const over = cardAt(e.clientX, e.clientY);
      if (over !== drag.over) { drag.over?.classList.remove("sl-drop"); over?.classList.add("sl-drop"); drag.over = over; }
    };
    const endDrag = (commit) => {
      if (drag?.from !== i) return;
      const d = drag;
      drag = null;
      card.classList.remove("sl-dragging");
      d.over?.classList.remove("sl-drop");
      if (!d.active) return;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; });
      const to = d.over ? Number(d.over.dataset.i) : null;
      if (commit && to != null && to !== d.from) api.move(d.from, to);
    };
    card.onpointerup = () => endDrag(true);
    card.onpointercancel = () => endDrag(false);
    list.append(card);
  });

  const add = htl.html`<select class="sl-add"><option value="">＋ add cell…</option></select>`;
  const fillAdd = () => {
    const names = api.candidates();
    add.replaceChildren(htl.html`<option value="">${names.length ? "＋ add cell…" : "＋ no unplaced named cells"}</option>`,
      ...names.map((n) => htl.html`<option value=${n}>${n}`));
  };
  add.onfocus = fillAdd;
  add.onpointerdown = fillAdd;
  add.onchange = () => add.value && api.add(add.value);
  fillAdd();
  list.append(htl.html`<li class="sl-card sl-card-add">${add}</li>`);

  setOpen(!!open && arrange);
  el.sync = (h) => {
    current = h;
    showEditors();
    count.textContent = order.length ? `${h + 1} / ${order.length}` : "";
    list.querySelectorAll(".sl-card").forEach((c, i) => c.classList.toggle("sl-current", i === h));
  };
  el.dispose = () => editorHost.replaceChildren();
  return el;
}
)};
const _1vv1t5t = function _coreSlideStyle(revealCss){return(
() => {
  const style = document.createElement("style");
  style.textContent = revealCss + `
/* theme: reveal's white theme without its embedded fonts */
.observable-deck {
  --r-main-font: "Source Sans Pro", "Source Sans 3", Helvetica, Arial, sans-serif;
  --r-main-color: #222;
  --r-link-color: #2a76dd;
  --r-link-color-hover: #4a8be2;
  --r-block-margin: 20px;
  background: #fff;
  font: 400 42px/1.3 var(--r-main-font);
  color: var(--r-main-color);
}
.observable-deck :is(h1, h2, h3, h4, h5, h6) {
  margin: 0 0 20px;
  color: var(--r-main-color);
  font: 600 1em/1.2 var(--r-main-font);
  text-transform: uppercase;
  overflow-wrap: break-word;
}
.observable-deck h1 {font-size: 2.5em;}
.observable-deck h2 {font-size: 1.6em;}
.observable-deck h3 {font-size: 1.3em;}
.observable-deck :is(h1, h2, h3, h4, h5, h6):last-child {margin-bottom: 0;}
.observable-deck p {margin: var(--r-block-margin) 0;}
.observable-deck :is(ol, ul, dl) {display: inline-block; margin: 0 0 0 1em; text-align: left;}
.observable-deck :is(ol, ul) :is(ol, ul) {display: block; margin-left: 40px;}
.observable-deck :is(code, pre) {font-family: var(--monospace, ui-monospace, monospace); text-transform: none;}
.observable-deck pre {width: 90%; margin: var(--r-block-margin) auto; font-size: 0.55em; text-align: left;}
.observable-deck blockquote {width: 70%; margin: var(--r-block-margin) auto; font-style: italic;}
.observable-deck table {border-collapse: collapse; margin: auto;}
.observable-deck :is(th, td) {text-align: left; padding: 0.2em 0.5em; border-bottom: 1px solid;}
.observable-deck tbody tr:last-child > * {border-bottom: none;}
.observable-deck a {color: var(--r-link-color); text-decoration: none;}
.observable-deck a:hover {color: var(--r-link-color-hover);}
.observable-deck :is(.controls, .progress) {color: var(--r-link-color);}
.observable-deck-frame {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  overflow: visible;
}
.observable-deck {
  box-sizing: border-box;
  width: min(var(--deck-width, 640px), 100%);
  height: auto;
  aspect-ratio: 16 / 9;
  margin: 0;
  overflow: hidden;
}
.observable-deck .slides section:not(.stack) {box-sizing: border-box; height: 100%;}
.observable-deck .slide-content,
.observable-deck .slide-content > div {width: 100%; max-width: none;}
.observable-deck .slide-content :where(h1, h2, h3, h4, h5, h6, p, ul, ol, dl, blockquote, pre, table) {max-width: none !important;}
.observable-deck .slide-content table {font-family: inherit; font-size: inherit; line-height: inherit;}
.observable-deck .slide-content:has(> svg:only-child) {height: 100%;}
.observable-deck .slide-content > svg:only-child {display: block; width: 100%; height: 100%;}
.observable-deck .slide-content, .observable-deck .slide-content :where(p, li) {line-height: var(--slide-line-height, 1.3);}
.observable-deck .slide-content {font-weight: var(--slide-font-weight, 400);}

.observable-deck .slides section:is(.slide-central,.slide-body,.slide-columns-page) {padding: 60px 100px;}
.observable-deck .slides section.slide-central {text-align: center;}
.observable-deck .slides section.slide-central > .slide-content {
  display: grid;
  place-content: center;
  height: 100%;
  translate: 0 var(--slide-central-offset, 0);
}
.observable-deck .slides section.slide-central--upper {--slide-central-offset: -16.667%;}
.observable-deck .slides section.slide-body {text-align: left;}
.observable-deck .slides section.slide-body > .slide-content,
.observable-deck .slides section.slide-body > .slide-content > div:only-child {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  height: 100%;
}
.observable-deck .slides section.slide-body > .slide-content > *,
.observable-deck .slides section.slide-body > .slide-content > div:only-child > * {margin-block: 0;}
.observable-deck .slides section.slide-columns-page {text-align: left;}
.observable-deck .slide-content.slide-columns {
  display: grid;
  grid-template-columns: var(--slide-columns, repeat(2, minmax(0, 1fr)));
  gap: 2.5rem;
  align-items: center;
  height: 100%;
}
.observable-deck .slide-content.slide-columns > * {min-width: 0;}
.observable-deck .slides section.slide-fit-page {padding: 0;}
.observable-deck .slide-content.slide-fit {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  width: 100%;
  height: 100%;
}
.observable-deck .slide-content.slide-fit > :where(img, svg, canvas, video):only-child {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  margin: 0;
  object-fit: contain;
  object-position: center;
}
.observable-deck:focus-visible {outline: 3px solid var(--r-link-color); outline-offset: 3px;}
.observable-deck-frame > .observable-deck:fullscreen {
  width: 100%;
  height: 100%;
  max-width: none;
  aspect-ratio: auto;
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  .observable-deck *, .observable-deck *::before, .observable-deck *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}
/* the white theme is light: stop the notebook's dark scheme leaking into cell outputs */
.observable-deck {
  color-scheme: light;
  --theme-foreground: #222;
  --theme-foreground-focus: #2a76dd;
  --theme-background: #fff;
  --theme-background-alt: #f4f4f4;
  --theme-foreground-muted: #666;
  --theme-foreground-faint: #999;
  --theme-foreground-fainter: #bbb;
  --theme-foreground-faintest: #ddd;
}
/* Observable Inputs are sized in px for a ~640px notebook; the slide is 1600px wide */
.observable-deck .slide-content > form {
  zoom: var(--slide-input-zoom, 2.2);
  max-width: 100%;
  text-align: left;
}
/* a column is too narrow for label and control side by side */
.observable-deck .slide-columns > form {flex-wrap: wrap; width: 100%;}
.observable-deck .slide-columns > form > label {width: 100%;}
.observable-deck .slide-error {color: #b00020; font-size: 0.5em; white-space: pre-wrap; text-align: left;}
.observable-deck .slide-placeholder {min-height: 1em;}

/* builder: lives outside .reveal, so it takes the notebook's theme, not the deck's */
.slideshow .sl-builder {
  width: min(var(--deck-width, 640px), 100%);
  font: 13px/1.4 var(--sans-serif, system-ui, sans-serif);
  color: var(--theme-foreground, inherit);
  margin-top: 6px;
}
.slideshow .sl-bar {display: flex; align-items: center; gap: 10px; flex-wrap: wrap;}
.slideshow .sl-hint {color: var(--theme-foreground-muted, #888); font-size: 12px;}
.slideshow .sl-count {font-variant-numeric: tabular-nums; color: var(--theme-foreground-muted, #888);}
.slideshow .sl-builder button, .slideshow .sl-builder select, .slideshow .sl-download {
  font: inherit;
  color: inherit;
  background: var(--theme-background-alt, transparent);
  border: 1px solid var(--theme-foreground-faintest, #ccc);
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
}
.slideshow .sl-download {text-decoration: none; display: inline-block;}
.slideshow .sl-strip {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}
.slideshow .sl-card {
  border: 1px solid var(--theme-foreground-faintest, #ccc);
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--theme-background, transparent);
  cursor: grab;
  min-width: 0;
}
.slideshow .sl-card.sl-current {border-color: var(--theme-foreground-muted, #666); box-shadow: inset 3px 0 0 var(--theme-foreground-muted, #666);}
.slideshow .sl-card.sl-drop {outline: 2px dashed var(--theme-foreground-muted, #666);}
.slideshow .sl-card.sl-dragging {opacity: 0.5; cursor: grabbing;}
.slideshow .sl-grip {touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; color: var(--theme-foreground-muted, #888); padding: 2px 4px; margin: -2px 0 -2px -4px; font-size: 16px; line-height: 1;}
.slideshow .sl-card-add {justify-content: center; cursor: default; border-style: dashed;}
.slideshow .sl-card-head {display: flex; align-items: center; gap: 6px;}
.slideshow .sl-num {font-weight: 600; min-width: 1.5em;}
.slideshow .sl-card-head select {flex: 1; min-width: 0;}
.slideshow .sl-names {display: flex; flex-wrap: wrap; gap: 4px;}
.slideshow .sl-name {
  font-family: var(--monospace, ui-monospace, monospace);
  font-size: 12px;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--theme-background-alt, #eee);
  cursor: text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.slideshow .sl-name:hover {text-decoration: underline;}
.slideshow .sl-actions {display: flex; gap: 4px; justify-content: flex-end;}
.slideshow .sl-actions button {padding: 0 5px;}
.slideshow .sl-editor:not(:empty) {margin-top: 8px; display: flex; flex-direction: column; gap: 8px;}
.slideshow .sl-cell-editor {border: 1px solid var(--theme-foreground-faintest, #ccc); border-radius: 6px; padding: 6px;}
.slideshow .sl-editor-head {display: flex; justify-content: space-between; align-items: center; font-family: var(--monospace, monospace); margin-bottom: 4px;}
`;
  return style;
}
)};
const _1ospo4w = function _implementation(md){return(
md`## Implementation

\`slideshow\` builds one \`<section>\` per entry and attaches a runtime-sdk \`observe\` listener to each named cell with \`detachNodes\`, so the slide adopts the cell's element. Non-element values are drawn with the notebook Inspector. On invalidation each listener is cancelled and the element is handed back to the notebook's own observer. Builder actions compute a new entry list, splice it over the \`slides:\` array found by parsing the calling cell's decompiled source, and redefine that cell; the deck position is kept across the remount.`
)};
const _1un0jzk = function _columnTracks(){return(
(count, ratios = []) => {
  if (!Array.isArray(ratios)) throw new TypeError("ratios must be an array");
  if (ratios.some((r) => !Number.isFinite(r) || r <= 0)) throw new RangeError("ratios must contain positive finite numbers");
  return Array.from({length: count}, (_, i) => `minmax(0, ${ratios[i] ?? 1}fr)`).join(" ");
}
)};
const _qhuijx = function _spliceSlides(parser){return(
(src, literal) => {
  const cell = parser.parseCell(src);
  let hit = null, call = null;
  const walk = (n) => {
    if (!n || typeof n.type !== "string" || hit) return;
    if (n.type === "Property" && !n.computed && (n.key.name ?? n.key.value) === "slides") {
      hit = n.value;
      return;
    }
    if (n.type === "CallExpression" && !call && n.callee?.name === "slideshow") call = n;
    for (const k in n) {
      const c = n[k];
      if (Array.isArray(c)) c.forEach(walk);
      else if (c && typeof c === "object") walk(c);
    }
  };
  walk(cell.body);
  if (hit) return src.slice(0, hit.start) + literal + src.slice(hit.end);
  const opts = call?.arguments?.[1];
  if (opts?.type === "ObjectExpression") return src.slice(0, opts.start + 1) + `\n  slides: ${literal},` + src.slice(opts.start + 1);
  if (call) return src.slice(0, call.end - 1) + `, {slides: ${literal}}` + src.slice(call.end - 1);
  return null;
}
)};
const _j57v1n = async function _test_deck_renders_every_slide(deck)
{
  const d = await deck.ready;
  const sections = deck.querySelectorAll(".observable-deck .slides > section");
  if (!d) throw new Error("reveal.js did not initialise");
  if (sections.length !== deck.slideshow.order.length) throw new Error(`${sections.length} sections for ${deck.slideshow.order.length} entries`);
  return sections.length;
};
const _1cqp72s = async function _test_slides_adopt_live_cells(deck,frequency)
{
  await deck.ready;
  const svg = deck.querySelector(".slide-columns > svg");
  if (!svg) throw new Error("wave_plot is not on the columns slide");
  return frequency;
};
const _1pjyuhq = function _test_splice_rewrites_only_the_slides_literal(spliceSlides)
{
  const cases = [
    [`deck = slideshow(runtime, {invalidation, slides: ["a", {cell: "b", layout: "fit"}], width: 800})`,
     `deck = slideshow(runtime, {invalidation, slides: ["b", "a"], width: 800})`],
    [`deck = slideshow(runtime, {invalidation})`,
     `deck = slideshow(runtime, {\n  slides: ["b", "a"],invalidation})`],
    [`deck = slideshow(runtime)`,
     `deck = slideshow(runtime, {slides: ["b", "a"]})`]
  ];
  for (const [src, want] of cases) {
    const got = spliceSlides(src, `["b", "a"]`);
    if (got !== want) throw new Error(`${src} -> ${got}`);
  }
  return cases.length;
};
const _lc2g4s = function _liveDecks() {return (new Map());};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(["reveal-6.0.2.mjs.gz","reveal-6.0.2.css.gz"].map((name) => {
    const module_name = "@tomlarkworthy/slides";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/observablejs-toolchain", async () => runtime.module((await import("/@tomlarkworthy/observablejs-toolchain.js?v=4")).default));  
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));  
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));  
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));  
  main.define("module @tomlarkworthy/reveal-js-6", async () => runtime.module((await import("/@tomlarkworthy/reveal-js-6.js?v=4")).default));  
  $def("_n7suop", "title", ["md"], _n7suop);  
  $def("_1k593zg", "deck", ["slideshow","runtime","invalidation","slidesModule"], _1k593zg);  
  $def("_11piquc", "usage", ["md"], _11piquc);  
  $def("_lqs3bv", "lens", ["md"], _lqs3bv);  
  $def("_1tj0d1b", "demo_cells", ["md"], _1tj0d1b);  
  $def("_ukavys", "title_slide", ["md"], _ukavys);  
  $def("_1feppgf", "lens_slide", ["md"], _1feppgf);  
  $def("_13ib75n", "viewof frequency", ["Inputs"], _13ib75n);  
  $def("_18cwxn4", "frequency", ["Generators","viewof frequency"], _18cwxn4);  
  $def("_f8uns3", "wave_plot", ["frequency","htl"], _f8uns3);  
  $def("_1e4zsb1", "stripes", ["htl"], _1e4zsb1);  
  $def("_39lx92", "closing_slide", ["md"], _39lx92);  
  $def("_yr9aur", "viewof slidesModule", ["thisModule"], _yr9aur);  
  $def("_1hi1xa", "slidesModule", ["Generators","viewof slidesModule"], _1hi1xa);  
  $def("_k2hmhs", "slideshow", ["main","slideBuilder","coreSlideStyle","liveDecks","cellEditor","htl","Node","Inspector","observe","columnTracks","decompile","spliceSlides","compile","realize","downloadAnchor","Reveal","onCodeChange"], _k2hmhs);  
  $def("_nz9017", "slideBuilder", ["htl","CSS"], _nz9017);  
  $def("_1vv1t5t", "coreSlideStyle", ["revealCss"], _1vv1t5t);  
  $def("_1ospo4w", "implementation", ["md"], _1ospo4w);  
  $def("_1un0jzk", "columnTracks", [], _1un0jzk);  
  $def("_qhuijx", "spliceSlides", ["parser"], _qhuijx);  
  $def("_j57v1n", "test_deck_renders_every_slide", ["deck"], _j57v1n);  
  $def("_1cqp72s", "test_slides_adopt_live_cells", ["deck","frequency"], _1cqp72s);  
  $def("_1pjyuhq", "test_splice_rewrites_only_the_slides_literal", ["spliceSlides"], _1pjyuhq);  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));  
  main.define("onCodeChange", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("onCodeChange", _));  
  main.define("compile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("compile", _));  
  main.define("decompile", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("decompile", _));  
  main.define("parser", ["module @tomlarkworthy/observablejs-toolchain", "@variable"], (_, v) => v.import("parser", _));  
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));  
  main.define("cellEditor", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("cellEditor", _));  
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));  
  main.define("Reveal", ["module @tomlarkworthy/reveal-js-6", "@variable"], (_, v) => v.import("Reveal", _));  
  main.define("revealCss", ["module @tomlarkworthy/reveal-js-6", "@variable"], (_, v) => v.import("revealCss", _));  
  $def("_lc2g4s", "liveDecks", [], _lc2g4s);
  return main;
}
