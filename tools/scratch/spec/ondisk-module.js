const _spec_0_0 = function _anonymous(md) {return (md`# Ordinal diagram`);};
const _spec_1_0 = function _opening(md) {return (md`A diagram that is a view over a relational snapshot rather than a drawing. Every box is a row and every line is a row; each axis is an ordered list of levels taken from the data, so position means something ordinal (layer, depth along calls, time) and folding a level collapses its rows into one span bar with the edges lifted onto it. Hand edits never change the data: a drag writes a fractional key into an overlay table that the layout uses as a tie break. The prototype below runs the engine on an illustrative snapshot of the Cloud Brain request path.`);};
const _spec_2_0 = function _specStatus(sticky,Inputs) {return (sticky(Inputs.select(["draft", "in review", "approved for handover"], { label: "Status", value: "draft" }), "draft"));};
const _spec_2_1 = (G, _) => G.input(_);
const _spec_3_0 = function _readiness(annotations,specModule,requirements,questions,states,specStatus,htl) {
  const notes = (annotations || []).filter((a) => a.home === specModule || (a.anchor && a.anchor.module === specModule));
  const unchecked = requirements.filter((r) => !r.check || /^<.*>$/.test(r.check.trim()));
  const blocking = questions.filter((q) => q.blocking && !q.answer);
  const undrawn = states.filter((s) => !s.drawing);
  const items = [
    [notes.length, "annotations to resolve"],
    [blocking.length, "blocking questions open"],
    [unchecked.length, `of ${requirements.length} requirements without a check`],
    [undrawn.length, `of ${states.length} states without a drawing`]
  ];
  const ready = items.every(([n]) => n === 0) && specStatus === "approved for handover";
  // Everything that still needs the reviewer, listed here with a link to where it is answered.
  const open = questions.map((q, i) => ({ q, i })).filter(({ q }) => !q.answer);
  const todo = [
    ...open.filter(({ q }) => q.blocking).map(({ q, i }) => ({ tag: "blocking question", text: q.q, to: `[data-question="${i}"]` })),
    ...open.filter(({ q }) => !q.blocking).map(({ q, i }) => ({ tag: "open question", text: q.q, to: `[data-question="${i}"]` })),
    ...unchecked.map((r) => ({ tag: "no check", text: `${r.id} ${r.text}`, to: `[data-requirement="${r.id}"]` })),
    ...undrawn.map((s) => ({ tag: "not drawn", text: `state: ${s.state}`, to: `[data-state="${s.state}"]` }))
  ];
  const box = htl.html`<div style="font:13px system-ui;padding:.5em .8em;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px"></div>`;
  // Scrolls the pane; a plain #fragment link would replace the lopepage layout hash.
  const jump = (to) => (e) => {
    e.preventDefault();
    const el = (box.closest(".lp2-pane") || box.ownerDocument).querySelector(to);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (el.animate) el.animate([{ background: "color-mix(in srgb, currentColor 22%, transparent)" }, { background: "transparent" }], 1800);
  };
  const short = (s) => (s.length > 110 ? s.slice(0, 110) + "…" : s);
  box.append(htl.html`<div style="display:flex;gap:1.2em;flex-wrap:wrap;align-items:baseline">
    <strong>${ready ? "Ready to hand over" : "Not ready to hand over"}</strong>
    ${items.map(([n, label]) => htl.html`<span style=${{ opacity: n ? 1 : 0.5 }}><strong>${n}</strong> ${label}</span>`)}
  </div>`);
  if (todo.length) box.append(htl.html`<ol style="margin:.5em 0 0;padding-left:1.4em">${todo.map((t) => htl.html`<li><a href="#" onclick=${jump(t.to)}>${t.tag}</a>: ${short(t.text)}</li>`)}</ol>`);
  return box;
};
const _spec_4_0 = function _anonymous(md) {return (md`## Reviewing this spec

- **Leave a note**: ☰ → Annotate → Note, then drag over the words or click the shape. Notes are review comments; Claude Code works through them, and you delete each when it is dealt with.
- **Ask about a spot**: ☰ → Annotate → Ask, then pick the words or shape and type. The answer threads at that spot.
- **Click prose** to rewrite it. **Drag shapes** in a drawing to move them.
- **Play with the prototype**: click a label in its left margin to fold or unfold that level; drag a box sideways to reorder it inside its cell.
- ☰ → **Save in place** keeps your edits and notes in this file.`);};
const _spec_5_0 = function _anonymous(md) {return (md`## Problem

Tom, 2026-10-25: "I think a diagram should be something close to an ontology. So the links and nodes map to something real, but we don't want a diagram to show everything, rather it has views, and the concept of expansions and compaction, like a 'details' but it folds elements up, so you can have a high level and/or a focus of a real system. The axis need to mean something ordinal, like Y is time, or Y is complexity."

Drawn diagrams (svg-lens, mermaid-lens in this corpus) store coordinates. A box placed by hand says nothing about the system, goes stale when the system changes, and there is no way to ask for the same picture one level up.`);};
const _spec_6_0 = function _anonymous(md) {return (md`## Outcome

- Given a snapshot (a named map of arrays of fixed-shape rows) and a view (SQL plus a level list per axis), the diagram is drawn with no hand placement.
- The same snapshot, view, folds and overlay give a byte-identical SVG, whatever order the snapshot rows arrive in.
- One snapshot is drawn through several views at once (call graph, compute, compute × layer), each with its own folds and order; hovering a box highlights the same row in every view.
- Clicking a level label folds every row under it into one span bar; edges crossing the fold are lifted onto the bar with a count.
- Dragging a box reorders it inside its cell by writing a fractional key to the overlay table; the snapshot tables are not modified.
- Rows with no value for an axis level are left out and counted.`);};
const _spec_7_0 = function _anonymous(md) {return (md`### Size

Not estimated. The engine below (layout, poset ranks, fold, lift, fractional keys, SVG) is about 300 lines and was written and tested in one session on 2026-10-26. A module with the open questions settled is more than that.`);};
const _spec_8_0 = function _anonymous(md) {return (md`## Scope

### Not your concern, do not build it

- Live data from the Cloud Brain or any endpoint. The input is a snapshot.
- A schema or vocabulary for architecture (service, store, calls…). The tool is schema-agnostic.
- Freehand drawing; that is svg-lens.
- Mermaid output; that is mermaid-lens.
- Editing the snapshot from the diagram.

### Non-goals

- Numeric axes. Levels are ordinal so they can fold; a numeric scale cannot collapse.
- A force-directed or optimising solver. The layout must be deterministic (Tom, 2026-10-26), and the ordinal levels leave nothing continuous to optimise.
- Edge routing around boxes. Edges are drawn as curves between box sides.`);};
const _spec_9_0 = function _anonymous(md) {return (md`## Words

The implementer uses these strings as written.`);};
const _spec_10_0 = function _copy_title(md) {return (md`Ordinal diagram`);};
const _spec_11_0 = function _copy_opening(md) {return (md`Each box is a row and each line is a row. Position comes from the axes you pick; folding a level gathers its rows into one bar. Dragging only reorders ties.`);};
const _spec_12_0 = function _copy_strings(md) {return (md`| where | text |
|---|---|
| excluded notice | *N* rows have no value for this view's axes and are not drawn |
| folded group | ▸ *label* · *count* |
| folded group with internal edges | ▸ *label* · *count* · *k* inside |
| lifted edge with more than one | ×*count* |
| cycle outline tooltip | these rows reach each other along *relation*, so they share a rank |
| margin hint | click a label to fold or unfold it · drag a box sideways to reorder it |`);};
const _spec_13_0 = function _anonymous(md) {return (md`## Prototype

The engine runs here on the snapshot below. It is the first implementation and its \`test_*\` cells are the first tests; the same source passes \`bun test tools/scratch/ordinal-diagram/engine.test.js\` (8 tests, 2026-10-27).

**Needs a network connection.** \`sqlRows\` depends on the stdlib \`SQLite\`, which fetches sql.js from cdn.jsdelivr.net. Offline that dependency errors, a cell cannot catch an error in its inputs, and the prototype draws nothing (seen by the 2026-10-27 review with every non-file request aborted). The \`test_*\` cells use \`jsRows\` and still pass. Vendoring sql.js is an open question.`);};
const _spec_14_0 = function _anonymous(md) {return (md`### The snapshot

Illustrative. Component and method names are from \`tools/cloud-brain/rpc-performance.md\` (measured 2026-10-08). The call graph is a sketch, not a trace. \`bluesky.poll → core.route\` is invented so the poset has a cycle, and \`planned cache\` has no layer or compute so the excluded count is not zero. The \`compute\` column (browser, Fly machine, Cloudflare Worker, D1, R2) and \`drain2\` (\`cloud-brain-dev/drain2.ts\`) running on a Fly machine and calling kernel.xrpc were added 2026-10-27 to give the views something to separate; they are illustrative too.`);};
const _spec_15_0 = function _snapshot() {return ({
  "components": [
    {
      "id": "tab",
      "name": "open tab",
      "layer": 0,
      "layer_name": "client",
      "compute": "browser",
      "compute_rank": 0
    },
    {
      "id": "drain",
      "name": "drain2",
      "layer": 0,
      "layer_name": "client",
      "compute": "Fly machine",
      "compute_rank": 1
    },
    {
      "id": "kernel",
      "name": "brain-kernel",
      "layer": 1,
      "layer_name": "edge",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "core",
      "name": "brain-core",
      "layer": 2,
      "layer_name": "core",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "inbox",
      "name": "inbox",
      "layer": 3,
      "layer_name": "services",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "bluesky",
      "name": "bluesky",
      "layer": 3,
      "layer_name": "services",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "secret",
      "name": "secret",
      "layer": 3,
      "layer_name": "services",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "metrics",
      "name": "metrics",
      "layer": 3,
      "layer_name": "services",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "library",
      "name": "library",
      "layer": 3,
      "layer_name": "services",
      "compute": "Cloudflare Worker",
      "compute_rank": 2
    },
    {
      "id": "d1",
      "name": "cb4-sql (D1)",
      "layer": 4,
      "layer_name": "storage",
      "compute": "D1 (SQLite)",
      "compute_rank": 3
    },
    {
      "id": "r2",
      "name": "R2",
      "layer": 4,
      "layer_name": "storage",
      "compute": "R2 (objects)",
      "compute_rank": 4
    },
    {
      "id": "planned",
      "name": "planned cache",
      "layer": null,
      "layer_name": null,
      "compute": null,
      "compute_rank": null
    }
  ],
  "methods": [
    {
      "id": "tab.ui",
      "component": "tab"
    },
    {
      "id": "drain.run",
      "component": "drain"
    },
    {
      "id": "kernel.health",
      "component": "kernel"
    },
    {
      "id": "kernel.session",
      "component": "kernel"
    },
    {
      "id": "kernel.xrpc",
      "component": "kernel"
    },
    {
      "id": "core.route",
      "component": "core"
    },
    {
      "id": "core.decide",
      "component": "core"
    },
    {
      "id": "core.charge",
      "component": "core"
    },
    {
      "id": "inbox.poll",
      "component": "inbox"
    },
    {
      "id": "bluesky.poll",
      "component": "bluesky"
    },
    {
      "id": "secret.get",
      "component": "secret"
    },
    {
      "id": "metrics.query",
      "component": "metrics"
    },
    {
      "id": "library.blobs",
      "component": "library"
    },
    {
      "id": "rows.get",
      "component": "d1"
    },
    {
      "id": "rows.append",
      "component": "d1"
    },
    {
      "id": "r2.get",
      "component": "r2"
    },
    {
      "id": "cache.get",
      "component": "planned"
    }
  ],
  "calls": [
    {
      "caller": "tab.ui",
      "callee": "kernel.xrpc"
    },
    {
      "caller": "drain.run",
      "callee": "kernel.xrpc"
    },
    {
      "caller": "tab.ui",
      "callee": "kernel.session"
    },
    {
      "caller": "tab.ui",
      "callee": "library.blobs"
    },
    {
      "caller": "kernel.xrpc",
      "callee": "rows.get"
    },
    {
      "caller": "kernel.xrpc",
      "callee": "core.route"
    },
    {
      "caller": "core.route",
      "callee": "core.decide"
    },
    {
      "caller": "core.route",
      "callee": "core.charge"
    },
    {
      "caller": "core.charge",
      "callee": "rows.append"
    },
    {
      "caller": "core.charge",
      "callee": "rows.get"
    },
    {
      "caller": "core.route",
      "callee": "inbox.poll"
    },
    {
      "caller": "core.route",
      "callee": "bluesky.poll"
    },
    {
      "caller": "core.route",
      "callee": "metrics.query"
    },
    {
      "caller": "core.route",
      "callee": "secret.get"
    },
    {
      "caller": "bluesky.poll",
      "callee": "core.route"
    },
    {
      "caller": "secret.get",
      "callee": "rows.get"
    },
    {
      "caller": "metrics.query",
      "callee": "rows.get"
    },
    {
      "caller": "library.blobs",
      "callee": "r2.get"
    }
  ],
  "flow_steps": [
    {
      "flow": "inbox.poll path",
      "step": 1,
      "method": "tab.ui"
    },
    {
      "flow": "inbox.poll path",
      "step": 2,
      "method": "kernel.xrpc"
    },
    {
      "flow": "inbox.poll path",
      "step": 3,
      "method": "core.route"
    },
    {
      "flow": "inbox.poll path",
      "step": 4,
      "method": "inbox.poll"
    }
  ]
});};
const _spec_16_0 = function _anonymous(md) {return (md`### The views

One snapshot, three views. A view is the queries below plus a level list per axis. A level is \`{col}\` (a total order on a column) or \`{relation}\` (rank along that relation's edges, a partial order). The human key and then \`id\` are always the last two tie breaks. Each view keeps its own folds and its own order table; hovering a box highlights the same row in every view.`);};
const _spec_17_0 = function _viewSql() {return ({
  "nodes": "SELECT m.id, m.id AS label, c.layer, c.layer_name, c.id AS component, c.name AS component_name, c.compute, c.compute_rank\n          FROM methods m JOIN components c ON m.component = c.id",
  "edges": "SELECT caller AS src, callee AS dst, 'calls' AS rel FROM calls",
  "hulls": "SELECT flow AS hull, method AS id FROM flow_steps"
});};
const _spec_18_0 = function _views() {return ([
  {
    "name": "call graph",
    "y": [
      {
        "col": "layer",
        "label": "layer_name"
      },
      {
        "col": "component",
        "label": "component_name"
      }
    ],
    "x": [
      {
        "relation": "calls"
      }
    ],
    "xTitle": "depth along calls"
  },
  {
    "name": "compute",
    "y": [
      {
        "col": "compute_rank",
        "label": "compute"
      },
      {
        "col": "layer",
        "label": "layer_name"
      },
      {
        "col": "component",
        "label": "component_name"
      }
    ],
    "x": [
      {
        "relation": "calls"
      }
    ],
    "xTitle": "depth along calls"
  },
  {
    "name": "compute × layer",
    "y": [
      {
        "col": "compute_rank",
        "label": "compute"
      }
    ],
    "x": [
      {
        "col": "layer",
        "label": "layer_name"
      }
    ],
    "xTitle": "layer",
    "drawRelations": [],
    "hulls": false
  }
]);};
const _spec_19_0 = async function _sqlRows(SQLite,snapshot,viewSql) {
  // lopecode's stdlib SQLite is the loaded sql.js module (fetched from a CDN), not a factory.
  const SQL = typeof SQLite === "function" ? await SQLite() : SQLite;
  const db = new SQL.Database();
  for (const [table, rows] of Object.entries(snapshot)) {
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].sort();
    db.run(`CREATE TABLE ${table} (${cols.map((c) => `"${c}"`).join(", ")})`);
    const ins = db.prepare(`INSERT INTO ${table} VALUES (${cols.map(() => "?").join(", ")})`);
    for (const r of rows) ins.run(cols.map((c) => (r[c] === undefined ? null : r[c])));
    ins.free();
  }
  const q = (sql) => {
    const [res] = db.exec(sql);
    return res ? res.values.map((v) => Object.fromEntries(res.columns.map((c, i) => [c, v[i]]))) : [];
  };
  const out = { nodes: q(viewSql.nodes), edges: q(viewSql.edges), hulls: q(viewSql.hulls), source: "SQL (sql.js)" };
  db.close();
  return out;
};
const _spec_20_0 = function _jsRows(snapshot) {
  // The view's join in JS, for tests that run without the SQL engine.
  const comp = new Map(snapshot.components.map((c) => [c.id, c]));
  return {
    nodes: snapshot.methods.map((m) => { const c = comp.get(m.component); return { id: m.id, label: m.id, layer: c.layer, layer_name: c.layer_name, component: c.id, component_name: c.name, compute: c.compute, compute_rank: c.compute_rank }; }),
    edges: snapshot.calls.map((c) => ({ src: c.caller, dst: c.callee, rel: "calls" })),
    hulls: snapshot.flow_steps.map((f) => ({ hull: f.flow, id: f.method }))
  };
};
const _spec_21_0 = function _folds(Inputs) {return (Inputs.input({}));};
const _spec_21_1 = (G, _) => G.input(_);
const _spec_22_0 = function _order(Inputs) {return (Inputs.input({}));};
const _spec_22_1 = (G, _) => G.input(_);
const _spec_23_0 = function _axisLabel() {return ((rows, levels, title) => (prefix) => {
  const k = prefix.length - 1, lvl = levels[k];
  if (levels.slice(0, k + 1).some((l) => !l.col)) return `${title} ${prefix.join(" · ")}`;
  const hit = [...rows.nodes].sort((a, b) => (a.id < b.id ? -1 : 1)).find((n) => levels.slice(0, k + 1).every((l, i) => n[l.col] === prefix[i]));
  return hit && lvl.label ? String(hit[lvl.label]) : String(prefix[k]);
});};
const _spec_24_0 = function _focusBus(EventTarget) {return (new EventTarget());};
const _spec_25_0 = function _diagramFor(sqlRows,folds,order,engine,axisLabel,htl,$0,focusBus,$1) {return ((v, invalidation) => {
  const rows = sqlRows;
  const myFolds = folds[v.name] || [], myOrder = order[v.name] || [];
  const L = engine.layout({ view: v, ...rows, order: myOrder, folds: myFolds });
  const { svg, geometry } = engine.render(L, { labelFor: axisLabel(rows, v.y, ""), xLabelFor: axisLabel(rows, v.x, v.xTitle) });
  const host = htl.html`<div style="background:#f6f7f9;color:#111827;border-radius:6px;padding:10px;overflow-x:auto;font:12px system-ui"><div style="font-weight:600;margin-bottom:4px">${v.name}</div></div>`;
  const pic = htl.html`<div></div>`;
  pic.innerHTML = svg;
  host.append(pic);
  host.append(htl.html`<div style="margin-top:6px;opacity:.75">rows from ${rows.source} · click a label to fold or unfold it · drag a box sideways to reorder it · hover a box to find it in the other views${L.excluded.length ? htl.html` · <strong>${L.excluded.length}</strong> rows have no value for this view's axes and are not drawn (${L.excluded.join(", ")})` : ""}</div>`);
  const setInput = (input, value) => { input.value = value; input.dispatchEvent(new window.Event("input", { bubbles: true })); };
  const cellOf = new Map();
  for (const ids of L.cells.values()) for (const id of ids) cellOf.set(id, ids);
  pic.querySelectorAll(".odg-scc").forEach((el) => {
    const t = window.document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = `these rows reach each other along ${el.getAttribute("data-relation")}, so they share a rank`;
    el.append(t);
  });
  pic.querySelectorAll("[data-fold]").forEach((el) => el.addEventListener("click", () => {
    const k = el.getAttribute("data-fold");
    const cur = myFolds.map((f) => JSON.stringify(f));
    const next = cur.includes(k) ? myFolds.filter((f) => JSON.stringify(f) !== k) : [...myFolds, JSON.parse(k)];
    setInput($0, { ...folds, [v.name]: next });
  }));
  // Linked hover: every view highlights the boxes holding any of the hovered ids.
  const idsOf = (el) => (el.getAttribute("data-id") || el.getAttribute("data-members") || "").split(" ").filter(Boolean);
  pic.querySelectorAll(".odg-node, .odg-group").forEach((el) => {
    el.addEventListener("pointerenter", () => focusBus.dispatchEvent(new window.CustomEvent("focus", { detail: idsOf(el) })));
    el.addEventListener("pointerleave", () => focusBus.dispatchEvent(new window.CustomEvent("focus", { detail: [] })));
  });
  const onFocus = (e) => {
    const want = new Set(e.detail);
    pic.querySelectorAll(".odg-node, .odg-group").forEach((el) => {
      const r = el.querySelector("rect");
      const hit = want.size && idsOf(el).some((id) => want.has(id));
      r.setAttribute("stroke-width", hit ? "3" : "1");
      r.setAttribute("stroke", hit ? "#f97316" : el.classList.contains("odg-group") ? "#3b82f6" : "#9ca3af");
    });
  };
  focusBus.addEventListener("focus", onFocus);
  invalidation.then(() => focusBus.removeEventListener("focus", onFocus));
  pic.querySelectorAll(".odg-node").forEach((el) => el.addEventListener("pointerdown", (e) => {
    const id = el.getAttribute("data-id");
    const ids = cellOf.get(id);
    if (!ids || ids.length < 2) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    const svgEl = pic.querySelector("svg");
    const scale = svgEl.viewBox.baseVal.width / svgEl.getBoundingClientRect().width;
    const x0 = e.clientX;
    let dx = 0;
    const move = (m) => { dx = (m.clientX - x0) * scale; el.setAttribute("transform", `translate(${dx},0)`); };
    const done = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
    const cancel = () => { done(); el.removeAttribute("transform"); };
    const up = () => {
      done();
      const centre = (k) => { const b = geometry.box.get(k); return b.x + b.w / 2; };
      const mine = centre(id) + dx;
      const toIndex = ids.filter((o) => o !== id && centre(o) < mine).length;
      if (toIndex === ids.indexOf(id)) { el.removeAttribute("transform"); return; }
      const res = engine.reorder({ order: myOrder, cellIds: ids, id, toIndex });
      setInput($1, { ...order, [v.name]: res.order });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
  }));
  return host;
});};
const _spec_26_0 = function _anonymous(md) {return (md`**View 1: call graph.** Rows are layers, then components; columns are depth along \`calls\`. Read across a row to see a component's methods by how deep in a request they run.`);};
const _spec_27_0 = function _diagram(diagramFor,views,invalidation) {return (diagramFor(views[0], invalidation));};
const _spec_28_0 = function _anonymous(md) {return (md`**View 2: compute.** The same rows and edges, but y is the kind of compute each component runs on, then layer, then component. kernel, core and the five services are one Cloudflare Worker band; fold it to see the browser and the Fly machine call into the Workers, and the Workers call into D1 and R2.`);};
const _spec_29_0 = function _diagram_compute(diagramFor,views,invalidation) {return (diagramFor(views[1], invalidation));};
const _spec_30_0 = function _anonymous(md) {return (md`**View 3: compute × layer.** Both axes are columns, so every method sits in a cell of a grid: which compute serves which layer. No relation decides a position here. The view sets \`drawRelations: []\` and \`hulls: false\`: with every call drawn the grid was unreadable (seen 2026-10-27), and a view choosing what to draw is part of what a view is.`);};
const _spec_31_0 = function _diagram_matrix(diagramFor,views,invalidation) {return (diagramFor(views[2], invalidation));};
const _spec_32_0 = function _orderTable(order,htl,Inputs) {
  const names = Object.keys(order).filter((k) => order[k].length).sort();
  const rows = names.flatMap((k) => order[k].map((o) => ({ view: k, id: o.id, fkey: o.fkey })));
  return htl.html`<div style="font-size:.9em"><strong>Overlay table <code>order</code></strong> (${rows.length} rows across ${names.length} views; held in page memory, not saved)
  ${rows.length ? Inputs.table(rows, { columns: ["view", "id", "fkey"], rows: 8 }) : htl.html`<div><em>empty: drag a box inside a cell with two or more boxes, e.g. the brain-kernel row of the call graph</em></div>`}</div>`;
};
const _spec_33_0 = function _engine() {
// Ordinal diagram engine. Pure functions; every iteration order is sorted so the output is a
// function of the input sets only (row order in the snapshot does not matter).

const cmp = (a, b) => {
  const ta = typeof a, tb = typeof b;
  if (ta !== tb) return ta === "number" ? -1 : tb === "number" ? 1 : ta < tb ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};
const cmpTuple = (a, b) => {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const c = cmp(a[i], b[i]); if (c) return c; }
  return a.length - b.length;
};
const keyOf = (t) => JSON.stringify(t);
const isNil = (v) => v === null || v === undefined;

// --- fractional keys (Greenspan's midpoint, base 36, keys never end in "0") ---
const DIG = "0123456789abcdefghijklmnopqrstuvwxyz";
const midpoint = (a, b) => {
  if (b !== null) {
    let n = 0;
    while ((a[n] || "0") === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const da = a ? DIG.indexOf(a[0]) : 0;
  const db = b !== null ? DIG.indexOf(b[0]) : DIG.length;
  if (db - da > 1) return DIG[Math.floor((da + db) / 2)];
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIG[da] + midpoint(a.slice(1), null);
};
const keyBetween = (a, b) => midpoint(a || "", isNil(b) ? null : b);

// --- poset level: SCC condensation, then longest path from sources ---
const posetRanks = (ids, edges) => {
  const idSet = new Set(ids);
  const out = new Map(ids.map((id) => [id, []]));
  for (const e of edges) if (idSet.has(e.src) && idSet.has(e.dst) && e.src !== e.dst) out.get(e.src).push(e.dst);
  for (const l of out.values()) l.sort(cmp);
  // Tarjan, iterative, visiting ids in sorted order.
  let index = 0;
  const idx = new Map(), low = new Map(), onStack = new Set(), stack = [], comp = new Map();
  for (const root of ids) {
    if (idx.has(root)) continue;
    const work = [[root, 0]];
    idx.set(root, index); low.set(root, index); index++; stack.push(root); onStack.add(root);
    while (work.length) {
      const top = work[work.length - 1];
      const [v, i] = top;
      const succ = out.get(v);
      if (i < succ.length) {
        top[1]++;
        const w = succ[i];
        if (!idx.has(w)) {
          idx.set(w, index); low.set(w, index); index++; stack.push(w); onStack.add(w);
          work.push([w, 0]);
        } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
      } else {
        work.pop();
        if (work.length) { const p = work[work.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(v))); }
        if (low.get(v) === idx.get(v)) {
          const members = [];
          let w;
          do { w = stack.pop(); onStack.delete(w); members.push(w); } while (w !== v);
          members.sort(cmp);
          for (const m of members) comp.set(m, members[0]);
        }
      }
    }
  }
  const comps = [...new Set(ids.map((id) => comp.get(id)))].sort(cmp);
  const cout = new Map(comps.map((c) => [c, new Set()]));
  const indeg = new Map(comps.map((c) => [c, 0]));
  for (const [v, l] of out) for (const w of l) {
    const a = comp.get(v), b = comp.get(w);
    if (a !== b && !cout.get(a).has(b)) { cout.get(a).add(b); indeg.set(b, indeg.get(b) + 1); }
  }
  const rank = new Map(comps.map((c) => [c, 0]));
  let ready = comps.filter((c) => indeg.get(c) === 0);
  while (ready.length) {
    const c = ready.shift();
    for (const d of [...cout.get(c)].sort(cmp)) {
      rank.set(d, Math.max(rank.get(d), rank.get(c) + 1));
      indeg.set(d, indeg.get(d) - 1);
      if (indeg.get(d) === 0) { ready.push(d); ready.sort(cmp); }
    }
  }
  const byComp = new Map();
  for (const id of ids) { const c = comp.get(id); if (!byComp.has(c)) byComp.set(c, []); byComp.get(c).push(id); }
  const sccs = [...byComp.values()].filter((m) => m.length > 1).map((m) => m.sort(cmp)).sort((a, b) => cmp(a[0], b[0]));
  return { rank: new Map(ids.map((id) => [id, rank.get(comp.get(id))])), sccs };
};

// --- layout ---
// view: { y: [level], x: [level], drawRelations?: [rel], hulls?: false }
// level: { col, label? } (total order on a column) or { relation, label? } (poset rank along edges of that relation)
// order: [{ id, fkey }] human scale; folds: [prefix tuple] on the y axis.
const layout = ({ view, nodes, edges = [], hulls = [], order = [], folds = [] }) => {
  const levelsOf = (axis) => view[axis] || [];
  const all = [...nodes].sort((a, b) => cmp(a.id, b.id));
  const included = [], excluded = [];
  for (const n of all) {
    const missing = [...levelsOf("y"), ...levelsOf("x")].some((l) => l.col && isNil(n[l.col]));
    (missing ? excluded : included).push(n);
  }
  const ids = included.map((n) => n.id);
  const byId = new Map(included.map((n) => [n.id, n]));
  const sortedEdges = [...edges].sort((a, b) => cmp(a.src, b.src) || cmp(a.dst, b.dst) || cmp(a.rel, b.rel));
  const ranks = new Map(), sccs = [];
  for (const l of [...levelsOf("y"), ...levelsOf("x")]) if (l.relation && !ranks.has(l.relation)) {
    const r = posetRanks(ids, sortedEdges.filter((e) => e.rel === l.relation));
    ranks.set(l.relation, r.rank);
    for (const s of r.sccs) sccs.push({ relation: l.relation, members: s });
  }
  const val = (n, l) => (l.relation ? ranks.get(l.relation).get(n.id) : n[l.col]);
  const path = (n, axis) => levelsOf(axis).map((l) => val(n, l));
  const fkey = new Map(order.map((o) => [o.id, o.fkey]));
  const tie = (n) => [fkey.has(n.id) ? fkey.get(n.id) : "~", n.id];

  const foldSet = new Set(folds.map(keyOf));
  const rowOf = new Map(), groupOf = new Map();
  for (const n of included) {
    const yp = path(n, "y");
    let row = yp;
    for (let k = 1; k <= yp.length; k++) if (foldSet.has(keyOf(yp.slice(0, k)))) { row = yp.slice(0, k); groupOf.set(n.id, keyOf(row)); break; }
    rowOf.set(n.id, row);
  }
  const rows = [...new Map(included.map((n) => [keyOf(rowOf.get(n.id)), rowOf.get(n.id)])).values()].sort(cmpTuple);
  const rowIndex = new Map(rows.map((r, i) => [keyOf(r), i]));
  const cols = [...new Map(included.map((n) => [keyOf(path(n, "x")), path(n, "x")])).values()].sort(cmpTuple);
  const colIndex = new Map(cols.map((c, i) => [keyOf(c), i]));
  const colOf = (n) => colIndex.get(keyOf(path(n, "x")));

  const items = [];
  const cells = new Map(); // "r,c" -> ordered leaf ids
  for (const n of included) if (!groupOf.has(n.id)) {
    const k = rowIndex.get(keyOf(rowOf.get(n.id))) + "," + colOf(n);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(n);
  }
  const occupancy = new Map();
  const occ = (r, c, w) => { const k = r + "," + c; occupancy.set(k, Math.max(occupancy.get(k) || 0, w)); };
  for (const [k, list] of [...cells].sort((a, b) => cmp(a[0], b[0]))) {
    list.sort((a, b) => cmpTuple(tie(a), tie(b)));
    const [r, c] = k.split(",").map(Number);
    list.forEach((n, slot) => items.push({ kind: "leaf", key: n.id, id: n.id, row: r, col: c, slot, label: String(n.label ?? n.id), node: n }));
    occ(r, c, list.length);
    cells.set(k, list.map((n) => n.id));
  }
  const groups = new Map();
  for (const n of included) if (groupOf.has(n.id)) {
    const g = groupOf.get(n.id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(n);
  }
  for (const [g, members] of [...groups].sort((a, b) => cmp(a[0], b[0]))) {
    const cs = members.map(colOf);
    const colMin = Math.min(...cs), colMax = Math.max(...cs);
    const r = rowIndex.get(g);
    for (let c = colMin; c <= colMax; c++) occ(r, c, 1);
    items.push({ kind: "group", key: g, row: r, colMin, colMax, members: members.map((m) => m.id), label: `${members.length} items` });
  }
  const colWidth = cols.map((_, c) => Math.max(1, ...rows.map((_, r) => occupancy.get(r + "," + c) || 0)));
  const visible = new Map(included.map((n) => [n.id, groupOf.get(n.id) || n.id]));

  const lifted = new Map(), internal = new Map();
  const draw = view.drawRelations ? new Set(view.drawRelations) : null;
  for (const e of sortedEdges) {
    if (!byId.has(e.src) || !byId.has(e.dst) || (draw && !draw.has(e.rel))) continue;
    const s = visible.get(e.src), d = visible.get(e.dst);
    if (s === d) { internal.set(s, (internal.get(s) || 0) + 1); continue; }
    const k = keyOf([s, d, e.rel]);
    lifted.set(k, (lifted.get(k) || 0) + 1);
  }
  const liftedEdges = [...lifted].sort((a, b) => cmp(a[0], b[0])).map(([k, count]) => { const [src, dst, rel] = JSON.parse(k); return { src, dst, rel, count }; });

  const hullMap = new Map();
  for (const h of view.hulls === false ? [] : [...hulls].sort((a, b) => cmp(a.hull, b.hull) || cmp(a.id, b.id))) {
    if (!byId.has(h.id)) continue;
    if (!hullMap.has(h.hull)) hullMap.set(h.hull, new Set());
    hullMap.get(h.hull).add(visible.get(h.id));
  }
  const hullList = [...hullMap].map(([hull, s]) => ({ hull, items: [...s].sort(cmp) }));

  return { rows, cols, colWidth, items, cells, liftedEdges, internal, sccs, hulls: hullList, excluded: excluded.map((n) => n.id), included: ids, view };
};

// --- human scale: a drag inside a cell writes fkeys ---
// Returns the new order table and the rows written. Once every member of the cell has a key,
// a drag writes exactly one row.
const reorder = ({ order, cellIds, id, toIndex }) => {
  const fkey = new Map(order.map((o) => [o.id, o.fkey]));
  const rest = cellIds.filter((x) => x !== id);
  const at = Math.max(0, Math.min(toIndex, rest.length));
  let written;
  if (rest.every((x) => fkey.has(x))) {
    written = [{ id, fkey: keyBetween(at > 0 ? fkey.get(rest[at - 1]) : "", at < rest.length ? fkey.get(rest[at]) : null) }];
  } else {
    const seq = [...rest.slice(0, at), id, ...rest.slice(at)];
    let prev = "";
    written = seq.map((x) => { prev = keyBetween(prev, null); return { id: x, fkey: prev }; });
  }
  const changed = new Set(written.map((w) => w.id));
  const next = [...order.filter((o) => !changed.has(o.id)), ...written].sort((a, b) => cmp(a.id, b.id));
  return { order: next, written };
};

// --- geometry + SVG ---
const geometry = (L, { slot = 118, gap = 26, rowH = 46, boxH = 26, levelW = 118, top = 30 } = {}) => {
  const gutter = levelW * Math.max(1, L.view.y.length);
  const colX = [];
  let x = gutter + 16;
  L.colWidth.forEach((w, c) => { colX[c] = x; x += w * slot + gap; });
  const width = x;
  const rowY = (r) => top + r * rowH;
  const box = new Map();
  for (const it of L.items) {
    const y = rowY(it.row) + (rowH - boxH) / 2;
    if (it.kind === "leaf") box.set(it.key, { x: colX[it.col] + it.slot * slot, y, w: slot - 12, h: boxH });
    else box.set(it.key, { x: colX[it.colMin], y, w: colX[it.colMax] + L.colWidth[it.colMax] * slot - 12 - colX[it.colMin], h: boxH });
  }
  return { gutter, colX, width, height: rowY(L.rows.length) + 24, rowY, box, slot, rowH, levelW, top };
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f1 = (v) => Math.round(v * 10) / 10;

const convexHull = (pts) => {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of [...p].reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
};

// off shifts a path sideways so two opposite edges between the same boxes stay apart.
// over arcs above the row, for an edge whose straight curve would pass behind another box.
const anchors = (a, b, off = 0, over = false, blocked = {}) => {
  const ac = a.x + a.w / 2, bc = b.x + b.w / 2;
  if (over) {
    const x1 = ac + off, x2 = bc + off, y = a.y;
    const lift = 16 + Math.abs(x2 - x1) * 0.12;
    return `M${f1(x1)},${f1(y)} C${f1(x1)},${f1(y - lift)} ${f1(x2)},${f1(y - lift)} ${f1(x2)},${f1(y)}`;
  }
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  if (overlapX || Math.abs(ac - bc) < 1) {
    const x1 = Math.min(Math.max(bc, a.x + 8), a.x + a.w - 8) + off, x2 = Math.min(Math.max(ac, b.x + 8), b.x + b.w - 8) + off;
    const down = b.y > a.y;
    const y1 = down ? a.y + a.h : a.y, y2 = down ? b.y : b.y + b.h;
    const dy = (y2 - y1) / 2;
    return `M${f1(x1)},${f1(y1)} C${f1(x1)},${f1(y1 + dy)} ${f1(x2)},${f1(y2 - dy)} ${f1(x2)},${f1(y2)}`;
  }
  const right = bc > ac, down = b.y > a.y;
  // An end whose row has a box between the two ends leaves or enters through its top or bottom.
  const p1 = blocked.src ? [ac + off, down ? a.y + a.h : a.y] : [right ? a.x + a.w : a.x, a.y + a.h / 2 + off];
  const p2 = blocked.dst ? [bc + off, down ? b.y : b.y + b.h] : [right ? b.x : b.x + b.w, b.y + b.h / 2 + off];
  const c1 = blocked.src ? [p1[0], (p1[1] + p2[1]) / 2] : [(p1[0] + p2[0]) / 2, p1[1]];
  const c2 = blocked.dst ? [p2[0], (p1[1] + p2[1]) / 2] : [(p1[0] + p2[0]) / 2, p2[1]];
  return `M${f1(p1[0])},${f1(p1[1])} C${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
};

// Gutter labels: one per distinct visible y-prefix, spanning the rows that start with it.
const gutterLabels = (L, labelFor) => {
  const out = [];
  const depth = L.view.y.length;
  for (let k = 1; k <= depth; k++) {
    let start = 0;
    for (let r = 0; r <= L.rows.length; r++) {
      const cur = r < L.rows.length && L.rows[r].length >= k ? keyOf(L.rows[r].slice(0, k)) : null;
      const prev = r > 0 && L.rows[r - 1].length >= k ? keyOf(L.rows[r - 1].slice(0, k)) : null;
      if (r > 0 && cur !== prev && prev !== null) out.push({ k, prefix: JSON.parse(prev), r0: start, r1: r - 1, folded: L.rows[r - 1].length === k && L.items.some((it) => it.kind === "group" && it.key === prev) });
      if (cur !== prev) start = r;
    }
  }
  return out.map((g) => ({ ...g, text: labelFor(g.prefix) }));
};

const render = (L, opts = {}) => {
  const G = geometry(L, opts);
  const labelFor = opts.labelFor || ((p) => String(p[p.length - 1]));
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(G.width)} ${f1(G.height)}" width="${f1(G.width)}" height="${f1(G.height)}" font-family="system-ui, sans-serif" font-size="11" class="odg">`);
  parts.push(`<defs><marker id="odg-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#6b7280"/></marker></defs>`);
  L.rows.forEach((_, r) => { if (r % 2 === 0) parts.push(`<rect x="0" y="${f1(G.rowY(r))}" width="${f1(G.width)}" height="${G.rowH}" fill="#000" fill-opacity="0.035"/>`); });
  const xLabelFor = opts.xLabelFor || ((c) => (L.view.xTitle || "x") + " " + c.join(" · "));
  L.cols.forEach((c, i) => parts.push(`<text x="${f1(G.colX[i])}" y="${G.top - 10}" fill="#6b7280">${esc(xLabelFor(c))}</text>`));
  for (const g of gutterLabels(L, labelFor)) {
    const y0 = G.rowY(g.r0), y1 = G.rowY(g.r1 + 1);
    const x = (g.k - 1) * G.levelW + 6;
    parts.push(`<g class="odg-fold" data-fold="${esc(keyOf(g.prefix))}" style="cursor:pointer"><rect x="${x - 4}" y="${f1(y0 + 3)}" width="${G.levelW - 6}" height="${f1(y1 - y0 - 6)}" rx="4" fill="#3b82f6" fill-opacity="0.07"/><text x="${x}" y="${f1(y0 + 18)}" fill="#1f2937">${g.folded ? "▸" : "▾"} ${esc(g.text)}</text></g>`);
  }
  const hullColors = ["#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];
  L.hulls.forEach((h, i) => {
    const pts = [];
    for (const k of h.items) { const b = G.box.get(k); pts.push([b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]); }
    const hp = convexHull(pts);
    const c = hullColors[i % hullColors.length];
    parts.push(`<path class="odg-hull" data-hull="${esc(h.hull)}" d="M${hp.map((p) => f1(p[0]) + "," + f1(p[1])).join(" L")} Z" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-opacity="0.35" stroke-width="16" stroke-linejoin="round"/>`);
    const lx = Math.min(...hp.map((p) => p[0])), ly = Math.min(...hp.map((p) => p[1]));
    parts.push(`<text x="${f1(lx - 4)}" y="${f1(ly - 10)}" fill="${c}" font-weight="600">${esc(h.hull)}</text>`);
  });
  // A cycle with a member folded away shows as two-way lifted edges instead of an outline.
  for (const s of L.sccs.filter((c) => c.members.every((m) => G.box.has(m)))) {
    const bs = s.members.map((m) => G.box.get(m));
    const x0 = Math.min(...bs.map((b) => b.x)) - 5, y0 = Math.min(...bs.map((b) => b.y)) - 5;
    const x1 = Math.max(...bs.map((b) => b.x + b.w)) + 5, y1 = Math.max(...bs.map((b) => b.y + b.h)) + 5;
    parts.push(`<rect class="odg-scc" data-relation="${esc(s.relation)}" x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="6" fill="none" stroke="#ef4444" stroke-dasharray="4 3"/>`);
  }
  const pairs = new Set(L.liftedEdges.map((e) => e.src + "\u0000" + e.dst));
  const boxes = [...G.box.entries()];
  for (const e of L.liftedEdges) {
    const a = G.box.get(e.src), b = G.box.get(e.dst);
    const off = pairs.has(e.dst + "\u0000" + e.src) ? (cmp(e.src, e.dst) < 0 ? 5 : -5) : 0;
    const lo = Math.min(a.x, b.x), hi = Math.max(a.x + a.w, b.x + b.w);
    const between = (row) => boxes.some(([k, c]) => k !== e.src && k !== e.dst && c.y === row && c.x > lo && c.x + c.w < hi);
    const over = a.y === b.y && between(a.y);
    const blocked = a.y === b.y ? {} : { src: between(a.y), dst: between(b.y) };
    parts.push(`<path class="odg-edge" d="${anchors(a, b, off, over, blocked)}" fill="none" stroke="#6b7280" stroke-width="${e.count > 1 ? 2 : 1.2}" marker-end="url(#odg-arrow)"/>`);
    if (e.count > 1) {
      const mx = (a.x + a.w / 2 + b.x + b.w / 2) / 2, my = over ? a.y - 18 - Math.abs(b.x - a.x) * 0.09 : (a.y + b.y) / 2 + a.h / 2;
      parts.push(`<text x="${f1(mx + (off < 0 ? -14 : 14))}" y="${f1(my)}" fill="#374151" text-anchor="middle" paint-order="stroke" stroke="#f6f7f9" stroke-width="3">×${e.count}</text>`);
    }
  }
  for (const it of L.items) {
    const b = G.box.get(it.key);
    const inner = L.internal.get(it.key);
    if (it.kind === "leaf") {
      parts.push(`<g class="odg-node" data-id="${esc(it.id)}" style="cursor:grab"><rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${b.h}" rx="4" fill="#fff" stroke="#9ca3af"/><text x="${f1(b.x + 7)}" y="${f1(b.y + 17)}" fill="#111827">${esc(it.label)}</text></g>`);
    } else {
      parts.push(`<g class="odg-group" data-fold="${esc(it.key)}" data-members="${esc(it.members.join(" "))}" style="cursor:pointer"><rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${b.h}" rx="13" fill="#dbeafe" stroke="#3b82f6"/><text x="${f1(b.x + 10)}" y="${f1(b.y + 17)}" fill="#1e3a8a">▸ ${esc(labelFor(JSON.parse(it.key)))} · ${it.members.length}${inner ? ` · ${inner} inside` : ""}</text></g>`);
    }
  }
  parts.push(`</svg>`);
  return { svg: parts.join("\n"), geometry: G };
};
  return { cmp, cmpTuple, keyBetween, posetRanks, layout, reorder, geometry, render, convexHull };
};
const _spec_34_0 = function _anonymous(md) {return (md`### Tests

Each runs the engine on \`jsRows\`, so they pass without network access.`);};
const _spec_35_0 = function _test_views_differ(engine,views,jsRows) {
  const L = engine.layout({ view: views[1], ...jsRows, folds: [[2]] });
  const g = L.items.find((it) => it.kind === "group");
  if (!g || g.members.length !== 11) throw new Error("compute fold members: " + (g && g.members.length));
  const into = L.liftedEdges.filter((e) => e.dst === "[2]").map((e) => e.src + "×" + e.count).join(", ");
  if (into !== "drain.run×1, tab.ui×3") throw new Error("into Workers: " + into);
  return "compute view: Workers band folds 11 methods; drain.run ×1 and tab.ui ×3 call into it";
};
const _spec_36_0 = function _test_matrix_draws_no_edges(engine,views,jsRows) {
  const M = engine.layout({ view: views[2], ...jsRows });
  if (M.liftedEdges.length || M.sccs.length || M.hulls.length) throw new Error(`edges ${M.liftedEdges.length}, sccs ${M.sccs.length}, hulls ${M.hulls.length}`);
  if (M.rows.length !== 5 || M.cols.length !== 5) throw new Error(`grid ${M.rows.length}×${M.cols.length}`);
  return "compute × layer: 5×5 grid, no edges, no cycle outline, no hull";
};
const _spec_37_0 = function _test_deterministic(engine,views,jsRows) {
  const svgOf = (rows) => engine.render(engine.layout({ view: views[0], ...rows, folds: [[3]] })).svg;
  const a = svgOf(jsRows);
  const rev = { nodes: [...jsRows.nodes].reverse(), edges: [...jsRows.edges].reverse(), hulls: [...jsRows.hulls].reverse() };
  if (svgOf(rev) !== a) throw new Error("reversed snapshot rows changed the SVG");
  return `identical SVG for both row orders, ${a.length} chars`;
};
const _spec_38_0 = function _test_excluded(engine,views,jsRows) {
  const L = engine.layout({ view: views[0], ...jsRows });
  if (JSON.stringify(L.excluded) !== '["cache.get"]') throw new Error("excluded: " + JSON.stringify(L.excluded));
  return "cache.get excluded (no layer)";
};
const _spec_39_0 = function _test_cycle(engine,views,jsRows) {
  const L = engine.layout({ view: views[0], ...jsRows });
  const want = '[{"relation":"calls","members":["bluesky.poll","core.route"]}]';
  if (JSON.stringify(L.sccs) !== want) throw new Error("sccs: " + JSON.stringify(L.sccs));
  return "bluesky.poll and core.route share a rank";
};
const _spec_40_0 = function _test_fold_lift(engine,views,jsRows) {
  const L = engine.layout({ view: views[0], ...jsRows, folds: [[3]] });
  const e = L.liftedEdges.filter((x) => x.src === "core.route" && x.dst === "[3]");
  if (e.length !== 1 || e[0].count !== 4) throw new Error("lifted: " + JSON.stringify(e));
  return "core.route → services: one edge, ×4";
};
const _spec_41_0 = function _test_drag_writes_one_row(jsRows,engine,views) {
  const before = JSON.stringify(jsRows);
  const L = engine.layout({ view: views[0], ...jsRows });
  const cell = [...L.cells.values()].find((ids) => ids.length > 1);
  const first = engine.reorder({ order: [], cellIds: cell, id: cell[0], toIndex: cell.length });
  const L2 = engine.layout({ view: views[0], ...jsRows, order: first.order });
  const cell2 = [...L2.cells.values()].find((ids) => ids.includes(cell[0]));
  const second = engine.reorder({ order: first.order, cellIds: cell2, id: cell[0], toIndex: 0 });
  if (second.written.length !== 1) throw new Error("second drag wrote " + second.written.length);
  if (JSON.stringify(jsRows) !== before) throw new Error("snapshot rows changed");
  return `first drag keyed ${first.written.length} rows, second wrote 1; snapshot unchanged`;
};
const _spec_42_0 = function _anonymous(md) {return (md`## Visual design

The prototype above is the drawing for the open, folded and reordered states. The one drawing below is for a state the prototype does not reach.`);};
const _spec_43_0 = function _drawTools(htl,invalidation) {
  const tools = [["select", "Select", "V"], ["rect", "Rect", "R"], ["ellipse", "Ellipse", "E"], ["line", "Line", "L"], ["text", "Text", "T"], ["pen", "Pen", "P"], ["scribble", "Scribble", "S"]];
  let host = null;
  const drawing = () => host && [...host.querySelectorAll("svg")].find((s) => typeof s.setTool === "function");
  const hint = htl.html`<span style="opacity:.6">click a drawing, then pick a tool</span>`;
  const bar = htl.html`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font:13px system-ui;position:sticky;top:0;z-index:2;padding:.4em 0;background:var(--theme-background, #fff)"></div>`;
  for (const [id, label, key] of tools) {
    const b = htl.html`<button title="${label} (${key})">${label}</button>`;
    b.onclick = () => { const d = drawing(); if (d) d.setTool(id); else hint.textContent = "click a drawing first"; };
    bar.append(b);
  }
  bar.append(hint);
  const onDown = (e) => {
    let n = e.target && e.target.closest ? e.target.closest("svg") : null;
    while (n && typeof n.setTool !== "function") n = n.parentElement ? n.parentElement.closest("svg") : null;
    if (!n) return;
    host = n.parentElement;
    hint.textContent = "tools apply to the drawing you last clicked";
  };
  window.document.addEventListener("pointerdown", onDown, true);
  invalidation.then(() => window.document.removeEventListener("pointerdown", onDown, true));
  return bar;
};
const _spec_44_0 = function _artboard_x_fold(svgLens) {return (svgLens({ keyboard: true })`<svg viewBox="0 0 660 300" width="100%" style="max-width:660px;background:#f6f7f9" font-family="system-ui, sans-serif" font-size="11">
  <text x="216" y="20" fill="#6b7280">depth along calls 0</text>
  <rect x="346" y="8" width="170" height="18" rx="9" fill="#dbeafe" stroke="#3b82f6"/>
  <text x="356" y="21" fill="#1e3a8a">▸ depth 1–3 · 11</text>
  <text x="530" y="20" fill="#6b7280">depth 4</text>
  <rect x="6" y="34" width="96" height="40" rx="4" fill="#3b82f6" fill-opacity="0.07"/>
  <text x="10" y="52" fill="#1f2937">▾ client</text>
  <rect x="6" y="80" width="96" height="40" rx="4" fill="#3b82f6" fill-opacity="0.07"/>
  <text x="10" y="98" fill="#1f2937">▾ edge</text>
  <rect x="6" y="126" width="96" height="40" rx="4" fill="#3b82f6" fill-opacity="0.07"/>
  <text x="10" y="144" fill="#1f2937">▾ core</text>
  <rect x="6" y="172" width="96" height="40" rx="4" fill="#3b82f6" fill-opacity="0.07"/>
  <text x="10" y="190" fill="#1f2937">▾ services</text>
  <rect x="6" y="218" width="96" height="40" rx="4" fill="#3b82f6" fill-opacity="0.07"/>
  <text x="10" y="236" fill="#1f2937">▾ storage</text>
  <rect x="122" y="44" width="86" height="26" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="129" y="61" fill="#111827">drain.run</text>
  <rect x="216" y="44" width="106" height="26" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="223" y="61" fill="#111827">tab.ui</text>
  <rect x="216" y="90" width="106" height="26" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="223" y="107" fill="#111827">kernel.health</text>
  <rect x="346" y="90" width="170" height="164" rx="13" fill="#dbeafe" stroke="#3b82f6"/>
  <text x="356" y="176" fill="#1e3a8a">▸ depth 1–3 · 11</text>
  <rect x="530" y="228" width="60" height="26" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="535" y="245" fill="#111827">rows.get</text>
  <rect x="596" y="228" width="60" height="26" rx="4" fill="#fff" stroke="#9ca3af"/>
  <text x="600" y="245" fill="#111827">rows.app…</text>
  <path d="M322,57 C334,57 334,110 346,110" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="330" y="84" fill="#374151">×3</text>
  <path d="M165,70 C165,140 300,140 346,140" fill="none" stroke="#6b7280" stroke-width="1.2"/>
  <path d="M516,241 C523,241 523,241 530,241" fill="none" stroke="#6b7280" stroke-width="2"/>
  <text x="514" y="226" fill="#374151">×4</text>
  <path d="M516,200 C600,200 626,210 626,228" fill="none" stroke="#6b7280" stroke-width="1.2"/>
  <text x="20" y="286" fill="#52606d" font-size="12">Folding an x-level: the group is one bar spanning the rows its members sit in. Not in the prototype.</text>
</svg>`);};
const _spec_45_0 = function _anonymous(md) {return (md`*X-axis fold, drawn from this snapshot's ranks: depths 1–3 hold 11 methods in rows edge to storage (drain.run, tab.ui and kernel.health are depth 0; rows.append and rows.get are depth 4; r2.get is depth 2). The bar is one box over rows, so on a real x fold the y rows it crosses would have to give up those cells. Folding both axes at once can make two groups claim the same cells; the prototype folds y only.*`);};
const _spec_46_0 = function _states() {return ([
  { state: "open", drawing: "diagram", when: "no folds" },
  { state: "folded", drawing: "diagram", when: "a y-level label clicked" },
  { state: "reordered", drawing: "diagram", when: "a box dragged inside its cell" },
  { state: "excluded rows", drawing: "diagram", when: "a row has no value for an axis level (cache.get here)" },
  { state: "data cycle", drawing: "diagram", when: "rows reach each other along a rank relation (dashed red outline while unfolded)" },
  { state: "linked hover", drawing: "diagram_compute", when: "the pointer is over a box in any view" },
  { state: "x-axis fold", drawing: "artboard_x_fold", when: "a column prefix folded" }
]);};
const _spec_47_0 = function _statesTable(htl,states) {return (htl.html`<table style="font-size:.9em">
  <thead><tr><th>state</th><th>when</th><th>drawing</th></tr></thead>
  <tbody>${states.map((s) => htl.html`<tr data-state=${s.state}><td>${s.state}</td><td>${s.when}</td><td>${s.drawing ? htl.html`<code>${s.drawing}</code>` : htl.html`<em>not drawn</em>`}</td></tr>`)}</tbody>
</table>`);};
const _spec_48_0 = function _anonymous(md) {return (md`### Visual constraints

The prototype uses fixed light colours on a light panel (\`#f6f7f9\`) so it reads on the dark theme; a module should take theme variables instead. Slot 118 px, row 46 px, box 26 px, margin 118 px a y-level. At 640 px the snapshot's open view (5 columns) scrolls horizontally inside its panel.`);};
const _spec_49_0 = function _anonymous(md) {return (md`## Behaviour

One requirement per row, in priority order.`);};
const _spec_50_0 = function _requirements() {return ([
  { id: "R1", text: "The same snapshot, view, folds and overlay shall produce a byte-identical SVG, whatever order the snapshot rows are in.", check: "test_deterministic; bun test tools/scratch/ordinal-diagram/engine.test.js (shuffles with 3 seeds)" },
  { id: "R2", text: "Each axis shall be an ordered list of levels; a level is a column (total order) or a relation (rank along its edges); the human key and then id are always the last two levels.", check: "test_cycle; in the prototype, kernel.session and kernel.xrpc (both depth 1) share a cell, ordered by id; kernel.health (depth 0) is in its own" },
  { id: "R3", text: "When a y-prefix is folded, all rows under it shall draw as one bar spanning its members' columns, and edges with one end inside shall be lifted onto it with a count.", check: "test_fold_lift; click 'services' in the margin and see one bar with ×4 from core.route" },
  { id: "R4", text: "A drag inside a cell shall write fractional keys to the overlay table and nothing else; once the cell is keyed, a drag writes one row.", check: "test_drag_writes_one_row; drag kernel.xrpc left of kernel.session and see orderTable gain 2 rows" },
  { id: "R5", text: "A row with no value for an axis column level shall be left out and counted under the diagram.", check: "test_excluded; the notice under the prototype names cache.get" },
  { id: "R6", text: "Rows that reach each other along a rank relation shall share one rank and be outlined.", check: "test_cycle; dashed red outline around core.route and bluesky.poll" },
  { id: "R7", text: "Rows of an n-ary table named as hulls shall be enclosed by one hull per key.", check: "the 'inbox.poll path' hull encloses tab.ui, kernel.xrpc, core.route, inbox.poll" },
  { id: "R8", text: "The view's nodes, edges and hulls shall be SQL queries over the snapshot tables.", check: "sqlRows has a value (needs network for sql.js)" },
  { id: "R9", text: "Several views over one snapshot shall be drawn together, each with its own folds and order table, and hovering a box shall highlight the boxes holding the same row in every view.", check: "test_views_differ; fold Cloudflare Worker in the compute view and the call graph is unchanged; hover core.route and it is outlined orange in all three" }
]);};
const _spec_51_0 = function _requirementsTable(htl,requirements) {return (htl.html`<table style="font-size:.9em">
  <thead><tr><th>id</th><th>requirement</th><th>check</th></tr></thead>
  <tbody>${requirements.map((r) => htl.html`<tr data-requirement=${r.id}><td><strong>${r.id}</strong></td><td>${r.text}</td><td>${r.check ? htl.html`<code>${r.check}</code>` : htl.html`<em>none</em>`}</td></tr>`)}</tbody>
</table>`);};
const _spec_52_0 = function _examples() {return ([
  { given: "fold [3] (services)", expect: "one bar 'services · 5', edge core.route → bar ×4, bar → cb4-sql edges lifted" },
  { given: "fold [3] and [4]", expect: "services and storage rows each one bar; storage bar shows its inbound edges lifted" },
  { given: "drag kernel.xrpc to the left of kernel.session", expect: "order gains 2 rows (cell keyed), kernel.xrpc first; a second drag in that cell changes 1 row" }
]);};
const _spec_53_0 = function _anonymous(md) {return (md`## Design`);};
const _spec_54_0 = function _architecture(onPaper,mermaid) {return (onPaper(mermaid`flowchart LR
  snap[(snapshot tables)] --> sql[SQL: nodes, edges, hulls]
  sql --> lv[levels per axis]
  ord[(overlay: order fkey)] --> lv
  lv --> rk[ranks: column order or SCC + longest path]
  rk --> paths[x path, y path per row]
  folds[folds: y prefixes] --> q[quotient: rows under a folded prefix become one group]
  paths --> q
  q --> lift[lift edges: group by visible ends, count]
  q --> geo[geometry: column widths from cell occupancy]
  lift --> svg[SVG string]
  geo --> svg
  svg -. click label .-> folds
  svg -. drag in cell .-> ord`));};
const _spec_55_0 = function _anonymous(md) {return (md`### How a row gets its place

1. Every level gives the row a value: the column's value, or its rank along the relation. A relation is condensed into strongly connected components first, so a cycle gets one rank; rank is the longest path from a source, ties visited in id order.
2. The y values form the row's y path, the x values its x path. Distinct y paths are rows of the grid and distinct x paths are columns, both sorted lexicographically (numbers before strings, strings by code unit, never \`localeCompare\`).
3. Rows sharing both paths share a cell and are ordered inside it by (human key, id).
4. A folded y prefix replaces every row under it with one group. The group's row is the prefix itself and it spans from its leftmost to its rightmost member's column.
5. Column width is the largest cell occupancy in that column across the visible rows, so folding reflows widths as well as rows.`);};
const _spec_56_0 = function _anonymous(md) {return (md`### Decisions

| decided | instead of | because |
|---|---|---|
| input is a snapshot of tables | live entities from a Cloud Brain endpoint (interview answer, 2026-10-25) | Tom, 2026-10-26: "really it should work off a snapshot"; the RPC map is test data |
| schema-agnostic: a named map of arrays of fixed-shape rows | Cloud Brain lexicons as the vocabulary (2026-10-25) | "its a general diagram drawing tool, so the source is probably something morphic to a relational model" |
| view queries are real SQL | a fixed template | Tom: "lets do real SQL I think it will make it more readable" |
| axes are ordinal levels, no numeric spacing | numeric scales | "the axis are not spaced numerically, so they are collapsable" |
| every level is an order relation; a column is the total-order case | attribute axes and graph axes as separate kinds | Tom: "Maybe its more consistent if edges ARE the coordinate system?" |
| a drag writes a fractional key to an overlay table | a pairwise "C below B" row per drag (Tom's first pick) | Tom: "fraction key is simpler"; it cannot form a cycle. Also "human edits cannot change the truth of the dataset" |
| id is always the last tie break | allowing boxes to stack | "we always need tie breakers to avoid stacking on top, even if its some default system id" |
| deterministic layout, no solver | constraint or force solver | Tom, 2026-10-26: "it needs to be a deterministic layout" |
| fold = truncate a y prefix; lift = group by visible ends, count | Datalog lifting rules (interview answer, 2026-10-25) | with SQL as the query language a lift is a GROUP BY; renaming a relation as it lifts would be a CASE in the edge query, not built |
| folds and order are keyed by view name | one shared fold state | Tom, 2026-10-27: "hard to see its value without multiple views… interesting to see the code/infra grouped by compute type vs. call graph" |
| folded group is a span bar over its members' range | a point at an aggregate value | Tom's answer 2026-10-25 |
| fold groups are the levels the drawer chose | a fixed containment tree | "possibly an aesthetic choice up to the diagram drawer" |
| rows missing an axis value are excluded and counted | a parking strip, or inferring a value | Tom's answer 2026-10-25 |
| n-ary relations draw as hulls | hub nodes or metro lines | Tom's answer 2026-10-25 |
| expand reflows in place | drill down, fisheye | Tom's answer 2026-10-25 |

### Known traps

- SQLite has no tuple-valued column, so the interview's \`(layer, service, fkey) AS ypath\` cannot be one column. A path is the list of columns named in the view's levels.
- \`localeCompare\` depends on the browser's locale, so it would break R1 across machines. The engine compares by code unit.
- A convex hull of a flow's boxes covers boxes that are not in the flow. Seen 2026-10-26 in the prototype: the 'inbox.poll path' hull covers kernel.session. A hull that hugs only its members is more work and is not built.
- A curve between two boxes in one row passes behind any box between them and reads as an edge from that box. The 2026-10-27 review found three: tab.ui → kernel.xrpc looked like kernel.session → kernel.xrpc, and likewise core.route → core.decide and the calls into rows.get. The engine now arcs a same-row edge over the row, and attaches a cross-row edge's end at the top or bottom of its box when a box sits between the ends in that row. Two opposite edges between the same boxes (core.route ⇄ the folded services bar) drew on one line; they are now offset 5 px each way, with the count beside the line.
- A cycle outline drawn around a folded group covers the whole bar. The engine draws the outline only while every member is its own box; folded, the cycle shows as lifted edges in both directions.
- lopecode's stdlib \`SQLite\` is the loaded sql.js module, not the \`SQLite()\` factory of Observable's stdlib. Calling it threw \`SQLite is not a function\` (2026-10-26).
- \`Map\` and \`Set\` iterate in insertion order, which is snapshot row order. Every iteration the engine's output depends on is sorted first; R1's test reverses the rows to catch a miss.`);};
const _spec_57_0 = function _anonymous(md) {return (md`### Prior art

Checked by web search on 2026-10-26 unless marked.

- **Polaris / Tableau table algebra.** Axes built from fields with concatenation (+), cross (×), nest (/) and a hierarchy-aware dot; nest applies to ordinal operands only. Read from Tableau's patents (e.g. [US 7,800,613](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7800613)), not from the Polaris paper. This spec's y levels are a nest.
- **Lifting.** Lifting a relation from module level to subsystem level, and lowering, in a relation-algebra treatment of architecture ([TU/e](https://research.tue.nl/en/publications/hiding-expressed-using-relation-algebra-with-multi-relations-obli/)); Holt, [Software Architecture Abstraction and Aggregation as Algebraic Manipulations](https://plg.uwaterloo.ca/~holt/papers/cascon99/cascon99.html), CASCON'99. Krikhaar's Relation Partition Algebra was named in the interview from memory; *not checked*.
- **Dunnart** (Dwyer, Marriott, Wybrow; GD'08, LNCS 5417). A diagram editor where placement creates persistent constraints ([page](https://ialab.it.monash.edu/~mwybrow/dunnart)). This spec differs: gestures write order keys, not constraints.
- **SetCoLa** (Hoffswell, Borning, Heer; EuroVis 2018). Constraints on node sets selected by data properties, compiled to WebCoLa ([paper](https://idl.uw.edu/papers/setcola)). The model for rule rows conditioned on type or relation (see the open question on rule rows).
- **Penrose** (Ye et al., SIGGRAPH 2020). Domain, Substance and Style programs, solved by numerical optimisation ([site](https://penrose.cs.cmu.edu/siggraph20)). Same separation of data from layout rules; not deterministic in the sense of R1.
- **Fractional indexing** (Figma, [Realtime editing of ordered sequences](https://www.figma.com/blog/realtime-editing-of-ordered-sequences/)). The engine's \`keyBetween\` is the string midpoint from that line of work, base 36.
- Sugiyama layered layout, WebCoLa, Cassowary, ELK's in-layer constraints, Formal Concept Analysis: named in the interview, *not checked*.`);};
const _spec_58_0 = function _anonymous(md) {return (md`## Handover

### Where the work goes

- A new module, name not settled (open question). The engine is this spec's \`engine\` cell; \`tools/scratch/ordinal-diagram/engine.js\` is the same source with its bun tests.
- Read \`knowledge/svg-editor-architecture.md\` before adding editing to the SVG, and \`knowledge/keeping-user-state-in-the-saved-notebook.md\` before persisting the overlay table.

### Boundaries

| | |
|---|---|
| **always** | keep every iteration the SVG depends on sorted; run the checks below |
| **ask first** | vendoring sql.js; adding any solver |
| **never** | write to snapshot tables from the diagram; use \`localeCompare\` or \`Math.random\` in layout |

### Checks

\`\`\`
bun test tools/scratch/ordinal-diagram/engine.test.js   # 8 pass
run_tests on @spec/ordinal-diagram                     # 7 test_* cells pass
\`\`\`

### Steps

1. Settle the blocking questions below. **stop and show**
2. Move the engine into a module with the tests as its \`test_*\` cells.
3. Persist \`order\` and \`folds\` in the saved notebook.
4. Load a second, non-architecture snapshot and view to check the tool is schema-agnostic. **stop and show**`);};
const _spec_59_0 = function _anonymous(md) {return (md`## Open questions

A question marked blocking stops the handover.`);};
const _spec_60_0 = function _questions() {return ([
  { q: "The axis template. The prototype uses SQL for rows plus a JS list of level columns. Tom described nested queries (..X, x, y) where each axis is a nesting of data transforms. Which form is the view definition?", blocking: true, answer: "" },
  { q: "Can the human key sit before data levels (overriding them), or only after them as a tie break? The prototype puts it last but one, so a drag cannot move a box out of its cell.", blocking: true, answer: "" },
  { q: "Rank within a relation level: longest path from sources (prototype), or distance from chosen roots (for a focus view)?", blocking: false, answer: "" },
  { q: "Should a deterministic crossing-reduction pass order boxes inside a column before the id tie break? The prototype has none.", blocking: false, answer: "" },
  { q: "Data cycles: keep sharing one rank with an outline (prototype), or fold each cycle into a group automatically?", blocking: false, answer: "" },
  { q: "What is 'a dimension' as a constraint condition? Tom listed it beside edge label and entity type on 2026-10-26.", blocking: false, answer: "" },
  { q: "Should x-levels fold too (artboard_x_fold)? If both axes fold, two groups can claim the same cells.", blocking: false, answer: "" },
  { q: "Where does a promoted group live, given the snapshot is never edited: an overlay table in the notebook?", blocking: false, answer: "" },
  { q: "sql.js from a CDN (prototype, via stdlib SQLite) or vendored as a file attachment so the notebook works offline?", blocking: false, answer: "" },
  { q: "Rule rows (\"all stores below all services\", conditioned on relation, type or dimension) as a second overlay table, with cycles among them shown: in scope for the first module?", blocking: false, answer: "" },
  { q: "Should edges be drawable only for relations the view names (drawRelations), with rank relations hidden by default?", blocking: false, answer: "" },
  { q: "Module name.", blocking: false, answer: "" }
]);};
const _spec_61_0 = function _questionsTable(htl,questions) {return (htl.html`<table style="font-size:.9em">
  <thead><tr><th></th><th>question</th><th>answer</th></tr></thead>
  <tbody>${questions.map((q, i) => htl.html`<tr data-question=${i}><td>${q.blocking && !q.answer ? "blocking" : ""}</td><td>${q.q}</td><td>${q.answer || htl.html`<em>open</em>`}</td></tr>`)}</tbody>
</table>`);};
const _spec_62_0 = function _onPaper(htl) {return ((node) => htl.html`<div style="max-width:640px;background:#f6f7f9;border-radius:6px;padding:10px">${node}</div>`);};
const _spec_63_0 = function _specModule() {return ("@spec/ordinal-diagram");};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_spec_0_0", null, ["md"], _spec_0_0);
  $def("_spec_1_0", "opening", ["md"], _spec_1_0);
  $def("_spec_2_0", "viewof specStatus", ["sticky","Inputs"], _spec_2_0);
  $def("_spec_2_1", "specStatus", ["Generators","viewof specStatus"], _spec_2_1);
  $def("_spec_3_0", "readiness", ["annotations","specModule","requirements","questions","states","specStatus","htl"], _spec_3_0);
  $def("_spec_4_0", null, ["md"], _spec_4_0);
  $def("_spec_5_0", null, ["md"], _spec_5_0);
  $def("_spec_6_0", null, ["md"], _spec_6_0);
  $def("_spec_7_0", null, ["md"], _spec_7_0);
  $def("_spec_8_0", null, ["md"], _spec_8_0);
  $def("_spec_9_0", null, ["md"], _spec_9_0);
  $def("_spec_10_0", "copy_title", ["md"], _spec_10_0);
  $def("_spec_11_0", "copy_opening", ["md"], _spec_11_0);
  $def("_spec_12_0", "copy_strings", ["md"], _spec_12_0);
  $def("_spec_13_0", null, ["md"], _spec_13_0);
  $def("_spec_14_0", null, ["md"], _spec_14_0);
  $def("_spec_15_0", "snapshot", [], _spec_15_0);
  $def("_spec_16_0", null, ["md"], _spec_16_0);
  $def("_spec_17_0", "viewSql", [], _spec_17_0);
  $def("_spec_18_0", "views", [], _spec_18_0);
  $def("_spec_19_0", "sqlRows", ["SQLite","snapshot","viewSql"], _spec_19_0);
  $def("_spec_20_0", "jsRows", ["snapshot"], _spec_20_0);
  $def("_spec_21_0", "viewof folds", ["Inputs"], _spec_21_0);
  $def("_spec_21_1", "folds", ["Generators","viewof folds"], _spec_21_1);
  $def("_spec_22_0", "viewof order", ["Inputs"], _spec_22_0);
  $def("_spec_22_1", "order", ["Generators","viewof order"], _spec_22_1);
  $def("_spec_23_0", "axisLabel", [], _spec_23_0);
  $def("_spec_24_0", "focusBus", ["EventTarget"], _spec_24_0);
  $def("_spec_25_0", "diagramFor", ["sqlRows","folds","order","engine","axisLabel","htl","viewof folds","focusBus","viewof order"], _spec_25_0);
  $def("_spec_26_0", null, ["md"], _spec_26_0);
  $def("_spec_27_0", "diagram", ["diagramFor","views","invalidation"], _spec_27_0);
  $def("_spec_28_0", null, ["md"], _spec_28_0);
  $def("_spec_29_0", "diagram_compute", ["diagramFor","views","invalidation"], _spec_29_0);
  $def("_spec_30_0", null, ["md"], _spec_30_0);
  $def("_spec_31_0", "diagram_matrix", ["diagramFor","views","invalidation"], _spec_31_0);
  $def("_spec_32_0", "orderTable", ["order","htl","Inputs"], _spec_32_0);
  $def("_spec_33_0", "engine", [], _spec_33_0);
  $def("_spec_34_0", null, ["md"], _spec_34_0);
  $def("_spec_35_0", "test_views_differ", ["engine","views","jsRows"], _spec_35_0);
  $def("_spec_36_0", "test_matrix_draws_no_edges", ["engine","views","jsRows"], _spec_36_0);
  $def("_spec_37_0", "test_deterministic", ["engine","views","jsRows"], _spec_37_0);
  $def("_spec_38_0", "test_excluded", ["engine","views","jsRows"], _spec_38_0);
  $def("_spec_39_0", "test_cycle", ["engine","views","jsRows"], _spec_39_0);
  $def("_spec_40_0", "test_fold_lift", ["engine","views","jsRows"], _spec_40_0);
  $def("_spec_41_0", "test_drag_writes_one_row", ["jsRows","engine","views"], _spec_41_0);
  $def("_spec_42_0", null, ["md"], _spec_42_0);
  $def("_spec_43_0", "drawTools", ["htl","invalidation"], _spec_43_0);
  $def("_spec_44_0", "artboard_x_fold", ["svgLens"], _spec_44_0);
  $def("_spec_45_0", null, ["md"], _spec_45_0);
  $def("_spec_46_0", "states", [], _spec_46_0);
  $def("_spec_47_0", "statesTable", ["htl","states"], _spec_47_0);
  $def("_spec_48_0", null, ["md"], _spec_48_0);
  $def("_spec_49_0", null, ["md"], _spec_49_0);
  $def("_spec_50_0", "requirements", [], _spec_50_0);
  $def("_spec_51_0", "requirementsTable", ["htl","requirements"], _spec_51_0);
  $def("_spec_52_0", "examples", [], _spec_52_0);
  $def("_spec_53_0", null, ["md"], _spec_53_0);
  $def("_spec_54_0", "architecture", ["onPaper","mermaid"], _spec_54_0);
  $def("_spec_55_0", null, ["md"], _spec_55_0);
  $def("_spec_56_0", null, ["md"], _spec_56_0);
  $def("_spec_57_0", null, ["md"], _spec_57_0);
  $def("_spec_58_0", null, ["md"], _spec_58_0);
  $def("_spec_59_0", null, ["md"], _spec_59_0);
  $def("_spec_60_0", "questions", [], _spec_60_0);
  $def("_spec_61_0", "questionsTable", ["htl","questions"], _spec_61_0);
  $def("_spec_62_0", "onPaper", ["htl"], _spec_62_0);
  $def("_spec_63_0", "specModule", [], _spec_63_0);
  main.define("module @tomlarkworthy/editable-md", [], async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  main.define("md", ["module @tomlarkworthy/editable-md","@variable"], (_, v) => v.import("md", _));
  main.define("module @tomlarkworthy/svg-lens", [], async () => runtime.module((await import("/@tomlarkworthy/svg-lens.js?v=4")).default));
  main.define("svgLens", ["module @tomlarkworthy/svg-lens","@variable"], (_, v) => v.import("svgLens", _));
  main.define("module @tomlarkworthy/annotate", [], async () => runtime.module((await import("/@tomlarkworthy/annotate.js?v=4")).default));
  main.define("annotation", ["module @tomlarkworthy/annotate","@variable"], (_, v) => v.import("annotation", _));
  main.define("annotations", ["module @tomlarkworthy/annotate","@variable"], (_, v) => v.import("annotations", _));
  main.define("module @tomlarkworthy/sticky", [], async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky","@variable"], (_, v) => v.import("sticky", _));
  return main;
}
