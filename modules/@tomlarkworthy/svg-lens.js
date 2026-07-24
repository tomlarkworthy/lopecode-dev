// @tomlarkworthy/svg-lens — lawful bidirectional lenses for SVG, aimed at the cell's own source.
//
// `svgLens(svg`<svg>…</svg>`)` makes the drawing directly manipulable: dragging a shape rewrites
// the template literal inside the cell's own definition, in the manner of @tomlarkworthy/sticky —
// but where sticky replaces a JSON slot wholesale, here the write is a composition of lenses
// (cell source → template literal → attribute → typed view), so only the bytes that must change
// are touched and everything else (comments, spacing, readable `rotate(45)` forms) survives.
//
// The lens laws are property-checked in-notebook with a seeded PRNG. Ported from a standalone
// TypeScript package (lens.ts / svg.ts / test/laws.ts).
//
// Reads top→bottom: demo → tests → laws → lens core → SVG lenses → source lenses → test harness →
// tests → direct manipulation.

// ================================================================================================
// DOCUMENTATION + DEMO
// ================================================================================================
const _sl01 = function _intro(md,cite) {return (md`# SVG Sketch Source

The drawing syncs to the code and vice versa. Switch between using code and UI. Built on composable lens ${ cite('foster2007lenses') } and edit-lens ${ cite('hofmann2012editlenses') } theory.`);};

// The drawing IS the source. Dragging rewrites this literal, byte-exactly, in place.
const _sl02 = function _drawing(svgLens,svg){return(
svgLens(svg`<svg viewBox="0 0 320 220" width="100%" style="max-height:420px;">
  <!-- comments, odd spacing and readable transforms all
       survive dragging: the lens rewrites only what must change -->
  <circle cx="60" cy="52" r="24" fill="url(#grad1)"
          stroke="none" stroke-width="3"/>
  <polygon points="20,190  110,80  200,190" fill="url(#grad2)"/>
  <path d="M 25.5 192.5 C 136.5 184.5 162 140.5 209 129 S 258 130.5 297.5 147"
        fill="none" stroke="url(#grad3)" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow1)"/>
  <polygon points="150,190 230,96 310,190" fill="url(#grad2)"/>
  <g transform="translate(163.57161652739427 135.71595290467684) rotate(1 0 18)">
    <rect x="-26" y="10" width="52" height="44" fill="#B25B3A"/>
    <polygon points="-34,12 0,-18 34,12" fill="#7A3B25"/>
  </g>
  <rect x="0" y="188" width="320" height="8" fill="#3E4A3B"/>
  <defs>
    <linearGradient id="grad1" x1="0.021" y1="0.979" x2="-0.031" y2="0.115"><stop offset="0" stop-color="#F5B840"/><stop offset="1" stop-color="#e61919"/></linearGradient>
    <marker id="arrow1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4C7FD1"/></marker>
    <linearGradient id="grad2" x1="0.661" y1="0.6" x2="0.964" y2="0.495"><stop offset="0" stop-color="#5B7A5E"/><stop offset="1" stop-color="#9bc5a0"/></linearGradient>
    <linearGradient id="grad3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e99401"/><stop offset="1" stop-color="#e30fff"/></linearGradient>
    </defs>
  <rect x="156.5773" y="158.5" width="13.5" height="29.5" fill="#13131f"/>
</svg>`)
)};
const _sl03 = (G, _) => G.input(_);

// The toolbar drives `drawing.setTool(id)` and follows the editor's own "lens-tool" event, so the
// editor stays the source of truth: a tool that finishes (a shape drawn, a path closed) returns to
// select on its own and the buttons follow.
const _sl02b = function _toolbar(htl,invalidation,$0)
{
  const drawing = $0;                                    // viewof drawing — the editor node
  const TOOLS = [["select", "Select", "V"], ["rect", "Rect", "R"], ["ellipse", "Ellipse", "E"],
                 ["line", "Line", "L"], ["pen", "Pen", "P"], ["scribble", "Scribble", "S"]];
  const el = htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:.5rem 0"></div>`;
  const buttons = TOOLS.map(([id, label, key]) => {
    const b = htl.html`<button title="${label} (${key})" style="padding:4px 10px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">${label}</button>`;
    b.onclick = () => drawing.setTool(id);
    el.appendChild(b);
    return [id, b];
  });
  const paint = (tool) => buttons.forEach(([id, b]) => {
    b.style.background = id === tool ? "#2F6BFF" : "#fff";
    b.style.color = id === tool ? "#fff" : "#243";
  });
  paint(drawing.tool);
  drawing.addEventListener("lens-tool", (e) => paint(e.detail.tool));

  // The command bar is *generated* from the registry, labels, bindings and all — so installing a
  // command cell puts a button here without touching this cell. Whether a button is live is the plan
  // itself (`canCommand`), asked fresh on every selection change: one answer, so a greyed-out button
  // and a refusal to run cannot disagree.
  const bar = htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:.25rem 0 0;flex-basis:100%"></div>`;
  const KEYNAME = (k) => (k || "").replace("Mod", navigator.platform.startsWith("Mac") ? "⌘" : "Ctrl")
                                  .replace("Shift", "⇧").replace(/-/g, "");
  const cmdButtons = (drawing.commands ? drawing.commands() : []).map((c) => {
    const b = htl.html`<button title="${c.label}${c.key ? " (" + KEYNAME(c.key) + ")" : ""}" style="padding:3px 8px;border-radius:6px;border:1px solid #cfd8cb;background:#fff;color:#243;font-size:12px;cursor:pointer">${c.label}</button>`;
    b.onclick = () => drawing.command(c.id);
    bar.appendChild(b);
    return [c.id, b];
  });
  const repaintCommands = () => cmdButtons.forEach(([id, b]) => {
    const on = drawing.canCommand(id);
    b.disabled = !on;
    b.style.opacity = on ? "1" : "0.35";
    b.style.cursor = on ? "pointer" : "default";
  });
  repaintCommands();
  drawing.addEventListener("lens-select", repaintCommands);
  drawing.addEventListener("lens-put", repaintCommands);
  // Z-order and delete act on the selection, so they belong to whatever is selected, not to a tool.
  const Z = { "]": "raise", "[": "lower", "}": "front", "{": "back" };
  const onKey = (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.isContentEditable;
    // Commands declare their own binding; the callsite only decides to honour it. Undo is checked
    // first because editor-5 owns ⌘Z while you are in a cell, and a decline falls through to
    // whatever the browser would have done — ⌘C with nothing selected still copies the page.
    if (!typing && drawing.commandForEvent) {
      const c = drawing.commandForEvent(e);
      if (c && drawing.canCommand(c.id)) { e.preventDefault(); return void drawing.command(c.id); }
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
      e.preventDefault();                                // editor-5 owns undo while you are in a cell
      return void (e.shiftKey ? drawing.redo() : drawing.undo());
    }
    // ⌘0 fits the drawing, ⌘1 is 100%, ⌘2 fits the selection. The drawing offers the verbs; which
    // key means what is the callsite's business, like every other shortcut here.
    if ((e.metaKey || e.ctrlKey) && !typing && "012".includes(e.key)) {
      e.preventDefault();
      return void (e.key === "1" ? drawing.resetView()
                 : e.key === "2" ? drawing.fitView(drawing.selectionPaths())
                 : drawing.fitView([]));
    }
    if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
    const sel = drawing.selectionPaths();
    if (Z[e.key] && sel.length) {
      e.preventDefault();
      // Each reorder moves the others, so re-read the (rebased) selection between steps rather than
      // working from a snapshot that the first move already invalidated.
      (async () => {
        for (let i = 0; i < sel.length; i++) {
          const cur = drawing.selectionPaths();
          if (cur[i]) await drawing.zOrder(cur[i], Z[e.key]);
        }
      })();
      return;
    }
    const ARROW = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (ARROW[e.key] && sel.length) {
      e.preventDefault();
      const k = e.shiftKey ? 10 : 1;
      return void drawing.nudge(ARROW[e.key][0] * k, ARROW[e.key][1] * k);
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      // A held vertex is the finer selection, so it is what the key means; only with none held does
      // Delete take the whole element.
      if (drawing.canCommand("delete-vertex")) {
        e.preventDefault();
        return void drawing.command("delete-vertex");
      }
      if (sel.length) { e.preventDefault(); return void drawing.removeSelection(); }
    }
    const hit = TOOLS.find(([, , k]) => k.toLowerCase() === e.key.toLowerCase());
    if (hit) drawing.setTool(hit[0]);
    // Escape means "undo what I am doing now", then "step out of this group", and only failing
    // both "leave this mode". Keyboard stays with the callsite; the drawing only offers the verbs.
    else if (e.key === "Escape") {
      if (!drawing.cancelGesture() && !drawing.ascendScope()) drawing.setTool("select");
    }
  };
  document.addEventListener("keydown", onKey);
  invalidation.then(() => document.removeEventListener("keydown", onKey));

  // G8. Right-click renders the same registry the bar does, so it costs nothing as the registry fills.
  // The click first selects what is under the pointer (unless that is already in the selection), then
  // the menu lists every command that is live *for that selection* — `canCommand` is the one authority,
  // exactly as it is for the buttons. Only commands are shown; keyboard-only view verbs stay off it.
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  const openMenu = (x, y) => {
    closeMenu();
    const live = (drawing.commands ? drawing.commands() : []).filter((c) => drawing.canCommand(c.id));
    if (!live.length) return;
    menu = htl.html`<div style="position:fixed;left:${x}px;top:${y}px;z-index:9999;background:#fff;border:1px solid #b9c4b4;border-radius:8px;padding:4px;box-shadow:0 6px 18px rgba(0,0,0,.18);min-width:160px;font:13px system-ui,sans-serif"></div>`;
    for (const c of live) {
      const item = htl.html`<div style="display:flex;justify-content:space-between;gap:16px;padding:5px 10px;border-radius:5px;cursor:pointer;color:#243"><span>${c.label}</span><span style="opacity:.5;font-size:11px">${c.key ? KEYNAME(c.key) : ""}</span></div>`;
      item.onmouseenter = () => (item.style.background = "#eef3ea");
      item.onmouseleave = () => (item.style.background = "");
      item.onclick = () => { closeMenu(); drawing.command(c.id); };
      menu.appendChild(item);
    }
    document.body.appendChild(menu);
  };
  const onContext = (e) => {
    e.preventDefault();
    const hit = drawing.pickAt ? drawing.pickAt(e) : [];
    const sel = drawing.selectionPaths();
    const inSel = hit[0] && sel.some((p) => p.join("/") === hit[0].join("/"));
    if (hit[0] && !inSel) drawing.select([hit[0]], "transform");
    else if (!hit[0] && !sel.length) drawing.select([]);
    openMenu(e.clientX, e.clientY);
  };
  drawing.addEventListener("contextmenu", onContext);
  const onDocDown = (e) => { if (menu && !menu.contains(e.target)) closeMenu(); };
  document.addEventListener("pointerdown", onDocDown, true);
  document.addEventListener("scroll", closeMenu, true);
  invalidation.then(() => {
    closeMenu();
    drawing.removeEventListener("contextmenu", onContext);
    document.removeEventListener("pointerdown", onDocDown, true);
    document.removeEventListener("scroll", closeMenu, true);
  });

  el.appendChild(bar);
  return el;
};

// Type an exact value for an attribute the typed panel does not own — geometry, a transform, a custom
// attribute. Paint and stroke belong to `fieldPanel` (the svgFields registry), so the inspector hides
// any attribute a registry field already edits: fill has exactly one surface. It writes through
// `setProperty` — the same style-aware commit `fieldPanel` and a drag use — so there is one write path,
// not a second. Re-renders on `lens-select`, which the focus emits whenever it repaints.
const _sl02c = function _inspector(htl,Inputs,invalidation,svgFields,$0)
{
  const drawing = $0;
  const el = htl.html`<div style="margin:.5rem 0;min-height:2.2em;display:grid;gap:8px"></div>`;
  const render = () => {
    const paths = drawing.selectionPaths();
    el.textContent = "";
    if (!paths.length) {
      el.append(htl.html`<span style="font:12px/1.5 ui-monospace,monospace;opacity:.6">nothing selected</span>`);
      return;
    }
    // One form per selected element: a multi-selection is several addresses, so it is several forms.
    for (const path of paths) {
      const info = drawing.describe(path);
      if (!info) continue;
      // Hide any attribute the field registry owns *for this element's tag* — paint lives in the panel
      // for a shape, stop-colour/offset for a stop — so each value has exactly one surface (§9.1).
      const owned = new Set(svgFields.forTag(info.tag).map((f) => f.prop));
      const fields = info.attrs.filter(([name]) => !owned.has(name)).map(([name, value]) => {
        const field = Inputs.text({ label: name, value, width: 220 });
        const box = field.querySelector("input");
        // `change`, not `input`: one commit per finished edit, like one commit per finished drag.
        box.addEventListener("change", () => drawing.setProperty(path, name, box.value));
        return field;
      });
      const jumps = drawing.refs(path).map((ref) => {
        const b = htl.html`<button style="font:12px ui-monospace,monospace;padding:2px 8px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">→ ${ref.attribute} #${ref.id}</button>`;
        if (ref.path) b.onclick = () => drawing.select([ref.path], "transform");
        else { b.disabled = true; b.title = "nothing in this document has that id"; }
        return b;
      });
      // G1/G4. When the selection is a gradient (or a shape whose paint points at one), surface its
      // stops as click-to-select swatches so the <defs> child is reachable without a manual tree
      // descent. Each swatch carries a ✕ to remove that stop (hidden below the 2-stop minimum, which
      // is where delete-stop declines), and a + adds one. The selected stop's swatch is ringed.
      const g = drawing.gradientStops ? drawing.gradientStops(path) : null;
      let strip = "";
      if (g && g.stops.length) {
        const selKey = info.tag === "stop" ? path.join("/") : null;
        strip = htl.html`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px">
          <span style="font:11px ui-monospace,monospace;opacity:.6">stops</span></div>`;
        for (const s of g.stops) {
          const sel = selKey === s.path.join("/");
          const wrap = htl.html`<span style="position:relative;display:inline-block;line-height:0"></span>`;
          const sw = htl.html`<button title="offset ${s.offset} · ${s.color} — click to edit" style="width:22px;height:22px;border-radius:4px;border:${sel ? "2px solid #4679b8" : "1px solid #8a978a"};background:${s.color};cursor:pointer;padding:0;box-shadow:${sel ? "0 0 0 2px #cfe0f2" : "none"}"></button>`;
          sw.onclick = () => drawing.select([s.path], "transform");
          wrap.append(sw);
          if (g.stops.length > 2) {
            const del = htl.html`<button title="remove this stop" style="position:absolute;top:-7px;right:-7px;width:15px;height:15px;border-radius:50%;border:1px solid #b9c4b4;background:#fff;color:#a33;cursor:pointer;padding:0;font:11px/1 ui-monospace,monospace;display:flex;align-items:center;justify-content:center">✕</button>`;
            del.onclick = async (e) => { e.stopPropagation(); drawing.select([s.path], "transform"); await drawing.command("delete-stop"); };
            wrap.append(del);
          }
          strip.append(wrap);
        }
        const add = htl.html`<button title="add a stop" style="width:22px;height:22px;border-radius:4px;border:1px solid #b9c4b4;background:#eef3ea;color:#243;cursor:pointer;padding:0;font:15px/1 ui-monospace,monospace">+</button>`;
        add.onclick = async () => { drawing.select([g.gradient], "transform"); await drawing.command("add-stop"); };
        strip.append(add);
      }
      el.append(htl.html`<fieldset style="border:1px solid #b9c4b4;border-radius:6px;padding:6px 10px 8px;margin:0">
        <legend style="font:12px ui-monospace,monospace;padding:0 4px">&lt;${info.tag}&gt; ${path.join(".")}</legend>
        ${Inputs.form(fields)}
        ${jumps.length ? htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${jumps}</div>` : ""}
        ${strip}
      </fieldset>`);
    }
  };
  render();
  const on = () => render();
  drawing.addEventListener("lens-select", on);
  drawing.addEventListener("lens-put", on);
  invalidation.then(() => {
    drawing.removeEventListener("lens-select", on);
    drawing.removeEventListener("lens-put", on);
  });
  return el;
};

// G46. The field panel: the enums an author asked for ("dotted lines and line caps") given somewhere
// to live. It is a pure projection of `drawing.fields(path)` — the registry decides which fields exist
// and reads their current values, this cell only picks a widget per `kind` and writes the change back
// through `drawing.setField`, which is `setProperty` → `commitDelta`, the one write path. So a widget's
// commit is byte-identical to a raw attribute write, adding a field is a line in the registry (no change here), and
// a change applies to *every* selected element (the align commands' "one delta per claimed element",
// G40). Colour gets both a native picker and a text box: the text preserves the author's own notation
// (`darkseagreen` stays `darkseagreen`), the picker is the swatch. Re-renders on select and on commit.
const _sl271 = function _fieldPanel(htl,Inputs,invalidation,$0)
{
  const drawing = $0;
  const el = htl.html`<div style="margin:.5rem 0;display:grid;gap:4px"></div>`;
  const commit = (paths, prop, value) => { for (const p of paths) drawing.setField(p, prop, value); };
  const row = (label, control) => htl.html`<label style="display:flex;align-items:center;gap:8px;font:12px ui-monospace,monospace">
    <span style="flex:0 0 96px;opacity:.7">${label}</span>${control}</label>`;
  const render = () => {
    const paths = drawing.selectionPaths();
    el.textContent = "";
    if (!paths.length) {
      el.append(htl.html`<span style="font:12px/1.5 ui-monospace,monospace;opacity:.6">select a shape to edit its paint</span>`);
      return;
    }
    const fields = drawing.fields(paths[0]);
    const tag = (drawing.describe(paths[0]) || {}).tag || "";
    const title = tag === "stop" ? "stop"
                : /^(linear|radial)Gradient$/.test(tag) ? "gradient" : "paint & stroke";
    const rows = fields.map((f) => {
      if (f.kind === "enum") {
        const opts = f.options.includes(f.value) && f.value !== "" ? f.options : [f.value || ""].concat(f.options);
        const sel = htl.html`<select style="font:12px ui-monospace,monospace;padding:2px 4px"></select>`;
        for (const o of opts) {
          const op = document.createElement("option");
          op.value = o; op.textContent = o === "" ? "(default)" : o;
          if (o === f.value) op.selected = true;
          sel.append(op);
        }
        sel.addEventListener("change", () => commit(paths, f.prop, sel.value));
        return row(f.label, sel);
      }
      if (f.kind === "color") {
        const txt = htl.html`<input type="text" value="${f.value}" placeholder="${f.dflt || "none"}" style="font:12px ui-monospace,monospace;width:120px">`;
        const sw = htl.html`<input type="color" style="width:28px;height:22px;padding:0;border:none;background:none">`;
        try { if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(f.value)) sw.value = f.value.length === 4
          ? "#" + f.value.slice(1).split("").map((c) => c + c).join("") : f.value; } catch (e) {}
        txt.addEventListener("change", () => commit(paths, f.prop, txt.value.trim()));
        sw.addEventListener("change", () => { txt.value = sw.value; commit(paths, f.prop, sw.value); });
        return row(f.label, htl.html`<span style="display:flex;gap:6px;align-items:center">${sw}${txt}</span>`);
      }
      const inp = htl.html`<input type="${f.kind === "number" ? "number" : "text"}" value="${f.value}" placeholder="${f.dflt || ""}" style="font:12px ui-monospace,monospace;width:120px">`;
      if (f.min !== undefined) inp.min = f.min;
      if (f.max !== undefined) inp.max = f.max;
      if (f.step !== undefined) inp.step = f.step;
      inp.addEventListener("change", () => commit(paths, f.prop, inp.value.trim()));
      return row(f.label, inp);
    });
    el.append(htl.html`<fieldset style="border:1px solid #b9c4b4;border-radius:6px;padding:6px 10px 8px;margin:0;display:grid;gap:4px">
      <legend style="font:12px ui-monospace,monospace;padding:0 4px">${title}${paths.length > 1 ? ` · ${paths.length} selected` : ""}</legend>
      ${rows}</fieldset>`);
  };
  // `lens-select`/`lens-put` dispatch synchronously inside the drawing's own `draw()`; a listener that
  // throws would break that render, so the panel must never let one escape.
  const on = () => { try { render(); } catch (e) { el.textContent = ""; el.append(htl.html`<span style="font:12px ui-monospace,monospace;color:#a33">${String(e.message || e)}</span>`); } };
  on();
  drawing.addEventListener("lens-select", on);
  drawing.addEventListener("lens-put", on);
  invalidation.then(() => {
    drawing.removeEventListener("lens-select", on);
    drawing.removeEventListener("lens-put", on);
  });
  return el;
};

// The interactive bench: the drawing above its live source, beside its tool/paint selectors,
// composed on a snap grid (drag an atom to rearrange; the `layout` literal is the persisted truth,
// rewritten on drag).
const _sl305 = function _workbench(gridContainer,runtime,invalidation,svgLensModule){return(
gridContainer(runtime, {
  invalidation,
  module: svgLensModule,
  columns: 12,
  height: 460,
  include: ["viewof drawing", "drawingCode", "toolbar", "inspector", "fieldPanel"],
  layout: {
    frame: { w: 1200, h: 800 },
    atoms: {
      "viewof drawing": { x: 0, y: 0, w: 8, h: 4 },
      drawingCode: { x: 0, y: 4, w: 8, h: 4 },
      toolbar: { x: 8, y: 0, w: 4, h: 1 },
      inspector: { x: 8, y: 1, w: 4, h: 3 },
      fieldPanel: { x: 8, y: 4, w: 4, h: 4 }
    }
  }
})
)};

// A userspace editor-5 cell editor bound to the drawing's own Variable: a live source preview that
// rewrites as the SVG is manipulated (and edits back — source and picture are the same value).
const _sl306 = async function _drawingCode(cellEditor,lookupVariable,svgLensModule){
  const v = await lookupVariable("viewof drawing", svgLensModule);
  return cellEditor(v, { pinned: true });
};

// ---- the SVG-factory case: a template with holes in it -------------------------------------------
const _sl06a = function _factoryDoc(md){return(
md`Three rectangles, one slider each way. **The first** carries \`transform="translate(\${shift} 0)"\`
and nothing else: drag it sideways and the slider moves, because that is the only place the number
lives. **The second** carries the same expression, so its x is upstream, but its y is a literal — drag
it vertically and its own source changes while \`\${shift}\` comes back byte for byte. **The third**
carries \`rotate(\${spin} 32 100)\`: spin it and the *spin* slider moves, the same upstream sink as the
first, because the whole angle is one expression naming a view.

Watch the table underneath: every gesture reports the sink it landed in.`
)};

const _sl06b = function _shift(Inputs){return(
Inputs.range([-100, 300], { value: 40, step: 1, label: "shift", width: 260 })
)};
const _sl06bv = (G, _) => G.input(_);

const _sl06c = function _spin(Inputs){return(
Inputs.range([0, 360], { value: 20, step: 1, label: "spin", width: 260 })
)};
const _sl06cv = (G, _) => G.input(_);

const _sl06 = function _factory(svgLens,svg,shift,spin){return(
svgLens(svg`<svg viewBox="0 0 240 120" width="100%" style="max-height:220px;background:#EDF1E8">
  <!-- upstream: the whole x is one expression naming a view, so dragging moves the slider -->
  <rect x="10" y="14" width="44" height="30" fill="#4C7FD1" transform="translate(${shift} 0)"/>
  <!-- mixed: y is source and writes; x is an expression and is reported locked -->
  <rect x="10" y="52" width="44" height="30" fill="#5B7A5E" transform="translate(${shift} 0)"/>
  <!-- upstream rotation: the whole angle is one expression naming a view, so a spin drags the slider -->
  <rect x="10" y="88" width="44" height="24" fill="#B25B3A" transform="rotate(${spin} 32 100)"/>
</svg>`)
)};
const _sl06v = (G, _) => G.input(_);

// Loading a document is not a special case: it is the constant command on the source lens, so it
// takes the same route as a drag and is refused by the same domain checks.
const _sl02d = function _loadSvg(htl,outsideDomain,$0)
{
  const drawing = $0;
  const file = htl.html`<input type="file" accept=".svg,image/svg+xml" style="font:12px ui-monospace,monospace">`;
  const say = (msg, ok) => { file.title = msg; file.style.outline = ok ? "" : "1px solid #B25B3A"; };
  // Real files lead with an XML declaration, a BOM, comments or a DOCTYPE before the root; strip that
  // preamble so what lands in the literal is the <svg> element itself. The tokenizer skips a prolog
  // anyway, but keeping it out of the source keeps the drawing addressable from its first byte.
  const stripPreamble = (t) => {
    let x = t.replace(/^\uFEFF/, "").trimStart();
    for (;;) {
      const before = x;
      x = x.replace(/^<\?[^>]*\?>\s*/, "")          // <?xml …?>
           .replace(/^<!DOCTYPE[^>[]*(\[[^\]]*\])?[^>]*>\s*/i, "")  // DOCTYPE, optional subset
           .replace(/^<!--[\s\S]*?-->\s*/, "");      // leading comments
      if (x === before) break;
    }
    return x;
  };
  const load = async (text) => {
    const t = stripPreamble(String(text));
    if (!/^<svg[\s>]/i.test(t)) return say("no <svg> root element found", false);
    // The writer only checks that text survives the template literal. Arbitrary pasted markup can
    // still be outside what the tokenizer can address (CDATA, raw-text elements, a DOCTYPE subset),
    // and writing it in would leave a cell nothing can parse — so refuse it here, with the reason.
    const bad = outsideDomain(t);
    if (bad) return say(`outside the svg-lens domain — ${bad}`, false);
    try {
      const r = await drawing.edit("load", () => t);
      say(r ? `loaded ${t.length} bytes — this cell's source is now your drawing` : "identical, nothing written", true);
    } catch (e) {
      say(e.message, false);                     // outside the domain, or would not survive the literal
    }
  };
  file.onchange = async () => { const f = file.files && file.files[0]; if (f) load(await f.text()); };
  // Download serializes the drawing's current source — this cell recomputes on every commit, so
  // `drawing` here is the live node and `.value` is the SVG text the source holds right now.
  const dl = htl.html`<button style="font:12px ui-monospace,monospace;padding:3px 10px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">download</button>`;
  dl.onclick = () => {
    const blob = new window.Blob([drawing.value || ""], { type: "image/svg+xml" });
    const url = window.URL.createObjectURL(blob);
    const a = htl.html`<a download="drawing.svg"></a>`;
    a.href = url; a.click();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };
  return htl.html`<div style="display:flex;gap:10px;align-items:center">${file}${dl}</div>`;
};

const _sl04 = function _howToDrive(md,ref) {return (md`

| gesture | what it does | lens |
|---|---|---|
| drag a shape | moves it | \`transform\` |
| tap a polygon or path, drag a handle | moves one vertex or anchor | \`points\`, path \`d\` |
| tap anything else, drag a corner or the rotate handle | scale or rotate from the box | \`transform\` |
| drag the pivot dot | moves the point the box scales and rotates around | \`transform\` |
| double-click an edge / a vertex / empty canvas | add a vertex / remove one / drop in a shape | \`children\` |
| tap again in the same place | steps down through stacked shapes | — |
| shift-tap, or rubber-band | adds to the selection | — |

A selection also carries **chips** — the same commands, one tap away, drawn only when they apply:

| chip | | chip | |
|---|---|---|---|
| **⧉** | duplicate | **∿** | smooth ↔ corner the anchor |
| **⇄** | swap fill and stroke | **◑** | give it a gradient (minted into \`defs\`) |
| **≡** _(drag)_ | stroke width | **➤** | put an arrowhead on it |
| **⊚** / **◠** | close / open the path | | |

The panel under the drawing edits \`fill\`, \`stroke\`, width, opacity and the dash as typed inputs;
each change commits through the same write path, so the source keeps the notation you wrote.

| key | |
|---|---|
| **R** **E** **L** | drag out a rect, an ellipse, a line |
| **P** | place path anchors; click the first again to close, double-click to finish open |
| **S** | scribble a freehand path; it is fitted to Béziers on release |
| **V** / **Esc** | back to selecting (a finished tool returns by itself) |
| **⌘G** / **⇧⌘G** | group / ungroup the selection |
| **⌘D** | duplicate |
| **⌘C** **⌘X** **⌘V** / **⇧⌘V** | copy, cut, paste / paste in place |
| **⌘A** | select all |
| **1** / **2** | reset the view / fit it to the selection |
| **\\[** **\\]** / **{** **}** | lower, raise / send to back, front |
| **Delete** | removes the selection |
| **⌘Z** / **⇧⌘Z** | undo, redo — byte for byte, and declines if something else wrote to the cell first |
| **arrows**, **shift+arrows** | nudge by one unit, by ten |
| **alt** while dragging | ignore snapping |

${ ref('architecture') }.`);};

// ---- how to use it somewhere else ----------------------------------------------------------------
const _sl08 = function _useIt(md) {return (md`## Use it in your own notebook

\`\`\`js
import {svgLens} from "@tomlarkworthy/svg-lens"

viewof picture = svgLens(svg\`<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="20" fill="tomato"/>
</svg>\`)
\`\`\``);};

// ---- citations and cross-references (the apparatus @tomlarkworthy/lopecode-live-2026 uses) -------
const _sl150 = function _externalLink(htl){return(
(label, url) => htl.html`<a href="${url}" target="_blank" rel="noopener">${label}</a>`
)};

// One list, numbered by position: renumbering a paper is not a job for a human.
const _sl151 = function _sections(){return(
[
  { key: "problem", title: "The problem" },
  { key: "lenses", title: "Lenses" },
  { key: "laws", title: "The laws", parent: "lenses" },
  { key: "residue", title: "Residue, and why PutPut bends", parent: "lenses" },
  { key: "tower", title: "The SVG tower: addressing and nesting" },
  { key: "architecture", title: "Tools, commands, one writer" },
  { key: "propagation", title: "Propagation, and why the loop closes", parent: "architecture" },
  { key: "rect", title: "A first lens: one attribute of one shape" },
  { key: "children", title: "The structural lens" },
  { key: "sinks", title: "Back-propagation: three sinks" },
  { key: "tools", title: "Tools as edit lenses" },
  { key: "toollaws", title: "The laws a tool owes", parent: "tools" },
  { key: "related", title: "Related work" },
  { key: "future", title: "Future work" }
]
)};

const _sl152 = function _sectionIndex(sections){return(
(() => {
  const index = new Map();
  const kids = new Map();
  let top = 0;
  for (const s of sections) {
    if (s.parent) {
      const n = (kids.get(s.parent) || 0) + 1;
      kids.set(s.parent, n);
      index.set(s.key, { num: `${index.get(s.parent).num}.${n}`, title: s.title, level: 3 });
    } else {
      index.set(s.key, { num: String(++top), title: s.title, level: 2 });
    }
  }
  return index;
})()
)};

const _sl153 = function _sec(sectionIndex){return(
(key) => {
  const s = sectionIndex.get(key);
  const h = document.createElement(s ? `h${s.level}` : "h2");
  h.id = `sec-${key}`;
  h.textContent = s ? `${s.num}. ${s.title}` : `[missing section: ${key}]`;
  return h;
}
)};

const _sl154 = function _ref(sectionIndex,htl){return(
(key) => {
  const s = sectionIndex.get(key);
  if (!s) return htl.html`<strong style="color:#c96a6a">[missing section: ${key}]</strong>`;
  return htl.html`<a href="#" title="§${s.num} ${s.title}" onclick=${(ev) => {
    ev.preventDefault();
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }}><em>§${s.num} ${s.title}</em></a>`;
}
)};

const _sl155 = function _bibliography(){return(
{
  bancilhon1981: {
    label: "Bancilhon & Spyratos 1981",
    authors: "Bancilhon, F. & Spyratos, N.",
    year: 1981,
    title: "Update Semantics of Relational Views",
    venue: "ACM TODS 6(4), 557–575",
    url: "https://dl.acm.org/doi/10.1145/319628.319634"
  },
  foster2007lenses: {
    label: "Foster et al. 2007",
    authors: "Foster, J.N., Greenwald, M.B., Moore, J.T., Pierce, B.C. & Schmitt, A.",
    year: 2007,
    title: "Combinators for Bidirectional Tree Transformations: A Linguistic Approach to the View-Update Problem",
    venue: "ACM TOPLAS 29(3)",
    url: "https://dl.acm.org/doi/10.1145/1232420.1232424"
  },
  czarnecki2009bx: {
    label: "Czarnecki et al. 2009",
    authors: "Czarnecki, K., Foster, J.N., Hu, Z., Lämmel, R., Schürr, A. & Terwilliger, J.F.",
    year: 2009,
    title: "Bidirectional Transformations: A Cross-Discipline Perspective",
    venue: "ICMT, LNCS 5563, 260–283",
    url: "https://doi.org/10.1007/978-3-642-02408-5_19"
  },
  hofmann2012editlenses: {
    label: "Hofmann et al. 2012",
    authors: "Hofmann, M., Pierce, B.C. & Wagner, D.",
    year: 2012,
    title: "Edit Lenses",
    venue: "POPL, 495–508",
    url: "https://repository.upenn.edu/cis_papers/677/"
  },
  diskin2011delta: {
    label: "Diskin et al. 2011",
    authors: "Diskin, Z., Xiong, Y. & Czarnecki, K.",
    year: 2011,
    title: "From State- to Delta-Based Bidirectional Model Transformations: the Asymmetric Case",
    venue: "Journal of Object Technology 10, 6:1–25",
    url: "https://www.jot.fm/issues/issue_2011_10/article6.pdf"
  },
  johnson2016unifying: {
    label: "Johnson & Rosebrugh 2016",
    authors: "Johnson, M. & Rosebrugh, R.",
    year: 2016,
    title: "Unifying Set-Based, Delta-Based and Edit-Based Lenses",
    venue: "Bx@ETAPS, CEUR Vol-1571, 1–13",
    url: "https://ceur-ws.org/Vol-1571/paper_13.pdf"
  },
  chugh2016: {
    label: "Chugh et al. 2016",
    authors: "Chugh, R., Hempel, B., Spradlin, M. & Albers, J.",
    year: 2016,
    title: "Programmatic and Direct Manipulation, Together at Last",
    venue: "PLDI",
    url: "https://dl.acm.org/doi/10.1145/2908080.2908103"
  },
  hempel2016: {
    label: "Hempel & Chugh 2016",
    authors: "Hempel, B. & Chugh, R.",
    year: 2016,
    title: "Semi-Automated SVG Programming via Direct Manipulation",
    venue: "UIST",
    url: "https://dl.acm.org/doi/10.1145/2984511.2984575"
  },
  hempel2019: {
    label: "Hempel et al. 2019",
    authors: "Hempel, B., Lubin, J. & Chugh, R.",
    year: 2019,
    title: "Sketch-n-Sketch: Output-Directed Programming for SVG",
    venue: "UIST",
    url: "https://dl.acm.org/doi/10.1145/3332165.3347925"
  },
  litt2020cambria: {
    label: "Litt et al. 2020",
    authors: "Litt, G., van Hardenberg, P. & Henry, O.",
    year: 2020,
    title: "Project Cambria: Translate Your Data with Lenses",
    venue: "Ink & Switch",
    url: "https://www.inkandswitch.com/cambria/"
  },
  horowitz2023lrc: {
    label: "Horowitz & Heer 2023",
    authors: "Horowitz, J. & Heer, J.",
    year: 2023,
    title: "Live, Rich, and Composable: Qualities for Programming Beyond Static Text",
    venue: "PLATEAU",
    url: "https://arxiv.org/abs/2303.06777"
  },
  larkworthy2026: {
    label: "Larkworthy 2026",
    authors: "Larkworthy, T.",
    year: 2026,
    title: "Source-last programming",
    venue: "LIVE 2026",
    url: "https://liveprog.org/"
  },
  tanimoto1990: {
    label: "Tanimoto 1990",
    authors: "Tanimoto, S.L.",
    year: 1990,
    title: "VIVA: A visual language for image processing",
    venue: "Journal of Visual Languages and Computing 1(2), 127–139",
    url: "https://doi.org/10.1016/S1045-926X(05)80012-6"
  },
  omar2019holes: {
    label: "Omar et al. 2019",
    authors: "Omar, C., Voysey, I., Chugh, R. & Hammer, M.A.",
    year: 2019,
    title: "Live functional programming with typed holes",
    venue: "PACMPL 3(POPL)",
    url: "https://doi.org/10.1145/3290327"
  },
  edwards2019: {
    label: "Edwards et al. 2019",
    authors: "Edwards, J., Kell, S., Petricek, T. & Church, L.",
    year: 2019,
    title: "Evaluating programming systems design",
    venue: "PPIG",
    url: "https://www.ppig.org/files/2019-PPIG-30th-edwards.pdf"
  }
}
)};

const _sl156 = function _cite(bibliography,htl){return(
(key) => {
  const e = bibliography[key];
  if (!e) return htl.html`<strong style="color:#c96a6a">[missing ref: ${key}]</strong>`;
  return htl.html`<a href="#" title="${e.authors} (${e.year}). ${e.title}. ${e.venue}." onclick=${(ev) => {
    ev.preventDefault();
    document.getElementById(`ref-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }}>[${e.label}]</a>`;
}
)};

const _sl157 = function _references(bibliography,externalLink,htl){return(
htl.html`<ol style="line-height:1.7">
  ${Object.entries(bibliography).map(([key, e]) => htl.html`<li id="ref-${key}">
    ${e.authors} (${e.year}). ${externalLink(htl.html`<em>${e.title}</em>`, e.url)}. ${e.venue}.
  </li>`)}
</ol>`
)};

// ================================================================================================
// THE PAPER
// ================================================================================================
const _sl200 = function _paperHeader(md) {return (md`---

# Editing a drawing by editing its program

*What follows is the reasoning behind the editor above: what a lens is, which laws it keeps, how we combine to cover a complex domain like SVG, how the maths of sync is kept apart from the UX, and additionally how to apply when the drawing is itself a parameterized function.*`);};

const _sl201 = function _problemH(sec){return(sec("problem"))};

const _sl202 = function _problemP(md,cite,ref) {return (md`You can create computer graphics by typing code or by a graphical user interface, each has advantages in certain situations. If we can switch between these two modes fluidly, bidirectional, the advantage of each can be leveraged at that moment in time and the combined sum is greater than the parts in isolation. Keeping both means keeping them in step, which is the view-update problem ${ cite('bancilhon1981') } recast for programs ${ cite('chugh2016') }. Feedback in the other direction — program to picture — is the older half of the problem and has a standard vocabulary ${ cite('tanimoto1990') }; what is at issue here is the return path.

Propagation is the hard part. Sketch-n-Sketch infers program changes from output changes by tracing values back to the expressions that produced them ${ cite('chugh2016') } ${ cite('hempel2019') }, which works for programs the tracer understands.

This notebook takes a different approach. The update path is a composition of bidirectional lenses ${ cite('foster2007lenses') }, which gives it laws, a stated domain, and property tests (${ ref('laws') }).

What is editable is a drawing whose shape is written literally, plus numbers arriving from named inputs (${ ref('sinks') }).`);};

const _sl203 = function _lensesH(sec){return(sec("lenses"))};

const _sl204 = function _lensesP(md,tex,cite) {return (md`A **lens** between a source type ${ tex`S` } and a view type ${ tex`A` } is a pair of functions ${ cite('foster2007lenses') }:

${ tex.block`\mathrm{get} : S \to A \qquad \mathrm{put} : A \times S \to S` }

${ tex`\mathrm{get}` } reads a view out of a source; ${ tex`\mathrm{put}` } pushes an edited view back *into a particular source*. The second argument is what distinguishes a lens from a parser/printer pair: ${ tex`S \to A` } and ${ tex`A \to S` } would discard everything the parser did not model, whereas ${ tex`\mathrm{put}` } still holds the old source while it writes, so it can keep what the view never mentioned ${ cite('foster2007lenses') }.

Here ${ tex`S` } is text and ${ tex`A` } is whatever a gesture manipulates: a number, a point list, a transform. The lenses compose. Writing ${ tex`l_1` } for the outer and ${ tex`l_2` } for the inner lens,

${ tex.block`(l_1 \circ l_2).\mathrm{get}(s) = l_2.\mathrm{get}(l_1.\mathrm{get}(s))` }

${ tex.block`(l_1 \circ l_2).\mathrm{put}(b, s) = l_1.\mathrm{put}\big(l_2.\mathrm{put}(b, l_1.\mathrm{get}(s)),\; s\big)` }

and that is exactly the chain a drag runs down: cell source → template literal → attribute string → typed value, then back up again. Composition of well-behaved lenses is well-behaved, so the laws are established once, per level, and hold for the composite.`);};

const _sl205 = function _lawsH(sec){return(sec("laws"))};

const _sl206 = function _lawsP(md,tex,cite,ref){return(
md`Two laws make a lens *well-behaved* ${cite("foster2007lenses")}:

${tex.block`\mathrm{put}(\mathrm{get}(s),\, s) = s \qquad\qquad \mathrm{get}(\mathrm{put}(a,\, s)) = a`}

**GetPut** (left) says a null edit is a null write: drag a shape back to where it started and the cell
is byte-identical to before, not merely equivalent. **PutGet** (right) says the view you asked for is
the view you get, so a drag of 40 pixels moves the shape 40 pixels and the number in the source
agrees.

A third law, **PutPut**, makes a lens *very* well-behaved:

${tex.block`\mathrm{put}(a_2,\, \mathrm{put}(a_1,\, s)) = \mathrm{put}(a_2,\, s)`}

— the last write wins and intermediate ones leave no trace. Most of these lenses keep it; some
deliberately do not (${ref("residue")}). ${cite("czarnecki2009bx")} surveys how many disciplines have
had to make the same trade, and ${cite("hofmann2012editlenses")} is one systematic response to it.`
)};

const _sl207 = function _residueH(sec){return(sec("residue"))};

const _sl208 = function _residueP(md,tex,cite){return(
md`SVG's syntax is not canonical. \`"0,0  100 100"\` and \`"0 0 100 100"\` are the same rectangle;
\`rotate(45)\` and \`matrix(0.707 0.707 -0.707 0.707 0 0)\` are the same transform. So ${tex`\mathrm{get}`}
is not injective: a whole *fibre* of source strings maps to one view.

${tex.block`\mathrm{get}^{-1}(a) = \{\, s \in S \;\mid\; \mathrm{get}(s) = a \,\}`}

Any ${tex`\mathrm{put}`} has to pick a representative from that fibre. Reprinting canonically is the
obvious choice, and it reformats the file every time a shape is nudged. The rule used here instead:

> **Skip rule.** If ${tex`a = \mathrm{get}(s)`}, return ${tex`s`} unchanged.

This implements GetPut rather than merely satisfying it, and it is what keeps comments, spacing and
\`rotate(45)\` intact across an edit. Everything the view does not determine is **residue**, and
residue survives.

It costs strict PutPut. Take ${tex`a_2 = \mathrm{get}(s)`} and ${tex`a_1 \neq \mathrm{get}(s)`}, with
${tex`s`} written non-canonically. On the left the first put reprints, the second skips, and the
non-canonical spelling is gone; on the right the single put skips and the spelling survives — two
different strings encoding the same drawing. What holds is PutPut *up to observation*:

${tex.block`\mathrm{get}(\mathrm{put}(a_2, \mathrm{put}(a_1, s))) = \mathrm{get}(\mathrm{put}(a_2, s))`}

and strict PutPut holds whenever ${tex`a_2 \neq \mathrm{get}(s)`}. This is a deliberate trade rather
than a defect: canonical printing would restore the law and remove the property that makes the editor
usable on source a human wrote. Weakening a law to a quotient is the usual move when residue matters
${cite("czarnecki2009bx")}. \`test_putput_skip_rule_corner\` in the appendix targets this case
directly, since random generators are unlikely to reach it.`
)};

const _sl211 = function _towerH(sec){return(sec("tower"))};

const _sl212 = function _towerP(md,cite,tex,ref) {return (md`Two things make SVG harder than the string examples in ${ cite('foster2007lenses') }: the source is *nested*, and every address is relative to a source that editing can change.

**Notation.** Composition is written in diagrammatic order throughout — ${ tex`\ell_1 \circ \ell_2` } applies ${ tex`\ell_1` } first, so the outer lens is on the left. This is the reverse of the usual convention for functions, and matches the direction a gesture travels.

**The tower.** Four types and three lenses:

${ tex.block`\begin{aligned} \ell_{\mathrm{lit}} &\;:\; \mathrm{Src} \rightharpoonup \mathrm{Doc} &&\texttt{literalLens} \\ \ell_{\mathrm{attr}}(p, n) &\;:\; \mathrm{Doc} \rightharpoonup \mathrm{Attr} &&\texttt{attrTextLens} \\ \ell_\mu &\;:\; \mathrm{Attr} \rightharpoonup A &&\texttt{transformLens},\ \texttt{pointsLens},\ \texttt{pathLens},\ \texttt{lengthLens} \end{aligned}` }

${ tex`\mathrm{Src}` } is the cell's own definition text, recovered from \`Function.prototype.toString()\`; ${ tex`\mathrm{Doc}` } is the bytes of the \`svg\` template literal inside it; ${ tex`\mathrm{Attr}` } is one attribute value; ${ tex`A` } is what the gesture actually manipulates — a number, a point list, an affine matrix, a list of path operations. A drag of a shape is the composite

${ tex.block`\ell_{\mathrm{lit}} \circ \ell_{\mathrm{attr}}(p, \texttt{transform}) \circ \ell_{\mathrm{transform}} \;:\; \mathrm{Src} \rightharpoonup \mathbb{R}^6` }

and structural editing branches off one level up, at ${ tex`\ell_{\mathrm{kids}}(p) = \texttt{childrenLens}(p) : \mathrm{Doc} \rightharpoonup \mathrm{Elem}^*` }, whose view is the list of child *source slices* — so every child carries its own residue and only the children that changed are reprinted.

**Addressing is dependent, and that is the interesting part.** For a document ${ tex`s` } let ${ tex`\mathrm{Path}(s)` } be the set of addresses of its elements. ${ tex`\ell_{\mathrm{attr}}` } is not a lens but a *family* indexed by that set, and the set depends on the source:

${ tex.block`\ell_{\mathrm{attr}} \;:\; (s : \mathrm{Doc}) \to \mathrm{Path}(s) \times \mathrm{Name} \to \mathrm{Lens}(\mathrm{Doc}, \mathrm{Attr})` }

The two kinds of put differ exactly here:

${ tex.block`\begin{aligned} \mathrm{Path}\big(\mathrm{put}_{\ell_{\mathrm{attr}}(p,n)}(a, s)\big) &= \mathrm{Path}(s) \\ \mathrm{Path}\big(\mathrm{put}_{\ell_{\mathrm{kids}}(p)}(k, s)\big) &\neq \mathrm{Path}(s) \quad\text{in general} \end{aligned}` }

An attribute edit preserves the address space; a structural edit does not. That one inequality is the reason the editor holds a selection as a *path* and re-resolves it after every put instead of caching a node, and the reason handles are refreshed after an attribute edit but cleared after a structural one.

**Partiality is part of the type.** ${ tex`\ell_{\mathrm{lit}}` } refuses text that would not survive re-entry into the template literal; ${ tex`\ell_{\mathrm{kids}}` } refuses a string that is not exactly one element. So put is partial, ${ tex`\mathrm{put} : A \times S \rightharpoonup S` }, and composition intersects the domains:

${ tex.block`\mathrm{dom}(\ell_1 \circ \ell_2) = \{\,(b, s) \;\mid\; s \in \mathrm{dom}(\ell_1.\mathrm{get}),\; (b,\, \ell_1.\mathrm{get}(s)) \in \mathrm{dom}(\ell_2.\mathrm{put}),\; (\ell_2.\mathrm{put}(b, \ell_1.\mathrm{get}(s)),\, s) \in \mathrm{dom}(\ell_1.\mathrm{put})\,\}` }

The editor's contract is that this partiality is *visible*: a gesture whose put is undefined is declined before it previews, and the handle is drawn locked with the reason (${ ref('sinks') }). Refusing is the domain being honest, not a failure.

**Composition preserves the laws.** If ${ tex`\ell_1` } and ${ tex`\ell_2` } are well-behaved on their domains then so is ${ tex`\ell_1 \circ \ell_2` }. GetPut:

${ tex.block`(\ell_1 \circ \ell_2).\mathrm{put}\big((\ell_1 \circ \ell_2).\mathrm{get}(s),\, s\big) = \ell_1.\mathrm{put}\big(\ell_2.\mathrm{put}(\ell_2.\mathrm{get}(\ell_1.\mathrm{get}(s)),\, \ell_1.\mathrm{get}(s)),\, s\big) = \ell_1.\mathrm{put}(\ell_1.\mathrm{get}(s),\, s) = s` }

using GetPut of ${ tex`\ell_2` } then of ${ tex`\ell_1` }; PutGet is the same argument read downwards. This is why the laws are established once per level and never re-argued for the chain — and why a new microsyntax lens is a self-contained obligation: prove it at its own level and the tower is unaffected.

The weakened form composes too. Each level keeps PutPut only up to observation (${ ref('residue') }), and since ${ tex`(\ell_1 \circ \ell_2).\mathrm{get} = \ell_2.\mathrm{get} \circ \ell_1.\mathrm{get}` }, the composite's quotient is exactly the composite's own \`get\` — so "up to observation" at each level gives "up to observation" of the whole chain, with no further loss.`);};

const _sl209 = function _architectureH(sec){return(sec("architecture"))};

const _sl210 = function _architectureP(md,ref,cite) {return (md`One rule separates the maths from the pointer:

> **Tools emit commands, commands are lens puts, one writer applies them.**

A tool is a pointer state machine — press, move, release. It may draw a preview into an overlay layer and mutate the live DOM; it may not persist anything. What it produces at the end of a gesture is a *command*: a pure function from the document text to new document text, or an attribute value to write at an address. The writer is the only code in the notebook that redefines a cell.

| layer | what lives there | knows about | |---|---|---| | L5 chrome | toolbar, inspector, keyboard, guides | the DOM | | L4 tools | pointer state machines, registered as a priority list | the DOM, geometry | | L3 commands | insert/delete/reorder, point edits, gizmo ops | text only | | L2 source lenses | cell source ⇄ template literal ⇄ attribute ⇄ children | text only | | L1 microsyntax | \`viewBox\`, \`points\`, \`transform\`, path \`d\`, lengths, style | strings and numbers | | L0 lens core | \`lens\`, \`compose\`, the law predicates | nothing |

Nothing below L4 touches the DOM or the pointer, so L0–L3 is testable outside of a browser, and is (${ ref('laws') }). Two consequences worth stating:

**The source is the truth; the DOM is a projection.** ${ cite('larkworthy2026') } calls the general arrangement *source-last* — the live runtime is canonical and text is recovered from it on demand — and this editor applies it one level down, to the bytes inside one cell. A gesture is therefore an ordinary edit; what that buys, and why the resulting feedback loop terminates, is ${ ref('propagation') }.

**The browser stays the authority on geometry.** Hit testing is \`elementsFromPoint\`, bounding boxes are \`getBBox\`, screen-to-user conversion is \`getScreenCTM\`. The lenses never re-implement SVG semantics; they only rewrite the text that produced them.`);};

// ---- §4 widget: one lens, one number, the laws checked in front of you ---------------------------
// The source string is fixed and deliberately untidy, and the only
// thing the slider can reach is one number inside it. Everything else on screen is derived.
const _sl219 = function _lawBadges(htl){return(
// One readout for every demo below: the laws are computed on the put that just happened, not asserted.
(node, invalidation) => {
  const el = htl.html`<div style="font:12px/1.6 ui-monospace,monospace;min-height:1.6em"></div>`;
  const badge = (ok, label) => htl.html`<span style="margin-right:14px">${ok ? "\u2705" : "\u274c"} ${label}</span>`;
  const render = (d) => {
    el.textContent = "";
    if (!d) {
      el.append(htl.html`<span style="opacity:.6">drag the picture \u2014 each put is checked here</span>`);
      return;
    }
    el.append(
      badge(d.GetPut, "GetPut"), badge(d.PutGet, "PutGet"),
      htl.html`<span style="opacity:.7">${d.target} ${d.attribute}: ${d.before} \u2192 ${d.after}</span>`
    );
  };
  render(node.lastPut);
  const on = (e) => render(e.detail);
  node.addEventListener("lens-put", on);
  if (invalidation) invalidation.then(() => node.removeEventListener("lens-put", on));
  return el;
}
)};


const _sl213 = function _propagationH(sec){return(sec("propagation"))};

const _sl214 = function _propagationP(md,tex,ref) {return (md`**Commands are endomorphisms of the source.** Currying a put gives

${ tex.block`\mathrm{cmd}_\ell(a) \;=\; \lambda s.\; \mathrm{put}_\ell(a,\, s) \;:\; S \rightharpoonup S` }

so every lens at every level of ${ ref('tower') } induces a source-to-source function, and the command layer needs no vocabulary of its own: insert, delete, reorder and the gizmo operations are all of this shape. Commands compose by ordinary function composition, and the skip rule says a null edit is the identity of that monoid:

${ tex.block`\mathrm{cmd}_\ell(\mathrm{get}_\ell(s))(s) = s` }

This has an operational consequence, not just an algebraic one: the writer compares the produced source with the old one and returns before touching the runtime when they are equal, so a gesture that ends where it started causes no recompute at all.

**Disjoint addresses commute.** Dragging ${ tex`n` } selected shapes is ${ tex`n` } commands, one per address, and for ${ tex`p` }, ${ tex`q` } neither a prefix of the other

${ tex.block`\mathrm{cmd}_{\ell_{\mathrm{attr}}(p,n)}(a) \;\circ\; \mathrm{cmd}_{\ell_{\mathrm{attr}}(q,m)}(b) \;=\; \mathrm{cmd}_{\ell_{\mathrm{attr}}(q,m)}(b) \;\circ\; \mathrm{cmd}_{\ell_{\mathrm{attr}}(p,n)}(a)` }

because an attribute put splices a byte range inside its own element and leaves the element list — and therefore every other address — untouched. So "one put per shape" needs no ordering discipline, and \`test_commands_commute\` in the appendix checks it on random documents. Structural puts are excluded from the claim, and genuinely do not commute: they renumber the addresses the other put is holding.

**Tools are folds over pointer events.** A tool is a state machine

${ tex.block`\delta \;:\; Q \times \mathrm{Event} \to Q \times \mathrm{Preview} \qquad\qquad \varepsilon \;:\; Q \rightharpoonup \mathrm{Cmd}` }

where ${ tex`\delta` } may draw into the overlay and mutate the live DOM, and ${ tex`\varepsilon` } is consulted once, at release. The preview is a projection that is thrown away; the command is the only thing that survives the gesture. Tools sit in a priority list and the first whose hit test claims the pointer owns the gesture, so adding a tool is adding an element to a list — it cannot interfere with the levels below because nothing in ${ tex`Q` } can reach ${ tex`S` }.

**Propagation is the runtime's, not ours.** The writer applies the command and installs the result with \`Variable.define\`:

${ tex.block`s \;\xrightarrow{\;c\;}\; s' \;\xrightarrow{\;\texttt{define}\;}\; \text{cell recomputed} \;\longrightarrow\; \text{node, dependents, editors}` }

Nothing in the editor notifies anything. \`editor-5\`'s buffer, the change history and every dependent cell update because the runtime recomputed a variable, which is what it does whenever a definition changes.

**Why the loop closes in one step.** The editor is the value of the cell it rewrites, so a gesture edits its own producer — the drawing is downstream of the gesture that changed it. That is a feedback loop, and it terminates for a reason worth naming: PutGet. The recomputed view is already the view the gesture asked for,

${ tex.block`\mathrm{get}(\mathrm{put}(a,\, s)) = a` }

so the new node has nothing left to write and emits no second command. One gesture, one command, one recompute. Had the design gone the other way — mutate the DOM and derive the source from it — the loop would need a fixed point and an argument that it converges. Here the law does that work.`);};

// ---- §4 widget: drag it. The comment, the spacing and the `px` unit are residue and must survive.
const _sl220 = function _rectDemo(svgLens,svg){return(
svgLens(svg`<svg viewBox="0 0 200 90">
  <!-- residue: this comment and every other attribute survive an edit untouched -->
  <polygon points="40,70 100,20 160,70" fill="#4C7FD1"/>
</svg>`)
)};
const _sl220v = (G, _) => G.input(_);

const _sl220b = function _rectDemoLaws(htl,lawBadges,$0,invalidation){return(
htl.html`<div style="display:grid;gap:10px">${lawBadges($0, invalidation)}</div>`
)};

// ---- §5 widget: the structural lens, and what it refuses to lose ---------------------------------
const _sl221 = function _childrenDemo(svgLens,svg){return(
svgLens(svg`<svg viewBox="0 0 200 90">
  <polygon points="70,70 100,20 130,70" fill="#B25B3A"/>
  <!-- a comment between children is residue too -->
  <rect x="10" y="20" width="50" height="50" fill="#5B7A5E"/>
  <circle cx="120" cy="45" r="24" fill="#F5B840"/>
  <rect x="150" y="10" width="20" height="20" fill="#41584A"/>
  <rect x="150" y="10" width="20" height="20" fill="#41584A"/>
</svg>`)
)};
const _sl221v = (G, _) => G.input(_);

const _sl221b = function _childrenDemoOps(htl,lawBadges,$0,invalidation)
{
  const node = $0;
  // The same structural commands the keyboard drives, on the node itself \u2014 no second write path.
  const act = (label, fn) => {
    const b = htl.html`<button style="padding:4px 10px;border-radius:6px;border:1px solid #b9c4b4;cursor:pointer">${label}</button>`;
    b.onclick = () => fn();
    return b;
  };
  const last = () => {
    const n = node.describe([0]) ? node.selectionPaths() : [];
    return n.length ? n[n.length - 1] : null;
  };
  const bar = htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap"></div>`;
  bar.append(
    act("insert at front", () => node.addShape('<polygon points="70,70 100,20 130,70" fill="#B25B3A"/>', 0)),
    act("append", () => node.addShape('<rect x="150" y="10" width="20" height="20" fill="#41584A"/>')),
    act("delete selection", () => node.removeSelection()),
    act("send to back", () => { const p = last(); if (p) node.zOrder(p, "back"); }),
    act("bring to front", () => { const p = last(); if (p) node.zOrder(p, "front"); })
  );
  return htl.html`<div style="display:grid;gap:10px">${bar}${lawBadges(node, invalidation)}</div>`;
};

// ---- §6 widget: which sink did that gesture land in? ---------------------------------------------
const _sl222 = function _sinkRecord(putLog,edits,Inputs,htl){return(
(() => {
  const rows = putLog.filter((e) => e.source === "factory").slice(-6).reverse()
    .map(({ detail: d }) => ({ attribute: d.attribute, sink: d.sink || "literal",
                               before: d.before, after: d.after, locked: d.locked || "" }));
  return htl.html`<div>${
    rows.length
      ? Inputs.table(rows, { columns: ["attribute", "sink", "before", "after", "locked"],
                             rows: 6, layout: "auto", width: { sink: "14%", attribute: "10%" } })
      : htl.html`<div style="font:12px/1.6 ui-monospace,monospace;opacity:.7">drag one of the three boxes above — the sink each gesture lands in shows up here</div>`
  }</div>`;
})()
)};

const _sl223 = function _rectH(sec){return(sec("rect"))};

const _sl224 = function _rectP(md,tex,ref){return(
md`The smallest useful lens: one attribute of one shape. The triangle's three corners live in a single
\`points\` attribute; the rest of the source — a comment, the fill — must come through every edit untouched.

${tex.block`\mathrm{cellPoints} \;=\; \mathrm{attrText}(i, \texttt{points}) \;\circ\; \mathrm{parsePoints}`}

\`attrTextLens(i, name)\` views the *text* of one attribute of element ${tex`i`}; \`parsePoints\` views
the numbers inside that text and puts them back into the same slots. Composing them gives a lens from
the whole document to the corner coordinates, and that composite is what a drag on a vertex writes
through.

Click the triangle, then drag a corner. The readout below reports the put that just happened — which
attribute changed, and its value before and after. Two things hold, computed on each drag rather than
asserted:

- only the \`points\` attribute is written, and only the corner you grabbed changes value; the fill, the
  comment and everything else in the source are left exactly as typed, because ${tex`\mathrm{put}`}
  splices the new value into the existing string instead of reprinting the whole element;
- drop the corner back where it started and the put is a no-op: ${tex`a = \mathrm{get}(s)`}, the skip
  rule fires, and the source comes back unchanged (${ref("residue")}).`
)};

const _sl225 = function _childrenH(sec){return(sec("children"))};

const _sl226 = function _childrenP(md,tex,cite,ref){return(
md`Attributes are the easy half. The structural lens is harder, because inserting an element is where
a naive implementation reformats the document.

${tex.block`\mathrm{childrenLens}(p) : \mathrm{Document} \;\rightleftarrows\; \mathrm{String}^{*}`}

The view is a **list of child source strings**, not parsed nodes. With strings, \`insert\`, \`delete\`
and \`reorder\` are \`splice\` on an array, and a moved child carries its own bytes with it: attribute
order, inner spacing, its own comments. With parsed nodes the commands would be tidier and every
structural edit would reprint half the file.

The view does not contain the text *between* children — newlines, indentation, comments sitting in
the gaps. That is residue again, and \`put\` has to re-thread it: each surviving gap stays with its
neighbour, and a genuinely new child gets only the *indentation* of the gap it lands in. An early
version gave a new child the whole gap, so every insert duplicated the comment above the first child;
four inserts produced five copies. The regression test is in the appendix, and the button below runs
the same operation.

The commands are pure functions of text — no DOM, no pointer — so the same code runs under Node in CI
and under a finger here (${ref("architecture")}). Working at the granularity of operations rather
than states is the move edit lenses make ${cite("hofmann2012editlenses")}; here an "edit" is
concretely a splice on a list of source strings.`
)};

const _sl227 = function _sinksH(sec){return(sec("sinks"))};

const _sl228 = function _sinksP(md,tex,ref,cite){return(
md`Everything so far assumed the drawing is written out literally. As soon as one number comes from
elsewhere — \`transform="translate(\${shift} 0)"\` — a gesture has to answer a further question: whose
number is this?

The source text of an attribute is cut into **slots**. Each slot is either a literal run of digits or
an interpolation, and each has a provenance that decides where a change to it can go:

${tex.block`\mathrm{slot} \;\to\; \mathrm{provenance} \;\to\; \mathrm{sink}`}

| provenance | sink | exact? |
|---|---|---|
| literal digits | this cell's own source, as in ${ref("rect")} | yes |
| ${tex`\$\{x\}`} where ${tex`x`} names a view | that view: set its value and let the runtime re-render | yes |
| any other expression | none — the handle is drawn locked and the put refuses, with a reason | n/a |

The third row matters most. A hole feeding \`Math.sin\` could be solved numerically for an approximate
answer; this editor does not, because an approximate answer is indistinguishable from an exact one on
screen and the difference surfaces later. Refusing keeps the guarantee in ${ref("laws")} true of every
accepted gesture, and the handle says which case it is in. The term *hole* is used here in a weaker
sense than in ${cite("omar2019holes")}, where holes are typed and the language has a semantics for
evaluating around them; here a hole is only an interpolation whose provenance the editor can or
cannot resolve.

The second row changes the shape of the update. The put moves a slider, and the runtime recomputes
the cell that draws the shape, so the drawing is downstream of the gesture rather than its target —
everything else depending on that slider updates too. With ${ref("architecture")} committing through
\`define\`, the first row now behaves the same way; the difference between the sinks is which cell is
rewritten, not whether the graph is told.`
)};

const _sl279 = function _toolsH(sec){return(sec("tools"))};

const _sl280 = function _toolsP(md,tex,cite,ref){return(
md`The lenses so far answer one question: given a new view, what source produces it. A tool asks
something narrower and carries more with it — given a *pointer delta* and the scratch a gesture has
been accumulating (the origin it started from, the elements it grabbed, the snap boxes), what edit
does the source get. Before this scratch was made a value it was scattered across \`ctx.state.drag\`
and consumed twice: mid-drag \`toolMove\` painted \`el.setAttribute("transform", translateLens.put(g.T,
g.text))\`, and on release it called \`writer.commit(g.idx, "transform", g.T, "", translateLens,
g.text)\` — the same \`(value, lens, source)\` triple applied by hand to two targets, in two places, in
every tool. A gesture's edit was never one thing, so there was nothing to state a law *about*.

The generalisation that fixes this is already in the literature the paper cites. Where a *state-based*
lens maps states to states, an **edit lens** ${cite("hofmann2012editlenses")} maps *edits* to edits
through a **complement** — a memory the translation is allowed to keep — and ${cite("johnson2016unifying")}
axiomatises it alongside the asymmetric **delta lens** of ${cite("diskin2011delta")}. The two frameworks
do two jobs here. The delta lens is the shape of the *writer*: the source is authoritative, the drawing
is derived. The edit lens is the shape of a *tool*, because what a tool has that a state-based lens
lacks is exactly a complement. The dictionary is one line — **the gesture scratch is the complement:**

| edit lens | svg-lens |
|---|---|
| ${tex`X,\ M_X`} | the cell source; the edits a command can make to it |
| ${tex`Y,\ M_Y`} | the rendered drawing; pointer deltas |
| ${tex`C`} | \`ctx.state.drag\` — the origin, the grabbed targets, the hit list, the snap boxes |
| ${tex`q : M_Y \times C \rightharpoonup M_X \times C`} | the tool |
| ${tex`K`} | "the DOM on screen is what this source renders to" |

Making the delta a value is the whole of the framework. A tool returns a \`gestureDelta\` — one of
\`attr\`, \`command\`, \`select\`, \`view\`, \`clip\` — and three functions consume it: \`previewDelta\`
paints the live DOM, \`commitDelta\` writes the source once, \`revertDelta\` throws the preview away.
One write path, so every law in ${ref("toollaws")} is stated about the delta and checked in one place
rather than re-proved per tool. It is also what lets the registry stay *open*: \`svgLens(node)\` uses
the default tools, \`svgLens(node, { tools: [toolVertex] })\` pins a vertex-only editor, and
\`svgLens(node, { tools: (d) => [myTool, ...d] })\` extends without restating the defaults — a test
runs one tool in isolation and a figure shows a reduced editor by the same mechanism.`
)};

const _sl281 = function _toollawsH(sec){return(sec("toollaws"))};

const _sl282 = function _toollawsP(md,tex,cite,ref){return(
md`Five laws come straight from the axioms ${cite("johnson2016unifying")}. The null gesture is the
sharpest, and the one about starting state is the one worth the whole exercise.

| | law | what it says here | what it caught |
|---|---|---|---|
| **T1** | ${tex`p(1,c)=(1,c)`} | a null gesture writes nothing *and* hands the scratch back untouched | a missed hit turning into a shape *creation*; the pen's first-anchor commit discarding its own scratch |
| **T2** | ${tex`p(mm',c)=(nn',c'')`} | translating a composite gesture equals composing the translations | float drift — a five-leg wander and a straight drag to the same point commit the same bytes |
| **T3** | ${tex`\mathrm{PutGet}`} | the gesture you made is the gesture the committed source shows | ghosting that "looked right until I reloaded" |
| **T4** | ${tex`\mathrm{PutInc}`} | a gesture commits against the state it *began* from | the gesture-outlives-its-node bug: a commit mints a new node, the captured target stops resolving, the next write lands on a stale document |
| **T5** | consistency | if the DOM agreed with the source before, it agrees after | makes T3's screen-level check a consequence, not a separate assertion |

T4 is the one that would not have been written down without the theory, and it names in advance a bug
that took a day to find. **Partiality is the formal content of "a tool must decline cleanly"**: the
action is partial, a gesture outside a lens's domain is undefined, so its translation must be too.
\`onPointerDown\` returning \`false\` is that law done right; a tool falling through to drop a shape on
an empty click is that law done wrong, which is why an empty-canvas tool gates on \`ctx.pick\` first.
A command declines the same way — its \`plan\` returns \`null\` — and an affordance chip greys out
exactly when its command declines.

Six more laws are ours, not the papers', and are stated separately so they are not cited as if they
were:

- **T6 Confinement.** A tool that returns \`false\` has changed nothing, and installing it cannot
  change what earlier tools do. Registry order is priority, so tool sets form a non-commutative monoid
  under concatenation. This is the law that makes a tool a *plugin* rather than a *patch* — it is what
  a third-party tool has to prove.
- **T7 Rebase agreement.** \`rebase(path, cmd)\` equals re-locating the same element after the command
  runs: operational transformation's TP1, one-sided.
- **T10 Hit agreement.** What hover outlines, what a press claims and what a double-click enters are
  three readings of *one* answer, \`ctx.pick\`, so they cannot drift apart. It also pins the group
  policy: a click takes the outermost unopened container, a double-click descends a level, Escape
  ascends.
- **T11 The view is not an edit.** Zoom, pan and fit write nothing and push nothing onto undo; and the
  same drag *in the drawing's own units* commits the same bytes at any zoom, because every measurement
  goes through \`ctx\` and \`getScreenCTM\` already carries the viewBox. With alignment snapping off —
  snapping is magnetism measured in *screen* pixels, the one deliberate screen-space affordance.

Three things that looked like special cases are textbook constructions with textbook laws: the **shape
registry is a family of prisms** (tag dispatch is a sum type; ${tex`\mathrm{preview} \circ \mathrm{review} = \mathrm{Just}`}
is what each \`rect\`/\`circle\`/\`path\` entry owes), **hit-testing is an affine** (a focus that may
fail, whose law is that a failed get makes put a no-op — T1 again), and **multi-selection is a
traversal** (so "set the fill on the selection" is traversal ∘ lens, and align, distribute and
group-edit come with it). All of them run live: \`test_gesture_*\` and \`gestureLaws\` check the laws
above over a random corpus of gestures, on the same \`forAll\` harness the lens laws in ${ref("laws")}
use.`
)};

const _sl157r = function _referencesList(references){return(
references
)};

const _sl229 = function _relatedH(sec){return(sec("related"))};

const _sl230 = function _relatedP(md,cite,ref){return(
md`**Bidirectional programming.** The lens formulation, the laws and the well-behaved / very
well-behaved distinction are Foster et al.'s ${cite("foster2007lenses")}, addressing the view-update
problem posed first for databases ${cite("bancilhon1981")}. ${cite("czarnecki2009bx")} survey how many
fields arrived at the same structure independently. What differs here is the source:
${cite("foster2007lenses")} lens trees and strings, this notebook lenses the executing function's own
text, so the residue that must survive is the author's formatting and \`put\` splices into bytes that
are also a running program.

**Sketch-n-Sketch.** The closest system ${cite("chugh2016")} ${cite("hempel2016")}
${cite("hempel2019")}: an SVG editor where you write a program, manipulate the output, and the system
updates the program. It is considerably more expressive, handling abstraction, loops and recursion via
trace-based provenance and later output-directed synthesis ${cite("hempel2019")}, and it can produce a
program the user never typed. Three differences, none a claim of superiority:

1. *Notation.* Sketch-n-Sketch programs are written in a language of its own — Little, an untyped
   lambda calculus, later the Elm-like Leo — whose values are translated to SVG for display. What is
   edited here is SVG: a W3C interchange format from 1999 with no notion of provenance, holes or
   bidirectionality, embedded verbatim in a JavaScript template literal. No part of the notation was
   designed to admit an update path, so the artifact stays one that other tools emit and a browser
   renders unaided.
2. *Scope.* Sketch-n-Sketch solves for changes anywhere in a program; this editor rewrites only slots
   whose provenance is syntactically evident and refuses the rest explicitly (${ref("sinks")}). The
   narrow scope is what makes the laws checkable, and it is forced by the first difference: without a
   language of its own there is no tracer, so provenance has to be syntactically evident or absent.
3. *Host.* Sketch-n-Sketch is an environment a program is opened in. This is a library called from a
   cell in a live notebook, so the editor is a value in the same dataflow graph as the drawing, and
   the program being edited is the one currently running (${ref("architecture")}).

**Lenses in practice.** Cambria applies lenses to schema evolution in local-first documents
${cite("litt2020cambria")}; edit lenses ${cite("hofmann2012editlenses")} shift the currency from
states to edits, which is the same instinct as our command layer, though we implement it concretely
as splices on child source strings (${ref("children")}).

**The host this depends on.** The editor relies on the system it runs in being *source-last*
${cite("larkworthy2026")}: Lopecode keeps no canonical saved file, treats the live runtime as the
source of truth, and recovers each cell's text on demand from \`Function.prototype.toString()\`. There
is no file on a server that the definition is a copy of, and no save step for an edit to fall out of.
Read the other way, this notebook is a test of that paper's claim that a plurality of editing surfaces
follows from runtime primacy: \`editor-5\` edits a cell as text, \`editable-md\` as prose, \`sticky\`
edits a literal by manipulation, and \`svgLens\` edits one as a drawing. None is privileged, and since
all four go through \`Variable.define\` (${ref("architecture")}), each one's edits are visible to the
others.

**Notebooks and liveness.** Liveness has a standard scale ${cite("tanimoto1990")}, but it measures
feedback from program to output; the quality at issue here is the reverse. ${cite("horowitz2023lrc")}
name persistence as what separates a rich widget from a programming system: interactions with a
rendered tool "cannot be 'saved' back to the notebook". This is one answer for one domain — the
widget's output *is* the cell, so there is nothing to save back. ${cite("edwards2019")} ask for costs
to be reported alongside benefits, which is what ${ref("future")} is for.`
)};


const _sl231 = function _futureH(sec){return(sec("future"))};

const _sl232 = function _futureP(md,ref,cite){return(
md`**The literal lens is not specific to SVG.** \`literalLens\` finds a tagged template in a cell's own
definition and lenses its text; everything above it is SVG-specific, everything below is not. The same
primitive points at markdown in an \`md\` cell, CSS in a \`css\` cell, or JSON in a data cell: a
click-to-edit prose editor and a colour picker that rewrites a stylesheet differ only in the
microsyntax layer. This is the generalization worth doing next.

**More sinks.** Today a hole either names a view or is refused. Two further sinks are visible from
here: writing through to a literal in *another* cell's source, which makes the lens target the
dataflow graph rather than one cell, and numerical inversion for holes feeding arithmetic — the
approximate solve \`@tomlarkworthy/manipulate\` already implements. Both would need the UI to keep
reporting which sink a handle is on, since the guarantees differ (${ref("sinks")}).

**Structure the domain refuses.** An interpolation in element position is out of scope, because
document-order indices would stop matching the DOM. Addressing children by identity rather than
position would lift the restriction, at the cost of putting ids into a drawing the author is writing.

**What it costs.** Reported in the manner ${cite("edwards2019")} argue for: the editor reaches only
drawings written literally; the parser is a deliberate subset of XML (no CDATA, no entity decoding, no
nested \`<svg>\`); PutPut holds only up to observation (${ref("residue")}); undo declines rather than
merging when another writer has touched the cell; each gesture commits once, so dragging a 200-element
selection is 200 puts; and since a commit recomputes the cell (${ref("architecture")}), anything
downstream of the drawing restarts on every gesture.`
)};

const _sl233 = function _referencesH(md){return(
md`## References`
)};

const _sl234 = function _appendixHeader(md) {return (md`---

## Appendix: the implementation

The tests come first because they are the specification: every law quoted above is a cell below, run on each load with a seeded generator,. After them, the implementation in dependency order — lens core, SVG microsyntax, source lenses, commands, then the editor.`);};

// ---- source-last: your edits live in the runtime, so take them with you --------------------------
// A counter over every put in the page. It exists to make the download link *reactive*: the label
// says how much of your own work the file you are about to download contains.
// The upstream sink writes a slider, and the runtime then recomputes the cell that draws the shape —
// which restarts every cell downstream of it, log widgets included. So the log lives here, in a cell
// nothing recomputes, and the widgets are pure renderings of it.
const _sl08f = function _putLog(){return(
[]
)};

const _sl08d = function _edits(Generators,putLog,$0,$1,invalidation){return(
Generators.observe((change) => {
  change(putLog.length);
  const bump = (source) => (e) => { putLog.push({ source, detail: e.detail }); change(putLog.length); };
  const offs = [[$0, bump("drawing")], [$1, bump("factory")]];
  for (const [node, fn] of offs) node.addEventListener("lens-put", fn);
  const off = () => { for (const [node, fn] of offs) node.removeEventListener("lens-put", fn); };
  invalidation.then(off);
  return off;
})
)};

const _sl08m = function _svgLensModule(thisModule){return(
thisModule()
)};
const _sl08mv = (G, _) => G.input(_);

const _sl08c = async function _keepYourEdits(htl,downloadAnchor,lookupVariable,svgLensModule,edits)
{
  // The drawing's definition is the drawing. Read it back out of the runtime to show what a download
  // would actually capture — not a file on a server, the bytes this page is holding right now.
  const v = await lookupVariable("viewof drawing", svgLensModule);
  const bytes = v && v._definition ? v._definition.toString().length : 0;
  const anchor = downloadAnchor(
    { style: "font:inherit;font-weight:600" },
    edits ? `Download this notebook with your ${edits} edit${edits === 1 ? "" : "s"} in it`
          : "Download this notebook"
  );
  return htl.html`<div style="padding:10px 14px;border-left:3px solid #4C7FD1;background:#4C7FD10F;margin:.6rem 0">
    ${anchor} — ${bytes} bytes of drawing source, read from the live runtime.
  </div>`;
};

// Every gesture on the drawing, with the laws re-checked on the source it produced. Reads the shared
// `putLog` (the "drawing" rows `edits` already records) rather than keeping a second live listener on
// the same node; `edits` is listed as an input purely to recompute when the buffer grows.
const _sl05 = function _putTable(putLog,edits,Inputs){return(
Inputs.table(putLog.filter((e) => e.source === "drawing").map((e) => e.detail).slice(-8).reverse(), {
  columns: ["target", "attribute", "before", "after", "GetPut", "PutGet"],
  format: { GetPut: (ok) => (ok ? "✅" : "❌"), PutGet: (ok) => (ok ? "✅" : "❌") },
  rows: 8, layout: "auto",
  width: { attribute: "8%", GetPut: "6%", PutGet: "6%" }
})
)};

const _sl09 = function _testsDashboard(tests){return(
tests({ filter: (t) => t.computed })
)};


// ================================================================================================
// LENS CORE
// ================================================================================================
const _sl20 = function _coreHeader(md){return(
md`## Lens core`
)};

// h3 sub-headers that break the implementation into its classes of function. Each is one heading and
// one sentence naming the class; they carry no logic. Placed in the reading order by their $def.
const _sl283 = function _hMatrices(md){return(
md`### Matrices and the CTM

Affine matrices as a flat \`[a,b,c,d,e,f]\`, their product, and the screen-to-user map (\`getScreenCTM\`) that every measurement is taken through.`
)};
const _sl284 = function _hTransforms(md){return(
md`### Transforms and the gizmo

The \`transform\` attribute as an editable list of operations — translate, rotate, scale — plus the gizmo that rotates or scales about a point held fixed.`
)};
const _sl285 = function _hInverse(md){return(
md`### Inverse, and reading a node

The determinant, the matrix inverse and its involution law (a screen delta sent back through an element's own frame), and the small accessors that read an attribute or child out of a parsed node.`
)};
const _sl286 = function _hPathData(md){return(
md`### Path data

The \`d\` attribute parsed into absolute commands and printed back — the lens the pen and vertex tools write a path through.`
)};
const _sl287 = function _hTokenizer(md){return(
md`### The document: tokenizer and tree

A forgiving scanner over the SVG text, the tree it builds, and \`nodeAt\` / \`pathOfIndex\` for addressing an element by a path that survives structural edits.`
)};
const _sl288 = function _hAttrLenses(md){return(
md`### Attributes, style, length, references

Reading and splicing a single attribute, the \`style=""\` and unit-bearing-number lenses, \`setProperty\` (which writes where the property already lives), and \`refsOf\` for the \`url(#id)\` a shape points at.`
)};
const _sl289 = function _hFields(md){return(
md`### The field registry

Paint and stroke properties as *data*, so the panel and the on-canvas chips read one list and adding a property is a line here, not a branch in a form.`
)};
const _sl290 = function _hStructural(md){return(
md`### The children lens, and structural edits

The list of an element's children as a lawful view, and the pure document-to-document commands built on it: insert, delete, reorder, group, ungroup, the copy/paste codec, and minting into \`defs\`.`
)};
const _sl291 = function _hPathGeometry(md){return(
md`### Path geometry

Segments, subdivision and anchor removal for polygons and paths, and the address rebasing that keeps a vertex selected across an edit that changes the command list.`
)};
const _sl292 = function _hHandles(md){return(
md`### Handles

The draggable points a selected polygon or path exposes — where the vertex tool grabs.`
)};
const _sl293 = function _hShapeRegistry(md){return(
md`### The shape registry

Per-tag geometry as data — what each shape reads, writes and offers as handles — so a new shape is an entry here rather than a branch in every tool.`
)};
const _sl294 = function _hPieces(md){return(
md`### Target, writer, overlay, focus

The four pieces \`svgLens\` wires: which variable this node is, the only code that assigns \`_definition\`, the handle layer, and which element is selected.`
)};
const _sl295 = function _hDelta(md){return(
md`### The delta framework

\`gestureDelta\` values and the three functions that consume them — \`previewDelta\` paints, \`commitDelta\` writes once, \`revertDelta\` discards — the one write path every tool goes through.`
)};
const _sl296 = function _hTools(md){return(
md`### Tools

Each tool claims a gesture through \`onPointerDown\`, previews in the live DOM, and hands a delta to the writer: move, vertex, transform, marquee, scope, the shape and pen tools, and scribble.`
)};
const _sl297 = function _hHarness(md){return(
md`### The gesture-law harness

A headless fixture that plays a recorded gesture and checks T1–T11 over a random corpus, plus the per-frame budget that catches a dropped selection or a scale flash.`
)};
const _sl298 = function _hCommands(md){return(
md`### Commands and affordances

Keyboard/menu commands whose \`plan\` returns a delta or declines, and the chips that surface those same commands on a selection — both writing through \`commitDelta\`.`
)};
const _sl299 = function _hAssembly(md){return(
md`### Assembly

\`svgLens\` itself: the state that outlives a remount, and the wiring that turns all of the above into an editor attached to one node.`
)};

const _sl21 = function _lens(){return(
(get, put) => ({ get, put })
)};

// Lens composition. If both lenses are lawful, the composite is lawful.
const _sl22 = function _compose(){return(
(outer, inner) => ({
  get: (s) => inner.get(outer.get(s)),
  put: (b, s) => outer.put(inner.put(b, outer.get(s)), s)
})
)};

// An isomorphism (put ignores the old source): laws from(to(s)) = s and to(from(a)) = a.
const _sl23 = function _isoToLens(lens){return(
(i) => lens(i.to, (a, _s) => i.from(a))
)};

// Law predicates, parameterised by equality on S and A.
const _sl24 = function _lensLaws(){return(
{
  getPut: (l, eqS) => (s) => eqS(l.put(l.get(s), s), s),
  putGet: (l, eqA) => (a, s) => eqA(l.get(l.put(a, s)), a),
  putPut: (l, eqS) => (a1, a2, s) => eqS(l.put(a2, l.put(a1, s)), l.put(a2, s))
}
)};

const _sl25 = function _isoLaws(){return(
{
  roundTripS: (i, eqS) => (s) => eqS(i.from(i.to(s)), s),
  roundTripA: (i, eqA) => (a) => eqA(i.to(i.from(a)), a)
}
)};

// ================================================================================================
// SVG LENSES — attribute microsyntax
// ================================================================================================
const _sl30 = function _svgHeader(md){return(
md`## SVG lenses

All printing uses \`String(n)\`, all parsing uses \`Number(s)\`. Lenses are total on their stated
domains and throw outside them (parseable strings, nodes carrying the focused attribute/child,
matrices with det ≠ 0, path data with separated numbers — no \`10-5\` abutment or compressed arc flags).`
)};

const _sl31 = function _parseNumList(){return(
(s) => {
  const trimmed = s.trim();
  if (trimmed === "") return [];
  return trimmed.split(/[\s,]+/).filter((p) => p !== "").map((p) => {
    const n = Number(p);
    if (Number.isNaN(n)) throw new Error(`invalid number: ${JSON.stringify(p)}`);
    return n;
  });
}
)};

const _sl32 = function _parseViewBox(parseNumList){return(
(s) => {
  const ns = parseNumList(s);
  if (ns.length !== 4) throw new Error(`viewBox needs 4 numbers, got ${ns.length}`);
  return { minX: ns[0], minY: ns[1], width: ns[2], height: ns[3] };
}
)};

const _sl33 = function _printViewBox(){return(
(r) => [r.minX, r.minY, r.width, r.height].map(String).join(" ")
)};

const _sl34 = function _rectEq(){return(
(r1, r2) => r1.minX === r2.minX && r1.minY === r2.minY && r1.width === r2.width && r1.height === r2.height
)};

// Lens<viewBox attribute string, Rect>. Domain: parseable viewBox strings.
const _sl35 = function _viewBoxLens(lens,parseViewBox,rectEq,printViewBox){return(
lens(parseViewBox, (r, s) => (rectEq(r, parseViewBox(s)) ? s : printViewBox(r)))
)};

const _sl36 = function _parsePoints(parseNumList){return(
(s) => {
  const ns = parseNumList(s);
  if (ns.length % 2 !== 0) throw new Error("points list needs an even count of numbers");
  const out = [];
  for (let i = 0; i < ns.length; i += 2) out.push([ns[i], ns[i + 1]]);
  return out;
}
)};

const _sl37 = function _printPoints(){return(
(ps) => ps.map(([x, y]) => `${String(x)},${String(y)}`).join(" ")
)};

const _sl38 = function _pointsEq(){return(
(a, b) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])
)};

// Lens<points attribute string, Point[]>. Domain: parseable points strings.
const _sl39 = function _pointsLens(lens,parsePoints,pointsEq,printPoints){return(
lens(parsePoints, (ps, s) => (pointsEq(ps, parsePoints(s)) ? s : printPoints(ps)))
)};

const _sl40 = function _IDENTITY(){return(
[1, 0, 0, 1, 0, 0]
)};

const _sl41 = function _matEq(){return(
(m, n) => m.every((v, i) => v === n[i])
)};

// multiply(m, n) applies n first, then m (matches SVG transform-list order).
// Matrix [a b c d e f] maps (x, y) -> (a*x + c*y + e, b*x + d*y + f).
const _sl42 = function _multiply(){return(
(m, n) => {
  const [a1, b1, c1, d1, e1, f1] = m;
  const [a2, b2, c2, d2, e2, f2] = n;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ];
}
)};

// Apply an affine matrix to a point: the same [a b c d e f] convention the transform lens parses.
const _sl43 = function _applyPoint(){return(
(m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
)};

// A DOM CTM as a plain Mat. getScreenCTM may return a legacy SVGMatrix (no DOMMatrix methods),
// so read the six components and use this module's own algebra from there.
const _sl44 = function _ctmMat(){return(
(ctm) => [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f]
)};

const _sl45 = function _opToMat(multiply)
{
  const DEG = Math.PI / 180;
  return (name, args) => {
    switch (name) {
      case "matrix":
        if (args.length !== 6) throw new Error("matrix needs 6 args");
        return args;
      case "translate": {
        if (args.length < 1 || args.length > 2) throw new Error("translate needs 1-2 args");
        const [tx, ty = 0] = args;
        return [1, 0, 0, 1, tx, ty];
      }
      case "scale": {
        if (args.length < 1 || args.length > 2) throw new Error("scale needs 1-2 args");
        const [sx, sy = args[0]] = args;
        return [sx, 0, 0, sy, 0, 0];
      }
      case "rotate": {
        if (args.length !== 1 && args.length !== 3) throw new Error("rotate needs 1 or 3 args");
        const [deg, cx = 0, cy = 0] = args;
        const cos = Math.cos(deg * DEG);
        const sin = Math.sin(deg * DEG);
        const r = [cos, sin, -sin, cos, 0, 0];
        if (args.length === 1) return r;
        return multiply(multiply([1, 0, 0, 1, cx, cy], r), [1, 0, 0, 1, -cx, -cy]);
      }
      case "skewX":
        if (args.length !== 1) throw new Error("skewX needs 1 arg");
        return [1, 0, Math.tan(args[0] * DEG), 1, 0, 0];
      case "skewY":
        if (args.length !== 1) throw new Error("skewY needs 1 arg");
        return [1, Math.tan(args[0] * DEG), 0, 1, 0, 0];
      default:
        throw new Error(`unknown transform op: ${name}`);
    }
  };
};

// Parse an SVG transform list into a single composed matrix.
const _sl46 = function _parseTransform(IDENTITY,multiply,opToMat,parseNumList){return(
(s) => {
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let m = IDENTITY;
  let match;
  while ((match = re.exec(s)) !== null) {
    m = multiply(m, opToMat(match[1], parseNumList(match[2])));
  }
  // Everything outside the matched ops must be separators only.
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "") throw new Error(`unparseable transform: ${JSON.stringify(s)}`);
  return m;
}
)};

const _sl47 = function _printTransform(){return(
(m) => `matrix(${m.map(String).join(" ")})`
)};

// Lens<transform attribute string, Mat>. put keeps the original decomposition (e.g.
// "rotate(45) scale(2)") whenever the matrix is unchanged; otherwise writes matrix(...).
const _sl48 = function _transformLens(lens,parseTransform,matEq,printTransform){return(
lens(parseTransform, (m, s) => (matEq(m, parseTransform(s)) ? s : printTransform(m)))
)};

// The transform list with byte spans, so an edit can keep the author's decomposition.
const _sl48b = function _parseTransformOps(parseNumList){return(
(s) => {
  const re = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  const ops = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const argStart = m.index + m[0].indexOf("(") + 1;
    ops.push({ name: m[1], args: parseNumList(m[2]), start: m.index, end: re.lastIndex,
               argStart, argEnd: re.lastIndex - 1 });
  }
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "") throw new Error(`unparseable transform: ${JSON.stringify(s)}`);
  return ops;
}
)};

// Lens<transform attribute string, [tx, ty]> focusing the leading translate.
//
// A drag is a translation, and the matrix view would flatten `translate(228 128) rotate(-4)` into
// six raw floats. This one edits the numbers in place instead — or prefixes a translate when there
// is none — so the author's decomposition (and everything downstream of it) survives being dragged.
const _sl48c = function _translateLens(lens,parseTransformOps){return(
lens(
  (s) => {
    const ops = parseTransformOps(s);
    return ops.length && ops[0].name === "translate" ? [ops[0].args[0], ops[0].args[1] === undefined ? 0 : ops[0].args[1]] : [0, 0];
  },
  ([tx, ty], s) => {
    const ops = parseTransformOps(s);
    const lead = ops.length && ops[0].name === "translate";
    const cur = lead ? [ops[0].args[0], ops[0].args[1] === undefined ? 0 : ops[0].args[1]] : [0, 0];
    if (cur[0] === tx && cur[1] === ty) return s;         // skip rule: unchanged view, unchanged text
    const text = `${String(tx)} ${String(ty)}`;
    if (lead) return s.slice(0, ops[0].argStart) + text + s.slice(ops[0].argEnd);
    const rest = s.trim();
    return `translate(${text})` + (rest ? " " + rest : "");
  }
)
)};

const _sl48d = function _printOp(){return(
(op) => `${op.name}(${op.args.map(String).join(" ")})`
)};

// Lens<transform attribute, op list>. The op list is the honest view of a transform: a matrix throws
// away the fact that the author wrote `translate(228 128) rotate(-4)`. Ops that did not change keep
// their exact source slice, so editing the rotation leaves the translation's spelling alone.
//
// Same lawfulness as childrenLens: GetPut and PutGet strict, PutPut up to get-equivalence.
const _sl48e = function _opsLens(lens,parseTransformOps,printOp){return(
lens(
  (s) => parseTransformOps(s).map((o) => ({ name: o.name, args: o.args.slice() })),
  (ops, s) => {
    const cur = parseTransformOps(s);
    const same = (a, b) => a && b && a.name === b.name && a.args.length === b.args.length &&
                           a.args.every((v, i) => v === b.args[i]);
    if (ops.length === cur.length && ops.every((o, i) => same(o, cur[i]))) return s;   // skip rule
    return ops.map((o, i) => (same(o, cur[i]) ? s.slice(cur[i].start, cur[i].end) : printOp(o))).join(" ");
  }
)
)};

// Where a gizmo op belongs: the last op of that name, or the tail if there is none. Reusing the
// author's own op wherever it sits is what keeps a hundred drags from growing a hundred ops — and it
// is safe because setGizmoOp expresses the centre in that op's own input space and holdFixed corrects
// whatever the substitution moved. A first edit may prepend one translate; nothing grows after that.
const _sl48f = function _opSlot(){return(
(ops, name) => {
  for (let i = ops.length - 1; i >= 0; i--) if (ops[i].name === name) return i;
  return ops.length;
}
)};

// Correct the leading translate so a point of the element's own geometry lands exactly where it did
// before the edit. Measured against the composed matrices rather than derived for one particular op
// order, so it holds for whatever transform list the author happened to write — and the leading
// translate is the outermost op, so a correction there lands directly in the parent's space.
//
// Both gizmo gestures need this, not just scaling: replacing a `rotate(82)` that was rotating about
// the origin with one about the box centre moves the shape, and without the correction it jumps the
// instant you grab the handle.
const _sl48j = function _holdFixed(parseTransform,applyPoint,printOp){return(
(before, after, px, py) => {
  const was = applyPoint(parseTransform(before.map(printOp).join(" ")), px, py);
  const now = applyPoint(parseTransform(after.map(printOp).join(" ")), px, py);
  if (!Number.isFinite(was[0]) || !Number.isFinite(now[0])) return after;
  const dx = was[0] - now[0], dy = was[1] - now[1];
  const lead = after.length && after[0].name === "translate" ? after[0] : null;
  if (!lead && dx === 0 && dy === 0) return after;      // nothing moved: no translate(0 0) noise
  const base = lead ? [lead.args[0], lead.args[1] === undefined ? 0 : lead.args[1]] : [0, 0];
  const fixed = { name: "translate", args: [base[0] + dx, base[1] + dy] };
  return lead ? [fixed, ...after.slice(1)] : [fixed, ...after];
}
)};

// Set one op at the tail. The centre or pivot is given in the element's own geometry, which is NOT
// the space that op receives if anything sits to its right — a transform list applies right to left —
// so it is pushed through the ops that apply first.
const _sl48k = function _setGizmoOp(opSlot,opToMat,multiply,applyPoint,IDENTITY){return(
(ops, name, args, cx, cy) => {
  const i = opSlot(ops, name);
  const inner = ops.slice(i + 1).reduce((m, o) => multiply(m, opToMat(o.name, o.args)), IDENTITY);
  const c = applyPoint(inner, cx, cy);
  const next = ops.map((o) => ({ name: o.name, args: o.args.slice() }));
  const op = { name, args: name === "rotate" ? [args[0], c[0], c[1]] : args };
  if (i < ops.length) next[i] = op; else next.push(op);
  return next;
}
)};

const _sl48h = function _rotateAbout(setGizmoOp,holdFixed){return(
(ops, angle, cx, cy) => holdFixed(ops, setGizmoOp(ops, "rotate", [angle], cx, cy), cx, cy)
)};

const _sl48i = function _scaleAbout(setGizmoOp,holdFixed){return(
(ops, sx, sy, px, py) => holdFixed(ops, setGizmoOp(ops, "scale", [sx, sy], px, py), px, py)
)};

// Handles for the bounding box: four corners to scale by, one stalk to rotate by. Pure — the caller
// supplies the box, which is the element's own untransformed geometry.
// Rotation is the one thing no geometry attribute can express, so a shape entry that writes its own
// geometry still borrows this stalk (`rotatable`) and lets `toolTransform` own the angle.
const _sl48m = function _rotateHandle(){return(
(b) => {
  const stalk = Math.max(b.width, b.height) * 0.18 + 8;
  const cx = b.x + b.width / 2;
  return { key: "rot", kind: "rotate", x: cx, y: b.y - stalk, link: [cx, b.y] };
}
)};

const _sl48g = function _transformHandles(rotateHandle){return(
(b) => [
  { key: "nw", kind: "scale", x: b.x, y: b.y },
  { key: "ne", kind: "scale", x: b.x + b.width, y: b.y },
  { key: "se", kind: "scale", x: b.x + b.width, y: b.y + b.height },
  { key: "sw", kind: "scale", x: b.x, y: b.y + b.height },
  rotateHandle(b)
]
)};

const _sl49 = function _det(){return(
(m) => m[0] * m[3] - m[1] * m[2]
)};

const _sl50 = function _invert(det){return(
(m) => {
  const d = det(m);
  if (d === 0 || !Number.isFinite(d)) throw new Error("matrix is not invertible");
  const [a, b, c, dd, e, f] = m;
  return [dd / d, -b / d, -c / d, a / d, (c * f - dd * e) / d, (b * e - a * f) / d];
}
)};

// Inversion as an involutive Iso on invertible matrices. Round-trip is exact only up to
// floating-point error (division does not round-trip), so its law tests use an epsilon.
const _sl51 = function _invertIso(invert){return(
{ to: invert, from: invert }
)};

const _sl52 = function _matApproxEq(){return(
(m, n, eps = 1e-9) => m.every((v, i) => {
  const scale = Math.max(1, Math.abs(v), Math.abs(n[i]));
  return Math.abs(v - n[i]) <= eps * scale;
})
)};

const _sl53 = function _nodeEq(){return(
function nodeEq(a, b) {
  if (a.tag !== b.tag) return false;
  const ka = Object.keys(a.attrs);
  const kb = Object.keys(b.attrs);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a.attrs[k] !== b.attrs[k]) return false;
  if (a.children.length !== b.children.length) return false;
  return a.children.every((c, i) => nodeEq(c, b.children[i]));
}
)};

// Lens<SvgNode, string | null>: focus an attribute; null means absent.
const _sl54 = function _attr(lens){return(
(name) => lens(
  (s) => (name in s.attrs ? s.attrs[name] : null),
  (v, s) => {
    const attrs = { ...s.attrs };
    if (v === null) delete attrs[name];
    else attrs[name] = v;
    return { ...s, attrs };
  }
)
)};

// Lens<SvgNode, string>: like attr, but the domain is nodes that have it.
const _sl55 = function _requiredAttr(lens){return(
(name) => lens(
  (s) => {
    if (!(name in s.attrs)) throw new Error(`missing attribute ${name}`);
    return s.attrs[name];
  },
  (v, s) => ({ ...s, attrs: { ...s.attrs, [name]: v } })
)
)};

// Lens<SvgNode, SvgNode>: focus child i. Domain: nodes with > i children.
const _sl56 = function _child(lens){return(
(i) => lens(
  (s) => {
    if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
    return s.children[i];
  },
  (c, s) => {
    if (i < 0 || i >= s.children.length) throw new Error(`no child ${i}`);
    const children = s.children.slice();
    children[i] = c;
    return { ...s, children };
  }
)
)};

const _sl57 = function _PATH_ARG_COUNT(){return(
{ M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }
)};

const _sl58 = function _pathEq(){return(
(p, q) => p.length === q.length &&
  p.every((c, i) => c.c === q[i].c && c.a.length === q[i].a.length && c.a.every((v, j) => v === q[i].a[j]))
)};

// The view preserves command letters (incl. relative/absolute case) and raw numbers, so PutGet is exact.
const _sl59 = function _parsePath(parseNumList,PATH_ARG_COUNT){return(
(s) => {
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  const cmds = [];
  let match;
  while ((match = re.exec(s)) !== null) {
    const c = match[1];
    const a = parseNumList(match[2]);
    const unit = PATH_ARG_COUNT[c.toUpperCase()];
    if (unit === 0) {
      if (a.length !== 0) throw new Error("Z takes no arguments");
    } else if (a.length === 0 || a.length % unit !== 0) {
      throw new Error(`${c} needs a positive multiple of ${unit} args, got ${a.length}`);
    }
    cmds.push({ c, a });
  }
  if (s.replace(re, "").replace(/[\s,]/g, "") !== "")
    throw new Error(`unparseable path data: ${JSON.stringify(s)}`);
  return cmds;
}
)};

const _sl60 = function _printPath(){return(
(cmds) => cmds.map(({ c, a }) => (a.length ? `${c} ${a.map(String).join(" ")}` : c)).join(" ")
)};

// Lens<d attribute string, PathCmd[]>. Domain: parseable path data.
const _sl61 = function _pathLens(lens,parsePath,pathEq,printPath){return(
lens(parsePath, (p, s) => (pathEq(p, parsePath(s)) ? s : printPath(p)))
)};

// ================================================================================================
// SOURCE LENSES — the cell's own definition text as the source
// ================================================================================================
const _sl70 = function _sourceHeader(md){return(
md`## Source lenses

Everything above focuses *inside* an attribute. These focus *outward*, until the source is the
JavaScript of the cell itself:

| Lens | Source | View |
|---|---|---|
| \`literalLens(alias)\` | a cell definition's source text | the template literal inside its \`alias(…)\` call |
| \`attrTextLens(i, name, dflt)\` | SVG document text | element \`i\`'s attribute string (\`dflt\` when absent) |
| \`cellAttrLens(alias, i, name, dflt)\` | cell source | that attribute, addressed from the cell |

\`literalLens\` locates the literal by parsing the definition with acorn and taking byte offsets — the
same technique \`@tomlarkworthy/sticky\` uses for its persistence slot. Its domain is definitions
containing one \`alias(…)\` call whose argument is a template literal with no \`\${}\` interpolations,
and views that contain no backtick, backslash or \`\${\` (they would not survive re-parsing).

Composing outward from a typed view gives a lens from **cell source** straight to **matrix**:

\`\`\`js
compose(cellAttrLens("svgLens", 4, "transform", "matrix(1 0 0 1 0 0)"), transformLens)
\`\`\`

That composite is what a drag commits, and \`test_cellSourceLens_laws\` checks its laws.`
)};

// Byte span of the template literal's contents inside a cell definition's source.
const _sl71 = function _literalSpan(acorn)
{
  const find = (node, pred) => {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const n of node) { const r = find(n, pred); if (r) return r; }
      return null;
    }
    if (typeof node.type === "string" && pred(node)) return node;
    for (const k in node) {
      if (k === "type" || k === "start" || k === "end") continue;
      const r = find(node[k], pred);
      if (r) return r;
    }
    return null;
  };
  return (src, alias = null) => {
    const root = acorn.parseExpressionAt(src, 0, { ecmaVersion: "latest" });
    const scope = alias
      ? find(root, (n) => n.type === "CallExpression" && n.callee && n.callee.name === alias)
      : root;
    if (!scope) throw new Error(`no call to ${alias} in the definition`);
    const lit = find(scope.arguments || scope, (n) => n.type === "TemplateLiteral");
    if (!lit) throw new Error("no template literal in the call");
    // Interpolations are allowed: the body is returned verbatim, holes and all, and the slot model
    // (`slotsOf`) decides per attribute what a gesture may write. A hole in *element* position —
    // `${shapes.map(…)}` between tags — is a different matter: it can render any number of elements,
    // so document-order indices would not line up with the DOM. Refused, loudly.
    const body = [lit.start + 1, lit.end - 1];
    for (const e of lit.expressions) {
      const before = src.slice(body[0], e.start);
      const open = before.lastIndexOf("<"), close = before.lastIndexOf(">");
      if (open <= close) throw new Error("interpolation outside an attribute value — element positions would not line up");
    }
    return body;
  };
};

// ---- interpolation: an attribute value that is partly source and partly a hole -------------------
// `transform="translate(${x} 10)"` has two numeric slots: one belongs to the expression `x`, one is
// literal text. A gesture may write the literal one; the other is not this cell's to change. The
// model is per *slot*, not per attribute, so a mixed value is still half editable.
const _sl71b = function _holeSpans(){return(
(text) => {
  const out = [];
  for (let i = 0; (i = text.indexOf("${", i)) !== -1;) {
    let depth = 1, j = i + 2;
    for (; j < text.length && depth; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
    }
    if (depth) break;                                    // unterminated: not a hole, just text
    out.push({ start: i, end: j, text: text.slice(i, j) });
    i = j;
  }
  return out;
}
)};

// The numeric slots of an attribute value, in order: each is either a hole or a literal number.
// Numbers *inside* a hole are part of the expression, not slots, so hole interiors are skipped.
const _sl71c = function _slotsOf(holeSpans){return(
(text) => {
  const holes = holeSpans(text);
  const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  const out = [];
  let at = 0;
  for (const h of holes.concat([{ start: text.length, end: text.length, text: "" }])) {
    NUM.lastIndex = 0;
    const seg = text.slice(at, h.start);
    for (let m; (m = NUM.exec(seg));)
      out.push({ kind: "num", start: at + m.index, end: at + m.index + m[0].length, text: m[0] });
    if (h.text) out.push({ kind: "hole", start: h.start, end: h.end, text: h.text });
    at = h.end;
  }
  return out.sort((a, b) => a.start - b.start);
}
)};

// Write a gesture's result back into an interpolated attribute. The lens works on the *rendered*
// value (what the DOM shows, all numbers); this maps that result onto the source's slots: literal
// slots take the new number, hole slots keep their expression — and if the gesture wanted to move a
// hole, that slot is reported locked rather than silently dropped or silently overwritten.
const _sl71d = function _mergeInterpolated(slotsOf){return(
(srcText, rendered, nextRendered) => {
  const NUM = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  const nums = (s) => s.match(NUM) || [];
  const slots = slotsOf(srcText);
  const was = nums(rendered), now = nums(nextRendered);
  if (slots.length !== was.length || was.length !== now.length)
    return { text: srcText, locked: [], reason: "the rendered value has a different shape from the source" };
  let out = "", at = 0;
  const locked = [];
  slots.forEach((slot, i) => {
    out += srcText.slice(at, slot.start);
    if (slot.kind === "hole") {
      out += slot.text;                                  // never rewritten from here
      if (Number(now[i]) !== Number(was[i])) locked.push(i);
    } else out += now[i];
    at = slot.end;
  });
  return { text: out + srcText.slice(at), locked, reason: null };
}
)};

// Text that cannot survive being written back into a template literal. The rule is relative to the
// bytes being replaced: an interpolation the author already wrote may come back verbatim (that is
// how an edit to an interpolated drawing preserves its holes), but no *new* one may appear, and
// outside the holes there may be no backtick, backslash or `${` at all.
const _sl72 = function _literalSafe(holeSpans){return(
(t, was = null) => {
  const holes = holeSpans(t);
  if (holes.length) {
    if (was === null) return false;
    const had = holeSpans(was).map((h) => h.text);
    for (const h of holes) {
      const i = had.indexOf(h.text);
      if (i === -1) return false;                        // an expression that was not there before
      had.splice(i, 1);
    }
  }
  let at = 0, rest = "";
  for (const h of holes) { rest += t.slice(at, h.start); at = h.end; }
  rest += t.slice(at);
  return !/[`\\]/.test(rest) && !rest.includes("${");
}
)};

// Lens<cell definition source, template literal contents>.
const _sl73 = function _literalLens(lens,literalSpan,literalSafe){return(
(alias) => lens(
  (s) => { const [a, b] = literalSpan(s, alias); return s.slice(a, b); },
  (t, s) => {
    const [a, b] = literalSpan(s, alias);
    if (t === s.slice(a, b)) return s;
    if (!literalSafe(t, s.slice(a, b))) throw new Error("text would not survive the template literal");
    return s.slice(0, a) + t + s.slice(b);
  }
)
)};

// Elements with attribute byte spans, in document order (comments/closers/prolog skipped).
// Token stream over SVG source text: open/close tags, comments, text. Every token carries its byte
// span, so everything above this line can splice rather than reprint. Not an XML parser — no CDATA,
// no entity handling, and attribute values may not contain their own quote character.
const _sl74a = function _scan(){return(
(src) => {
  const out = [];
  let i = 0, at = 0;
  const text = (to) => { if (to > at) out.push({ kind: "text", start: at, end: to }); };
  while ((i = src.indexOf("<", i)) !== -1) {
    if (src.startsWith("<!--", i)) {
      const e = src.indexOf("-->", i), end = e === -1 ? src.length : e + 3;
      text(i); out.push({ kind: "comment", start: i, end }); at = i = end; continue;
    }
    if (src[i + 1] === "/") {
      const e = src.indexOf(">", i), end = e === -1 ? src.length : e + 1;
      const m = /^<\/\s*([a-zA-Z][\w:-]*)/.exec(src.slice(i));
      text(i); out.push({ kind: "close", tag: m ? m[1] : "", start: i, end }); at = i = end; continue;
    }
    if (src[i + 1] === "?" || src[i + 1] === "!") {
      const e = src.indexOf(">", i), end = e === -1 ? src.length : e + 1;
      text(i); out.push({ kind: "other", start: i, end }); at = i = end; continue;
    }
    const m = /^<([a-zA-Z][\w:-]*)/.exec(src.slice(i));
    if (!m) { i++; continue; }
    let j = i + m[0].length;
    const attrs = {};
    while (j < src.length) {
      while (j < src.length && /\s/.test(src[j])) j++;
      if (j >= src.length || src[j] === ">" || (src[j] === "/" && src[j + 1] === ">")) break;
      const am = /^([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(src.slice(j));
      if (am) {
        const vs = j + am[0].length - am[2].length + 1, ve = j + am[0].length - 1;
        attrs[am[1]] = { start: vs, end: ve, value: am[3] !== undefined ? am[3] : am[4] };
        j += am[0].length;
      } else {
        const bm = /^[\w:-]+/.exec(src.slice(j));
        j += bm ? bm[0].length : 1;
      }
    }
    const selfClosing = src[j] === "/";
    const end = j + (selfClosing ? 2 : 1);
    text(i);
    out.push({ kind: "open", tag: m[1], attrs, insertPos: j, start: i, end, selfClosing });
    at = i = end;
  }
  text(src.length);
  return out;
}
)};

// Elements in document order — the flat addressing `attrTextLens` uses.
const _sl74 = function _tokenize(scan,outsideDomain){return(
(src) => {
  const bad = outsideDomain(src);
  if (bad) throw new Error(`outside the svg-lens domain — ${bad}`);
  return scan(src).filter((t) => t.kind === "open");
}
)};

// The same tokens nested into a tree with spans. `innerStart`/`innerEnd` bound the children region,
// which is what a structural edit splices; `index` is the flat document-order index, so a path and
// an index address the same element.
// `scan` is a tokenizer, not an XML parser, and a wrong span splices the wrong bytes — a silent,
// destructive failure. So state the domain and fail loudly at its edge instead of guessing.
// Outside it: CDATA and raw-text elements (their contents may hold `<`, `>` or a stray `</`), and
// DOCTYPEs with an internal subset (`>` inside `[…]`). Inside it, and deliberately so: entity
// references, which are left as the bytes the author wrote — this editor rewrites source, and
// decoding `&amp;` on the way in would mean re-encoding it on the way out.
const _sl74e = function _outsideDomain(scan){return(
(src) => {
  const RAW = { script: 1, style: 1, foreignobject: 1 };
  const why = (what, at) =>
    `${what} at offset ${at}: its contents are not element markup, so byte spans would be wrong`;
  // Over tokens, not over the raw text: a script tag written inside a comment is a comment, and
  // saying otherwise would refuse documents this editor handles perfectly well.
  for (const t of scan(src)) {
    if (t.kind === "open" && RAW[t.tag.toLowerCase()]) return why(`a <${t.tag}> element`, t.start);
    if (t.kind === "other") {
      const s = src.slice(t.start, t.end);
      if (s.startsWith("<![CDATA[")) return why("a CDATA section", t.start);
      if (/^<!DOCTYPE/i.test(s) && s.includes("[")) return why("a DOCTYPE with an internal subset", t.start);
    }
  }
  return null;
}
)};

const _sl74b = function _parseDoc(scan,outsideDomain){return(
(src) => {
  const bad = outsideDomain(src);
  if (bad) throw new Error(`outside the svg-lens domain — ${bad}`);
  const root = { tag: null, attrs: {}, start: 0, end: src.length, innerStart: 0, innerEnd: src.length, index: -1, path: [], children: [] };
  const stack = [root];
  let index = 0;
  for (const t of scan(src)) {
    if (t.kind === "open") {
      const top = stack[stack.length - 1];
      const n = { tag: t.tag, attrs: t.attrs, start: t.start, openEnd: t.end, innerStart: t.end,
                  innerEnd: null, end: null, selfClosing: t.selfClosing, index: index++,
                  path: [...top.path, top.children.length], children: [] };
      top.children.push(n);
      if (t.selfClosing) { n.innerEnd = t.end; n.end = t.end; } else stack.push(n);
    } else if (t.kind === "close") {
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === t.tag) { stack[k].innerEnd = t.start; stack[k].end = t.end; stack.length = k; break; }
      }
    }
  }
  while (stack.length > 1) { const n = stack.pop(); n.innerEnd = src.length; n.end = src.length; }
  return root;
}
)};

// Address an element by path (`[]` is the synthetic document root, `[0]` the outermost <svg>).
const _sl74c = function _nodeAt(parseDoc){return(
(src, path) => {
  let n = parseDoc(src);
  for (const k of path) { n = n.children[k]; if (!n) throw new Error(`no element at path ${path.join("/")}`); }
  return n;
}
)};

// Flat index -> path. Positional addressing is not stable across structural edits (see
// knowledge/svg-editor-architecture.md §2.2); converting early keeps a gesture on one element.
const _sl74d = function _pathOfIndex(parseDoc){return(
(src, idx) => {
  const walk = (n) => {
    if (n.index === idx) return n.path;
    for (const c of n.children) { const p = walk(c); if (p) return p; }
    return null;
  };
  const p = walk(parseDoc(src));
  if (!p) throw new Error(`no element ${idx}`);
  return p;
}
)};

const _sl75 = function _attrVal(tokenize){return(
(src, idx, name) => {
  const el = tokenize(src)[idx];
  if (!el) throw new Error(`no element ${idx}`);
  return el.attrs[name] ? el.attrs[name].value : null;
}
)};

// What a gesture can measure. Writing goes to the source, but reading cannot: `translate(${shift} 0)`
// is not a pair of numbers, and the drawing on screen is. When the source token holds an
// interpolation the live element's rendered attribute is the honest current value; the writer still
// decides, slot by slot, which parts of it may be written back.
const _sl75a = function _effectiveAttr(attrVal,holeSpans){return(
(elems, src, idx, name) => {
  const v = attrVal(src, idx, name);
  if (v === null || !holeSpans(v).length) return v;
  const el = elems[idx];
  const r = el && el.getAttribute && el.getAttribute(name);
  return r === null || r === undefined ? v : r;
}
)};

// Splice one attribute value; returns {src, span} so a caller can highlight the changed bytes.
const _sl76 = function _spliceAttr(tokenize){return(
(src, idx, name, newVal) => {
  const el = tokenize(src)[idx];
  if (!el) throw new Error(`no element ${idx}`);
  const a = el.attrs[name];
  if (a) {
    if (a.value === newVal) return { src, span: null };
    return { src: src.slice(0, a.start) + newVal + src.slice(a.end), span: [a.start, a.start + newVal.length] };
  }
  const ins = " " + name + '="' + newVal + '"';
  return { src: src.slice(0, el.insertPos) + ins + src.slice(el.insertPos), span: [el.insertPos, el.insertPos + ins.length] };
}
)};

// Lens<SVG document text, attribute string>. `dflt` stands in for an absent attribute, so a
// transform can be read (and first written) on an element that has none.
const _sl77 = function _attrTextLens(lens,attrVal,spliceAttr){return(
(idx, name, dflt = null) => lens(
  (s) => { const v = attrVal(s, idx, name); return v === null ? dflt : v; },
  (v, s) => {
    const cur = attrVal(s, idx, name);
    if (v === (cur === null ? dflt : cur)) return s;   // skip rule: unchanged view, unchanged source
    return spliceAttr(s, idx, name, v).src;
  }
)
)};

// Lens<cell definition source, attribute string>: the whole way out.
// ---- references: url(#id), href="#id" ------------------------------------------------------------
// A gradient, marker, clipPath or <use> points somewhere else in the document. Editing the *referrer*
// is usually not what you meant — you want the thing it names — so give selection a way to follow it.
// Only same-document references: an external one is not this cell's source, so it is out of scope.
const _sl74f = function _pathOfId(parseDoc){return(
(src, id) => {
  let found = null;
  const walk = (n) => {
    if (found) return;
    if (n.attrs && n.attrs.id && n.attrs.id.value === id) { found = n.path; return; }
    n.children.forEach(walk);
  };
  walk(parseDoc(src));
  return found;
}
)};

const _sl74g = function _refsOf(parseDoc,nodeAt,pathOfId){return(
(src, path) => {
  const n = nodeAt(src, path);
  const out = [];
  for (const name of Object.keys(n.attrs)) {
    const v = n.attrs[name].value;
    // A funcIRI (`url(#id)`) is a reference in any attribute; a bare `#id` fragment only in an href —
    // `<use href="#id">` and kin. Everywhere else a leading `#` is a hex colour, not a reference.
    const isHref = name === "href" || /(^|:)href$/.test(name);
    const m = /^\s*url\(\s*#([^)\s]+)\s*\)\s*$/.exec(v) || (isHref ? /^\s*#([^\s]+)\s*$/.exec(v) : null);
    if (!m) continue;
    out.push({ attribute: name, id: m[1], path: pathOfId(src, m[1]) });
  }
  return out;
}
)};

// ---- lengths: numbers that carry a unit ----------------------------------------------------------
// `x="12px"` and `width="50%"` are ordinary SVG. A gesture wants to move a *number*, so the unit is
// residue: `lengthLens` views the number and puts it back wearing whatever unit was already there.
// That keeps a percentage a percentage instead of quietly turning it into user units.
const _sl31b = function _parseLength(){return(
(s) => {
  const m = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(px|pt|pc|cm|mm|in|em|ex|ch|rem|vw|vh|%)?\s*$/.exec(s);
  if (!m) throw new Error(`not a length: ${JSON.stringify(s)}`);
  return { n: Number(m[1]), unit: m[2] || "" };
}
)};

const _sl31c = function _printLength(){return(
({ n, unit }) => `${n}${unit || ""}`
)};

const _sl31d = function _lengthLens(lens,parseLength,printLength){return(
lens(
  (s) => parseLength(s).n,
  (n, s) => {
    const { n: was, unit } = parseLength(s);
    return n === was ? s : printLength({ n, unit });     // skip rule: keep the author's spelling
  }
)
)};

// ---- style="": the other place an SVG property can live ------------------------------------------
// The view is the declaration list, in order, as [property, value] pairs — source substrings would
// buy nothing here since values have no interesting inner structure to preserve. Unknown text
// (comments, empty declarations) is dropped by `get`, so PutPut holds only up to get-equivalence,
// exactly as for `childrenLens`; the skip rule keeps the original text whenever nothing changed.
const _sl31e = function _parseStyle(){return(
(s) => s.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
  const at = d.indexOf(":");
  if (at === -1) throw new Error(`not a declaration: ${JSON.stringify(d)}`);
  return [d.slice(0, at).trim(), d.slice(at + 1).trim()];
})
)};

const _sl31f = function _printStyle(){return(
(decls) => decls.map(([k, v]) => `${k}: ${v}`).join("; ")
)};

const _sl31g = function _styleLens(lens,parseStyle,printStyle){return(
lens(parseStyle, (decls, s) => {
  const was = parseStyle(s);
  const same = was.length === decls.length && was.every(([k, v], i) => k === decls[i][0] && v === decls[i][1]);
  return same ? s : printStyle(decls);
})
)};

// Set one property where it already lives. A shape styled through `style="fill: red"` must not end
// up with a `fill` attribute as well — the attribute would lose to the declaration and the drawing
// would not change, which is the worst kind of edit: it looks like it worked.
const _sl31h = function _setProperty(attrVal,styleLens){return(
(doc, idx, prop, value) => {
  const style = attrVal(doc, idx, "style");
  if (style !== null && styleLens.get(style).some(([k]) => k === prop))
    return { name: "style", value: styleLens.put(styleLens.get(style).map(([k, v]) => (k === prop ? [k, value] : [k, v])), style) };
  return { name: prop, value };                          // no declaration to update: the attribute it is
}
)};

// S6/G46. The field registry: paint and stroke properties as *data*, so a panel that shows the fields
// of the current selection and a chip that offers one on the canvas read the same list, and adding a
// property is a line here rather than a branch in a form. Every field is universal to graphics
// elements, which is why it is one flat list and not a per-tag contribution (geometry stays with the
// shape entries — this is the "everything offers a stroke and a fill" half of S9). `kind` is what a
// surface needs to pick a widget: `number`, `color`, `enum` (with `options`), or `text` (a dash list,
// a transform). `read` returns the *source* value — style declaration first, then attribute, then the
// SVG default — so the panel shows the bytes the author has, and a write that equals them is skipped
// upstream (T1). Nothing here writes: a field names a property, and `node.setField` routes it through
// `setProperty` → `commitDelta`, the one write path, so a widget's commit is byte-identical to a raw
// attribute write by construction.
const _sl270 = function _svgFields(attrVal,styleLens){return(
(() => {
  const N = (label, prop, extra = {}) => ({ prop, label, kind: "number", ...extra });
  const E = (label, prop, options) => ({ prop, label, kind: "enum", options });
  const T = (label, prop, extra = {}) => ({ prop, label, kind: "text", ...extra });
  const C = (label, prop, extra = {}) => ({ prop, label, kind: "color", ...extra });
  // The universal paint/stroke fields every graphics element offers (S9). This is `list`, the default
  // contribution and the set the inspector treats as "owned" for a shape.
  const paint = [
    C("Fill", "fill"),
    C("Stroke", "stroke"),
    N("Stroke width", "stroke-width", { min: 0, step: 0.5, dflt: "1" }),      // G30
    N("Opacity", "opacity", { min: 0, max: 1, step: 0.05, dflt: "1" }),        // G34
    N("Fill opacity", "fill-opacity", { min: 0, max: 1, step: 0.05, dflt: "1" }),
    N("Stroke opacity", "stroke-opacity", { min: 0, max: 1, step: 0.05, dflt: "1" }),
    T("Dash array", "stroke-dasharray", { dflt: "none" }),                    // G31
    N("Dash offset", "stroke-dashoffset", { step: 1, dflt: "0" }),
    E("Line cap", "stroke-linecap", ["butt", "round", "square"]),              // G32
    E("Line join", "stroke-linejoin", ["miter", "round", "bevel", "arcs", "miter-clip"]),
    N("Miter limit", "stroke-miterlimit", { min: 1, step: 1, dflt: "4" }),
    E("Paint order", "paint-order", ["normal", "stroke fill markers", "fill stroke markers"]),  // G37
    E("Fill rule", "fill-rule", ["nonzero", "evenodd"]),
    E("Vector effect", "vector-effect", ["none", "non-scaling-stroke"])
  ];
  // G2/G4/G5. A <stop> and a gradient are elements too, and their properties are the ones that make a
  // gradient a gradient. Coordinates stay `text`, not `number`, because a gradient in the default
  // `objectBoundingBox` units is written in fractions *or* percentages (`x2="100%"`), and a number
  // widget would silently drop the `%` — the same residue rule `lengthLens` keeps for a shape.
  const stop = [
    C("Stop color", "stop-color", { dflt: "#000000" }),
    N("Stop opacity", "stop-opacity", { min: 0, max: 1, step: 0.05, dflt: "1" }),
    T("Offset", "offset", { dflt: "0" })
  ];
  const gradientCommon = [
    E("Units", "gradientUnits", ["objectBoundingBox", "userSpaceOnUse"]),      // G5: redefines the coords
    E("Spread", "spreadMethod", ["pad", "reflect", "repeat"]),
    T("Transform", "gradientTransform", { dflt: "" })
  ];
  const linearGradient = [T("x1", "x1", { dflt: "0" }), T("y1", "y1", { dflt: "0" }),
                          T("x2", "x2", { dflt: "1" }), T("y2", "y2", { dflt: "0" })].concat(gradientCommon);
  const radialGradient = [T("cx", "cx", { dflt: "0.5" }), T("cy", "cy", { dflt: "0.5" }), T("r", "r", { dflt: "0.5" }),
                          T("fx", "fx"), T("fy", "fy")].concat(gradientCommon);
  const byTag = { stop, linearGradient, radialGradient };
  // Read a property the same way `setProperty` writes one: a `style` declaration wins over the
  // attribute, and an absent value reads as "" (the panel then shows the placeholder default).
  const read = (doc, idx, prop) => {
    let s = null;
    try { s = attrVal(doc, idx, "style"); } catch (e) {}
    if (s !== null) { const d = styleLens.get(s).find(([k]) => k === prop); if (d) return d[1].trim(); }
    let v = null;
    try { v = attrVal(doc, idx, prop); } catch (e) {}
    return v === null ? "" : String(v).trim();
  };
  // The fields a given tag offers: its own contribution, or the universal paint set for a shape.
  const forTag = (tag) => byTag[tag] || paint;
  return { list: paint, read, forTag };
})()
)};

const _sl78 = function _cellAttrLens(compose,literalLens,attrTextLens){return(
(alias, idx, name, dflt = null) => compose(literalLens(alias), attrTextLens(idx, name, dflt))
)};

// Lens<SVG document text, child element source strings>. The view is exact source slices, so every
// child keeps its own residue; only the children that actually changed are reprinted. This is the
// lens structural editing needs — insert, delete, reorder and group are all puts on this list.
//
// Domain: each supplied string must be exactly one element (no leading or trailing text), otherwise
// PutGet could not hold — get always returns a bare element slice.
//
// Lawfulness: GetPut and PutGet hold strictly. PutPut holds only **up to get-equivalence** — the two
// routes agree on the children but may differ in the whitespace and comments between them. That is
// not fixable while preserving residue: the gap belonging to a child is destroyed when an
// intermediate put removes that child, so deleting and re-adding cannot restore it. Reprinting every
// gap canonically would make PutPut strict and throw the residue away instead. See
// test_childrenLens_laws and knowledge/svg-editor-architecture.md.
const _sl79 = function _childrenLens(lens,nodeAt,parseDoc){return(
(path) => lens(
  (s) => { const n = nodeAt(s, path); return n.children.map((c) => s.slice(c.start, c.end)); },
  (kids, s) => {
    const n = nodeAt(s, path);
    const kn = n.children.length;
    const cur = n.children.map((c) => s.slice(c.start, c.end));
    if (kids.length === cur.length && kids.every((k, i) => k === cur[i])) return s;   // skip rule
    for (const k of kids) {
      const d = parseDoc(k);
      if (d.children.length !== 1 || d.children[0].start !== 0 || d.children[0].end !== k.length)
        throw new Error("a child must be exactly one element");
    }
    // The text before each child (indentation, comments) belongs to that child and travels with it.
    const gaps = n.children.map((c, i) => s.slice(i ? n.children[i - 1].end : n.innerStart, c.start));
    const tail = kn ? s.slice(n.children[kn - 1].end, n.innerEnd) : s.slice(n.innerStart, n.innerEnd);
    // What a newly inserted child gets: the *indentation* of an existing gap, never the whole gap —
    // a gap can hold comments, and copying those would reproduce them once per inserted element.
    const indent = (g) => /\s*$/.exec(g)[0];
    const fresh = kn ? indent(gaps[0]) : (indent(tail) || "\n");
    let at = 0, body = "";
    for (const k of kids) {
      const j = cur.indexOf(k, at);
      if (j === -1) body += fresh + k;
      else { body += gaps[j] + k; at = j + 1; }
    }
    return s.slice(0, n.innerStart) + body + tail + s.slice(n.innerEnd);
  }
)
)};

// ---- commands: pure (document text, address, …) -> document text --------------------------------
// Each one is a put, so the laws still cover it. Nothing here knows about the DOM or the pointer.

const _sl79a = function _insertElement(childrenLens){return(
(src, parentPath, at, markup) => {
  const l = childrenLens(parentPath);
  const kids = l.get(src).slice();
  const i = at === null || at === undefined ? kids.length : Math.max(0, Math.min(kids.length, at));
  kids.splice(i, 0, markup);
  return l.put(kids, src);
}
)};

const _sl79b = function _deleteElement(childrenLens){return(
(src, path) => {
  if (!path.length) throw new Error("cannot delete the document root");
  const l = childrenLens(path.slice(0, -1));
  const kids = l.get(src).slice();
  const i = path[path.length - 1];
  if (i < 0 || i >= kids.length) throw new Error(`no element at path ${path.join("/")}`);
  kids.splice(i, 1);
  return l.put(kids, src);
}
)};

const _sl79c = function _reorderElement(childrenLens){return(
(src, path, to) => {
  const l = childrenLens(path.slice(0, -1));
  const kids = l.get(src).slice();
  const from = path[path.length - 1];
  if (from < 0 || from >= kids.length) throw new Error(`no element at path ${path.join("/")}`);
  const [k] = kids.splice(from, 1);
  kids.splice(Math.max(0, Math.min(kids.length, to)), 0, k);
  return l.put(kids, src);
}
)};

// ---- defs: minting an id and writing into <defs> (S10) -------------------------------------------
// A gradient, marker or pattern is a *reference target*: the thing you point at is not the thing that
// gets written (`refsOf` reports which attribute points where). Two primitives are all S10 needs on
// top of the lenses that already carry `defs` through an edit untouched — an id that does not collide
// with any the document already holds (`idsIn` is the same authority `freshenIds` uses on paste, so
// two minted gradients cannot share an id, S10's first falsifier), and a write into `<defs>` that
// creates it when absent. `defs` is appended as the *last* child of the svg, so no existing element's
// address moves — the referring shape keeps its path and the command needs no rebase.
const _sl275 = function _mintId(idsIn){return(
(src, prefix = "id") => {
  const taken = idsIn(src);
  let i = 1; while (taken.has(prefix + i)) i++;
  return prefix + i;
}
)};

const _sl276 = function _defsInsert(nodeAt,insertElement){return(
(src, markup) => {
  const svg = nodeAt(src, [0]);
  const defs = svg.children.find((c) => c.tag === "defs");
  if (defs) return insertElement(src, defs.path, null, markup);
  return insertElement(src, [0], null, `<defs>${markup}</defs>`);
}
)};

// ---- structural commands, part 2: group, ungroup, and the copy/paste codec (S4, P8) -------------
// Same shape as the three above — pure (document text, addresses) -> document text — so every law
// that covers a put covers these too. Nothing here knows about the DOM, the pointer or the clipboard.

// Where the new <g> lands, computed from the addresses alone: at the *topmost* member's depth once the
// others below it have left, which is where every editor puts it. It is a separate function because
// `apply` and `rebase` must not disagree about it — that is the M0.2 failure mode, which silently
// drops the selection.
const _sl79xa = function _groupPlan(){return(
(paths) => {
  if (!paths || !paths.length) throw new Error("nothing to group");
  const parent = paths[0].slice(0, -1);
  for (const p of paths)
    if (p.length !== paths[0].length || !parent.every((v, i) => p[i] === v))
      throw new Error("only siblings can be grouped");
  const indices = [...new Set(paths.map((p) => p[p.length - 1]))].sort((a, b) => a - b);
  return { parent, indices, at: indices[indices.length - 1] - indices.length + 1 };
}
)};

const _sl79xb = function _groupElements(childrenLens,groupPlan,nodeAt){return(
(src, paths, open = "<g>", close = "</g>") => {
  const { parent, indices, at } = groupPlan(paths);
  const l = childrenLens(parent);
  const kids = l.get(src);
  for (const i of indices)
    if (kids[i] === undefined) throw new Error(`no element at path ${parent.concat(i).join("/")}`);
  // The indentation the siblings already sit at, read from the source rather than assumed: the new
  // <g> arrives at that depth (childrenLens gives it the same gap), so its contents go one further.
  // Two things the property test had to teach me, in the order it found them.
  //
  // Indentation goes in the *gap* before each child and nowhere else: re-indenting a child's own
  // lines rewrites bytes inside the element, which a multi-line <rect> caught.
  //
  // And each member takes its gap *with* it. `childrenLens` gives a newly inserted child the
  // indentation of an existing gap but never the gap itself — deliberately, because a gap can hold a
  // comment and copying it would reproduce the comment once per insertion. That is right for an
  // element arriving from nowhere and wrong here: a grouped element is not new, it is the same
  // element one level down, and the comment above it is about *it*. Read the gaps from the source and
  // deepen them by one level.
  const n = nodeAt(src, parent);
  const gapOf = (i) => src.slice(i ? n.children[i - 1].end : n.innerStart, n.children[i].start);
  const ind = /[ \t]*$/.exec(n.children.length ? gapOf(0) : "\n  ")[0];
  const body = indices.map((i) => gapOf(i).replace(/\n/g, "\n  ") + kids[i]).join("");
  const rest = kids.filter((_, i) => indices.indexOf(i) === -1);
  rest.splice(at, 0, open + body + (body.includes("\n") ? "\n" + ind : "") + close);
  return l.put(rest, src);
}
)};

// What stops this group being dissolved. A <g> is a coordinate frame *and* an inheritance frame:
// `transform` pushes down exactly, because composition is associative and that is what the renderer
// was already doing. `fill` or `opacity` do not — group opacity composites the group as one object,
// so moving it onto each child changes the picture. The honest answer to "can I ungroup this" is
// therefore a list of reasons, and the command declines when it is non-empty rather than quietly
// making the drawing look different. T8, as data.
const _sl79xc = function _ungroupBlockers(nodeAt){return(
(src, path) => {
  let n;
  try { n = nodeAt(src, path); } catch (e) { return [e.message]; }
  if (n.tag !== "g") return [`${n.tag} is not a group`];
  return Object.keys(n.attrs).filter((k) => k !== "transform");
}
)};

// Splice the group's *inner text* back in place of the group. Not `childrenLens`, which would give
// each child a fresh gap: the text between the children is the author's — indentation, comments —
// and it belongs to them, not to the <g> that happened to be around it.
const _sl79xd = function _ungroupElements(nodeAt,ungroupBlockers,attrTextLens){return(
(src, path) => {
  const blockers = ungroupBlockers(src, path);
  if (blockers.length) throw new Error(`cannot ungroup: ${blockers.join(", ")}`);
  const n = nodeAt(src, path);
  const t = n.attrs.transform ? n.attrs.transform.value : null;
  const l = attrTextLens(0, "transform", "");
  // One level out — but only in the gaps, for the same reason grouping only indents the gaps: a line
  // break inside an element is the author's, not the layout's. How far out is read from the source
  // too: where the children sat, minus where the <g> itself sat.
  const own = /[ \t]*$/.exec(src.slice(0, n.start))[0].length;
  const first = n.children.length ? /[ \t]*$/.exec(src.slice(n.innerStart, n.children[0].start))[0].length : own;
  const extra = Math.max(0, first - own);
  const dedent = (g) => (extra ? g.replace(new RegExp(`\\n[ \\t]{0,${extra}}`, "g"), "\n") : g);
  let body = "", pos = n.innerStart;
  for (const c of n.children) {
    const k = src.slice(c.start, c.end), o = l.get(k);
    body += dedent(src.slice(pos, c.start)) + (t ? l.put(o ? t + " " + o : t, k) : k);
    pos = c.end;
  }
  body += dedent(src.slice(pos, n.innerEnd));
  return src.slice(0, n.start) + body.replace(/^\s+/, "").replace(/\s+$/, "") + src.slice(n.end);
}
)};

// The clipboard payload is the author's own bytes. That is what makes paste-in-place byte-identical,
// and what makes the payload interoperate with every other tool they own — paste it into a text
// editor and you have SVG.
const _sl79xe = function _copyMarkup(nodeAt){return(
(src, paths) => paths.map((p) => { const n = nodeAt(src, p); return src.slice(n.start, n.end); })
)};

const _sl79xf = function _idsIn(parseDoc){return(
(src) => {
  const out = new Set();
  const walk = (n) => { if (n.attrs && n.attrs.id) out.add(n.attrs.id.value); n.children.forEach(walk); };
  walk(parseDoc(src));
  return out;
}
)};

// Two elements cannot share an id, so a pasted copy has to be renamed — but a reference *inside* the
// pasted set has to follow the rename, or the copy silently points at the original's gradient. Only
// ids the paste itself defines are touched: a reference out to something the document already had is
// left exactly as the author wrote it, because that reference is still correct.
const _sl79xg = function _freshenIds(idsIn){return(
(markups, taken) => {
  const defined = idsIn(markups.join("\n"));
  const map = new Map();
  for (const id of defined) {
    if (!taken.has(id)) continue;
    let i = 2, next = `${id}-${i}`;
    while (taken.has(next) || defined.has(next)) next = `${id}-${++i}`;
    map.set(id, next);
    taken.add(next);
  }
  if (!map.size) return markups;
  const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`(id="|url\\(#|href="#|xlink:href="#)(${[...map.keys()].map(esc).join("|")})(?=["\\)])`, "g");
  return markups.map((m) => m.replace(rx, (_, pre, id) => pre + map.get(id)));
}
)};

const _sl79xh = function _pasteMarkup(childrenLens,idsIn,freshenIds){return(
(src, parent, at, markups) => {
  const l = childrenLens(parent);
  const kids = l.get(src).slice();
  const i = at === null || at === undefined ? kids.length : Math.max(0, Math.min(kids.length, at));
  kids.splice(i, 0, ...freshenIds(markups, idsIn(src)));
  return l.put(kids, src);
}
)};

// Offset a *detached* markup string, so a duplicate lands where you can see it. The same translate
// lens a drag writes through, applied to a one-element document — which is all a clipboard entry is.
const _sl79xi = function _offsetMarkup(compose,attrTextLens,translateLens){return(
(markup, dx, dy) => {
  if (!dx && !dy) return markup;
  const l = compose(attrTextLens(0, "transform", ""), translateLens);
  const [x, y] = l.get(markup);
  const r = (v) => Math.round(v * 1e6) / 1e6;
  return l.put([r(x + dx), r(y + dy)], markup);
}
)};

// A structural command is more than one primitive edit, and an address has to survive all of them.
// Two pieces: `moves` re-roots any address inside a subtree that was relocated wholesale, and `ops`
// are the primitive insert/delete/move steps that everything else follows. Moves are checked first,
// because an address inside a moved subtree was not deleted — it went somewhere.
const _sl79xj = function _rebaseMoves(rebasePath){return(
(moves, ops) => (p) => {
  if (!p) return null;
  for (const [from, to] of moves)
    if (p.length >= from.length && from.every((v, i) => p[i] === v)) return to.concat(p.slice(from.length));
  let q = p;
  for (const op of ops) { q = rebasePath(q, op); if (!q) return null; }
  return q;
}
)};

// Adding and removing points needs no new lens: pointsLens already exposes a lawful list view.
const _sl79d = function _insertPoint(nodeAt,attrTextLens,parsePoints,printPoints){return(
(src, path, after, p) => {
  const l = attrTextLens(nodeAt(src, path).index, "points");
  const pts = parsePoints(l.get(src));
  pts.splice(Math.max(0, Math.min(pts.length, after + 1)), 0, p);
  return l.put(printPoints(pts), src);
}
)};

const _sl79e = function _deletePoint(nodeAt,attrTextLens,parsePoints,printPoints){return(
(src, path, i) => {
  const l = attrTextLens(nodeAt(src, path).index, "points");
  const pts = parsePoints(l.get(src));
  if (i < 0 || i >= pts.length) throw new Error(`no point ${i}`);
  if (pts.length <= 2) throw new Error("a polygon needs at least two points");
  pts.splice(i, 1);
  return l.put(printPoints(pts), src);
}
)};

// ---- path geometry: segments, subdivision, anchor removal ---------------------------------------
// The absolute geometry of each drawn segment, and where in the command list it came from. S and T
// reflections are resolved here, so everything downstream sees plain cubics and quadratics.
const _sl79h = function _pathSegments(PATH_ARG_COUNT){return(
(cmds) => {
  let cx = 0, cy = 0, sx = 0, sy = 0, px = null, py = null;
  const segs = [];
  cmds.forEach((cmd, ci) => {
    const U = cmd.c.toUpperCase(), rel = cmd.c !== U, u = PATH_ARG_COUNT[U];
    if (U === "Z") {
      segs.push({ kind: "Z", p0: [cx, cy], p3: [sx, sy], ci, o: 0, rel, letter: cmd.c });
      cx = sx; cy = sy; px = py = null;
      return;
    }
    for (let o = 0; o < cmd.a.length; o += u) {
      const A = cmd.a, bx = cx, by = cy;
      const abs = (i, j) => (rel ? [bx + A[o + i], by + A[o + j]] : [A[o + i], A[o + j]]);
      const refl = () => [2 * bx - (px === null ? bx : px), 2 * by - (py === null ? by : py)];
      let seg = null, cpx = null, cpy = null;
      switch (U) {
        case "M": {                                     // extra pairs after a moveto are linetos
          const e = abs(0, 1);
          if (o === 0) { sx = e[0]; sy = e[1]; } else seg = { kind: "L", p0: [bx, by], p3: e };
          cx = e[0]; cy = e[1];
          break;
        }
        case "L": { const e = abs(0, 1); seg = { kind: "L", p0: [bx, by], p3: e }; cx = e[0]; cy = e[1]; break; }
        case "H": { const x = rel ? bx + A[o] : A[o]; seg = { kind: "L", p0: [bx, by], p3: [x, by] }; cx = x; break; }
        case "V": { const y = rel ? by + A[o] : A[o]; seg = { kind: "L", p0: [bx, by], p3: [bx, y] }; cy = y; break; }
        case "C": { const c1 = abs(0, 1), c2 = abs(2, 3), e = abs(4, 5);
                    seg = { kind: "C", p0: [bx, by], p1: c1, p2: c2, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c2[0]; cpy = c2[1]; break; }
        case "S": { const c2 = abs(0, 1), e = abs(2, 3);
                    seg = { kind: "C", p0: [bx, by], p1: refl(), p2: c2, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c2[0]; cpy = c2[1]; break; }
        case "Q": { const c = abs(0, 1), e = abs(2, 3);
                    seg = { kind: "Q", p0: [bx, by], p1: c, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c[0]; cpy = c[1]; break; }
        case "T": { const c = refl(), e = abs(0, 1);
                    seg = { kind: "Q", p0: [bx, by], p1: c, p3: e };
                    cx = e[0]; cy = e[1]; cpx = c[0]; cpy = c[1]; break; }
        case "A": { const e = rel ? [bx + A[o + 5], by + A[o + 6]] : [A[o + 5], A[o + 6]];
                    seg = { kind: "A", p0: [bx, by], p3: e, args: A.slice(o, o + 7) };
                    cx = e[0]; cy = e[1]; break; }
      }
      px = cpx; py = cpy;
      if (seg) segs.push({ ...seg, ci, o, rel, letter: cmd.c });
    }
  });
  return segs;
}
)};

const _sl79i = function _pointOnSegment(){return(
(seg, t) => {
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  if (seg.kind === "C") { const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p2), c = L(seg.p2, seg.p3);
                          return L(L(a, b), L(b, c)); }
  if (seg.kind === "Q") { const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p3); return L(a, b); }
  return L(seg.p0, seg.p3);                             // L, Z, and arcs approximated by their chord
}
)};

// Replace one argument group with other commands. A group after the replacement keeps its own letter
// — except inside an M, where the trailing pairs are implicit linetos and must be spelled that way.
const _sl79j = function _replaceGroup(PATH_ARG_COUNT){return(
(cmds, ci, o, replacement) => {
  const cmd = cmds[ci], U = cmd.c.toUpperCase(), u = PATH_ARG_COUNT[U];
  const before = cmd.a.slice(0, o), after = cmd.a.slice(o + u);
  const out = [];
  if (before.length) out.push({ c: cmd.c, a: before });
  out.push(...replacement);
  if (after.length) out.push({ c: U === "M" ? (cmd.c === "m" ? "l" : "L") : cmd.c, a: after });
  return [...cmds.slice(0, ci), ...out, ...cmds.slice(ci + 1)];
}
)};

// Rewrite one segment as an absolute command of the same shape. Exact: pathSegments has already
// resolved relative coordinates and smooth-curve reflections.
const _sl79k = function _absoluteGroup(replaceGroup){return(
(cmds, seg) => {
  const cmd =
    seg.kind === "C" ? { c: "C", a: [...seg.p1, ...seg.p2, ...seg.p3] } :
    seg.kind === "Q" ? { c: "Q", a: [...seg.p1, ...seg.p3] } :
    seg.kind === "A" ? { c: "A", a: [...seg.args.slice(0, 5), ...seg.p3] } :
    seg.kind === "Z" ? null : { c: "L", a: [...seg.p3] };
  return cmd === null ? cmds : replaceGroup(cmds, seg.ci, seg.o, [cmd]);
}
)};

// Subdivide a segment at parameter t, exactly (de Casteljau). The curve through the new anchor is
// geometrically identical to the one it replaced — test_path_subdivision_exact holds it to that.
//
// The segment after the split has to be rewritten if it is smooth: S and T take their first control
// point by reflecting the previous one, and the split changes what "previous" means.
const _sl79l = function _splitPathSegment(pathSegments,replaceGroup,absoluteGroup){return(
(cmds, segIndex, t) => {
  const segs = pathSegments(cmds);
  const seg = segs[segIndex];
  if (!seg) throw new Error(`no segment ${segIndex}`);
  if (seg.kind === "A") throw new Error("arc segments cannot be subdivided");
  const L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  let out = cmds.map((c) => ({ c: c.c, a: c.a.slice() }));
  const next = segs[segIndex + 1];
  if (next && /^[STst]$/.test(next.letter)) out = absoluteGroup(out, next);   // higher index first

  if (seg.kind === "Z") {                               // split the closing edge: a lineto, then Z
    const m = L(seg.p0, seg.p3);
    return [...out.slice(0, seg.ci), { c: "L", a: m }, ...out.slice(seg.ci)];
  }
  let repl;
  if (seg.kind === "C") {
    const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p2), c = L(seg.p2, seg.p3);
    const d = L(a, b), e = L(b, c), m = L(d, e);
    repl = [{ c: "C", a: [...a, ...d, ...m] }, { c: "C", a: [...e, ...c, ...seg.p3] }];
  } else if (seg.kind === "Q") {
    const a = L(seg.p0, seg.p1), b = L(seg.p1, seg.p3), m = L(a, b);
    repl = [{ c: "Q", a: [...a, ...m] }, { c: "Q", a: [...b, ...seg.p3] }];
  } else {
    repl = [{ c: "L", a: L(seg.p0, seg.p3) }, { c: "L", a: [...seg.p3] }];
  }
  return replaceGroup(out, seg.ci, seg.o, repl);
}
)};

// Remove the anchor a segment ends at. The following segment is rewritten absolute first: it may be
// relative (its start moves) or smooth (its reflection base disappears).
const _sl79m = function _deletePathAnchor(pathSegments,replaceGroup,absoluteGroup){return(
(cmds, segIndex) => {
  const segs = pathSegments(cmds);
  const seg = segs[segIndex];
  if (!seg) throw new Error(`no segment ${segIndex}`);
  if (seg.kind === "Z") throw new Error("a close command has no anchor of its own");
  if (segs.filter((s) => s.kind !== "Z").length < 2) throw new Error("a path needs at least two anchors");
  let out = cmds.map((c) => ({ c: c.c, a: c.a.slice() }));
  const next = segs[segIndex + 1];
  if (next && next.kind !== "Z") out = absoluteGroup(out, next);              // higher index first
  return replaceGroup(out, seg.ci, seg.o, []);
}
)};

// Nearest point on a path, by sampling. Returns which segment and where along it.
const _sl79n = function _nearestPathSegment(pointOnSegment){return(
(segs, x, y, samples = 24) => {
  let best = -1, bestT = 0, bestD = Infinity;
  segs.forEach((seg, i) => {
    for (let k = 0; k <= samples; k++) {
      const t = k / samples;
      const p = pointOnSegment(seg, t);
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bestD) { bestD = d; best = i; bestT = t; }
    }
  });
  return { index: best, t: bestT, distance: bestD };
}
)};

const _sl79o = function _insertPathPoint(nodeAt,attrTextLens,parsePath,printPath,splitPathSegment){return(
(src, path, segIndex, t) => {
  const l = attrTextLens(nodeAt(src, path).index, "d");
  return l.put(printPath(splitPathSegment(parsePath(l.get(src)), segIndex, t)), src);
}
)};

const _sl79p = function _deletePathPoint(nodeAt,attrTextLens,parsePath,printPath,deletePathAnchor){return(
(src, path, segIndex) => {
  const l = attrTextLens(nodeAt(src, path).index, "d");
  return l.put(printPath(deletePathAnchor(parsePath(l.get(src)), segIndex)), src);
}
)};

// Carry an address across a structural edit. A path survives everything that happens outside its own
// parent chain, which is why most edits need no rebase at all: appending a shape, or editing any
// element's attributes, leaves every existing path valid. Returns null when the addressed element is
// the one that was deleted.
//
// Structural paths, not injected ids: the drawing is the artifact the user is authoring, and stamping
// data-lens-id onto every element would pollute exactly the source this project exists to preserve.
const _sl79g = function _rebasePath(){return(
(path, op) => {
  if (!path) return null;
  const parent = op.kind === "insert" ? op.parent : op.path.slice(0, -1);
  const at = op.kind === "insert" ? op.at : op.path[op.path.length - 1];
  if (path.length <= parent.length) return path;                  // an ancestor or a sibling branch
  for (let i = 0; i < parent.length; i++) if (path[i] !== parent[i]) return path;
  const out = path.slice();
  const i = out[parent.length];
  if (op.kind === "insert") { if (i >= at) out[parent.length] = i + 1; return out; }
  if (op.kind === "delete") {
    if (i === at) return null;
    if (i > at) out[parent.length] = i - 1;
    return out;
  }
  // move: delete then insert, in that order, so `to` is an index in the list without the moved child
  if (i === at) { out[parent.length] = op.to; return out; }
  let j = i > at ? i - 1 : i;
  if (j >= op.to) j += 1;
  out[parent.length] = j;
  return out;
}
)};

// ---- P7: an address smaller than an element -----------------------------------------------------
// `focus` addresses an element by *path* rather than by index, because an index is not stable across
// a structural edit. A vertex has the same problem one level down, and until now had no answer at
// all: it was named by a handle `key` living in one tool's gesture scratch, which is why
// multi-vertex selection, corner↔smooth and deleting a segment were all blocked on this.
//
// The stable name is an **ordinal within a kind** — "the 3rd anchor of the element at 0/2" — and not
// the handle key. A key is a position in the attribute's own microsyntax (`p3` for a points list,
// `ci:o:ix:iy` for a path command list), and both of those renumber unpredictably when a segment is
// split: `replaceGroup` can turn one command into two. The ordinal renumbers *predictably*, because
// inserting an anchor shifts exactly the anchors after it. So the key stays transient — resolved from
// the live handle list at the moment of the drag — and the address is what is stored and rebased.
const _sl255 = function _vertexAddress(){return(
{
  of: (path, kind, n) => ({ path, kind, n }),
  print: (a) => `${a.path.join("/")}#${a.kind === "ctrl" ? "c" : "a"}${a.n}`,
  parse: (s) => {
    const m = /^([\d/]*)#([ac])(\d+)$/.exec(s);
    if (!m) throw new Error(`not a vertex address: ${s}`);
    return { path: m[1] === "" ? [] : m[1].split("/").map(Number),
             kind: m[2] === "c" ? "ctrl" : "anchor", n: Number(m[3]) };
  },
  same: (a, b) => !!a && !!b && a.kind === b.kind && a.n === b.n
                  && a.path.length === b.path.length && a.path.every((v, i) => v === b.path[i]),
  // Address -> the handle it names, right now. Partial by construction: an ordinal that no longer
  // exists resolves to null, which is the same answer `focus` gives for a path that no longer
  // resolves, and it is what makes the address safe to hold across a commit.
  resolve: (handles, a) => handles.filter((h) => h.kind === a.kind)[a.n] || null,
  // ...and back, for a handle the pointer just grabbed.
  ordinalOf: (handles, key) => {
    const h = handles.find((x) => x.key === key);
    if (!h) return null;
    const kind = h.kind === "ctrl" ? "ctrl" : "anchor";
    return { kind, n: handles.filter((x) => x.kind === kind).indexOf(h) };
  }
}
)};

// T7 one level down. Element-level ops move the *path*; vertex-level ops renumber within one element,
// and only within the element they name. The op is supplied by whoever performed the edit, exactly as
// `rebasePath`'s is — a rebase that guesses at what an edit did is the M0.2 failure mode.
const _sl256 = function _rebaseVertex(rebasePath){return(
(a, op) => {
  if (!a) return null;
  if (op.kind === "insert" || op.kind === "delete" || op.kind === "move") {
    const path = rebasePath(a.path, op);
    return path && { ...a, path };
  }
  const p = op.path;
  if (a.path.length !== p.length || !p.every((v, i) => a.path[i] === v)) return a;   // another element
  if (op.kind === "vertex-insert") return a.n >= op.at ? { ...a, n: a.n + 1 } : a;
  if (op.kind === "vertex-delete") {
    if (a.n === op.at) return null;                     // this is the vertex that was removed
    return a.n > op.at ? { ...a, n: a.n - 1 } : a;
  }
  throw new Error(`unknown op kind: ${op.kind}`);
}
)};

// Nearest segment to a point, for "double-click an edge to add a vertex".
const _sl79f = function _nearestSegment(){return(
(pts, x, y, closed = true) => {
  let best = -1, bestD = Infinity;
  const n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < bestD) { bestD = d; best = i; }
  }
  return { index: best, distance: bestD };
}
)};

// ================================================================================================
// PROPERTY-TEST HARNESS — deterministic seeded PRNG, domains mirror the original fast-check suite
// ================================================================================================
const _sl80 = function _harnessHeader(md) {return (md`## Property-test harness

Deterministic replacement of fast-check: a seeded PRNG (\`mulberry32\`), domain generators (\`arb\`), and \`forAll\` which throws the counterexample on failure. Fixed seeds keep every test cell rerunnable with identical results. \`arb.anyFinite\` draws random 64-bit patterns, so the exact round-trip claims are exercised across the full double range, subnormals and -0 included.`);};

const _sl81 = function _NUM_RUNS(){return(
300
)};

const _sl82 = function _mulberry32(){return(
(seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
)};

const _sl83 = function _arb(det)
{
  const buf = new DataView(new ArrayBuffer(8));
  // Any finite double via random bit patterns: full range, subnormals, -0.
  const anyFinite = (rng) => {
    for (;;) {
      buf.setUint32(0, (rng() * 4294967296) >>> 0);
      buf.setUint32(4, (rng() * 4294967296) >>> 0);
      const v = buf.getFloat64(0);
      if (Number.isFinite(v)) return v;
    }
  };
  // Bounded doubles for values that get multiplied together (no overflow-to-NaN).
  const bounded = (rng) => (rng() * 2 - 1) * 1e6;
  const angle = (rng) => (rng() * 2 - 1) * 720;
  const pick = (rng, xs) => xs[Math.floor(rng() * xs.length)];
  const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const SEPS = [" ", ",", ", ", "  ", " , ", "\t"];
  const sep = (rng) => pick(rng, SEPS);

  const rect = (rng) => ({ minX: anyFinite(rng), minY: anyFinite(rng), width: anyFinite(rng), height: anyFinite(rng) });
  // Messy-but-valid viewBox strings: random separators, optional padding.
  const viewBoxStr = (rng) => {
    const r = rect(rng);
    return `${pick(rng, ["", " ", "  "])}${r.minX}${sep(rng)}${r.minY}${sep(rng)}${r.width}${sep(rng)}${r.height}${pick(rng, ["", " "])}`;
  };

  const points = (rng) => Array.from({ length: int(rng, 0, 8) }, () => [anyFinite(rng), anyFinite(rng)]);
  const pointsStr = (rng) => { const s = sep(rng); return points(rng).map(([x, y]) => `${x}${s}${y}`).join(" "); };

  // One SVG transform op rendered as text, in all supported spellings.
  const opStr = (rng) => {
    const s = sep(rng);
    switch (int(rng, 0, 5)) {
      case 0: { const x = bounded(rng); return rng() < 0.5 ? `translate(${x})` : `translate(${x}${s}${bounded(rng)})`; }
      case 1: { const x = bounded(rng); return rng() < 0.5 ? `scale(${x})` : `scale(${x}${s}${bounded(rng)})`; }
      case 2: { const a = angle(rng); return rng() < 0.5 ? `rotate(${a})` : `rotate(${a}${s}${bounded(rng)}${s}${bounded(rng)})`; }
      case 3: return `skewX(${angle(rng)})`;
      case 4: return `skewY(${angle(rng)})`;
      default: return `matrix(${Array.from({ length: 6 }, () => bounded(rng)).join(s)})`;
    }
  };
  const transformStr = (rng) => Array.from({ length: int(rng, 0, 4) }, () => opStr(rng)).join(sep(rng));
  const mat = (rng) => Array.from({ length: 6 }, () => bounded(rng));
  // Well-conditioned invertible matrices for the inversion involution.
  const invertibleMat = (rng) => {
    for (;;) {
      const m = Array.from({ length: 6 }, () => (rng() * 2 - 1) * 10);
      if (Math.abs(det(m)) > 0.5) return m;
    }
  };

  // Path commands: correct arg counts, letters incl. relative case.
  const PATH_LETTERS = [["M", 2], ["m", 2], ["L", 2], ["l", 2], ["H", 1], ["h", 1], ["V", 1], ["v", 1],
                        ["C", 6], ["c", 6], ["S", 4], ["s", 4], ["Q", 4], ["q", 4], ["T", 2], ["t", 2], ["A", 7], ["a", 7]];
  const pathCmd = (rng) => {
    if (rng() < 0.1) return { c: pick(rng, ["Z", "z"]), a: [] };
    const [c, u] = pick(rng, PATH_LETTERS);
    const reps = int(rng, 1, 2);
    return { c, a: Array.from({ length: u * reps }, () => anyFinite(rng)) };
  };
  const pathCmds = (rng) => Array.from({ length: int(rng, 0, 6) }, () => pathCmd(rng));
  const pathStr = (rng) => {
    const s = sep(rng), lead = pick(rng, ["", " ", ","]);
    return pathCmds(rng).map(({ c, a }) => c + (a.length ? lead + a.map(String).join(s) : "")).join(s);
  };

  const ATTR_NAMES = ["id", "fill", "stroke", "viewBox", "transform", "points", "d"];
  const CHARS = "abcXYZ 019-#.,()<>\"'&";
  const attrValue = (rng) => Array.from({ length: int(rng, 0, 12) }, () => CHARS[int(rng, 0, CHARS.length - 1)]).join("");
  const node = (rng, depth = 3) => ({
    tag: pick(rng, ["svg", "g", "rect", "circle", "path", "polygon"]),
    attrs: Object.fromEntries(Array.from({ length: int(rng, 0, 4) }, () => [pick(rng, ATTR_NAMES), attrValue(rng)])),
    children: depth <= 0 ? [] : Array.from({ length: int(rng, 0, 3) }, () => node(rng, depth - 1))
  });
  const nodeWithChild = (rng) => {
    for (;;) {
      const n = node(rng);
      if (n.children.length > 0) return [n, int(rng, 0, n.children.length - 1)];
    }
  };
  const nodeWithViewBox = (rng) => {
    const n = node(rng);
    return { ...n, attrs: { ...n.attrs, viewBox: viewBoxStr(rng) } };
  };

  // --- source-lens domains -----------------------------------------------------------------
  // Attribute text safe inside a template literal AND inside a double-quoted attribute.
  const SAFE = "abcXYZ019 -#.,()";
  const safeText = (rng, max = 14) =>
    Array.from({ length: int(rng, 0, max) }, () => SAFE[int(rng, 0, SAFE.length - 1)]).join("");
  // An SVG document with at least 3 elements, deliberately messy: comments, mixed separators,
  // attributes present on some elements and absent on others.
  const svgDocStr = (rng) => {
    const shapes = Array.from({ length: int(rng, 2, 4) }, () => {
      const kind = int(rng, 0, 2);
      const t = rng() < 0.5 ? ` transform="${opStr(rng)}"` : "";
      const pad = pick(rng, ["", " ", "\n    "]);
      if (kind === 0) return `  <rect x="${int(rng, -50, 50)}" y="${int(rng, -50, 50)}"${pad}width="${int(rng, 1, 99)}" height="${int(rng, 1, 99)}"${t}/>`;
      if (kind === 1) return `  <polygon points="${pointsStr(rng) || "0,0 1,1"}"${t}/>`;
      return `  <circle cx="${int(rng, 0, 99)}" cy="${int(rng, 0, 99)}" r="${int(rng, 1, 40)}"${t}/>`;
    });
    const cmt = rng() < 0.5 ? `  <!-- ${safeText(rng)} -->\n` : "";
    return `<svg viewBox="${int(rng, -9, 9)} ${int(rng, -9, 9)} ${int(rng, 1, 999)} ${int(rng, 1, 999)}">\n${cmt}${shapes.join("\n")}\n</svg>`;
  };
  // A cell definition of the shape lopecode compiles: residue (comments, spacing) outside the
  // literal must survive a put, which is exactly what GetPut on literalLens asserts.
  const cellSrcStr = (rng) => {
    const cmt = pick(rng, ["", "\n  // note\n  ", "\n  /* block */ "]);
    const pad = pick(rng, ["", " ", "\n"]);
    return `function _demo(svgLens, svg) {${cmt}return (${pad}svgLens(svg\`${svgDocStr(rng)}\`)${pad});}`;
  };

  return { anyFinite, bounded, angle, pick, int, sep, rect, viewBoxStr, points, pointsStr,
           opStr, transformStr, mat, invertibleMat, pathCmds, pathStr, attrValue, node,
           nodeWithChild, nodeWithViewBox, safeText, svgDocStr, cellSrcStr };
};

const _sl84 = function _forAll(){return(
(runs, rng, gen, prop, label = "property") => {
  const show = (v) => JSON.stringify(v, (k, x) => (typeof x === "number" ? String(x) : x));
  for (let i = 0; i < runs; i++) {
    const args = gen(rng);
    let ok, err;
    try { ok = prop(...args); } catch (e) { ok = false; err = e; }
    if (!ok) throw new Error(`${label} counterexample (run ${i}): ${show(args)}${err ? " — " + err.message : ""}`);
  }
  return runs;
}
)};

// Check all three laws of a lens with strict equalities and random-domain generators.
const _sl85 = function _checkLens(forAll,lensLaws){return(
(l, { runs, rng, genS, genA, eqS, eqA }) => {
  forAll(runs, rng, (r) => [genS(r)], lensLaws.getPut(l, eqS), "GetPut");
  forAll(runs, rng, (r) => [genA(r), genS(r)], lensLaws.putGet(l, eqA), "PutGet");
  forAll(runs, rng, (r) => [genA(r), genA(r), genS(r)], lensLaws.putPut(l, eqS), "PutPut");
  return `✅ GetPut, PutGet, PutPut (${runs} runs each)`;
}
)};

// ================================================================================================
// TESTS — discovered by @tomlarkworthy/tests (any cell named test_*; throw = fail)
// ================================================================================================
const _sl90 = function _testsHeader(md){return(
md`## Tests

Each \`test_*\` cell property-checks one lens (or one exactness claim) with a fixed seed.
The dashboard near the top of the notebook aggregates them.`
)};

const _sl91 = function _test_viewBoxLens_laws(checkLens,viewBoxLens,arb,mulberry32,NUM_RUNS,rectEq){return(
checkLens(viewBoxLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0001),
  genS: arb.viewBoxStr, genA: arb.rect,
  eqS: (a, b) => a === b, eqA: rectEq
})
)};

const _sl92 = function _test_pointsLens_laws(checkLens,pointsLens,arb,mulberry32,NUM_RUNS,pointsEq){return(
checkLens(pointsLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0002),
  genS: arb.pointsStr, genA: arb.points,
  eqS: (a, b) => a === b, eqA: pointsEq
})
)};

const _sl93 = function _test_transformLens_laws(checkLens,transformLens,arb,mulberry32,NUM_RUNS,matEq){return(
checkLens(transformLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0003),
  genS: arb.transformStr, genA: arb.mat,
  eqS: (a, b) => a === b, eqA: matEq
})
)};

const _sl94 = function _test_pathLens_laws(checkLens,pathLens,arb,mulberry32,NUM_RUNS,pathEq){return(
checkLens(pathLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0004),
  genS: arb.pathStr, genA: arb.pathCmds,
  eqS: (a, b) => a === b, eqA: pathEq
})
)};

const _sl95 = function _test_attr_laws(checkLens,attr,arb,mulberry32,NUM_RUNS,nodeEq){return(
checkLens(attr("fill"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0005),
  genS: arb.node, genA: (rng) => (rng() < 0.2 ? null : arb.attrValue(rng)),
  eqS: nodeEq, eqA: (a, b) => a === b
})
)};

const _sl96 = function _test_child_laws(forAll,child,arb,mulberry32,NUM_RUNS,nodeEq,lensLaws)
{
  const rng = mulberry32(0x5EED0006);
  forAll(NUM_RUNS, rng, (r) => [arb.nodeWithChild(r)],
    ([n, i]) => lensLaws.getPut(child(i), nodeEq)(n), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [arb.node(r), arb.nodeWithChild(r)],
    (c, [n, i]) => lensLaws.putGet(child(i), nodeEq)(c, n), "PutGet");
  forAll(NUM_RUNS, rng, (r) => [arb.node(r), arb.node(r), arb.nodeWithChild(r)],
    (c1, c2, [n, i]) => lensLaws.putPut(child(i), nodeEq)(c1, c2, n), "PutPut");
  return `✅ child(i): GetPut, PutGet, PutPut (${NUM_RUNS} runs each)`;
};

// Composition: SvgNode --requiredAttr--> string --viewBoxLens--> Rect
const _sl97 = function _test_compose_nodeViewBox_laws(checkLens,compose,requiredAttr,viewBoxLens,arb,mulberry32,NUM_RUNS,nodeEq,rectEq){return(
checkLens(compose(requiredAttr("viewBox"), viewBoxLens), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0007),
  genS: arb.nodeWithViewBox, genA: arb.rect,
  eqS: nodeEq, eqA: rectEq
})
)};

const _sl98 = function _test_invert_involution(forAll,arb,mulberry32,NUM_RUNS,invertIso,isoLaws,matApproxEq,multiply,IDENTITY)
{
  const rng = mulberry32(0x5EED0008);
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    isoLaws.roundTripS(invertIso, (a, b) => matApproxEq(a, b)), "invert(invert(m)) ≈ m");
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    (m) => matApproxEq(multiply(m, invertIso.to(m)), IDENTITY), "m · invert(m) ≈ identity");
  return `✅ inversion is a float-approximate involution (${NUM_RUNS} runs each)`;
};

const _sl99 = function _test_exact_roundtrips(forAll,arb,mulberry32,NUM_RUNS,parseTransform,printTransform,matEq,parsePath,printPath,pathEq,viewBoxLens,printViewBox,rectEq)
{
  const rng = mulberry32(0x5EED0009);
  forAll(NUM_RUNS, rng, (r) => [arb.anyFinite(r)],
    (x) => Number(String(x)) === x, "Number(String(x)) === x");
  forAll(NUM_RUNS, rng, (r) => [arb.mat(r)],
    (m) => matEq(parseTransform(printTransform(m)), m), "parseTransform ∘ printTransform = id");
  forAll(NUM_RUNS, rng, (r) => [arb.pathCmds(r)],
    (p) => pathEq(parsePath(printPath(p)), p), "parsePath ∘ printPath = id");
  forAll(NUM_RUNS, rng, (r) => [arb.rect(r)],
    (x) => rectEq(viewBoxLens.get(printViewBox(x)), x), "parse ∘ print = id for viewBox");
  return `✅ print/parse round-trips are exact across the full double range (${NUM_RUNS} runs each)`;
};

// The corner random generators never hit: a2 = get(s) on a non-canonical source. The skip rule
// makes put(a2, s) return s while put(a2, put(a1, s)) prints canonically — strict PutPut fails,
// observational PutPut (up to get) holds. See the caveat in the laws section.
const _sl100 = function _test_putput_skip_rule_corner(arb,mulberry32,NUM_RUNS,viewBoxLens,transformLens,rectEq,matEq,parseTransform)
{
  const rng = mulberry32(0x5EED000A);
  let witnessed = 0;
  for (let i = 0; i < NUM_RUNS; i++) {
    const s = arb.viewBoxStr(rng);
    const a1 = arb.rect(rng);
    const a2 = viewBoxLens.get(s); // the corner: put back exactly what the source encodes
    if (rectEq(a1, a2)) continue;
    const lhs = viewBoxLens.put(a2, viewBoxLens.put(a1, s));
    const rhs = viewBoxLens.put(a2, s);
    if (!rectEq(viewBoxLens.get(lhs), viewBoxLens.get(rhs)))
      throw new Error(`observational PutPut broken for viewBox: ${JSON.stringify(s)}`);
    if (lhs !== rhs) witnessed++;
  }
  for (let i = 0; i < NUM_RUNS; i++) {
    const s = arb.transformStr(rng);
    const a1 = arb.mat(rng);
    const a2 = parseTransform(s);
    if (matEq(a1, a2)) continue;
    const lhs = transformLens.put(a2, transformLens.put(a1, s));
    const rhs = transformLens.put(a2, s);
    if (!matEq(transformLens.get(lhs), transformLens.get(rhs)))
      throw new Error(`observational PutPut broken for transform: ${JSON.stringify(s)}`);
    if (lhs !== rhs) witnessed++;
  }
  if (witnessed === 0)
    throw new Error("expected the skip rule to violate strict PutPut on non-canonical sources");
  return `✅ PutPut holds up to get-equivalence; strict string PutPut fails in the a2 = get(s) corner (${witnessed} witnesses)`;
};

// Direct manipulation maps screen ↔ element coordinates with applyPoint/invert rather than DOM
// matrix methods, so the coordinate round-trip is a property of this module, not of the browser.
const _sl101 = function _test_applyPoint_screen_roundtrip(forAll,arb,mulberry32,NUM_RUNS,applyPoint,invert,multiply,IDENTITY,matApproxEq)
{
  const rng = mulberry32(0x5EED000B);
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r), (r() * 2 - 1) * 1000, (r() * 2 - 1) * 1000],
    (m, x, y) => {
      const [sx, sy] = applyPoint(m, x, y);
      const [bx, by] = applyPoint(invert(m), sx, sy);
      const tol = 1e-6 * Math.max(1, Math.abs(x), Math.abs(y));
      return Math.abs(bx - x) <= tol && Math.abs(by - y) <= tol;
    }, "applyPoint(invert(m), applyPoint(m, p)) ≈ p");
  forAll(NUM_RUNS, rng, (r) => [arb.invertibleMat(r)],
    (m) => matApproxEq(multiply(invert(m), m), IDENTITY), "invert(m) · m ≈ identity");
  return `✅ screen↔element coordinate round-trip holds (${NUM_RUNS} runs each)`;
};

// The lens a body drag manipulates: it must keep the author's decomposition intact.
const _sl101b = function _test_translateLens_laws(checkLens,translateLens,arb,mulberry32,NUM_RUNS,forAll,transformLens,matEq){return(
((r) => {
  const rng = mulberry32(0x5EED0011);
  // dragging never rewrites the ops that follow the translate
  forAll(NUM_RUNS, rng, (g) => [arb.transformStr(g), [arb.bounded(g), arb.bounded(g)]], (s, t) => {
    const out = translateLens.put(t, s);
    const tail = (x) => x.replace(/^\s*translate\s*\([^)]*\)\s*/, "");
    return tail(out) === tail(s) || tail(out) === s.trim();
  }, "put keeps the rest of the transform list");
  return r;
})(checkLens(translateLens, {
  runs: NUM_RUNS, rng: mulberry32(0x5EED0010),
  genS: arb.transformStr, genA: (rng) => [arb.bounded(rng), arb.bounded(rng)],
  eqS: (a, b) => a === b, eqA: (a, b) => a[0] === b[0] && a[1] === b[1]
}))
)};

// The lens a drag actually commits: cell definition text ↔ template literal.
const _sl102 = function _test_literalLens_laws(checkLens,literalLens,arb,mulberry32,NUM_RUNS){return(
checkLens(literalLens("svgLens"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000C),
  genS: arb.cellSrcStr, genA: arb.svgDocStr,
  eqS: (a, b) => a === b, eqA: (a, b) => a === b
})
)};

const _sl103 = function _test_attrTextLens_laws(checkLens,attrTextLens,arb,mulberry32,NUM_RUNS){return(
checkLens(attrTextLens(1, "transform", "matrix(1 0 0 1 0 0)"), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000D),
  genS: arb.svgDocStr, genA: arb.opStr,
  eqS: (a, b) => a === b, eqA: (a, b) => a === b
})
)};

// The whole chain a gesture writes through: cell source ↔ matrix, four lenses deep.
const _sl104 = function _test_cellSourceLens_laws(checkLens,compose,cellAttrLens,transformLens,arb,mulberry32,NUM_RUNS,matEq){return(
checkLens(compose(cellAttrLens("svgLens", 1, "transform", "matrix(1 0 0 1 0 0)"), transformLens), {
  runs: NUM_RUNS, rng: mulberry32(0x5EED000E),
  genS: arb.cellSrcStr, genA: arb.mat,
  eqS: (a, b) => a === b, eqA: matEq
})
)};

// A drag must never disturb the cell's other bytes: literalLens preserves residue by construction.
const _sl105 = function _test_source_residue_preserved(forAll,arb,mulberry32,NUM_RUNS,literalLens,cellAttrLens,literalSpan)
{
  const rng = mulberry32(0x5EED000F);
  const lit = literalLens("svgLens");
  const cell = cellAttrLens("svgLens", 1, "transform", "matrix(1 0 0 1 0 0)");
  forAll(NUM_RUNS, rng, (r) => [arb.cellSrcStr(r), arb.opStr(r)], (s, op) => {
    const out = cell.put(op, s);
    const [a, b] = literalSpan(s, "svgLens");
    const [a2] = literalSpan(out, "svgLens");
    // everything before the literal is byte-identical, and so is everything after it
    return s.slice(0, a) === out.slice(0, a2) &&
           s.slice(b) === out.slice(literalSpan(out, "svgLens")[1]) &&
           lit.get(out) !== undefined;
  }, "a put touches only bytes inside the literal");
  return `✅ puts leave every byte outside the literal untouched (${NUM_RUNS} runs)`;
};

const _sl106 = function _test_childrenLens_laws(forAll,lensLaws,childrenLens,arb,mulberry32,NUM_RUNS)
{
  const rng = mulberry32(0x5EED0010);
  const POOL = ['<rect x="1" y="2" width="3" height="4"/>', '<circle cx="0" cy="0" r="5"/>',
                '<g><rect x="0"/></g>', '<polygon points="0,0 1,1 2,0"/>'];
  const l = childrenLens([0]);                                 // children of the outermost <svg>
  const genS = (r) => arb.svgDocStr(r);
  const genA = (r) => Array.from({ length: arb.int(r, 0, 4) }, () => arb.pick(r, POOL));
  const eqA = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  forAll(NUM_RUNS, rng, (r) => [genS(r)], lensLaws.getPut(l, (a, b) => a === b), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [genA(r), genS(r)], lensLaws.putGet(l, eqA), "PutGet");
  // PutPut only up to get-equivalence: a child's leading gap dies with the child, so delete-then-
  // re-add cannot restore it. Strict PutPut would mean reprinting every gap and losing the residue.
  forAll(NUM_RUNS, rng, (r) => [genA(r), genA(r), genS(r)],
    (a1, a2, s) => eqA(l.get(l.put(a2, l.put(a1, s))), l.get(l.put(a2, s))), "PutPut(get)");
  return `✅ GetPut, PutGet strict; PutPut up to get-equivalence (${NUM_RUNS} runs each)`;
};

const _sl107 = function _test_structural_commands(forAll,arb,mulberry32,NUM_RUNS,childrenLens,insertElement,deleteElement,reorderElement)
{
  const rng = mulberry32(0x5EED0011);
  const MARK = '<circle cx="7" cy="7" r="3"/>';
  const kidsOf = (d) => childrenLens([0]).get(d);
  forAll(NUM_RUNS, rng, (r) => [arb.svgDocStr(r), arb.int(r, 0, 5)], (doc, at) => {
    const kids = kidsOf(doc);
    const i = Math.min(at, kids.length);
    const after = kidsOf(insertElement(doc, [0], i, MARK));
    if (after.length !== kids.length + 1) throw new Error("insert did not add exactly one child");
    if (after[i] !== MARK) throw new Error("inserted at the wrong index");
    const back = kidsOf(deleteElement(insertElement(doc, [0], i, MARK), [0, i]));
    if (!(back.length === kids.length && back.every((k, j) => k === kids[j])))
      throw new Error("delete did not undo insert");
    if (kids.length > 1) {
      const moved = kidsOf(reorderElement(doc, [0, 0], kids.length - 1));
      if (moved[kids.length - 1] !== kids[0]) throw new Error("reorder moved it to the wrong place");
      if ([...moved].sort().join("|") !== [...kids].sort().join("|"))
        throw new Error("reorder is not a permutation");
    }
    return true;
  }, "structural commands");
  return `✅ insert/delete inverse, reorder is a permutation (${NUM_RUNS} runs)`;
};

const _sl108 = function _test_point_commands(forAll,arb,mulberry32,NUM_RUNS,insertPoint,deletePoint,nodeAt,attrVal,parsePoints)
{
  const rng = mulberry32(0x5EED0012);
  const gen = (r) => {
    const pts = Array.from({ length: arb.int(r, 3, 6) }, () => [arb.int(r, -99, 99), arb.int(r, -99, 99)]);
    return [`<svg viewBox="0 0 10 10">\n  <polygon points="${pts.map((p) => p.join(",")).join(" ")}"/>\n</svg>`,
            arb.int(r, 0, pts.length - 1), [arb.int(r, -9, 9), arb.int(r, -9, 9)]];
  };
  forAll(NUM_RUNS, rng, gen, (doc, i, p) => {
    const idx = nodeAt(doc, [0, 0]).index;
    const pts = (d) => parsePoints(attrVal(d, idx, "points"));
    const before = pts(doc);
    const ins = insertPoint(doc, [0, 0], i, p);
    const mid = pts(ins);
    if (mid.length !== before.length + 1) throw new Error("insertPoint did not add one point");
    if (mid[i + 1][0] !== p[0] || mid[i + 1][1] !== p[1]) throw new Error("point landed in the wrong slot");
    const end = pts(deletePoint(ins, [0, 0], i + 1));
    if (!(end.length === before.length && end.every((q, j) => q[0] === before[j][0] && q[1] === before[j][1])))
      throw new Error("deletePoint did not undo insertPoint");
    return true;
  }, "point commands");
  return `✅ insertPoint/deletePoint inverse on polygons (${NUM_RUNS} runs)`;
};

const _sl108b = function _test_nearestSegment(nearestSegment){return(
(() => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const at = (x, y, closed = true) => nearestSegment(sq, x, y, closed).index;
  if (at(5, 0) !== 0) throw new Error("midpoint of the first edge");
  if (at(10, 5) !== 1) throw new Error("midpoint of the second edge");
  if (at(5, 10) !== 2) throw new Error("midpoint of the third edge");
  if (at(0, 5) !== 3) throw new Error("the closing edge must be a candidate when closed");
  if (at(0, 5, false) === 3) throw new Error("an open polyline has no closing edge");
  if (nearestSegment(sq, 5, 1).distance !== 1) throw new Error("distance to the nearest edge");
  return "✅ nearest segment on closed and open polygons";
})()
)};

const _sl108e = function _test_opsLens_laws(forAll,lensLaws,opsLens,arb,mulberry32,NUM_RUNS,printOp)
{
  const rng = mulberry32(0x5EED0016);
  const genA = (r) => Array.from({ length: arb.int(r, 0, 3) }, () => {
    const name = arb.pick(r, ["translate", "scale", "rotate", "skewX", "matrix"]);
    const n = name === "matrix" ? 6 : name === "rotate" ? arb.pick(r, [1, 3]) : name === "skewX" ? 1 : 2;
    return { name, args: Array.from({ length: n }, () => arb.bounded(r)) };
  });
  const eqA = (a, b) => a.length === b.length && a.every((o, i) =>
    o.name === b[i].name && o.args.length === b[i].args.length && o.args.every((v, j) => v === b[i].args[j]));
  forAll(NUM_RUNS, rng, (r) => [arb.transformStr(r)], lensLaws.getPut(opsLens, (a, b) => a === b), "GetPut");
  forAll(NUM_RUNS, rng, (r) => [genA(r), arb.transformStr(r)], lensLaws.putGet(opsLens, eqA), "PutGet");
  forAll(NUM_RUNS, rng, (r) => [genA(r), genA(r), arb.transformStr(r)],
    (a1, a2, s) => eqA(opsLens.get(opsLens.put(a2, opsLens.put(a1, s))), opsLens.get(opsLens.put(a2, s))), "PutPut(get)");
  // the point of the op view: editing one op leaves the others' spelling alone
  forAll(NUM_RUNS, rng, (r) => [arb.transformStr(r)], (s) => {
    const ops = opsLens.get(s);
    if (ops.length < 2) return true;
    const next = ops.map((o, i) => (i === 0 ? { name: o.name, args: o.args.map((v) => v + 1) } : o));
    const out = opsLens.put(next, s);
    for (let i = 1; i < ops.length; i++)
      if (!out.includes(printOp(ops[i])) && !out.includes(s.slice(0, 0))) {
        // the untouched ops must appear verbatim, in their original spelling
        const src = s.match(new RegExp(ops[i].name + "\\\\s*\\\\([^)]*\\\\)"));
        if (src && !out.includes(src[0])) throw new Error(`op ${i} was reprinted: ${s} -> ${out}`);
      }
    return true;
  }, "untouched ops keep their spelling");
  return `✅ GetPut, PutGet strict; PutPut up to get-equivalence; residue per op (${NUM_RUNS} runs each)`;
};

// The gizmo's contract, checked against the matrices rather than against its own arithmetic: rotating
// leaves the centre of the box where it was, and scaling leaves the pivot corner where it was.
// The claim both gizmo gestures make is a fixed point: one point of the element's own geometry lands
// in exactly the same place afterwards. Checked against the composed matrices, so it does not restate
// the arithmetic it is testing. Generated transform lists are kept well conditioned — the property is
// about the geometry, not about float cancellation at 1e6.
const _sl108f = function _test_transform_gizmo(forAll,arb,mulberry32,NUM_RUNS,rotateAbout,scaleAbout,printOp,parseTransform,applyPoint)
{
  const tame = (r) => {
    const n = () => arb.int(r, -200, 200);
    const ops = [];
    if (r() < 0.8) ops.push(`translate(${n()} ${n()})`);
    if (r() < 0.5) ops.push(`rotate(${arb.int(r, -180, 180)})`);
    if (r() < 0.4) ops.push(`scale(${1 + arb.int(r, 1, 20) / 10})`);
    if (r() < 0.2) ops.push(`skewX(${arb.int(r, -60, 60)})`);
    return ops.join(" ");
  };
  const gen = (r) => [tame(r), arb.int(r, -50, 50), arb.int(r, -50, 50),
                      arb.int(r, -180, 180), 1 + arb.int(r, 1, 40) / 10];
  const fixes = (before, after, px, py, what) => {
    const a = applyPoint(parseTransform(before.map(printOp).join(" ")), px, py);
    const b = applyPoint(parseTransform(after.map(printOp).join(" ")), px, py);
    if (Math.abs(a[0] - b[0]) > 1e-6 || Math.abs(a[1] - b[1]) > 1e-6)
      throw new Error(`${what} moved (${px},${py}) from ${a} to ${b}`);
  };
  const parse = (text) => text ? text.split(/(?<=\))\s+/).map((t) => {
    const m = /([a-zA-Z]+)\s*\(([^)]*)\)/.exec(t);
    return { name: m[1], args: m[2].split(/[\s,]+/).filter(Boolean).map(Number) };
  }) : [];

  const rng = mulberry32(0x5EED0017);
  forAll(NUM_RUNS, rng, gen, (text, cx, cy, angle) => {
    const ops = parse(text);
    fixes(ops, rotateAbout(ops, angle, cx, cy), cx, cy, "rotating");
    return true;
  }, "rotation holds its centre still");

  const rng2 = mulberry32(0x5EED0018);
  forAll(NUM_RUNS, rng2, gen, (text, px, py, _a, k) => {
    const ops = parse(text);
    fixes(ops, scaleAbout(ops, k, k * 0.7, px, py), px, py, "scaling");
    return true;
  }, "scaling holds its pivot still");

  // and a repeated drag must not grow the op list without bound
  const rng3 = mulberry32(0x5EED0019);
  forAll(NUM_RUNS, rng3, gen, (text, cx, cy, angle, k) => {
    let ops = parse(text);
    const grown = () => ops.length;
    ops = scaleAbout(rotateAbout(ops, angle, cx, cy), k, k, cx, cy);
    const once = grown();
    for (let i = 0; i < 5; i++) ops = scaleAbout(rotateAbout(ops, angle + i, cx, cy), k, k, cx, cy);
    if (grown() !== once) throw new Error(`repeated gestures grew the transform list: ${text}`);
    return true;
  }, "repeated gestures reuse their ops");

  return `✅ rotation about a centre, scaling about a pivot, bounded op list (${NUM_RUNS} runs each)`;
};

// Creation is geometry, not gesture: whichever corner the drag starts from, the shape it describes is
// the same, and the markup that reaches the source describes the same shape as the preview. Checked
// through the real parser — the markup is inserted into a document and read back with the same lenses
// the editor uses, so a quoting or spelling slip is a failure here.
// Disjoint addresses commute (§propagation). Two attribute puts at different elements are two
// splices into disjoint byte ranges, so the order a multi-selection drag applies them in cannot
// matter. Structural puts are excluded on purpose: they renumber addresses, and do not commute.
const _sl108g = function _test_commands_commute(forAll,arb,mulberry32,NUM_RUNS,tokenize,attrTextLens)
{
  const rng = mulberry32(0x5EED0021);
  const cmd = (i, name, v) => (s) => attrTextLens(i, name, null).put(v, s);
  forAll(NUM_RUNS, rng,
    (r) => [arb.svgDocStr(r), arb.opStr(r), arb.opStr(r), arb.int(r, 0, 9), arb.int(r, 0, 9)],
    (doc, a, b, pi, qi) => {
      const n = tokenize(doc).length;          // 0 is the <svg> itself; children are 1 … n-1
      if (n < 3) return true;                  // need two distinct addresses to say anything
      const p = 1 + (pi % (n - 1));
      let q = 1 + (qi % (n - 1));
      if (q === p) q = 1 + (p % (n - 1));      // n-1 >= 2 here, so this always differs
      const left  = cmd(q, "transform", b)(cmd(p, "transform", a)(doc));
      const right = cmd(p, "transform", a)(cmd(q, "transform", b)(doc));
      if (left !== right)
        throw new Error(`addresses ${p} and ${q} do not commute`);
      return true;
    }, "disjoint attribute commands commute");
  return `✅ attribute puts at disjoint addresses commute (${NUM_RUNS} runs)`;
};

// The shape registry, checked three ways (design note S3). The one the stage names is **resize
// agreement**: a rect corner dragged through the registry (writing `width`) and the same corner
// dragged through the gizmo (writing `transform`) have to leave the shape rendering in the same
// place, or "direct geometry" would quietly mean "a different editor for rects".
// The other two are the registry's own contract: a handle put where it already is writes nothing
// (T1 at the level of one entry), and moving a handle puts it where you asked (PutGet for handles).
// The group policy, headless (S1). T10 checks it through a browser; this checks the function it is
// made of, which is where an off-by-one in "one level deeper" would actually live.
const _sl119e = function _test_scoped_path(forAll,arb,mulberry32,NUM_RUNS,scopedPath)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const TABLE = [
    // [leaf,        scope,     selects]
    [[0, 3, 0],      [0],       [0, 3]],      // at the root a grouped shape is its group
    [[0, 3, 0],      [0, 3],    [0, 3, 0]],   // inside that group it is itself
    [[0, 2],         [0],       [0, 2]],      // a top-level shape is always itself
    [[0, 2],         [0, 3],    [0, 2]],      // ...even with an unrelated group entered
    [[0, 1, 2, 3],   [0, 1],    [0, 1, 2]],   // one level at a time
    [[0, 1, 2, 3],   [0, 1, 2], [0, 1, 2, 3]],
    [[0],            [0],       [0]]          // the root is never a selection
  ];
  for (const [leaf, scope, want] of TABLE)
    if (!eq(scopedPath(leaf, scope), want))
      throw new Error(`scopedPath(${JSON.stringify(leaf)}, ${JSON.stringify(scope)}) = `
                    + `${JSON.stringify(scopedPath(leaf, scope))}, expected ${JSON.stringify(want)}`);

  const rng = mulberry32(0x5EED0041);
  forAll(NUM_RUNS, rng,
    (r) => [Array.from({ length: 1 + arb.int(r, 1, 5) }, (_, i) => (i ? arb.int(r, 0, 4) : 0)),
            arb.int(r, 0, 5)],
    (leaf, depth) => {
      const scope = leaf.slice(0, Math.max(1, Math.min(depth, leaf.length)));
      const sel = scopedPath(leaf, scope);
      // never past the leaf, never above the scope, and exactly one step when there is room
      if (sel.length > leaf.length) throw new Error(`selected deeper than the leaf: ${sel}`);
      if (!scope.every((v, i) => sel[i] === v)) throw new Error(`selected outside the scope: ${sel}`);
      if (leaf.length > scope.length && sel.length !== scope.length + 1)
        throw new Error(`did not descend exactly one level: ${sel} for scope ${scope}`);
      // and it is a fixpoint once the scope has reached the leaf's parent
      if (!eq(scopedPath(leaf, sel), sel.length < leaf.length ? sel.concat(leaf[sel.length]) : sel))
        throw new Error(`re-scoping is not one more step: ${sel}`);
      return true;
    }, "scopedPath descends exactly one level and never leaves its scope");
  return `✅ the group policy: ${TABLE.length} table rows and ${NUM_RUNS} random paths descend one `
       + `level at a time and never escape the scope`;
};

const _sl113t = function _test_shape_registry(forAll,arb,mulberry32,NUM_RUNS,scaleAbout,printOp,parseTransform,applyPoint,svgShapes,shapeLookup,attrTextLens)
{
  const doc = (el) => `<svg xmlns="http://www.w3.org/2000/svg">${el}</svg>`;
  const apply = (src, idx, edits) =>
    edits.reduce((acc, e) => attrTextLens(idx, e.name, null).put(e.value, acc), src);
  const drag = (src, idx, mode, key, lx, ly) => {
    const entry = shapeLookup.forMode(svgShapes, mode);
    const h = entry.handles(src, idx).find((x) => x.key === key);
    if (!h) throw new Error(`no handle ${key} in ${mode}`);
    return [].concat(entry.edit(src, idx, h, lx, ly));
  };
  const at = (src, idx, mode, key) =>
    shapeLookup.forMode(svgShapes, mode).handles(src, idx).find((x) => x.key === key);

  // ---- 1. resize agreement ------------------------------------------------------------------
  const CORNER = { se: [0, 0], sw: [1, 0], ne: [0, 1], nw: [1, 1] };   // which corner is the pivot
  const rng = mulberry32(0x5EED0031);
  forAll(NUM_RUNS, rng,
    (r) => [arb.int(r, -80, 80), arb.int(r, -80, 80), arb.int(r, 10, 90), arb.int(r, 10, 90),
            arb.pick(r, Object.keys(CORNER)), arb.int(r, 5, 120), arb.int(r, 5, 120)],
    (X, Y, W, H, key, dw, dh) => {
      const src = doc(`<rect x="${X}" y="${Y}" width="${W}" height="${H}"/>`);
      const [px, py] = CORNER[key];
      const pivot = [X + px * W, Y + py * H];
      // where the dragged corner is put, always on the far side of the pivot so neither route flips
      const lx = pivot[0] + (px ? -dw : dw), ly = pivot[1] + (py ? -dh : dh);

      const next = apply(src, 1, drag(src, 1, "rect", key, lx, ly));
      const g = shapeLookup.forMode(svgShapes, "rect").handles(next, 1);
      const nw = g.find((h) => h.key === "nw"), se = g.find((h) => h.key === "se");
      const direct = [nw.x, nw.y, se.x, se.y];

      // the same drag as `toolTransform` computes it, applied to the *original* box
      const sx = Math.abs((lx - pivot[0]) / (/w$/.test(key) ? -W : W));
      const sy = Math.abs((ly - pivot[1]) / (/^n/.test(key) ? -H : H));
      const m = parseTransform(scaleAbout([], sx, sy, pivot[0], pivot[1]).map(printOp).join(" "));
      const cs = [[X, Y], [X + W, Y], [X + W, Y + H], [X, Y + H]].map(([x, y]) => applyPoint(m, x, y));
      const via = [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])),
                   Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))];
      if (direct.some((v, i) => Math.abs(v - via[i]) > 1e-6))
        throw new Error(`resizing ${key} disagrees: registry ${direct} vs transform ${via}`);
      return true;
    }, "a registry resize and a transform resize leave the same box");

  // ---- 2. a handle put back where it is writes nothing (T1, per entry) ------------------------
  const SHAPES = [
    ["points", `<polygon points="0,0 40,0 40,30"/>`],
    ["path", `<path d="M 0 0 L 40 0 C 50 10 50 20 40 30 Z"/>`],
    ["rect", `<rect x="10" y="20" width="30" height="40" rx="4"/>`],
    ["circle", `<circle cx="50" cy="60" r="25"/>`],
    ["ellipse", `<ellipse cx="50" cy="60" rx="25" ry="15"/>`],
    ["line", `<line x1="4" y1="8" x2="44" y2="38"/>`]
  ];
  for (const [mode, el] of SHAPES) {
    const src = doc(el);
    const entry = shapeLookup.forMode(svgShapes, mode);
    if (!entry.reads(src, 1)) throw new Error(`${mode} cannot read its own example`);
    for (const h of entry.handles(src, 1)) {
      const edits = [].concat(entry.edit(src, 1, h, h.x, h.y));
      const moved = apply(src, 1, edits);
      if (moved !== src)
        throw new Error(`${mode}: putting handle ${h.key} back where it was rewrote the source:\n${moved}`);
    }
  }

  // ---- 3. moving a handle puts it where you asked (PutGet for handles) ------------------------
  const MOVES = [
    ["points", `<polygon points="0,0 40,0 40,30"/>`, "p1", 55, -12],
    ["path", `<path d="M 0 0 L 40 0 C 50 10 50 20 40 30 Z"/>`, "1:0:0:1", 61, 7],
    ["rect", `<rect x="10" y="20" width="30" height="40"/>`, "se", 70, 90],
    ["rect", `<rect x="10" y="20" width="30" height="40"/>`, "nw", 2, 5],
    ["rect", `<rect x="10" y="20" width="30" height="40"/>`, "e", 70, 40],
    ["rect", `<rect x="10" y="20" width="30" height="40"/>`, "rx", 24, 20],
    ["circle", `<circle cx="50" cy="60" r="25"/>`, "e", 90, 60],
    ["ellipse", `<ellipse cx="50" cy="60" rx="25" ry="15"/>`, "n", 50, 30],
    ["ellipse", `<ellipse cx="50" cy="60" rx="25" ry="15"/>`, "se", 80, 100],
    ["line", `<line x1="4" y1="8" x2="44" y2="38"/>`, "2", -6, 90]
  ];
  for (const [mode, el, key, lx, ly] of MOVES) {
    const src = doc(el);
    const next = apply(src, 1, drag(src, 1, mode, key, lx, ly));
    const h = at(next, 1, mode, key);
    if (!h || Math.abs(h.x - lx) > 1e-6 || Math.abs(h.y - ly) > 1e-6)
      throw new Error(`${mode}: dragging ${key} to (${lx},${ly}) left it at (${h && h.x},${h && h.y})`);
  }

  // ---- 4. partiality: what the registry cannot read, it declines (T8) -------------------------
  const OUTSIDE = [
    ["rect", `<rect x="10" y="20" width="\${w}" height="40"/>`],
    ["rect", `<rect x="10" y="20" height="40"/>`],
    ["circle", `<circle cx="50" cy="60" r="10px"/>`],
    ["polygon", `<polygon points="0,0 40,"/>`]
  ];
  for (const [tag, el] of OUTSIDE) {
    const src = doc(el);
    if (shapeLookup.forTag(svgShapes, tag, src, 1) !== null)
      throw new Error(`the registry claimed an element it cannot read: ${el}`);
  }
  const inside = doc(`<rect x="1" y="2" width="3" height="4"/>`);
  if ((shapeLookup.forTag(svgShapes, "rect", inside, 1) || {}).mode !== "rect")
    throw new Error("the registry declined a rect it can read");

  return `✅ resize agreement (${NUM_RUNS} runs), ${SHAPES.length} entries write nothing when unmoved, `
       + `${MOVES.length} drags land on target, ${OUTSIDE.length} unreadable elements declined`;
};

const _sl125t = function _test_shape_creation(forAll,arb,mulberry32,NUM_RUNS,dragBox,shapeSpec,shapeMarkup,insertElement,childrenLens,attrVal,nodeAt)
{
  const rng = mulberry32(0x5EED001A);
  const gen = (r) => [arb.pick(r, ["rect", "ellipse", "line"]),
                      arb.int(r, -99, 99), arb.int(r, -99, 99), arb.int(r, -99, 99), arb.int(r, -99, 99)];
  const DOC = '<svg viewBox="0 0 10 10">\n  <!-- keep -->\n  <rect x="1"/>\n</svg>';

  forAll(NUM_RUNS, rng, gen, (kind, x0, y0, x1, y1) => {
    const spec = shapeSpec(kind, x0, y0, x1, y1);
    const doc = insertElement(DOC, [0], null, shapeMarkup(kind, x0, y0, x1, y1));
    const kids = childrenLens([0]).get(doc);
    if (kids.length !== 2) throw new Error("creation did not add exactly one element");
    const idx = nodeAt(doc, [0, 1]).index;               // the element just appended
    for (const k in spec.attrs) {
      const got = attrVal(doc, idx, k);
      if (Number(got) !== Number(spec.attrs[k]) && got !== String(spec.attrs[k]))
        throw new Error(`${kind}: ${k} read back as ${got}, preview says ${spec.attrs[k]}`);
    }
    if (doc.indexOf("<!-- keep -->") === -1) throw new Error("residue lost");
    return true;
  }, "the committed markup is the previewed shape");

  const rng2 = mulberry32(0x5EED001B);
  forAll(NUM_RUNS, rng2, gen, (kind, x0, y0, x1, y1) => {
    if (kind === "line") return true;                    // a line is directed: its ends are not a box
    const a = shapeSpec(kind, x0, y0, x1, y1);
    const b = shapeSpec(kind, x1, y1, x0, y0);           // the same box, dragged the other way
    for (const k in a.attrs) if (a.attrs[k] !== b.attrs[k])
      throw new Error(`${kind}: dragging from the opposite corner changed ${k}`);
    const box = dragBox(x0, y0, x1, y1, true);
    if (box.width !== box.height) throw new Error("shift-drag is not square");
    return true;
  }, "drag direction does not change the shape");
  return `✅ preview matches committed markup; drag is corner-symmetric (${NUM_RUNS} runs each)`;
};

// Z-order is stated against the paint model: SVG paints in document order, so "front" is last, and
// raising the frontmost element is a no-op rather than an error. Checked by actually reordering the
// children and reading back where the element landed relative to its siblings.
const _sl119t = function _test_z_order(forAll,arb,mulberry32,NUM_RUNS,zTarget,reorderElement,childrenLens)
{
  const rng = mulberry32(0x5EED001C);
  const gen = (r) => {
    const n = arb.int(r, 2, 6);
    const kids = Array.from({ length: n }, (_, i) => `<rect id="r${i}"/>`);
    return [`<svg>\n  ${kids.join("\n  ")}\n</svg>`, arb.int(r, 0, n - 1),
            arb.pick(r, ["front", "back", "raise", "lower"])];
  };
  forAll(NUM_RUNS, rng, gen, (doc, from, kind) => {
    const kids = childrenLens([0]).get(doc);
    const me = kids[from];
    const to = zTarget(kind, from, kids.length);
    const after = childrenLens([0]).get(reorderElement(doc, [0, from], to));
    const now = after.indexOf(me);
    if (kind === "front" && now !== after.length - 1) throw new Error("front is not last");
    if (kind === "back" && now !== 0) throw new Error("back is not first");
    if (kind === "raise" && now !== Math.min(kids.length - 1, from + 1)) throw new Error("raise moved by more than one");
    if (kind === "lower" && now !== Math.max(0, from - 1)) throw new Error("lower moved by more than one");
    if (after.length !== kids.length) throw new Error("z-order changed the child count");
    return true;
  }, "z-order");
  return `✅ front/back/raise/lower against document paint order, clamped at the ends (${NUM_RUNS} runs)`;
};

// The domain boundary itself, without a DOM: what is refused, what is not, and that refusal reaches
// every entry point rather than only the one that happened to be checked.
const _sl74t = function _test_domain_boundary(outsideDomain,parseDoc,tokenize,childrenLens)
{
  const NS = 'xmlns="http://www.w3.org/2000/svg"';
  // Built, never written literally: this module lives inside a <scr…ipt type="text/plain"> block, and
  // an HTML parser that sees `<!--` followed by a script tag stops looking for the block's end.
  const SC = "scr" + "ipt", ST = "st" + "yle";
  const inside = [
    `<svg ${NS}><rect x="1" data-gt="a>b"/></svg>`,
    `<svg ${NS}><!-- a <${SC}> written in a comment is just text --><rect/></svg>`,
    `<svg ${NS}><text>&amp; &lt; &#65;</text></svg>`,
    `<svg ${NS}><rect data-q='say "hi"'/></svg>`
  ];
  const outside = [
    `<svg ${NS}><![CDATA[ <rect/> ]]></svg>`,
    `<svg ${NS}><${ST}>a{}</${ST}></svg>`,
    `<svg ${NS}><${SC}>a &lt; b</${SC}></svg>`,
    `<svg ${NS}><foreignObject><div>hi</div></foreignObject></svg>`,
    `<!DOCTYPE svg [<!ENTITY x "y">]><svg ${NS}/>`
  ];
  for (const s of inside) {
    if (outsideDomain(s)) throw new Error(`refused a document it can handle: ${s}`);
    parseDoc(s);                                       // must not throw
  }
  for (const s of outside) {
    if (!outsideDomain(s)) throw new Error(`accepted a document it cannot handle: ${s}`);
    for (const [name, f] of [["parseDoc", parseDoc], ["tokenize", tokenize],
                             ["childrenLens", (d) => childrenLens([0]).get(d)]]) {
      let msg = null;
      try { f(s); } catch (e) { msg = e.message; }
      if (!msg || !/outside the svg-lens domain/.test(msg))
        throw new Error(`${name} did not refuse loudly: ${msg}`);
    }
  }
  return `✅ ${inside.length} accepted, ${outside.length} refused at every entry point`;
};

// Units are residue: moving a number must not change what the number *means*. `50%` edited to 60
// stays a percentage; `12px` stays px. Plus the laws on both new lenses, and the precedence rule that
// setting a property already in `style=""` edits the declaration instead of adding a losing attribute.
const _sl31t = function _test_units_and_style(forAll,arb,mulberry32,NUM_RUNS,lengthLens,parseLength,printLength,styleLens,parseStyle,setProperty)
{
  const UNITS = ["", "px", "pt", "cm", "mm", "in", "em", "ex", "ch", "rem", "vw", "vh", "%"];
  const rng = mulberry32(0x5EED001E);
  const gen = (r) => [arb.int(r, -999, 999) / (arb.pick(r, [1, 2, 10, 100])),
                      arb.pick(r, UNITS), arb.pick(r, ["", " ", "  "]), arb.int(r, -50, 50)];

  forAll(NUM_RUNS, rng, gen, (n, unit, pad, next) => {
    const s = `${pad}${n}${unit}${pad}`;
    if (lengthLens.get(s) !== n) throw new Error(`get ${JSON.stringify(s)} ≠ ${n}`);
    if (lengthLens.put(n, s) !== s) throw new Error("GetPut: an unchanged number must keep its spelling");
    const out = lengthLens.put(next, s);
    if (lengthLens.get(out) !== next) throw new Error("PutGet");
    if (parseLength(out).unit !== unit) throw new Error(`unit lost: ${JSON.stringify(out)}`);
    if (lengthLens.put(next, lengthLens.put(n + 1, s)) !== lengthLens.put(next, s)) throw new Error("PutPut");
    if (printLength(parseLength(out)) !== out.trim()) throw new Error("print/parse not exact");
    return true;
  }, "lengths keep their unit");

  for (const bad of ["", "abc", "12 34", "12pxx", "%", "12%%"]) {
    let threw = false;
    try { parseLength(bad); } catch (e) { threw = true; }
    if (!threw) throw new Error(`parseLength accepted ${JSON.stringify(bad)}`);
  }

  const rng2 = mulberry32(0x5EED001F);
  const decls = (r) => Array.from({ length: arb.int(r, 0, 4) }, (_, i) =>
    [arb.pick(r, ["fill", "stroke", "opacity", "stroke-width"]) + (i ? `-${i}` : ""), String(arb.int(r, 0, 99))]);
  forAll(NUM_RUNS, rng2, (r) => [decls(r), decls(r)], (a, b) => {
    const s = a.map(([k, v]) => `${k}: ${v}`).join("; ");
    if (styleLens.put(styleLens.get(s), s) !== s) throw new Error("GetPut");
    const got = styleLens.get(styleLens.put(b, s));
    if (JSON.stringify(got) !== JSON.stringify(b)) throw new Error("PutGet");
    if (styleLens.put(b, styleLens.put(a, s)) !== styleLens.put(b, s)) throw new Error("PutPut");
    return true;
  }, "style declarations");

  // Precedence: a declaration wins over an attribute, so the setter must edit the declaration.
  const styled = '<svg><rect style="fill: red; opacity: .5"/></svg>';
  const w1 = setProperty(styled, 1, "fill", "blue");
  if (w1.name !== "style") throw new Error("wrote a fill attribute that the style would override");
  if (parseStyle(w1.value).map(([k, v]) => k + "=" + v).join(",") !== "fill=blue,opacity=.5")
    throw new Error(`declaration not edited in place: ${w1.value}`);
  const plain = '<svg><rect fill="red"/></svg>';
  if (setProperty(plain, 1, "fill", "blue").name !== "fill") throw new Error("should write the attribute");
  const neither = '<svg><rect style="opacity: 1"/></svg>';
  if (setProperty(neither, 1, "fill", "blue").name !== "fill")
    throw new Error("an unrelated declaration must not capture the write");
  return `✅ lengths keep px/%/em, style laws hold, a property is set where it already lives (${NUM_RUNS} runs)`;
};

// The slot model for interpolated templates: which numbers in an attribute belong to the source and
// which to an expression, and what a gesture is allowed to do to each. The claim under test is the
// safety one — a hole's bytes come back verbatim, always — plus the reporting one: a gesture that
// wanted to move a hole is told so rather than having its change dropped in silence.
const _sl71t = function _test_interpolation_slots(holeSpans,slotsOf,mergeInterpolated,literalSpan,literalLens)
{
  const kinds = (t) => slotsOf(t).map((s) => s.kind).join(",");
  if (kinds("translate(${x} 10)") !== "hole,num") throw new Error(kinds("translate(${x} 10)"));
  if (kinds("translate(10 20)") !== "num,num") throw new Error("literal slots misread");
  if (kinds("${a}") !== "hole") throw new Error("whole-hole misread");
  // Numbers inside an expression belong to the expression, not to the drawing.
  if (kinds("${Math.sin(t) * 10}") !== "hole") throw new Error("numbers inside a hole are not slots");
  if (kinds("${ {a: 1} }") !== "hole") throw new Error("nested braces must not end the hole early");
  if (holeSpans("a ${unterminated").length !== 0) throw new Error("an unterminated hole is just text");

  // Mixed: the literal moves, the expression does not, and the caller is told which.
  const mixed = mergeInterpolated("translate(${x} 10)", "translate(37 10)", "translate(45 14)");
  if (mixed.text !== "translate(${x} 14)") throw new Error(`mixed put wrote ${mixed.text}`);
  if (mixed.locked.join() !== "0") throw new Error("the moved hole was not reported");
  // Not moving the hole is not a lock.
  const clean = mergeInterpolated("translate(${x} 10)", "translate(37 10)", "translate(37 14)");
  if (clean.locked.length) throw new Error("an untouched hole must not be reported as locked");
  if (clean.text !== "translate(${x} 14)") throw new Error(clean.text);
  // Shape mismatch (the expression rendered more or fewer numbers than there are slots): refuse.
  const odd = mergeInterpolated("translate(${p})", "translate(1 2)", "translate(3 4)");
  if (odd.text !== "translate(${p})" || !odd.reason) throw new Error("a shape mismatch must refuse");
  // Whatever happens, the hole's bytes survive byte for byte.
  for (const src of ["${x}", "translate(${x} 10)", "M ${a} 0 L 10 ${b}", "rotate(${a + 1} 2 3)"]) {
    const n = (src.match(/\$\{[^}]*\}/g) || []).length;
    const rendered = src.replace(/\$\{[^}]*\}/g, "7");
    const out = mergeInterpolated(src, rendered, rendered.replace(/7/g, "9").replace(/(\d+)/g, "$1"));
    if ((out.text.match(/\$\{[^}]*\}/g) || []).length !== n)
      throw new Error(`a hole was lost writing ${src}`);
  }

  // And the cell-level domain: an interpolation inside an attribute is in, one between tags is out.
  const cell = (body) => `function _d(svgLens, svg, x) {return (svgLens(svg\`${body}\`));}`;
  const ok = cell('<svg><rect x="${x}"/></svg>');
  if (literalLens("svgLens").get(ok) !== '<svg><rect x="${x}"/></svg>') throw new Error("attribute hole rejected");
  let threw = false;
  try { literalSpan(cell('<svg>${shapes}</svg>'), "svgLens"); } catch (e) { threw = /would not line up/.test(e.message); }
  if (!threw) throw new Error("an interpolation in element position must be refused");
  return "✅ slots classified, literals written, expressions preserved byte for byte and reported";
};

// Following a reference is selection, not editing: the point is to reach the gradient or the symbol
// that actually paints the shape you clicked.
const _sl74u = function _test_refs(refsOf,pathOfId)
{
  const doc = [
    '<svg>',
    '  <defs>',
    '    <linearGradient id="g1"><stop offset="0"/></linearGradient>',
    '    <rect id="tile" width="4" height="4"/>',
    '  </defs>',
    '  <rect fill="url(#g1)" clip-path="url( #missing )"/>',
    '  <use href="#tile"/>',
    '</svg>'
  ].join("\n");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!eq(pathOfId(doc, "g1"), [0, 0, 0])) throw new Error(`gradient at ${JSON.stringify(pathOfId(doc, "g1"))}`);
  if (pathOfId(doc, "nope") !== null) throw new Error("an absent id must resolve to null");
  const refs = refsOf(doc, [0, 1]);
  const fill = refs.find((r) => r.attribute === "fill");
  if (!fill || fill.id !== "g1" || !eq(fill.path, [0, 0, 0])) throw new Error("url(#id) not followed");
  const missing = refs.find((r) => r.attribute === "clip-path");
  if (!missing || missing.path !== null) throw new Error("a dangling reference must report a null target");
  const use = refsOf(doc, [0, 2]).find((r) => r.attribute === "href");
  if (!use || !eq(use.path, [0, 0, 1])) throw new Error("href=\"#id\" not followed");
  if (refsOf(doc, [0, 0, 1]).length !== 0) throw new Error("an id attribute is not a reference");
  return "✅ url(#id) and href=#id resolve to a path; dangling references say so";
};

// G2/G4/G5. The gradient-editing surface, headless: per-tag fields exist and are typed right; add-stop
// lands a stop at the midpoint of the widest offset gap with the left stop's colour; delete-stop obeys
// the >=2 minimum (T8). A command delta is `{apply, select}`, so this exercises the real plan with a
// tiny env and no DOM — the same way the structural-command law does.
const _sl303t = function _test_gradient_stops(svgFields,cmdStop,nodeAt)
{
  const doc = [
    '<svg>',
    '  <defs>',
    '    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">',
    '      <stop offset="0" stop-color="#f00"/>',
    '      <stop offset="1" stop-color="#00f"/>',
    '    </linearGradient>',
    '  </defs>',
    '  <rect fill="url(#g1)" width="10" height="10"/>',
    '</svg>'
  ].join("\n");
  const gp = [0, 0, 0];
  const props = (tag) => svgFields.forTag(tag).map((f) => f.prop);
  const offOf = (c) => (c.attrs && c.attrs.offset ? c.attrs.offset.value : null);
  const colOf = (c) => (c.attrs && c.attrs["stop-color"] ? c.attrs["stop-color"].value : null);
  const stopsOf = (src) => nodeAt(src, gp).children.filter((c) => c.tag === "stop");
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // G2/G5: per-tag fields, correctly typed
  if (!props("stop").includes("stop-color") || !props("stop").includes("offset"))
    throw new Error("stop is missing stop-color/offset fields");
  if (svgFields.forTag("stop").find((f) => f.prop === "stop-color").kind !== "color")
    throw new Error("stop-color must be a colour field");
  if (!props("linearGradient").includes("gradientUnits") || !props("linearGradient").includes("x2"))
    throw new Error("linearGradient is missing gradientUnits/x2 fields");
  if (props("rect")[0] !== "fill") throw new Error("a shape must still get the universal paint fields");
  // G4 add: midpoint of the 0..1 gap, colour copied from the left stop, selection lands on the new stop
  const add = cmdStop("add").plan({ src: doc, paths: [gp] });
  if (!add) throw new Error("add-stop declined on a two-stop gradient");
  const added = add.apply(doc);
  const s2 = stopsOf(added);
  if (s2.length !== 3) throw new Error(`add-stop produced ${s2.length} stops, want 3`);
  if (offOf(s2[1]) !== "0.5") throw new Error(`new stop at offset ${offOf(s2[1])}, want 0.5`);
  if (colOf(s2[1]) !== "#f00") throw new Error("new stop did not copy the left stop's colour");
  if (!eq(add.select(), [[0, 0, 0, 1]])) throw new Error(`add-stop selects ${JSON.stringify(add.select())}`);
  // G4 delete: declines at 2 (T8), removes one at 3
  if (cmdStop("delete").plan({ src: doc, paths: [[0, 0, 0, 0]] }) !== null)
    throw new Error("delete-stop must decline at two stops (T8)");
  const del = cmdStop("delete").plan({ src: added, paths: [[0, 0, 0, 1]] });
  if (!del) throw new Error("delete-stop declined at three stops");
  if (stopsOf(del.apply(added)).length !== 2) throw new Error("delete-stop did not remove a stop");
  // add-stop declines on a plain shape
  if (cmdStop("add").plan({ src: doc, paths: [[0, 1]] }) !== null)
    throw new Error("add-stop must decline on a non-gradient");
  return "✅ per-tag fields; add-stop midpoint+colour+selection; delete-stop >=2 guard";
};

// G6. The gradient-gizmo geometry, headless: default handle positions, the drag inverse, percentage
// parsing, and the radial centre/radius pair. The DOM mapping (fraction -> canvas via ctx) is not
// here — only the pure model the interactive gizmo drives, which is what a law can pin.
const _sl304t = function _test_gradient_gizmo(gradientGizmo)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lin = gradientGizmo.handles("linearGradient", { x1: "0", y1: "0", x2: "1", y2: "0" });
  if (!eq(lin, [{ key: "p1", x: 0, y: 0 }, { key: "p2", x: 1, y: 0 }])) throw new Error("linear default handles: " + JSON.stringify(lin));
  const pct = gradientGizmo.handles("linearGradient", { x2: "100%", y2: "50%" });
  if (pct[1].x !== 1 || pct[1].y !== 0.5) throw new Error("percentage did not parse to a fraction");
  const w = gradientGizmo.writeFor("linearGradient", {}, "p2", 0.5, 0.25);
  if (!eq(w, [{ prop: "x2", num: 0.5 }, { prop: "y2", num: 0.25 }])) throw new Error("p2 drag writes wrong attrs");
  const rad = gradientGizmo.handles("radialGradient", { cx: "0.5", cy: "0.5", r: "0.5" });
  if (!eq(rad, [{ key: "c", x: 0.5, y: 0.5 }, { key: "r", x: 1, y: 0.5 }])) throw new Error("radial handles: " + JSON.stringify(rad));
  const rw = gradientGizmo.writeFor("radialGradient", { cx: "0.5", cy: "0.5" }, "r", 1, 0.5);
  if (rw[0].prop !== "r" || Math.abs(rw[0].num - 0.5) > 1e-9) throw new Error("radius drag: " + JSON.stringify(rw));
  return "✅ gizmo handles + drag inverse (linear, radial, %)";
};

// Snapping's claim: after applying the returned delta, some edge or centre of the moving box lies
// exactly on one of the target box's, and it is the nearest such line within tolerance. Checked by
// re-measuring the moved box, not by re-deriving the arithmetic.
const _sl127t = function _test_snapRects(forAll,arb,mulberry32,NUM_RUNS,snapRects)
{
  const rng = mulberry32(0x5EED001D);
  const box = (r) => ({ x: arb.int(r, -100, 100), y: arb.int(r, -100, 100),
                        width: arb.int(r, 1, 60), height: arb.int(r, 1, 60) });
  const linesOf = (b) => [b.x, b.x + b.width / 2, b.x + b.width];
  const rowsOf = (b) => [b.y, b.y + b.height / 2, b.y + b.height];
  const TOL = 6;

  forAll(NUM_RUNS, rng, (r) => [box(r), box(r), box(r)], (m, a, b) => {
    const s = snapRects(m, [a, b], TOL);
    if (Math.abs(s.dx) > TOL || Math.abs(s.dy) > TOL) throw new Error("moved further than the tolerance");
    const moved = { ...m, x: m.x + s.dx, y: m.y + s.dy };
    const near = (mine, theirs) => mine.some((p) => theirs.some((q) => Math.abs(p - q) < 1e-9));
    const others = [a, b];
    if (s.snapped.x && !near(linesOf(moved), others.flatMap(linesOf)))
      throw new Error("claimed an x snap but nothing lines up");
    if (s.snapped.y && !near(rowsOf(moved), others.flatMap(rowsOf)))
      throw new Error("claimed a y snap but nothing lines up");
    // And it must not miss one: if some line was within tolerance, it must have snapped.
    const couldX = linesOf(m).some((p) => others.flatMap(linesOf).some((q) => Math.abs(q - p) <= TOL));
    if (couldX && !s.snapped.x) throw new Error("missed an x alignment inside the tolerance");
    if (s.guides.length !== (s.snapped.x ? 1 : 0) + (s.snapped.y ? 1 : 0))
      throw new Error("one guide per snapped axis");
    return true;
  }, "snapping");

  const nothing = snapRects({ x: 0, y: 0, width: 10, height: 10 }, [{ x: 500, y: 500, width: 1, height: 1 }], TOL);
  if (nothing.dx || nothing.dy || nothing.guides.length) throw new Error("snapped to something far away");
  const already = snapRects({ x: 0, y: 0, width: 10, height: 10 }, [{ x: 0, y: 0, width: 10, height: 10 }], TOL);
  if (already.dx !== 0 || !already.snapped.x) throw new Error("an already-aligned box must report a snap of 0");
  return `✅ snaps to the nearest line within tolerance, never misses one, one guide per axis (${NUM_RUNS} runs)`;
};

// A selection must never contain both a group and something inside it, or a drag translates the
// inner element twice — once with its group, once on its own. Found by rubber-banding the demo.
const _sl119u = function _test_topmost_selection(topmostPaths)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const t = (input, want, why) => {
    const got = topmostPaths(input);
    if (!eq(got, want)) throw new Error(`${why}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
  };
  t([[0, 3], [0, 3, 0], [0, 3, 1]], [[0, 3]], "children of a selected group must drop out");
  t([[0, 3, 0], [0, 3]], [[0, 3]], "order must not matter");
  t([[0, 1], [0, 2]], [[0, 1], [0, 2]], "siblings are all topmost");
  t([[0, 3, 0], [0, 4]], [[0, 3, 0], [0, 4]], "an unselected group does not absorb its child");
  t([[0, 1], [0, 1]], [[0, 1], [0, 1]], "an exact duplicate is not a nesting");
  t([[0, 12], [0, 1, 0]], [[0, 12], [0, 1, 0]], "prefixes are per component, not per character");
  return "✅ a selection never holds a group and its own descendant";
};

// The pen writes an ordinary `d` attribute, so a half-drawn path is always a real path. Closing is
// idempotent — a double click on the first anchor must not append two Zs.
const _sl126t = function _test_pen_path(penPath,parsePath,printPath,pathSegments,pointOnSegment)
{
  const d0 = penPath.start(3, 4);
  if (printPath(parsePath(d0)) !== "M 3 4") throw new Error(`start is not a moveto: ${d0}`);
  let d = d0;
  for (const [x, y] of [[10, 4], [10, 12], [3, 12]]) d = penPath.lineTo(d, x, y);
  const cmds = parsePath(d);
  if (cmds.length !== 4) throw new Error(`four anchors, ${cmds.length} commands`);
  if (cmds.slice(1).some((c) => c.c !== "L")) throw new Error("anchors after the first are not linetos");
  const closed = penPath.close(d);
  if (parsePath(closed).slice(-1)[0].c !== "Z") throw new Error("close did not append Z");
  if (penPath.close(closed) !== closed) throw new Error("close is not idempotent");
  if (penPath.close("M 1 2 L 3 4 z") !== "M 1 2 L 3 4 z") throw new Error("an already-closed path was reclosed");

  // G19: the same builder makes curves. A handle is a point; `mirror` is what makes the pair
  // symmetric, and it must be an involution or dragging one handle would drift the other.
  const P = [10, 10], Q = [16, 4];
  const m = penPath.mirror(P, Q);
  if (penPath.mirror(P, m).join() !== Q.join()) throw new Error("mirror is not an involution");
  if (penPath.mirror(P, P).join() !== P.join()) throw new Error("an undragged handle did not stay put");

  const curved = penPath.curveTo(penPath.start(0, 0), [10, 0], [20, 30], 30, 30);
  const cc = parsePath(curved);
  if (cc.length !== 2 || cc[1].c !== "C") throw new Error(`curveTo did not emit a cubic: ${curved}`);
  if (printPath(cc) !== "M 0 0 C 10 0 20 30 30 30") throw new Error(`curveTo does not round-trip: ${printPath(cc)}`);

  // A cubic whose handles sit on their own anchors *is* the straight line between them — which is why
  // one function covers a click after a drag without a case of its own. Sampled, not asserted.
  const straight = penPath.curveTo(penPath.start(0, 0), [0, 0], [12, 8], 12, 8);
  const segs = pathSegments(parsePath(straight));
  for (const t of [0.25, 0.5, 0.75]) {
    const [x, y] = pointOnSegment(segs[0], t);
    // handles at [0,0] and the far anchor: the curve leaves straight and arrives straight, so it
    // stays inside the chord's box and hits the far end exactly.
    if (x < -1e-9 || x > 12 + 1e-9 || y < -1e-9 || y > 8 + 1e-9)
      throw new Error(`a degenerate cubic left its chord's box at t=${t}: ${x},${y}`);
  }
  const [ex, ey] = pointOnSegment(segs[0], 1);
  if (Math.abs(ex - 12) > 1e-9 || Math.abs(ey - 8) > 1e-9)
    throw new Error(`a cubic does not end on its anchor: ${ex},${ey}`);
  if (parsePath(penPath.close(curved)).slice(-1)[0].c !== "Z") throw new Error("a curve cannot be closed");
  return "✅ pen builds a parseable path anchor by anchor, straight or curved; mirror is an "
       + "involution, a handle-less cubic is its own chord, and close is idempotent";
};

// Subdivision must be invisible: the curve through the new anchor is the curve that was there. This
// samples the whole path densely and compares point for point, which also catches the subtle failure
// — a following S or T reflecting a control point the split moved, bending the *next* segment.
const _sl108d = function _test_path_subdivision_exact(forAll,arb,mulberry32,NUM_RUNS,parsePath,printPath,pathSegments,pointOnSegment,splitPathSegment,deletePathAnchor)
{
  const rng = mulberry32(0x5EED0014);
  // Paths of curves and lines, deliberately mixing absolute, relative and smooth spellings, since
  // those are exactly the cases where a naive split leaks.
  const gen = (r) => {
    const n = arb.int(r, 1, 4);
    const num = () => arb.int(r, -80, 80);
    let d = `M ${num()} ${num()}`;
    for (let i = 0; i < n; i++) {
      switch (arb.int(r, 0, 5)) {
        case 0: d += ` L ${num()} ${num()}`; break;
        case 1: d += ` l ${num()} ${num()}`; break;
        case 2: d += ` C ${num()} ${num()}, ${num()} ${num()}, ${num()} ${num()}`; break;
        case 3: d += ` c ${num()} ${num()}, ${num()} ${num()}, ${num()} ${num()}`; break;
        case 4: d += ` S ${num()} ${num()}, ${num()} ${num()}`; break;
        default: d += ` q ${num()} ${num()}, ${num()} ${num()}`; break;
      }
    }
    if (r() < 0.4) d += " Z";
    return [d, r(), arb.int(r, 0, 9)];
  };
  // Sampling the whole path and comparing point-for-point does NOT work: a split reparameterises the
  // curve, so the original sample points land at different t. The exact claim is per segment — the
  // two halves traverse the original at a known change of parameter — plus: every other segment is
  // untouched. Comparing at equal t is only valid within a segment.
  const near = (p, q) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9;
  const sameSeg = (a, b) => Array.from({ length: 9 }, (_, k) => k / 8)
    .every((u) => near(pointOnSegment(a, u), pointOnSegment(b, u)));

  forAll(NUM_RUNS, rng, gen, (d, t0, which) => {
    const cmds = parsePath(d);
    const before = pathSegments(cmds);
    if (!before.length) return true;
    const i = which % before.length;
    if (before[i].kind === "A") return true;
    const t = 0.05 + t0 * 0.9;
    // it must survive a print/parse round trip, since that is how it reaches the source
    const after = pathSegments(parsePath(printPath(splitPathSegment(cmds, i, t))));
    if (after.length !== before.length + 1)
      throw new Error(`subdivision changed the segment count for ${d}`);
    for (let k = 0; k < i; k++)
      if (!sameSeg(after[k], before[k])) throw new Error(`segment ${k} moved, before the split`);
    for (let k = i + 1; k < before.length; k++)
      if (!sameSeg(after[k + 1], before[k])) throw new Error(`segment ${k} moved, after the split`);
    for (let k = 0; k <= 8; k++) {                      // the halves retrace the original curve
      const u = k / 8;
      if (!near(pointOnSegment(after[i], u), pointOnSegment(before[i], u * t)))
        throw new Error(`first half of ${d} at segment ${i} is not the original curve`);
      if (!near(pointOnSegment(after[i + 1], u), pointOnSegment(before[i], t + u * (1 - t))))
        throw new Error(`second half of ${d} at segment ${i} is not the original curve`);
    }
    return true;
  }, "subdivision is exact");

  // Deleting an anchor removes exactly one, and leaves everything before it alone. Restoring the
  // original geometry only holds for straight segments: dropping an anchor between two curves
  // genuinely changes the shape, which is what every other editor does too.
  const rng2 = mulberry32(0x5EED0015);
  forAll(NUM_RUNS, rng2, gen, (d, t0, which) => {
    const cmds = parsePath(d);
    const before = pathSegments(cmds);
    if (before.filter((s) => s.kind !== "Z").length < 2) return true;
    const i = which % before.length;
    if (before[i].kind === "A" || before[i].kind === "Z") return true;
    const split = parsePath(printPath(splitPathSegment(cmds, i, 0.05 + t0 * 0.9)));
    const back = pathSegments(parsePath(printPath(deletePathAnchor(split, i))));
    if (back.length !== before.length) throw new Error("delete did not remove exactly one anchor");
    for (let k = 0; k < i; k++)
      if (!sameSeg(back[k], before[k])) throw new Error(`segment ${k} moved when deleting anchor ${i}`);
    if (before[i].kind === "L" && !sameSeg(back[i], before[i]))
      throw new Error(`splitting and unsplitting a straight segment changed it: ${d}`);
    return true;
  }, "deleting an anchor");

  return `✅ subdivision is exact, deletion removes one anchor (${NUM_RUNS} runs each)`;
};

// rebasePath is checked against ground truth, not against a restatement of its own rules: take a real
// document, note the source text at a path, apply the command, and assert the rebased path addresses
// that same element afterwards. If the two ever disagree the selection lands on the wrong shape.
const _sl108c = function _test_rebasePath(forAll,arb,mulberry32,NUM_RUNS,rebasePath,nodeAt,childrenLens,insertElement,deleteElement,reorderElement)
{
  const rng = mulberry32(0x5EED0013);
  const MARK = '<circle cx="7" cy="7" r="3"/>';
  const kidsOf = (d) => childrenLens([0]).get(d);
  const gen = (r) => {
    const doc = arb.svgDocStr(r);
    const n = kidsOf(doc).length;
    return [doc, arb.int(r, 0, Math.max(0, n - 1)), arb.int(r, 0, n), arb.int(r, 0, Math.max(0, n - 1))];
  };
  const follows = (doc, path, next, op) => {
    const was = (() => { const n = nodeAt(doc, path); return doc.slice(n.start, n.end); })();
    const to = rebasePath(path, op);
    if (to === null) return null;                       // caller must treat this as "deleted"
    const n = nodeAt(next, to);
    if (next.slice(n.start, n.end) !== was)
      throw new Error(`rebased ${path.join("/")} -> ${to.join("/")} lands on the wrong element`);
    return to;
  };
  forAll(NUM_RUNS, rng, gen, (doc, i, at, to) => {
    const kids = kidsOf(doc);
    if (!kids.length) return true;
    const every = kids.map((_, j) => [0, j]);           // every sibling, not just the edited one

    const ins = insertElement(doc, [0], at, MARK);
    for (const p of every)
      if (follows(doc, p, ins, { kind: "insert", parent: [0], at }) === null)
        throw new Error("insert never deletes anything");

    const dpath = [0, Math.min(at, kids.length - 1)];
    const del = deleteElement(doc, dpath);
    for (const p of every) {
      const gone = follows(doc, p, del, { kind: "delete", path: dpath }) === null;
      if (gone !== (p[1] === dpath[1])) throw new Error("delete lost the wrong element");
    }

    if (kids.length > 1) {                              // a move is a permutation: nobody is lost
      const t = Math.min(to, kids.length - 1);
      const mv = reorderElement(doc, [0, i], t);
      for (const p of every)
        if (follows(doc, p, mv, { kind: "move", path: [0, i], to: t }) === null)
          throw new Error("move never deletes anything");
    }
    return true;
  }, "rebasePath follows the element");
  return `✅ selection follows its element across insert, delete and move (${NUM_RUNS} runs)`;
};

// S4's falsifier, first half: `group ∘ ungroup ≠ id (modulo whitespace)`. Two qualifications, and the
// property test forced both on run 2 rather than my noticing them:
//
//   - **modulo whitespace**, because grouping indents what it swallows. The strict form is therefore
//     *counted* and reported rather than required, which is how a residue regression shows up as a
//     number falling instead of as a test that was never checking anything.
//   - **for a contiguous selection**. Group two elements with a third between them and that third
//     cannot stay between them — they are one object now. Grouping non-adjacent siblings brings them
//     together at the topmost member's depth, which is what every editor does and is a fact about
//     grouping rather than a defect in this one. So the general law is the weaker, true one: the same
//     children come back, in the same relative order, gathered where the group was.
//
// The last part is T7 for the new commands, by `test_rebasePath`'s ground-truth method: not "does the
// rebase follow the rules I wrote" but "does the rebased address slice out the same bytes".
//
// The second half is T7 for the new commands, by `test_rebasePath`'s ground-truth method: not "does
// the rebase follow the rules I wrote" but "does the rebased address slice out the same bytes".
const _sl252 = function _test_group_ungroup(forAll,arb,mulberry32,NUM_RUNS,groupPlan,groupElements,ungroupElements,ungroupBlockers,childrenLens,nodeAt,cmdGroup)
{
  const rng = mulberry32(0x5EED0021);
  const ws = (t) => t.replace(/\s+/g, " ").trim();
  const gen = (r) => {
    const doc = arb.svgDocStr(r);
    const n = childrenLens([0]).get(doc).length;
    return [doc, arb.int(r, 0, Math.max(0, n - 1)), arb.int(r, 0, Math.max(0, n - 1))];
  };
  let exact = 0, runs = 0, cont = 0;
  forAll(NUM_RUNS, rng, gen, (doc, a, b) => {
    const kids = childrenLens([0]).get(doc);
    if (kids.length < 2) return true;
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const paths = [...new Set([lo, hi])].map((i) => [0, i]);
    const { at } = groupPlan(paths);
    const gpath = [0, at];

    const g = groupElements(doc, paths);
    const n = nodeAt(g, gpath);
    if (n.tag !== "g") throw new Error(`the group landed at ${gpath.join("/")}, where a <${n.tag}> is`);
    if (childrenLens(gpath).get(g).length !== paths.length)
      throw new Error("the group does not hold exactly what was selected");
    if (ungroupBlockers(g, gpath).length)
      throw new Error(`a group this command made cannot be undone: ${ungroupBlockers(g, gpath)}`);

    // T7, generalised: every sibling — moved into the group or merely shifted — must still be
    // findable at the address the command says it has, and must be the same bytes.
    const rebase = cmdGroup.plan({ paths, src: doc, options: {} }).rebase;
    for (let j = 0; j < kids.length; j++) {
      const p = [0, j], to = rebase(p);
      if (to === null) throw new Error(`grouping deleted ${p.join("/")}, which it must not`);
      const m = nodeAt(g, to);
      if (g.slice(m.start, m.end) !== kids[j])
        throw new Error(`rebased ${p.join("/")} -> ${to.join("/")} lands on the wrong element`);
    }

    const back = ungroupElements(g, gpath);
    const members = paths.map((q) => kids[q[1]]);
    const rest = kids.filter((_, j) => !paths.some((q) => q[1] === j));
    const want = rest.slice(0, at).concat(members, rest.slice(at));
    const got = childrenLens([0]).get(back);
    if (got.map(ws).join("\u0000") !== want.map(ws).join("\u0000"))
      throw new Error(`group ∘ ungroup lost or reordered a child:\n${doc}\n---\n${back}`);
    runs++;
    const contiguous = paths[paths.length - 1][1] - paths[0][1] === paths.length - 1;
    if (contiguous) {
      cont++;
      if (ws(back) !== ws(doc)) throw new Error(`group ∘ ungroup ≠ id:\n${doc}\n---\n${back}`);
      if (back === doc) exact++;
    }
    return true;
  }, "group ∘ ungroup = id");
  return `✅ group ∘ ungroup returns the same children in the same order, and is exactly id for a `
       + `contiguous selection (${runs} runs, ${cont} contiguous, ${exact} of those byte-identical); `
       + `the rebase follows every sibling`;
};

// P7's falsifier: "a vertex address surviving a commit that changes an earlier vertex". T7 one level
// down, and checked the way `test_rebasePath` checks it — not "does the rebase follow the rules I
// wrote" but "does the rebased address name the same *point*". Coordinates are the ground truth here,
// the way element bytes are up there.
//
// Both microsyntaxes, because they are exactly where the naive answer fails: a points list renumbers
// predictably, while a path's command list does not — splitting one segment can turn one command into
// two and shift every `ci` after it — which is why the address is an ordinal within a kind and not a
// handle key.
const _sl257 = function _test_rebase_vertex(forAll,arb,mulberry32,NUM_RUNS,vertexAddress,rebaseVertex,pointsHandles,pathHandles,insertPoint,deletePoint,insertPathPoint,deletePathPoint,parsePoints,pathSegments,parsePath,attrVal)
{
  const rng = mulberry32(0x5EED0031);
  const IDX = 1;                                        // element 0 is the <svg> itself
  const A = (n, kind = "anchor") => vertexAddress.of([0, 0], kind, n);
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  // The address is a name, and a name must round-trip through its printed form.
  for (const a of [A(0), A(7), A(3, "ctrl"), vertexAddress.of([0, 2, 1], "anchor", 12)]) {
    const back = vertexAddress.parse(vertexAddress.print(a));
    if (!vertexAddress.same(back, a) || back.path.join("/") !== a.path.join("/"))
      throw new Error(`${vertexAddress.print(a)} does not round-trip`);
  }
  if (vertexAddress.resolve([], A(0)) !== null) throw new Error("an address into nothing is not null");

  // ---- a points list -----------------------------------------------------------------------------
  const gen = (r) => {
    const n = arb.int(r, 3, 7);
    const pts = Array.from({ length: n }, () => `${arb.int(r, -50, 50)},${arb.int(r, -50, 50)}`);
    return [`<svg><polygon points="${pts.join(" ")}"/></svg>`, arb.int(r, 0, n - 1),
            [arb.int(r, -50, 50), arb.int(r, -50, 50)]];
  };
  forAll(NUM_RUNS, rng, gen, (doc, i, p) => {
    const before = pointsHandles(doc, 1);
    const at = [0, 0];

    const ins = insertPoint(doc, at, i, p);
    const insH = pointsHandles(ins, 1);
    for (let n = 0; n < before.length; n++) {
      const to = rebaseVertex(A(n), { kind: "vertex-insert", path: at, at: i + 1 });
      if (!to) throw new Error("inserting a point deleted one");
      const h = vertexAddress.resolve(insH, to);
      if (!h || !near(h.x, before[n].x) || !near(h.y, before[n].y))
        throw new Error(`anchor ${n} -> ${to.n} lands on the wrong point after an insert at ${i}`);
    }
    // ...and the new vertex is where the address says it is.
    const fresh = vertexAddress.resolve(insH, A(i + 1));
    if (!fresh || !near(fresh.x, p[0]) || !near(fresh.y, p[1]))
      throw new Error("the inserted point is not at the address the op declared");

    if (before.length > 2) {
      const del = deletePoint(doc, at, i);
      const delH = pointsHandles(del, 1);
      for (let n = 0; n < before.length; n++) {
        const to = rebaseVertex(A(n), { kind: "vertex-delete", path: at, at: i });
        if (n === i) { if (to !== null) throw new Error("the deleted vertex kept its address"); continue; }
        const h = vertexAddress.resolve(delH, to);
        if (!h || !near(h.x, before[n].x) || !near(h.y, before[n].y))
          throw new Error(`anchor ${n} -> ${to.n} lands on the wrong point after a delete at ${i}`);
      }
    }
    // An address in another element is not this edit's business.
    const other = vertexAddress.of([0, 1], "anchor", 3);
    if (rebaseVertex(other, { kind: "vertex-insert", path: at, at: 0 }).n !== 3)
      throw new Error("a vertex edit renumbered another element's vertices");
    return true;
  }, "a vertex address follows its point through insert and delete");

  // ---- a path's command list ---------------------------------------------------------------------
  // The case the ordinal exists for. `M` then a mix of lines and curves, split and deleted at every
  // segment, with the ordinals computed exactly as `toolStructure` computes them.
  const PATHS = ["M 0 0 L 10 0 L 10 10 L 0 10 Z", "M 0 0 C 4 0 8 4 8 8 L 20 8",
                 "M 2 3 L 9 3 C 12 3 14 6 14 9 L 4 9 Z", "M 0 0 Q 5 -5 10 0 L 10 10"];
  for (const d of PATHS) {
    const doc = `<svg><path d="${d}"/></svg>`;
    const at = [0, 0];
    const before = pathHandles(doc, 1);
    const segs = pathSegments(parsePath(attrVal(doc, 1, "d")));
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].kind === "A") continue;
      const ord = segs.slice(0, i).filter((sg) => sg.kind !== "Z").length + 1;
      const ins = pathHandles(insertPathPoint(doc, at, i, 0.5), 1);
      for (let n = 0; n < before.filter((h) => h.kind === "anchor").length; n++) {
        const was = vertexAddress.resolve(before, A(n));
        const to = rebaseVertex(A(n), { kind: "vertex-insert", path: at, at: ord });
        const h = vertexAddress.resolve(ins, to);
        if (!h || !near(h.x, was.x) || !near(h.y, was.y))
          throw new Error(`${d}: anchor ${n} -> ${to.n} moved when segment ${i} was split`);
      }
      if (segs.filter((sg) => sg.kind !== "Z").length < 2 || segs[i].kind === "Z") continue;
      const dord = segs.slice(0, i + 1).filter((sg) => sg.kind !== "Z").length;
      const del = pathHandles(deletePathPoint(doc, at, i), 1);
      const nAnch = before.filter((h) => h.kind === "anchor").length;
      for (let n = 0; n < nAnch; n++) {
        const to = rebaseVertex(A(n), { kind: "vertex-delete", path: at, at: dord });
        if (n === dord) { if (to !== null) throw new Error("the deleted anchor kept its address"); continue; }
        const was = vertexAddress.resolve(before, A(n));
        const h = vertexAddress.resolve(del, to);
        if (!h || !near(h.x, was.x) || !near(h.y, was.y))
          throw new Error(`${d}: anchor ${n} -> ${to.n} moved when segment ${i}'s anchor was deleted`);
      }
    }
  }
  return `✅ a vertex address follows its point through insert and delete, in a points list `
       + `(${NUM_RUNS} runs) and in ${PATHS.length} paths at every segment; another element's `
       + `vertices are left alone`;
};

// P8's falsifier: "copy-then-paste-in-place producing anything other than a byte-identical duplicate,
// references included". Byte-identical is achievable exactly because the payload is the author's own
// bytes — until two ids collide, which no document may allow, so the id case is stated separately
// rather than waved at.
const _sl253 = function _test_copy_paste(forAll,arb,mulberry32,NUM_RUNS,copyMarkup,pasteMarkup,freshenIds,idsIn,childrenLens,nodeAt,cmdPaste,offsetMarkup)
{
  const rng = mulberry32(0x5EED0022);
  const gen = (r) => {
    const doc = arb.svgDocStr(r);
    const n = childrenLens([0]).get(doc).length;
    return [doc, arb.int(r, 0, Math.max(0, n - 1))];
  };
  forAll(NUM_RUNS, rng, gen, (doc, i) => {
    const kids = childrenLens([0]).get(doc);
    if (!kids.length) return true;
    const paths = [[0, i]];
    const clip = copyMarkup(doc, paths);
    if (clip[0] !== kids[i]) throw new Error("the payload is not the element's own bytes");
    const next = pasteMarkup(doc, [0], null, clip);
    const pasted = childrenLens([0]).get(next);
    if (pasted.length !== kids.length + 1) throw new Error("paste-in-place added something else");
    if (pasted[pasted.length - 1] !== clip[0])
      throw new Error(`the duplicate is not byte-identical:\n${clip[0]}\n---\n${pasted[pasted.length - 1]}`);
    // ...and it left every existing element exactly where and as it was.
    for (let j = 0; j < kids.length; j++)
      if (pasted[j] !== kids[j]) throw new Error(`paste disturbed sibling ${j}`);
    return true;
  }, "copy then paste-in-place is an exact duplicate");

  // References. A reference *into* the pasted set follows the rename; one *out of* it does not,
  // because it is still correct — the document it points into has not changed.
  const IDS = `<svg><defs><linearGradient id="grad"/></defs><rect id="r" fill="url(#grad)"/></svg>`;
  const both = freshenIds(copyMarkup(IDS, [[0, 0], [0, 1]]), idsIn(IDS));
  if (!/id="grad-2"/.test(both[0]) || !/url\(#grad-2\)/.test(both[1]))
    throw new Error(`an internal reference did not follow the rename: ${both.join(" ")}`);
  if (/id="r"(?!-)/.test(both[1])) throw new Error("a colliding id was not renamed");
  const out = freshenIds([`<rect fill="url(#grad)"/>`], idsIn(IDS));
  if (out[0] !== `<rect fill="url(#grad)"/>`) throw new Error("an outward reference was rewritten");
  // Nothing to rename is not a rewrite: the strings come back identical, not merely equal.
  const clean = [`<rect x="1"/>`];
  if (freshenIds(clean, idsIn(IDS))[0] !== clean[0]) throw new Error("freshenIds touched a clean payload");

  // Paste declines with an empty clipboard, which is what greys the menu item out (T8).
  if (cmdPaste(true).plan({ clipboard: () => [], scope: [0], childCount: () => 0, options: {} }) !== null)
    throw new Error("pasting nothing is not an edit");
  // ...and paste-in-place is the one that does not move what it pastes.
  if (offsetMarkup(`<rect x="1"/>`, 0, 0) !== `<rect x="1"/>`) throw new Error("a zero offset wrote something");
  return `✅ copy → paste-in-place is byte-identical (${NUM_RUNS} runs); internal references follow a `
       + `rename, outward ones do not, and an empty clipboard declines`;
};

// G18's falsifier: "aligning an already-aligned set writing anything at all". It holds by the skip
// rule rather than by a special case — so what this asserts is exactly the writer's own condition,
// `gestureDelta.text(d) === d.base`, on the *second* plan.
//
// A fake `env`: boxes this test controls, an identity screen→parent map, no document and no browser.
// That is the point of a command reading `env` and nothing else.
const _sl254 = function _test_align_commands(cmdAlign,cmdDistribute,alignSpecs,gestureDelta)
{
  const mk = (boxes) => {
    const T = boxes.map(() => [0, 0]);
    const env = {
      options: {},
      paths: boxes.map((_, i) => [0, i]),
      target: (p) => {
        const i = p[1], t = T[i];
        return { idx: i, el: null, Slin: [1, 0, 0, 1], T0: t.slice(), box: boxes[i],
                 text: t[0] || t[1] ? `translate(${t[0]} ${t[1]})` : "" };
      }
    };
    const apply = (ds) => {
      for (const d of [].concat(ds)) {
        const i = d.idx;
        boxes[i] = { ...boxes[i], x: boxes[i].x + d.value[0] - T[i][0], y: boxes[i].y + d.value[1] - T[i][1] };
        T[i] = d.value.slice();
      }
    };
    return { env, apply, boxes: () => boxes };
  };
  const BOXES = () => ([{ x: 10, y: 4, width: 20, height: 10 },
                        { x: 30, y: 20, width: 6, height: 6 },
                        { x: 70, y: 50, width: 12, height: 30 }]);
  const settled = (ds) => [].concat(ds).every((d) => gestureDelta.text(d) === d.base);

  for (const spec of alignSpecs) {
    const c = cmdAlign(spec), f = mk(BOXES());
    const first = c.plan(f.env);
    if (first === null) throw new Error(`${c.id} declined three elements`);
    if (settled(first)) throw new Error(`${c.id} wrote nothing to an unaligned set`);
    f.apply(first);
    const [, , axis, frac] = spec;
    const lo = axis === "x" ? "x" : "y", len = axis === "x" ? "width" : "height";
    const edge = (b) => b[lo] + frac * b[len];
    const got = f.boxes().map(edge);
    if (Math.max(...got) - Math.min(...got) > 1e-9)
      throw new Error(`${c.id} left the edges at ${got.join(", ")}`);
    if (!settled(c.plan(f.env))) throw new Error(`${c.id} is not idempotent — T1 says it must be`);
  }

  for (const axis of ["x", "y"]) {
    const c = cmdDistribute(axis), f = mk(BOXES());
    const first = c.plan(f.env);
    if (first === null) throw new Error(`${c.id} declined three elements`);
    f.apply(first);
    const lo = axis === "x" ? "x" : "y", len = axis === "x" ? "width" : "height";
    const mid = f.boxes().map((b) => b[lo] + b[len] / 2).sort((a, b) => a - b);
    if (Math.abs((mid[1] - mid[0]) - (mid[2] - mid[1])) > 1e-9)
      throw new Error(`${c.id} left uneven gaps: ${mid.join(", ")}`);
    if (!settled(c.plan(f.env))) throw new Error(`${c.id} is not idempotent`);
    // The outermost two do not move — that is what makes it idempotent, and it is worth pinning.
    if (mid[0] !== BOXES()[0][lo] + BOXES()[0][len] / 2 && axis === "x")
      throw new Error("distribute moved the first element");
    if (c.plan({ ...f.env, paths: f.env.paths.slice(0, 2) }) !== null)
      throw new Error("distributing two elements is not a thing");
  }
  return `✅ ${alignSpecs.length} aligns and 2 distributes land their edges, are idempotent, and `
       + `decline what they cannot do`;
};



// ================================================================================================
// DIRECT MANIPULATION — the drawing edits its own cell
// ================================================================================================
// The scanner's own claim, checked against the browser rather than against more generated documents
// that stay inside the domain by construction: for a corpus of real and adversarial markup, the tree
// `parseDoc` builds must agree with `DOMParser` on shape, tags and attribute values, and every span
// it reports must slice out exactly the element the browser saw. A span that is merely *plausible*
// is the dangerous case — it splices the wrong bytes silently — so this compares slices, not counts.
const _sl262 = function _test_path_smooth(forAll,arb,mulberry32,NUM_RUNS,pathSmooth,pathHandles,parsePath,pathSegments,attrVal)
{
  const rng = mulberry32(0x5EED0041);
  const IDX = 1;
  const doc = (d) => `<svg><path d="${d}"/></svg>`;
  const dOf = (t) => attrVal(t, IDX, "d");
  const at = [0, 0];

  // A polyline with a genuine corner in the middle. Toggling that corner must make it smooth, and
  // toggling it back must give the author's own bytes — not a curve that merely looks straight.
  const gen = (r) => {
    const P = () => [arb.int(r, -80, 80), arb.int(r, -80, 80)];
    const n = arb.int(r, 3, 6);
    const pts = Array.from({ length: n }, P);
    return [doc(`M ${pts[0].join(" ")} ` + pts.slice(1).map((q) => `L ${q.join(" ")}`).join(" ")),
            arb.int(r, 1, n - 2)];
  };
  forAll(NUM_RUNS, rng, gen, (src, k) => {
    const on = pathSmooth.toggle(src, at, k);
    if (on === null) return true;                       // degenerate geometry: declining is allowed
    if (!pathSmooth.smooth(pathHandles(on, IDX), k))
      throw new Error(`anchor ${k} is not smooth after the toggle: ${dOf(on)}`);
    // Every *other* anchor is left exactly as it was — a toggle is not a resmoothing of the path.
    const h0 = pathHandles(src, IDX).filter((h) => h.kind === "anchor");
    const h1 = pathHandles(on, IDX).filter((h) => h.kind === "anchor");
    if (h0.length !== h1.length) throw new Error("the toggle changed how many anchors there are");
    h0.forEach((h, i) => {
      if (Math.hypot(h.x - h1[i].x, h.y - h1[i].y) > 1e-9)
        throw new Error(`anchor ${i} moved when anchor ${k} was smoothed`);
    });
    const off = pathSmooth.toggle(on, at, k);
    if (off === null) throw new Error("a smooth anchor must be able to become a corner again");
    if (off !== src) throw new Error(`round trip is not byte-identical:\n  ${dOf(src)}\n  ${dOf(off)}`);
    return true;
  });

  // Dragging one handle of a smooth anchor keeps it smooth, and keeps the partner's length.
  const gen2 = (r) => {
    const P = () => [arb.int(r, -80, 80), arb.int(r, -80, 80)];
    const [a, b, c] = [P(), P(), P()];
    return [doc(`M ${a.join(" ")} L ${b.join(" ")} L ${c.join(" ")}`), P()];
  };
  forAll(NUM_RUNS, rng, gen2, (src, to) => {
    const on = pathSmooth.toggle(src, at, 1);
    if (on === null) return true;
    const before = pathSmooth.around(pathHandles(on, IDX), 1);
    const len = Math.hypot(before.outH.x - before.anchor.x, before.outH.y - before.anchor.y);
    const next = pathSmooth.couple(on, IDX, before.inH.key, to[0], to[1]);
    if (next === null) return true;                     // dragging onto the anchor has no direction
    const after = pathSmooth.around(pathHandles(doc(next), IDX), 1);
    if (Math.hypot(after.inH.x - to[0], after.inH.y - to[1]) > 1e-6)
      throw new Error("the dragged handle did not go where the pointer is");
    const len2 = Math.hypot(after.outH.x - after.anchor.x, after.outH.y - after.anchor.y);
    if (Math.abs(len - len2) > 1e-6) throw new Error(`the partner changed length: ${len} -> ${len2}`);
    if (!pathSmooth.smooth(pathHandles(doc(next), IDX), 1))
      throw new Error("coupling a smooth anchor left it not smooth");
    return true;
  });

  // What it declines. An arc is not ours to rewrite, and an endpoint has nothing on one side.
  if (pathSmooth.toggle(doc("M 0 0 A 5 5 0 0 1 10 10 L 20 0"), at, 1) !== null)
    throw new Error("an arc must be declined, not approximated");
  const line = doc("M 0 0 L 10 10 L 20 0");
  if (pathSmooth.toggle(line, at, 0) !== null) throw new Error("the M anchor has no incoming segment");
  if (pathSmooth.toggle(line, at, 2) !== null) throw new Error("the last anchor has no outgoing segment");
  return `✅ smooth/corner round-trips to the original bytes and couples the partner handle (${NUM_RUNS} runs)`;
};

const _sl109b = function _test_parse_vs_DOMParser(parseDoc,outsideDomain,attrVal,tokenize)
{
  if (typeof DOMParser === "undefined") return "⏭ needs a DOM (browser only)";
  const NS = "http://www.w3.org/2000/svg";
  const SC = "scr" + "ipt", ST = "st" + "yle";        // never written literally: see test_domain_boundary
  const parse = (t) => {
    const d = new DOMParser().parseFromString(t, "image/svg+xml");
    if (d.querySelector("parsererror")) throw new Error("the browser refused this document");
    return d.documentElement;
  };
  // Real markup, plus the cases a regex tokenizer is most likely to get wrong.
  const CORPUS = [
    `<svg xmlns="${NS}" viewBox="0 0 10 10"><rect x="1"/></svg>`,
    `<svg xmlns="${NS}">\n  <!-- a comment with <angle> brackets and a /> in it -->\n  <g transform="rotate(4)"><circle r="2"/></g>\n</svg>`,
    `<svg xmlns="${NS}"><text font-family="a &gt; b">&amp;&lt;</text></svg>`,          // entities
    `<svg xmlns="${NS}"><rect data-note="it's fine" data-other='say "hi"'/></svg>`,     // mixed quotes
    `<svg xmlns="${NS}"><path d="M0,0 L1,1"/><rect x="1" y="2"   width="3"/></svg>`,    // odd spacing
    `<svg xmlns="${NS}"><g><g><g><rect x="1"/></g></g></g></svg>`,                      // deep nesting
    `<svg xmlns="${NS}"><rect x="1" data-gt="a>b"/></svg>`,                             // > inside a value
    `<svg xmlns="${NS}"><rect/><rect></rect></svg>`                                     // both closings
  ];

  const shapeOf = (el) => `${el.localName}[${[...el.children].map(shapeOf).join(",")}]`;
  const shapeOfNode = (n) => `${n.tag}[${n.children.map(shapeOfNode).join(",")}]`;

  for (const src of CORPUS) {
    if (outsideDomain(src)) throw new Error(`the corpus must be inside the domain: ${src}`);
    const dom = parse(src);
    const mine = parseDoc(src).children[0];
    if (shapeOfNode(mine) !== shapeOf(dom))
      throw new Error(`tree shape differs\n  mine: ${shapeOfNode(mine)}\n  DOM:  ${shapeOf(dom)}`);
    // Attribute values, element by element, in document order.
    const domEls = [dom, ...dom.querySelectorAll("*")];
    const mineEls = tokenize(src);
    if (domEls.length !== mineEls.length) throw new Error(`element count ${mineEls.length} ≠ ${domEls.length}`);
    domEls.forEach((el, i) => {
      for (const a of el.attributes) {
        if (a.name === "xmlns") continue;
        const got = attrVal(src, i, a.name);
        // The DOM decodes entities; this editor deliberately does not, so compare decoded forms.
        const decoded = got === null ? null : new DOMParser()
          .parseFromString(`<x a="${got.replace(/"/g, "&quot;")}"/>`, "text/xml").documentElement.getAttribute("a");
        if (decoded !== a.value)
          throw new Error(`element ${i} ${el.localName}@${a.name}: ${JSON.stringify(decoded)} ≠ ${JSON.stringify(a.value)}`);
      }
    });
    // Spans: the slice at each node must be that element and nothing else.
    const walk = (n) => {
      if (n.tag) {
        const slice = src.slice(n.start, n.end);
        const re = parse(slice.startsWith("<svg") ? slice : `<svg xmlns="${NS}">${slice}</svg>`);
        const el = slice.startsWith("<svg") ? re : re.firstElementChild;
        if (el.localName !== n.tag) throw new Error(`span at ${n.start} slices a <${el.localName}>, not <${n.tag}>`);
        // The inner span is what a structural edit splices, so it must sit strictly inside the
        // element and stop exactly where its close tag begins.
        if (!(n.innerStart >= n.openEnd && n.innerEnd <= n.end && n.innerEnd >= n.innerStart))
          throw new Error(`<${n.tag}>: inner span [${n.innerStart},${n.innerEnd}] escapes [${n.openEnd},${n.end}]`);
        const closing = src.slice(n.innerEnd, n.end);
        if (!(n.selfClosing ? closing === "" : new RegExp(`^</\\s*${n.tag}\\s*>$`).test(closing)))
          throw new Error(`<${n.tag}>: the bytes after the inner span are ${JSON.stringify(closing)}, not its close tag`);
      }
      n.children.forEach(walk);
    };
    walk(parseDoc(src));
  }

  // And the edge of the domain is refused, loudly, rather than mis-parsed.
  for (const bad of [
    `<svg xmlns="${NS}"><![CDATA[ <rect x="1"/> ]]></svg>`,
    `<svg xmlns="${NS}"><${ST}>rect { fill: red }</${ST}><rect x="1"/></svg>`,
    `<svg xmlns="${NS}"><${SC}>if (a &lt; b) {}</${SC}></svg>`
  ]) {
    if (!outsideDomain(bad)) throw new Error(`should be refused: ${bad}`);
    let threw = false;
    try { parseDoc(bad); } catch (e) { threw = /outside the svg-lens domain/.test(e.message); }
    if (!threw) throw new Error(`parseDoc must refuse: ${bad}`);
  }
  return `✅ agrees with DOMParser on ${CORPUS.length} documents (shape, attributes, spans); refuses CDATA and raw-text elements`;
};

const _sl110 = function _manipulationHeader(md,ref) {return (md`## Direct manipulation

\`svgLens(node)\` returns the node it was given, with pointer handling attached. During a gesture only the live DOM changes — no source is written, so dragging is as cheap as \`setAttribute\`. On release the gesture commits once, through \`compose(cellAttrLens(…), transformLens)\`, and the DOM then adopts the source's exact bytes: if you drag a shape back to where it started, the readable \`translate(228 128) rotate(-4)\` is still there, because GetPut says so.

The new definition is built with \`realize\` (which routes through \`importShim\` on lopecode) and installed with \`Variable.define\` — the same call \`editor-5\` makes when you type in a cell.

### A gesture is an ordinary code edit

Gestures call \`define\`, the same kind of event as typing: the cell is invalidated, recomputes, and produces a new node.

That has a cost — the node the cell handed out is replaced on every commit — so state that must outlive a gesture cannot live in the node's closure. Undo history, the selection and the active tool are held in \`lensState\`, keyed by the \`Variable\`, which \`define\` mutates in place. The selection is restored by *path* rather than index, which is why it is addressed that way.

Rendering evaluates the template rather than parsing its text, so an interpolated \`\` svg\`<circle r="\${r}"/>\` \`\` renders the same way a literal one does; what a handle over a hole may write to is a separate question (${ ref('sinks') }).

\`applySource\` re-reads \`_definition\` after the \`await\` and abandons the put if it changed underneath, since \`editor-5\` may have rewritten the cell mid-gesture.

### The pieces

\`svgLens\` is wiring and nothing else. The parts it wires:

| Cell | Owns |
|---|---|
| \`svgTarget\` | which variable this node is, the parameter name the cell calls \`svgLens\` by, and the document text |
| \`svgWriter\` | \`applySource\` / \`commit\` / \`runCommand\` — the only code that assigns \`_definition\` |
| \`svgOverlay\` | the handle layer, and the \`isOwn\` predicate that keeps the renderer off it |
| \`svgFocus\` | which element is selected and where its handles are drawn |
| \`svgTools\` | the tool registry — move, vertex, transform, marquee, the shape and pen tools, and the affordance dispatcher |

A tool is \`{id, onPointerDown, onPointerMove, onPointerUp, onDblClick}\`. \`onPointerDown\` returns true to claim the gesture; registry order is priority. Tools read the document, preview in the live DOM, and hand a command or a commit to the writer — they never write the source themselves, and none of them knows what a lens is. Adding a tool is adding a cell:

\`\`\`js
svgTools.push({ id: "rect", onPointerDown(ctx, e) { … } });
viewof svgTools.dispatchEvent(new Event("input"));
\`\`\`

Or take the set at the callsite, which pins one drawing to exactly the tools you name — how a test runs a tool in isolation, and how a figure shows a reduced editor:

\`\`\`js
svgLens(node, { tools: [toolVertex] })                // a vertex-only editor
svgLens(node, { tools: (d) => [myTool, ...d] })       // extend without restating the defaults
\`\`\`

The writer stays ignorant of selection: it reports what it did on the \`lens-put\` event, and the handles follow — refreshed after an attribute edit, cleared after a structural one, because a structural edit shifts every address after it.`);};

// Draggable handles for a polygon/polyline's points.
const _sl111 = function _pointsHandles(parsePoints,attrVal){return(
(src, idx) => parsePoints(attrVal(src, idx, "points"))
  .map((p, i) => ({ key: "p" + i, kind: "anchor", x: p[0], y: p[1], i }))
)};

// Draggable handles for a path: anchors and control points, with the current-point state threaded
// through so relative commands get absolute handle positions.
const _sl112 = function _pathHandles(parsePath,attrVal,PATH_ARG_COUNT){return(
(src, idx) => {
  const cmds = parsePath(attrVal(src, idx, "d"));
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const hs = [];
  cmds.forEach((cmd, ci) => {
    const U = cmd.c.toUpperCase(), u = PATH_ARG_COUNT[U];
    const rel = cmd.c !== U;
    if (u === 0) { cx = sx; cy = sy; return; }
    for (let o = 0; o < cmd.a.length; o += u) {
      const bx = cx, by = cy, A = cmd.a;
      const abs = (ix, iy) => (rel ? [bx + A[o + ix], by + A[o + iy]] : [A[o + ix], A[o + iy]]);
      const K = (ix, iy) => ci + ":" + o + ":" + ix + ":" + iy;
      switch (U) {
        case "M": case "L": case "T": {
          const [x, y] = abs(0, 1);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "anchor", x, y, rel, base: [bx, by] });
          cx = x; cy = y; if (U === "M" && o === 0) { sx = x; sy = y; }
          break; }
        case "H": {
          const x = rel ? bx + A[o] : A[o];
          hs.push({ key: K(0, -1), ci, o, ix: 0, iy: -1, kind: "anchor", x, y: cy, rel, base: [bx, by] });
          cx = x; break; }
        case "V": {
          const y = rel ? by + A[o] : A[o];
          hs.push({ key: K(-1, 0), ci, o, ix: -1, iy: 0, kind: "anchor", x: cx, y, rel, base: [bx, by] });
          cy = y; break; }
        case "C": {
          const c1 = abs(0, 1), c2 = abs(2, 3), e = abs(4, 5);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "ctrl", x: c1[0], y: c1[1], rel, base: [bx, by], link: [bx, by] });
          hs.push({ key: K(2, 3), ci, o, ix: 2, iy: 3, kind: "ctrl", x: c2[0], y: c2[1], rel, base: [bx, by], link: e });
          hs.push({ key: K(4, 5), ci, o, ix: 4, iy: 5, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
        case "S": case "Q": {
          const q = abs(0, 1), e = abs(2, 3);
          hs.push({ key: K(0, 1), ci, o, ix: 0, iy: 1, kind: "ctrl", x: q[0], y: q[1], rel, base: [bx, by], link: e });
          hs.push({ key: K(2, 3), ci, o, ix: 2, iy: 3, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
        case "A": {
          const e = rel ? [bx + A[o + 5], by + A[o + 6]] : [A[o + 5], A[o + 6]];
          hs.push({ key: K(5, 6), ci, o, ix: 5, iy: 6, kind: "anchor", x: e[0], y: e[1], rel, base: [bx, by] });
          cx = e[0]; cy = e[1]; break; }
      }
    }
  });
  return hs;
}
)};

// Pure: move one handle, return the attribute the lens should be asked to hold.
// ---- the shape registry (design note S2) ---------------------------------------------------------
// Which tags have editable geometry, as data. Each entry answers three questions about one family of
// elements: can the lens read this one (`reads` — the partiality of T8, decided per tag rather than
// by a chain of `if (tag === …)`), where are its handles, and what does dragging one write. `mode`
// is the name the focus already uses for "which geometry am I editing", so the registry is keyed by
// it and nothing else needed a new vocabulary.
//
// The transform gizmo is deliberately NOT an entry: it is the fallback for everything the registry
// cannot read, which is what keeps a document with an unparseable shape editable at all.
//
// A plain array, not an `Inputs.input` like `svgTools`. The difference is not taste: this registry is
// read by *pure* code — `handleEdit`, and the focus deciding where to draw handles — which the lens
// laws exercise headlessly, and an `Inputs.input` needs a DOM. Tools can afford to be a live input
// because a tool is a browser thing anyway. Extending is the callsite parameter instead, which is
// P2's pattern: `svgLens(node, {shapes})` takes an array or `defaults => array`.
const _sl113a = function _numAttr(attrVal){return(
(src, idx, name, dflt = null) => {
  const v = attrVal(src, idx, name);
  if (v === null || v === "") {
    if (dflt === null) throw new Error(`${name} is absent`);
    return dflt;
  }
  const n = Number(v);
  // An interpolated `${w}` gives NaN, and so does `10px`. Refusing here is what puts the element
  // outside this entry's domain, so it keeps the transform gizmo instead of getting broken handles.
  if (!Number.isFinite(n)) throw new Error(`${name}="${v}" is not a number`);
  return n;
}
)};

// Trim float dust without pretending to more precision than the author had. `localPoint` already
// snaps to the grid, so this only cleans up what the arithmetic below adds.
const _sl113b = function _numText(){return(
(v) => String(Math.round(v * 1e6) / 1e6)
)};

// The numbers each tag's geometry is made of, read strictly and defaulted the way SVG defaults them.
// One place where "what does this element's geometry consist of" is written down; a tag that cannot
// answer throws, and its entry's `reads` turns that into "not my domain".
const _sl113c = function _geomOf(numAttr){return(
{
  rect: (src, idx) => ({ x: numAttr(src, idx, "x", 0), y: numAttr(src, idx, "y", 0),
                         width: numAttr(src, idx, "width"), height: numAttr(src, idx, "height"),
                         rx: numAttr(src, idx, "rx", 0) }),
  circle: (src, idx) => ({ cx: numAttr(src, idx, "cx", 0), cy: numAttr(src, idx, "cy", 0),
                           r: numAttr(src, idx, "r") }),
  ellipse: (src, idx) => ({ cx: numAttr(src, idx, "cx", 0), cy: numAttr(src, idx, "cy", 0),
                            rx: numAttr(src, idx, "rx"), ry: numAttr(src, idx, "ry") }),
  line: (src, idx) => ({ x1: numAttr(src, idx, "x1", 0), y1: numAttr(src, idx, "y1", 0),
                         x2: numAttr(src, idx, "x2", 0), y2: numAttr(src, idx, "y2", 0) })
}
)};

// ---- one cell per tag ----------------------------------------------------------------------------
const _sl113p = function _shapePoints(pointsHandles,parsePoints,attrVal,printPoints){return(
{
  mode: "points", tags: ["polygon", "polyline"], writes: ["points"],
  reads: (src, idx) => { parsePoints(attrVal(src, idx, "points")); return true; },
  handles: pointsHandles,
  edit: (src, idx, h, lx, ly) => {
    const pts = parsePoints(attrVal(src, idx, "points"));
    pts[h.i] = [lx, ly];
    return [{ name: "points", value: printPoints(pts) }];
  }
}
)};

const _sl113d = function _shapePath(pathHandles,parsePath,attrVal,printPath){return(
{
  mode: "path", tags: ["path"], writes: ["d"],
  reads: (src, idx) => { parsePath(attrVal(src, idx, "d")); return true; },
  handles: pathHandles,
  edit: (src, idx, h, lx, ly) => {
    const cmds = parsePath(attrVal(src, idx, "d"));
    const A = cmds[h.ci].a;
    if (h.ix >= 0) A[h.o + h.ix] = h.rel ? lx - h.base[0] : lx;
    if (h.iy >= 0) A[h.o + h.iy] = h.rel ? ly - h.base[1] : ly;
    return [{ name: "d", value: printPath(cmds) }];
  }
}
)};

// How far along the top edge the corner-radius handle sits when the radius is zero. A function of
// the rect's own geometry, so it is stable for the whole drag and both halves of the entry agree.
const _sl113i = function _rxInset(){return(
(r) => Math.min(10, r.width / 4)
)};

// A rectangle, at last: eight box handles writing `x`/`y`/`width`/`height` directly, and a ninth for
// the corner radius (G5). `rotatable` keeps the gizmo's rotate stalk, because a rect has no
// attribute for its angle — rotation is a `transform` no matter what, and only rotation is.
// A handle's key names the edges it moves, so `nw` is `n` and `w`: the opposite edges stay where the
// *source* put them, which is why the drag never accumulates and dragging past an edge just flips it.
const _sl113e = function _shapeRect(geomOf,numText,rxInset){return(
{
  mode: "rect", tags: ["rect"], writes: ["x", "y", "width", "height", "rx"], rotatable: true,
  reads: (src, idx) => { geomOf.rect(src, idx); return true; },
  origin: (src, idx) => { const r = geomOf.rect(src, idx); return [r.x, r.y]; },
  move: (src, idx, x, y) => [{ name: "x", value: numText(x), dflt: "0" },
                             { name: "y", value: numText(y), dflt: "0" }],
  handles: (src, idx) => {
    const r = geomOf.rect(src, idx);
    const mx = r.x + r.width / 2, my = r.y + r.height / 2;
    return [
      { key: "nw", kind: "scale", x: r.x, y: r.y },
      { key: "n",  kind: "scale", x: mx, y: r.y },
      { key: "ne", kind: "scale", x: r.x + r.width, y: r.y },
      { key: "e",  kind: "scale", x: r.x + r.width, y: my },
      { key: "se", kind: "scale", x: r.x + r.width, y: r.y + r.height },
      { key: "s",  kind: "scale", x: mx, y: r.y + r.height },
      { key: "sw", kind: "scale", x: r.x, y: r.y + r.height },
      { key: "w",  kind: "scale", x: r.x, y: my },
      // Offset along the top edge by a fixed inset, or at rx = 0 it lands exactly on the `nw`
      // corner, is drawn last, and steals the corner's clicks. `edit` subtracts the same inset, so
      // the offset is a bijection and putting the handle back still writes nothing.
      { key: "rx", kind: "ctrl", x: r.x + rxInset(r) + Math.min(r.rx, r.width / 2), y: r.y }
    ];
  },
  edit: (src, idx, h, lx, ly) => {
    const r = geomOf.rect(src, idx);
    if (h.key === "rx") {
      const rx = Math.max(0, Math.min(lx - r.x - rxInset(r), r.width / 2));
      return [{ name: "rx", value: numText(rx), dflt: "0" }];
    }
    let x0 = r.x, y0 = r.y, x1 = r.x + r.width, y1 = r.y + r.height;
    if (h.key.includes("n")) y0 = ly;
    if (h.key.includes("s")) y1 = ly;
    if (h.key.includes("w")) x0 = lx;
    if (h.key.includes("e")) x1 = lx;
    const next = { x: Math.min(x0, x1), y: Math.min(y0, y1),
                   width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
    const cur = { x: r.x, y: r.y, width: r.width, height: r.height };
    // Only what moved. An unchanged attribute would still be a put, and T1 says a null gesture is a
    // null edit — dragging the east edge must not rewrite `y`.
    return Object.keys(next).filter((k) => next[k] !== cur[k])
      .map((k) => ({ name: k, value: numText(next[k]), dflt: k === "x" || k === "y" ? "0" : null }));
  }
}
)};

const _sl113f = function _shapeCircle(geomOf,numText){return(
{
  mode: "circle", tags: ["circle"], writes: ["r"],
  reads: (src, idx) => { geomOf.circle(src, idx); return true; },
  origin: (src, idx) => { const c = geomOf.circle(src, idx); return [c.cx, c.cy]; },
  move: (src, idx, x, y) => [{ name: "cx", value: numText(x), dflt: "0" },
                             { name: "cy", value: numText(y), dflt: "0" }],
  handles: (src, idx) => {
    const c = geomOf.circle(src, idx);
    return [
      { key: "n", kind: "scale", x: c.cx, y: c.cy - c.r },
      { key: "e", kind: "scale", x: c.cx + c.r, y: c.cy },
      { key: "s", kind: "scale", x: c.cx, y: c.cy + c.r },
      { key: "w", kind: "scale", x: c.cx - c.r, y: c.cy }
    ];
  },
  edit: (src, idx, h, lx, ly) => {
    const c = geomOf.circle(src, idx);
    const r = h.key === "n" || h.key === "s" ? Math.abs(ly - c.cy) : Math.abs(lx - c.cx);
    return [{ name: "r", value: numText(r) }];
  }
}
)};

const _sl113g = function _shapeEllipse(geomOf,numText){return(
{
  mode: "ellipse", tags: ["ellipse"], writes: ["rx", "ry"], rotatable: true,
  reads: (src, idx) => { geomOf.ellipse(src, idx); return true; },
  origin: (src, idx) => { const c = geomOf.ellipse(src, idx); return [c.cx, c.cy]; },
  move: (src, idx, x, y) => [{ name: "cx", value: numText(x), dflt: "0" },
                             { name: "cy", value: numText(y), dflt: "0" }],
  handles: (src, idx) => {
    const c = geomOf.ellipse(src, idx);
    const H = (key, x, y, kind) => ({ key, kind, x, y });
    return [
      H("n", c.cx, c.cy - c.ry, "scale"), H("e", c.cx + c.rx, c.cy, "scale"),
      H("s", c.cx, c.cy + c.ry, "scale"), H("w", c.cx - c.rx, c.cy, "scale"),
      H("nw", c.cx - c.rx, c.cy - c.ry, "ctrl"), H("ne", c.cx + c.rx, c.cy - c.ry, "ctrl"),
      H("se", c.cx + c.rx, c.cy + c.ry, "ctrl"), H("sw", c.cx - c.rx, c.cy + c.ry, "ctrl")
    ];
  },
  edit: (src, idx, h, lx, ly) => {
    const c = geomOf.ellipse(src, idx);
    const out = [];
    if (/[ew]/.test(h.key) && Math.abs(lx - c.cx) !== c.rx)
      out.push({ name: "rx", value: numText(Math.abs(lx - c.cx)) });
    if (/[ns]/.test(h.key) && Math.abs(ly - c.cy) !== c.ry)
      out.push({ name: "ry", value: numText(Math.abs(ly - c.cy)) });
    return out;
  }
}
)};

// A `<line>` had no editable geometry at all before this: four scale handles that wrote `transform`,
// and not one that touched an endpoint.
const _sl113h = function _shapeLine(geomOf,numText){return(
{
  mode: "line", tags: ["line"], writes: ["x1", "y1", "x2", "y2"],
  reads: (src, idx) => { geomOf.line(src, idx); return true; },
  // The first endpoint is the origin; the second follows by the same delta, so a move is a move and
  // not a stretch.
  origin: (src, idx) => { const l = geomOf.line(src, idx); return [l.x1, l.y1]; },
  move: (src, idx, x, y) => {
    const l = geomOf.line(src, idx), dx = x - l.x1, dy = y - l.y1;
    return [{ name: "x1", value: numText(x), dflt: "0" }, { name: "y1", value: numText(y), dflt: "0" },
            { name: "x2", value: numText(l.x2 + dx), dflt: "0" },
            { name: "y2", value: numText(l.y2 + dy), dflt: "0" }];
  },
  handles: (src, idx) => {
    const l = geomOf.line(src, idx);
    return [{ key: "1", kind: "anchor", x: l.x1, y: l.y1 },
            { key: "2", kind: "anchor", x: l.x2, y: l.y2 }];
  },
  edit: (src, idx, h, lx, ly) => [
    { name: "x" + h.key, value: numText(lx), dflt: "0" },
    { name: "y" + h.key, value: numText(ly), dflt: "0" }
  ]
}
)};

const _sl113r = function _svgShapes(shapePoints,shapePath,shapeRect,shapeCircle,shapeEllipse,shapeLine){return(
([shapePoints, shapePath, shapeRect, shapeCircle, shapeEllipse, shapeLine])
)};
// Look an entry up, and answer partiality in one place: `forTag` is what a click asks ("what can I
// offer on this element?"), `forMode` is what a drag asks ("what am I editing?").
const _sl113s2 = function _shapeLookup(){return(
{
  forMode: (shapes, mode) => shapes.find((e) => e.mode === mode) || null,
  // The first entry whose tag matches *and* which can actually read this element. A polygon with an
  // unparseable points list falls through to null, and the caller offers the gizmo — T8, as data.
  forTag: (shapes, tag, src, idx) => {
    for (const e of shapes) {
      if (!e.tags.includes(tag)) continue;
      try { if (e.reads(src, idx)) return e; } catch (err) { /* outside the lens domain */ }
    }
    return null;
  }
}
)};

// Kept as the one-call form the vertex tool uses: find the handle, then ask its entry what to write.
const _sl113 = function _handleEdit(svgShapes,shapeLookup){return(
(mode, src, idx, key, lx, ly, shapes = svgShapes) => {
  const e = shapeLookup.forMode(shapes, mode);
  if (!e) return null;
  const h = e.handles(src, idx).find((h) => h.key === key);
  return h ? [].concat(e.edit(src, idx, h, lx, ly)) : [];
}
)};

// Patch `live` into the shape of `next`, in place. The cell's value is the live node, so it must
// survive the edit: replacing it would break node identity, the observer holding it, and the gesture
// in flight. `skip` marks nodes the renderer does not own (the handle overlay), which stay put and
// are never counted when aligning children.

// ---- the target: which cell am I, and what does its literal say? --------------------------------
// Locating the variable by `_value` identity and the parameter name by position is the same trick
// @tomlarkworthy/sticky uses. Nothing else in the editor knows how a cell is found.
const _sl116 = function _svgTarget(runtime,literalSpan){return(
(node, { marker, isOwn = () => false }) => {
  const NS = "http://www.w3.org/2000/svg";
  let self = null, alias = "svgLens";
  const resolve = () => {
    if (self && self._value === node) return self;
    self = [...runtime._variables].find((v) => v._value === node) || null;
    if (!self) return null;
    const i = self._inputs.findIndex((inp) => inp && inp._value === marker);
    const params = /^[^(]*\(([^)]*)\)/.exec(self._definition.toString());
    const names = params ? params[1].split(",").map((s) => s.trim()) : [];
    alias = (i >= 0 && names[i]) || "svgLens";
    return self;
  };
  const cellSource = () => (resolve() ? self._definition.toString() : null);
  return {
    variable: resolve,
    alias: () => { resolve(); return alias; },
    cellSource,
    // The SVG text the source currently holds — null when this node is not (yet) a cell value.
    doc() {
      const s = cellSource();
      if (s === null) return null;
      const [a, b] = literalSpan(s, alias);
      return s.slice(a, b);
    },
    // Source elements in document order — overlay excluded, so indices match tokenize().
    elems: () => [node, ...node.querySelectorAll("*")].filter((e) => e.namespaceURI === NS && !isOwn(e))
  };
}
)};

// ---- the writer: the one place that touches _definition -----------------------------------------
// Source is truth; the live node is a projection of it, patched. Rendering evaluates the new
// definition with the variable's current inputs — it does not parse the SVG text — so an interpolated
// template renders the same way a static one does. Recomputing the cell instead would mint a new node
// and break the value's identity.
// Wait for a cell we just redefined to finish recomputing, and hand back its new value. The reactive
// chain settles on macrotasks and the runtime exposes no per-variable promise, so this polls.
const _sl117s = function _settle(){return(
async (variable, previous, tries = 80) => {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 8));
    const v = variable._value;
    if (v && v !== previous) return v;
  }
  return null;
}
)};

const _sl117 = function _svgWriter(runtime,realize,settle,literalLens,cellAttrLens,compose,attrVal,literalSpan,holeSpans,slotsOf,mergeInterpolated){return(
(node, target) => {
  const emit = (record) => {
    node.lastPut = record;
    node.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
    node.dispatchEvent(new Event("input", { bubbles: true }));
    return record;
  };

  async function applySource(next, record) {
    const self = target.variable();
    const before = self._definition;
    // The whole prior definition, so a history layer can restore the exact bytes.
    record.source = { before: target.cellSource(), after: next };
    const [fn] = await realize([next], runtime);
    if (self._definition !== before) {                 // editor-5 (or another gesture) got there first
      record.aborted = "definition changed under the gesture";
      return emit(record);
    }
    // The public API, not a silent `_definition =`. A gesture *changes the document*, so it is an
    // edit like any other: the cell is invalidated, recomputes, and mints a new node. Everything
    // downstream — editor-5's buffer, the change history, dependent cells — then follows by the
    // ordinary rules instead of needing to be told separately. State that must outlive the remount
    // lives in `lensState`, not on the node.
    self.define(self._name, self._inputs.map((i) => i._name), fn);
    const fresh = await settle(self, node);
    if (fresh) {
      fresh.lastPut = record;
      fresh.dispatchEvent(new CustomEvent("lens-put", { detail: record }));
    }
    return emit(record);
  }

  // A structural edit: a pure command rewrites the SVG document text, `literalLens` carries it back
  // into the cell definition, and the writer renders it.
  // `rebase` maps an address across this edit, for whoever is holding one. The writer never applies
  // it — it does not know that selection exists — it just reports it on the event.
  async function runCommand(name, fn, { rebase = null, vertex = null } = {}) {
    const s = target.cellSource();
    if (s === null) return null;
    const L = literalLens(target.alias());
    const next = L.put(fn(L.get(s)), s);
    // `vertex` is the sub-element half of the same promise (P7): an op describing how this edit
    // renumbers vertices within one element, for whoever is holding an address inside it.
    const record = { target: name, attribute: "(structure)", before: "", after: "", rebase, vertex,
                     GetPut: L.put(L.get(next), next) === next, PutGet: true, span: null };
    if (next === s) { node.lastPut = record; return record; }
    return applySource(next, record);
  }

  // The three sinks a gesture can land in (§4 of the design note). Which one applies is decided by
  // the *provenance* of the slot being moved, not by the gesture: source text is written here, an
  // expression's value is written upstream, and anything else is locked and says so.
  //
  // Sink 2: the whole attribute is one hole, `${x}`. If `x` is an input of this cell and has a view,
  // moving the handle moves the view — the runtime then re-renders the drawing for us.
  function writeUpstream(expr, value) {
    const self = target.variable();
    const m = /^\$\{\s*([A-Za-z_$][\w$]*)\s*\}$/.exec(expr);
    if (!self || !m) return "the expression is not a plain identifier";
    const input = self._inputs.find((v) => v && v._name === m[1]);
    if (!input) return `${m[1]} is not an input of this cell`;
    const view = [...runtime._variables].find(
      (v) => v._name === "viewof " + m[1] && v._module === input._module);
    const el = view && view._value;
    if (!el || typeof el !== "object" || !("value" in el)) return `${m[1]} has no view to write to`;
    el.value = Number(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return null;                                         // written
  }

  // Sink 1 with holes present: write the literal slots, keep the expressions, report what was locked.
  async function commitInterpolated(idx, name, value, dflt, inner, srcText, record, was) {
    const s = target.cellSource();
    const el = target.elems()[idx];
    // What the holes rendered to *before* this gesture. A tool that previews by writing the live
    // element must say so (`was`), or the diff is taken against its own preview and every slot looks
    // untouched — the drag then commits nothing at all.
    const rendered = was || (el && el.getAttribute(name)) || dflt || "";
    const nextRendered = inner ? inner.put(value, rendered) : String(value);
    const slots = slotsOf(srcText);
    // The whole value is one expression: nothing here to write, so try the upstream sink.
    if (slots.length === 1 && slots[0].kind === "hole" && slots[0].text.length === srcText.length) {
      const why = writeUpstream(srcText, (nextRendered.match(/[+-]?(?:\d+\.?\d*|\.\d+)/) || [])[0]);
      record.sink = why ? "locked" : "upstream";
      record.locked = why;
      if (why && el) el.setAttribute(name, rendered);     // put the preview back: nothing was written
      return emit(record);
    }
    const merged = mergeInterpolated(srcText, rendered, nextRendered);
    // A moved hole is not automatically a dead end: if it names a view, move the view instead. That
    // is the same routing decision as the whole-hole case, taken per slot.
    const nums = nextRendered.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || [];
    const stillLocked = [];
    let wroteUpstream = false;
    for (const i of merged.locked) {
      const why = writeUpstream(slots[i].text, nums[i]);
      if (why) stillLocked.push(`${slots[i].text} (${why})`); else wroteUpstream = true;
    }
    record.sink = merged.reason || stillLocked.length ? "mixed (partly locked)"
                : wroteUpstream ? "upstream + literal" : "literal";
    record.locked = merged.reason || (stillLocked.length ? stillLocked.join("; ") : null);
    const next = cellAttrLens(target.alias(), idx, name, dflt).put(merged.text, s);
    if (next === s) {
      if (el) el.setAttribute(name, rendered);
      return emit(record);
    }
    record.after = merged.text;
    return applySource(next, record);
  }

  // One gesture, one put, through the composed lens. `inner` refines the attribute string into the
  // view the gesture actually manipulates (a translate pair; the string itself otherwise).
  async function commit(idx, name, value, dflt, inner, was = null) {
    const s = target.cellSource();
    if (s === null) return null;
    const alias = target.alias();
    const base = cellAttrLens(alias, idx, name, dflt);
    const srcText = base.get(s);
    if (srcText !== null && holeSpans(srcText).length) {
      const el = target.elems()[idx];
      return commitInterpolated(idx, name, value, dflt, inner, srcText, {
        target: (el ? el.localName : "?") + "[" + idx + "]", attribute: name,
        before: srcText, after: srcText, GetPut: true, PutGet: true, span: null
      }, was);
    }
    const l = inner ? compose(base, inner) : base;
    const before = l.get(s);
    const next = l.put(value, s);
    const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]) : a === b);
    const record = {
      target: target.elems()[idx].localName + "[" + idx + "]", attribute: name,
      before: String(before), after: String(l.get(next)),
      // the laws, re-checked on the source this gesture just produced
      GetPut: l.put(l.get(next), next) === next,
      PutGet: same(l.get(next), value),
      span: null
    };
    if (next === s) {
      // skip rule: the view is unchanged, so the source keeps its residue — make the DOM agree
      const v = attrVal(target.doc(), idx, name);
      const el = target.elems()[idx];
      if (v === null) el.removeAttribute(name); else el.setAttribute(name, v);
      return emit(record);
    }
    const [a, b] = literalSpan(next, alias);
    const tok = attrVal(next.slice(a, b), idx, name);
    if (tok !== null) {                                // highlight the attribute we just wrote
      const at = next.indexOf(name + '="' + tok + '"', a);
      record.span = at === -1 ? null : [at, at + (name + '="' + tok + '"').length];
    }
    return applySource(next, record);
  }

  // G44. One gesture is one edit, even when it moves several attributes of several elements — a rect
  // drag writes `x` and `y`, a corner-resize writes four. Committing them one at a time mints a node
  // and a history entry per attribute, so a single drag cost several undos. This folds every plain
  // attribute put into one running source string and calls `applySource` **once**: one redefine, one
  // remount, one entry in the change history. Order among the puts does not matter — each targets a
  // different (idx, name) and re-reads the literal from scratch, so `spliceAttr`'s shifting offsets
  // never cross. An edit whose attribute is an interpolated `${…}` hole is a different sink (upstream
  // or locked), which this does not fold; a group containing one falls back to the sequential path,
  // which is correct if less tidy — no gesture the editor has today mixes the two.
  async function commitMany(edits) {
    const s0 = target.cellSource();
    if (s0 === null) return edits.map(() => null);
    const alias = target.alias();
    const hasHole = edits.some((e) => {
      const t = cellAttrLens(alias, e.idx, e.name, e.dflt).get(s0);
      return t !== null && holeSpans(t).length > 0;
    });
    if (hasHole) {                                       // not foldable: keep each its own edit
      const out = [];
      for (const e of edits) out.push(await commit(e.idx, e.name, e.value, e.dflt, e.inner, e.was));
      return out;
    }
    let next = s0;
    const records = [];
    for (const e of edits) {
      const base = cellAttrLens(alias, e.idx, e.name, e.dflt);
      const l = e.inner ? compose(base, e.inner) : base;
      const before = l.get(next);
      const after = l.put(e.value, next);
      const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]) : a === b);
      const el = target.elems()[e.idx];
      records.push({
        target: (el ? el.localName : "?") + "[" + e.idx + "]", attribute: e.name,
        before: String(before), after: String(l.get(after)),
        GetPut: l.put(l.get(after), after) === after, PutGet: same(l.get(after), e.value), span: null
      });
      next = after;
    }
    if (next === s0) {                                   // the whole group was a no-op: reconcile the DOM
      for (const e of edits) {
        const v = attrVal(target.doc(), e.idx, e.name);
        const el = target.elems()[e.idx];
        if (el) { if (v === null) el.removeAttribute(e.name); else el.setAttribute(e.name, v); }
      }
      records.forEach(emit);
      return records;
    }
    const merged = { target: records[0].target, attribute: records.map((r) => r.attribute).join("+"),
                     before: "", after: "", GetPut: records.every((r) => r.GetPut),
                     PutGet: records.every((r) => r.PutGet), span: null, group: records };
    await applySource(next, merged);
    return records;
  }

  return { applySource, runCommand, commit, commitMany };
}
)};

// ---- the overlay: handles live in the DOM only, never in the source ------------------------------
const _sl118 = function _svgOverlay(){return(
(node) => {
  const NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(NS, "g");
  el.setAttribute("data-svg-lens-overlay", "");
  const style = document.createElementNS(NS, "style");
  style.textContent = `
      [data-svg-lens-overlay] .anchor{fill:#fff;stroke:#2F6BFF;stroke-width:2;cursor:grab}
      [data-svg-lens-overlay] .ctrl{fill:#EDF1E8;stroke:#8A63D2;stroke-width:1.5;cursor:grab}
      [data-svg-lens-overlay] .hit{fill:transparent;stroke:none;cursor:grab}
      [data-svg-lens-overlay] .scale{fill:#fff;stroke:#2F6BFF;stroke-width:2;cursor:nwse-resize}
      [data-svg-lens-overlay] .rotate{fill:#2F6BFF;stroke:#fff;stroke-width:1.5;cursor:grab}
      [data-svg-lens-overlay] .pivot{fill:#E4572E;stroke:#fff;stroke-width:2;cursor:move}
      [data-svg-lens-overlay] .box{fill:none;stroke:#2F6BFF;stroke-dasharray:4 3;stroke-width:1;opacity:.6}
      [data-svg-lens-overlay] .link{stroke:#8A63D2;stroke-dasharray:3 3;stroke-width:1;fill:none;opacity:.7}
      [data-svg-lens-overlay] .guide{stroke:#E4572E;stroke-width:1;opacity:.9}
      [data-svg-lens-overlay] .locked{fill:#cfcfcf;stroke:#9a9a9a;stroke-dasharray:2 2;cursor:not-allowed}
      [data-svg-lens-overlay] .hover{fill:none;stroke:#2F6BFF;stroke-width:1.5;opacity:.5;pointer-events:none}
      [data-svg-lens-overlay] .sel{fill:#2F6BFF;stroke:#fff}
      [data-svg-lens-overlay] .chip{stroke:#2F6BFF;stroke-width:1.5}
      [data-svg-lens-overlay] .chip-label{fill:#2F6BFF;font-family:ui-monospace,monospace;dominant-baseline:middle;text-anchor:middle;pointer-events:none;user-select:none}`;
  el.appendChild(style);
  node.appendChild(el);
  // Two layers, because the overlay draws in two coordinate systems. `el` carries the focused
  // element's transform, so handles need no screen-space maths. Anything measured in the root's
  // space — alignment guides, a marquee, a shape preview — goes in `rootEl`, which is never
  // transformed. One shared layer meant drawing a guide had to clear the alignment first, which
  // left the handles and the selection box at the element's *untransformed* position for the rest
  // of the gesture: after one move, every later drag ghosted the shape's original position.
  const rootEl = document.createElementNS(NS, "g");
  rootEl.setAttribute("data-svg-lens-overlay", "");
  node.appendChild(rootEl);
  const make = (parent) => (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };
  return {
    el,
    rootEl,
    isOwn: (n) => n === el || el.contains(n) || n === rootEl || rootEl.contains(n),
    // Everything except the stylesheet: previews are arbitrary shapes, not just handles.
    clear: () => {
      [...el.childNodes].forEach((n) => { if (n !== style) n.remove(); });
      [...rootEl.childNodes].forEach((n) => n.remove());
    },
    add: make(el),
    addRoot: make(rootEl),
    root: node,
    // Handles are drawn in the focused element's own user space, so no screen-space maths is needed
    // to place them — the browser applies the same CTM it applies to the shape.
    //
    // The element's *cumulative* transform, not the `transform` attribute it happens to carry: a
    // shape inside `<g transform="translate(150,10)">` has no attribute of its own, and reading one
    // drew its handles at the root's origin instead of on the shape. Two screen matrices divide out
    // to exactly "target's user space, expressed in the root's", which is this layer's job.
    alignTo: (target) => {
      if (!target) return el.setAttribute("transform", "");
      const t = target.getScreenCTM && target.getScreenCTM();
      const r = node.getScreenCTM && node.getScreenCTM();
      if (!t || !r) return el.setAttribute("transform", target.getAttribute("transform") || "");
      const m = r.inverse().multiply(t);
      el.setAttribute("transform", `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
    }
  };
}
)};

// An element's bounding box in the root's user space, so boxes for several elements — each with its
// own transform — can be drawn in one coordinate system. The corners are mapped and re-bounded; the
// box of a rotated element is the box of its rotated corners, not its rotated box.
const _sl119a = function _boxInRoot(){return(
(el, root) => {
  if (!el.getBBox || !el.getScreenCTM || !root.getScreenCTM) return null;
  const rm = root.getScreenCTM(), em = el.getScreenCTM();
  if (!rm || !em) return null;
  const M = rm.inverse().multiply(em);
  const b = el.getBBox();
  const xs = [], ys = [];
  for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]]) {
    xs.push(M.a * x + M.c * y + M.e);
    ys.push(M.b * x + M.d * y + M.f);
  }
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, width: Math.max(...xs) - x0, height: Math.max(...ys) - y0 };
}
)};

// Alignment snapping, as pure rectangle arithmetic: given the box being dragged and the boxes it
// could align to, return the nudge that lands it on the nearest edge or centre within `tol`, and the
// guides to draw for it. Coordinate-system agnostic — the caller passes boxes in one space and gets
// a delta in that space. Each axis snaps independently, and ties go to the smaller correction.
const _sl127 = function _snapRects(){return(
(moving, others, tol = 6) => {
  const lines = (b) => ({ x: [b.x, b.x + b.width / 2, b.x + b.width],
                          y: [b.y, b.y + b.height / 2, b.y + b.height] });
  const mine = lines(moving);
  const best = { x: null, y: null };
  for (const o of others) {
    const theirs = lines(o);
    for (const axis of ["x", "y"]) {
      for (const a of mine[axis]) for (const b of theirs[axis]) {
        const d = b - a;
        if (Math.abs(d) > tol) continue;
        if (!best[axis] || Math.abs(d) < Math.abs(best[axis].d)) best[axis] = { d, at: b, other: o };
      }
    }
  }
  const guides = [];
  const span = (axis, at, o) => {
    // The guide runs across both boxes on the other axis, so it reads as "these two line up".
    const lo = axis === "x" ? Math.min(moving.y, o.y) : Math.min(moving.x, o.x);
    const hi = axis === "x" ? Math.max(moving.y + moving.height, o.y + o.height)
                            : Math.max(moving.x + moving.width, o.x + o.width);
    return axis === "x" ? { x1: at, y1: lo, x2: at, y2: hi } : { x1: lo, y1: at, x2: hi, y2: at };
  };
  const dx = best.x ? best.x.d : 0, dy = best.y ? best.y.d : 0;
  if (best.x) guides.push(span("x", best.x.at, best.x.other));
  if (best.y) guides.push(span("y", best.y.at, best.y.other));
  // `snapped` distinguishes "already aligned" (d === 0 with a match) from "nothing to align to".
  return { dx, dy, guides, snapped: { x: !!best.x, y: !!best.y } };
}
)};

// Drop any address that lies inside another one in the set. Selecting a group *and* its children
// would move the children twice — once with the group, once on their own.
const _sl119c = function _topmostPaths(){return(
(paths) => {
  const key = (p) => p.join("/") + "/";
  const keys = paths.map(key);
  return paths.filter((p, i) => !keys.some((k, j) => j !== i && key(p).startsWith(k) && k.length < keys[i].length));
}
)};

// Where does a z-order gesture put an element? Pure, so the semantics are testable without a DOM:
// "front" is last in document order because SVG paints in document order.
const _sl119b = function _zTarget(){return(
(kind, from, count) => {
  const last = Math.max(0, count - 1);
  const clamp = (i) => Math.max(0, Math.min(last, i));
  if (kind === "front") return last;
  if (kind === "back") return 0;
  if (kind === "raise") return clamp(from + 1);
  if (kind === "lower") return clamp(from - 1);
  throw new Error(`unknown z-order: ${kind}`);
}
)};

// ---- selection: which element is being edited, and its handles -----------------------------------
// Selection is held as a *path*, not an index: an index into document order is invalidated by any
// insert or delete before it, a path only by an edit to its own parent chain. `index` stays available
// because the handle lenses address elements the way tokenize() does.
const _sl119 = function _svgFocus(shapeLookup,svgShapes,transformHandles,rotateHandle,nodeAt,boxInRoot,topmostPaths,attrVal,holeSpans,vertexAddress){return(
(overlay, target, onChange = () => {}, shapes = svgShapes) => {
  // A set, ordered by when each element was added. The first is the primary: handles, and everything
  // that only makes sense for one element, follow it. Single selection is the one-element case, so
  // the tools that predate multi-select need no changes.
  let paths = [], mode = null;
  // Which vertices are selected, as P7 addresses rather than handle keys — so a selected vertex
  // survives a commit that renumbers the ones before it.
  let verts = [];
  // S9. What to draw *on* the selection once its box is known — set by svgLens, which alone has the
  // affordance registry and `canCommand`. `paint` computes the box (single or union) and hands it over.
  let decorate = null;
  // G12. The rotation pivot, in the primary element's *local* user space (where its bbox and every
  // transform handle live), or null for "the bounding-box centre". Moving it writes nothing — it is a
  // property of how you are about to rotate, not of the drawing — so it lives here beside the selection.
  let pivot = null;
  const key = (p) => p.join("/");
  const indexOfPath = (p) => {
    if (!p) return null;
    const t = target.doc();
    if (t === null) return null;
    try { return nodeAt(t, p).index; } catch (e) { return null; }      // the element is gone
  };
  const indexOf = () => indexOfPath(paths.length ? paths[0] : null);
  const element = () => { const i = indexOf(); return i === null ? null : target.elems()[i]; };
  const handles = () => {
    const idx = indexOf();
    if (idx === null) return [];
    // The transform gizmo reads the element's own bounding box: the geometry it frames is the
    // element's, not the source's, and getBBox is already in the space the handles are drawn in.
    if (mode === "transform") {
      const el = element();
      if (!el || !el.getBBox) return [];
      try {
        const b = el.getBBox();
        const hs = transformHandles(b);
        const c = pivot || [b.x + b.width / 2, b.y + b.height / 2];   // G12: the movable rotation pivot
        hs.push({ key: "pivot", kind: "pivot", x: c[0], y: c[1] });
        return hs;
      } catch (e) { return []; }
    }
    const t = target.doc();
    if (t === null) return [];
    const e = shapeLookup.forMode(shapes, mode);
    if (!e) return [];
    let hs;
    try { hs = e.handles(t, idx); }
    catch (err) { return []; }                          // outside the lens domain: no handles
    if (!e.rotatable) return hs;
    const el = element();                               // borrow the stalk, nothing else
    if (!el || !el.getBBox) return hs;
    try { return hs.concat(rotateHandle(el.getBBox())); } catch (err) { return hs; }
  };
  const scaleOf = (el) => { const m = el.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
  const paint = () => {
    overlay.clear();
    // A detached node cannot read its own document, and "I cannot see it" is not "it is gone": drop
    // nothing and draw nothing. Without this the *old* node's last repaint after a commit filtered
    // every path away — every address resolves against a document it no longer projects — and wrote
    // that emptiness over the shared selection the new node had just restored. Invisible until the
    // next thing that reads the shared state, which is undo.
    if (target.doc() === null) return;
    paths = paths.filter((p) => indexOfPath(p) !== null);               // drop what no longer resolves
    if (paths.length > 1) {                                            // a set: boxes only, no handles
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of paths) {
        const el = target.elems()[indexOfPath(p)];
        const b = el && boxInRoot(el, overlay.root);
        if (b) {
          overlay.addRoot("rect", { class: "box", x: b.x, y: b.y, width: b.width, height: b.height });
          x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
          x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
        }
      }
      if (decorate && x1 > x0) decorate({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
      return;
    }
    const idx = indexOf();
    if (idx === null) { paths = []; mode = null; return; }
    const el = target.elems()[idx];
    if (!el) return;
    // A non-graphics element — a gradient, marker or clip in <defs>, reached e.g. by the inspector's
    // "→ fill #id" jump — is selectable and editable in the inspector but has no box or CTM, so there
    // is nothing to frame on the canvas. Draw no handles rather than throwing on its missing
    // getScreenCTM/getBBox; the selection still stands, so onChange fires and the inspector follows.
    if (!el.getBBox || !el.getScreenCTM) return;
    overlay.alignTo(el);
    const r = 5 / Math.max(0.2, scaleOf(el));
    const hs = handles();
    const framed = mode === "transform"
                || !!(shapeLookup.forMode(shapes, mode) || {}).rotatable;
    if (framed && el.getBBox) {
      const b = el.getBBox();
      overlay.add("rect", { class: "box", x: b.x, y: b.y, width: b.width, height: b.height });
    }
    // A handle over an expression cannot write source. Show that before it is grabbed, rather than
    // letting the gesture look like it worked; the writer still refuses on release either way.
    const locked = (() => {
      const t = target.doc();
      if (t === null) return false;
      const e = shapeLookup.forMode(shapes, mode);
      const names = e ? e.writes : ["transform"];
      try {
        return names.some((n) => { const v = attrVal(t, idx, n); return !!(v && holeSpans(v).length); });
      } catch (err) { return false; }
    })();
    for (const h of hs) if (h.link) overlay.add("line", { class: "link", x1: h.x, y1: h.y, x2: h.link[0], y2: h.link[1] });
    // Which of these handles the vertex selection names, resolved now rather than remembered: an
    // address is an ordinal, and the handle it points at is whatever the source says it is today.
    const chosen = new Set();
    for (const a of verts) {
      if (key(a.path) !== key(paths[0] || [])) continue;
      const h = vertexAddress.resolve(hs, a);
      if (h) chosen.add(h.key);
    }
    for (const h of hs) {
      const cls = locked ? "locked"
                : h.kind === "anchor" || h.kind === "scale" || h.kind === "rotate" || h.kind === "pivot" ? h.kind : "ctrl";
      const on = chosen.has(h.key);
      overlay.add("circle", { class: cls + (on ? " sel" : ""),
                              r: (cls === "ctrl" ? r * 0.8 : r) * (on ? 1.35 : 1), cx: h.x, cy: h.y });
      overlay.add("circle", { class: "hit", r: r * 2.6, cx: h.x, cy: h.y }).dataset.key = h.key;
    }
    // The affordance chips sit in root space (like the multi-selection boxes), so one placement rule
    // serves single and set alike — the box is the primary's, mapped to root.
    if (decorate) { const b = boxInRoot(el, overlay.root); if (b) decorate(b); }
  };
  // One place announces that the selection may have changed: whatever redrew it.
  const draw = () => { paint(); onChange(); };
  return {
    get path() { return paths.length ? paths[0] : null; },             // the primary
    get paths() { return paths.slice(); },
    get indices() { return paths.map(indexOfPath).filter((i) => i !== null); },
    get index() { return indexOf(); },
    get mode() { return mode; },
    handles,
    setDecorate(fn) { decorate = fn; },
    // G12. Read/set the rotation pivot; a fresh selection resets it to the box centre (null).
    get pivot() { return pivot ? pivot.slice() : null; },
    setPivot(p) { pivot = p ? p.slice() : null; draw(); },
    refresh: draw,
    set(p, m) { paths = p ? [p] : []; mode = p ? m : null; pivot = null; draw(); },
    setAll(ps, m = null) { paths = topmostPaths(ps); mode = paths.length === 1 ? m : null; pivot = null; draw(); },
    // Shift-click: in or out of the set, primary unchanged unless it was the one removed.
    toggle(p) {
      const i = paths.findIndex((q) => key(q) === key(p));
      if (i >= 0) paths.splice(i, 1); else paths = topmostPaths(paths.concat([p]));
      if (paths.length !== 1) mode = null;
      draw();
    },
    clear() { paths = []; verts = []; mode = null; pivot = null; draw(); },
    // ---- the vertex selection (P7) ---------------------------------------------------------------
    get vertices() { return verts.slice(); },
    setVertices(list) { verts = (list || []).slice(); draw(); },
    toggleVertex(a) {
      const i = verts.findIndex((v) => vertexAddress.same(v, a));
      if (i >= 0) verts.splice(i, 1); else verts.push(a);
      draw();
    },
    // Carry the selection across a structural edit; a dropped path means that element was deleted.
    rebase(fn) {
      paths = paths.map(fn).filter(Boolean);
      if (paths.length !== 1) mode = null;
    },
    // The same promise one level down. A dropped address means that vertex is the one that went.
    rebaseVertices(fn) { verts = fn ? verts.map(fn).filter(Boolean) : verts; }
  };
}
)};

// ================================================================================================
// TOOLS — pointer state machines. A tool reads the document, previews in the DOM, and emits a
// command or a commit; it never writes the source itself. Registered in `svgTools`, so a new tool is
// a new cell rather than an edit to svgLens.
//
//   onPointerDown(ctx, e) -> true to claim the gesture (later moves and the release go to this tool)
//   onPointerMove(ctx, e)
//   onPointerUp(ctx, e)
//   onDblClick(ctx, e)    -> true if handled
//   onCancel(ctx)         -> true if it had something to abandon (Escape; see node.cancelGesture)
//   onHover(ctx, e)       -> between gestures only; decoration, never an edit
//   onPointerLeave(ctx, e)
//
// ctx = { node, options, target, writer, focus, elems(), doc(), localPoint(el, e), snap(v), state }
// ================================================================================================

// Rotate and scale from the bounding box. Rotation appends `rotate(a cx cy)` at the tail, where it
// acts on the element's own geometry, so it needs no compensation and stays readable. Scaling appends
// `scale(sx sy)` and then fixes the leading translate so the corner you are NOT dragging stays put —
// solved numerically against the real matrices rather than by algebra over a particular op order,
// which is what makes it correct for a transform list the author wrote by hand.
// Capture on the root, never on the handle: refreshing the overlay mid-drag destroys the handle, and
// with it the capture. Best-effort — a pointer the browser no longer tracks must not kill the gesture.
const _sl124c = function _grabPointer(){return(
(node, e) => { try { node.setPointerCapture(e.pointerId); } catch (_) {} }
)};

// ---- the gesture delta ---------------------------------------------------------------------------
// What a gesture is, as a value. A tool computes one of these — or a list of them — and hands it to
// both sinks: `previewDelta` paints it into the live DOM, `commitDelta` writes it to the source.
// Deriving the preview from the same `(value, lens, base)` the commit uses is what makes the two
// agree; it is the discipline `shapeSpec`/`shapeMarkup` already applies to creation, generalised.
//
//   attr     an attribute put    { idx, name, value, lens, base, dflt, was }
//   command  a structural edit   { name, apply, rebase }
//   select   selection only      { paths, mode }
//
// A preview the source cannot express — a rubber band, a ghost shape — is not a delta; a tool draws
// that into the overlay's root layer itself. `previewDelta` only ever touches what it will commit.
const _sl128 = function _gestureDelta(){return(
{
  attr: (idx, name, value, { lens = null, base = "", dflt = null, was = null } = {}) =>
    ({ kind: "attr", idx, name, value, lens, base, dflt, was }),
  // `select` is what the selection should be *after* the command — a function, because the addresses
  // it names only exist once the edit has happened. A command that does not say leaves the selection
  // to the rebase, which is the right answer for an edit that only moves things about.
  command: (name, apply, { rebase = null, select = null, vertex = null } = {}) =>
    ({ kind: "command", name, apply, rebase, select, vertex }),
  // The clipboard is not the document, so putting something on it is not a source edit — same
  // argument as `select` and `view`, and the reason copy can be a command at all (S4/P8).
  clip: (markups) => ({ kind: "clip", markups }),
  // `toggle` is shift-click: in or out of the set. An empty `paths` clears.
  select: (paths, mode = null, { toggle = false } = {}) => ({ kind: "select", paths, mode, toggle }),
  // Something to *show* that the source cannot express: a hover outline, a rubber band, a readout.
  // `marks` are overlay primitives `{tag, attrs, layer, text}` and `key` names the group they replace,
  // so emitting the same key each frame is idempotent rather than cumulative. Without this a gesture
  // that only decorates would have to reach into the DOM itself, which L3 forbids.
  view: (marks, { key = "view", cursor = null } = {}) => ({ kind: "view", marks, key, cursor }),
  // G13: a numeric readout during a drag — dx/dy, w×h, an angle. It is a `view` (T9: showing a
  // number is not editing the source), drawn in the root layer at a user-space point. `font` is in
  // user units so the caller divides out the zoom; a white stroke under the fill keeps it legible
  // over any drawing. Keyed "readout", so each frame replaces the last.
  readout: (text, [ux, uy], font) => ({ kind: "view", key: "readout", cursor: null, marks: [{
    layer: "root", tag: "text", text,
    attrs: { x: ux + font * 0.8, y: uy - font * 0.8, "font-size": font, "font-family": "ui-monospace,monospace",
             fill: "#111", stroke: "#fff", "stroke-width": font * 0.28, "paint-order": "stroke",
             "stroke-linejoin": "round", "pointer-events": "none" } }] }),
  // The attribute text this delta stands for. One expression, read by both sinks.
  text: (d) => (d.lens ? d.lens.put(d.value, d.base) : String(d.value))
}
)};

const _sl128a = function _previewDelta(gestureDelta){return(
(ctx, ds) => {
  const out = [];
  for (const d of [].concat(ds)) {
    if (!d) continue;
    if (d.kind === "view") {
      // Replace this key's marks rather than adding to them. `focus.refresh()` clears both overlay
      // layers wholesale, so a stale mark cannot outlive a repaint either way — this is about the
      // frames between repaints, which is most of them during a hover.
      for (const layer of [ctx.overlay.el, ctx.overlay.rootEl])
        for (const n of [...layer.querySelectorAll(`[data-view-key="${d.key}"]`)]) n.remove();
      for (const m of d.marks || []) {
        const n = (m.layer === "el" ? ctx.overlay.add : ctx.overlay.addRoot)(m.tag, m.attrs);
        if (m.text != null) n.textContent = m.text;      // G13: a readout is a text mark
        n.dataset.viewKey = d.key;
        out.push(n);
      }
      if (d.cursor !== null) ctx.node.style.cursor = d.cursor;
      continue;
    }
    if (d.kind !== "attr") continue;                // commands and selections have no attribute preview
    const el = ctx.elems()[d.idx];
    if (!el) continue;
    el.setAttribute(d.name, gestureDelta.text(d));
    out.push(el);
  }
  return out;
}
)};

// The third sink, and the reason `attr` carries `was`: put back what the preview overwrote. A
// gesture that is abandoned must leave the drawing showing what the source says, and the source is
// unchanged — nothing was committed — so the correct view is simply the one from before the preview.
// An empty `was` means the attribute was not there: restoring it as `transform=""` would render the
// same and still make the live DOM disagree with a re-render of the source, which T5 would catch.
const _sl128c = function _revertDelta(){return(
(ctx, ds) => {
  for (const d of [].concat(ds)) {
    if (!d || d.kind !== "attr") continue;
    const el = ctx.elems()[d.idx];
    if (!el) continue;
    if (d.was === null || d.was === undefined || d.was === "") el.removeAttribute(d.name);
    else el.setAttribute(d.name, d.was);
  }
  ctx.overlay.clear();
  ctx.focus.refresh();
}
)};

const _sl128b = function _commitDelta(){return(
async (ctx, ds) => {
  const list = [].concat(ds).filter(Boolean);
  // G44: a gesture that is only attribute puts commits as one edit — one undo entry — through
  // `commitMany`. Anything else (a command, a selection, a mixed list) keeps the per-delta path,
  // which no current gesture needs to fold across.
  if (list.length > 1 && list.every((d) => d.kind === "attr"))
    return ctx.writer.commitMany(list.map((d) => ({ idx: d.idx, name: d.name, value: d.value,
                                                    dflt: d.dflt, inner: d.lens, was: d.was })));
  const out = [];
  for (const d of list) {
    if (!d) continue;
    if (d.kind === "attr")
      out.push(await ctx.writer.commit(d.idx, d.name, d.value, d.dflt, d.lens, d.was));
    else if (d.kind === "command") {
      const rec = await ctx.writer.runCommand(d.name, d.apply, { rebase: d.rebase, vertex: d.vertex });
      // After the put, so the addresses it names exist. The rebase has already run by now and moved
      // whatever the selection was; this replaces it when the command knows better.
      if (d.select) { const p = d.select(); if (p) ctx.focus.setAll(p); }
      out.push(rec);
    } else if (d.kind === "clip") {
      ctx.clipboard.write(d.markups);
      out.push(null);                                 // the clipboard is not the source
    } else if (d.kind === "select") {
      if (d.toggle) for (const p of d.paths) ctx.focus.toggle(p);
      else if (d.paths.length === 1 && d.mode) ctx.focus.set(d.paths[0], d.mode);
      else ctx.focus.setAll(d.paths);
      out.push(null);                               // selection is not a source edit
    } else if (d.kind === "view") out.push(null);     // decoration: never a source edit (T9's cousin)
    else throw new Error(`unknown delta kind: ${d.kind}`);
  }
  return out;
}
)};

const _sl124 = function _toolTransform(opsLens,rotateAbout,scaleAbout,grabPointer,gestureDelta,previewDelta,commitDelta,revertDelta){return(
{
  id: "transform",
  onPointerDown(ctx, e) {
    const key = e.target.dataset && e.target.dataset.key;
    // Scale handles only in the gizmo's own mode; the rotate stalk in any mode, because a shape
    // entry that writes its own geometry still has no attribute for an angle (`rotatable`).
    if (key === undefined || (ctx.focus.mode !== "transform" && key !== "rot")) return false;
    const idx = ctx.focus.index;
    const el = ctx.elems()[idx];
    const t = ctx.doc();
    if (!el || t === null) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    const b = ctx.bbox(el);
    if (!b) return false;
    // G12. Grabbing the pivot mark moves it — a view change, not an edit: it writes nothing, so it
    // needs no `text`/`ops`, and a rotate afterwards reads `focus.pivot` as its centre.
    if (key === "pivot") { ctx.state.drag = { tool: "transform", key, idx, el, pivotMove: true, started: false }; return true; }
    const text = ctx.attr(t, idx, "transform") || "";
    const centre = ctx.focus.pivot || [b.x + b.width / 2, b.y + b.height / 2];
    // A rotate drag is *relative*: capture where the grab started and the box's current angle, so the
    // shape turns with the pointer from where it already is instead of snapping its top to the pointer.
    // Measured in screen space (which does not spin with the element, unlike `localPoint`, whose frame
    // rotates as the box does and so always reads the handle as straight up — the snap this avoids).
    let rotStart = null;
    if (key === "rot") {
      const m = ctx.screenCTM(el);
      if (m) {
        const csx = m.a * centre[0] + m.c * centre[1] + m.e;   // pivot in screen px (fixed under a spin)
        const csy = m.b * centre[0] + m.d * centre[1] + m.f;
        rotStart = { centreScreen: [csx, csy], baseAngle: Math.atan2(m.b, m.a) * 180 / Math.PI,
                     grab: Math.atan2(e.clientY - csy, e.clientX - csx) };
      }
    }
    ctx.state.drag = {
      tool: "transform",                                 // see the note on `onCancel` below
      key, idx, el, b, text, base: opsLens.get(text), ops: opsLens.get(text), started: false, rotStart,
      centre: [b.x + b.width / 2, b.y + b.height / 2],   // the box centre: what alt-scale scales about
      rotCentre: centre,                                  // G12: the (possibly moved) rotation pivot
      // the corner opposite the one being dragged: the point that must not move
      pivot: key === "rot" ? null : [
        /w$/.test(key) ? b.x + b.width : b.x,
        /^n/.test(key) ? b.y + b.height : b.y
      ]
    };
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    const p = ctx.localPoint(d.el, e);
    if (!p) return;
    d.started = true;
    // G12. Dragging the pivot just repositions it; the rotate gesture that follows reads it.
    if (d.pivotMove) {
      ctx.focus.setPivot(p);
      const at = ctx.localPoint(ctx.node, e);
      if (at) previewDelta(ctx, gestureDelta.readout(`pivot ${p[0].toFixed(1)}, ${p[1].toFixed(1)}`, at, ctx.readoutFont()));
      return;
    }
    if (d.key === "rot") {
      // Relative turn: base angle plus how far the pointer has swept around the pivot since the grab,
      // both measured in screen space. The fallback (no CTM) keeps the old absolute behaviour.
      const rs = d.rotStart;
      const a = rs
        ? rs.baseAngle + (Math.atan2(e.clientY - rs.centreScreen[1], e.clientX - rs.centreScreen[0]) - rs.grab) * 180 / Math.PI
        : Math.atan2(p[1] - d.rotCentre[1], p[0] - d.rotCentre[0]) * 180 / Math.PI + 90;
      const step = e.shiftKey ? 15 : 1;
      const ang = Math.round(a / step) * step;
      d.ops = rotateAbout(d.base, ang, d.rotCentre[0], d.rotCentre[1]);
      d.read = `${((Math.round(ang) % 360) + 360) % 360}°`;
    } else {
      // G11: alt scales about the centre, so both sides move symmetrically — the pivot becomes the
      // centre and the reference dimension a half, which is exactly what keeps a corner under the
      // pointer. `abs` already makes the sign robust either way.
      const alt = e.altKey;
      const pivot = alt ? d.centre : d.pivot;
      const w = (d.b.width || 1) * (alt ? 0.5 : 1), h = (d.b.height || 1) * (alt ? 0.5 : 1);
      const sx = Math.abs((p[0] - pivot[0]) / (/w$/.test(d.key) ? -w : w)) || 0.01;
      const sy = Math.abs((p[1] - pivot[1]) / (/^n/.test(d.key) ? -h : h)) || 0.01;
      const k = e.shiftKey ? Math.max(sx, sy) : null;    // shift keeps the aspect ratio
      const fx = ctx.snap(k === null ? sx : k), fy = ctx.snap(k === null ? sy : k);
      d.ops = scaleAbout(d.base, fx, fy, pivot[0], pivot[1]);
      d.read = `${Math.round(fx * 100)}% × ${Math.round(fy * 100)}%`;
    }
    // One delta, both sinks. `opsLens.put` keeps the residue (`10,20`, `.5`, `1e2`) that reprinting
    // every op would flatten — and because the preview goes through the same `gestureDelta.text`
    // the commit does, the two cannot pick different printers. They used to, and did.
    d.delta = gestureDelta.attr(d.idx, "transform", d.ops,
                                { lens: opsLens, base: d.text, dflt: "", was: d.text });
    previewDelta(ctx, d.delta);
    ctx.focus.refresh();
    // G13: angle or scale, at the pointer, after the overlay clear.
    const at = ctx.localPoint(ctx.node, e);
    if (at && d.read) previewDelta(ctx, gestureDelta.readout(d.read, at, ctx.readoutFont()));
  },
  async onPointerUp(ctx) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    // A pivot move writes nothing, so no commit clears the overlay for it — clear its readout by hand.
    if (d && d.pivotMove) return void previewDelta(ctx, gestureDelta.view([], { key: "readout" }));
    if (d && d.started && d.delta) await commitDelta(ctx, d.delta);
  },
  // `state.drag` is one key shared by this tool, the vertex tool and the move tool — safe during a
  // gesture, because only one of them is ever active, but `cancelGesture` offers the cancel to every
  // tool, and without the stamp the first one asked would swallow another's scratch and revert
  // nothing. Found by T1 the first time cancel existed.
  onCancel(ctx) {
    const d = ctx.state.drag;
    if (!d || d.tool !== "transform") return false;
    ctx.state.drag = null;
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13
    revertDelta(ctx, d.delta || []);
    return true;
  }
}
)};

// Drag a vertex or control point: the `points` and path `d` lenses.
// G22. Translate a *set* of held vertices by one local delta, as one attribute edit per element — the
// "one delta per claimed element" of a move (G43), refined to the claimed vertices inside it. Anchors
// carry the control handles incident to them (a control links to the anchor it curves toward), so a
// curve translates rigidly rather than shearing; a control selected on its own moves alone. Relative
// commands are handled by re-deriving each argument from the *new* running pen position, so a rel
// chain where an earlier anchor also moved does not double-count. `H`/`V` anchors move only along
// their one axis, exactly as `handleEdit` moves them — the cross-axis component is simply dropped.
const _sl267 = function _moveVertices(vertexAddress,parsePath,printPath,parsePoints,printPoints,attrVal,PATH_ARG_COUNT){return(
(entry, src, idx, addrs, dlx, dly) => {
  const hs = entry.handles(src, idx);
  const sel = addrs.map((a) => vertexAddress.resolve(hs, a)).filter(Boolean);
  if (!sel.length) return [];
  if (entry.mode === "points") {
    const pts = parsePoints(attrVal(src, idx, "points"));
    for (const h of sel) if (h.i != null && pts[h.i]) pts[h.i] = [pts[h.i][0] + dlx, pts[h.i][1] + dly];
    return [{ name: "points", value: printPoints(pts) }];
  }
  if (entry.mode !== "path") return [];
  const anchors = sel.filter((h) => h.kind === "anchor");
  const near = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) < 1e-6;
  const moved = new Set(sel.map((h) => h.key));
  for (const h of hs)
    if (h.kind === "ctrl" && h.link && anchors.some((a) => near(h.link[0], h.link[1], a.x, a.y)))
      moved.add(h.key);
  const cmds = parsePath(attrVal(src, idx, "d"));
  let ocx = 0, ocy = 0, ncx = 0, ncy = 0, osx = 0, osy = 0, nsx = 0, nsy = 0;
  cmds.forEach((cmd, ci) => {
    const U = cmd.c.toUpperCase(), u = PATH_ARG_COUNT[U], rel = cmd.c !== U, A = cmd.a;
    if (u === 0) { ocx = osx; ocy = osy; ncx = nsx; ncy = nsy; return; }   // Z
    for (let o = 0; o < A.length; o += u) {
      const obx = ocx, oby = ocy, nbx = ncx, nby = ncy;
      const put = (ix, iy) => {
        const key = ci + ":" + o + ":" + ix + ":" + iy;
        const ox = rel ? obx + A[o + ix] : A[o + ix], oy = rel ? oby + A[o + iy] : A[o + iy];
        const nx = moved.has(key) ? ox + dlx : ox, ny = moved.has(key) ? oy + dly : oy;
        A[o + ix] = rel ? nx - nbx : nx;
        A[o + iy] = rel ? ny - nby : ny;
        return [ox, oy, nx, ny];
      };
      const setPen = (r) => { ocx = r[0]; ocy = r[1]; ncx = r[2]; ncy = r[3]; };
      switch (U) {
        case "M": { const r = put(0, 1); setPen(r); if (o === 0) { osx = r[0]; osy = r[1]; nsx = r[2]; nsy = r[3]; } break; }
        case "L": case "T": setPen(put(0, 1)); break;
        case "H": { const key = ci + ":" + o + ":0:-1", ox = rel ? obx + A[o] : A[o];
                    const nx = moved.has(key) ? ox + dlx : ox; A[o] = rel ? nx - nbx : nx;
                    ocx = ox; ncx = nx; break; }
        case "V": { const key = ci + ":" + o + ":-1:0", oy = rel ? oby + A[o] : A[o];
                    const ny = moved.has(key) ? oy + dly : oy; A[o] = rel ? ny - nby : ny;
                    ocy = oy; ncy = ny; break; }
        case "C": put(0, 1); put(2, 3); setPen(put(4, 5)); break;
        case "S": case "Q": put(0, 1); setPen(put(2, 3)); break;
        case "A": setPen(put(5, 6)); break;                 // radii/flags (0..4) are untouched
      }
    }
  });
  return [{ name: "d", value: printPath(cmds) }];
}
)};

const _sl120 = function _toolVertex(handleEdit,shapeLookup,grabPointer,gestureDelta,previewDelta,commitDelta,revertDelta,vertexAddress,pathSmooth,moveVertices,dragBox){return(
{
  id: "vertex",
  onPointerDown(ctx, e) {
    const key = e.target.dataset && e.target.dataset.key;
    const mode = ctx.focus.mode;
    if (ctx.focus.index === null) return false;
    // Any mode the registry knows; `transform` is not one of them, because the gizmo owns its own
    // handles. Adding a shape entry is therefore all it takes to make its handles draggable.
    const entry = shapeLookup.forMode(ctx.shapes, mode);
    if (!entry) return false;
    // G22. A press on *empty* canvas, while a shape's vertices are on show, bands a set of them — the
    // same way the marquee bands a set of elements, and a selection gesture, so it writes nothing (T9).
    // It must claim only empty canvas: a press on the shape body (to move it) or on another element (to
    // reselect) has to fall through to the move/marquee tools, exactly as it did before this tool grew
    // a marquee — otherwise `toolVertex` swallows every ordinary select/move press. `ctx.pick` is the
    // one hit contract (S1, P5), so "nothing here" is the same answer a click would get.
    if (key === undefined) {
      if (e.button !== 0 || ctx.pick(e).length) return false;
      const p = ctx.localPoint(ctx.node, e);
      if (!p) return false;
      e.preventDefault();
      grabPointer(ctx.node, e);
      ctx.state.vband = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], add: e.shiftKey, box: null, moved: false };
      return true;
    }
    e.preventDefault();
    grabPointer(ctx.node, e);
    // Grabbing a handle selects that vertex, by address rather than by key (P7): shift adds to the
    // set, anything else replaces it. This is what makes a vertex a thing you can hold — and it
    // survives the commit, because an ordinal is rebasable and a key is not.
    const ord = vertexAddress.ordinalOf(ctx.focus.handles(), key);
    const a = ord ? vertexAddress.of(ctx.focus.path, ord.kind, ord.n) : null;
    const set = ctx.focus.vertices || [];
    const inSet = a && set.some((s) => vertexAddress.same(s, a));
    // G22. Grabbing a vertex that is already part of a multi-selection drags the whole set; a press
    // that does not turn into a drag collapses to just that one (decided on release). Shift toggles.
    let multi = false;
    if (a) {
      if (e.shiftKey) ctx.focus.toggleVertex(a);
      else if (inSet && set.length > 1) multi = true;
      else ctx.focus.setVertices([a]);
    }
    const el0 = ctx.elems()[ctx.focus.index];
    ctx.state.drag = { tool: "vertex", key, idx: ctx.focus.index, mode, entry, started: false,
                       x0: e.clientX, y0: e.clientY, multi, addr: a,
                       addrs: multi ? set.slice() : (a ? [a] : []),
                       press: el0 ? ctx.localPoint(el0, e) : null,
                       // what it rendered before the preview overwrites it (see writer.commit)
                       was: el0 ? Object.fromEntries(entry.writes.map((n) => [n, el0.getAttribute(n)])) : null };
    return true;
  },
  onPointerMove(ctx, e) {
    const vb = ctx.state.vband;
    if (vb) {
      const p = ctx.localPoint(ctx.node, e);
      if (!p) return;
      vb.x1 = p[0]; vb.y1 = p[1]; vb.moved = true;
      const r = dragBox(vb.x0, vb.y0, vb.x1, vb.y1);
      if (!vb.box || !vb.box.isConnected) vb.box = ctx.overlay.addRoot("rect", { class: "box" });
      for (const k of ["x", "y", "width", "height"]) vb.box.setAttribute(k, r[k]);
      return;
    }
    const d = ctx.state.drag;
    if (!d) return;
    if (!d.started && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 3) return;
    d.started = true;
    const el = ctx.elems()[d.idx];
    const p = el && ctx.localPoint(el, e);
    const t = ctx.doc();
    if (!p || t === null) return;
    let edits, label;
    if (d.multi && d.press) {
      // G22. One local delta, applied to the whole held set as one attribute edit (see moveVertices).
      const dlx = p[0] - d.press[0], dly = p[1] - d.press[1];
      edits = moveVertices(d.entry, t, d.idx, d.addrs, dlx, dly);
      label = `${d.addrs.length} pts`;
    } else {
      // G21. A smooth anchor moves both of its handles; alt breaks the pair for this drag, which is
      // how you make a corner without saying so — the geometry stops being collinear and that *is* the
      // corner. Reading `altKey` off the live event, not off the press, so the decision is revocable
      // mid-drag like every other modifier here.
      const paired = d.mode === "path" && !e.altKey
        ? pathSmooth.couple(t, d.idx, d.key, p[0], p[1]) : null;
      edits = paired !== null ? [{ name: "d", value: paired }]
                              : handleEdit(d.mode, t, d.idx, d.key, p[0], p[1], ctx.shapes);
      label = `${p[0].toFixed(1)}, ${p[1].toFixed(1)}`;
    }
    if (!edits || !edits.length) return;
    // `handleEdit`/`moveVertices` already reprint the whole attribute, so there is no lens here: the
    // delta's value *is* the text. One delta per attribute the drag moves — a rect corner moves four —
    // and an attribute the drag did not change is not in the list, so T1 still holds edge by edge.
    d.delta = edits.map((ed) => gestureDelta.attr(d.idx, ed.name, ed.value,
                                { dflt: ed.dflt === undefined ? null : ed.dflt,
                                  was: d.was && d.was[ed.name] }));
    previewDelta(ctx, d.delta);
    ctx.focus.refresh();
    // G13: the point (or how many points) the drag is moving, shown at the pointer.
    const at = ctx.localPoint(ctx.node, e);
    if (at) previewDelta(ctx, gestureDelta.readout(label, at, ctx.readoutFont()));
  },
  async onPointerUp(ctx) {
    const vb = ctx.state.vband;
    if (vb) {
      ctx.state.vband = null;
      if (vb.box) vb.box.remove();
      const entry = shapeLookup.forMode(ctx.shapes, ctx.focus.mode);
      const t = ctx.doc();
      // A bare click on empty canvas deselects — the same thing the marquee does in select mode, so
      // clicking off a path leaves node editing rather than only emptying the vertex set.
      if (!vb.moved) return void (vb.add ? null : commitDelta(ctx, gestureDelta.select([])));
      if (!entry || t === null) return;
      const r = dragBox(vb.x0, vb.y0, vb.x1, vb.y1);
      const el = ctx.elems()[ctx.focus.index];
      const hs = entry.handles(t, ctx.focus.index);
      const hits = [];
      for (const h of hs) {
        if (h.kind !== "anchor") continue;                  // anchors are the vertices; controls ride them
        const rp = ctx.rootPoint(el, h.x, h.y);
        if (rp && rp[0] >= r.x && rp[0] <= r.x + r.width && rp[1] >= r.y && rp[1] <= r.y + r.height) {
          const ord = vertexAddress.ordinalOf(hs, h.key);
          if (ord) hits.push(vertexAddress.of(ctx.focus.path, ord.kind, ord.n));
        }
      }
      const all = (vb.add ? (ctx.focus.vertices || []) : []).slice();
      for (const a of hits) if (!all.some((s) => vertexAddress.same(s, a))) all.push(a);
      ctx.focus.setVertices(all);
      return;
    }
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (!d) return;
    if (!d.started) {                                        // a press that never dragged
      if (d.multi && d.addr) ctx.focus.setVertices([d.addr]);   // collapse the set to the one grabbed
      return;
    }
    if (d.delta) await commitDelta(ctx, d.delta);
  },
  onCancel(ctx) {
    const vb = ctx.state.vband;
    if (vb) { ctx.state.vband = null; if (vb.box) vb.box.remove(); return true; }
    const d = ctx.state.drag;
    if (!d || d.tool !== "vertex") return false;
    ctx.state.drag = null;
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13
    revertDelta(ctx, d.delta || []);
    return true;
  }
}
)};

// Group-vs-leaf, as one pure function (design note S1). A click means "the outermost thing that is
// not already opened": at the root scope a leaf inside a `<g>` stands for the `<g>`, and entering
// that group makes the same leaf stand for itself. A path that is not under the scope answers as if
// the scope were the root, so a stale scope can never make a click select something surprising.
const _sl119d = function _scopedPath(){return(
(path, scope = [0]) => {
  if (!path || path.length < 2) return path;             // the root itself is never a selection
  // `<=`, not `<`: a scope that has reached the element itself means the element, not a fall back to
  // the root. Only a scope this path is not under starts again from the top.
  const inside = scope.length <= path.length && scope.every((v, i) => path[i] === v);
  return path.slice(0, Math.min((inside ? scope.length : 1) + 1, path.length));
}
)};

// What is under the pointer, front to back. `elementsFromPoint` answers for painted geometry, which
// already gives click-through to occluded shapes for free. When it finds nothing — a thin unfilled
// stroke the pointer merely came close to — fall back to distance along the geometry, so hairlines
// are still reachable. The browser is the authority on hit shape either way; no geometry is restated.
const _sl121a = function _hitTest(){return(
(ctx, e, opts = {}) => {
  const list = ctx.elems();
  const own = new Set(list.slice(1));                    // 0 is the root <svg>: never a hit
  const painted = (document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [])
    .filter((n) => own.has(n));
  if (painted.length) return painted;
  const tol = opts.tolerance === undefined ? 6 : opts.tolerance;       // CSS px
  const near = [];
  for (let i = 1; i < list.length; i++) {
    const el = list[i];
    if (!el.getTotalLength || !el.getPointAtLength) continue;
    let len, m;
    try { len = el.getTotalLength(); m = el.getScreenCTM(); } catch (err) { continue; }
    if (!m || !(len >= 0)) continue;
    const steps = Math.max(8, Math.min(128, Math.round(len / 4)));
    let best = Infinity;
    for (let s = 0; s <= steps; s++) {
      const p = el.getPointAtLength((len * s) / steps);
      best = Math.min(best, Math.hypot(m.a * p.x + m.c * p.y + m.e - e.clientX,
                                       m.b * p.x + m.d * p.y + m.f - e.clientY));
    }
    if (best <= tol) near.push([best, el]);
  }
  return near.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
)};

// Zoom and pan (G25). The wheel zooms about the pointer; the middle button drags the view. Both are
// pure view state, so this is the one tool with no `commitDelta` in it at all — which is exactly what
// T11 says out loud. It writes nothing, so it is also the cheapest possible witness for T6.
const _sl125z = function _toolZoom(grabPointer){return(
{
  id: "zoom",
  onWheel(ctx, e) {
    // Ctrl+wheel is the pinch gesture browsers synthesise; plain wheel is a trackpad scroll. Both
    // mean zoom here, because the drawing has no scroll of its own to compete with.
    e.preventDefault();
    ctx.zoomAt(Math.pow(1.0015, -e.deltaY * (e.ctrlKey ? 4 : 1)), e.clientX, e.clientY);
    return true;
  },
  onPointerDown(ctx, e) {
    if (e.button !== 1) return false;                  // middle drag; everything else is someone's
    e.preventDefault();
    grabPointer(ctx.node, e);
    ctx.state.pan = { x: e.clientX, y: e.clientY };
    return true;
  },
  onPointerMove(ctx, e) {
    const p = ctx.state.pan;
    if (!p) return;
    ctx.panBy(e.clientX - p.x, e.clientY - p.y);
    p.x = e.clientX; p.y = e.clientY;
  },
  onPointerUp(ctx) { ctx.state.pan = null; },
  // Abandoning a pan is not "put the view back" — the view is not an edit, so there is nothing to
  // undo. It reports false so Escape falls through to whatever else wants it.
  onCancel(ctx) { ctx.state.pan = null; return false; }
}
)};

// Enter a group (G6). Double-click descends one level and selects what is under the pointer at the
// new depth; `node.ascendScope()` (Escape, at the callsite) comes back out. It sits before
// `toolStructure` in the registry so a double-click on a group enters it rather than falling through
// to "insert a point" or "drop a shape" — and it declines the moment there is nothing left to enter,
// which is exactly when those gestures are the ones you meant.
const _sl122b = function _toolScope(pathOfIndex,scopedPath,shapeLookup,gestureDelta,commitDelta){return(
{
  id: "scope",
  async onDblClick(ctx, e) {
    if (ctx.tool() !== "select") return false;
    const t = ctx.doc();
    if (t === null) return false;
    const list = ctx.elems();
    const leafEl = ctx.hit(e)[0];
    const li = leafEl ? list.indexOf(leafEl) : -1;
    if (li <= 0) return false;
    const leaf = pathOfIndex(t, li);
    const here = scopedPath(leaf, ctx.scope());
    if (here.length >= leaf.length) return false;        // already at the leaf: nothing to enter
    ctx.setScope(here);
    const p = ctx.pick(e)[0];                            // now answers one level deeper
    if (!p) return false;
    const entry = shapeLookup.forTag(ctx.shapes, p.el.localName, t, p.index);
    await commitDelta(ctx, gestureDelta.select([p.path], entry ? entry.mode : "transform"));
    return true;
  }
}
)};

// Drag a shape's body: the `transform` lens, focused on the leading translate op. Dragging one of
// several selected shapes moves them all — one commit each, since each writes its own attribute.
// A tap with no movement selects instead: shift adds to the set, and tapping the shape that is
// already primary cycles to the next shape underneath, which is how an occluded shape is reached.
// How a *screen* delta becomes one element's own translate. Screen space is where a drag, a snap and
// an alignment are all measured — a bounding box is axis-aligned there whatever transforms its
// element carries — and this is the single conversion back out of it. Shared by the move tool and by
// align/distribute, so the two cannot drift into disagreeing about what "move it left by 3" means.
const _sl251 = function _moveTargetOf(invert,ctmMat,translateLens,shapeLookup){return(
(ctx, idx) => {
  const t = ctx.doc();
  if (t === null) return null;
  const el = ctx.elems()[idx];
  const ps = el && ctx.screenCTM(el.parentNode);
  if (!ps) return null;
  const text = ctx.attr(t, idx, "transform") || "";
  // Two frames, because a move can land in two different places (see `moveDeltas`). `Slin` takes a
  // screen delta into the *parent's* space, where a `transform` is written; `Elin` takes it into the
  // element's own space, where `x`/`cx`/`x1` live — that is the element's own transform included, so
  // nudging a rotated rect still follows the pointer rather than its own tilted axes.
  const entry = el ? shapeLookup.forTag(ctx.shapes, el.localName, t, idx) : null;
  const es = entry && entry.move && entry.origin ? ctx.screenCTM(el) : null;
  return { idx, el, text, src: t, entry,
           Slin: invert(ctmMat(ps)), Elin: es ? invert(ctmMat(es)) : null,
           T0: translateLens.get(text) };
}
)};

// Where a move lands. A `transform="translate(…)"` is the general answer and the wrong default: an
// author who wrote `<rect x="16" y="0">` and drags it two units expects `x="18"`, not a wrapper that
// says the rect is somewhere other than where it says it is. So a move writes **the shape's own
// coordinates whenever it has any**, and falls back to `transform` when it does not.
// The line between the two is not "which tags do we like": it is whether the position is an
// attribute of its own. `rect`/`image`, `circle`/`ellipse` and `line` keep their position in
// dedicated numeric attributes, and rewriting one is a local edit that leaves every other byte
// alone. A `polygon`'s position is spread through `points` and a `path`'s through `d`, so moving
// them by coordinates would reprint the entire geometry — including the author's own spacing, which
// the demo drawing exists to show surviving a drag. Those, and `<g>`, still translate.
// Snapping is applied to the resulting *origin*, not to each coordinate, or a line would be
// stretched onto the grid rather than moved onto it.
const _sl263 = function _moveDeltas(gestureDelta,translateLens,attrVal){return(
(g, dx, dy, { q = (v) => v } = {}) => {
  if (g.entry && g.entry.move && g.entry.origin && g.Elin && g.src) {
    const E = g.Elin;
    let o = null;
    try { o = g.entry.origin(g.src, g.idx); } catch (err) {}
    if (o) {
      const x = q(o[0] + E[0] * dx + E[2] * dy, "x"), y = q(o[1] + E[1] * dx + E[3] * dy, "y");
      const out = [];
      for (const ed of g.entry.move(g.src, g.idx, x, y)) {
        const was = attrVal(g.src, g.idx, ed.name);
        const dflt = ed.dflt === undefined ? null : ed.dflt;
        // An attribute the move did not change is not written — the same rule `edit` follows, and
        // what makes a drag that ends where it began a null edit (T1) rather than a reformat.
        if (was === null ? String(ed.value) === dflt : String(ed.value) === was) continue;
        out.push(gestureDelta.attr(g.idx, ed.name, ed.value, { dflt, was }));
      }
      return out;
    }
  }
  const S = g.Slin;
  const T = [q(g.T0[0] + S[0] * dx + S[2] * dy, "x"), q(g.T0[1] + S[1] * dx + S[3] * dy, "y")];
  return [gestureDelta.attr(g.idx, "transform", T,
                            { lens: translateLens, base: g.text, dflt: "", was: g.text })];
}
)};

const _sl121 = function _toolMove(translateLens,attrVal,invert,ctmMat,shapeLookup,pathOfIndex,grabPointer,snapRects,gestureDelta,previewDelta,commitDelta,revertDelta,moveTargetOf,moveDeltas,copyMarkup,offsetMarkup,pasteMarkup){return(
{
  id: "move",
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "select") return false;
    // `pick`, not `hit`: inside a group a leaf stands for its group, and this is the same call the
    // hover outline makes, so what lights up is what a press claims (S1).
    const hits = ctx.pick(e);
    if (!hits.length) return false;                      // empty canvas: the marquee may want it
    const list = ctx.elems();
    const t = ctx.doc();
    if (t === null) return false;
    const sel = ctx.focus.indices;
    // Grabbing a selected shape grabs the whole selection; grabbing anything else grabs just it.
    const at0 = sel.length ? hits.findIndex((h) => h.index === sel[0]) : -1;
    const idx = at0 >= 0 ? sel[0] : hits[0].index;
    const el = list[idx];
    if (idx <= 0 || !el) return false;
    const targets = [];
    for (const i of sel.indexOf(idx) >= 0 ? sel : [idx]) {
      // screen delta → this element's parent space (linear part: a drag is a translation)
      const g = moveTargetOf(ctx, i);
      if (g) targets.push(g);
    }
    if (!targets.length) return false;
    // Snapping is measured in screen space, where every box is axis-aligned whatever transforms
    // its element carries, and the drag delta already lives. One dragged element only: aligning a
    // set to a sibling means choosing which member aligns, which is a UX question, not this one.
    const snapping = targets.length === 1 && ctx.options.snap !== false;
    ctx.state.drag = {
      tool: "move",
      idx, hits, tag: el.localName, targets,      // `hits` are picks, not raw elements
      x0: e.clientX, y0: e.clientY, started: false,
      // G14: alt held at the *start* means "drag a copy, leave the original". The decision is taken
      // once, at pointerdown, so it cannot flip mid-gesture — and it means a duplicate-drag does not
      // also snap (alt is spent), which is the modifier trade this needs.
      duplicate: e.altKey,
      paths: ctx.focus.paths.slice(),
      thresh: e.pointerType === "mouse" ? 3 : 10,
      snapped: { x: false, y: false },            // B1: per-axis snap hysteresis state
      box: snapping ? ctx.screenBox(el) : null,
      others: snapping ? list.slice(1).filter((n) => n !== el && !n.contains(el) && !el.contains(n))
                              .map((n) => ctx.screenBox(n)) : null
    };
    grabPointer(ctx.node, e);
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.drag;
    if (!d) return;
    let dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.started && Math.hypot(dx, dy) < d.thresh) return;
    d.started = true;
    // B1: a dead zone, not a trigger. The threshold used to gate *whether* the drag started and then
    // apply the whole offset from the press — so the first committed frame jumped `thresh` pixels. Now
    // the offset's magnitude is shrunk by `thresh`: `raw · max(0, |raw|−thresh)/|raw|`. It is a pure
    // function of the *current* offset, so a slow and a fast drag to one endpoint land identically (T2),
    // it is continuous at the threshold (no jump), and it costs every drag landing `thresh` short of the
    // pointer. The ratio dx:dy is preserved, so the axis-lock decision below is unchanged.
    { const r = Math.hypot(dx, dy); if (r > 0) { const f = Math.max(0, r - d.thresh) / r; dx *= f; dy *= f; } }
    // Shift locks the drag to whichever axis it has travelled furthest along, measured from the
    // origin rather than the last frame, so the lock is a function of where the pointer *is* and T2
    // still holds. Shift on a tap already means toggle-select; the disambiguation is drag-vs-tap,
    // which `started` has decided by the time we get here.
    const frozen = !e.shiftKey ? null : Math.abs(dx) >= Math.abs(dy) ? "y" : "x";
    if (frozen === "y") dy = 0; else if (frozen === "x") dx = 0;
    let guides = [], aligned = { x: false, y: false };
    if (d.box && !e.altKey) {                            // alt is the usual "ignore snapping" modifier
      const moved = { x: d.box.x + dx, y: d.box.y + dy, width: d.box.width, height: d.box.height };
      // B1: snapping hysteresis. Live snapping on the first frames, when the shape has barely moved,
      // let any neighbour within `snapTolerance` capture it. Once an axis is snapped it now holds
      // through a *larger* movement (2× the tolerance) before breaking away — the sticky state lives in
      // `d.snapped`, the C-complement a gesture is allowed to carry, not a closure.
      const tol = ctx.options.snapTolerance * ((d.snapped.x || d.snapped.y) ? 2 : 1);
      const snap = snapRects(moved, d.others, tol);
      dx += snap.dx; dy += snap.dy;
      guides = snap.guides;
      aligned = snap.snapped;                            // an alignment beats the grid: it is exact
      // ...but not the lock. Snapping may pull the frozen axis; put it back, or shift-drag drifts
      // sideways whenever a neighbour happens to line up.
      if (frozen === "y") { dy = 0; aligned.y = false; }
      else if (frozen === "x") { dx = 0; aligned.x = false; }
      d.snapped = { x: aligned.x, y: aligned.y };        // remembered for next frame's hysteresis
    }
    // Per axis: an aligned axis keeps its exact value (rounded only to kill float noise, or the
    // source fills up with 10.476190476190474), an unaligned one still lands on the grid.
    // 1e-4 and not 1e-6, because an alignment is measured in *screen* space and converted back
    // through the inverse CTM, and that round trip leaves noise of its own — 1e-6 was fine enough to
    // preserve it, which is how a circle aligned to a neighbour committed `cx="86.000002"`. A tenth
    // of a thousandth of a user unit is below anything an author would write and far below anything
    // a screen can show, and it is a *fixed* precision rather than a zoom-derived one, so the same
    // drag still commits the same bytes at every zoom (T11).
    const q = (v, axis) => (aligned[axis] ? Math.round(v * 1e4) / 1e4 : ctx.snap(v));
    // One *element* per element the gesture claimed — how many attributes that turns into is the
    // shape's business, not the tool's.
    d.deltas = d.targets.flatMap((g) => moveDeltas(g, dx, dy, { q }));
    previewDelta(ctx, d.deltas);
    ctx.focus.refresh();                                 // clears the overlay, so guides come after
    ctx.guides(guides);
    // G13: the displacement, in user units, drawn last so the overlay clear above does not eat it.
    // `readoutFont()` is 12/zoom, so the zoom it already measured comes back as 12/font — no tool
    // reaches past `ctx` for the CTM (P5).
    const at = ctx.localPoint(ctx.node, e), font = ctx.readoutFont(), z = 12 / (font || 1);
    d.userDelta = [dx / z, dy / z];                      // G14: the offset a duplicate would land at
    if (at) previewDelta(ctx, gestureDelta.readout(`${(dx / z).toFixed(1)}, ${(dy / z).toFixed(1)}`, at, font));
  },
  async onPointerUp(ctx, e) {
    const d = ctx.state.drag;
    ctx.state.drag = null;
    if (!d) return;
    if (d.started) {
      ctx.guides([]);
      previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13: clear
      // G14: leave the original where it was and drop a copy at the drag's end, offset by the same
      // delta. Reuses the paste codec — `copyMarkup` gives the author's own bytes, `offsetMarkup`
      // translates them, `pasteMarkup` appends. One structural edit; the copies become the selection.
      if (d.duplicate && d.paths.length && d.userDelta) {
        revertDelta(ctx, d.deltas || []);                // originals snap back to where they were
        const src = ctx.doc();
        if (src === null) return;
        const [dux, duy] = d.userDelta;
        const clip = copyMarkup(src, d.paths).map((m) => offsetMarkup(m, dux, duy));
        const parent = ctx.scope().length ? ctx.scope() : [0];
        const at = ctx.childCount(parent);
        await commitDelta(ctx, gestureDelta.command("duplicate",
          (s) => pasteMarkup(s, parent, at, clip),
          { select: () => clip.map((_, k) => parent.concat([at + k])) }));
        return;
      }
      if (d.deltas) await commitDelta(ctx, d.deltas);
      return;
    }
    if (e.type !== "pointerup") return;
    const t = ctx.doc();
    if (t === null) return;
    if (e.shiftKey)
      return void await commitDelta(ctx, gestureDelta.select([pathOfIndex(t, d.idx)], null, { toggle: true }));
    // Tapping the primary again steps down the stack; tapping anything else selects the top hit.
    const single = ctx.focus.paths.length === 1;
    const at = d.hits.findIndex((h) => h.index === d.idx);
    const pick = single && at >= 0 ? d.hits[(at + 1) % d.hits.length] : d.hits[0];
    const idx = pick.index;
    if (idx <= 0) return;
    const tag = pick.el.localName;
    // Which mode a tap offers is the registry's decision, and it turns on whether the lens can
    // actually *read* this element rather than on its tag: a polygon with an unparseable points list
    // falls through to the gizmo rather than to broken handles. That is the partiality law (T8) as
    // one lookup, and adding a tag to the registry is now the whole of teaching this the new shape.
    const entry = shapeLookup.forTag(ctx.shapes, tag, t, idx);
    // Selecting something the current group does not contain is how you leave it — otherwise the
    // scope outlives its usefulness and a later click inside another group behaves oddly.
    const sc = ctx.scope();
    if (!(sc.length < pick.path.length && sc.every((v, i) => pick.path[i] === v))) ctx.setScope([0]);
    await commitDelta(ctx, gestureDelta.select([pick.path], entry ? entry.mode : "transform"));
  },
  onCancel(ctx) {
    const d = ctx.state.drag;
    if (!d || d.tool !== "move") return false;
    ctx.state.drag = null;
    ctx.guides([]);
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13: clear the readout
    revertDelta(ctx, d.deltas || []);
    return true;
  }
}
)};

// Drag on empty canvas to rubber-band a selection. Intersection is tested in the root's user space,
// where the marquee is drawn, so a rotated element is compared as the box it actually occupies.
const _sl121b = function _toolMarquee(pathOfIndex,scopedPath,grabPointer,dragBox,gestureDelta,commitDelta){return(
{
  id: "marquee",
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "select") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    grabPointer(ctx.node, e);
    // Every outcome of this tool is a `select` delta and nothing else — which is what makes T9
    // ("selection is not an edit") a statement about the tool's type rather than about its luck.
    if (!e.shiftKey) commitDelta(ctx, gestureDelta.select([]));
    ctx.state.band = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], add: e.shiftKey, box: null, moved: false };
    return true;
  },
  onPointerMove(ctx, e) {
    const b = ctx.state.band;
    if (!b) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    b.x1 = p[0]; b.y1 = p[1]; b.moved = true;
    const r = dragBox(b.x0, b.y0, b.x1, b.y1);
    if (!b.box || !b.box.isConnected) b.box = ctx.overlay.addRoot("rect", { class: "box" });
    for (const k of ["x", "y", "width", "height"]) b.box.setAttribute(k, r[k]);
  },
  onPointerUp(ctx) {
    const b = ctx.state.band;
    ctx.state.band = null;
    if (!b) return;
    if (b.box) b.box.remove();
    if (!b.moved) return void commitDelta(ctx, gestureDelta.select([]));
    const r = dragBox(b.x0, b.y0, b.x1, b.y1);
    const t = ctx.doc();
    if (t === null) return;
    const list = ctx.elems();
    const hits = [];
    for (let i = 1; i < list.length; i++) {
      const box = ctx.rootBox(list[i]);
      if (!box) continue;
      if (box.x <= r.x + r.width && box.x + box.width >= r.x &&
          box.y <= r.y + r.height && box.y + box.height >= r.y)
        hits.push(scopedPath(pathOfIndex(t, i), ctx.scope()));
    }
    // A band over two leaves of one group is that group, once — the same policy a click uses.
    const seen = new Set();
    const uniq = hits.filter((p) => { const k = p.join("/"); return !seen.has(k) && seen.add(k); });
    if (!uniq.length) ctx.setScope([0]);                 // a band over nothing leaves the group
    return commitDelta(ctx, gestureDelta.select(b.add ? ctx.focus.paths.concat(uniq) : uniq));
  },
  // Nothing to put back — the band lives in the overlay and the selection is not an edit (T9).
  onCancel(ctx) {
    const b = ctx.state.band;
    ctx.state.band = null;
    if (!b) return false;
    if (b.box) b.box.remove();
    return true;
  }
}
)};

// Structural editing by double-click: add a vertex on an edge, remove the one under the pointer, or
// drop a new shape on empty canvas. Every branch is a pure command.
const _sl122 = function _toolStructure(insertElement,insertPoint,cmdDeleteVertex,nearestSegment,pointsHandles,parsePoints,attrVal,childrenLens,rebasePath,pathHandles,parsePath,pathSegments,nearestPathSegment,insertPathPoint,gestureDelta,commitDelta){return(
{
  id: "structure",
  async onDblClick(ctx, e) {
    const t = ctx.doc();
    if (t === null) return false;
    const focus = ctx.focus;
    const key = e.target.dataset && e.target.dataset.key;
    // A point edit leaves the element tree alone, so every path — including the selection's — holds.
    const sel = focus.path;

    // Double-click delete and the Delete key are one implementation, two triggers: resolve the clicked
    // handle to a vertex ordinal and dispatch cmdDeleteVertex, rather than re-building the delta here.
    const dispatchDelete = (n) => {
      const plan = cmdDeleteVertex.plan({
        src: t, vertices: [{ kind: "anchor", path: sel, n }], index: () => focus.index
      });
      return plan;
    };

    if (key !== undefined && sel && focus.mode === "points") {
      const h = pointsHandles(t, focus.index).find((x) => x.key === key);
      if (!h) return false;
      const plan = dispatchDelete(h.i);
      if (!plan) return false;
      await commitDelta(ctx, plan);
      return true;
    }

    // The same two gestures on a path. An anchor handle ends a segment; deleting "the anchor with this
    // key" is deleting the segment it terminates — cmdDeleteVertex owns that reading, keyed by the
    // anchor's ordinal among the path's anchor handles.
    if (key !== undefined && sel && focus.mode === "path") {
      const n = pathHandles(t, focus.index).filter((x) => x.kind === "anchor").findIndex((x) => x.key === key);
      if (n < 0) return false;
      const plan = dispatchDelete(n);
      if (!plan) return false;
      await commitDelta(ctx, plan);
      return true;
    }

    // The same hit contract selection uses, rather than whatever DOM node the event landed on:
    // `e.target` was the last place in the editor where "what did I click" had a second answer.
    const hit = key === undefined ? ((ctx.pick(e)[0] || {}).index ?? -1) : -1;
    const list = ctx.elems();
    // Inserting means double-clicking the shape itself. A handle under the pointer is a delete
    // (above) or, for a control point, nothing at all — inserting there would be a guess.
    if (sel && focus.mode === "points" && hit === focus.index) {
      const el = list[focus.index];
      const p = ctx.localPoint(el, e);
      if (!p) return false;
      const closed = el.localName !== "polyline";
      const seg = nearestSegment(parsePoints(ctx.attr(t, focus.index, "points")), p[0], p[1], closed);
      await commitDelta(ctx, gestureDelta.command("insertPoint", (d) => insertPoint(d, sel, seg.index, p),
        { vertex: { kind: "vertex-insert", path: sel, at: seg.index + 1 } }));
      return true;
    }

    if (sel && focus.mode === "path" && hit === focus.index) {
      const p = ctx.localPoint(list[focus.index], e);
      if (!p) return false;
      const segs = pathSegments(parsePath(ctx.attr(t, focus.index, "d")));
      const near = nearestPathSegment(segs, p[0], p[1]);
      if (near.index < 0 || segs[near.index].kind === "A") return false;
      // The new anchor lands between the split segment's start and end anchors.
      await commitDelta(ctx, gestureDelta.command("insertPathPoint", (d) => insertPathPoint(d, sel, near.index, near.t),
        { vertex: { kind: "vertex-insert", path: sel,
                    at: segs.slice(0, near.index).filter((sg) => sg.kind !== "Z").length + 1 } }));
      return true;
    }

    if (hit < 0) {
      const p = ctx.localPoint(ctx.node, e);
      if (!p) return false;
      const at = childrenLens([0]).get(t).length;       // appended, so nothing before it moves
      await commitDelta(ctx, gestureDelta.command(
        "insertElement",
        (d) => insertElement(d, [0], null, ctx.options.newShape(p[0], p[1])),
        { rebase: (path) => rebasePath(path, { kind: "insert", parent: [0], at }) }));
      return true;
    }
    return false;
  }
}
)};

// ---- creation: pure geometry, so the preview and the committed markup cannot disagree ------------
// A drag gives two corners in either order; `dragBox` normalises them. `square` is the shift-drag
// constraint, applied before normalising so the box grows from the corner you started at.
const _sl125a = function _dragBox(){return(
(x0, y0, x1, y1, square = false) => {
  let w = x1 - x0, h = y1 - y0;
  if (square) {
    const m = Math.max(Math.abs(w), Math.abs(h));
    w = (w < 0 ? -1 : 1) * m;
    h = (h < 0 ? -1 : 1) * m;
  }
  return { x: Math.min(x0, x0 + w), y: Math.min(y0, y0 + h),
           width: Math.abs(w), height: Math.abs(h), x1: x0 + w, y1: y0 + h };
}
)};

// One description of a new shape, used twice: as DOM attributes for the drag preview and as markup
// for the source. Deriving the markup FROM the spec is what keeps the two identical.
const _sl125b = function _shapeSpec(dragBox){return(
(kind, x0, y0, x1, y1, opts = {}) => {
  const b = dragBox(x0, y0, x1, y1, opts.square);
  const fill = opts.fill === undefined ? "#5B7A5E" : opts.fill;
  const stroke = opts.stroke === undefined ? "#3E4A3B" : opts.stroke;
  const width = opts.strokeWidth === undefined ? 3 : opts.strokeWidth;
  if (kind === "rect")
    return { tag: "rect", attrs: { x: b.x, y: b.y, width: b.width, height: b.height, fill } };
  if (kind === "ellipse")
    return { tag: "ellipse", attrs: { cx: b.x + b.width / 2, cy: b.y + b.height / 2,
                                      rx: b.width / 2, ry: b.height / 2, fill } };
  if (kind === "line")
    return { tag: "line", attrs: { x1: x0, y1: y0, x2: b.x1, y2: b.y1,
                                   stroke, "stroke-width": width, "stroke-linecap": "round" } };
  throw new Error(`unknown shape kind: ${kind}`);
}
)};

const _sl125c = function _shapeMarkup(shapeSpec){return(
(kind, x0, y0, x1, y1, opts) => {
  const { tag, attrs } = shapeSpec(kind, x0, y0, x1, y1, opts);
  return `<${tag} ${Object.keys(attrs).map((k) => `${k}="${attrs[k]}"`).join(" ")}/>`;
}
)};

// The pen builds a `d` attribute one anchor at a time. Text in, text out: each click is an ordinary
// attribute put, so a half-drawn path is a real path in the source at every step.
const _sl125d = function _penPath(){return(
{
  start: (x, y) => `M ${x} ${y}`,
  lineTo: (d, x, y) => `${d} L ${x} ${y}`,
  // A cubic written in terms of the two anchors' *handles*: `out` belongs to the anchor the segment
  // leaves, `in` to the one it arrives at. A handle sitting on its own anchor is no curvature at that
  // end, which is exactly what an undragged click gives — so one function covers straight-into-curve
  // and curve-into-straight without a case for each.
  curveTo: (d, out, inn, x, y) => `${d} C ${out[0]} ${out[1]} ${inn[0]} ${inn[1]} ${x} ${y}`,
  // Dragging an anchor's outgoing handle to `q` puts its incoming handle opposite: that symmetry is
  // what makes the pen draw smooth curves rather than a chain of independent arcs.
  mirror: (p, q) => [2 * p[0] - q[0], 2 * p[1] - q[1]],
  close: (d) => (/[Zz]\s*$/.test(d) ? d : `${d} Z`)
}
)};

// G45. Fit a freehand polyline to a chain of cubic Béziers (Schneider's algorithm: least-squares one
// cubic, measure the worst deviation, reparameterise a few times, and split there and recurse if it
// still misses). Pure and browser-free — `error` is a distance in the *same* units as the points, so
// the tool converts a screen-px tolerance through the CTM once and hands user units in, which is what
// keeps the fit a function of the drawing and not of the zoom (T11). The polyline is first split at
// corners (a direction change sharper than `cornerAngle`), so a deliberate kink stays a corner instead
// of being rounded through. Returns an array of `[p0, c1, c2, p3]`; consecutive cubics share an anchor.
const _sl268 = function _fitCurve(){return(
(() => {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]],
        mul = (a, s) => [a[0] * s, a[1] * s], dot = (a, b) => a[0] * b[0] + a[1] * b[1],
        norm = (a) => Math.hypot(a[0], a[1]);
  const unit = (v) => { const n = norm(v) || 1; return [v[0] / n, v[1] / n]; };
  const bern = (n, i, t) => { const c = n === 3 ? [1, 3, 3, 1][i] : n === 2 ? [1, 2, 1][i] : [1, 1][i];
                              return c * Math.pow(t, i) * Math.pow(1 - t, n - i); };
  const q = (bez, t) => bez.reduce((r, p, i) => add(r, mul(p, bern(3, i, t))), [0, 0]);
  const chord = (pts) => { const u = [0];
    for (let i = 1; i < pts.length; i++) u.push(u[i - 1] + norm(sub(pts[i], pts[i - 1])));
    const last = u[u.length - 1] || 1; return u.map((x) => x / last); };
  const bezierFor = (pts, u, t1, t2) => {
    const n = pts.length, first = pts[0], last = pts[n - 1];
    const A = u.map((uu) => [mul(t1, bern(3, 1, uu)), mul(t2, bern(3, 2, uu))]);
    let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < n; i++) {
      c00 += dot(A[i][0], A[i][0]); c01 += dot(A[i][0], A[i][1]); c11 += dot(A[i][1], A[i][1]);
      const tmp = sub(pts[i], q([first, first, last, last], u[i]));
      x0 += dot(A[i][0], tmp); x1 += dot(A[i][1], tmp);
    }
    const det = c00 * c11 - c01 * c01;
    let a1 = det === 0 ? 0 : (x0 * c11 - c01 * x1) / det;
    let a2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
    const len = norm(sub(last, first)), eps = 1e-6 * len;
    if (a1 < eps || a2 < eps) { a1 = a2 = len / 3; }
    return [first, add(first, mul(t1, a1)), add(last, mul(t2, a2)), last];
  };
  const deriv = (arr, t) => arr.reduce((r, p, i) => add(r, mul(p, bern(arr.length - 1, i, t))), [0, 0]);
  const newton = (p, bez, u) => {
    const q1 = [0, 1, 2].map((i) => mul(sub(bez[i + 1], bez[i]), 3));
    const q2 = [0, 1].map((i) => mul(sub(q1[i + 1], q1[i]), 2));
    const d = sub(q(bez, u), p), d1 = deriv(q1, u), d2 = deriv(q2, u);
    const den = dot(d1, d1) + dot(d, d2);
    return den === 0 ? u : u - dot(d, d1) / den;
  };
  const worst = (pts, bez, u) => { let max = 0, idx = (pts.length / 2) | 0;
    for (let i = 0; i < pts.length; i++) { const e = norm(sub(q(bez, u[i]), pts[i])); if (e > max) { max = e; idx = i; } }
    return [max, idx]; };
  const fit = (pts, t1, t2, error, out) => {
    if (pts.length === 2) { const d = norm(sub(pts[1], pts[0])) / 3;
      out.push([pts[0], add(pts[0], mul(t1, d)), add(pts[1], mul(t2, d)), pts[1]]); return; }
    let u = chord(pts), bez = bezierFor(pts, u, t1, t2), [err, idx] = worst(pts, bez, u);
    if (err < error) return void out.push(bez);
    if (err < error * 4)
      for (let k = 0; k < 4; k++) {
        u = pts.map((p, i) => newton(p, bez, u[i]));
        bez = bezierFor(pts, u, t1, t2); [err, idx] = worst(pts, bez, u);
        if (err < error) return void out.push(bez);
      }
    if (idx <= 0 || idx >= pts.length - 1) idx = (pts.length / 2) | 0;   // a split must make progress
    const c = unit(sub(pts[idx - 1], pts[idx + 1]));
    fit(pts.slice(0, idx + 1), t1, c, error, out);
    fit(pts.slice(idx), mul(c, -1), t2, error, out);
  };
  const dedupe = (pts) => { const o = pts.length ? [pts[0]] : [];
    for (let i = 1; i < pts.length; i++) if (norm(sub(pts[i], o[o.length - 1])) > 1e-9) o.push(pts[i]);
    return o; };
  const corners = (pts, angle) => { const idx = [0];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = unit(sub(pts[i], pts[i - 1])), b = unit(sub(pts[i + 1], pts[i]));
      if (Math.acos(Math.min(1, Math.max(-1, dot(a, b)))) > angle) idx.push(i);
    }
    idx.push(pts.length - 1); return idx; };
  return (points, error = 4, cornerAngle = Math.PI / 2) => {
    const pts = dedupe(points || []);
    if (pts.length < 2) return [];
    const ci = corners(pts, cornerAngle), out = [];
    for (let k = 0; k < ci.length - 1; k++) {
      const run = pts.slice(ci[k], ci[k + 1] + 1);
      if (run.length < 2) continue;
      fit(run, unit(sub(run[1], run[0])), unit(sub(run[run.length - 2], run[run.length - 1])), error, out);
    }
    return out;
  };
})()
)};

// Drag on empty canvas to create a rect, an ellipse or a line. Preview lives in the overlay — the
// source gets exactly one put, on release, and only if the drag was big enough to mean it.
const _sl125 = function _toolDraw(shapeLookup,shapeSpec,shapeMarkup,dragBox,grabPointer,gestureDelta,previewDelta,commitDelta){return(
{
  id: "draw",
  onPointerDown(ctx, e) {
    const kind = ctx.tool();
    if (kind !== "rect" && kind !== "ellipse" && kind !== "line") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    commitDelta(ctx, gestureDelta.select([]));
    ctx.state.draw = { kind, x0: p[0], y0: p[1], x1: p[0], y1: p[1], square: false, preview: null };
    return true;
  },
  onPointerMove(ctx, e) {
    const d = ctx.state.draw;
    if (!d) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    d.x1 = p[0]; d.y1 = p[1]; d.square = e.shiftKey;
    const spec = shapeSpec(d.kind, d.x0, d.y0, d.x1, d.y1, { square: d.square, ...ctx.options.shapeStyle });
    if (!d.preview || !d.preview.isConnected || d.preview.localName !== spec.tag) {
      if (d.preview) d.preview.remove();
      d.preview = ctx.overlay.addRoot(spec.tag, { ...spec.attrs, opacity: 0.6 });   // root user space
    } else for (const k in spec.attrs) d.preview.setAttribute(k, spec.attrs[k]);
    // G13: the size being drawn, at the pointer.
    previewDelta(ctx, gestureDelta.readout(
      `${Math.abs(d.x1 - d.x0).toFixed(1)} × ${Math.abs(d.y1 - d.y0).toFixed(1)}`, p, ctx.readoutFont()));
  },
  async onPointerUp(ctx) {
    const d = ctx.state.draw;
    ctx.state.draw = null;
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13: clear
    if (!d) return;
    if (d.preview) d.preview.remove();
    const b = dragBox(d.x0, d.y0, d.x1, d.y1, d.square);
    const min = ctx.options.minShape === undefined ? 2 : ctx.options.minShape;
    if (Math.max(b.width, b.height) < min) return void ctx.setTool("select");   // a click, not a drag
    const at = ctx.childCount([0]);
    const rec = await ctx.addShape(
      shapeMarkup(d.kind, d.x0, d.y0, d.x1, d.y1, { square: d.square, ...ctx.options.shapeStyle }));
    // Hand the new shape straight to whatever can edit it — its own geometry if the registry knows
    // the tag, the gizmo otherwise. Drawing a rect and then dragging its corner writes `width`.
    const t = ctx.doc();
    const entry = t === null ? null
                : shapeLookup.forTag(ctx.shapes, shapeSpec(d.kind, 0, 0, 1, 1, {}).tag, t, at);
    if (rec) await commitDelta(ctx, gestureDelta.select([[0, at]], entry ? entry.mode : "transform"));
    ctx.setTool("select");
  },
  // The shape does not exist in the source until release, so abandoning is dropping the ghost. The
  // tool stays armed: Esc cancels the shape you are drawing, not the mode you are in.
  onCancel(ctx) {
    const d = ctx.state.draw;
    ctx.state.draw = null;
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));   // G13
    if (!d) return false;
    if (d.preview) d.preview.remove();
    return true;
  }
}
)};

// Click to place anchors; click the first anchor to close, or double-click to finish open. The path
// exists in the source from the first click, so there is no builder state that can diverge from it —
// the only state the tool keeps is which path it is extending.
const _sl126 = function _toolPen(penPath,attrVal,nodeAt,grabPointer,gestureDelta,previewDelta,commitDelta,pathHandles,pathOfIndex){return(
{
  id: "pen",
  // G20. With no path in progress, a click on an open path's *free end* continues that path instead
  // of starting a new one — which is the difference between a pen and a line tool. Only the end, not
  // the start: extending backwards means reversing the author's `d`, and reversing it would rewrite
  // every byte of an attribute the gesture is not otherwise touching.
  freeEnd(ctx, p) {
    const t = ctx.doc();
    if (t === null) return null;
    const list = ctx.elems();
    const r = ctx.options.penCloseRadius === undefined ? 8 : ctx.options.penCloseRadius;
    for (let i = list.length - 1; i > 0; i--) {          // front to back, like every other hit test
      const el = list[i];
      if (!el || el.localName !== "path") continue;
      const d = ctx.attr(t, i, "d");
      if (!d || /[Zz]\s*$/.test(d)) continue;             // closed: it has no free end
      let hs;
      try { hs = pathHandles(t, i); } catch (e) { continue; }
      const anchors = hs.filter((h) => h.kind === "anchor");
      const last = anchors[anchors.length - 1], first = anchors[0];
      if (!last || Math.hypot(p[0] - last.x, p[1] - last.y) > r) continue;
      try { return { path: pathOfIndex(t, i), start: [first.x, first.y], last: [last.x, last.y] }; }
      catch (e) { return null; }
    }
    return null;
  },
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "pen") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    // The anchor is where you pressed; where you *drag to* is its outgoing handle (G19). Nothing is
    // decided until release, so a click and a drag are the same gesture with a different ending.
    ctx.state.penClick = { p, q: null };
    return true;
  },
  // Dragging out a handle. Both arms are drawn, because the one you are not holding — the mirrored
  // incoming handle — is the one that decides how the curve *arrives*, and it is the surprising half.
  onPointerMove(ctx, e) {
    const c = ctx.state.penClick;
    if (!c) return;
    const q = ctx.localPoint(ctx.node, e);
    if (!q) return;
    c.q = q;
    const m = penPath.mirror(c.p, q);
    previewDelta(ctx, gestureDelta.view([
      { tag: "line", attrs: { class: "link", x1: m[0], y1: m[1], x2: q[0], y2: q[1] } },
      { tag: "circle", attrs: { class: "ctrl", cx: q[0], cy: q[1], r: 3 } },
      { tag: "circle", attrs: { class: "ctrl", cx: m[0], cy: m[1], r: 3 } }
    ], { key: "pen-handle" }));
  },
  onHover(ctx, e) {                                     // rubber band from the last anchor
    const pen = ctx.state.pen;
    if (!pen) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    // With a handle out, the band shows the curve you would get rather than the chord you would not:
    // the far end has no handle yet, so it is straight there, which is also what clicking would give.
    const tag = pen.out ? "path" : "line";
    if (!pen.band || !pen.band.isConnected || pen.band.localName !== tag) {
      if (pen.band) pen.band.remove();
      pen.band = ctx.overlay.addRoot(tag, { class: "link", fill: "none" });
    }
    if (tag === "path")
      pen.band.setAttribute("d", penPath.curveTo(penPath.start(pen.last[0], pen.last[1]),
                                                 pen.out, p, p[0], p[1]));
    else for (const [k, v] of [["x1", pen.last[0]], ["y1", pen.last[1]], ["x2", p[0]], ["y2", p[1]]])
      pen.band.setAttribute(k, v);
  },
  async onPointerUp(ctx) {
    const c = ctx.state.penClick;
    ctx.state.penClick = null;
    if (!c) return;
    previewDelta(ctx, gestureDelta.view([], { key: "pen-handle" }));
    const p = c.p;
    // A drag shorter than the threshold is a click: it means "no curvature here", not "a tiny one".
    const min = ctx.options.penHandleMin === undefined ? 2 : ctx.options.penHandleMin;
    const out = c.q && Math.hypot(c.q[0] - p[0], c.q[1] - p[1]) >= min ? c.q : null;
    const pen = ctx.state.pen;
    if (!pen) {
      // Picking up a free end is not an edit: nothing is committed until the next anchor, so this
      // costs the source nothing and T9 covers it — it is a selection, and it says so.
      const found = this.freeEnd(ctx, p);
      if (found) {
        ctx.state.pen = { path: found.path, start: found.start, last: found.last,
                          out, startOut: null, band: null };
        await commitDelta(ctx, gestureDelta.select([found.path], "path"));
        return;
      }
      const at = ctx.childCount([0]);
      const s = ctx.options.penStyle || 'fill="none" stroke="#4C7FD1" stroke-width="3" stroke-linecap="round"';
      const rec = await ctx.addShape(`<path d="${penPath.start(p[0], p[1])}" ${s}/>`);
      if (!rec) return;
      ctx.state.pen = { path: [0, at], start: p, last: p, out, startOut: out, band: null };
      await commitDelta(ctx, gestureDelta.select([[0, at]], "path"));
      return;
    }
    const t = ctx.doc();
    if (t === null) return void ctx.setTool("select");
    let idx;
    try { idx = nodeAt(t, pen.path).index; } catch (err) { return void ctx.setTool("select"); }
    const d = ctx.attr(t, idx, "d");
    const r = ctx.options.penCloseRadius === undefined ? 8 : ctx.options.penCloseRadius;
    // Closing on the first anchor. If either end of the last segment carries a handle the closing
    // segment is a curve *to the start*, and only then Z — otherwise Z alone would straighten it.
    if (Math.hypot(p[0] - pen.start[0], p[1] - pen.start[1]) <= r) {
      const back = pen.out || pen.startOut
        ? penPath.curveTo(d, pen.out || pen.last, pen.startOut ? penPath.mirror(pen.start, pen.startOut) : pen.start,
                          pen.start[0], pen.start[1])
        : d;
      await commitDelta(ctx, gestureDelta.attr(idx, "d", penPath.close(back)));
      return void ctx.setTool("select");
    }
    // A segment is a curve when either of its ends has a handle; a straight one is the special case,
    // not the other way round.
    const next = pen.out || out
      ? penPath.curveTo(d, pen.out || pen.last, out ? penPath.mirror(p, out) : p, p[0], p[1])
      : penPath.lineTo(d, p[0], p[1]);
    pen.last = p;
    pen.out = out;
    await commitDelta(ctx, gestureDelta.attr(idx, "d", next));
  },
  async onDblClick(ctx) {
    if (!ctx.state.pen) return false;
    ctx.setTool("select");                              // finish the path where it is
    return true;
  },
  // Every anchor is already committed, so there is nothing to revert: Esc ends the path where it is,
  // which is the same thing the double-click means. Undo removes anchors one at a time.
  onCancel(ctx) {
    const pen = ctx.state.pen;
    ctx.state.penClick = null;
    if (!pen) return false;
    if (pen.band) pen.band.remove();
    ctx.state.pen = null;
    ctx.setTool("select");
    return true;
  }
}
)};

// G45. Scribble a freehand stroke; on release it is fitted (Schneider, `fitCurve`) to a chain of
// cubics and committed as one `<path>`, after which every vertex gesture (G19–G23) applies to it —
// which is the whole point of landing in the same representation rather than in a "sketch" object.
// The stroke previews as an overlay polyline and writes nothing until release, so an abandoned
// scribble is T1 by construction. The tolerance is a screen distance, divided out through the CTM the
// way every measurement is (readoutFont is 12px/zoom), so the same user-space input fits the same
// bytes at any zoom (T11), and points closer than half the tolerance are dropped — a trackpad emits
// far more samples than the fit needs, and that oversampling is what makes a naive fit wobble.
const _sl269 = function _toolScribble(fitCurve,grabPointer,gestureDelta,previewDelta,commitDelta){return(
{
  id: "scribble",
  tolU: (ctx) => ctx.readoutFont() * ((ctx.options.scribbleTolerance === undefined ? 4 : ctx.options.scribbleTolerance) / 12),
  onPointerDown(ctx, e) {
    if (ctx.tool() !== "scribble") return false;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return false;
    e.preventDefault();
    grabPointer(ctx.node, e);
    commitDelta(ctx, gestureDelta.select([]));
    ctx.state.scribble = { pts: [p], band: null };
    return true;
  },
  onPointerMove(ctx, e) {
    const s = ctx.state.scribble;
    if (!s) return;
    const p = ctx.localPoint(ctx.node, e);
    if (!p) return;
    const last = s.pts[s.pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < this.tolU(ctx) / 2) return;   // decimate
    s.pts.push(p);
    if (!s.band || !s.band.isConnected) s.band = ctx.overlay.addRoot("polyline", { class: "link", fill: "none" });
    s.band.setAttribute("points", s.pts.map((q) => `${q[0]},${q[1]}`).join(" "));
  },
  async onPointerUp(ctx) {
    const s = ctx.state.scribble;
    ctx.state.scribble = null;
    if (!s) return;
    if (s.band) s.band.remove();
    if (s.pts.length < 2) return void ctx.setTool("select");
    const segs = fitCurve(s.pts, this.tolU(ctx));
    if (!segs.length) return void ctx.setTool("select");
    const r = (v) => Math.round(v * 1e3) / 1e3;
    let d = `M ${r(segs[0][0][0])} ${r(segs[0][0][1])}`;
    for (const sg of segs) d += ` C ${r(sg[1][0])} ${r(sg[1][1])} ${r(sg[2][0])} ${r(sg[2][1])} ${r(sg[3][0])} ${r(sg[3][1])}`;
    const at = ctx.childCount([0]);
    const style = ctx.options.penStyle || 'fill="none" stroke="#4C7FD1" stroke-width="3" stroke-linecap="round"';
    const rec = await ctx.addShape(`<path d="${d}" ${style}/>`);
    if (rec) await commitDelta(ctx, gestureDelta.select([[0, at]], "path"));
  },
  onCancel(ctx) {
    const s = ctx.state.scribble;
    if (!s) return false;
    ctx.state.scribble = null;
    if (s.band) s.band.remove();
    return true;
  }
}
)};

// The registry. Order is priority: the first tool to claim a pointerdown owns the gesture. Push a
// tool from any cell and dispatch an input event to extend the editor without touching it. The
// creation tools come first because they gate on the active tool, so they claim nothing in select
// mode; toolPen precedes toolStructure so its double-click ends the path rather than dropping a shape.
// ================================================================================================
// P3/P4 — the gesture harness. The lens laws are pure and run anywhere; a gesture law needs three
// things they do not: a live cell whose value is the drawing (the writer commits by redefining a
// Variable), real DOM geometry, and pointer events. All three are cheap.
//
// `gestureFixture` builds a throwaway module holding exactly one cell — `svgLens(svg`…`, opts)` — so
// no test ever edits the paper's own content, and hands back the node plus the instruments. The
// caller places `container` in its own output: in flow, at its real screen position, which is what
// makes `elementsFromPoint` answer correctly without z-index tricks.
// ================================================================================================
const _sl130 = function _gestureFixture(runtime,realize,settle,literalSpan,nodeAt,svgLens,svg){
  // ONE module for every fixture, created on first use. A module per fixture grows the runtime's
  // module registry, `currentModules` recomputes, the lopepage frame re-observes this module's
  // cells, the law cells re-run and build another fixture: a feedback loop that never settles.
  // Fixtures are serialised by `withFixture`, so reusing the names is safe.
  let mod = null, optsVar = null;
  return (
async (body, options = {}) => {
  if (!mod) {
    mod = runtime.module();
    mod.define("svgLens", [], () => svgLens);
    mod.define("svg", [], () => svg);
    optsVar = mod.variable();                           // one handle, redefined per fixture
  }
  // `mod.define` mints a *new* variable each call, so calling it twice for the same name yields
  // "`_opts` is defined more than once" and every fixture after the first fails. Redefine the
  // handle instead. Carries real tool arrays, which serialising through the source could not.
  optsVar.define("_opts", [], () => options);
  const src = `function _fixture(svgLens, svg, _opts) { return (\nsvgLens(svg\`${body}\`, _opts)\n) }`;
  const [fn] = await realize([src], runtime);

  const container = document.createElement("div");
  container.style.cssText = "display:inline-block;line-height:0";
  const puts = [];
  // Each commit mints a new node, so the listener is re-attached per instance rather than once — and
  // the writer announces the put on the outgoing node *and* the incoming one, with the same record
  // object. Dedupe by identity or every commit counts twice.
  const onPut = (e) => { if (!puts.includes(e.detail)) puts.push(e.detail); };
  const v = mod.variable({
    fulfilled: (val) => {
      if (!val || !val.namespaceURI) return;
      container.replaceChildren(val);
      val.addEventListener("lens-put", onPut);
    },
    rejected: () => {}
  }).define("_fixture", ["svgLens", "svg", "_opts"], fn);
  await settle(v, null);

  const source = () => v._definition.toString();
  return {
    container, variable: v, puts,
    get node() { return v._value; },
    source,
    // ---- P4 instruments -------------------------------------------------------------------------
    // The SVG text the source currently holds, byte for byte. The primary witness for T1 and T2.
    doc: () => { const s = source(); const [a, b] = literalSpan(s, "svgLens"); return s.slice(a, b); },
    // Source elements, overlay excluded — the same filter `svgTarget.elems` applies, so indices line
    // up with document order and with the tools' idea of an element index.
    elems: () => [v._value, ...v._value.querySelectorAll("*")]
      .filter((e) => e.namespaceURI === "http://www.w3.org/2000/svg"
                  && !e.closest("[data-svg-lens-overlay]")),
    elemCount() { return this.elems().length - 1; },     // minus the root <svg>
    historyDepth: () => v._value.historyDepth().undo,
    focusPaths: () => v._value.selectionPaths(),
    // The overlay must frame what is selected: 0 when it does. This is the ghosting probe.
    boxGap() {
      const box = v._value.querySelector("[data-svg-lens-overlay] .box");
      const sel = v._value.selectionPaths();
      if (!box || sel.length !== 1) return null;
      const el = this.elems()[nodeAt(this.doc(), sel[0]).index];
      if (!el) return null;
      const a = box.getBoundingClientRect(), b = el.getBoundingClientRect();
      return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y),
                      Math.abs(a.width - b.width), Math.abs(a.height - b.height));
    },
    destroy: () => { try { v.delete(); } catch (_) {} container.remove(); }
  };
}
  );
};

// Drive a fixture with scripted pointer events. Coordinates are the drawing's own user units — the
// harness converts through `getScreenCTM`, the same matrix the tools invert, so a script reads like
// the picture rather than like the viewport.
//
//   play(f, [tap(20, 30)])                       a click
//   play(f, [drag([[20,30],[60,30],[90,44]])])    press, two moves, release
//   play(f, [dblclick(60, 40)])
//   play(f, [press("ArrowUp", {shiftKey: true})])
const _sl131 = function _playGesture(){return(
(() => {
  const toClient = (node, x, y) => {
    const m = node.getScreenCTM();
    return m ? [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f] : [x, y];
  };
  const pev = (type, cx, cy, o) => new PointerEvent(type, {
    clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse",
    button: 0, buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    shiftKey: !!o.shiftKey, altKey: !!o.altKey, ctrlKey: !!o.ctrlKey, metaKey: !!o.metaKey
  });
  const at = (node, cx, cy) => {
    const el = document.elementFromPoint(cx, cy);
    return el && (el === node || node.contains(el)) ? el : node;
  };
  // A gesture is done when the puts stop arriving, not after a fixed sleep: a commit awaits `settle`,
  // which polls, so the tail is variable. Quiet for `idle` ms, or `max` ms total. `idle` has to
  // clear the *gap between* two commits of one gesture, not just one commit — a four-element move
  // redefines the cell four times in sequence, and at 60ms the harness called the gesture finished
  // after three of them and reported a product bug that was not there.
  const quiet = async (f, idle = 200, max = 4000) => {
    const t0 = Date.now();
    let n = f.puts.length, last = Date.now();
    while (Date.now() - t0 < max) {
      await new Promise((r) => setTimeout(r, 16));
      if (f.puts.length !== n) { n = f.puts.length; last = Date.now(); }
      else if (Date.now() - last >= idle) break;
    }
    return f.puts.length;
  };
  const play = async (f, steps, opts = {}) => {
    const before = f.puts.length;
    for (const step of [].concat(steps)) {
      const node = f.node;
      for (const [kind, x, y, o = {}] of step(node)) {
        const [cx, cy] = toClient(node, x, y);
        if (kind === "down") at(node, cx, cy).dispatchEvent(pev("pointerdown", cx, cy, o));
        else if (kind === "move") node.dispatchEvent(pev("pointermove", cx, cy, o));
        else if (kind === "up") node.dispatchEvent(pev("pointerup", cx, cy, o));
        else if (kind === "dbl") at(node, cx, cy).dispatchEvent(new MouseEvent("dblclick", {
          clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
        else if (kind === "wheel") node.dispatchEvent(new WheelEvent("wheel", {
          clientX: cx, clientY: cy, deltaY: o.deltaY || 0, bubbles: true, cancelable: true,
          ctrlKey: !!o.ctrlKey }));
        else if (kind === "key") document.dispatchEvent(new KeyboardEvent("keydown", {
          key: x, bubbles: true, cancelable: true, ...o }));
        await new Promise((r) => setTimeout(r, 0));
      }
      await quiet(f, opts.idle, opts.max);
    }
    return f.puts.slice(before);
  };
  play.tap = (x, y, o = {}) => () => [["down", x, y, o], ["up", x, y, o]];
  play.drag = (pts, o = {}) => () => [["down", pts[0][0], pts[0][1], o],
    ...pts.slice(1).map(([x, y]) => ["move", x, y, o]),
    ["up", pts[pts.length - 1][0], pts[pts.length - 1][1], o]];
  // A drag left in flight, for the gestures that end some other way than a release: Esc, or a tool
  // change. The pointer is still down when this returns.
  play.hold = (pts, o = {}) => () => [["down", pts[0][0], pts[0][1], o],
    ...pts.slice(1).map(([x, y]) => ["move", x, y, o])];
  play.dblclick = (x, y) => () => [["dbl", x, y, {}]];
  play.wheel = (x, y, deltaY, o = {}) => () => [["wheel", x, y, { deltaY, ...o }]];
  play.press = (key, o = {}) => () => [["key", key, 0, o]];
  return play;
})()
)};


// ================================================================================================
// GESTURE LAWS — the tool-side counterparts of the lens laws above (design note §6.2).
//
// A tool translates view-space deltas into one source-space edit, with the gesture scratch as its
// complement: a *stateful monoid homomorphism* in the sense of Johnson & Rosebrugh (Bx 2016), which
// axiomatises Hofmann/Pierce/Wagner and Diskin/Xiong/Czarnecki. The laws below are those axioms read
// through the dictionary in the design note. They need a browser; headless they report ⏭.
// ================================================================================================
const _sl132 = function _gestureCorpus(){return(
{
  // One of each addressable kind: a filled polygon (interior hit-testable), a stroke-only path (the
  // case a `e.target` hit test misses), a rect (gizmo only) and a transformed group.
  basic: `<svg viewBox="0 0 200 120" width="200" height="120">
  <polygon points="20,100  60,30  100,100" fill="#5B7A5E"/>
  <path d="M 120 100 L 150 40 L 180 100" fill="none" stroke="#4C7FD1" stroke-width="3"/>
  <rect x="20" y="10" width="30" height="16" fill="#B25B3A"/>
  <g transform="translate(150,10) rotate(-4)"><circle cx="0" cy="8" r="7" fill="#F5B840"/></g>
</svg>`,
  // Deliberately non-canonical: a comment, doubled spaces, a comma-separated translate.
  residue: `<svg viewBox="0 0 100 100" width="100" height="100">
  <!-- a comment that must survive every gesture -->
  <rect x="10"  y="10" width="20" height="20" transform="translate(10,20)" fill="#888"/>
</svg>`,
  // Outside the lens domain, but inside the browser's: an odd count of numbers, which Chrome renders
  // as the triangle anyway and `parsePoints` rejects; and an arc, which `parsePath` reads but
  // subdivision cannot split. Both are things the editor must decline rather than guess at.
  broken: `<svg viewBox="0 0 200 120" width="200" height="120">
  <polygon points="20,100  60,30  100,100  55" fill="#5B7A5E"/>
  <path d="M 120 100 A 30 30 0 0 1 180 100" fill="none" stroke="#4C7FD1" stroke-width="6"/>
</svg>`,
  // Points, in user units. `empty` is clear of every shape.
  at: { poly: [60, 80], stroke: [135, 70], rect: [35, 18], group: [150, 18], empty: [105, 15] },
  // Points on `broken`: inside the odd-count triangle, and on the top of the arc.
  brokenAt: { badPoly: [60, 80], arc: [150, 70] }
}
)};

// Mount a fixture, run against it, always unmount. Fixed at the origin and invisible: pointer
// hit-testing needs real laid-out geometry at known coordinates, and a test must not depend on where
// the page happens to be scrolled. It is on screen for the length of one gesture.
const _sl133 = function _withFixture(gestureFixture){return(
(() => {
  // The laws share one screen: hit-testing goes through `elementsFromPoint`, so two fixtures mounted
  // at the same origin would answer for each other's gestures. Observable computes these cells
  // concurrently, so serialise here rather than hoping. A failing law must not block the next one.
  let queue = Promise.resolve();
  return (body, options, fn) => {
    const run = queue.then(async () => {
      const f = await gestureFixture(body, options);
      f.container.style.cssText =
        "position:fixed;left:0;top:0;opacity:0;z-index:2147483646;display:inline-block;line-height:0";
      document.body.appendChild(f.container);
      try { return await fn(f); } finally { f.destroy(); }
    });
    queue = run.then(() => {}, () => {});
    return run;
  };
})()
)};

// L1 · T1 identity — `p(1, c) = (1, c)`. A gesture that moves nothing writes nothing, and hands the
// complement back untouched. Selection is exempt: a click legitimately selects, and selection is not
// in `M_X`. The left half of this law is where gap 0 lives — a missed hit that becomes a *creation*.
const _sl134 = function _test_gesture_identity(withFixture,gestureCorpus,playGesture,domShape)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  return () => withFixture(gestureCorpus.basic, {}, async (f) => {
    for (const [where, [x, y]] of Object.entries(gestureCorpus.at)) {
      const doc0 = f.doc(), n0 = f.elemCount(), h0 = f.historyDepth();
      await playGesture(f, playGesture.tap(x, y));
      if (f.doc() !== doc0) throw new Error(`a null tap on ${where} wrote to the source`);
      if (f.elemCount() !== n0) throw new Error(`a null tap on ${where} changed the element count`);
      if (f.historyDepth() !== h0) throw new Error(`a null tap on ${where} pushed an undo entry`);
      // and again with the shape already selected, which is the state a stray commit hides in
      await playGesture(f, playGesture.tap(x, y));
      if (f.doc() !== doc0) throw new Error(`a second null tap on ${where} wrote to the source`);
    }
    // The other way a gesture can be null: it moved, and then was abandoned. Esc must put back what
    // the preview overwrote, so the drawing is a rendering of its own (unchanged) source again —
    // otherwise the cancel leaves a shape sitting somewhere the source never said.
    let cancels = 0;
    for (const [where, from, to] of [["the polygon", [60, 80], [78, 92]],
                                     ["the rect", [35, 18], [52, 34]],
                                     ["empty canvas (marquee)", [105, 15], [150, 40]]]) {
      const doc0 = f.doc(), h0 = f.historyDepth();
      await playGesture(f, playGesture.hold([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], to]));
      if (!f.node.cancelGesture()) throw new Error(`no tool claimed the drag on ${where}, so cancelling is untested`);
      cancels++;
      if (f.doc() !== doc0) throw new Error(`a cancelled drag on ${where} wrote to the source`);
      if (f.historyDepth() !== h0) throw new Error(`a cancelled drag on ${where} pushed an undo entry`);
      if (domShape.live(f.node) !== domShape.fromSource(f.doc()))
        throw new Error(`a cancelled drag on ${where} left the preview on screen`);
    }
    return `✅ T1: a null gesture is a null edit at ${Object.keys(gestureCorpus.at).length} points, `
         + `and ${cancels} abandoned drags leave neither a byte nor a pixel behind`;
  });
};

// L2 · T2 composition — `p(m m′, c) = (n n′, c″)`. The committed value depends on where the gesture
// ended, not on the path it took there. It holds because tools recompute from the origin held in the
// complement rather than accumulating per frame; a tool that accumulates fails this and drifts.
const _sl135 = function _test_gesture_path_independence(withFixture,gestureCorpus,playGesture)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const A = [60, 80], B = [92, 61];
  const straight = [A, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], B];
  const wander = [A, [A[0] + 40, A[1] - 3], [A[0] - 12, A[1] + 25], [B[0] + 18, B[1] - 14],
                  [A[0] + 2, A[1] + 2], B];
  const run = (path, o = {}) => withFixture(gestureCorpus.basic, {}, async (f) => {
    await playGesture(f, playGesture.tap(...A));
    await playGesture(f, playGesture.drag(path, o));
    return f.doc();
  });
  return async () => Promise.all([run(straight), run(wander),
                                  run(straight, { shiftKey: true }), run(wander, { shiftKey: true })])
    .then(([a, b, la, lb]) => {
      if (a !== b) throw new Error(`the route changed the commit:\n  straight: ${a.match(/transform="[^"]*"/)}\n  wander:   ${b.match(/transform="[^"]*"/)}`);
      if (!/translate/.test(a)) throw new Error("the drag committed nothing, so the law is vacuous here");
      // The axis lock is a function of the endpoint, not of the route, so it has to survive the same
      // test — a lock computed per frame would drift and this is what would catch it.
      if (la !== lb) throw new Error(`with the axis locked, the route changed the commit:\n  straight: ${la.match(/transform="[^"]*"/)}\n  wander:   ${lb.match(/transform="[^"]*"/)}`);
      if (la === a) throw new Error("shift changed nothing, so the axis lock is untested");
      return "✅ T2: a 5-leg wander and a straight drag to the same point commit the same bytes, locked or free";
    });
};

// L4 · T4 origin — d-PutInc, `dom P(X, α) = X`. A gesture commits against the state it started from.
// Each commit mints a new node, so a multi-element move finishes against instances that no longer
// exist; before this was fixed only the first element of a selection moved, silently.
const _sl136 = function _test_gesture_commits_against_its_origin(withFixture,gestureCorpus,playGesture,nodeAt)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  // What this law is *about* is that the tail of a multi-element gesture is not silently dropped:
  // each commit mints a new node, so the second element is committed against an instance that no
  // longer exists. Counting undo entries used to stand in for that, and stopped being able to when
  // G43 let one element write two attributes (a rect moves by `x` *and* `y`). So measure the claim
  // directly: every element the gesture claimed ends up moved, by the same delta.
  const boxes = (f) => f.focusPaths().map((p) => {
    const el = f.elems()[nodeAt(f.doc(), p).index];
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y };
  });
  return () => withFixture(gestureCorpus.basic, {}, async (f) => {
    // marquee the polygon and the path together, then drag one of them
    await playGesture(f, playGesture.drag([[10, 20], [60, 60], [190, 110]]));
    const sel = f.focusPaths().length;
    if (sel < 2) throw new Error(`the marquee selected ${sel} elements, so this law is untested`);
    const before = boxes(f), h0 = f.historyDepth();
    await playGesture(f, playGesture.drag([[60, 80], [66, 84], [72, 90]]));
    const after = boxes(f), gained = f.historyDepth() - h0;
    const moved = after.map((b, i) => [b.x - before[i].x, b.y - before[i].y]);
    const [dx, dy] = moved[0];
    if (Math.hypot(dx, dy) < 1)
      throw new Error("the drag moved nothing, so this law is untested");
    const off = moved.findIndex(([a, b]) => Math.abs(a - dx) > 0.5 || Math.abs(b - dy) > 0.5);
    if (off >= 0)
      throw new Error(`element ${off} of ${sel} moved by (${moved[off]}) where the first moved by (${dx}, ${dy}) — the tail of the gesture committed against a stale node`);
    // G44: one gesture is one edit, however many elements and attributes it touched — so this drag
    // is a single undo entry, not one per element. It must be exactly 1: 0 means nothing committed,
    // more than 1 means the fold broke.
    if (gained !== 1)
      throw new Error(`the ${sel}-element move produced ${gained} undo entries — a gesture must be one edit (G44)`);
    return `✅ T4: a ${sel}-element move moved all ${sel} by the same delta, in one edit`;
  });
};

// L6 · T6 confinement. Ours, not from the papers: a tool that declines has changed nothing, and
// installing it cannot change what the tools before it do. Registry order is priority, so tool sets
// form a monoid under concatenation and the fold must respect it. This is what a plugin has to prove.
const _sl137 = function _test_gesture_confinement(withFixture,gestureCorpus,playGesture,svgTools)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const seen = [];
  const declines = { id: "declines-everything",
    onPointerDown: (ctx, e) => { seen.push(e.type); return false; },
    onDblClick: () => false, onHover: () => {} };
  const script = [playGesture.tap(60, 80), playGesture.drag([[60, 80], [70, 86], [84, 94]])];
  const run = (tools) => withFixture(gestureCorpus.basic, { tools }, async (f) => {
    for (const s of script) await playGesture(f, s);
    return f.doc();
  });
  return async () => Promise.all([run(svgTools), run([declines, ...svgTools]), run([...svgTools, declines])])
    .then(([base, first, last]) => {
      if (!seen.length) throw new Error("the declining tool was never offered the gesture");
      if (first !== base) throw new Error("installing a declining tool at the head changed the result");
      if (last !== base) throw new Error("installing a declining tool at the tail changed the result");
      return `✅ T6: a declining tool is invisible at either end of the registry (${seen.length} offers)`;
    });
};

// L9 · a selection-only tool never writes the source. The marquee acts on the complement, not on
// `M_X`; giving it its own law is what stops a future refactor quietly making selection an edit.
const _sl138 = function _test_gesture_selection_is_not_an_edit(withFixture,gestureCorpus,playGesture,toolMarquee)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  return () => withFixture(gestureCorpus.basic, { tools: [toolMarquee] }, async (f) => {
    const doc0 = f.doc(), h0 = f.historyDepth();
    let most = 0;
    // Two bands that cover the drawing (either drag direction) and one over empty space, which is
    // *meant* to select nothing — so the "did it ever select?" check is a maximum, not the final
    // state, or the empty band makes the law look vacuous when it is doing its job.
    for (const box of [[[5, 5], [100, 60], [195, 115]], [[190, 110], [90, 50], [10, 10]],
                       [[105, 12], [106, 13], [107, 14]]]) {
      await playGesture(f, playGesture.drag(box));
      most = Math.max(most, f.focusPaths().length);
      if (f.doc() !== doc0) throw new Error("the marquee wrote to the source");
      if (f.historyDepth() !== h0) throw new Error("the marquee pushed an undo entry");
    }
    if (f.focusPaths().length) throw new Error("a band over empty space left a selection behind");
    if (!most) throw new Error("no band ever selected anything, so the law is vacuous");
    return `✅ T9: the marquee selects up to ${most} elements across 3 bands and never writes the source`;
  });
};


// L5 · T5 consistency. The view is a function of the source: once a gesture is over, what is on
// screen must be exactly what re-rendering the committed text would give. The gap this closes is a
// *preview that outlived its commit* — a tool writes an attribute to show its work, commits a
// different value (or none), and the drawing keeps showing the preview until something unrelated
// forces a re-render. Mid-gesture is exempt, deliberately: a preview is allowed to be ahead of the
// source, it is just not allowed to survive.
// "The drawing is a rendering of its own source", as a comparable value. Ignores what neither side
// can be expected to agree on: the overlay (not in the source by construction), whitespace-only text
// (formatting), and the root's `style`, which svgLens sets to `touch-action:none` on the node it
// projects. Used by T5 after a commit and by T1 after a cancel — the same claim, two occasions.
const _sl140a = function _domShape(){return(
(() => {
  const shape = (el, root) => {
    const attrs = {};
    for (const a of el.attributes) if (!(el === root && a.name === "style")) attrs[a.name] = a.value;
    const kids = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 1) {
        if (!n.hasAttribute("data-svg-lens-overlay")) kids.push(shape(n, root));
      } else if (n.nodeType === 8) kids.push({ comment: n.nodeValue });
      else if (n.nodeType === 3 && n.nodeValue.trim()) kids.push({ text: n.nodeValue });
    }
    return { tag: el.localName, attrs, kids };
  };
  return {
    live: (node) => JSON.stringify(shape(node, node)),
    fromSource: (text) => {
      const d = new DOMParser().parseFromString(text, "image/svg+xml");
      if (d.querySelector("parsererror")) throw new Error("the source no longer parses as SVG");
      return JSON.stringify(shape(d.documentElement, d.documentElement));
    }
  };
})()
)};

const _sl140 = function _test_gesture_render_consistency(withFixture,gestureCorpus,playGesture,domShape)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const { live, fromSource } = domShape;
  return () => withFixture(gestureCorpus.basic, {}, async (f) => {
    // move, gizmo and vertex: one gesture through each of the three tools that write an attribute.
    const script = [
      ["select the polygon",   playGesture.tap(60, 80)],
      ["drag its body",        playGesture.drag([[60, 80], [66, 84], [72, 88]])],
      ["drag one of its vertices", playGesture.drag([[26, 104], [30, 108], [34, 110]])],
      ["select the rect",      playGesture.tap(35, 18)],
      ["drag the rect",        playGesture.drag([[35, 18], [42, 24], [48, 30]])],
      // inside a <g transform=…>: the case where the overlay and the drawing can disagree about
      // which space they are in. `boxGap` was written for this and never asserted, and the answer
      // was 150px — the handles for anything in a group were drawn at the root's origin.
      ["select the circle in the group", playGesture.tap(150, 18)]
    ];
    for (const [what, step] of script) {
      await playGesture(f, step);
      if (live(f.node) !== fromSource(f.doc()))
        throw new Error(`after "${what}" the drawing is not a rendering of its own source`);
      const gap = f.boxGap();
      if (gap !== null && gap > 1.5)
        throw new Error(`after "${what}" the overlay is ${gap.toFixed(1)}px from what it frames`);
    }
    return `✅ T5: the view is a re-render of the committed source after ${script.length} gestures, `
         + `and the overlay frames what is selected`;
  });
};

// L7 · T7 rebase agreement. Ours, not from the papers — it is OT's TP1 for addresses: a structural
// edit moves the elements that come after it, so anyone holding an address (the selection, an open
// inspector, a half-finished gesture) needs the edit to say where it went. `test_rebasePath` already
// checks the three primitives against ground truth; what is unchecked is the *callsites*, where an
// index is clamped once and handed to both the command and its rebase. If those two clamp
// differently the selection silently lands on the wrong shape — so the ground truth here is bytes:
// the address the rebase gives back must hold what the old address held.
const _sl141 = function _test_gesture_rebase_agreement(withFixture,gestureCorpus,nodeAt,childrenLens,insertPoint)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const MARK = '<circle cx="7" cy="7" r="3" fill="#333"/>';
  const kids = (d) => childrenLens([0]).get(d);
  const textAt = (d, p) => { const n = nodeAt(d, p); return d.slice(n.start, n.end); };
  // `changed` is the one index a point edit is allowed to rewrite: it claims no rebase, and the
  // claim to check is that the tree is untouched, not that the bytes are.
  const check = (label, before, after, rec, changed = -1) => {
    const n0 = kids(before).length, n1 = kids(after).length;
    const rebase = rec && rec.rebase;
    let dropped = 0;
    for (let j = 0; j < n0; j++) {
      const to = rebase ? rebase([0, j]) : [0, j];
      if (to === null) { dropped++; continue; }
      let got = null;
      try { got = textAt(after, to); } catch (err) { got = null; }
      if (got === null)
        throw new Error(`${label}: ${j} rebased to ${to.join("/")}, which addresses nothing`);
      if (j !== changed && got !== textAt(before, [0, j]))
        throw new Error(`${label}: ${j} rebased to ${to.join("/")}, which is a different element`);
    }
    if (dropped !== Math.max(0, n0 - n1))
      throw new Error(`${label}: the edit removed ${n0 - n1} elements, the rebase dropped ${dropped}`);
  };
  return () => withFixture(gestureCorpus.basic, {}, async (f) => {
    // Every structural entry point the node offers, in turn, against the document the last one left.
    // The point edit goes first, while [0,0] is still the corpus's polygon — the reordering cases
    // below move the elements around, which is the whole point of them.
    const cases = [
      // A point edit rewrites one element and claims the tree is untouched. Same law, rebase absent.
      ["insertPoint (no rebase)",
       () => f.node.edit("insertPoint", (d) => insertPoint(d, [0, 0], 0, [50, 50])), 0],
      ["addShape at the head", () => f.node.addShape(MARK, 0), -1],
      ["addShape appended",    () => f.node.addShape(MARK), -1],
      ["removeAt the middle",  () => f.node.removeAt([0, 2]), -1],
      ["moveTo",               () => f.node.moveTo([0, 0], 2), -1],
      ["zOrder front",         () => f.node.zOrder([0, 0], "front"), -1],
      ["zOrder back",          () => f.node.zOrder([0, 3], "back"), -1]
    ];
    for (const [label, run, changed] of cases) {
      const before = f.doc();
      const rec = await run();
      if (!rec) throw new Error(`${label}: the command did not run`);
      check(label, before, f.doc(), rec, changed);
    }
    return `✅ T7: ${cases.length} structural commands each say where every address went`;
  });
};

// L8 · partiality. A module action is partial [JR16 Def 6]: the tool is allowed to have nothing to
// say. What it is not allowed to do is guess. Both cases here are documents the *browser* renders
// happily and the *lens* cannot read — an odd-count points list, and an arc, which subdivision has
// no exact split for — and in both the editor must fall back to something it can do (the transform
// gizmo) or decline outright, leaving the source alone. This is the gap-0 regression test: the
// failure mode is a declined gesture falling through to "create a shape here".
const _sl142 = function _test_gesture_partiality(withFixture,gestureCorpus,playGesture)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const handles = (f, cls) => f.node.querySelectorAll(`[data-svg-lens-overlay] .${cls}`).length;
  return () => withFixture(gestureCorpus.broken, {}, async (f) => {
    const doc0 = f.doc(), n0 = f.elemCount();
    const intact = (what) => {
      if (f.doc() !== doc0) throw new Error(`${what} wrote to a source it cannot read`);
      if (f.elemCount() !== n0) throw new Error(`${what} changed the element count`);
    };
    const [bx, by] = gestureCorpus.brokenAt.badPoly;
    await playGesture(f, playGesture.tap(bx, by));
    if (!f.focusPaths().length) throw new Error("the unreadable polygon could not even be selected");
    if (handles(f, "anchor")) throw new Error("vertex handles were offered for an unparseable points list");
    if (!handles(f, "scale")) throw new Error("no fallback gizmo was offered either, so nothing is editable");
    intact("selecting the unreadable polygon");
    await playGesture(f, playGesture.dblclick(bx, by));
    intact("double-clicking the unreadable polygon");

    const [ax, ay] = gestureCorpus.brokenAt.arc;
    await playGesture(f, playGesture.tap(ax, ay));
    const on = f.focusPaths().length === 1 && handles(f, "anchor") > 0;
    if (!on) throw new Error("the arc path was not selected in path mode, so subdivision is untested");
    await playGesture(f, playGesture.dblclick(ax, ay));
    intact("double-clicking an arc segment");
    return "✅ T8: two documents the lens cannot read are selectable, and neither gesture guesses";
  });
};


// L3 · T3 coherence, the static half. The dynamic half is T5 above; this one is cheaper, stronger
// and needs nothing but the tools themselves. After the P1 conversion a tool has exactly two routes
// to the drawing — `previewDelta` for what it will commit, and the overlay for what it will not —
// so any `setAttribute` on anything the overlay did not hand out is a second write path, and a
// second write path is where preview and source drift apart. Reading the handlers' own source is
// the point: this is a claim about how the tools are *written*, and it fails the moment one is
// written differently. The tools are listed rather than read from `svgTools`, which is an
// `Inputs.input` and so needs a DOM this law does not.
const _sl143 = function _test_tools_write_through_the_delta(toolAffordance,toolDraw,toolPen,toolScribble,toolTransform,toolVertex,toolMove,toolMarquee,toolScope,toolZoom,toolStructure,toolHover)
{
  const tools = [toolAffordance, toolDraw, toolPen, toolScribble, toolTransform, toolVertex, toolMove, toolMarquee, toolScope, toolZoom, toolStructure, toolHover];
  const HANDLERS = ["onPointerDown", "onPointerMove", "onPointerUp", "onDblClick", "onHover", "onPointerLeave", "onWheel"];
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  const bad = [];
  let previews = 0;
  for (const t of tools) {
    const srcs = HANDLERS.filter((h) => typeof t[h] === "function")
                         .map((h) => [h, strip(t[h].toString())]);
    // Whatever this tool was handed by the overlay. Anything else receiving `setAttribute` is a
    // document element, and the tool is painting outside the delta.
    const own = new Set();
    for (const [, src] of srcs)
      for (const m of src.matchAll(/([A-Za-z_$][\w$.]*)\s*=\s*ctx\.overlay\.add/g)) own.add(m[1]);
    for (const [h, src] of srcs) {
      for (const m of src.matchAll(/([A-Za-z_$][\w$.]*)\.setAttribute\s*\(/g)) {
        if (own.has(m[1])) previews++;
        else bad.push(`${t.id}.${h} writes ${m[1]}.setAttribute outside previewDelta`);
      }
      for (const m of src.matchAll(/ctx\.writer\.(commit|runCommand)\s*\(/g))
        bad.push(`${t.id}.${h} calls ctx.writer.${m[1]} instead of commitDelta`);
    }
  }
  if (bad.length) throw new Error(bad.join("; "));
  return `✅ ${tools.length} tools reach the drawing only through the delta (${previews} overlay writes, 0 direct)`;
};


// P5's law. A tool should be a function of `ctx` and the trace and of nothing else — that is what
// makes "a tool is a stateful monoid homomorphism" a claim about code rather than a metaphor, and
// what would let a fake `ctx` drive a tool with no document at all. A handler that reaches past the
// facade to `getBBox`/`getScreenCTM`/`elementsFromPoint` has a hidden input, and hidden inputs are
// exactly what the laws cannot see. `hitTest` still asks the browser; the point is that it is the
// one place that does, reachable as `ctx.hit`.
const _sl144 = function _test_tools_measure_through_ctx(toolAffordance,toolDraw,toolPen,toolScribble,toolTransform,toolVertex,toolMove,toolMarquee,toolScope,toolZoom,toolStructure,toolHover)
{
  const tools = [toolAffordance, toolDraw, toolPen, toolScribble, toolTransform, toolVertex, toolMove, toolMarquee, toolScope, toolZoom, toolStructure, toolHover];
  const HANDLERS = ["onPointerDown", "onPointerMove", "onPointerUp", "onDblClick", "onHover", "onPointerLeave", "onWheel"];
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  const BANNED = /\b(getBBox|getScreenCTM|getBoundingClientRect|elementsFromPoint|getTotalLength|getPointAtLength)\s*\(/g;
  const bad = [];
  let asked = 0;
  for (const t of tools)
    for (const h of HANDLERS) {
      if (typeof t[h] !== "function") continue;
      const src = strip(t[h].toString());
      for (const m of src.matchAll(BANNED)) bad.push(`${t.id}.${h} measures with ${m[1]} instead of ctx`);
      for (const _ of src.matchAll(/\bctx\.(bbox|screenCTM|screenBox|rootBox|hit|localPoint)\s*\(/g)) asked++;
    }
  if (bad.length) throw new Error(bad.join("; "));
  return `✅ ${tools.length} tools measure only through ctx (${asked} measurements, 0 direct)`;
};


// The gesture laws are opt-in. Unlike the lens laws they mount a fixture, dispatch real pointer
// events and commit through `Variable.define` — seconds of work and a burst of change-history
// traffic — so running them on every reader's load would be wrong. Each law above is a function;
// this runs them all and reports. CI calls `gestureLaws.run()`.
// T10 — the hit contract (S1/G6). Ours, not from either paper, and it is the law gap 0 needed: what
// the hover outlines, what a press claims and what a double-click enters are three readings of one
// answer, so they cannot drift apart. It also pins the group policy — click takes the group,
// double-click descends, Escape ascends — and the case that made gap 0 visible, a double-click on a
// stroke-only shape, which used to miss with `e.target` and append a shape onto the canvas.
const _sl145 = function _test_gesture_hit_agreement(withFixture,gestureCorpus,playGesture,boxInRoot)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  const near = (a, b) => a && b && Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y),
                                            Math.abs(a.width - b.width), Math.abs(a.height - b.height)) < 1.5;
  return () => withFixture(gestureCorpus.basic, {}, async (f) => {
    const hoverBox = () => {
      const r = f.node.querySelector("[data-svg-lens-overlay] rect.hover");
      return r && { x: +r.getAttribute("x"), y: +r.getAttribute("y"),
                    width: +r.getAttribute("width"), height: +r.getAttribute("height") };
    };
    const selBox = () => {
      const sel = f.node.selectionPaths();
      if (sel.length !== 1) return null;
      const el = f.elems()[f.node.describe(sel[0]).index];
      return el && boxInRoot(el, f.node);
    };
    let checked = 0;
    for (const [where, [x, y]] of Object.entries(gestureCorpus.at)) {
      if (where === "empty") continue;
      await playGesture(f, playGesture.tap(-40, -40));              // clear the selection first
      await playGesture(f, () => [["move", x, y]]);                 // hover, no press
      const hb = hoverBox();
      if (!hb) throw new Error(`nothing was outlined over ${where}`);
      await playGesture(f, playGesture.tap(x, y));
      if (!near(hb, selBox()))
        throw new Error(`over ${where} the outline and the selection disagree: `
                      + `${JSON.stringify(hb)} vs ${JSON.stringify(selBox())}`);
      checked++;
    }
    // A group is one thing until you enter it.
    await playGesture(f, playGesture.tap(...gestureCorpus.at.group));
    const outer = f.node.selectionPaths()[0];
    if (!outer || outer.length !== 2)
      throw new Error(`clicking a grouped shape selected ${JSON.stringify(outer)}, not the group`);
    const n0 = f.elemCount();
    await playGesture(f, playGesture.dblclick(...gestureCorpus.at.group));
    const inner = f.node.selectionPaths()[0];
    if (!inner || inner.length !== 3)
      throw new Error(`double-click did not descend: ${JSON.stringify(inner)}`);
    if (f.elemCount() !== n0) throw new Error("descending into a group changed the element count");
    if (!f.node.ascendScope()) throw new Error("Escape could not step back out of the group");
    if (JSON.stringify(f.node.selectionPaths()[0]) !== JSON.stringify(outer))
      throw new Error("stepping out of a group did not select the group");
    // Gap 0: a stroke-only shape is hittable, so double-clicking it is not "empty canvas".
    await playGesture(f, playGesture.tap(-40, -40));
    const n1 = f.elemCount();
    await playGesture(f, playGesture.dblclick(...gestureCorpus.at.stroke));
    if (f.elemCount() !== n1)
      throw new Error("double-clicking a stroke-only shape appended an element");
    return `✅ T10: outline and selection agree at ${checked} points, a group is one thing until `
         + `entered, and a stroke-only shape is not empty canvas`;
  });
};

// T11 — the view is not an edit (S7/G25). Ours. Two halves, and they are S7's falsifier verbatim:
// zooming and panning must leave the source byte-identical, and the *same drag in the drawing's own
// units* must commit the same bytes at any zoom. The second half is the interesting one — it is what
// makes "no tool needed changing for zoom" a claim rather than a hope, and it holds because every
// measurement goes through `ctx` (P5) and `getScreenCTM` already carries the viewBox.
//
// **With alignment snapping off**, and the qualifier is the finding rather than an excuse. Snapping
// is magnetism: `snapRects` measures it in *screen* pixels, so at 2.5× a neighbour two units away is
// five pixels away and pulls when it did not before. That is the right behaviour — you snap to what
// looks close — but it makes the committed bytes a function of the zoom, so the law names the one
// deliberate screen-space affordance instead of pretending the whole pipeline is scale-free.
// Both arms assert they actually *committed*, because the first version of this law compared two
// drags that had silently missed (the zoom put the shape outside the viewport) and would have passed
// on two empty results.
const _sl146 = function _test_gesture_view_is_not_an_edit(withFixture,gestureCorpus,playGesture)
{
  if (typeof document === "undefined") return () => "⏭ needs a browser";
  // alt: no magnetism, so only the geometry pipeline is under test.
  const dragPoly = playGesture.drag([[60, 80], [66, 84], [72, 88]], { altKey: true });
  const moved = (doc) => (doc.match(/<polygon[^>]*>/) || [""])[0];
  // Two fixtures, one after the other and *not* nested: `withFixture` serialises on one queue, so a
  // nested call waits for the outer one to finish and neither ever does.
  return async () => {
  const at1 = await withFixture(gestureCorpus.basic, {}, async (f) => {
    const doc0 = f.doc(), h0 = f.historyDepth().undo;
    const moves = [
      ["wheel in",  playGesture.wheel(60, 80, -400)],
      ["wheel out", playGesture.wheel(60, 80, 260)],
      ["fit",       () => []]
    ];
    for (const [what, step] of moves) {
      await playGesture(f, step);
      if (what === "fit") f.node.fitView([]);
      if (f.doc() !== doc0) throw new Error(`${what} wrote to the source`);
      if (f.historyDepth().undo !== h0) throw new Error(`${what} pushed an undo entry`);
    }
    f.node.panBy(37, -19);
    if (f.doc() !== doc0) throw new Error("panning wrote to the source");
    const zoomed = f.node.view().k;
    if (!(zoomed > 0) || zoomed === 1) throw new Error(`the view never actually changed (k=${zoomed})`);

    // ...and the same drag, in the drawing's units, commits the same bytes at any zoom.
    f.node.resetView();
    await playGesture(f, playGesture.tap(60, 80));
    await playGesture(f, dragPoly);
    if (!/transform=/.test(moved(f.doc()))) throw new Error("the zoom-1 drag committed nothing");
    return f.doc();
  });
  return withFixture(gestureCorpus.basic, {}, async (g) => {
    // Centred on the drag: at 2.5× the viewport is 80×48 user units, and a view that leaves the
    // shape outside it means the pointer lands on the page, not on the drawing.
    g.node.setView({ k: 2.5, x: 20, y: 56 });
    await playGesture(g, playGesture.tap(60, 80));
    if (!g.node.selectionPaths().length) throw new Error("nothing was selectable at zoom 2.5");
    await playGesture(g, dragPoly);
    if (!/transform=/.test(moved(g.doc()))) throw new Error("the zoom-2.5 drag committed nothing");
    if (g.doc() !== at1)
      throw new Error(`the same drag committed different bytes at zoom 2.5:\n${moved(at1)}\nvs\n${moved(g.doc())}`);
    if (g.node.view().k !== 2.5) throw new Error("the commit lost the view");
    return `✅ T11: 4 view changes wrote nothing, and the same drag commits the same bytes at `
         + `zoom 1 and at zoom 2.5 (snapping off — it is magnetism, and magnetism is screen-space)`;
  });
  };
};

const _sl139 = function _gestureLaws(test_gesture_identity,test_gesture_path_independence,test_gesture_commits_against_its_origin,test_gesture_render_consistency,test_gesture_confinement,test_gesture_rebase_agreement,test_gesture_partiality,test_gesture_selection_is_not_an_edit,test_gesture_hit_agreement,test_gesture_view_is_not_an_edit){return(
{
  laws: {
    "T1 identity": test_gesture_identity,
    "T2 path independence": test_gesture_path_independence,
    "T4 origin": test_gesture_commits_against_its_origin,
    "T5 consistency": test_gesture_render_consistency,
    "T6 confinement": test_gesture_confinement,
    "T7 rebase agreement": test_gesture_rebase_agreement,
    "T8 partiality": test_gesture_partiality,
    "T9 selection is not an edit": test_gesture_selection_is_not_an_edit,
    "T10 hit agreement": test_gesture_hit_agreement,
    "T11 the view is not an edit": test_gesture_view_is_not_an_edit
  },
  async run() {
    const out = {};
    for (const [name, law] of Object.entries(this.laws)) {
      try { out[name] = await law(); } catch (e) { out[name] = "❌ " + e.message; }
    }
    return out;
  }
}
)};

// B3. The measurements the K-section bugs were caught by, written by hand each time, made a harness:
// T5 applied *per frame* of a gesture rather than per commit. It samples the drawing every
// `requestAnimationFrame` while a scripted drag plays, and asserts what a mid-gesture frame must never
// do — lose the selection between two frames (the M17 undo-drops-selection class), let the overlay
// drift from the shape it frames (the group-space boxGap), or render the drawing at a scale its
// neighbours do not (the B2 unzoomed flash, which was exactly one frame at 2.64×). Needs a browser;
// headless it reports ⏭. `frameBudget.run()`, the frame-level sibling of `gestureLaws.run()`.
const _sl274 = function _frameBudget(withFixture,gestureCorpus,playGesture){return(
(() => {
  if (typeof document === "undefined") return { run: async () => "⏭ needs a browser" };
  const scaleOf = (el) => { const m = el && el.getScreenCTM && el.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : null; };
  // Sample per rAF for the life of `promise` (a gesture in flight). The tools commit on macrotasks, so
  // frames land between the moves and the settle-polls — this is the only view of a partial gesture.
  const sampleWhile = async (f, promise) => {
    const frames = [];
    let on = true;
    const tick = () => { if (!on) return; frames.push({ sel: f.focusPaths().length, gap: f.boxGap(), scale: scaleOf(f.node) }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await promise;
    on = false;
    return frames;
  };
  const run = async () => withFixture(gestureCorpus.basic, {}, async (f) => {
    await playGesture(f, playGesture.tap(60, 80));                 // select the polygon
    if (f.focusPaths().length !== 1) throw new Error("setup: the polygon did not select");
    const drag = playGesture.drag([[60, 80], [66, 84], [74, 90], [82, 96], [90, 100]]);
    const frames = await sampleWhile(f, playGesture(f, drag));
    const withBox = frames.filter((s) => s.gap !== null);
    const bad = [];
    if (frames.some((s) => s.sel === 0)) bad.push("the selection went empty between two frames of the drag");
    const maxGap = Math.max(0, ...withBox.map((s) => s.gap));
    if (maxGap > 2) bad.push(`the overlay drifted ${maxGap.toFixed(1)}px from the shape mid-gesture`);
    let maxJump = 1;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1].scale, b = frames[i].scale;
      if (a && b) maxJump = Math.max(maxJump, a > b ? a / b : b / a);
    }
    if (maxJump > 1.5) bad.push(`the drawing scale jumped ${maxJump.toFixed(2)}× between two frames (a view applied a frame late)`);
    if (bad.length) throw new Error(bad.join("; "));
    return `✅ B3: ${frames.length} sampled frames through a drag — selection held (≥1), overlay within `
         + `${maxGap.toFixed(1)}px every frame, no scale flash (max neighbour ratio ${maxJump.toFixed(2)}×)`;
  });
  return { run, sampleWhile };
})()
)};


// Outline whatever a click would claim. Hit-testing is deliberately tolerant — it falls back to
// distance along the geometry, so a hairline is grabbable from several pixels away — and that
// tolerance is invisible without this: you cannot tell a shape you are about to select from one you
// are about to miss. It reads through `ctx.hit`, the same call `toolMove` makes, so the highlight
// cannot disagree with what the click then does. Draws only, and only into the overlay: a `view`
// delta, so T9's argument covers it too.
const _sl127h = function _toolHover(gestureDelta,previewDelta){return(
{
  id: "hover",
  onHover(ctx, e) {
    const p = ctx.pick(e)[0] || null;                    // the same call selection makes (S1)
    const hit = p && p.el;
    // The selection already has a box round it; outlining it again just makes the box thicker.
    const selected = p && ctx.focus.indices.includes(p.index);
    const b = hit && !selected ? ctx.rootBox(hit) : null;
    previewDelta(ctx, gestureDelta.view(
      b ? [{ tag: "rect", attrs: { class: "hover", x: b.x, y: b.y, width: b.width, height: b.height } }] : [],
      { key: "hover", cursor: hit ? "move" : "default" }));
  },
  // The pointer can leave without a last move over empty space, which would strand the outline.
  onPointerLeave(ctx) {
    previewDelta(ctx, gestureDelta.view([], { key: "hover", cursor: "default" }));
  }
}
)};

const _sl123 = function _svgTools(Inputs,toolAffordance,toolDraw,toolPen,toolScribble,toolTransform,toolVertex,toolMove,toolMarquee,toolScope,toolZoom,toolStructure,toolHover){return(
// toolAffordance is first so a chip press is claimed before the handle/move tools — safe because it
// gates on `dataset.aff` and falls through on anything else (the G22 empty-space discipline).
Inputs.input([toolAffordance, toolDraw, toolPen, toolScribble, toolTransform, toolVertex, toolMove, toolMarquee, toolScope, toolZoom, toolStructure, toolHover])
)};
const _sl123v = (G, _) => G.input(_);

// ---- the command registry (S4) --------------------------------------------------------------------
// A *command* is a verb that acts on the selection rather than on the pointer: group, duplicate,
// paste, align. It is the fifth registry §6.1 asks for, and it earns the name by being the same kind
// of thing a tool is — `plan(env)` returns **deltas**, so a command lands in the same sink a gesture
// does, owes the same laws, and needs no second write path. A new verb is a new cell.
//
// `env` is to a command what `ctx` is to a tool: the only thing it may read. Pure data plus three
// measured questions, so a command can be planned headless with a fake env and the plan compared
// against what the browser does.
//
//   { src, paths, scope, index(path), childCount(parent), clipboard(), target(path), options }
//
// `plan` returning null is a decline (T8), and that is also how a menu knows to grey the item out —
// one answer, asked once, rather than an `enabled` predicate that can disagree with the plan.

const _sl240 = function _cmdGroup(gestureDelta,groupPlan,groupElements,rebaseMoves){return(
{
  id: "group", label: "Group", key: "Mod-g",
  plan(env) {
    if (!env.paths.length) return null;
    let p;
    try { p = groupPlan(env.paths); } catch (e) { return null; }   // not siblings: decline
    const gpath = p.parent.concat([p.at]);
    const order = env.paths.slice().sort((a, b) => a[a.length - 1] - b[b.length - 1]);
    return gestureDelta.command("group", (src) => groupElements(src, env.paths), {
      // A member did not vanish — it moved inside the new <g>, at the rank its index gives it.
      rebase: rebaseMoves(order.map((q, k) => [q, gpath.concat([k])]),
                          p.indices.slice().reverse().map((i) => ({ kind: "delete", path: p.parent.concat([i]) }))
                            .concat([{ kind: "insert", parent: p.parent, at: p.at }])),
      select: () => [gpath]
    });
  }
}
)};

const _sl241 = function _cmdUngroup(gestureDelta,ungroupBlockers,ungroupElements,childrenLens,rebaseMoves){return(
{
  id: "ungroup", label: "Ungroup", key: "Mod-Shift-g",
  plan(env) {
    // Descending, so dissolving one group cannot invalidate the address of the next: replacing a
    // child with n children only shifts what comes *after* it. Same argument as `removeSelection`.
    const groups = env.paths.filter((p) => !ungroupBlockers(env.src, p).length)
                            .sort((a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) {
                              const d = (b[i] === undefined ? -1 : b[i]) - (a[i] === undefined ? -1 : a[i]);
                              if (d) return d; } return 0; });
    if (!groups.length) return null;
    return groups.map((path, k) => {
      const parent = path.slice(0, -1), gi = path[path.length - 1];
      const n = childrenLens(path).get(env.src).length;
      const kids = Array.from({ length: n }, (_, j) => [path.concat([j]), parent.concat([gi + j])]);
      return gestureDelta.command("ungroup", (src) => ungroupElements(src, path), {
        rebase: rebaseMoves(kids, [{ kind: "delete", path }].concat(
          Array.from({ length: n }, () => ({ kind: "insert", parent, at: gi })))),
        // Only when one group was asked for: with several, the freed children of the first are
        // already moving under the second, and guessing at that is how a selection ends up lying.
        select: groups.length === 1 ? () => kids.map(([, to]) => to) : null
      });
    });
  }
}
)};

const _sl301 = function _pasteInto(gestureDelta,offsetMarkup,pasteMarkup){return(
(id, parent, markups, at, d) => {
  // Shared tail of duplicate/paste: nudge each markup by d, append under `parent` at `at`, select the
  // new children. Appended after everything that exists, so no existing address moves — rebase is null.
  const placed = d ? markups.map((m) => offsetMarkup(m, d, d)) : markups;
  return gestureDelta.command(id, (src) => pasteMarkup(src, parent, at, placed), {
    rebase: null,
    select: () => placed.map((_, k) => parent.concat([at + k]))
  });
}
)};

const _sl242 = function _cmdDuplicate(copyMarkup,pasteInto){return(
{
  id: "duplicate", label: "Duplicate", key: "Mod-d",
  plan(env) {
    if (!env.paths.length) return null;
    const parent = env.paths[0].slice(0, -1);
    // One parent, because "offset by a nudge" is a statement in *that* parent's coordinates.
    if (env.paths.some((p) => p.length !== env.paths[0].length || !parent.every((v, i) => p[i] === v)))
      return null;
    const d = env.options.duplicateOffset === undefined ? 8 : env.options.duplicateOffset;
    return pasteInto("duplicate", parent, copyMarkup(env.src, env.paths), env.childCount(parent), d);
  }
}
)};

const _sl243 = function _cmdCopy(gestureDelta,copyMarkup){return(
{
  id: "copy", label: "Copy", key: "Mod-c",
  plan(env) {
    if (!env.paths.length) return null;
    return gestureDelta.clip(copyMarkup(env.src, env.paths));
  }
}
)};

const _sl244 = function _cmdCut(gestureDelta,copyMarkup,deleteElement,rebasePath){return(
{
  id: "cut", label: "Cut", key: "Mod-x",
  plan(env) {
    if (!env.paths.length) return null;
    const order = env.paths.slice().sort((a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (b[i] === undefined ? -1 : b[i]) - (a[i] === undefined ? -1 : a[i]);
        if (d) return d;
      }
      return 0;
    });
    return [gestureDelta.clip(copyMarkup(env.src, env.paths))].concat(
      order.map((path, k) => gestureDelta.command("deleteElement", (src) => deleteElement(src, path), {
        rebase: (q) => rebasePath(q, { kind: "delete", path }),
        select: k === order.length - 1 ? () => [] : null
      })));
  }
}
)};

const _sl245 = function _cmdPaste(pasteInto){return(
(inPlace) => ({
  // Two verbs, one plan: paste offsets so you can see that something arrived, paste-in-place does not,
  // which is what makes it the exact inverse of copy and therefore the thing a law can check.
  id: inPlace ? "paste-in-place" : "paste",
  label: inPlace ? "Paste in place" : "Paste",
  key: inPlace ? "Mod-Shift-v" : "Mod-v",
  plan(env) {
    const clip = env.clipboard();
    if (!clip || !clip.length) return null;
    const parent = env.scope && env.scope.length ? env.scope : [0];
    const d = inPlace ? 0 : (env.options.duplicateOffset === undefined ? 8 : env.options.duplicateOffset);
    return pasteInto(inPlace ? "paste-in-place" : "paste", parent, clip, env.childCount(parent), d);
  }
})
)};

// Align and distribute are *not* structural: they are the move tool's write, aimed by arithmetic
// instead of by a pointer. So they emit `attr` deltas through `translateLens` — the same commit a
// drag performs — and G18's falsifier ("aligning an already-aligned set writes anything at all")
// holds by the skip rule rather than by a special case: the put returns the same source, and the
// writer stops. Measured in screen space, where every box is axis-aligned whatever transforms its
// element carries, and converted back per element exactly as a drag is.
const _sl246 = function _alignSpecs(){return(
[["align-left", "Align left", "x", 0], ["align-center-h", "Align centres", "x", 0.5],
 ["align-right", "Align right", "x", 1], ["align-top", "Align top", "y", 0],
 ["align-middle-v", "Align middles", "y", 0.5], ["align-bottom", "Align bottom", "y", 1]]
)};

const _sl247 = function _cmdAlign(moveDeltas){return(
([id, label, axis, frac]) => ({
  id, label, key: null,
  plan(env) {
    if (env.paths.length < 2) return null;
    const ts = env.paths.map(env.target).filter((t) => t && t.box);
    if (ts.length < 2) return null;
    const lo = axis === "x" ? "x" : "y", len = axis === "x" ? "width" : "height";
    const edge = (b) => b[lo] + frac * b[len];
    const to = frac === 0 ? Math.min(...ts.map((t) => t.box[lo]))
             : frac === 1 ? Math.max(...ts.map((t) => t.box[lo] + t.box[len]))
             : (Math.min(...ts.map((t) => t.box[lo])) + Math.max(...ts.map((t) => t.box[lo] + t.box[len]))) / 2;
    return ts.map((t) => {
      const dx = axis === "x" ? to - edge(t.box) : 0, dy = axis === "y" ? to - edge(t.box) : 0;
      return moveDeltas(t, dx, dy, { q: (v) => Math.round(v * 1e4) / 1e4 });   // see toolMove on 1e-4
    }).flat();
  }
})
)};

const _sl248 = function _cmdDistribute(moveDeltas){return(
// Equal *gaps between centres*, with the outermost two left where they are — the only reading that
// is idempotent, which is what makes T1 hold for it too.
(axis) => ({
  id: axis === "x" ? "distribute-h" : "distribute-v",
  label: axis === "x" ? "Distribute horizontally" : "Distribute vertically",
  key: null,
  plan(env) {
    if (env.paths.length < 3) return null;
    const ts = env.paths.map(env.target).filter((t) => t && t.box);
    if (ts.length < 3) return null;
    const lo = axis === "x" ? "x" : "y", len = axis === "x" ? "width" : "height";
    const mid = (t) => t.box[lo] + t.box[len] / 2;
    const sorted = ts.slice().sort((a, b) => mid(a) - mid(b));
    const first = mid(sorted[0]), last = mid(sorted[sorted.length - 1]);
    const step = (last - first) / (sorted.length - 1);
    return sorted.map((t, i) => {
      const want = first + step * i;
      const dx = axis === "x" ? want - mid(t) : 0, dy = axis === "y" ? want - mid(t) : 0;
      return moveDeltas(t, dx, dy, { q: (v) => Math.round(v * 1e4) / 1e4 });   // see toolMove on 1e-4
    }).flat();
  }
})
)};

// ---- G23: the two verbs a path shape needs -------------------------------------------------------
// Deleting a *vertex* rather than an element. The finer selection is the one the key means: with
// vertices held (P7), Delete takes them and leaves the shape alone. Descending by ordinal, so each
// delete leaves the ordinals of the ones still queued exactly where they were.
const _sl258 = function _cmdDeleteVertex(gestureDelta,attrVal,parsePoints,parsePath,pathSegments,pathHandles,deletePoint,deletePathPoint){return(
{
  id: "delete-vertex", label: "Delete vertex", key: "Delete",
  plan(env) {
    const vs = (env.vertices || []).filter((v) => v.kind === "anchor");
    if (!vs.length) return null;
    const key = (q) => q.join("/");
    if (vs.some((v) => key(v.path) !== key(vs[0].path))) return null;   // one element at a time
    const path = vs[0].path;
    let idx;
    try { idx = env.index(path); } catch (e) { return null; }
    const ns = vs.map((v) => v.n).sort((a, b) => b - a);
    const pts = attrVal(env.src, idx, "points");
    if (pts !== null) {
      if (parsePoints(pts).length - ns.length < 2) return null;         // a polygon needs two
      return ns.map((n) => gestureDelta.command("deletePoint", (d) => deletePoint(d, path, n),
        { vertex: { kind: "vertex-delete", path, at: n } }));
    }
    const d0 = attrVal(env.src, idx, "d");
    if (d0 === null) return null;
    const segs = pathSegments(parsePath(d0));
    const hs = pathHandles(env.src, idx).filter((h) => h.kind === "anchor");
    const out = ns.map((n) => {
      const h = hs[n];
      if (!h) return null;
      // Same reading as the double-click: the anchor that goes is the one its segment terminates.
      const i = segs.findIndex((sg) => sg.ci === h.ci && sg.o === h.o);
      if (i < 0) return null;                                          // the M anchor ends no segment
      return gestureDelta.command("deletePathPoint", (d) => deletePathPoint(d, path, i),
        { vertex: { kind: "vertex-delete", path,
                    at: segs.slice(0, i + 1).filter((sg) => sg.kind !== "Z").length } });
    });
    return out.every(Boolean) ? out : null;
  }
}
)};

// Close a path, or open it again: one `Z`, on or off. Only `d` — a polyline is not a polygon with a
// flag, it is a different element, and swapping the tag is a different edit than this one claims to
// be. With several subpaths this closes the last, which is what the trailing `Z` means.
const _sl259 = function _cmdClosePath(gestureDelta,attrVal,attrTextLens,nodeAt){return(
(close) => ({
  id: close ? "close-path" : "open-path",
  label: close ? "Close path" : "Open path",
  key: null,
  plan(env) {
    const out = [];
    for (const p of env.paths) {
      let n;
      try { n = nodeAt(env.src, p); } catch (e) { return null; }
      const d = attrVal(env.src, n.index, "d");
      if (d === null) continue;                                        // not a path: nothing to close
      if (/[Zz]\s*$/.test(d) === close) continue;                      // already as asked (T1)
      const l = attrTextLens(n.index, "d");
      const next = close ? d.replace(/\s*$/, "") + " Z" : d.replace(/\s*[Zz]\s*$/, "");
      // No handle appears or disappears — `Z` takes no arguments — so no vertex op is owed.
      out.push(gestureDelta.command(close ? "closePath" : "openPath", (src) => l.put(next, src)));
    }
    return out.length ? out : null;
  }
})
)};

// ---- G21: smooth and corner anchors --------------------------------------------------------------
// Smoothness is *geometry*, not a stored flag: an anchor is smooth when its two control handles are
// collinear with it and point opposite ways. There is nowhere to keep a "corner that happens to look
// smooth" bit that would not be hidden state, and hidden state is the thing this editor does not
// have — so the drawing is asked, never a side table.
//
// The neighbourhood is read off the *handle order* rather than off the segment list, because that is
// what survives subpaths: pathHandles emits `c1 c2 anchor` per cubic, so the handle just before an
// anchor is its incoming one, and a handle followed by another handle is the next segment's
// outgoing one. An `M` anchor has no handle before it, which is exactly the right answer.
const _sl260 = function _pathSmooth(parsePath,printPath,pathHandles,pathSegments,attrVal,attrTextLens,nodeAt,replaceGroup){return(
(() => {
  const isC = (h) => h && h.kind === "ctrl";
  const ordAt = (hs, i) => hs.slice(0, i).filter((h) => h.kind === "anchor").length;
  const anchorIndex = (hs, n) => {
    let c = -1;
    for (let i = 0; i < hs.length; i++) if (hs[i].kind === "anchor" && ++c === n) return i;
    return -1;
  };
  const set = (cmds, h, x, y) => {
    const A = cmds[h.ci].a;
    if (h.ix >= 0) A[h.o + h.ix] = h.rel ? x - h.base[0] : x;
    if (h.iy >= 0) A[h.o + h.iy] = h.rel ? y - h.base[1] : y;
  };
  const around = (hs, n) => {
    const j = anchorIndex(hs, n);
    if (j < 0) return null;
    return { j, anchor: hs[j],
             inH: isC(hs[j - 1]) ? hs[j - 1] : null,
             outH: isC(hs[j + 1]) && isC(hs[j + 2]) ? hs[j + 1] : null,
             prev: hs.slice(0, j).filter((h) => h.kind === "anchor").pop() || null,
             next: hs.slice(j + 1).find((h) => h.kind === "anchor") || null };
  };
  const TOL = 0.02;
  const smooth = (hs, n) => {
    const a = around(hs, n);
    if (!a || !a.inH || !a.outH) return false;
    const v = [a.anchor.x - a.inH.x, a.anchor.y - a.inH.y];
    const w = [a.outH.x - a.anchor.x, a.outH.y - a.anchor.y];
    const mv = Math.hypot(v[0], v[1]), mw = Math.hypot(w[0], w[1]);
    if (mv < 1e-6 || mw < 1e-6) return false;            // a retracted handle is a corner
    return Math.abs(v[0] * w[1] - v[1] * w[0]) / (mv * mw) <= TOL && v[0] * w[0] + v[1] * w[1] > 0;
  };
  return {
    around, smooth,
    // Which anchor a dragged control belongs to, and on which side of it.
    roleOf(hs, key) {
      const i = hs.findIndex((h) => h.key === key);
      if (i < 0 || hs[i].kind !== "ctrl" || !hs[i + 1]) return null;
      if (hs[i + 1].kind === "anchor") return { n: ordAt(hs, i + 1), side: "in" };
      return hs[i - 1] && hs[i - 1].kind === "anchor" ? { n: ordAt(hs, i - 1), side: "out" } : null;
    },
    // Drag one handle of a smooth anchor and the other follows, mirrored, keeping its own length —
    // which is what makes the curve stay smooth while you shape it. Returns null when it does not
    // apply, and the caller falls back to moving the one handle it was told about.
    couple(src, idx, key, x, y) {
      let hs;
      try { hs = pathHandles(src, idx); } catch (e) { return null; }
      const r = this.roleOf(hs, key);
      if (!r || !smooth(hs, r.n)) return null;
      const a = around(hs, r.n);
      const moved = r.side === "in" ? a.inH : a.outH, other = r.side === "in" ? a.outH : a.inH;
      const len = Math.hypot(other.x - a.anchor.x, other.y - a.anchor.y);
      const v = [x - a.anchor.x, y - a.anchor.y], m = Math.hypot(v[0], v[1]);
      if (m < 1e-6) return null;                         // no direction to mirror
      const cmds = parsePath(attrVal(src, idx, "d"));
      set(cmds, moved, x, y);
      set(cmds, other, a.anchor.x - (v[0] / m) * len, a.anchor.y - (v[1] / m) * len);
      return printPath(cmds);
    },
    // A straight segment has no handles to be smooth with, so smoothing promotes it to the cubic that
    // draws the identical line — `C p0 p3 p3` renders as its own chord. One promotion at a time, with
    // a reparse between, because replacing a group inside a multi-group command renumbers the rest.
    promote(src, idx, n, side) {
      const hs = pathHandles(src, idx);
      const a = around(hs, n);
      if (!a) return null;
      const h = side === "in" ? hs[a.j] : a.next && hs[hs.indexOf(a.next)];
      if (!h) return null;
      const segs = pathSegments(parsePath(attrVal(src, idx, "d")));
      const seg = segs.find((sg) => sg.ci === h.ci && sg.o === h.o);
      if (!seg) return null;                             // an M anchor: there is no segment here
      if (seg.kind === "C") return src;                  // already a cubic
      if (seg.kind !== "L") return null;                 // Q, A and Z are not ours to rewrite
      const cmds = replaceGroup(parsePath(attrVal(src, idx, "d")), seg.ci, seg.o,
                                [{ c: "C", a: [...seg.p0, ...seg.p3, ...seg.p3] }]);
      return attrTextLens(idx, "d").put(printPath(cmds), src);
    },
    // The other direction: a cubic whose handles sit on its own endpoints *is* its chord, so once
    // both are retracted the `C` is spelled `L` again — which is what makes smooth-then-corner give
    // the author's original bytes back rather than a curve-shaped straight line.
    demote(src, idx, n, side) {
      const hs = pathHandles(src, idx);
      const a = around(hs, n);
      if (!a) return null;
      const h = side === "in" ? hs[a.j] : a.next;
      if (!h) return null;
      const seg = pathSegments(parsePath(attrVal(src, idx, "d")))
        .find((sg) => sg.ci === h.ci && sg.o === h.o);
      const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
      if (!seg || seg.kind !== "C" || !near(seg.p1, seg.p0) || !near(seg.p2, seg.p3)) return null;
      const cmds = replaceGroup(parsePath(attrVal(src, idx, "d")), seg.ci, seg.o,
                                [{ c: "L", a: [...seg.p3] }]);
      return attrTextLens(idx, "d").put(printPath(cmds), src);
    },
    // The toggle. Smooth becomes a corner by retracting both handles onto the anchor — the only
    // reading that is visible in the drawing, and therefore the only one this editor can mean.
    toggle(src, path, n) {
      let idx;
      try { idx = nodeAt(src, path).index; } catch (e) { return null; }
      let cur = src, hs;
      try { hs = pathHandles(cur, idx); } catch (e) { return null; }
      if (smooth(hs, n)) {
        const a = around(hs, n);
        const cmds = parsePath(attrVal(cur, idx, "d"));
        set(cmds, a.inH, a.anchor.x, a.anchor.y);
        set(cmds, a.outH, a.anchor.x, a.anchor.y);
        cur = attrTextLens(idx, "d").put(printPath(cmds), cur);
        for (const side of ["out", "in"]) {              // outgoing first: it is the later command
          const next = this.demote(cur, idx, n, side);
          if (next !== null) cur = next;
        }
        return cur;
      }
      for (const side of ["out", "in"]) {                // outgoing first: it is the later command
        const next = this.promote(cur, idx, n, side);
        if (next === null) return null;
        cur = next;
      }
      hs = pathHandles(cur, idx);
      const a = around(hs, n);
      if (!a || !a.inH || !a.outH || !a.prev || !a.next) return null;
      const d = [a.next.x - a.prev.x, a.next.y - a.prev.y];
      const m = Math.hypot(d[0], d[1]);
      if (m < 1e-6) return null;
      const u = [d[0] / m, d[1] / m];
      const len = (h, fall) => {
        const l = Math.hypot(h.x - a.anchor.x, h.y - a.anchor.y);
        return l > 1e-6 ? l : Math.hypot(fall.x - a.anchor.x, fall.y - a.anchor.y) / 3;
      };
      const li = len(a.inH, a.prev), lo = len(a.outH, a.next);
      const cmds = parsePath(attrVal(cur, idx, "d"));
      set(cmds, a.inH, a.anchor.x - u[0] * li, a.anchor.y - u[1] * li);
      set(cmds, a.outH, a.anchor.x + u[0] * lo, a.anchor.y + u[1] * lo);
      return attrTextLens(idx, "d").put(printPath(cmds), cur);
    }
  };
})()
)};

// ---- G47: change a segment's type ----------------------------------------------------------------
// The kind an author drew (L / C / Q / A) used to be the kind they were stuck with. This is the
// conversion registry that makes the kind editable: an entry per ordered `(from, to)` pair it knows
// how to rewrite, each returning the replacement command group *or null* when the conversion would
// have to guess. Every entry here is shape-preserving — `L↔C` is byte-exact, `C↔Q` is exact in the
// direction that loses nothing and declines the other (the same "decline rather than guess" `demote`
// uses), and `A→C` reproduces the arc within a sub-pixel tolerance (a cubic cannot draw a circular
// arc *exactly* — the (4/3)·tan(θ/4) approximation is the standard every renderer uses — so this
// entry is honestly an approximation, deliberately one-way, and is the explicit conversion arcs need
// before their interior can be edited at all). `pathConvert` only rewrites `d`; addressing, undo and
// the write path stay `commitDelta`'s.
const _sl265 = function _pathConvert(pathSegments,replaceGroup,absoluteGroup){return(
(() => {
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
  // The quadratic a cubic came from, if it came from one: degree-elevating `Q c` gives controls at
  // the ⅔ points, so a cubic is a raised quadratic exactly when both recovered controls agree.
  const quadOf = (s) => {
    const c1 = [s.p0[0] + 1.5 * (s.p1[0] - s.p0[0]), s.p0[1] + 1.5 * (s.p1[1] - s.p0[1])];
    const c2 = [s.p3[0] + 1.5 * (s.p2[0] - s.p3[0]), s.p3[1] + 1.5 * (s.p2[1] - s.p3[1])];
    return near(c1, c2) ? c1 : null;
  };
  // Endpoint→centre arc parameterisation (SVG F.6.5/F.6.6), split into ≤90° cubics (F.6.4-style
  // magic constant). The last endpoint is pinned to `p3` so the join is bit-for-bit the arc's own end.
  const arcToCubics = (s) => {
    let [rx, ry, phiDeg, fa, fs] = s.args;
    const [x1, y1] = s.p0, [x2, y2] = s.p3;
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (rx < 1e-9 || ry < 1e-9 || near(s.p0, s.p3)) return [{ c: "L", a: [x2, y2] }];
    const phi = (phiDeg * Math.PI) / 180, cosp = Math.cos(phi), sinp = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cosp * dx + sinp * dy, y1p = -sinp * dx + cosp * dy;
    let lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { const k = Math.sqrt(lam); rx *= k; ry *= k; }
    const sign = fa !== fs ? 1 : -1;
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = sign * Math.sqrt(Math.max(0, num / den));
    const cxp = (co * (rx * y1p)) / ry, cyp = (co * -(ry * x1p)) / rx;
    const cx = cosp * cxp - sinp * cyp + (x1 + x2) / 2;
    const cy = sinp * cxp + cosp * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => {
      const d = ux * vx + uy * vy, l = Math.hypot(ux, uy) * Math.hypot(vx, vy);
      let a = Math.acos(Math.min(1, Math.max(-1, d / l)));
      return ux * vy - uy * vx < 0 ? -a : a;
    };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI;
    if (fs && dt < 0) dt += 2 * Math.PI;
    const nseg = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
    const delta = dt / nseg, tc = (4 / 3) * Math.tan(delta / 4);
    const pt = (t) => [cx + rx * Math.cos(t) * cosp - ry * Math.sin(t) * sinp,
                       cy + rx * Math.cos(t) * sinp + ry * Math.sin(t) * cosp];
    const der = (t) => [-rx * Math.sin(t) * cosp - ry * Math.cos(t) * sinp,
                        -rx * Math.sin(t) * sinp + ry * Math.cos(t) * cosp];
    const out = [];
    let th = t1;
    for (let i = 0; i < nseg; i++) {
      const a = pt(th), da = der(th), b = pt(th + delta), db = der(th + delta);
      out.push({ c: "C", a: [a[0] + tc * da[0], a[1] + tc * da[1],
                             b[0] - tc * db[0], b[1] - tc * db[1], b[0], b[1]] });
      th += delta;
    }
    const last = out[out.length - 1].a;
    last[4] = x2; last[5] = y2;                            // pin the endpoint exactly
    return out;
  };
  const registry = {
    "L>C": (s) => [{ c: "C", a: [...s.p0, ...s.p3, ...s.p3] }],
    "C>L": (s) => (near(s.p1, s.p0) && near(s.p2, s.p3)) ? [{ c: "L", a: [...s.p3] }] : null,
    "Q>C": (s) => [{ c: "C", a: [s.p0[0] + (2 / 3) * (s.p1[0] - s.p0[0]), s.p0[1] + (2 / 3) * (s.p1[1] - s.p0[1]),
                               s.p3[0] + (2 / 3) * (s.p1[0] - s.p3[0]), s.p3[1] + (2 / 3) * (s.p1[1] - s.p3[1]),
                               ...s.p3] }],
    "C>Q": (s) => { const c = quadOf(s); return c ? [{ c: "Q", a: [...c, ...s.p3] }] : null; },
    "A>C": (s) => arcToCubics(s)
  };
  // Splice `repl` in for segment `segIndex`. A following smooth command (S/T) reflects off this
  // segment's controls, so it is made absolute first, exactly as `splitPathSegment` does — otherwise
  // the reflection base moves out from under it.
  const apply = (cmds, segs, segIndex, repl) => {
    const seg = segs[segIndex], next = segs[segIndex + 1];
    let out = cmds.map((c) => ({ c: c.c, a: c.a.slice() }));
    if (next && /^[STst]$/.test(next.letter)) out = absoluteGroup(out, next);
    return replaceGroup(out, seg.ci, seg.o, repl);
  };
  return {
    // What this segment can become, given its current kind — used to grey out a menu item.
    targets: (seg) => Object.keys(registry).filter((k) => k.startsWith(seg.kind + ">")).map((k) => k.slice(2)),
    // Rewrite segment `segIndex` to kind `to`, or null if the registry declines. Lossless: `C>L` only
    // fires on a cubic already straight, `C>Q` only on one that is a raised quadratic. For the lossy
    // "flatten a curve into a line" a user means by *straighten*, see `straighten`.
    convert(cmds, segIndex, to) {
      const segs = pathSegments(cmds);
      const seg = segs[segIndex];
      if (!seg) return null;
      const fn = registry[seg.kind + ">" + to];
      if (!fn) return null;
      const repl = fn(seg);
      if (!repl) return null;
      return apply(cmds, segs, segIndex, repl);
    },
    // Flatten a curved segment (C/Q/A) into a straight `L` to its own endpoint, dropping the controls.
    // Lossy — it destroys the curve — which is what "straighten" means, unlike `convert`'s `C>L`. A
    // line or a move/close has nothing to straighten, so it declines (T8), which greys the menu item.
    straighten(cmds, segIndex) {
      const segs = pathSegments(cmds);
      const seg = segs[segIndex];
      if (!seg || (seg.kind !== "C" && seg.kind !== "Q" && seg.kind !== "A")) return null;
      return apply(cmds, segs, segIndex, [{ c: "L", a: [...seg.p3] }]);
    }
  };
})()
)};

// The toggle as a command rather than as a double-click: double-clicking an anchor already means
// *delete this vertex*, and that is tested behaviour. One held vertex, because "toggle" needs
// something to be the opposite of.
const _sl261 = function _cmdToggleSmooth(gestureDelta,pathSmooth,pathHandles,nodeAt){return(
{
  id: "toggle-smooth", label: "Smooth / corner", key: null,
  plan(env) {
    const vs = (env.vertices || []).filter((v) => v.kind === "anchor");
    if (vs.length !== 1) return null;
    const { path, n } = vs[0];
    if (pathSmooth.toggle(env.src, path, n) === null) return null;   // ask once, T8
    return gestureDelta.command("toggleSmooth", (src) => {
      const next = pathSmooth.toggle(src, path, n);
      return next === null ? src : next;
    });
  }
}
)};

// G47. The convert verb as commands, one per target kind, over whatever anchors are held (P7). The
// segment an anchor governs is the one it terminates — the same reading `delete-vertex` uses — and a
// held set is converted highest-index-first so an `A→C` expansion above never shifts the segments
// below it. Each item is live only where its rewrite accepts (asked once, T8): "Straighten segment"
// (`L`) flattens any curve to a line, so it lights up on any C/Q/A and greys on a segment already
// straight; "to bézier"/"to quadratic" are the lossless kind-changes and light up where those hold.
// These are the discoverable face of the conversion registry until the S9 affordance panel exists;
// today they surface through the context menu (G8).
const _sl266 = function _cmdConvertSegment(gestureDelta,attrVal,parsePath,printPath,pathSegments,pathHandles,attrTextLens,nodeAt,pathConvert){return(
(to) => ({
  id: "convert-to-" + { L: "line", C: "curve", Q: "quad" }[to],
  label: { L: "Straighten segment", C: "Segment to bézier", Q: "Segment to quadratic" }[to],
  key: null,
  plan(env) {
    const vs = (env.vertices || []).filter((v) => v.kind === "anchor");
    if (!vs.length) return null;
    const key = (q) => q.join("/");
    if (vs.some((v) => key(v.path) !== key(vs[0].path))) return null;   // one element at a time
    const path = vs[0].path;
    let idx;
    try { idx = env.index(path); } catch (e) { return null; }
    const d0 = attrVal(env.src, idx, "d");
    if (d0 === null) return null;
    const segs = pathSegments(parsePath(d0));
    const hs = pathHandles(env.src, idx).filter((h) => h.kind === "anchor");
    const sis = vs.map((v) => {
      const h = hs[v.n];
      return h ? segs.findIndex((sg) => sg.ci === h.ci && sg.o === h.o) : -1;
    }).filter((i) => i >= 0).sort((a, b) => b - a);
    // `L` means *straighten* — flatten the curve into a line (lossy). `C`/`Q` are the lossless
    // kind-changes. Both plan through the same held-anchor scaffold; only the per-segment rewrite differs.
    const rewrite = to === "L"
      ? (cmds, si) => pathConvert.straighten(cmds, si)
      : (cmds, si) => pathConvert.convert(cmds, si, to);
    const out = [];
    for (const si of sis) {
      if (rewrite(parsePath(d0), si) === null) continue;                 // declines here, T8
      out.push(gestureDelta.command("convertSegment", (src) => {
        let j;
        try { j = nodeAt(src, path).index; } catch (e) { return src; }
        const next = rewrite(parsePath(attrVal(src, j, "d")), si);
        return next === null ? src : attrTextLens(j, "d").put(printPath(next), src);
      }));
    }
    return out.length ? out : null;
  }
})
)};

// G7. Selection is not a source edit (T9), so these plan a `select` delta rather than a `command`
// one — the same delta a tool emits on a click. "Same" is judged among the current scope's own
// children, which is the working level; a `same-fill` includes the primary itself, so it is
// idempotent. Each declines (T1/T8) when it would change nothing: select-none with an empty
// selection, select-all with nothing to select, "same" with no primary.
const _sl264 = function _cmdSelect(gestureDelta,nodeAt){return(
(kind) => ({
  id: { all: "select-all", none: "select-none", "same-fill": "select-same-fill", "same-tag": "select-same-tag" }[kind],
  label: { all: "Select all", none: "Select none", "same-fill": "Select same fill", "same-tag": "Select same tag" }[kind],
  key: kind === "all" ? "Mod-a" : null,
  plan(env) {
    if (kind === "none") return env.paths.length ? gestureDelta.select([]) : null;
    let container;
    try { container = nodeAt(env.src, env.scope); } catch (e) { return null; }
    const kids = container.children || [];
    if (!kids.length) return null;
    if (kind === "all") return gestureDelta.select(kids.map((c) => c.path));
    if (!env.paths.length) return null;
    let primary;
    try { primary = nodeAt(env.src, env.paths[0]); } catch (e) { return null; }
    const fill = (n) => (n.attrs && n.attrs.fill ? n.attrs.fill.value : null);
    const match = kind === "same-tag" ? (n) => n.tag === primary.tag : (n) => fill(n) === fill(primary);
    const paths = kids.filter(match).map((c) => c.path);
    return paths.length ? gestureDelta.select(paths) : null;
  }
})
)};

// S10/G35. Mint a linearGradient into <defs> and point the selected shape's fill at it. The shape's
// current fill becomes the first stop (its notation preserved), white the second — a starting point
// you then edit by selecting a <stop> like any other element, which is the whole point of defs living
// in the same tree. One shape, because "point *this* fill at a new gradient" names one referrer; a
// pasted copy of the shape carries the url and `freshenIds` renames the gradient with it, so the copy
// gets its own — S10's paste-collision falsifier holds through the existing codec, not a special case.
const _sl300 = function _defsCommand(gestureDelta,nodeAt,attrVal,setProperty,attrTextLens,mintId,defsInsert){return(
(spec) => ({
  // Factory for commands that add a <defs> entry and point one attribute at it via url(#id).
  // spec: { id, label, key, tags, sourceAttr, targetAttr, prefix, markup(id, cur) }
  id: spec.id, label: spec.label, key: spec.key,
  plan(env) {
    if (env.paths.length !== 1) return null;
    const path = env.paths[0];
    let n; try { n = nodeAt(env.src, path); } catch (e) { return null; }
    if (!spec.tags.includes(n.tag)) return null;
    const cur = attrVal(env.src, n.index, spec.sourceAttr);
    return gestureDelta.command(spec.id, (src) => {
      const idx = nodeAt(src, path).index;
      const id = mintId(src, spec.prefix);
      const w = setProperty(src, idx, spec.targetAttr, `url(#${id})`);
      return defsInsert(attrTextLens(idx, w.name).put(w.value, src), spec.markup(id, cur));
    }, { rebase: null, select: () => [path] });
  }
})
)};

const _sl277 = function _cmdAddGradient(defsCommand){return(
defsCommand({
  id: "add-gradient", label: "Add gradient", key: null,
  tags: ["rect", "circle", "ellipse", "polygon", "path", "line", "polyline", "text"],
  sourceAttr: "fill", targetAttr: "fill", prefix: "grad",
  markup(id, cur) {
    const base = cur && !/^\s*url\(/.test(cur) && cur !== "none" ? cur : "#888888";
    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
         + `<stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>`;
  }
})
)};

// S10/G36. The same move for a marker: mint an arrowhead into <defs> and point `marker-end` at it,
// coloured by the shape's stroke. Markers attach to the stroked path tags. Everything else — the
// non-colliding id, the untouched addresses, the paste rename — is shared with the gradient command.
const _sl278 = function _cmdAddMarker(defsCommand){return(
defsCommand({
  id: "add-marker", label: "Add arrowhead", key: null,
  tags: ["path", "line", "polyline", "polygon"],
  sourceAttr: "stroke", targetAttr: "marker-end", prefix: "arrow",
  markup(id, cur) {
    const color = cur && !/^\s*url\(/.test(cur) && cur !== "none" ? cur : "#333333";
    return `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`
         + `<path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`;
  }
})
)};

// G4. Add or remove a gradient stop — the follow-through `cmdAddGradient` was missing (§9.4). Both are
// ordinary structural puts on the gradient's children (the same `insertElement`/`deleteElement` the
// shape verbs use), so the laws cover them; neither is a new write path. `add` places a stop at the
// midpoint of the largest offset gap, colour copied from the stop on its left, so one click widens the
// palette predictably. `delete` declines (T8) below two stops, the minimum a gradient needs. The
// selection may be the gradient itself (the inspector's + selects it first) or one of its stops.
// Reorder is deliberately not a command: stops paint in document order, and retyping a stop's `offset`
// past a neighbour is the ordering the author sees — a separate move verb would be a second way to say it.
const _sl302 = function _cmdStop(gestureDelta,nodeAt,insertElement,deleteElement){return(
(kind) => ({
  id: kind === "add" ? "add-stop" : "delete-stop",
  label: kind === "add" ? "Add stop" : "Delete stop",
  key: null,
  plan(env) {
    if (!env.paths.length) return null;
    const path = env.paths[0];
    const isGrad = (tag) => tag === "linearGradient" || tag === "radialGradient";
    const parseOff = (v) => {
      const s = v == null ? "" : String(v).trim();
      const n = s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    };
    let n;
    try { n = nodeAt(env.src, path); } catch (e) { return null; }
    if (kind === "delete") {
      if (n.tag !== "stop") return null;
      const gp = path.slice(0, -1);
      let g; try { g = nodeAt(env.src, gp); } catch (e) { return null; }
      if (!isGrad(g.tag)) return null;
      const count = (g.children || []).filter((c) => c.tag === "stop").length;
      if (count <= 2) return null;                              // a gradient needs >= 2 stops (T8)
      return gestureDelta.command("delete-stop", (src) => deleteElement(src, path),
        { rebase: null, select: () => [gp] });
    }
    // add: resolve the selection to a gradient — the element itself, or the parent of a selected stop.
    let gp, g;
    if (isGrad(n.tag)) { gp = path; g = n; }
    else if (n.tag === "stop") { gp = path.slice(0, -1); try { g = nodeAt(env.src, gp); } catch (e) { return null; } if (!isGrad(g.tag)) return null; }
    else return null;
    const kids = g.children || [];
    const stops = kids.map((c, i) => ({
      i, num: parseOff(c.attrs && c.attrs.offset && c.attrs.offset.value),
      color: c.attrs && c.attrs["stop-color"] ? c.attrs["stop-color"].value : "#888888",
      isStop: c.tag === "stop"
    })).filter((s) => s.isStop);
    const round = (x) => Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000;
    let at, off, color;
    if (!stops.length) { at = kids.length; off = 0; color = "#888888"; }
    else if (stops.length === 1) {
      const o = stops[0];
      if (o.num <= 0.5) { off = 1; at = o.i + 1; } else { off = 0; at = o.i; }
      color = o.color;
    } else {
      let best = 0, bestGap = -Infinity;
      for (let k = 0; k < stops.length - 1; k++) {
        const gap = stops[k + 1].num - stops[k].num;
        if (gap > bestGap) { bestGap = gap; best = k; }
      }
      off = (stops[best].num + stops[best + 1].num) / 2;
      at = stops[best + 1].i;
      color = stops[best].color;
    }
    const markup = `<stop offset="${round(off)}" stop-color="${color}"/>`;
    return gestureDelta.command("add-stop", (src) => insertElement(src, gp, at, markup),
      { rebase: null, select: () => [gp.concat([at])] });   // land on the new stop, ready to recolour
  }
})
)};

// G6. The gradient axis as data: where its handles sit (in the gradient's own units, for the caller
// to map onto the referring shape's box) and, inverted, which attributes a dragged handle writes.
// Pure — no DOM — so the geometry is a law, and the interactive part in `svgLens` is only the mapping
// through `ctx` (P5) and the commit through `setProperty` (the one write path). A percentage parses to
// its fraction; a linear gradient has two endpoint handles, a radial one a centre and a radius handle.
const _sl304 = function _gradientGizmo(){return(
(() => {
  const num = (v, d) => {
    const s = v == null ? "" : String(v).trim();
    const n = s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
    return Number.isFinite(n) ? n : d;
  };
  return {
    handles: (tag, attrs) => {
      if (tag === "radialGradient") {
        const cx = num(attrs.cx, 0.5), cy = num(attrs.cy, 0.5), r = num(attrs.r, 0.5);
        return [{ key: "c", x: cx, y: cy }, { key: "r", x: cx + r, y: cy }];
      }
      return [{ key: "p1", x: num(attrs.x1, 0), y: num(attrs.y1, 0) },
              { key: "p2", x: num(attrs.x2, 1), y: num(attrs.y2, 0) }];
    },
    // The dragged handle lands at (fx, fy) in the gradient's units — which attributes that is.
    writeFor: (tag, attrs, key, fx, fy) => {
      if (tag === "radialGradient") {
        if (key === "c") return [{ prop: "cx", num: fx }, { prop: "cy", num: fy }];
        const cx = num(attrs.cx, 0.5), cy = num(attrs.cy, 0.5);
        return [{ prop: "r", num: Math.hypot(fx - cx, fy - cy) }];
      }
      return key === "p1" ? [{ prop: "x1", num: fx }, { prop: "y1", num: fy }]
                          : [{ prop: "x2", num: fx }, { prop: "y2", num: fy }];
    }
  };
})()
)};

const _sl250 = function _svgCommands(cmdGroup,cmdUngroup,cmdDuplicate,cmdCopy,cmdCut,cmdPaste,cmdAlign,cmdDistribute,alignSpecs,cmdDeleteVertex,cmdClosePath,cmdToggleSmooth,cmdSelect,cmdConvertSegment,cmdAddGradient,cmdAddMarker,cmdStop){return(
[
  // A plain array, not an `Inputs.input`, for the same reason `svgShapes` is: pure code plans a command
  // and the laws exercise that headless, where there is no DOM to hold a view.
  cmdGroup, cmdUngroup, cmdDuplicate, cmdCopy, cmdCut, cmdPaste(false), cmdPaste(true)]
  .concat(alignSpecs.map(cmdAlign))
  .concat([cmdDistribute("x"), cmdDistribute("y"),
           cmdDeleteVertex, cmdClosePath(true), cmdClosePath(false), cmdToggleSmooth])
  .concat(["all", "none", "same-fill", "same-tag"].map(cmdSelect))
  .concat(["L", "C", "Q"].map(cmdConvertSegment))
  .concat([cmdAddGradient, cmdAddMarker, cmdStop("add"), cmdStop("delete")])
)};

// Look one up, and answer "what does this keystroke mean" in one place. The binding is a
// *declaration* — the registry says what a command would like to be called by; whether a callsite
// honours it is the callsite's business, exactly as it is for the tool shortcuts.
const _sl249 = function _commandLookup(){return(
{
  byId: (cmds, id) => cmds.find((c) => c.id === id) || null,
  forEvent: (cmds, e) => {
    const mod = e.metaKey || e.ctrlKey, shift = e.shiftKey, alt = e.altKey;
    const k = (e.key || "").toLowerCase();
    return cmds.find((c) => {
      if (!c.key) return false;
      const parts = c.key.split("-");
      const want = parts[parts.length - 1].toLowerCase();
      return want === k && parts.includes("Mod") === !!mod
          && parts.includes("Shift") === !!shift && parts.includes("Alt") === !!alt;
    }) || null;
  }
}
)};

// ---- the affordance registry (S9) -----------------------------------------------------------------
// G38. What a selection *offers* was one hard-coded function (`svgFocus.paint`), identical for every
// tag. This makes it a registry, the same move S2 made for geometry handles and S4 for verbs: an
// affordance is a chip drawn on the selection that, when tapped or dragged, writes through the one
// path (`commitDelta` / `node.setField` / `node.command`) — so it owes the same laws and adds a
// surface, not a write path. A provider is:
//   { id, applies(a), declines?(a), glyph(a)→{symbol,fill}, cursor?,
//     command? | tap?(ctx,a) | drag?{grab(a), preview(ctx,a,base,dux,duy), commit(ctx,a,base,dux,duy)} }
// `tap`/`commit` get `ctx`, not a node — each write remounts the drawing, so they re-read `ctx.node`.
// `a` is the read context (`ctx.affContext()`), the affordance's `env`: pure data plus the same
// measured questions a command gets. A `command`-backed chip declines exactly when the command does
// (`a.canDo(id)` is `canCommand`), so a chip that would do nothing is not drawn (G41 = T8 at the
// surface). A shared chip writes to *every* selected element (G40 = the align commands' fan-out).
const _sl272 = function _svgAffordances(gestureDelta,previewDelta,setProperty,nodeAt){return(
(() => {
  const isPath = (a) => a.tag === "path" && a.paths.length === 1;
  const baseWidth = (v) => (v === "" ? 1 : (parseFloat(v) || 0));   // absent stroke-width renders as 1
  return [
    // Duplicate: already fans out inside its command, so the chip is just a surface for it.
    { id: "duplicate", command: "duplicate", cursor: "pointer",
      applies: (a) => a.paths.length >= 1,
      glyph: () => ({ symbol: "⧉", fill: "#EDF1E8" }), title: "Duplicate" },

    // G33 swap: exchange fill and stroke, on every selected element (G40). Applies only where the
    // swap is lossless — both are set on all of them — so it never has to clear a paint to "".
    { id: "swap-paint", cursor: "pointer",
      applies: (a) => a.paths.length >= 1 && a.paths.every((p) => {
        const f = a.fieldOf(p, "fill"), s = a.fieldOf(p, "stroke");
        return f && s && f !== "none" && s !== "none";
      }),
      glyph: (a) => ({ symbol: "⇄", fill: a.field("fill") || "#fff" }),
      // `a` was measured before any write, so `f`/`s` are the originals; each `setField` commit remounts
      // the drawing, so the node is re-read from `ctx` every write (the toolMove multi-element pattern) —
      // a captured node goes stale after the first commit and the rest silently no-op.
      tap: async (ctx, a) => {
        for (const p of a.paths) {
          const f = a.fieldOf(p, "fill"), s = a.fieldOf(p, "stroke");
          await ctx.node.setField(p, "fill", s);
          await ctx.node.setField(p, "stroke", f);
        }
      }, title: "Swap fill and stroke" },

    // G30 the canvas gesture: a grip whose horizontal drag is a stroke width in *user* units (screen
    // pixels ÷ the root's zoom, so it is zoom-invariant, T11). Fans out to the whole selection (G40),
    // previewing live and committing through `setField` (the byte-identical, T1 write path).
    { id: "stroke-grip", cursor: "ew-resize",
      applies: (a) => a.paths.length >= 1,
      glyph: () => ({ symbol: "≡", fill: "#fff" }),
      drag: {
        grab: (a) => { const b = {}; for (const p of a.paths) b[p.join("/")] = baseWidth(a.fieldOf(p, "stroke-width")); return b; },
        preview: (ctx, a, base, dux) => {
          const doc = ctx.doc(); if (doc === null) return;
          const ds = [];
          for (const p of a.paths) {
            const idx = a.indexOf(p); if (idx === null) continue;
            const nw = Math.max(0, +(base[p.join("/")] + dux).toFixed(2));
            const w = setProperty(doc, idx, "stroke-width", String(nw));
            ds.push(gestureDelta.attr(idx, w.name, w.value));
          }
          if (ds.length) previewDelta(ctx, ds);
        },
        commit: async (ctx, a, base, dux) => {
          for (const p of a.paths) {          // re-read the node each write: a commit remounts the drawing
            const nw = Math.max(0, +(base[p.join("/")] + dux).toFixed(2));
            await ctx.node.setField(p, "stroke-width", String(nw));
          }
        }
      }, title: "Stroke width (drag)" },

    // G39: path verbs that already exist as commands, surfaced on the shape. Each declines through its
    // command — close-path greys once closed, open-path once open, smooth/corner unless one anchor is
    // held — so the registry, not a branch, decides what a path offers right now.
    { id: "close-path", command: "close-path", cursor: "pointer", applies: isPath,
      glyph: () => ({ symbol: "⊚", fill: "#fff" }), title: "Close path" },
    { id: "open-path", command: "open-path", cursor: "pointer", applies: isPath,
      glyph: () => ({ symbol: "◠", fill: "#fff" }), title: "Open path" },
    { id: "toggle-smooth", command: "toggle-smooth", cursor: "pointer", applies: isPath,
      glyph: () => ({ symbol: "∿", fill: "#fff" }), title: "Smooth / corner" },

    // S10/G35-G36: mint a defs target and point at it. Command-backed, so each declines exactly when
    // its command's plan does (`a.canDo`) — the gradient chip greys unless one paintable shape is
    // selected, the arrowhead chip unless one stroked path is. Applies gates cheaply on the tag so the
    // chip is only *considered* for the right shapes; canDo makes the final call (G41 = T8).
    { id: "add-gradient", command: "add-gradient", cursor: "pointer",
      applies: (a) => a.paths.length === 1,
      glyph: () => ({ symbol: "◑", fill: "#fff" }), title: "Add gradient" },
    { id: "add-marker", command: "add-marker", cursor: "pointer",
      applies: (a) => a.paths.length === 1,
      glyph: () => ({ symbol: "➤", fill: "#fff" }), title: "Add arrowhead" }
  ];
})()
)};

// The tool that dispatches an affordance press. It is first in the registry but claims *only* a press
// on a chip (`e.target.dataset.aff`), and falls through otherwise — the empty-space lesson from G22:
// a tool that grabs more than the mark it owns swallows every ordinary select/move. A tap runs its
// command or `tap`; a grip runs a `drag` loop that previews per frame and commits on release.
const _sl273 = function _toolAffordance(grabPointer,previewDelta,gestureDelta,revertDelta){return(
{
  id: "affordance",
  onPointerDown(ctx, e) {
    const id = e.target && e.target.dataset && e.target.dataset.aff;
    if (!id) return false;
    const p = (ctx.affordances || []).find((q) => q.id === id);
    if (!p) return false;
    const a = ctx.affContext();
    if (!a) return false;
    e.preventDefault();
    if (p.drag) {
      grabPointer(ctx.node, e);
      ctx.state.aff = { prov: p, a, base: p.drag.grab(a), x0: e.clientX, y0: e.clientY, started: false };
      return true;
    }
    if (p.command) ctx.node.command(p.command);
    else if (p.tap) p.tap(ctx, a);              // ctx, not ctx.node: tap re-reads the live node per write
    return true;
  },
  onPointerMove(ctx, e) {
    const g = ctx.state.aff;
    if (!g || !g.prov.drag) return;
    if (!g.started && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 3) return;
    g.started = true;
    const s = g.a.scale || 1;
    g.prov.drag.preview(ctx, g.a, g.base, (e.clientX - g.x0) / s, (e.clientY - g.y0) / s);
  },
  async onPointerUp(ctx, e) {
    const g = ctx.state.aff;
    if (!g) return;
    ctx.state.aff = null;
    if (!g.prov.drag || !g.started) return;
    const s = g.a.scale || 1;
    await g.prov.drag.commit(ctx, g.a, g.base, (e.clientX - g.x0) / s, (e.clientY - g.y0) / s);
  },
  onCancel(ctx) {
    if (!ctx.state.aff) return false;
    ctx.state.aff = null;
    previewDelta(ctx, gestureDelta.view([], { key: "readout" }));
    revertDelta(ctx, []);
    return true;
  }
}
)};

// ---- svgLens: wiring only ------------------------------------------------------------------------
// ---- state that outlives a recompute ------------------------------------------------------------
// A commit re-runs the cell, so the SVG element is replaced. Undo history, the selection and the
// active tool are properties of the document being edited, not of the element currently projecting
// it, so they cannot live in the node's closure. Keyed by the Variable, which `define` mutates in
// place and therefore survives. This cell has no inputs: nothing can invalidate it.
const _sl113s = function _lensState(){return(
new Map()
)};

const _sl114 = function _svgLens(lensState,svgTarget,svgWriter,svgOverlay,svgFocus,svgTools,svgShapes,svgCommands,svgFields,svgAffordances,commandLookup,copyMarkup,moveTargetOf,commitDelta,rebaseVertex,invert,applyPoint,ctmMat,insertElement,deleteElement,reorderElement,rebasePath,childrenLens,zTarget,attrVal,effectiveAttr,translateLens,nodeAt,setProperty,refsOf,boxInRoot,hitTest,scopedPath,pathOfIndex,parseViewBox,printViewBox,gradientGizmo,attrTextLens)
{
  // Which instance is projecting which node. Read by the facade below to route a tool's calls to the
  // node that is the cell's value now, rather than the one its gesture started on.
  const ctxByNode = new WeakMap();
  // One clipboard for every drawing on the page, because copying out of one and pasting into another
  // is the whole point of the payload being source text. The system clipboard is written too, best
  // effort — it is permission-gated and asynchronous, so it can be a *copy* of the truth but not the
  // truth itself, and a paste that had to wait on a permission prompt would not be a paste.
  const clip = { markups: [] };
  return function svgLens(node, options = {}) {
    // The installed tools, taken at the callsite. An array pins this drawing to exactly that set —
    // which is how a test runs one tool in isolation, and how a figure shows a reduced editor — and a
    // function receives the defaults, so extending does not mean restating them. Omitted, it is the
    // ambient registry, so the plugin bus still works and today's behaviour is unchanged.
    const tools = typeof options.tools === "function" ? options.tools(svgTools)
                : options.tools || svgTools;
    // Same contract for which tags have editable geometry (design note S2).
    const shapes = typeof options.shapes === "function" ? options.shapes(svgShapes)
                 : options.shapes || svgShapes;
    // ...and which verbs the selection has (design note S4).
    const commands = typeof options.commands === "function" ? options.commands(svgCommands)
                   : options.commands || svgCommands;
    const clipboard = {
      read: () => clip.markups.slice(),
      write: (markups) => {
        clip.markups = markups.slice();
        try { navigator.clipboard.writeText(markups.join("\n")).catch(() => {}); } catch (e) { /* no permission, no matter */ }
      }
    };
    const grid = options.grid === undefined ? 0.5 : options.grid;
    const snap = (v) => (grid ? Math.round(v / grid) * grid : v);
    // Markup for a shape dropped on empty canvas. UX policy, not geometry, so it is overridable.
    const newShape = options.newShape || ((x, y) => {
      const r = options.newShapeSize === undefined ? 24 : options.newShapeSize;
      const pts = [[x - r, y + r], [x, y - r], [x + r, y + r]].map(([a, b]) => `${a},${b}`).join(" ");
      return `<polygon points="${pts}" fill="#5B7A5E"/>`;
    });

    const overlay = svgOverlay(node);
    const target = svgTarget(node, { marker: svgLens, isOwn: overlay.isOwn });
    const writer = svgWriter(node, target);
    // Lazily, because `target.variable()` matches on `_value === node` and the runtime has not
    // assigned this cell's value yet — we are still inside the definition that produces it. Both are
    // cached once found: after a commit this node is no longer the variable's value, so `variable()`
    // stops resolving, but a gesture that started here still has to reach the document's shared
    // state — and `define` mutates the Variable in place, so the cached one keeps pointing at
    // whichever node is current.
    let shared = null, myVar = null;
    const stateOf = () => {
      if (shared) return shared;
      const v = target.variable();
      if (!v) return null;
      myVar = v;
      let s = lensState.get(v);
      if (!s) lensState.set(v, s = { undo: [], redo: [], paths: null, verts: [], mode: "replace", tool: null,
                                     gesture: {}, scope: null, view: null });
      return (shared = s);
    };
    const focus = svgFocus(overlay, target, () => {
      const s = stateOf();
      if (s) { s.paths = focus.paths.slice(); s.mode = focus.mode; s.verts = focus.vertices; }
      node.dispatchEvent(new CustomEvent("lens-select", { detail: { paths: focus.paths, mode: focus.mode } }));
    }, shapes);
    node.style.touchAction = "none";

    // Which container the pointer is working inside. `[0]` is the drawing itself; entering a group
    // pushes its path. It lives in the shared state for the same reason the tool does — a commit
    // mints a new node, and being inside a group must survive that.
    let localScope = [0];
    const setScope = (p) => {
      localScope = p;
      const st = stateOf();
      if (st) st.scope = p;
      return p;
    };
    const scopeNow = () => {
      const st = stateOf();
      const sc = (st && st.scope) || localScope;
      if (!sc || !sc.length) return setScope([0]);
      const d = target.doc();
      if (d === null) return sc;
      try { nodeAt(d, sc); } catch (err) { return setScope([0]); }   // its group is gone
      return sc;
    };
    // Leaving a group. Offered before "leave this mode" at the callsite, after cancelling a gesture.
    node.ascendScope = () => {
      const sc = scopeNow();
      if (sc.length <= 1) return false;
      const left = sc;
      setScope(sc.slice(0, -1));
      focus.set(left, "transform");                      // select the group just stepped out of
      return true;
    };

    // ---- the view (S7) --------------------------------------------------------------------------
    // Zoom and pan change what you see and never what the source says, so the view is state, not an
    // edit: `{k, x, y}` — a scale and the top-left corner, in the source's own user units. It is
    // written to the *live* root's `viewBox`, recomputed from the source's viewBox every time, so
    // editing that attribute still works and the view composes with it rather than fighting it.
    // At identity nothing is written at all, which is why every law that predates zoom is untouched.
    //
    // No tool needed changing for this. Every measurement already goes through `ctx.screenCTM` /
    // `screenBox` / `localPoint` (P5), and `getScreenCTM` includes the viewBox — so a drag at zoom
    // 2.5 computes the same user-space numbers as the same drag at zoom 1, for free.
    const VIEW1 = { k: 1, x: null, y: null };
    let localView = VIEW1;
    const viewNow = () => { const st = stateOf(); return (st && st.view) || localView; };
    const isIdentity = (v) => v.k === 1 && v.x === null && v.y === null;
    // What the source says the view is: its viewBox, else its width/height, else what it renders as.
    const baseBox = () => {
      const d = target.doc();
      if (d !== null) {
        try { const vb = attrVal(d, 0, "viewBox"); if (vb) return parseViewBox(vb); } catch (err) {}
        try {
          const w = parseFloat(attrVal(d, 0, "width")), h = parseFloat(attrVal(d, 0, "height"));
          if (w > 0 && h > 0) return { minX: 0, minY: 0, width: w, height: h };
        } catch (err) {}
      }
      const b = node.getBBox ? node.getBBox() : null;
      return b && b.width > 0 ? { minX: b.x, minY: b.y, width: b.width, height: b.height }
                              : { minX: 0, minY: 0, width: 1, height: 1 };
    };
    const viewBoxNow = () => {
      const v = viewNow(), base = baseBox();
      return { minX: v.x === null ? base.minX : v.x, minY: v.y === null ? base.minY : v.y,
               width: base.width / v.k, height: base.height / v.k };
    };
    // Put the source's own view back, byte for byte — including "there was no viewBox".
    const restoreView = () => {
      const d = target.doc();
      // Same rule, and here the cost of breaking it is the reported symptom itself: "the source had
      // no viewBox" and "I cannot read the source" are different statements, and treating the second
      // as the first *removes* the attribute — which renders the drawing at 1:1 user units, its
      // unzoomed size, for as long as that node is on screen.
      if (d === null) return;
      let vb = null;
      try { vb = attrVal(d, 0, "viewBox"); } catch (err) {}
      if (vb === null) node.removeAttribute("viewBox"); else node.setAttribute("viewBox", vb);
    };
    const applyView = () => {
      const v = viewNow();
      if (isIdentity(v)) return;                       // the commit already rendered the source's own
      // A node that cannot read its own source does not know what its view is *relative to*:
      // `baseBox` would fall through to its 1×1 last resort and this would write a two-unit window
      // over a 320-unit drawing. Two kinds of node are in that state — the one a commit just
      // detached, and the fresh one before the runtime has taken it — and a put is announced on
      // both. Measured in the wild 2026-07-23: `viewBox="-77.2 -85.1 2.0107 2.0107"`, whose square
      // 2.0107 is exactly `1/k`, which is the fallback's signature.
      if (target.doc() === null) return;
      node.setAttribute("viewBox", printViewBox(viewBoxNow()));
      armHandover();
    };
    // ---- handing the view to the node that replaces us -------------------------------------------
    // The view is deliberately not in the source, so every node the runtime mints starts without one,
    // and a fresh node cannot resolve the `Variable` its view is filed under — the runtime has not
    // taken its value yet. It therefore renders at the source's own scale, and the frame it is
    // inserted in paints that. `requestAnimationFrame` does not save it: if the recompute lands after
    // that frame's animation-frame callbacks have already run, the restore is a whole frame late.
    // That is the flash Tom filmed on release, measured off the video at 3.958 px/unit against a
    // steady 1.500 — a 320-unit window where the view asked for 845.
    //
    // At that instant the outgoing node is the only object that still knows the view, so it hands it
    // over: watch our own parent, and when something replaces us there, copy our live `viewBox` onto
    // it. Two properties make this the right mechanism rather than another race:
    //   * MutationObserver callbacks are microtasks, so this runs before the *rendering steps of the
    //     same frame*. rAF gives no such guarantee, and that is precisely what went wrong.
    //   * it identifies the heir positionally — the node that took our place in our parent — so it
    //     never has to guess which `Variable` a fresh node belongs to.
    // It is a paint, not an edit: only the attribute the view already owns is written, and the heir
    // recomputes the same value for itself as soon as it can resolve its state.
    let handover = null;
    const armHandover = () => {
      const parent = node.parentNode;
      if (!parent || handover || isIdentity(viewNow())) return;   // nothing to hand over at 1:1
      handover = new MutationObserver(() => {
        if (node.isConnected) return;                    // still on screen: nothing has replaced us
        const box = node.getAttribute("viewBox");        // a detached node keeps its attributes
        const heir = [...parent.childNodes].find(
          (n) => n !== node && n.nodeType === 1 && n.localName === "svg");
        if (heir && box !== null && !heir.hasAttribute("data-lens-view")) {
          heir.setAttribute("viewBox", box);
          heir.setAttribute("data-lens-view", "inherited");
        }
        handover.disconnect();
        handover = null;
      });
      handover.observe(parent, { childList: true });
    };
    const setView = (v) => {
      const next = { k: Math.max(0.02, Math.min(200, v.k)), x: v.x, y: v.y };
      localView = next;
      const st = stateOf();
      if (st) st.view = next;
      if (isIdentity(next)) restoreView(); else applyView();
      focus.refresh();
      node.dispatchEvent(new CustomEvent("lens-view", { detail: { ...next, box: viewBoxNow() } }));
      return next;
    };
    // Zoom about a screen point: whatever user-space point is under the pointer stays under it.
    node.zoomAt = (factor, clientX, clientY) => {
      const v = viewNow(), base = baseBox(), box = viewBoxNow();
      const m = node.getScreenCTM();
      if (!m) return v;
      const inv = m.inverse();
      const px = inv.a * clientX + inv.c * clientY + inv.e;
      const py = inv.b * clientX + inv.d * clientY + inv.f;
      const fx = box.width ? (px - box.minX) / box.width : 0.5;
      const fy = box.height ? (py - box.minY) / box.height : 0.5;
      const k = Math.max(0.02, Math.min(200, v.k * factor));
      return setView({ k, x: px - fx * (base.width / k), y: py - fy * (base.height / k) });
    };
    // Pan by a screen delta, converted through the same matrix everything else measures with.
    node.panBy = (dx, dy) => {
      const v = viewNow(), box = viewBoxNow();
      const m = node.getScreenCTM();
      if (!m) return v;
      const inv = m.inverse();
      return setView({ k: v.k, x: box.minX - (inv.a * dx + inv.c * dy),
                                y: box.minY - (inv.b * dx + inv.d * dy) });
    };
    node.view = () => ({ ...viewNow(), box: viewBoxNow() });
    node.setView = (v) => setView(v || VIEW1);
    node.resetView = () => setView(VIEW1);
    // Fit a set of elements (or the whole drawing) into the viewport, with a margin.
    node.fitView = (paths = null, margin = 0.06) => {
      const els = (paths && paths.length ? paths : focus.paths).length
        ? (paths || focus.paths).map((p) => { try { return target.elems()[nodeAt(target.doc(), p).index]; }
                                              catch (err) { return null; } }).filter(Boolean)
        : [...node.children].filter((n) => !n.hasAttribute("data-svg-lens-overlay"));
      const boxes = els.map((el) => boxInRoot(el, node)).filter(Boolean);
      if (!boxes.length) return setView(VIEW1);
      const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
      const x1 = Math.max(...boxes.map((b) => b.x + b.width));
      const y1 = Math.max(...boxes.map((b) => b.y + b.height));
      const base = baseBox();
      const pad = Math.max(x1 - x0, y1 - y0) * margin;
      const w = Math.max(1e-6, x1 - x0 + 2 * pad), h = Math.max(1e-6, y1 - y0 + 2 * pad);
      const k = Math.min(base.width / w, base.height / h);
      return setView({ k, x: (x0 + x1) / 2 - base.width / (2 * k),
                          y: (y0 + y1) / 2 - base.height / (2 * k) });
    };

    // The active tool, and the scratch a half-finished gesture keeps. A gesture means different
    // things in different modes, so the tools that create gate on it; everything else is
    // unconditional and stays reachable in select mode. Both live in the shared state rather than
    // this closure, because a tool can outlive the node it started on: the pen commits a path on its
    // first anchor and extends it on the next click, by which time this node has been replaced.
    // The locals are the fallback for a node that is not (yet) a cell value.
    let localTool = options.tool || "select";
    const localGesture = {};
    const gesture = () => { const s = stateOf(); return s ? (s.gesture || (s.gesture = {})) : localGesture; };
    const toolNow = () => { const s = stateOf(); return (s && s.tool) || localTool; };
    const setTool = (id) => {
      localTool = id || "select";
      const s = stateOf();
      if (s) s.tool = localTool;
      const g = gesture();
      g.pen = null;                                      // a half-drawn path ends when the tool changes
      g.draw = null;
      overlay.clear();
      focus.refresh();
      node.dispatchEvent(new CustomEvent("lens-tool", { detail: { tool: localTool } }));
    };

    const kidCount = (parent) => {
      const d = target.doc();
      if (d === null) return 0;
      try { return childrenLens(parent).get(d).length; } catch (e) { return 0; }
    };

    // Alignment guides, handed in screen coordinates and drawn in the root's user space — the tools
    // measure where the pointer is, the overlay draws where the drawing is.
    const guides = (lines) => {
      for (const n of [...overlay.rootEl.querySelectorAll("line.guide")]) n.remove();
      if (!lines || !lines.length) return;
      const m = node.getScreenCTM();
      if (!m) return;
      const inv = m.inverse();
      const at = (x, y) => [inv.a * x + inv.c * y + inv.e, inv.b * x + inv.d * y + inv.f];
      for (const g of lines) {
        const [x1, y1] = at(g.x1, g.y1), [x2, y2] = at(g.x2, g.y2);
        overlay.addRoot("line", { class: "guide", x1, y1, x2, y2 });
      }
    };

    const ctx = {
      node, target, writer, focus, snap, overlay, setTool, guides, shapes, commands, clipboard,
      get state() { return gesture(); },
      tool: () => toolNow(),
      childCount: kidCount,
      addShape: (markup, at, parent) => node.addShape(markup, at, parent),
      options: { ...options, newShape },
      elems: target.elems,
      doc: target.doc,
      // What a tool may measure: the source token, or the rendered one where the source has holes.
      attr: (t, idx, name) => effectiveAttr(target.elems(), t, idx, name),
      localPoint: (el, e) => {
        const ctm = ctx.screenCTM(el);
        if (!ctm) return null;
        const [x, y] = applyPoint(invert(ctmMat(ctm)), e.clientX, e.clientY);
        return [snap(x), snap(y)];
      },
      // ---- geometry (P5) --------------------------------------------------------------------
      // Every measurement a tool takes goes through here, so a tool is a function of `ctx` and the
      // trace and of nothing else. The browser is still the authority — this only names the four
      // questions a tool is allowed to ask it, which is what lets a fake `ctx` drive a tool with no
      // document at all, and what stops a tool inventing a fifth way to measure a hit.
      bbox: (el) => { try { return el && el.getBBox ? el.getBBox() : null; } catch (e) { return null; } },
      // G13: a readout font in *user* units — a fixed ~12 screen px divided by the root's zoom, so it
      // reads the same size at every zoom. A measurement, so it lives beside the other P5 helpers.
      readoutFont: () => { const m = node.getScreenCTM(); const z = m ? Math.hypot(m.a, m.b) : 1; return 12 / (z || 1); },
      screenCTM: (el) => (el && el.getScreenCTM ? el.getScreenCTM() : null),
      screenBox: (el) => (el && el.getBoundingClientRect ? el.getBoundingClientRect() : null),
      // The selection box in the root's user space, where a marquee is drawn and compared.
      rootBox: (el) => boxInRoot(el, node),
      // An element-local point projected into the root's user space — the point-sized companion to
      // `rootBox`, for comparing a handle against a marquee band drawn in root space (G22). Stays a
      // P5 measurement: it only composes the two CTMs `ctx` already exposes.
      rootPoint: (el, x, y) => {
        const em = ctx.screenCTM(el), nm = ctx.screenCTM(node);
        if (!em || !nm) return null;
        const s = applyPoint(ctmMat(em), x, y);
        return applyPoint(invert(ctmMat(nm)), s[0], s[1]);
      },
      // What is under the pointer, front to back. Painted geometry first, then near-misses.
      hit: (e, opts = {}) =>
        hitTest(ctx, e, { tolerance: options.hitTolerance, ...opts }),
      // ---- the one hit contract (S1) ----------------------------------------------------------
      // `hit` answers with painted leaves; `pick` answers what a *click* means, which is a different
      // question — at the current scope a leaf inside a group stands for the group. Front to back,
      // deduped, so tapping again steps down the stack. Selection, the hover highlight and the
      // descent gesture all read this, which is why the outline cannot disagree with the click.
      pick: (e, opts = {}) => {
        const d = target.doc();
        if (d === null) return [];
        const list = target.elems();
        const sc = scopeNow();
        const out = [], seen = new Set();
        for (const h of hitTest(ctx, e, { tolerance: options.hitTolerance, ...opts })) {
          const li = list.indexOf(h);
          if (li <= 0) continue;
          let path, i;
          try { path = scopedPath(pathOfIndex(d, li), sc); i = nodeAt(d, path).index; }
          catch (err) { continue; }
          const k = path.join("/");
          if (seen.has(k) || !list[i]) continue;
          seen.add(k);
          out.push({ index: i, path, el: list[i] });
        }
        return out;
      },
      scope: scopeNow,
      setScope,
      // S9. The affordance registry, and the read context a chip is dispatched against — the
      // affordance's `env`, built the same way `commandEnv` is (pure data plus measured questions).
      affordances: svgAffordances,
      affContext: () => affContext(null),
      view: () => node.view(),
      zoomAt: (f, x, y) => node.zoomAt(f, x, y),
      panBy: (dx, dy) => node.panBy(dx, dy)
    };

    ctxByNode.set(node, ctx);
    // Tools are handed a facade, not this closure's ctx. A commit mints a new node, so an operation
    // that spans one leaves the instance it started on dead: the old target no longer resolves, its
    // overlay is detached, and its writer would silently refuse (`cellSource()` is null). The facade
    // forwards every field to whichever instance is the cell's value *right now* — read from the
    // Variable rather than from an instance announcing itself, because an announcement scheduled on
    // a timer loses the race against the next `await` in a multi-element commit loop. So the pen
    // extends one path across the commits its own anchors cause, moving a selection writes every
    // element rather than the first two, and the `setTool("select")` that ends a draw reaches the
    // node the user is looking at.
    const liveCtx = {};
    for (const k of Object.keys(ctx))
      Object.defineProperty(liveCtx, k, { enumerable: true, get: () => {
        stateOf();                                       // resolves `myVar` the first time it can
        const cur = myVar && myVar._value;
        return ((cur && ctxByNode.get(cur)) || ctx)[k];
      } });

    let active = null;
    node.addEventListener("pointerdown", (e) => {
      // The one moment this node is certainly on screen, which is what arming needs — `applyView`
      // often runs from the restore rAF *before* the runtime has inserted us, so it finds no parent
      // to watch. A gesture is also the only thing that can cause the replacement being guarded
      // against, so arming here is both sufficient and free.
      armHandover();
      for (const t of tools) if (t.onPointerDown && t.onPointerDown(liveCtx, e)) { active = t; return; }
      active = null;
    });
    node.addEventListener("pointermove", (e) => {
      if (active) return void (active.onPointerMove && active.onPointerMove(liveCtx, e));
      for (const t of tools) if (t.onHover) t.onHover(liveCtx, e);   // between gestures: pen rubber band
    });
    const end = async (e) => {
      const t = active;
      active = null;
      if (t && t.onPointerUp) await t.onPointerUp(liveCtx, e);
    };
    node.addEventListener("pointerup", end);
    node.addEventListener("pointercancel", end);
    // Abandon whatever is in flight. Offered to every tool, not just the active one, because a tool
    // can hold gesture state between gestures — the pen's half-drawn path is not an active drag.
    // Each `onCancel` reports whether it had anything to abandon, so a callsite can tell a cancelled
    // gesture from a plain Escape and do something else with the latter. Keyboard belongs to the
    // callsite (arrows, delete and z-order already live there), so this is a method, not a listener:
    // a commit remounts this node, and a document listener added here would leak one per commit.
    node.cancelGesture = () => {
      const was = active;
      active = null;
      let claimed = false;
      for (const t of tools) if (t.onCancel && t.onCancel(liveCtx)) claimed = true;
      return claimed || !!was;
    };
    node.addEventListener("pointerleave", (e) => {
      for (const t of tools) if (t.onPointerLeave) t.onPointerLeave(liveCtx, e);
    });
    node.addEventListener("wheel", (e) => {
      for (const t of tools) if (t.onWheel && t.onWheel(liveCtx, e)) return;
    }, { passive: false });
    node.addEventListener("dblclick", async (e) => {
      e.preventDefault();
      for (const t of tools) if (t.onDblClick && await t.onDblClick(liveCtx, e)) return;
    });

    // The handles follow every put. A structural edit may move the selection's address, so the record
    // carries a rebase; refresh() drops the selection by itself if the path no longer resolves. The
    // writer knows nothing about selection — it just says what it did.
    node.addEventListener("lens-put", (e) => {
      // Both halves of T7: the element rebase moves paths, and a vertex address moves either because
      // its element moved (the same function, applied to its path) or because the edit renumbered
      // vertices inside it (the op the command declared).
      const v = e.detail.vertex, r = e.detail.rebase;
      focus.rebaseVertices(v ? (a) => rebaseVertex(a, v)
                             : r ? (a) => { const p = r(a.path); return p && { ...a, path: p }; }
                             : null);
      if (r) focus.rebase(r);
      applyView();                                     // the render just put the source's view back
      focus.refresh();
    });

    // The cell's value is the SVG text the source currently holds; cellSource() exposes the whole
    // definition so a projection cell can show what a gesture rewrote.
    Object.defineProperty(node, "value", { configurable: true, get: target.doc, set: () => {} });
    node.cellSource = () => target.cellSource() || "";
    // Structural editing, programmatically. Each returns the put record (or null off-cell) and tells
    // the writer how to carry an address across the edit, so a selection survives it.
    //
    // The index is clamped HERE, once, and the same value goes to the command and to the rebase. The
    // commands clamp out-of-range indices themselves, so passing the raw value to both would let them
    // disagree — and a rebase that disagrees with the edit silently drops the selection.
    node.addShape = (markup, at = null, parent = [0]) => {
      const n = kidCount(parent);
      const i = at === null ? n : Math.max(0, Math.min(n, at));
      return writer.runCommand("insertElement", (d) => insertElement(d, parent, i, markup), {
        rebase: (p) => rebasePath(p, { kind: "insert", parent, at: i })
      });
    };
    node.removeAt = (path) =>
      writer.runCommand("deleteElement", (d) => deleteElement(d, path), {
        rebase: (p) => rebasePath(p, { kind: "delete", path })
      });
    node.moveTo = (path, to) => {
      const t = Math.max(0, Math.min(kidCount(path.slice(0, -1)) - 1, to));
      return writer.runCommand("reorderElement", (d) => reorderElement(d, path, t), {
        rebase: (p) => rebasePath(p, { kind: "move", path, to: t })
      });
    };
    node.edit = (name, fn, opts) => writer.runCommand(name, fn, opts);
    // ---- commands (S4) ---------------------------------------------------------------------------
    // What a command may read, and nothing else: `env` is to a command what `ctx` is to a tool. Three
    // of these are measurements, and they go through `ctx` like every other measurement (P5), so a
    // command can be planned against a fake env with no document at all.
    const commandEnv = () => {
      const src = target.doc();
      if (src === null) return null;
      return {
        src, paths: focus.paths, vertices: focus.vertices, scope: scopeNow(), options,
        index: (path) => nodeAt(src, path).index,
        childCount: kidCount,
        clipboard: clipboard.read,
        // Everything align needs about one element, measured the way a drag measures it.
        target: (path) => {
          let n;
          try { n = nodeAt(src, path); } catch (e) { return null; }
          const g = moveTargetOf(ctx, n.index);
          return g && { ...g, box: ctx.screenBox(g.el) };
        }
      };
    };
    // The plan *is* the answer to "can I do this" — asked once, so a greyed-out menu item and a
    // refusal to run cannot disagree. null means the command declines (T8).
    node.commandPlan = (id) => {
      const c = commandLookup.byId(commands, id);
      const env = c && commandEnv();
      if (!env) return null;
      try { return c.plan(env); } catch (e) { return null; }
    };
    node.canCommand = (id) => node.commandPlan(id) !== null;
    node.commands = () => commands.map((c) => ({ id: c.id, label: c.label, key: c.key }));
    node.command = async (id) => {
      const d = node.commandPlan(id);
      return d === null ? null : commitDelta(liveCtx, d);
    };
    // "What does this keystroke mean" — the registry answers, the callsite decides whether to ask.
    node.commandForEvent = (e) => commandLookup.forEvent(commands, e);
    node.copySelection = () => copyMarkup(target.doc() || "", focus.paths);
    // Z-order over the same reorder command. SVG paints in document order, so "front" is last.
    node.zOrder = (path, kind) =>
      node.moveTo(path, zTarget(kind, path[path.length - 1], kidCount(path.slice(0, -1))));
    // Delete a whole selection: deepest and last first, so an address is never invalidated by an
    // earlier deletion in the same batch.
    node.removeSelection = async () => {
      const order = focus.paths.slice().sort((a, b) => {
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          const d = (b[i] === undefined ? -1 : b[i]) - (a[i] === undefined ? -1 : a[i]);
          if (d) return d;
        }
        return 0;
      });
      const out = [];
      for (const p of order) out.push(await node.removeAt(p));
      return out;
    };
    // ---- history ---------------------------------------------------------------------------------
    // Undo here is just "put the previous source back", which the writer already knows how to do; the
    // entries are whole definitions, so a structural undo restores the exact prior bytes rather than
    // trying to invert a command. Refuses when the current source is not what this entry produced —
    // someone else (editor-5, another gesture) has written since, and clobbering that is worse than
    // declining. Bounded, because a drag is one entry but a session is many.
    const limit = options.historyLimit === undefined ? 200 : options.historyLimit;
    // One put is announced on two nodes — the one the gesture happened on and the one the recompute
    // produced, so listeners attached either side of the remount both see it. History must record it
    // once: the record itself carries the flag, and `replaying` lives in the shared state because the
    // undo that started on the old node completes on the new one.
    node.addEventListener("lens-put", (e) => {
      const s = e.detail.source, st = stateOf();
      if (!s || e.detail.aborted || !st || st.replaying || e.detail.recorded) return;
      e.detail.recorded = true;
      st.undo.push(s);
      if (st.undo.length > limit) st.undo.shift();
      st.redo.length = 0;                                // a new edit forks the future
    });
    const step = async (fromKey, toKey, want, name) => {
      const st = stateOf();
      if (!st) return null;
      const from = st[fromKey], to = st[toKey];
      const entry = from[from.length - 1];
      if (!entry) return null;
      if (target.cellSource() !== entry[want]) return null;   // written since: refuse
      from.pop();
      to.push(entry);
      st.replaying = true;
      try {
        return await writer.applySource(want === "after" ? entry.before : entry.after,
          { target: name, attribute: "(history)", before: "", after: "", GetPut: true, PutGet: true, span: null });
      } finally { st.replaying = false; }
    };
    node.undo = () => step("undo", "redo", "after", "undo");
    node.redo = () => step("redo", "undo", "before", "redo");
    node.historyDepth = () => {
      const s = stateOf();
      return s ? { undo: s.undo.length, redo: s.redo.length } : { undo: 0, redo: 0 };
    };

    // What is under a pointer event, topmost first — the very hit-test a click uses (S1), exposed so a
    // right-click can select before it opens a menu (G8). Measurement stays inside `ctx`, so P5 holds.
    node.pickAt = (e) => ctx.pick(e).map((h) => h.path);
    node.selection = () => focus.path;
    node.selectionPaths = () => focus.paths;
    node.selectionMode = () => focus.mode;
    node.select = (paths, mode) => focus.setAll(paths, mode);
    // The sub-element selection (P7). Addresses, not handle keys, so what you hold survives a commit.
    node.selectedVertices = () => focus.vertices;
    node.selectVertices = (list) => focus.setVertices(list);

    // Keyboard nudge and typed values go through the very same lens a drag does — no second write
    // path, so the laws and the residue rules cover them without restating anything.
    node.nudge = async (dx, dy) => {
      const out = [];
      for (const i of focus.indices) {
        const t = target.doc();
        if (t === null) break;
        const text = effectiveAttr(target.elems(), t, i, "transform") || "";
        const T = translateLens.get(text);
        const r = (v) => Math.round(v * 1e6) / 1e6;      // nudging must not accumulate float dust
        out.push(await writer.commit(i, "transform", [r(T[0] + dx), r(T[1] + dy)], "", translateLens));
      }
      focus.refresh();
      return out;
    };
    // What is at this address: tag and attributes, read from the source rather than the DOM, so an
    // inspector shows the bytes the author has (readable `rotate(45)`, not a flattened matrix).
    node.describe = (path) => {
      const t = target.doc();
      if (t === null) return null;
      try {
        const n = nodeAt(t, path);
        return { tag: n.tag, index: n.index,
                 attrs: Object.keys(n.attrs).map((k) => [k, n.attrs[k].value]) };
      } catch (e) { return null; }
    };
    // Set a paint property where it already lives: a `style="fill: …"` declaration wins over a `fill`
    // attribute, so writing the attribute would look like an edit and change nothing.
    node.setProperty = (path, prop, value) => {
      const t = target.doc();
      if (t === null) return null;
      const idx = nodeAt(t, path).index;
      const w = setProperty(t, idx, prop, value);
      return writer.commit(idx, w.name, w.value, null);
    };
    // Several properties in one commit, so a gizmo drag that moves an (x, y) pair is one history entry,
    // not two — each write is style-aware (`setProperty`) and applied to the running source in order.
    node.setProperties = (path, pairs) => node.edit("setProperties", (src) => {
      let out = src;
      for (const [prop, value] of pairs) {
        const idx = nodeAt(out, path).index;
        const w = setProperty(out, idx, prop, value);
        out = attrTextLens(idx, w.name).put(w.value, out);
      }
      return out;
    });
    // S6/G46. The typed field surface: what paint/stroke properties this element has and their current
    // source values, and a setter that writes one back through `setProperty` — the same path the
    // inspector and a drag use, so a widget commit is byte-identical to a raw attribute write. A write that would not change the
    // bytes is skipped (T1), which is what lets the panel re-render from the selection on every commit
    // without a colour picker reporting the same hex re-serialising `darkseagreen`.
    node.fields = (path) => {
      const t = target.doc();
      if (t === null) return [];
      let n;
      try { n = nodeAt(t, path); } catch (e) { return []; }
      return svgFields.forTag(n.tag).map((f) => ({ ...f, value: svgFields.read(t, n.index, f.prop) }));
    };
    node.setField = (path, prop, value) => {
      const t = target.doc();
      if (t === null) return null;
      let idx;
      try { idx = nodeAt(t, path).index; } catch (e) { return null; }
      const v = value == null ? "" : String(value).trim();
      const cur = svgFields.read(t, idx, prop);
      if (v === "" || v === cur) return null;                // no clear-to-default yet; no-op if unchanged (T1)
      const w = setProperty(t, idx, prop, v);
      return writer.commit(idx, w.name, w.value, null);
    };
    node.refs = (path) => {
      const t = target.doc();
      if (t === null) return [];
      try { return refsOf(t, path); } catch (e) { return []; }
    };
    // G1. Resolve a selection to a gradient and list its stops. `path` may BE a gradient, a <stop>
    // inside one, or a shape whose paint points at one via `url(#id)` (`refsOf` reports where) — all
    // three answer the same "which stops am I editing". Returns the gradient's path and, per stop, its
    // path plus the colour/offset a swatch needs; null when nothing here resolves to a gradient.
    node.gradientStops = (path) => {
      const t = target.doc();
      if (t === null) return null;
      const isGrad = (tag) => tag === "linearGradient" || tag === "radialGradient";
      const gradPath = () => {
        let n;
        try { n = nodeAt(t, path); } catch (e) { return null; }
        if (isGrad(n.tag)) return path;
        const parent = path.slice(0, -1);           // a <stop>: its gradient is the parent
        try { if (parent.length && isGrad(nodeAt(t, parent).tag)) return parent; } catch (e) {}
        for (const ref of node.refs(path)) {          // a shape: follow its paint reference
          if (ref.path) { try { if (isGrad(nodeAt(t, ref.path).tag)) return ref.path; } catch (e) {} }
        }
        return null;
      };
      const gp = gradPath();
      if (!gp) return null;
      let g;
      try { g = nodeAt(t, gp); } catch (e) { return null; }
      const stops = (g.children || []).filter((c) => c.tag === "stop").map((c) => ({
        path: c.path,
        color: c.attrs && c.attrs["stop-color"] ? c.attrs["stop-color"].value : "#000000",
        offset: c.attrs && c.attrs.offset ? c.attrs.offset.value : "0"
      }));
      return { gradient: gp, stops };
    };
    // ---- affordances (S9) -----------------------------------------------------------------------
    // A chip's `env`: the selection and the same measured questions a command gets, plus the one it
    // adds — the field value under the primary — so a provider can be planned against pure data.
    const affContext = (box) => {
      const doc = target.doc();
      const m = node.getScreenCTM();
      const scale = m ? Math.hypot(m.a, m.b) : 1;
      const idxOf = (p) => { try { return nodeAt(doc, p).index; } catch (e) { return null; } };
      const primary = focus.path;
      const idx = primary ? idxOf(primary) : null;
      return {
        doc, box, scale, mode: focus.mode,
        paths: focus.paths, path: primary, index: idx,
        tag: (() => { try { return primary ? nodeAt(doc, primary).tag : null; } catch (e) { return null; } })(),
        indexOf: idxOf,
        field: (prop) => (doc !== null && idx !== null) ? svgFields.read(doc, idx, prop) : "",
        fieldOf: (p, prop) => { const i = idxOf(p); return (doc !== null && i !== null) ? svgFields.read(doc, i, prop) : ""; },
        canDo: (id) => node.canCommand(id)
      };
    };
    node.affordanceContext = affContext;    // exposed so the ctx facade and headless tests can reach it
    // What svgFocus draws once it knows the selection box: the applicable, non-declining chips, in root
    // space. A command-backed chip declines exactly when its command does (G41 = T8). Kept here rather
    // than in svgFocus because only this scope has the registry and `canCommand`.
    focus.setDecorate((box) => {
      if (!box || target.doc() === null) return;
      const a = affContext(box);
      const s = 8 / (a.scale || 1);
      let i = 0;
      for (const p of svgAffordances) {
        if (!p.applies(a)) continue;
        if (p.command ? !a.canDo(p.command) : (p.declines ? p.declines(a) : false)) continue;
        const cx = box.x + s + i * (s * 2.6), cy = box.y - s * 2.2;
        const g = p.glyph(a) || {};
        const c = overlay.addRoot("circle", { class: "chip", r: s, cx, cy, fill: g.fill || "#fff" });
        c.dataset.aff = p.id; c.style.cursor = p.cursor || "pointer";
        if (g.symbol) {
          const t = overlay.addRoot("text", { class: "chip-label", x: cx, y: cy, "font-size": s * 1.25 });
          t.textContent = g.symbol; t.dataset.aff = p.id;
        }
        i++;
      }
      // G6. A gradient-filled shape also gets its gradient's axis drawn as draggable handles. The
      // handles are the gizmo's pure model mapped onto this shape's box through `ctx` (P5); a drag
      // previews on the live gradient element (transient DOM) and commits x1..y2 / cx,cy,r through
      // `setProperties`, the one write path. Wrapped so a gizmo failure never breaks the chip render.
      try {
        if (a.path && a.index !== null && a.tag !== "linearGradient" && a.tag !== "radialGradient" && a.tag !== "stop") {
          const info = node.gradientStops(a.path);
          const refEl = info ? ctx.elems()[a.index] : null;
          let gradN = null; if (info) { try { gradN = nodeAt(a.doc, info.gradient); } catch (e) {} }
          const bbox = refEl && refEl.getBBox ? ctx.bbox(refEl) : null;
          if (info && refEl && gradN && bbox) {
            const gtag = gradN.tag;
            const attrs = {};
            for (const k of Object.keys(gradN.attrs || {})) attrs[k] = gradN.attrs[k].value;
            const units = attrs.gradientUnits || "objectBoundingBox";
            const gradEl = ctx.elems()[gradN.index] || null;
            const round = (x) => Math.round(x * 1000) / 1000;
            const toRoot = (fx, fy) => ctx.rootPoint(refEl,
              units === "userSpaceOnUse" ? fx : bbox.x + fx * bbox.width,
              units === "userSpaceOnUse" ? fy : bbox.y + fy * bbox.height);
            const fracOf = (e) => {
              const lp = ctx.localPoint(refEl, e);
              if (!lp) return null;
              return units === "userSpaceOnUse" ? [lp[0], lp[1]]
                : [(lp[0] - bbox.x) / (bbox.width || 1), (lp[1] - bbox.y) / (bbox.height || 1)];
            };
            const positions = () => gradientGizmo.handles(gtag, attrs).map((h) => ({ h, rp: toRoot(h.x, h.y) }));
            const pos = positions();
            if (pos.length >= 2 && pos.every((o) => o.rp)) {
              const line = overlay.addRoot("line", { x1: pos[0].rp[0], y1: pos[0].rp[1], x2: pos[1].rp[0], y2: pos[1].rp[1],
                stroke: "#4679b8", "stroke-width": s * 0.22, "stroke-dasharray": `${s * 0.6} ${s * 0.5}`, "pointer-events": "none" });
              const circles = {};
              const redraw = () => {
                const np = positions();
                if (np[0].rp && np[1].rp) { line.setAttribute("x1", np[0].rp[0]); line.setAttribute("y1", np[0].rp[1]); line.setAttribute("x2", np[1].rp[0]); line.setAttribute("y2", np[1].rp[1]); }
                for (const { h, rp } of np) { const cc = circles[h.key]; if (cc && rp) { cc.setAttribute("cx", rp[0]); cc.setAttribute("cy", rp[1]); } }
              };
              for (const { h, rp } of pos) {
                const c = overlay.addRoot("circle", { class: "grad-handle", r: s * 0.7, cx: rp[0], cy: rp[1], fill: "#fff", stroke: "#4679b8", "stroke-width": s * 0.22 });
                c.style.cursor = "move"; c.dataset.grad = h.key; circles[h.key] = c;
                const onMove = (ev) => {
                  const f = fracOf(ev); if (!f) return;
                  for (const { prop, num } of gradientGizmo.writeFor(gtag, attrs, h.key, f[0], f[1])) {
                    attrs[prop] = String(round(num));
                    if (gradEl) gradEl.setAttribute(prop, round(num));   // live preview; discarded on the commit re-render
                  }
                  redraw();
                };
                const onUp = async (ev) => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                  try { c.releasePointerCapture(ev.pointerId); } catch (er) {}
                  const props = gtag === "radialGradient" ? (h.key === "c" ? ["cx", "cy"] : ["r"]) : (h.key === "p1" ? ["x1", "y1"] : ["x2", "y2"]);
                  await node.setProperties(info.gradient, props.map((p) => [p, attrs[p]]));   // one commit
                };
                c.addEventListener("pointerdown", (ev) => {
                  ev.preventDefault(); ev.stopPropagation();
                  try { c.setPointerCapture(ev.pointerId); } catch (er) {}
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                });
              }
            }
          }
        }
      } catch (e) { /* the gizmo is decoration; never let it break the chip render */ }
    });
    node.setTool = setTool;
    Object.defineProperty(node, "tool", { configurable: true, get: () => toolNow() });
    // A commit remounts this cell, so this run may be the continuation of an editing session rather
    // than the start of one. The variable is not bound to the node until the runtime has taken this
    // return value, hence the tick. Selection is restored by *path*, which is why it is addressed
    // that way: an index would not survive the structural edit that caused the remount.
    // Only the selection needs restoring. The tool is read from the shared state, and re-running
    // setTool here would clear the very gesture that caused the remount — which is how the pen used
    // to lose its path after its first anchor.
    let resumed = false;
    const resume = () => {
      if (resumed) return true;
      const s = stateOf();
      if (!s) return false;
      resumed = true;
      node.removeAttribute("data-lens-view");          // the inherited paint has served its purpose
      applyView();                                     // a remount renders the source's own view
      // Read both *before* restoring either: `setAll` repaints, the repaint announces, and the
      // announcement writes the (still empty) vertex selection back over the one being restored.
      const verts = s.verts || [];
      if (s.paths && s.paths.length) focus.setAll(s.paths, s.mode);
      // The sub-element selection travels the same way (P7). It is stored as an address, so a commit
      // that renumbered vertices has already moved it — restoring is a read, not a repair.
      if (verts.length) focus.setVertices(verts);
      return true;
    };
    // Neither of these is what keeps the view on screen across a commit — the handover above is,
    // because it is the only one that cannot be a frame late. These restore the rest of the session
    // (selection, vertices) as soon as the variable resolves, and re-derive the view properly. rAF
    // first because it is usually sooner; the timeout is the fallback for a node in a tab that never
    // paints, where rAF never fires. Whichever wins, `resumed` makes the other a no-op.
    requestAnimationFrame(resume);
    setTimeout(resume, 0);
    return node;
  };
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("module @tomlarkworthy/acorn-8-11-3", async () => runtime.module((await import("/@tomlarkworthy/acorn-8-11-3.js?v=4")).default));
  main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
  main.define("module @tomlarkworthy/grid-container", async () => runtime.module((await import("/@tomlarkworthy/grid-container.js?v=4")).default));
  main.define("module @tomlarkworthy/editor-5", async () => runtime.module((await import("/@tomlarkworthy/editor-5.js?v=4")).default));

  // Display order is the reading order of a paper: demo and how to use it, then the argument with a
  // widget beside each claim, then related and future work, then the references, then the appendix
  // (tests first, implementation after, imports last).
  $def("sl01", "intro", ["md","cite"], _sl01);
  // The bench: drawing + tool/paint selectors, composed side-by-side on `workbench`'s snap grid.
  // Their standalone value-rows live in the implementation appendix (their nodes are shown by the grid).
  $def("sl305", "workbench", ["gridContainer","runtime","invalidation","svgLensModule"], _sl305);
  $def("sl02d", "loadSvg", ["htl","outsideDomain","viewof drawing"], _sl02d);
  $def("sl04", "howToDrive", ["md","ref"], _sl04);
  $def("sl05", "putTable", ["putLog","edits","Inputs"], _sl05);
  $def("sl08", "useIt", ["md"], _sl08);
  $def("sl08f", "putLog", [], _sl08f);
  $def("sl08d", "edits", ["Generators","putLog","viewof drawing","viewof factory","invalidation"], _sl08d);
  $def("sl08m", "viewof svgLensModule", ["thisModule"], _sl08m);
  $def("sl08mv", "svgLensModule", ["Generators","viewof svgLensModule"], _sl08mv);
  $def("sl08c", "keepYourEdits", ["htl","downloadAnchor","lookupVariable","svgLensModule","edits"], _sl08c);

  // The paper
  $def("sl200", "paperHeader", ["md"], _sl200);
  $def("sl201", "problemH", ["sec"], _sl201);
  $def("sl202", "problemP", ["md","cite","ref"], _sl202);
  $def("sl203", "lensesH", ["sec"], _sl203);
  $def("sl204", "lensesP", ["md","tex","cite"], _sl204);
  $def("sl205", "lawsH", ["sec"], _sl205);
  $def("sl206", "lawsP", ["md","tex","cite","ref"], _sl206);
  $def("sl207", "residueH", ["sec"], _sl207);
  $def("sl208", "residueP", ["md","tex","cite"], _sl208);
  $def("sl211", "towerH", ["sec"], _sl211);
  $def("sl212", "towerP", ["md","cite","tex","ref"], _sl212);
  $def("sl209", "architectureH", ["sec"], _sl209);
  $def("sl210", "architectureP", ["md","ref","cite"], _sl210);
  $def("sl213", "propagationH", ["sec"], _sl213);
  $def("sl214", "propagationP", ["md","tex","ref"], _sl214);
  $def("sl223", "rectH", ["sec"], _sl223);
  $def("sl224", "rectP", ["md","tex","ref"], _sl224);
  $def("sl219", "lawBadges", ["htl"], _sl219);
  $def("sl220", "viewof rectDemo", ["svgLens","svg"], _sl220);
  $def("sl220v", "rectDemo", ["Generators","viewof rectDemo"], _sl220v);
  $def("sl220b", "rectDemoLaws", ["htl","lawBadges","viewof rectDemo","invalidation"], _sl220b);
  $def("sl225", "childrenH", ["sec"], _sl225);
  $def("sl226", "childrenP", ["md","tex","cite","ref"], _sl226);
  $def("sl221", "viewof childrenDemo", ["svgLens","svg"], _sl221);
  $def("sl221v", "childrenDemo", ["Generators","viewof childrenDemo"], _sl221v);
  $def("sl221b", "childrenDemoOps", ["htl","lawBadges","viewof childrenDemo","invalidation"], _sl221b);
  $def("sl227", "sinksH", ["sec"], _sl227);
  $def("sl228", "sinksP", ["md","tex","ref","cite"], _sl228);
  $def("sl06a", "factoryDoc", ["md"], _sl06a);
  $def("sl06b", "viewof shift", ["Inputs"], _sl06b);
  $def("sl06bv", "shift", ["Generators","viewof shift"], _sl06bv);
  $def("sl06c", "viewof spin", ["Inputs"], _sl06c);
  $def("sl06cv", "spin", ["Generators","viewof spin"], _sl06cv);
  $def("sl06", "viewof factory", ["svgLens","svg","shift","spin"], _sl06);
  $def("sl06v", "factory", ["Generators","viewof factory"], _sl06v);
  $def("sl222", "sinkRecord", ["putLog","edits","Inputs","htl"], _sl222);
  $def("sl279", "toolsH", ["sec"], _sl279);
  $def("sl280", "toolsP", ["md","tex","cite","ref"], _sl280);
  $def("sl281", "toollawsH", ["sec"], _sl281);
  $def("sl282", "toollawsP", ["md","tex","cite","ref"], _sl282);
  $def("sl229", "relatedH", ["sec"], _sl229);
  $def("sl230", "relatedP", ["md","cite","ref"], _sl230);
  $def("sl231", "futureH", ["sec"], _sl231);
  $def("sl232", "futureP", ["md","ref","cite"], _sl232);
  $def("sl233", "referencesH", ["md"], _sl233);
  $def("sl157r", "referencesList", ["references"], _sl157r);
  $def("sl234", "appendixHeader", ["md"], _sl234);

  // Appendix
  // The paper's own apparatus: maths, citations, cross-references. Implementation, so it lives here.
  $def("sl150", "externalLink", ["htl"], _sl150);
  $def("sl151", "sections", [], _sl151);
  $def("sl152", "sectionIndex", ["sections"], _sl152);
  $def("sl153", "sec", ["sectionIndex"], _sl153);
  $def("sl154", "ref", ["sectionIndex","htl"], _sl154);
  $def("sl155", "bibliography", [], _sl155);
  $def("sl156", "cite", ["bibliography","htl"], _sl156);
  $def("sl157", "references", ["bibliography","externalLink","htl"], _sl157);
  // Appendix: the tests first (they are the specification), then every implementation cell in
  // dependency order, then the imports at the very end of the module.
  $def("sl09", "testsDashboard", ["tests"], _sl09);
  $def("sl80", "harnessHeader", ["md"], _sl80);
  $def("sl81", "NUM_RUNS", [], _sl81);
  $def("sl82", "mulberry32", [], _sl82);
  $def("sl83", "arb", ["det"], _sl83);
  $def("sl84", "forAll", [], _sl84);
  $def("sl85", "checkLens", ["forAll","lensLaws"], _sl85);
  $def("sl90", "testsHeader", ["md"], _sl90);
  $def("sl91", "test_viewBoxLens_laws", ["checkLens","viewBoxLens","arb","mulberry32","NUM_RUNS","rectEq"], _sl91);
  $def("sl92", "test_pointsLens_laws", ["checkLens","pointsLens","arb","mulberry32","NUM_RUNS","pointsEq"], _sl92);
  $def("sl93", "test_transformLens_laws", ["checkLens","transformLens","arb","mulberry32","NUM_RUNS","matEq"], _sl93);
  $def("sl94", "test_pathLens_laws", ["checkLens","pathLens","arb","mulberry32","NUM_RUNS","pathEq"], _sl94);
  $def("sl95", "test_attr_laws", ["checkLens","attr","arb","mulberry32","NUM_RUNS","nodeEq"], _sl95);
  $def("sl96", "test_child_laws", ["forAll","child","arb","mulberry32","NUM_RUNS","nodeEq","lensLaws"], _sl96);
  $def("sl97", "test_compose_nodeViewBox_laws", ["checkLens","compose","requiredAttr","viewBoxLens","arb","mulberry32","NUM_RUNS","nodeEq","rectEq"], _sl97);
  $def("sl98", "test_invert_involution", ["forAll","arb","mulberry32","NUM_RUNS","invertIso","isoLaws","matApproxEq","multiply","IDENTITY"], _sl98);
  $def("sl99", "test_exact_roundtrips", ["forAll","arb","mulberry32","NUM_RUNS","parseTransform","printTransform","matEq","parsePath","printPath","pathEq","viewBoxLens","printViewBox","rectEq"], _sl99);
  $def("sl100", "test_putput_skip_rule_corner", ["arb","mulberry32","NUM_RUNS","viewBoxLens","transformLens","rectEq","matEq","parseTransform"], _sl100);
  $def("sl101", "test_applyPoint_screen_roundtrip", ["forAll","arb","mulberry32","NUM_RUNS","applyPoint","invert","multiply","IDENTITY","matApproxEq"], _sl101);
  $def("sl101b", "test_translateLens_laws", ["checkLens","translateLens","arb","mulberry32","NUM_RUNS","forAll","transformLens","matEq"], _sl101b);
  $def("sl102", "test_literalLens_laws", ["checkLens","literalLens","arb","mulberry32","NUM_RUNS"], _sl102);
  $def("sl103", "test_attrTextLens_laws", ["checkLens","attrTextLens","arb","mulberry32","NUM_RUNS"], _sl103);
  $def("sl104", "test_cellSourceLens_laws", ["checkLens","compose","cellAttrLens","transformLens","arb","mulberry32","NUM_RUNS","matEq"], _sl104);
  $def("sl105", "test_source_residue_preserved", ["forAll","arb","mulberry32","NUM_RUNS","literalLens","cellAttrLens","literalSpan"], _sl105);
  $def("sl106", "test_childrenLens_laws", ["forAll","lensLaws","childrenLens","arb","mulberry32","NUM_RUNS"], _sl106);
  $def("sl107", "test_structural_commands", ["forAll","arb","mulberry32","NUM_RUNS","childrenLens","insertElement","deleteElement","reorderElement"], _sl107);
  $def("sl108", "test_point_commands", ["forAll","arb","mulberry32","NUM_RUNS","insertPoint","deletePoint","nodeAt","attrVal","parsePoints"], _sl108);
  $def("sl108b", "test_nearestSegment", ["nearestSegment"], _sl108b);
  $def("sl108e", "test_opsLens_laws", ["forAll","lensLaws","opsLens","arb","mulberry32","NUM_RUNS","printOp"], _sl108e);
  $def("sl108f", "test_transform_gizmo", ["forAll","arb","mulberry32","NUM_RUNS","rotateAbout","scaleAbout","printOp","parseTransform","applyPoint"], _sl108f);
  $def("sl108g", "test_commands_commute", ["forAll","arb","mulberry32","NUM_RUNS","tokenize","attrTextLens"], _sl108g);
  $def("sl119e", "test_scoped_path", ["forAll","arb","mulberry32","NUM_RUNS","scopedPath"], _sl119e);
  $def("sl113t", "test_shape_registry", ["forAll","arb","mulberry32","NUM_RUNS","scaleAbout","printOp","parseTransform","applyPoint","svgShapes","shapeLookup","attrTextLens"], _sl113t);
  $def("sl125t", "test_shape_creation", ["forAll","arb","mulberry32","NUM_RUNS","dragBox","shapeSpec","shapeMarkup","insertElement","childrenLens","attrVal","nodeAt"], _sl125t);
  $def("sl74t", "test_domain_boundary", ["outsideDomain","parseDoc","tokenize","childrenLens"], _sl74t);
  $def("sl31t", "test_units_and_style", ["forAll","arb","mulberry32","NUM_RUNS","lengthLens","parseLength","printLength","styleLens","parseStyle","setProperty"], _sl31t);
  $def("sl71t", "test_interpolation_slots", ["holeSpans","slotsOf","mergeInterpolated","literalSpan","literalLens"], _sl71t);
  $def("sl74u", "test_refs", ["refsOf","pathOfId"], _sl74u);
  $def("sl303t", "test_gradient_stops", ["svgFields","cmdStop","nodeAt"], _sl303t);
  $def("sl304t", "test_gradient_gizmo", ["gradientGizmo"], _sl304t);
  $def("sl127t", "test_snapRects", ["forAll","arb","mulberry32","NUM_RUNS","snapRects"], _sl127t);
  $def("sl119u", "test_topmost_selection", ["topmostPaths"], _sl119u);
  $def("sl119t", "test_z_order", ["forAll","arb","mulberry32","NUM_RUNS","zTarget","reorderElement","childrenLens"], _sl119t);
  $def("sl126t", "test_pen_path", ["penPath","parsePath","printPath","pathSegments","pointOnSegment"], _sl126t);
  $def("sl108d", "test_path_subdivision_exact", ["forAll","arb","mulberry32","NUM_RUNS","parsePath","printPath","pathSegments","pointOnSegment","splitPathSegment","deletePathAnchor"], _sl108d);
  $def("sl108c", "test_rebasePath", ["forAll","arb","mulberry32","NUM_RUNS","rebasePath","nodeAt","childrenLens","insertElement","deleteElement","reorderElement"], _sl108c);
  $def("sl252", "test_group_ungroup", ["forAll","arb","mulberry32","NUM_RUNS","groupPlan","groupElements","ungroupElements","ungroupBlockers","childrenLens","nodeAt","cmdGroup"], _sl252);
  $def("sl257", "test_rebase_vertex", ["forAll","arb","mulberry32","NUM_RUNS","vertexAddress","rebaseVertex","pointsHandles","pathHandles","insertPoint","deletePoint","insertPathPoint","deletePathPoint","parsePoints","pathSegments","parsePath","attrVal"], _sl257);
  $def("sl253", "test_copy_paste", ["forAll","arb","mulberry32","NUM_RUNS","copyMarkup","pasteMarkup","freshenIds","idsIn","childrenLens","nodeAt","cmdPaste","offsetMarkup"], _sl253);
  $def("sl262", "test_path_smooth", ["forAll","arb","mulberry32","NUM_RUNS","pathSmooth","pathHandles","parsePath","pathSegments","attrVal"], _sl262);
  $def("sl254", "test_align_commands", ["cmdAlign","cmdDistribute","alignSpecs","gestureDelta"], _sl254);
  $def("sl109b", "test_parse_vs_DOMParser", ["parseDoc","outsideDomain","attrVal","tokenize"], _sl109b);
  $def("sl20", "coreHeader", ["md"], _sl20);
  $def("sl21", "lens", [], _sl21);
  $def("sl22", "compose", [], _sl22);
  $def("sl23", "isoToLens", ["lens"], _sl23);
  $def("sl24", "lensLaws", [], _sl24);
  $def("sl25", "isoLaws", [], _sl25);
  $def("sl30", "svgHeader", ["md"], _sl30);
  $def("sl31", "parseNumList", [], _sl31);
  $def("sl32", "parseViewBox", ["parseNumList"], _sl32);
  $def("sl33", "printViewBox", [], _sl33);
  $def("sl34", "rectEq", [], _sl34);
  $def("sl35", "viewBoxLens", ["lens","parseViewBox","rectEq","printViewBox"], _sl35);
  $def("sl36", "parsePoints", ["parseNumList"], _sl36);
  $def("sl37", "printPoints", [], _sl37);
  $def("sl38", "pointsEq", [], _sl38);
  $def("sl39", "pointsLens", ["lens","parsePoints","pointsEq","printPoints"], _sl39);
  $def("sl283", "hMatrices", ["md"], _sl283);
  $def("sl40", "IDENTITY", [], _sl40);
  $def("sl41", "matEq", [], _sl41);
  $def("sl42", "multiply", [], _sl42);
  $def("sl43", "applyPoint", [], _sl43);
  $def("sl44", "ctmMat", [], _sl44);
  $def("sl45", "opToMat", ["multiply"], _sl45);
  $def("sl284", "hTransforms", ["md"], _sl284);
  $def("sl46", "parseTransform", ["IDENTITY","multiply","opToMat","parseNumList"], _sl46);
  $def("sl47", "printTransform", [], _sl47);
  $def("sl48", "transformLens", ["lens","parseTransform","matEq","printTransform"], _sl48);
  $def("sl48b", "parseTransformOps", ["parseNumList"], _sl48b);
  $def("sl48c", "translateLens", ["lens","parseTransformOps"], _sl48c);
  $def("sl48d", "printOp", [], _sl48d);
  $def("sl48e", "opsLens", ["lens","parseTransformOps","printOp"], _sl48e);
  $def("sl48f", "opSlot", [], _sl48f);
  $def("sl48j", "holdFixed", ["parseTransform","applyPoint","printOp"], _sl48j);
  $def("sl48k", "setGizmoOp", ["opSlot","opToMat","multiply","applyPoint","IDENTITY"], _sl48k);
  $def("sl48h", "rotateAbout", ["setGizmoOp","holdFixed"], _sl48h);
  $def("sl48i", "scaleAbout", ["setGizmoOp","holdFixed"], _sl48i);
  $def("sl48m", "rotateHandle", [], _sl48m);
  $def("sl48g", "transformHandles", ["rotateHandle"], _sl48g);
  $def("sl285", "hInverse", ["md"], _sl285);
  $def("sl49", "det", [], _sl49);
  $def("sl50", "invert", ["det"], _sl50);
  $def("sl51", "invertIso", ["invert"], _sl51);
  $def("sl52", "matApproxEq", [], _sl52);
  $def("sl53", "nodeEq", [], _sl53);
  $def("sl54", "attr", ["lens"], _sl54);
  $def("sl55", "requiredAttr", ["lens"], _sl55);
  $def("sl56", "child", ["lens"], _sl56);
  $def("sl286", "hPathData", ["md"], _sl286);
  $def("sl57", "PATH_ARG_COUNT", [], _sl57);
  $def("sl58", "pathEq", [], _sl58);
  $def("sl59", "parsePath", ["parseNumList","PATH_ARG_COUNT"], _sl59);
  $def("sl60", "printPath", [], _sl60);
  $def("sl61", "pathLens", ["lens","parsePath","pathEq","printPath"], _sl61);
  $def("sl70", "sourceHeader", ["md"], _sl70);
  $def("sl71", "literalSpan", ["acorn"], _sl71);
  $def("sl72", "literalSafe", ["holeSpans"], _sl72);
  $def("sl73", "literalLens", ["lens","literalSpan","literalSafe"], _sl73);
  $def("sl287", "hTokenizer", ["md"], _sl287);
  $def("sl74a", "scan", [], _sl74a);
  $def("sl74e", "outsideDomain", ["scan"], _sl74e);
  $def("sl74", "tokenize", ["scan","outsideDomain"], _sl74);
  $def("sl74b", "parseDoc", ["scan","outsideDomain"], _sl74b);
  $def("sl74c", "nodeAt", ["parseDoc"], _sl74c);
  $def("sl74d", "pathOfIndex", ["parseDoc"], _sl74d);
  $def("sl288", "hAttrLenses", ["md"], _sl288);
  $def("sl75", "attrVal", ["tokenize"], _sl75);
  $def("sl75a", "effectiveAttr", ["attrVal", "holeSpans"], _sl75a);
  $def("sl76", "spliceAttr", ["tokenize"], _sl76);
  $def("sl77", "attrTextLens", ["lens","attrVal","spliceAttr"], _sl77);
  $def("sl74f", "pathOfId", ["parseDoc"], _sl74f);
  $def("sl74g", "refsOf", ["parseDoc","nodeAt","pathOfId"], _sl74g);
  $def("sl31b", "parseLength", [], _sl31b);
  $def("sl31c", "printLength", [], _sl31c);
  $def("sl31d", "lengthLens", ["lens","parseLength","printLength"], _sl31d);
  $def("sl31e", "parseStyle", [], _sl31e);
  $def("sl31f", "printStyle", [], _sl31f);
  $def("sl31g", "styleLens", ["lens","parseStyle","printStyle"], _sl31g);
  $def("sl31h", "setProperty", ["attrVal","styleLens"], _sl31h);
  $def("sl289", "hFields", ["md"], _sl289);
  $def("sl270", "svgFields", ["attrVal","styleLens"], _sl270);
  $def("sl78", "cellAttrLens", ["compose","literalLens","attrTextLens"], _sl78);
  $def("sl290", "hStructural", ["md"], _sl290);
  $def("sl79", "childrenLens", ["lens","nodeAt","parseDoc"], _sl79);
  $def("sl79a", "insertElement", ["childrenLens"], _sl79a);
  $def("sl79b", "deleteElement", ["childrenLens"], _sl79b);
  $def("sl79c", "reorderElement", ["childrenLens"], _sl79c);
  $def("sl275", "mintId", ["idsIn"], _sl275);
  $def("sl276", "defsInsert", ["nodeAt","insertElement"], _sl276);
  $def("sl79xa", "groupPlan", [], _sl79xa);
  $def("sl79xb", "groupElements", ["childrenLens","groupPlan","nodeAt"], _sl79xb);
  $def("sl79xc", "ungroupBlockers", ["nodeAt"], _sl79xc);
  $def("sl79xd", "ungroupElements", ["nodeAt","ungroupBlockers","attrTextLens"], _sl79xd);
  $def("sl79xe", "copyMarkup", ["nodeAt"], _sl79xe);
  $def("sl79xf", "idsIn", ["parseDoc"], _sl79xf);
  $def("sl79xg", "freshenIds", ["idsIn"], _sl79xg);
  $def("sl79xh", "pasteMarkup", ["childrenLens","idsIn","freshenIds"], _sl79xh);
  $def("sl79xi", "offsetMarkup", ["compose","attrTextLens","translateLens"], _sl79xi);
  $def("sl79xj", "rebaseMoves", ["rebasePath"], _sl79xj);
  $def("sl291", "hPathGeometry", ["md"], _sl291);
  $def("sl79d", "insertPoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79d);
  $def("sl79e", "deletePoint", ["nodeAt","attrTextLens","parsePoints","printPoints"], _sl79e);
  $def("sl79f", "nearestSegment", [], _sl79f);
  $def("sl79g", "rebasePath", [], _sl79g);
  $def("sl255", "vertexAddress", [], _sl255);
  $def("sl256", "rebaseVertex", ["rebasePath"], _sl256);
  $def("sl79h", "pathSegments", ["PATH_ARG_COUNT"], _sl79h);
  $def("sl79i", "pointOnSegment", [], _sl79i);
  $def("sl79j", "replaceGroup", ["PATH_ARG_COUNT"], _sl79j);
  $def("sl79k", "absoluteGroup", ["replaceGroup"], _sl79k);
  $def("sl79l", "splitPathSegment", ["pathSegments","replaceGroup","absoluteGroup"], _sl79l);
  $def("sl79m", "deletePathAnchor", ["pathSegments","replaceGroup","absoluteGroup"], _sl79m);
  $def("sl79n", "nearestPathSegment", ["pointOnSegment"], _sl79n);
  $def("sl79o", "insertPathPoint", ["nodeAt","attrTextLens","parsePath","printPath","splitPathSegment"], _sl79o);
  $def("sl79p", "deletePathPoint", ["nodeAt","attrTextLens","parsePath","printPath","deletePathAnchor"], _sl79p);
  $def("sl110", "manipulationHeader", ["md","ref"], _sl110);
  $def("sl292", "hHandles", ["md"], _sl292);
  $def("sl111", "pointsHandles", ["parsePoints","attrVal"], _sl111);
  $def("sl112", "pathHandles", ["parsePath","attrVal","PATH_ARG_COUNT"], _sl112);
  $def("sl293", "hShapeRegistry", ["md"], _sl293);
  $def("sl113a", "numAttr", ["attrVal"], _sl113a);
  $def("sl113b", "numText", [], _sl113b);
  $def("sl113c", "geomOf", ["numAttr"], _sl113c);
  $def("sl113p", "shapePoints", ["pointsHandles","parsePoints","attrVal","printPoints"], _sl113p);
  $def("sl113d", "shapePath", ["pathHandles","parsePath","attrVal","printPath"], _sl113d);
  $def("sl113i", "rxInset", [], _sl113i);
  $def("sl113e", "shapeRect", ["geomOf","numText","rxInset"], _sl113e);
  $def("sl113f", "shapeCircle", ["geomOf","numText"], _sl113f);
  $def("sl113g", "shapeEllipse", ["geomOf","numText"], _sl113g);
  $def("sl113h", "shapeLine", ["geomOf","numText"], _sl113h);
  $def("sl113r", "svgShapes", ["shapePoints","shapePath","shapeRect","shapeCircle","shapeEllipse","shapeLine"], _sl113r);
  $def("sl113s2", "shapeLookup", [], _sl113s2);
  $def("sl113", "handleEdit", ["svgShapes","shapeLookup"], _sl113);
  $def("sl294", "hPieces", ["md"], _sl294);
  $def("sl116", "svgTarget", ["runtime","literalSpan"], _sl116);
  $def("sl71b", "holeSpans", [], _sl71b);
  $def("sl71c", "slotsOf", ["holeSpans"], _sl71c);
  $def("sl71d", "mergeInterpolated", ["slotsOf"], _sl71d);
  $def("sl117s", "settle", [], _sl117s);
  $def("sl117", "svgWriter", ["runtime","realize","settle","literalLens","cellAttrLens","compose","attrVal","literalSpan","holeSpans","slotsOf","mergeInterpolated"], _sl117);
  $def("sl118", "svgOverlay", [], _sl118);
  $def("sl119a", "boxInRoot", [], _sl119a);
  $def("sl119c", "topmostPaths", [], _sl119c);
  $def("sl119b", "zTarget", [], _sl119b);
  $def("sl119", "svgFocus", ["shapeLookup","svgShapes","transformHandles","rotateHandle","nodeAt","boxInRoot","topmostPaths","attrVal","holeSpans","vertexAddress"], _sl119);
  $def("sl295", "hDelta", ["md"], _sl295);
  $def("sl124c", "grabPointer", [], _sl124c);
  $def("sl128", "gestureDelta", [], _sl128);
  $def("sl128a", "previewDelta", ["gestureDelta"], _sl128a);
  $def("sl128b", "commitDelta", [], _sl128b);
  $def("sl128c", "revertDelta", [], _sl128c);
  $def("sl296", "hTools", ["md"], _sl296);
  $def("sl267", "moveVertices", ["vertexAddress","parsePath","printPath","parsePoints","printPoints","attrVal","PATH_ARG_COUNT"], _sl267);
  $def("sl120", "toolVertex", ["handleEdit","shapeLookup","grabPointer","gestureDelta","previewDelta","commitDelta","revertDelta","vertexAddress","pathSmooth","moveVertices","dragBox"], _sl120);
  $def("sl119d", "scopedPath", [], _sl119d);
  $def("sl121a", "hitTest", [], _sl121a);
  $def("sl127", "snapRects", [], _sl127);
  $def("sl251", "moveTargetOf", ["invert","ctmMat","translateLens","shapeLookup"], _sl251);
  $def("sl263", "moveDeltas", ["gestureDelta","translateLens","attrVal"], _sl263);
  $def("sl121", "toolMove", ["translateLens","attrVal","invert","ctmMat","shapeLookup","pathOfIndex","grabPointer","snapRects","gestureDelta","previewDelta","commitDelta","revertDelta","moveTargetOf","moveDeltas","copyMarkup","offsetMarkup","pasteMarkup"], _sl121);
  $def("sl125z", "toolZoom", ["grabPointer"], _sl125z);
  $def("sl122b", "toolScope", ["pathOfIndex","scopedPath","shapeLookup","gestureDelta","commitDelta"], _sl122b);
  $def("sl121b", "toolMarquee", ["pathOfIndex","scopedPath","grabPointer","dragBox","gestureDelta","commitDelta"], _sl121b);
  $def("sl122", "toolStructure", ["insertElement","insertPoint","cmdDeleteVertex","nearestSegment","pointsHandles","parsePoints","attrVal","childrenLens","rebasePath","pathHandles","parsePath","pathSegments","nearestPathSegment","insertPathPoint","gestureDelta","commitDelta"], _sl122);
  $def("sl124", "toolTransform", ["opsLens","rotateAbout","scaleAbout","grabPointer","gestureDelta","previewDelta","commitDelta","revertDelta"], _sl124);
  $def("sl125a", "dragBox", [], _sl125a);
  $def("sl125b", "shapeSpec", ["dragBox"], _sl125b);
  $def("sl125c", "shapeMarkup", ["shapeSpec"], _sl125c);
  $def("sl125d", "penPath", [], _sl125d);
  $def("sl125", "toolDraw", ["shapeLookup","shapeSpec","shapeMarkup","dragBox","grabPointer","gestureDelta","previewDelta","commitDelta"], _sl125);
  $def("sl126", "toolPen", ["penPath","attrVal","nodeAt","grabPointer","gestureDelta","previewDelta","commitDelta","pathHandles","pathOfIndex"], _sl126);
  $def("sl268", "fitCurve", [], _sl268);
  $def("sl269", "toolScribble", ["fitCurve","grabPointer","gestureDelta","previewDelta","commitDelta"], _sl269);
  $def("sl297", "hHarness", ["md"], _sl297);
  $def("sl130", "gestureFixture", ["runtime","realize","settle","literalSpan","nodeAt","svgLens","svg"], _sl130);
  $def("sl131", "playGesture", [], _sl131);
  $def("sl132", "gestureCorpus", [], _sl132);
  $def("sl133", "withFixture", ["gestureFixture"], _sl133);
  $def("sl134", "test_gesture_identity", ["withFixture","gestureCorpus","playGesture","domShape"], _sl134);
  $def("sl135", "test_gesture_path_independence", ["withFixture","gestureCorpus","playGesture"], _sl135);
  $def("sl136", "test_gesture_commits_against_its_origin", ["withFixture","gestureCorpus","playGesture","nodeAt"], _sl136);
  $def("sl137", "test_gesture_confinement", ["withFixture","gestureCorpus","playGesture","svgTools"], _sl137);
  $def("sl138", "test_gesture_selection_is_not_an_edit", ["withFixture","gestureCorpus","playGesture","toolMarquee"], _sl138);
  $def("sl144", "test_tools_measure_through_ctx", ["toolAffordance","toolDraw","toolPen","toolScribble","toolTransform","toolVertex","toolMove","toolMarquee","toolScope","toolZoom","toolStructure","toolHover"], _sl144);
  $def("sl143", "test_tools_write_through_the_delta", ["toolAffordance","toolDraw","toolPen","toolScribble","toolTransform","toolVertex","toolMove","toolMarquee","toolScope","toolZoom","toolStructure","toolHover"], _sl143);
  $def("sl140a", "domShape", [], _sl140a);
  $def("sl140", "test_gesture_render_consistency", ["withFixture","gestureCorpus","playGesture","domShape"], _sl140);
  $def("sl141", "test_gesture_rebase_agreement", ["withFixture","gestureCorpus","nodeAt","childrenLens","insertPoint"], _sl141);
  $def("sl142", "test_gesture_partiality", ["withFixture","gestureCorpus","playGesture"], _sl142);
  $def("sl146", "test_gesture_view_is_not_an_edit", ["withFixture","gestureCorpus","playGesture"], _sl146);
  $def("sl145", "test_gesture_hit_agreement", ["withFixture","gestureCorpus","playGesture","boxInRoot"], _sl145);
  $def("sl139", "gestureLaws", ["test_gesture_identity","test_gesture_path_independence","test_gesture_commits_against_its_origin","test_gesture_render_consistency","test_gesture_confinement","test_gesture_rebase_agreement","test_gesture_partiality","test_gesture_selection_is_not_an_edit","test_gesture_hit_agreement","test_gesture_view_is_not_an_edit"], _sl139);
  $def("sl274", "frameBudget", ["withFixture","gestureCorpus","playGesture"], _sl274);
  $def("sl298", "hCommands", ["md"], _sl298);
  $def("sl127h", "toolHover", ["gestureDelta","previewDelta"], _sl127h);
  $def("sl123", "viewof svgTools", ["Inputs","toolAffordance","toolDraw","toolPen","toolScribble","toolTransform","toolVertex","toolMove","toolMarquee","toolScope","toolZoom","toolStructure","toolHover"], _sl123);
  $def("sl273", "toolAffordance", ["grabPointer","previewDelta","gestureDelta","revertDelta"], _sl273);
  $def("sl240", "cmdGroup", ["gestureDelta","groupPlan","groupElements","rebaseMoves"], _sl240);
  $def("sl241", "cmdUngroup", ["gestureDelta","ungroupBlockers","ungroupElements","childrenLens","rebaseMoves"], _sl241);
  $def("sl301", "pasteInto", ["gestureDelta","offsetMarkup","pasteMarkup"], _sl301);
  $def("sl242", "cmdDuplicate", ["copyMarkup","pasteInto"], _sl242);
  $def("sl243", "cmdCopy", ["gestureDelta","copyMarkup"], _sl243);
  $def("sl244", "cmdCut", ["gestureDelta","copyMarkup","deleteElement","rebasePath"], _sl244);
  $def("sl245", "cmdPaste", ["pasteInto"], _sl245);
  $def("sl246", "alignSpecs", [], _sl246);
  $def("sl247", "cmdAlign", ["moveDeltas"], _sl247);
  $def("sl248", "cmdDistribute", ["moveDeltas"], _sl248);
  $def("sl260", "pathSmooth", ["parsePath","printPath","pathHandles","pathSegments","attrVal","attrTextLens","nodeAt","replaceGroup"], _sl260);
  $def("sl261", "cmdToggleSmooth", ["gestureDelta","pathSmooth","pathHandles","nodeAt"], _sl261);
  $def("sl258", "cmdDeleteVertex", ["gestureDelta","attrVal","parsePoints","parsePath","pathSegments","pathHandles","deletePoint","deletePathPoint"], _sl258);
  $def("sl259", "cmdClosePath", ["gestureDelta","attrVal","attrTextLens","nodeAt"], _sl259);
  $def("sl264", "cmdSelect", ["gestureDelta","nodeAt"], _sl264);
  $def("sl265", "pathConvert", ["pathSegments","replaceGroup","absoluteGroup"], _sl265);
  $def("sl266", "cmdConvertSegment", ["gestureDelta","attrVal","parsePath","printPath","pathSegments","pathHandles","attrTextLens","nodeAt","pathConvert"], _sl266);
  $def("sl300", "defsCommand", ["gestureDelta","nodeAt","attrVal","setProperty","attrTextLens","mintId","defsInsert"], _sl300);
  $def("sl277", "cmdAddGradient", ["defsCommand"], _sl277);
  $def("sl278", "cmdAddMarker", ["defsCommand"], _sl278);
  $def("sl302", "cmdStop", ["gestureDelta","nodeAt","insertElement","deleteElement"], _sl302);
  $def("sl304", "gradientGizmo", [], _sl304);
  $def("sl250", "svgCommands", ["cmdGroup","cmdUngroup","cmdDuplicate","cmdCopy","cmdCut","cmdPaste","cmdAlign","cmdDistribute","alignSpecs","cmdDeleteVertex","cmdClosePath","cmdToggleSmooth","cmdSelect","cmdConvertSegment","cmdAddGradient","cmdAddMarker","cmdStop"], _sl250);
  $def("sl272", "svgAffordances", ["gestureDelta","previewDelta","setProperty","nodeAt"], _sl272);
  $def("sl249", "commandLookup", [], _sl249);
  $def("sl123v", "svgTools", ["Generators","viewof svgTools"], _sl123v);
  $def("sl299", "hAssembly", ["md"], _sl299);
  $def("sl113s", "lensState", [], _sl113s);
  $def("sl114", "svgLens", ["lensState","svgTarget","svgWriter","svgOverlay","svgFocus","svgTools","svgShapes","svgCommands","svgFields","svgAffordances","commandLookup","copyMarkup","moveTargetOf","commitDelta","rebaseVertex","invert","applyPoint","ctmMat","insertElement","deleteElement","reorderElement","rebasePath","childrenLens","zTarget","attrVal","effectiveAttr","translateLens","nodeAt","setProperty","refsOf","boxInRoot","hitTest","scopedPath","pathOfIndex","parseViewBox","printViewBox","gradientGizmo","attrTextLens"], _sl114);

  // The bench cells — their live nodes are shown by `workbench` (the snap-grid at the top); these
  // definitions render only their value-rows here in the appendix.
  $def("sl02", "viewof drawing", ["svgLens","svg"], _sl02);
  $def("sl03", "drawing", ["Generators","viewof drawing"], _sl03);
  $def("sl02b", "toolbar", ["htl","invalidation","viewof drawing"], _sl02b);
  $def("sl02c", "inspector", ["htl","Inputs","invalidation","svgFields","viewof drawing"], _sl02c);
  $def("sl271", "fieldPanel", ["htl","Inputs","invalidation","viewof drawing"], _sl271);
  $def("sl306", "drawingCode", ["cellEditor","lookupVariable","svgLensModule"], _sl306);

  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  // Prose is click-to-edit, as in @tomlarkworthy/lopecode-live-2026.
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("realize", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("realize", _));
  main.define("acorn", ["module @tomlarkworthy/acorn-8-11-3", "@variable"], (_, v) => v.import("acorn", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));
  // The download link: exporter-3 projects this live runtime back into a file.
  main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
  main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
  main.define("cellEditor", ["module @tomlarkworthy/editor-5", "@variable"], (_, v) => v.import("cellEditor", _));
  return main;
}
