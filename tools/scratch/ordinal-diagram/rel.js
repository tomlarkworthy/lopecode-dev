// Draw any set of tables. A box is a row, a line is a relation, a level is an expression on a row.
// compile() turns tables + a key schema + a view into the rows the layout engine reads. Pure and sorted.
//
// schema.tables[name]: { key?: col | [cols], label?: col, href?: col, refs?: { col: table | [tables] }, link?: [fromCol, toCol], prov? }
//   A relation is a foreign key, named "table.col", or a link table, named "table" (one line per row, from link[0] to link[1]).
//   A foreign key naming several tables points at the first of them holding the key.
//   prov ("data" unless given) is where a table's rows come from; a line is "docs" if its table or a row it was lifted through is.
// view: { boxes: [table], lines: [relation], nest: [foreign key], y: [level], x: [level], where?: { level or path: [values] },
//   compare?: [{ claimed: relation, observed: relation, scope?: "claimed" }] (one line per pair of drawn ends, marked convergence, divergence or absence;
//     scope "claimed" keeps only the divergences that end at a box a claim ends at),
//   show?: [path], connected?: [table] (rows of these tables are boxes only when a drawn line ends at them), hulls?: [{ relation: foreign key, by: col }] (one outline per value of by, around the rows the key names),
//   ...passed to the engine: name, wrap, cards, edgeLabels, slot, xTitle, yTitle, folds }
// level: { col: "path", label?: "path" }   a column, read through foreign keys ("component.zone");
//                                           a nested row without the column reads it from its parent
//        { depth: relation, at?: "path", label?: "path" }  depth along a relation; with at, the depth of the row that path reaches
//        { nest: k }                        the ancestor k steps below the nest root (1 = the root)
//        { table: true }                    the row's table
import { posetRanks } from "./engine.js";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isNil = (v) => v === null || v === undefined;
const list = (v) => (isNil(v) ? [] : [].concat(v));

export const levelName = (l) => l.name || (l.table ? "table" : l.nest ? `nest ${l.nest}` : l.depth ? `depth along ${l.depth}${l.at ? ` of ${l.at}` : ""}` : l.col);

export const relationsOf = (schema) => Object.entries(schema.tables).flatMap(([t, s]) => [
  ...(s.link ? [{ name: t, table: t, from: s.link[0], to: s.link[1], fromTables: list(s.refs[s.link[0]]), toTables: list(s.refs[s.link[1]]) }] : []),
  ...Object.entries(s.refs || {}).filter(([c]) => !(s.link || []).includes(c)).map(([c, to]) => ({ name: `${t}.${c}`, table: t, from: null, to: c, fromTables: [t], toTables: list(to) }))
]).sort((a, b) => cmp(a.name, b.name));

export const compile = (tables, schema, view) => {
  const S = schema.tables;
  const keyOf = (t, row, i) => { const k = S[t].key; return isNil(k) ? String(i) : Array.isArray(k) ? k.map((c) => row[c]).join("/") : String(row[k]); };
  const rowsOf = (t) => [...(tables[t] || [])].map((row, i) => ({ row, k: keyOf(t, row, i) })).sort((a, b) => cmp(a.k, b.k));
  const index = new Map(Object.keys(S).sort().map((t) => [t, new Map(rowsOf(t).map(({ row, k }) => [k, row]))]));
  const find = (t, k) => (isNil(k) || !index.has(t) ? undefined : index.get(t).get(String(k)));
  // The row a key names in the first of the tables that holds it.
  const findIn = (ts, k) => { for (const t of ts) { const row = find(t, k); if (row) return { t, row }; } return null; };
  const refsOf = (t, c) => list((S[t].refs || {})[c]);
  const id = (t, row) => `${t}:${keyOf(t, row)}`;
  const dangling = [];

  // Nesting: each nested table has one foreign key to its parent.
  const nestCol = new Map((view.nest || []).map((r) => { const [t, c] = r.split("."); return [t, c]; }));
  const parentOf = (t, row) => {
    const c = nestCol.get(t);
    if (!c) return null;
    return findIn(refsOf(t, c), row[c]);
  };
  const chain = (t, row) => { const out = [{ t, row }]; for (let p = parentOf(t, row); p; p = parentOf(p.t, p.row)) out.unshift(p); return out; };

  // A path walks foreign keys; a column a row lacks is read from its nest parent.
  const get = (t, row, path) => {
    if (!row) return { value: null };
    const [c, ...rest] = path;
    if (!rest.length) {
      if (c in row) return { value: row[c], t, row };
      const p = parentOf(t, row);
      return p ? get(p.t, p.row, path) : { value: null };
    }
    const to = refsOf(t, c);
    if (to.length && c in row) { const r = findIn(to, row[c]); return r ? get(r.t, r.row, rest) : { value: null }; }
    const p = parentOf(t, row);
    return p ? get(p.t, p.row, path) : { value: null };
  };
  // The row a path of foreign keys reaches.
  const reach = (t, row, path) => {
    if (!path) return { t, row };
    const segs = path.split(".");
    let cur = { t, row };
    for (const c of segs) {
      while (cur.row && !(c in cur.row)) { const p = parentOf(cur.t, cur.row); if (!p) return null; cur = p; }
      if (!cur.row) return null;
      const r = findIn(refsOf(cur.t, c), cur.row[c]);
      if (!r) return null;
      cur = r;
    }
    return cur;
  };

  const relations = new Map(relationsOf(schema).map((r) => [r.name, r]));
  const pairsMemo = new Map();
  const pairsOf = (name) => {
    if (!pairsMemo.has(name)) pairsMemo.set(name, pairsFor(name));
    return pairsMemo.get(name);
  };
  const pairsFor = (name) => {
    const r = relations.get(name);
    if (!r) throw new Error(`no relation ${name}`);
    return rowsOf(r.table).flatMap(({ row }) => {
      const a = r.from ? findIn(r.fromTables, row[r.from]) : { t: r.table, row };
      const b = findIn(r.toTables, row[r.to]);
      if (!a || !b) {
        if (!isNil(row[r.to]) || r.from) dangling.push({ relation: name, from: r.from ? row[r.from] : keyOf(r.table, row), to: row[r.to] });
        return [];
      }
      return [{ a, b, prov: S[r.table].prov || "data" }];
    });
  };

  // Depth of rows of one table along a relation, for depth levels with at.
  const depthAt = new Map();
  const depthOf = (rel, t, row) => {
    const k = rel + "\u0000" + t;
    if (!depthAt.has(k)) {
      const pairs = pairsOf(rel).filter((p) => p.a.t === t && p.b.t === t).map((p) => ({ src: keyOf(t, p.a.row), dst: keyOf(t, p.b.row) }));
      depthAt.set(k, posetRanks(rowsOf(t).map((r) => r.k), pairs).rank);
    }
    return depthAt.get(k).get(keyOf(t, row));
  };

  const levels = [...(view.y || []), ...(view.x || [])];
  const valueOf = (l, t, row) => {
    if (l.table) return { value: t };
    if (l.nest) { const c = chain(t, row); const a = c[l.nest - 1] || null; return a ? { value: id(a.t, a.row), label: String(a.row[S[a.t].label] ?? keyOf(a.t, a.row)) } : { value: null }; }
    if (l.depth && l.at) {
      const r = reach(t, row, l.at);
      if (!r) return { value: null };
      return { value: depthOf(l.depth, r.t, r.row), label: l.label ? get(r.t, r.row, l.label.split(".")).value : undefined };
    }
    if (l.col) {
      const v = get(t, row, l.col.split(".")).value;
      return { value: isNil(v) ? null : v, label: l.label ? get(t, row, l.label.split(".")).value : undefined };
    }
    return { value: null };
  };

  const boxes = new Set(view.boxes);
  const str = (v) => (isNil(v) ? "∅" : String(v));
  const where = Object.entries(view.where || {}).map(([k, vs]) => [k, new Set(vs.map(String))]);
  const byName = new Map(levels.map((l) => [levelName(l), l]));
  // A level is stored on the box under its name, so it cannot take a name the box already uses.
  for (const name of [...byName.keys(), ...(view.show || [])]) if (["id", "label", "kind", "href"].includes(name)) throw new Error(`a level or show path named "${name}" would replace the box's own ${name}; give the level a name`);
  const nodes = [], drawn = new Map();
  for (const t of [...boxes].sort()) for (const { row } of rowsOf(t)) {
    const n = { id: id(t, row), label: String(row[S[t].label] ?? keyOf(t, row)), kind: t, href: S[t].href ? row[S[t].href] ?? null : null };
    const c = chain(t, row);
    n["#root"] = id(c[0].t, c[0].row);
    n["#depth"] = c.length - 1;
    for (const l of levels) if (!(l.depth && !l.at)) {
      const v = valueOf(l, t, row), name = levelName(l);
      n[name] = v.value;
      if (v.label !== undefined) n[name + "#label"] = v.label;
    }
    for (const p of view.show || []) n[p] = get(t, row, p.split(".")).value;
    const ok = where.every(([k, vs]) => vs.has(str(byName.has(k) ? n[k] : get(t, row, k.split(".")).value)));
    if (!ok) continue;
    nodes.push(n);
    drawn.set(n.id, n);
  }

  // A line to a row that is not drawn goes to its nearest drawn nest ancestor, and is "docs" if it passed a docs row.
  const drawnOf = (e) => {
    let prov = "data";
    for (const a of [...chain(e.t, e.row)].reverse()) {
      const k = id(a.t, a.row);
      if (drawn.has(k)) return { id: k, prov };
      if (boxes.has(a.t)) return null;
      if (S[a.t].prov === "docs") prov = "docs";
    }
    return null;
  };
  // Lines with the same drawn ends, relation and source are one line, labelled with the keys they end at.
  // Each line keeps the base rows behind it: n of them, as "from → to" keys.
  const compares = view.compare || [];
  const rels = [...new Set([...(view.lines || []), ...compares.flatMap((c) => [c.claimed, c.observed]), ...levels.filter((l) => l.depth && !l.at).map((l) => l.depth)])].sort();
  const lineMap = new Map(), inside = {};
  let hidden = 0;
  for (const rel of rels) for (const p of pairsOf(rel)) {
    const s = drawnOf(p.a), d = drawnOf(p.b);
    if (!s || !d) { hidden++; continue; }
    if (s.id === d.id) { inside[rel] = (inside[rel] || 0) + 1; continue; }
    const prov = [p.prov, s.prov, d.prov].includes("docs") ? "docs" : p.prov;
    const k = [s.id, d.id, rel, prov].join("\u0000");
    if (!lineMap.has(k)) lineMap.set(k, { src: s.id, dst: d.id, rel, prov, label: new Set(), pairs: new Set() });
    const e = lineMap.get(k);
    e.label.add(keyOf(p.b.t, p.b.row));
    e.pairs.add(`${keyOf(p.a.t, p.a.row)} → ${keyOf(p.b.t, p.b.row)}`);
  }
  const done = (e) => ({ ...e, label: [...e.label].sort(cmp), pairs: [...e.pairs].sort(cmp), n: e.pairs.size });
  let edges = [...lineMap.keys()].sort().map((k) => done(lineMap.get(k)));
  // A reflexion model (Murphy, Notkin, Sullivan 1995): the claimed lines against the observed ones, on the drawn ends.
  const compared = [];
  for (const c of compares) {
    const name = `${c.observed} against ${c.claimed}`, ends = new Map();
    for (const e of edges) for (const side of ["claimed", "observed"]) if (e.rel === c[side]) {
      const k = e.src + "\u0000" + e.dst;
      if (!ends.has(k)) ends.set(k, { src: e.src, dst: e.dst, claimed: [], observed: [] });
      ends.get(k)[side].push(e);
    }
    const claimedDst = new Set([...ends.values()].filter((x) => x.claimed.length).map((x) => x.dst));
    for (const x of [...ends.values()]) {
      const state = x.claimed.length && x.observed.length ? "convergence" : x.observed.length ? "divergence" : "absence";
      if (state === "divergence" && c.scope === "claimed" && !claimedDst.has(x.dst)) continue;
      const of = state === "absence" ? x.claimed : x.observed, all = [...x.claimed, ...x.observed];
      compared.push({
        src: x.src, dst: x.dst, rel: name, state, prov: of.some((e) => e.prov === "docs") ? "docs" : "data",
        label: [...new Set(all.flatMap((e) => e.label))].sort(cmp), pairs: [...new Set(all.flatMap((e) => e.pairs))].sort(cmp), n: of.reduce((t, e) => t + e.n, 0),
        claimed: [...new Set(x.claimed.flatMap((e) => e.pairs))].sort(cmp), observed: [...new Set(x.observed.flatMap((e) => e.pairs))].sort(cmp)
      });
    }
  }
  const comparedRels = new Set(compares.flatMap((c) => [c.claimed, c.observed]));
  if (compares.length) edges = [...edges.filter((e) => !comparedRels.has(e.rel) || (view.lines || []).includes(e.rel) || levels.some((l) => l.depth === e.rel && !l.at)), ...compared.map(({ claimed: _a, observed: _b, ...e }) => e)]
    .sort((a, b) => cmp(a.src, b.src) || cmp(a.dst, b.dst) || cmp(a.rel, b.rel));
  const connected = new Set(view.connected || []);
  if (connected.size) {
    const ends = new Set(edges.flatMap((e) => [e.src, e.dst]));
    for (let i = nodes.length - 1; i >= 0; i--) if (connected.has(nodes[i].kind) && !ends.has(nodes[i].id)) nodes.splice(i, 1);
  }
  const hulls = (view.hulls || []).flatMap((h) => pairsOf(h.relation).map((p) => ({ hull: String(p.a.row[h.by]), d: drawnOf(p.b) })).filter((x) => x.d).map((x) => ({ hull: x.hull, id: x.d.id })));

  // Every relation is resolved for the report, drawn or not: a key that names no row is a gap in the data.
  for (const r of relations.keys()) pairsOf(r);
  const nested = (view.nest || []).length > 0;
  const toEngine = (l) => {
    const name = levelName(l);
    if (l.depth && !l.at) return { relation: l.depth, ...(nested ? { by: "#root" } : {}) };
    const hasLabel = l.nest || l.label;
    return { col: name, ...(hasLabel ? { label: name + "#label" } : {}) };
  };
  const { boxes: _b, lines, nest, y, x, where: _w, hulls: _h, connected: _c, compare: _k, ...pass } = view;
  return {
    nodes, edges, hulls,
    view: { ...pass, y: (y || []).map(toEngine), x: (x || []).map(toEngine), drawRelations: [...(lines || []), ...compares.map((c) => `${c.observed} against ${c.claimed}`)], cellSort: ["#depth", ...(pass.cellSort || [])] },
    report: { dangling: dangling.sort((a, b) => cmp(a.relation, b.relation) || cmp(String(a.from), String(b.from)) || cmp(String(a.to), String(b.to))), hidden, inside, compared }
  };
};
