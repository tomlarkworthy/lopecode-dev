// @tomlarkworthy/lopepage-2 — prototype cells (Observable source).
// Authored live via the pairing channel on prototypes/@tomlarkworthy_lopepage-2.html.
// Durable record so the prototype survives the browser session. Each block is one cell.
// Status: immortal panes + split/stack reconcile + single-shot scroll restore PROVEN.
// TODO: pid {pid,offset} anchor for content-load reflow / deep-link; URL DSL; drag; tabs polish.

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

// ── immortal pane registry ───────────────────────────────────────────────────
// One scroll <div> per module, cached forever. Layout edits reuse this element;
// it is never recreated, so cell computation / viz DOM persist.
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
    entry = { el, viz, moduleName };
  } else {
    el.textContent = "module not found: " + moduleName;
    entry = { el, viz: null, moduleName };
  }
  lp2_paneRegistry.set(moduleName, entry);
  return entry;
}

// ── layout model (⇄ #view= R/S/C DSL, not yet wired) ─────────────────────────
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

// ── reactive view: capture scroll, rebuild tree (reusing panes), restore ──────
// The restore is SINGLE-SHOT and exact: immortal panes keep content height stable
// across a layout-only edit, so the captured scrollTop is still valid after reparent.
// (Replaces fix_scroll's 6-frame rAF retry loop + reflow timers.)
lp2_view = {
  const host = lp2_host;
  lp2Model;
  const rerender = () => {
    const saved = new Map();
    for (const [name, entry] of lp2_paneRegistry) saved.set(name, entry.el.scrollTop);
    host.replaceChildren(lp2_renderNode(rerender)(lp2Model));
    for (const [name, top] of saved) {
      const entry = lp2_paneRegistry.get(name);
      if (entry && entry.el.isConnected && top) entry.el.scrollTop = top;
    }
  };
  rerender();
  return host;
}

// tiny probe to keep lp2_view reachable without broadcasting the DOM over the channel
lp2_probe = { lp2_view; return "lp2 mounted, panes=" + lp2_paneRegistry.size; }
