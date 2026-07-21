const _1nfc4nv = function _title(md){return(
md`# Infinite Canvas

Renders a module as an infinite canvas. Cells become draggable cards, dependency edges are derived live from the runtime graph (\`variable._inputs\`), and card positions persist to a file attachment so layouts survive export.

Built on [visualizer](https://observablehq.com/@tomlarkworthy/visualizer): the canvas is a visualizer with a card-wrapping inspector factory plus a pan/zoom/edge layer.

~~~js
import {infiniteCanvas} from '@tomlarkworthy/infinite-canvas'

canvas = infiniteCanvas(runtime, {
  invalidation,          // required for teardown
  module,                // module to render, default main
  filter,                // (cell_name, variables, i, state) => boolean
  layoutName,            // file attachment name, default "infinite-canvas-layout.json"
  storageModule,         // module owning the layout file, default: the viewed module
  persist,               // default true
  detachNodes,           // steal cell DOM from other views, default true
  height                 // viewport CSS height, default "70vh"
})
~~~

Drag card headers to move cells. Drag the background to pan. Scroll to zoom (over a card body, use ctrl/cmd+scroll so plain scroll still scrolls the card). Drag a card's bottom-right corner to resize it (size persists). Click ✎ in a card header to edit the cell in place (editor-5).

The **⊞ layout** button computes a topological layout from the dependency graph: longest-path layering puts inputs left of outputs, barycenter ordering reduces edge crossings, and columns/rows use measured card sizes. It runs automatically the first time a module is viewed with no saved layout. **⛶ fit** frames the whole graph.

Std-library/builtin import cells and runtime plumbing (\`invalidation\`, \`@variable\`) are hidden by default; pass your own \`filter\` to widen/narrow further.`
)};
const _1cnvcss = function _lc_css(){return(
`.lc-viewport {
  position: relative; overflow: hidden; width: 100%;
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 8px;
  background-color: var(--theme-background-alt, #fafafa);
  background-image: radial-gradient(circle, color-mix(in srgb, currentColor 18%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
  touch-action: none; cursor: grab;
}
.lc-viewport.lc-panning { cursor: grabbing; }
.lc-toolbar { position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 4px; }
.lc-toolbar button {
  font: 11px var(--sans-serif, system-ui); padding: 2px 8px; cursor: pointer;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 4px; opacity: 0.85;
}
.lc-toolbar button:hover { opacity: 1; }
.lc-world { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
.lc-edges { position: absolute; top: 0; left: 0; width: 1px; height: 1px; overflow: visible; pointer-events: none; }
.lc-edges path { fill: none; stroke: var(--theme-foreground-muted, #888); stroke-width: 1.5; opacity: 0.7; }
.lc-viz-host, .lc-viz-host > .lope-viz { position: absolute; top: 0; left: 0; }
.lope-viz.lope-infinite-canvas > .observablehq { position: absolute; margin: 0; }
.lope-infinite-canvas > .lc-card {
  width: 320px; box-sizing: border-box;
  display: flex; flex-direction: column;
  resize: both; overflow: hidden;
  min-width: 160px; min-height: 30px;
  background: var(--theme-background, #fff);
  border: 1px solid var(--theme-foreground-faintest, #ddd);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.lc-card-header {
  display: flex; align-items: center; gap: 6px;
  cursor: grab; user-select: none;
  font: 11px var(--sans-serif, system-ui);
  color: var(--theme-foreground-muted, #666);
  background: var(--theme-background-alt, #f5f5f5);
  border-bottom: 1px solid var(--theme-foreground-faintest, #eee);
  border-radius: 6px 6px 0 0;
  padding: 3px 8px;
}
.lc-card-header { flex-shrink: 0; }
.lc-card-grip { opacity: 0.6; }
.lc-card-title { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lc-card-edit {
  border: none; background: none; cursor: pointer;
  font-size: 11px; line-height: 1; opacity: 0.45; padding: 0 2px;
}
.lc-card-edit:hover { opacity: 1; }
.lc-card-body { padding: 6px 8px; max-height: 320px; overflow: auto; flex: 1 1 auto; }
.lc-card-editor {
  flex-shrink: 0; overflow: auto; max-height: 340px;
  border-top: 1px solid var(--theme-foreground-faintest, #eee);
}
.lc-card.lc-running { outline: 2px solid rgba(75, 156, 211, 0.7); }
.lc-card.lc-error { outline: 2px solid #d73a49; }
.lope-infinite-canvas > .lope-viz-import {
  width: max-content; max-width: 420px;
  background: var(--theme-background-alt, #f5f5f5);
  border: 1px dashed var(--theme-foreground-faint, #bbb);
  border-radius: 999px;
  padding: 2px 10px;
  font: 11px var(--code, monospace);
}`
)};
const _1nfcfac = function _infiniteCanvas(main,visualizer,Inspector,cellEditor,getFileAttachment,setFileAttachment,jsonFileAttachment,lc_css){return(
(
  runtime,
  {
    invalidation,
    module = main,
    filter = () => true,
    layoutName = "infinite-canvas-layout.json",
    storageModule = module, // viewed module: named + exported, so the layout serializes
    persist = true,
    detachNodes = true,
    height = "70vh"
  } = {}
) => {
  // std-library imports and runtime plumbing are noise on a canvas
  const HIDDEN_NAMES = new Set(["invalidation", "@variable", "visibility"]);
  const baseFilter = (name, variables) => {
    for (const n of [name, variables?.[0]?._name]) {
      if (typeof n !== "string") continue;
      if (HIDDEN_NAMES.has(n)) return false;
      if (n.startsWith("module ")) {
        const spec = n.slice(7);
        if (!(spec.startsWith("@") || spec.startsWith("d/"))) return false;
      }
    }
    return true;
  };
  const userFilter = filter;
  filter = (...args) => baseFilter(...args) && userFilter(...args);
  const viewport = document.createElement("div");
  viewport.className = "lc-viewport";
  viewport.style.height = height;
  const style = document.createElement("style");
  style.textContent = lc_css;
  viewport.appendChild(style);
  const world = document.createElement("div");
  world.className = "lc-world";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lc-edges");
  svg.innerHTML = `<defs><marker id="lc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="var(--theme-foreground-muted, #888)"></path></marker></defs><g class="lc-edge-paths"></g>`;
  const edgeGroup = svg.querySelector(".lc-edge-paths");
  world.appendChild(svg);
  viewport.appendChild(world);

  let root; // assigned after visualizer creation
  const state = { pan: { x: 40, y: 40, k: 1 }, cards: {} };
  const GRID = { w: 360, h: 260, cols: 4 };

  const applyPan = () => {
    world.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.pan.k})`;
    viewport.style.backgroundPosition = `${state.pan.x}px ${state.pan.y}px`;
    viewport.style.backgroundSize = `${24 * state.pan.k}px ${24 * state.pan.k}px`;
  };

  let saveTimer = null;
  const scheduleSave = () => {
    if (!persist) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        setFileAttachment(jsonFileAttachment(layoutName, state), storageModule);
      } catch (e) {
        console.warn("infinite-canvas: layout save failed", e);
      }
    }, 800);
  };

  const keyOf = (variable) =>
    variable?._name ?? (variable?.pid != null ? "pid:" + variable.pid : null);

  const positionCard = (card) => {
    const pos = state.cards[card.dataset.lcKey];
    if (!pos) return;
    card.style.left = pos.x + "px";
    card.style.top = pos.y + "px";
    if (pos.w) card.style.width = pos.w + "px";
    if (pos.h) {
      card.style.height = pos.h + "px";
      const body = card.querySelector(".lc-card-body");
      if (body) body.style.maxHeight = "none"; // explicit card height governs
    }
  };

  const managedNodes = () =>
    root
      ? [...root.children].filter(
          (n) => n.classList?.contains("observablehq") && n.dataset.lcKey
        )
      : [];

  // name → card, with viewof/mutable/import-specifier aliases, for edge resolution
  const nameIndex = (nodes) => {
    const byName = new Map();
    for (const n of nodes) {
      const nm = n.variable?._name;
      if (nm) {
        byName.set(nm, n);
        if (nm.startsWith("viewof ")) byName.set(nm.slice(7), n);
        if (nm.startsWith("mutable ")) byName.set(nm.slice(8), n);
      }
      const ii = n.__viz?.cell?.importInfo;
      if (ii?.specifiers) {
        for (const s of ii.specifiers) {
          const local = s?.local ?? s?.imported;
          if (local) byName.set(String(local), n);
        }
      }
    }
    return byName;
  };

  const fitView = () => {
    const nodes = managedNodes();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) {
      const p = state.cards[n.dataset.lcKey];
      if (!p) continue;
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x + (n.offsetWidth || 320));
      y1 = Math.max(y1, p.y + (n.offsetHeight || 120));
    }
    if (!isFinite(x0)) return;
    const vw = viewport.clientWidth || 800;
    const vh = viewport.clientHeight || 500;
    const k = Math.min(
      1.5,
      Math.max(0.15, Math.min(vw / (x1 - x0 + 80), vh / (y1 - y0 + 80)))
    );
    state.pan.k = k;
    state.pan.x = (vw - (x1 - x0) * k) / 2 - x0 * k;
    state.pan.y = (vh - (y1 - y0) * k) / 2 - y0 * k;
    applyPan();
    scheduleSave();
  };

  // Layered topological layout: longest-path layering (inputs → left),
  // barycenter ordering within layers, measured card sizes.
  const autoLayout = () => {
    const nodes = managedNodes();
    if (!nodes.length) return;
    const byName = nameIndex(nodes);
    const preds = new Map(nodes.map((n) => [n, []]));
    const succCount = new Map(nodes.map((n) => [n, 0]));
    for (const n of nodes) {
      for (const inp of n.variable?._inputs ?? []) {
        const src = byName.get(inp?._name);
        if (src && src !== n) {
          preds.get(n).push(src);
          succCount.set(src, succCount.get(src) + 1);
        }
      }
    }
    // isolated cells (docs, styles) go to a trailing column, off the dataflow spine
    const isolated = nodes.filter(
      (n) => !preds.get(n).length && !succCount.get(n)
    );
    const isolatedSet = new Set(isolated);
    const connected = nodes.filter((n) => !isolatedSet.has(n));
    const layerOf = new Map();
    const visiting = new Set();
    const layer = (n) => {
      if (layerOf.has(n)) return layerOf.get(n);
      if (visiting.has(n)) return 0; // cycle guard
      visiting.add(n);
      const ps = preds.get(n);
      const l = ps.length ? 1 + Math.max(...ps.map(layer)) : 0;
      visiting.delete(n);
      layerOf.set(n, l);
      return l;
    };
    connected.forEach(layer);
    const layers = [];
    for (const n of connected) {
      const l = layerOf.get(n);
      (layers[l] = layers[l] || []).push(n);
    }
    if (isolated.length) layers.push(isolated);
    const orderIdx = new Map();
    layers.forEach((ns, li) => {
      if (li > 0) {
        const bary = (n) => {
          const ps = preds.get(n).filter((p) => orderIdx.has(p));
          if (!ps.length) return Number.MAX_SAFE_INTEGER; // unconnected sink last
          return ps.reduce((s, p) => s + orderIdx.get(p), 0) / ps.length;
        };
        ns.sort((a, b) => bary(a) - bary(b));
      }
      ns.forEach((n, i) => orderIdx.set(n, i));
    });
    const GAP_X = 60, GAP_Y = 24;
    let x = 0;
    for (const ns of layers) {
      if (!ns?.length) continue;
      const colWidth = Math.max(...ns.map((n) => n.offsetWidth || 320));
      let y = 0;
      for (const n of ns) {
        const key = n.dataset.lcKey;
        const pos = state.cards[key] || (state.cards[key] = {});
        pos.x = x;
        pos.y = y;
        y += (n.offsetHeight || 120) + GAP_Y;
        positionCard(n);
      }
      x += colWidth + GAP_X;
    }
    scheduleSave();
    requestDraw();
    fitView();
  };

  const ensurePositions = () => {
    if (!root) return;
    for (const node of root.children) {
      if (!node.classList || !node.classList.contains("observablehq")) continue;
      let key = node.dataset.lcKey;
      if (!key) {
        key = keyOf(node.variable) ?? "slot:" + Object.keys(state.cards).length;
        node.dataset.lcKey = key;
      }
      if (!state.cards[key]) {
        const slot = Object.keys(state.cards).length;
        state.cards[key] = {
          x: (slot % GRID.cols) * GRID.w,
          y: Math.floor(slot / GRID.cols) * GRID.h
        };
        scheduleSave();
      }
      positionCard(node);
      ro.observe(node);
    }
  };

  const draw = () => {
    if (!root) return;
    const nodes = managedNodes();
    const byName = nameIndex(nodes);
    const paths = [];
    for (const n of nodes) {
      for (const inp of n.variable?._inputs ?? []) {
        const src = byName.get(inp?._name);
        if (!src || src === n) continue;
        const a = state.cards[src.dataset.lcKey];
        const b = state.cards[n.dataset.lcKey];
        if (!a || !b) continue;
        const y1 = a.y + Math.min(14, src.offsetHeight / 2);
        const y2 = b.y + Math.min(14, n.offsetHeight / 2);
        const aRight = a.x + src.offsetWidth;
        const bRight = b.x + n.offsetWidth;
        let x1, x2, c1, c2;
        if (b.x >= aRight - 20) {
          // target to the right: exit right, enter left
          x1 = aRight; x2 = b.x;
          const dx = Math.max(40, (x2 - x1) / 2);
          c1 = x1 + dx; c2 = x2 - dx;
        } else if (bRight <= a.x + 20) {
          // target to the left: exit left, enter right
          x1 = a.x; x2 = bRight;
          const dx = Math.max(40, (x1 - x2) / 2);
          c1 = x1 - dx; c2 = x2 + dx;
        } else {
          // overlapping columns: S-curve around the right side
          x1 = aRight; x2 = bRight;
          const dx = 60;
          c1 = x1 + dx; c2 = x2 + dx;
        }
        paths.push(
          `<path d="M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}" marker-end="url(#lc-arrow)"></path>`
        );
      }
    }
    edgeGroup.innerHTML = paths.join("");
  };

  let drawScheduled = false;
  const requestDraw = () => {
    if (drawScheduled) return;
    drawScheduled = true;
    window.requestAnimationFrame(() => {
      drawScheduled = false;
      ensurePositions();
      draw();
    });
  };

  const cardFactory = () => (variable) => {
    const card = document.createElement("div");
    card.className = "observablehq lc-card";
    const header = document.createElement("div");
    header.className = "lc-card-header";
    const grip = document.createElement("span");
    grip.className = "lc-card-grip";
    grip.textContent = "⠿";
    const label = document.createElement("span");
    label.className = "lc-card-title";
    label.textContent = variable?._name ?? "(anonymous)";
    const editBtn = document.createElement("button");
    editBtn.className = "lc-card-edit";
    editBtn.textContent = "✎";
    editBtn.title = "edit cell";
    editBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      let panel = card.querySelector(".lc-card-editor");
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "lc-card-editor";
        let editor;
        try {
          editor = cellEditor(variable, { pinned: true });
        } catch (err) {
          editor = document.createElement("div");
          editor.textContent = "editor failed: " + err;
        }
        panel.__lcEditor = editor;
        panel.appendChild(editor);
        card.appendChild(panel);
      } else {
        panel.style.display = panel.style.display === "none" ? "" : "none";
      }
    });
    header.appendChild(grip);
    header.appendChild(label);
    header.appendChild(editBtn);
    const body = document.createElement("div");
    body.className = "lc-card-body";
    card.appendChild(header);
    card.appendChild(body);
    const inner = new Inspector(body);
    header.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const key = card.dataset.lcKey;
      if (!key || !state.cards[key]) return;
      const start = { x: e.clientX, y: e.clientY, cx: state.cards[key].x, cy: state.cards[key].y };
      try {
        header.setPointerCapture(e.pointerId);
      } catch {}
      const move = (ev) => {
        state.cards[key].x = start.cx + (ev.clientX - start.x) / state.pan.k;
        state.cards[key].y = start.cy + (ev.clientY - start.y) / state.pan.k;
        positionCard(card);
        requestDraw();
      };
      const up = () => {
        header.removeEventListener("pointermove", move);
        header.removeEventListener("pointerup", up);
        scheduleSave();
      };
      header.addEventListener("pointermove", move);
      header.addEventListener("pointerup", up);
    });
    return {
      _node: card,
      pending: () => {
        card.classList.add("lc-running");
        inner.pending();
      },
      fulfilled: (value, name) => {
        card.classList.remove("lc-running", "lc-error");
        if (name) label.textContent = name;
        try {
          inner.fulfilled(value, name);
        } catch (e) {
          console.warn("infinite-canvas: inspector fulfilled failed", e);
        }
        requestDraw();
      },
      rejected: (error, name) => {
        card.classList.remove("lc-running");
        card.classList.add("lc-error");
        try {
          inner.rejected(error, name);
        } catch (e) {
          console.warn("infinite-canvas: inspector rejected failed", e);
        }
        requestDraw();
      }
    };
  };

  const toolbar = document.createElement("div");
  toolbar.className = "lc-toolbar";
  const layoutBtn = document.createElement("button");
  layoutBtn.textContent = "⊞ layout";
  layoutBtn.title = "topological auto-layout (inputs left, outputs right)";
  layoutBtn.addEventListener("click", () => autoLayout());
  const fitBtn = document.createElement("button");
  fitBtn.textContent = "⛶ fit";
  fitBtn.title = "fit view to content";
  fitBtn.addEventListener("click", () => fitView());
  toolbar.appendChild(layoutBtn);
  toolbar.appendChild(fitBtn);
  toolbar.addEventListener("pointerdown", (e) => e.stopPropagation());
  viewport.appendChild(toolbar);

  const viz = visualizer(runtime, {
    invalidation,
    module,
    filter,
    inspector: cardFactory,
    detachNodes,
    classList: "lope-infinite-canvas"
  });
  viz.classList.add("lc-viz-host");
  root = viz.querySelector(".lope-viz");
  world.appendChild(viz);

  const mo = new window.MutationObserver((records) => {
    for (const rec of records) {
      for (const node of rec.removedNodes) {
        if (node.querySelectorAll)
          node
            .querySelectorAll(".lc-card-editor")
            .forEach((el) => el.__lcEditor?.dispose?.());
      }
    }
    requestDraw();
  });
  mo.observe(root, { childList: true });
  // record user resizes (native CSS resize sets inline width/height)
  const ro = new window.ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
      const card = entry.target;
      const pos = card.dataset?.lcKey && state.cards[card.dataset.lcKey];
      if (!pos) continue;
      if (card.style.width) {
        const w = Math.round(card.offsetWidth);
        if (pos.w !== w) { pos.w = w; changed = true; }
      }
      if (card.style.height) {
        const h = Math.round(card.offsetHeight);
        if (pos.h !== h) {
          pos.h = h;
          changed = true;
          const body = card.querySelector(".lc-card-body");
          if (body) body.style.maxHeight = "none";
        }
      }
    }
    if (changed) scheduleSave();
    requestDraw();
  });

  viewport.addEventListener("pointerdown", (e) => {
    const bg =
      e.target === viewport || e.target === world || e.target instanceof SVGElement;
    if (!bg) return;
    const start = { x: e.clientX, y: e.clientY, px: state.pan.x, py: state.pan.y };
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch {}
    viewport.classList.add("lc-panning");
    const move = (ev) => {
      state.pan.x = start.px + ev.clientX - start.x;
      state.pan.y = start.py + ev.clientY - start.y;
      applyPan();
    };
    const up = () => {
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerup", up);
      viewport.classList.remove("lc-panning");
      scheduleSave();
    };
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerup", up);
  });

  viewport.addEventListener(
    "wheel",
    (e) => {
      const inCard = e.target instanceof Element && e.target.closest(".lc-card");
      if (inCard && !e.ctrlKey && !e.metaKey) return; // plain scroll scrolls the card
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k0 = state.pan.k;
      const k1 = Math.min(3, Math.max(0.15, k0 * Math.exp(-e.deltaY * 0.0015)));
      state.pan.x = mx - ((mx - state.pan.x) / k0) * k1;
      state.pan.y = my - ((my - state.pan.y) / k0) * k1;
      state.pan.k = k1;
      applyPan();
      scheduleSave();
    },
    { passive: false }
  );

  if (invalidation)
    Promise.resolve(invalidation).then(() => {
      mo.disconnect();
      ro.disconnect();
      clearTimeout(saveTimer);
      root
        .querySelectorAll(".lc-card-editor")
        .forEach((el) => el.__lcEditor?.dispose?.());
    });

  (async () => {
    let restored = false;
    try {
      const f = getFileAttachment(layoutName, storageModule);
      if (f) {
        const saved = await f.json();
        if (saved?.pan) Object.assign(state.pan, saved.pan);
        if (saved?.cards) Object.assign(state.cards, saved.cards);
        restored = true;
        applyPan();
        requestDraw();
      }
    } catch (e) {
      console.warn("infinite-canvas: layout load failed", e);
    }
    // no saved layout: auto-layout once cards have rendered and sized
    if (!restored) setTimeout(() => autoLayout(), 1200);
  })();

  applyPan();
  requestDraw();
  return viewport;
}
)};
const _1dm0hdr = function _demo(md){return(
md`## Demo

The cells below form a small dataflow (\`freq\`, \`amp\` → \`wave\` → \`wavePlot\`, \`waveStats\`). The canvas at the bottom renders this module: drag the sliders on the canvas and watch downstream cards recompute.`
)};
const _1frq0x = function _freq(Inputs){return(
Inputs.range([0.5, 8], { label: "freq", step: 0.1, value: 2 })
)};
const _1frq1x = (G, _) => G.input(_);
const _1amp0x = function _amp(Inputs){return(
Inputs.range([5, 60], { label: "amp", step: 1, value: 30 })
)};
const _1amp1x = (G, _) => G.input(_);
const _1wav3x = function _wave(freq,amp){return(
Array.from({ length: 120 }, (_, i) => ({
  x: i,
  y: amp * Math.sin((i * freq * Math.PI) / 30)
}))
)};
const _1wst4x = function _waveStats(wave){return({
  n: wave.length,
  min: Math.min(...wave.map((d) => d.y)).toFixed(1),
  max: Math.max(...wave.map((d) => d.y)).toFixed(1)
})};
const _1wpl5x = function _wavePlot(htl,wave){return(
htl.svg`<svg width="280" height="140" viewBox="0 0 280 140" style="display:block">
  <line x1="0" y1="70" x2="280" y2="70" stroke="#ccc"></line>
  <polyline fill="none" stroke="#4269d0" stroke-width="1.5"
    points="${wave.map((d, i) => `${((i / (wave.length - 1)) * 280).toFixed(1)},${(70 - d.y).toFixed(1)}`).join(" ")}"></polyline>
</svg>`
)};
const _1cmod0x = function _canvasModule(thisModule){return(
thisModule()
)};
const _1cmod1x = (G, _) => G.input(_);
const _1tmod0x = function _targetModule(Inputs,runtime,canvasModule)
{
  // One-shot enumeration: a reactive dep (currentModules) would re-create the
  // canvas on every module-map churn, which itself churns the map — feedback loop.
  const seen = new Map();
  for (const v of runtime._variables) {
    if (
      typeof v._name === "string" &&
      v._name.startsWith("module ") &&
      v._value?._scope
    ) {
      const name = v._name.slice(7);
      if (!seen.has(name) && (name.startsWith("@") || name.startsWith("d/")))
        seen.set(name, { name, module: v._value });
    }
  }
  const opts = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  let self = opts.find((d) => d.module === canvasModule);
  if (!self) {
    self = { name: "@tomlarkworthy/infinite-canvas (this module)", module: canvasModule };
    opts.unshift(self);
  }
  return Inputs.select(opts, { label: "module", format: (d) => d.name, value: self });
};
const _1tmod1x = (G, _) => G.input(_);
const _1cnv9x = function _canvas(infiniteCanvas,runtime,invalidation,targetModule,canvasModule){return(
infiniteCanvas(runtime, {
  invalidation,
  module: targetModule?.module ?? canvasModule,
  filter: (name) => !["canvas", "targetModule", "viewof targetModule"].includes(name)
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/visualizer", async () => runtime.module((await import("/@tomlarkworthy/visualizer.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/inspector", async () => runtime.module((await import("/@tomlarkworthy/inspector.js?v=4")).default));
  main.define("module @tomlarkworthy/fileattachments", async () => runtime.module((await import("/@tomlarkworthy/fileattachments.js?v=4")).default));
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));
  $def("_1nfc4nv", "title", ["md"], _1nfc4nv);
  $def("_1cnvcss", "lc_css", [], _1cnvcss);
  $def("_1nfcfac", "infiniteCanvas", ["main","visualizer","Inspector","cellEditor","getFileAttachment","setFileAttachment","jsonFileAttachment","lc_css"], _1nfcfac);
  $def("_1dm0hdr", "demo", ["md"], _1dm0hdr);
  $def("_1frq0x", "viewof freq", ["Inputs"], _1frq0x);
  $def("_1frq1x", "freq", ["Generators","viewof freq"], _1frq1x);
  $def("_1amp0x", "viewof amp", ["Inputs"], _1amp0x);
  $def("_1amp1x", "amp", ["Generators","viewof amp"], _1amp1x);
  $def("_1wav3x", "wave", ["freq","amp"], _1wav3x);
  $def("_1wst4x", "waveStats", ["wave"], _1wst4x);
  $def("_1wpl5x", "wavePlot", ["htl","wave"], _1wpl5x);
  $def("_1cmod0x", "viewof canvasModule", ["thisModule"], _1cmod0x);
  $def("_1cmod1x", "canvasModule", ["Generators","viewof canvasModule"], _1cmod1x);
  $def("_1tmod0x", "viewof targetModule", ["Inputs","runtime","canvasModule"], _1tmod0x);
  $def("_1tmod1x", "targetModule", ["Generators","viewof targetModule"], _1tmod1x);
  $def("_1cnv9x", "canvas", ["infiniteCanvas","runtime","invalidation","targetModule","canvasModule"], _1cnv9x);
  main.define("visualizer", ["module @tomlarkworthy/visualizer", "@variable"], (_, v) => v.import("visualizer", _));
  main.define("Inspector", ["module @tomlarkworthy/inspector", "@variable"], (_, v) => v.import("Inspector", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("main", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("main", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("getFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("getFileAttachment", _));
  main.define("setFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("setFileAttachment", _));
  main.define("jsonFileAttachment", ["module @tomlarkworthy/fileattachments", "@variable"], (_, v) => v.import("jsonFileAttachment", _));
  main.define("cellEditor", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("cellEditor", _));
  return main;
}
