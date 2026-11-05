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
// view: { y: [level], x: [level], drawRelations?: [rel], hulls?: false, wrap?: boxes per line in a cell (6), kinds?: [kind] shown }
// node: { id, label?, kind?, href?, ...columns }; edge: { src, dst, rel, prov? } with prov data | docs | inferred
// level: { col, label? } (total order on a column) or { relation, by?, label? } (poset rank along edges of that relation;
// with by, the rank of the node's value in column by, edges first lifted to that column).
// order: [{ id, fkey }] human scale. folds on the y axis: a prefix tuple folds that prefix; a number k folds every
// prefix of length k; { open: prefix } keeps one prefix open under a number. view.cellSort: columns ordering a cell before fkey.
const layout = ({ view, nodes, edges = [], hulls = [], order = [], folds = [] }) => {
  const levelsOf = (axis) => view[axis] || [];
  // filter: { col: [allowed values] }; a missing value is matched as "∅". kinds is filter.kind.
  const filter = Object.entries({ ...(view.kinds ? { kind: view.kinds } : {}), ...(view.filter || {}) }).filter(([, v]) => v).map(([c, v]) => [c, new Set(v.map(String))]);
  const all = nodes.filter((n) => filter.every(([c, ok]) => ok.has(isNil(n[c]) ? "∅" : String(n[c])))).sort((a, b) => cmp(a.id, b.id));
  const included = [], excluded = [];
  for (const n of all) {
    const missing = [...levelsOf("y"), ...levelsOf("x")].some((l) => l.col && isNil(n[l.col]));
    (missing ? excluded : included).push(n);
  }
  const ids = included.map((n) => n.id);
  const byId = new Map(included.map((n) => [n.id, n]));
  const sortedEdges = [...edges].sort((a, b) => cmp(a.src, b.src) || cmp(a.dst, b.dst) || cmp(a.rel, b.rel));
  const ranks = new Map(), sccs = [];
  const rankKey = (l) => l.relation + (l.by ? "\u0000" + l.by : "");
  for (const l of [...levelsOf("y"), ...levelsOf("x")]) if (l.relation && !ranks.has(rankKey(l))) {
    const of = l.by ? (id) => byId.get(id)[l.by] : (id) => id;
    const units = [...new Set(ids.map(of))].sort(cmp);
    const rel = sortedEdges.filter((e) => e.rel === l.relation && byId.has(e.src) && byId.has(e.dst)).map((e) => ({ src: of(e.src), dst: of(e.dst) }));
    const r = posetRanks(units, rel);
    ranks.set(rankKey(l), new Map(ids.map((id) => [id, r.rank.get(of(id))])));
    for (const s of r.sccs) sccs.push({ relation: l.relation, members: s });
  }
  const val = (n, l) => (l.relation ? ranks.get(rankKey(l)).get(n.id) : n[l.col]);
  const path = (n, axis) => levelsOf(axis).map((l) => val(n, l));
  const fkey = new Map(order.map((o) => [o.id, o.fkey]));
  const tie = (n) => [...(view.cellSort || []).map((c) => (isNil(n[c]) ? "~" : n[c])), fkey.has(n.id) ? fkey.get(n.id) : "~", n.id];

  const foldSet = new Set(folds.filter(Array.isArray).map(keyOf));
  const foldDepths = new Set(folds.filter(Number.isInteger));
  const openSet = new Set(folds.filter((f) => f && f.open).map((f) => keyOf(f.open)));
  const isFolded = (p) => foldSet.has(keyOf(p)) || (foldDepths.has(p.length) && !openSet.has(keyOf(p)));
  const groupOf = new Map();
  for (const n of included) {
    const yp = path(n, "y");
    for (let k = 1; k <= yp.length; k++) if (isFolded(yp.slice(0, k))) { groupOf.set(n.id, keyOf(yp.slice(0, k))); break; }
  }
  const cols = [...new Map(included.map((n) => [keyOf(path(n, "x")), path(n, "x")])).values()].sort(cmpTuple);
  const colIndex = new Map(cols.map((c, i) => [keyOf(c), i]));
  const colOf = (n) => colIndex.get(keyOf(path(n, "x")));
  const groups = new Map();
  for (const n of included) if (groupOf.has(n.id)) {
    const g = groupOf.get(n.id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(n);
  }
  // view.cards: a folded prefix whose members share one column is drawn as a box in its parent's row,
  // beside that row's other boxes, instead of as a bar on a row of its own.
  const card = new Set([...groups].filter(([g, m]) => view.cards && JSON.parse(g).length > 0 && new Set(m.map(colOf)).size === 1).map(([g]) => g));
  const rowOf = new Map();
  for (const n of included) {
    const g = groupOf.get(n.id);
    rowOf.set(n.id, !g ? path(n, "y") : card.has(g) ? JSON.parse(g).slice(0, -1) : JSON.parse(g));
  }
  const rows = [...new Map(included.map((n) => [keyOf(rowOf.get(n.id)), rowOf.get(n.id)])).values()].sort(cmpTuple);
  const rowIndex = new Map(rows.map((r, i) => [keyOf(r), i]));

  const kindsOf = (members) => {
    const byKind = new Map();
    for (const m of members) byKind.set(m.kind ?? "", (byKind.get(m.kind ?? "") || 0) + 1);
    return [...byKind].sort((a, b) => cmp(a[0], b[0])).map(([kind, n]) => ({ kind, n }));
  };
  const items = [];
  const cells = new Map(); // "r,c" -> ordered ids (a card by its group key)
  const entry = new Map(); // "r,c" -> [{ tie, leaf | card }]
  const put = (k, e) => { if (!entry.has(k)) entry.set(k, []); entry.get(k).push(e); };
  for (const n of included) if (!groupOf.has(n.id)) put(rowIndex.get(keyOf(rowOf.get(n.id))) + "," + colOf(n), { tie: tie(n), n });
  for (const g of card) {
    const members = groups.get(g);
    const first = [...members].sort((a, b) => cmpTuple(tie(a), tie(b)))[0];
    put(rowIndex.get(keyOf(rowOf.get(first.id))) + "," + colOf(first), { tie: tie(first), g, members });
  }
  const wrap = view.wrap || 6;
  const lines = rows.map(() => 1);
  const occupancy = new Map();
  const occ = (r, c, w) => { const k = r + "," + c; occupancy.set(k, Math.max(occupancy.get(k) || 0, w)); };
  for (const [k, list] of [...entry].sort((a, b) => cmp(a[0], b[0]))) {
    list.sort((a, b) => cmpTuple(a.tie, b.tie));
    const [r, c] = k.split(",").map(Number);
    list.forEach((e, slot) => items.push(e.n
      ? { kind: "leaf", key: e.n.id, id: e.n.id, row: r, col: c, slot, label: String(e.n.label ?? e.n.id), node: e.n }
      : { kind: "group", card: true, key: e.g, row: r, col: c, colMin: c, colMax: c, slot, members: e.members.map((m) => m.id), kinds: kindsOf(e.members), label: `${e.members.length} items` }));
    occ(r, c, Math.min(list.length, wrap));
    lines[r] = Math.max(lines[r], Math.ceil(list.length / wrap));
    cells.set(k, list.map((e) => (e.n ? e.n.id : e.g)));
  }
  for (const [g, members] of [...groups].sort((a, b) => cmp(a[0], b[0]))) {
    if (card.has(g)) continue;
    const cs = members.map(colOf);
    const colMin = Math.min(...cs), colMax = Math.max(...cs);
    const r = rowIndex.get(g);
    for (let c = colMin; c <= colMax; c++) occ(r, c, 1);
    items.push({ kind: "group", key: g, row: r, colMin, colMax, members: members.map((m) => m.id), kinds: kindsOf(members), label: `${members.length} items` });
  }
  const colWidth = cols.map((_, c) => Math.max(1, ...rows.map((_, r) => occupancy.get(r + "," + c) || 0)));
  const visible = new Map(included.map((n) => [n.id, groupOf.get(n.id) || n.id]));

  const lifted = new Map(), internal = new Map(), labels = new Map(), weights = new Map(), sources = new Map();
  const draw = view.drawRelations ? new Set(view.drawRelations) : null;
  for (const e of sortedEdges) {
    if (!byId.has(e.src) || !byId.has(e.dst) || (draw && !draw.has(e.rel))) continue;
    const s = visible.get(e.src), d = visible.get(e.dst);
    if (s === d) { internal.set(s, (internal.get(s) || 0) + (e.n ?? 1)); continue; }
    const k = keyOf([s, d, e.rel, e.prov || "data", e.state || null]);
    lifted.set(k, (lifted.get(k) || 0) + 1);
    // weight is the number of base rows behind the line: an input line that already merged n rows counts n.
    weights.set(k, (weights.get(k) || 0) + (e.n ?? 1));
    if (e.label) labels.set(k, [...(labels.get(k) || []), ...[].concat(e.label)]);
    if (e.pairs) sources.set(k, [...(sources.get(k) || []), ...e.pairs]);
  }
  const liftedEdges = [...lifted].sort((a, b) => cmp(a[0], b[0])).map(([k, count]) => {
    const [src, dst, rel, prov, state] = JSON.parse(k);
    return { src, dst, rel, prov, ...(state ? { state } : {}), count, weight: weights.get(k), labels: [...new Set(labels.get(k) || [])].sort(cmp), pairs: [...new Set(sources.get(k) || [])].sort(cmp) };
  });

  const hullMap = new Map();
  for (const h of view.hulls === false ? [] : [...hulls].sort((a, b) => cmp(a.hull, b.hull) || cmp(a.id, b.id))) {
    if (!byId.has(h.id)) continue;
    if (!hullMap.has(h.hull)) hullMap.set(h.hull, new Set());
    hullMap.get(h.hull).add(visible.get(h.id));
  }
  const hullList = [...hullMap].map(([hull, s]) => ({ hull, items: [...s].sort(cmp) }));

  return { rows, cols, colWidth, lines, wrap, items, cells, liftedEdges, internal, sccs, hulls: hullList, excluded: excluded.map((n) => n.id), included: ids, view, foldDepths: [...foldDepths].sort(cmp) };
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
const SHOW_MAX = 40;
// Extra text lines on a leaf box: one per shown column, or one per item of a list column.
const showLinesOf = (view, node) => (view.show || []).reduce((sum, c) => {
  const v = node[c];
  return sum + (Array.isArray(v) ? Math.max(1, Math.min(v.length, SHOW_MAX) + (v.length > SHOW_MAX ? 1 : 0)) : 1);
}, 0);
const geometry = (L, { slot = 118, gap = 26, rowH = 46, boxH = 26, levelW = 118, top = 30 } = {}) => {
  // A box is as tall as its own text; a row line is as tall as the tallest box in that row. Fold bars keep 26 px.
  slot = L.view.slot || slot;
  const extraOf = (it) => (it.kind === "leaf" ? 13 * showLinesOf(L.view, it.node) : it.card ? 13 : 0);
  const unit = L.rows.map(() => rowH);
  for (const it of L.items) unit[it.row] = Math.max(unit[it.row], rowH + extraOf(it));
  const gutter = levelW * Math.max(1, L.view.y.length);
  const colX = [];
  let x = gutter + 16;
  L.colWidth.forEach((w, c) => { colX[c] = x; x += w * slot + gap; });
  const width = x;
  const lines = L.lines || L.rows.map(() => 1), wrap = L.wrap || Infinity;
  const rowTop = [top];
  lines.forEach((n, r) => rowTop.push(rowTop[r] + n * unit[r]));
  const rowY = (r) => rowTop[r];
  const rowHeight = (r) => lines[r] * unit[r];
  const pad = (rowH - boxH) / 2;
  const box = new Map();
  for (const it of L.items) {
    if (it.kind === "leaf" || it.card) box.set(it.key, { x: colX[it.col] + (it.slot % wrap) * slot, y: rowY(it.row) + pad + Math.floor(it.slot / wrap) * unit[it.row], w: slot - 12, h: boxH + extraOf(it) });
    else box.set(it.key, { x: colX[it.colMin], y: rowY(it.row) + pad, w: colX[it.colMax] + L.colWidth[it.colMax] * slot - 12 - colX[it.colMin], h: boxH });
  }
  return { gutter, colX, width, height: rowY(L.rows.length) + 24, rowY, rowHeight, box, slot, rowH, levelW, top };
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const f1 = (v) => Math.round(v * 10) / 10;
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const KIND_FILL = ["#ffffff", "#fef3c7", "#dcfce7", "#ede9fe", "#fee2e2", "#e0f2fe"];
const DASH = { docs: "5 3", inferred: "1.5 3" };
// A compared line: in both, observed only, claimed only (Murphy, Notkin, Sullivan 1995).
const STATE = { convergence: "#6b7280", divergence: "#d97706", absence: "#dc2626" };

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
  const kinds = [...new Set(L.items.filter((it) => it.kind === "leaf" && it.node.kind).map((it) => it.node.kind))].sort(cmp);
  const labelFor = opts.labelFor || ((p) => String(p[p.length - 1]));
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f1(G.width)} ${f1(G.height)}" width="${f1(G.width)}" height="${f1(G.height)}" font-family="system-ui, sans-serif" font-size="11" class="odg">`);
  // Arrowheads in user units, so a wide line does not get a wide head; one per line colour.
  const arrows = Object.entries({ "": "#6b7280", ...STATE }).map(([k, c]) => `<marker id="odg-arrow${k ? "-" + k : ""}" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="${c}"/></marker>`);
  parts.push(`<defs>${arrows.join("")}</defs>`);
  L.rows.forEach((_, r) => { if (r % 2 === 0) parts.push(`<rect x="0" y="${f1(G.rowY(r))}" width="${f1(G.width)}" height="${G.rowHeight(r)}" fill="#000" fill-opacity="0.035"/>`); });
  const chars = Math.floor((G.slot - 26) / 5.6);
  const showText = (n) => (L.view.show || []).flatMap((c) => {
    const v = n[c];
    // view.showNames false prints the value alone, for a column whose values say what they are, and nothing when there is none.
    if (L.view.showNames === false && isNil(v)) return [];
    if (!Array.isArray(v)) return [`${L.view.showNames === false ? "" : c + " "}${isNil(v) ? "∅" : v}`];
    if (!v.length) return [`${c}: none`];
    return [...v.slice(0, SHOW_MAX), ...(v.length > SHOW_MAX ? [`… ${v.length - SHOW_MAX} more`] : [])];
  });
  const shows = (n, b) => showText(n).map((t, i) => `<text x="${f1(b.x + 7)}" y="${f1(b.y + 30 + 13 * i)}" fill="#6b7280" font-size="10">${esc(clip(t, chars))}</text>`).join("");
  // "12 methods, 1 worker"; a group of rows with no kind is its count alone.
  const counts = (it) => (it.kinds.every((k) => k.kind) ? [...it.kinds].sort((x, y) => y.n - x.n || cmp(x.kind, y.kind)).map((k) => `${k.n} ${k.n === 1 ? k.kind.replace(/s$/, "") : k.kind.replace(/s?$/, "s")}`).join(", ") : String(it.members.length));
  const xLabelFor = opts.xLabelFor || ((c) => (L.view.xTitle || "x") + " " + c.join(" · "));
  if (L.view.x && L.view.x.length) L.cols.forEach((c, i) => parts.push(`<text x="${f1(G.colX[i])}" y="${G.top - 10}" fill="#6b7280">${esc(xLabelFor(c))}</text>`));
  // One header per y level: a click folds or opens every prefix of that length.
  L.view.y.forEach((l, i) => {
    const folded = (L.foldDepths || []).includes(i + 1);
    parts.push(`<g class="odg-fold" data-fold="${i + 1}" style="cursor:pointer"><text x="${i * G.levelW + 6}" y="${G.top - 10}" fill="#6b7280" font-weight="600">${esc(clip(`${folded ? "▸" : "▾"} ${l.col || "depth along " + l.relation}`, Math.floor(G.levelW / 6.2)))}<title>${esc(l.col || "depth along " + l.relation)}</title></text></g>`);
  });
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
  // One outline per member: a bounding box would cover other boxes once a cell wraps.
  for (const s of L.sccs.filter((c) => c.members.every((m) => G.box.has(m)))) {
    for (const m of s.members) {
      const b = G.box.get(m);
      parts.push(`<rect class="odg-scc" data-relation="${esc(s.relation)}" data-members="${esc(s.members.join(" "))}" x="${f1(b.x - 4)}" y="${f1(b.y - 4)}" width="${f1(b.w + 8)}" height="${f1(b.h + 8)}" rx="6" fill="none" stroke="#ef4444" stroke-dasharray="4 3"/>`);
    }
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
    parts.push(`<path class="odg-edge" d="${anchors(a, b, off, over, blocked)}" fill="none" stroke="${STATE[e.state] || "#6b7280"}" stroke-width="${f1(Math.min(5, 1.2 + Math.log2(e.weight)))}"${DASH[e.prov] ? ` stroke-dasharray="${DASH[e.prov]}"` : ""} data-rel="${esc(e.rel)}" data-prov="${esc(e.prov || "data")}"${e.state ? ` data-state="${e.state}"` : ""} marker-end="url(#odg-arrow${e.state ? "-" + e.state : ""})"><title>${esc([e.state, ...(e.pairs.length ? e.pairs : e.labels)].filter(Boolean).join("\n"))}</title></path>`);
    if (L.view.edgeLabels && e.labels.length) {
      const mx = 0.5 * (a.x + a.w / 2 + b.x + b.w / 2), my = over ? a.y - 16 - Math.abs(b.x - a.x) * 0.09 : 0.5 * (a.y + b.y) + a.h / 2;
      parts.push(`<text x="${f1(mx)}" y="${f1(my)}" fill="#4b5563" font-size="9" text-anchor="middle" paint-order="stroke" stroke="#f6f7f9" stroke-width="3">${esc(clip(e.labels.join(", "), 28))}</text>`);
    }
    if (e.weight > 1) {
      // Near the arrowhead, so a count reads as belonging to its target.
      const mx = 0.25 * (a.x + a.w / 2) + 0.75 * (b.x + b.w / 2), my = over ? a.y - 18 - Math.abs(b.x - a.x) * 0.09 : 0.25 * a.y + 0.75 * b.y - (b.y > a.y ? 4 : -a.h - 10);
      parts.push(`<text x="${f1(mx + (off < 0 ? -14 : 14))}" y="${f1(my)}" fill="#374151" text-anchor="middle" paint-order="stroke" stroke="#f6f7f9" stroke-width="3">×${e.weight}</text>`);
    }
  }
  for (const it of L.items) {
    const b = G.box.get(it.key);
    const inner = L.internal.get(it.key);
    if (it.kind === "leaf") {
      const kind = it.node.kind, fill = kind ? KIND_FILL[kinds.indexOf(kind) % KIND_FILL.length] : "#fff";
      const link = it.node.href ? `<a href="${esc(it.node.href)}" target="_blank" class="odg-link"><rect x="${f1(b.x + b.w - 16)}" y="${f1(b.y + 1)}" width="15" height="24" fill="#000" fill-opacity="0"/><text x="${f1(b.x + b.w - 13)}" y="${f1(b.y + 17)}" fill="#2563eb">↗</text></a>` : "";
      parts.push(`<g class="odg-node" data-id="${esc(it.id)}"${kind ? ` data-kind="${esc(kind)}"` : ""} style="cursor:grab"><rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${b.h}" rx="4" fill="${fill}" stroke="#9ca3af"/><text x="${f1(b.x + 7)}" y="${f1(b.y + 17)}" fill="#111827">${esc(clip(it.label, Math.max(it.node.href ? 14 : 16, Math.floor((b.w - (it.node.href ? 24 : 10)) / 6.6))))}</text>${shows(it.node, b)}${link}</g>`);
    } else {
      // A card is a folded group in its parent's row: name, then its counts on a second line.
      const text = it.card
        ? `<text x="${f1(b.x + 10)}" y="${f1(b.y + 17)}" fill="#1e3a8a">${esc(clip(`▸ ${labelFor(JSON.parse(it.key))}`, Math.floor(b.w / 6.2)))}</text><text x="${f1(b.x + 10)}" y="${f1(b.y + 31)}" fill="#1e3a8a" font-size="10">${esc(clip(counts(it) + (inner ? ` · ${inner} inside` : ""), Math.floor(b.w / 5.4)))}</text>`
        : `<text x="${f1(b.x + 10)}" y="${f1(b.y + 17)}" fill="#1e3a8a">${esc(clip(`▸ ${labelFor(JSON.parse(it.key))} · ${counts(it)}${inner ? ` · ${inner} inside` : ""}`, Math.floor(b.w / 5.8)))}</text>`;
      parts.push(`<g class="odg-group" data-fold="${esc(it.key)}" data-members="${esc(it.members.join(" "))}" style="cursor:pointer"><rect x="${f1(b.x)}" y="${f1(b.y)}" width="${f1(b.w)}" height="${b.h}" rx="${it.card ? 6 : 13}" fill="#dbeafe" stroke="#3b82f6"/>${text}</g>`);
    }
  }
  parts.push(`</svg>`);
  return { svg: parts.join("\n"), geometry: G };
};

export { cmp, cmpTuple, keyBetween, posetRanks, layout, reorder, geometry, render, convexHull };
