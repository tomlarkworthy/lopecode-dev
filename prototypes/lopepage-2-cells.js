// @tomlarkworthy/lopepage-2 — prototype cells (Observable source).
// Authored live via the pairing channel on prototypes/@tomlarkworthy_lopepage-2.html.
// Durable record so the prototype survives the browser session. Each block is one cell.
//
// PROVEN:
//  - immortal panes + split/stack reconcile
//  - single-shot scroll restore across layout edits (content height stable -> exact, no rAF loop)
//  - pid {pid,offset} anchor + ResizeObserver re-pin for content-load reflow
//    (content loaded ABOVE the viewport: anchored cell drift = 0, no jump)
// TODO: URL #view= DSL round-trip (#5); pointer-drag rearrange + drag-out-to-.js (#6);
//       splitter resize-drag; QA across a real URL change (#7).

// ── imports ────────────────────────────────────────────────────────────────
import {runtime, main, persistentId} from "@tomlarkworthy/runtime-sdk"
import {visualizer} from "@tomlarkworthy/visualizer"
import {currentModules} from "@tomlarkworthy/module-map"

// ── module resolution (name -> Module object) ───────────────────────────────
lp2_moduleByName = {
  const byName = new Map();
  for (const [mod, info] of currentModules) {
    if (info?.name) byName.set(info.name, info.module ?? mod);
  }
  return (name) => byName.get(name);
}

// ── pid scroll anchoring helpers ─────────────────────────────────────────────
// Anchor = the cell at the top of the viewport + pixels into it: {pid, offset}.
// pid comes from persistentId(node.variable) — every viz cell node carries a
// `.variable` backref, so NO visualizer edit is needed. Restoring by pid keeps the
// anchored cell pinned even when content above it changes height (set scrollTop to
// the cell's *current* offsetTop + offset).
lp2_anchor = {
  const cellNodes = (paneEl) => [...paneEl.querySelectorAll(".observablehq[cell]")];
  const pidOf = (node) => { try { return node.variable ? persistentId(node.variable) : null; } catch (e) { return null; } };
  const capture = (paneEl) => {
    const top = paneEl.scrollTop;
    if (top <= 0) return null;
    for (const node of cellNodes(paneEl)) {
      const nTop = node.offsetTop, nBot = nTop + node.offsetHeight;
      if (nBot > top + 1) {
        const pid = pidOf(node);
        if (pid) return { pid, offset: top - nTop };
      }
    }
    return null;
  };
  const restore = (paneEl, anchor) => {
    if (!anchor || !anchor.pid) return false;
    const node = cellNodes(paneEl).find((n) => pidOf(n) === anchor.pid);
    if (!node) return false;
    paneEl.scrollTop = node.offsetTop + anchor.offset;
    return true;
  };
  return { cellNodes, pidOf, capture, restore };
}

// Per-pane: rAF-debounced scroll capture + ResizeObserver re-pin on reflow.
// `__lp2_pinning` guards our own programmatic scrollTop writes from the listener.
lp2_installAnchor = (entry) => {
  const el = entry.el;
  if (el.__lp2_anchor_bound) return;
  el.__lp2_anchor_bound = true;
  const A = lp2_anchor;
  let raf = 0;
  el.addEventListener("scroll", () => {
    if (el.__lp2_pinning) return;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; entry.anchor = A.capture(el); });
  }, { passive: true });
  const content = el.querySelector(".lope-viz") || el.firstElementChild;
  if (content && window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      if (!entry.anchor) return;
      el.__lp2_pinning = true;
      A.restore(el, entry.anchor);
      requestAnimationFrame(() => { el.__lp2_pinning = false; });
    });
    ro.observe(content);
    entry.ro = ro;
  }
}

// ── immortal pane registry ───────────────────────────────────────────────────
// One scroll <div> per module, cached forever. Layout edits reuse this element;
// it is never recreated, so cell computation / viz DOM persist (and content height
// stays stable across a layout-only change).
lp2_paneRegistry = new Map()

lp2_getPane = (moduleName) => {
  let entry = lp2_paneRegistry.get(moduleName);
  if (entry) return entry;
  const el = document.createElement("div");
  el.className = "lp2-pane";
  el.dataset.module = moduleName;
  Object.assign(el.style, { overflow: "auto", height: "100%", width: "100%", position: "relative", overflowAnchor: "auto" });
  const mod = lp2_moduleByName(moduleName);
  if (mod) {
    const viz = visualizer(runtime, {
      invalidation: new Promise(() => {}),
      module: mod,
      filter: (cell_name, variables) => {
        if (variables?.[0]?._type !== 1) return false;
        if (typeof cell_name === "string" && cell_name.startsWith("dynamic ")) return false;
        return true;
      }
    });
    el.appendChild(viz);
    entry = { el, viz, moduleName, anchor: null };
  } else {
    el.textContent = "module not found: " + moduleName;
    entry = { el, viz: null, moduleName, anchor: null };
  }
  lp2_paneRegistry.set(moduleName, entry);
  lp2_installAnchor(entry);
  return entry;
}

// ── #view= DSL ⇄ model (round-trips; scroll survives an applied DSL change) ───
// R=row, C=col, S=stack; number = weight within parent. Leaf = @scope/name or d/<hex>,
// optional #cell deep-link. Weight lives on parent.sizes[i] in the model. Hash wiring
// (hashchange -> parse -> setModel; model -> serialize -> setHash) is the remaining glue.
lp2_parseDSL = (input) => {
  if (!input) return null;
  input = String(input);
  if (input.startsWith("#")) input = input.slice(1);
  const mView = input.match(/(?:^|&)view=([^&]*)/);
  if (mView) input = mView[1];
  let i = 0;
  const num = () => { const s = i; while (i < input.length && input[i] >= "0" && input[i] <= "9") i++; return s < i ? parseInt(input.slice(s, i), 10) : null; };
  const moduleName = () => { const s = i; while (i < input.length && !",)#".includes(input[i])) i++; return input.slice(s, i); };
  const parseLeaf = () => {
    const weight = num();
    const module = moduleName();
    let cell;
    if (input[i] === "#") { i++; const s = i; while (i < input.length && !",)".includes(input[i])) i++; cell = input.slice(s, i); }
    return { node: { module, ...(cell ? { cell } : {}) }, weight };
  };
  const parseItem = () => { const c = input[i]; return (c === "R" || c === "C" || c === "S") ? parseGroup() : parseLeaf(); };
  const parseList = (isStack) => { const items = []; while (i < input.length && input[i] !== ")") { items.push(isStack ? parseLeaf() : parseItem()); if (input[i] === ",") i++; } return items; };
  const parseGroup = () => {
    const type = input[i++];
    const weight = num();
    let items = [];
    if (input[i] === "(") { i++; items = parseList(type === "S"); if (input[i] === ")") i++; }
    if (type === "S") return { node: { t: "stack", active: 0, tabs: items.map((it) => it.node) }, weight };
    const children = items.map((it) => it.node);
    const sizes = items.map((it) => it.weight != null ? it.weight : Math.round(100 / items.length));
    return { node: { t: type === "R" ? "row" : "col", children, sizes }, weight };
  };
  const r = parseItem();
  return r ? r.node : null;
}

lp2_serializeDSL = (root) => {
  const s = (node, weight) => {
    const w = weight != null ? weight : 100;
    if (!node) return "";
    if (node.t === "stack") {
      const tabs = (node.tabs || []).map((l) => l.module + (l.cell ? ("#" + l.cell) : "")).join(",");
      return `S${w}(${tabs})`;
    }
    if (node.t === "row" || node.t === "col") {
      const n = node.children || [];
      const kids = n.map((c, idx) => s(c, (node.sizes && node.sizes[idx] != null) ? node.sizes[idx] : Math.round(100 / n.length))).join(",");
      return `${node.t === "row" ? "R" : "C"}${w}(${kids})`;
    }
    return (node.module || "") + (node.cell ? ("#" + node.cell) : "");
  };
  return s(root, 100);
}

// ── layout model (⇄ #view= R/S/C DSL via lp2_parseDSL / lp2_serializeDSL) ─────
viewof lp2Model = Inputs.input({
  t: "row",
  sizes: [50, 50],
  children: [
    { t: "stack", active: 0, tabs: [{ module: "@tomlarkworthy/runtime-sdk" }] },
    { t: "stack", active: 0, tabs: [{ module: "@tomlarkworthy/visualizer" }] }
  ]
})

// ── stable host (computed once, never recreated) ─────────────────────────────
lp2_host = {
  const host = document.createElement("div");
  host.className = "lp2-host";
  Object.assign(host.style, { height: "560px", border: "1px solid #999", display: "flex", overflow: "hidden", resize: "vertical", position: "relative", background: "#fff" });
  return host;
}

// ── recursive reconcile: LayoutNode -> DOM (panes reused from registry) ───────
lp2_renderNode = (rerender) => {
  const make = (node) => {
    if (!node) return document.createTextNode("");
    if (node.t === "stack") {
      const wrap = document.createElement("div");
      wrap.className = "lp2-stack";
      Object.assign(wrap.style, { display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%", width: "100%" });
      const tabsEl = document.createElement("div");
      tabsEl.className = "lp2-tabs";
      Object.assign(tabsEl.style, { display: "flex", gap: "2px", flex: "0 0 auto", background: "#f0f0f0", borderBottom: "1px solid #ccc", overflow: "hidden" });
      const body = document.createElement("div");
      Object.assign(body.style, { flex: "1 1 auto", minHeight: 0, position: "relative", display: "flex" });
      const active = node.active || 0;
      (node.tabs || []).forEach((leaf, i) => {
        const pane = lp2_getPane(leaf.module).el;
        pane.style.display = (i === active) ? "block" : "none";
        pane.style.flex = "1 1 auto";
        body.appendChild(pane);
        const tab = document.createElement("button");
        tab.textContent = leaf.module.split("/").pop();
        tab.title = leaf.module;
        Object.assign(tab.style, { border: "none", padding: "4px 8px", cursor: "pointer", fontSize: "11px", background: i === active ? "#fff" : "transparent" });
        tab.onclick = () => { node.active = i; rerender(); };
        tabsEl.appendChild(tab);
      });
      wrap.append(tabsEl, body);
      return wrap;
    }
    if (node.t === "row" || node.t === "col") {
      const row = node.t === "row";
      const wrap = document.createElement("div");
      Object.assign(wrap.style, { display: "flex", flexDirection: row ? "row" : "column", minWidth: 0, minHeight: 0, height: "100%", width: "100%" });
      const kids = node.children || [];
      kids.forEach((child, i) => {
        const slot = document.createElement("div");
        const basis = (node.sizes && node.sizes[i]) || (100 / kids.length);
        Object.assign(slot.style, { flex: basis + " 1 0", minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden" });
        slot.appendChild(make(child));
        wrap.appendChild(slot);
      });
      return wrap;
    }
    return document.createTextNode("unknown node " + node.t);
  };
  return make;
}

// ── reactive view: anchor-capture, rebuild tree (reusing panes), anchor-restore ─
// Restore is single-shot and exact: immortal panes keep content height stable across
// a layout-only edit, so the captured anchor/scrollTop is still valid after reparent.
// (Replaces fix_scroll's 6-frame rAF retry loop + reflow timers.)
lp2_view = {
  const host = lp2_host;
  lp2Model;
  lp2_installAnchor; lp2_anchor;
  const rerender = () => {
    const saved = new Map();
    for (const [name, entry] of lp2_paneRegistry) {
      lp2_installAnchor(entry);
      const anc = lp2_anchor.capture(entry.el);
      saved.set(name, anc || { raw: entry.el.scrollTop });
    }
    host.replaceChildren(lp2_renderNode(rerender)(lp2Model));
    for (const [name, anc] of saved) {
      const entry = lp2_paneRegistry.get(name);
      if (!entry || !entry.el.isConnected) continue;
      if (anc.pid) { if (!lp2_anchor.restore(entry.el, anc) && anc.raw) entry.el.scrollTop = anc.raw; }
      else if (anc.raw) entry.el.scrollTop = anc.raw;
      entry.anchor = anc.pid ? anc : entry.anchor;
    }
  };
  rerender();
  return host;
}

// tiny probe to keep lp2_view reachable without broadcasting the DOM over the channel
lp2_probe = { lp2_view; return "lp2 mounted, panes=" + lp2_paneRegistry.size; }
