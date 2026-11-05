import { test, expect } from "bun:test";
import { layout, render, reorder, keyBetween, posetRanks } from "./engine.js";
import { snapshot } from "./snapshot.js";
import { rowsOf, tinyRowsOf, oldSteps as steps, oldViews as views, oldView as view } from "./oracle.js";
import { writeFileSync } from "node:fs";

const base = rowsOf(snapshot);
const shuffle = (a, seed) => { const b = [...a]; let s = seed; for (let i = b.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const svgOf = (rows, extra = {}) => render(layout({ view, ...rows, ...extra }), { labelFor: (p) => String(p[p.length - 1]) }).svg;

test("same input, same SVG; snapshot row order does not matter", () => {
  const a = svgOf(base);
  expect(svgOf(base)).toBe(a);
  for (const seed of [1, 7, 42]) expect(svgOf({ nodes: shuffle(base.nodes, seed), edges: shuffle(base.edges, seed + 1), hulls: shuffle(base.hulls, seed + 2) })).toBe(a);
});

test("a node missing an axis value is excluded and counted", () => {
  const L = layout({ view, ...base });
  expect(L.excluded).toEqual(["cache.get"]);
});

test("a cycle in the data shares one rank and is reported", () => {
  const L = layout({ view, ...base });
  expect(L.sccs).toEqual([{ relation: "calls", members: ["bluesky.poll", "core.route"] }]);
  const r = posetRanks(["a", "b", "c"], [{ src: "a", dst: "b" }, { src: "b", dst: "c" }]);
  expect([...r.rank]).toEqual([["a", 0], ["b", 1], ["c", 2]]);
});

test("folding the services layer lifts edges by count", () => {
  const L = layout({ view, ...base, folds: [[3]] });
  const g = L.items.find((it) => it.kind === "group");
  expect(g.members).toEqual(["bluesky.poll", "inbox.poll", "library.blobs", "metrics.query", "secret.get"]);
  const fromRoute = L.liftedEdges.filter((e) => e.src === "core.route" && e.dst === "[3]");
  expect(fromRoute).toEqual([{ src: "core.route", dst: "[3]", rel: "calls", prov: "data", count: 4, weight: 4, labels: [], pairs: [] }]);
});

test("a drag writes the cell's keys once, then one row per drag; data is untouched", () => {
  const before = JSON.stringify(base);
  const L = layout({ view, ...base });
  const cell = [...L.cells.values()].find((ids) => ids.length > 1);
  const first = reorder({ order: [], cellIds: cell, id: cell[0], toIndex: cell.length });
  expect(first.written.length).toBe(cell.length);
  const L2 = layout({ view, ...base, order: first.order });
  const cell2 = [...L2.cells.values()].find((ids) => ids.includes(cell[0]));
  expect(cell2[cell2.length - 1]).toBe(cell[0]);
  const second = reorder({ order: first.order, cellIds: cell2, id: cell[0], toIndex: 0 });
  expect(second.written.length).toBe(1);
  const L3 = layout({ view, ...base, order: second.order });
  expect([...L3.cells.values()].find((ids) => ids.includes(cell[0]))[0]).toBe(cell[0]);
  expect(JSON.stringify(base)).toBe(before);
});

test("keyBetween orders between any two keys", () => {
  let lo = "", hi = null, keys = [];
  for (let i = 0; i < 50; i++) { const k = keyBetween(lo, hi); keys.push(k); if (i % 2) lo = k; else hi = k; }
  for (const k of keys) expect(k.endsWith("0")).toBe(false);
  const a = keyBetween("", null), b = keyBetween(a, null), m = keyBetween(a, b);
  expect(a < m && m < b).toBe(true);
});

test("one snapshot, three views: folding the Worker compute row gathers kernel, core and services", () => {
  const L = layout({ view: views[1], ...base, folds: [[2]] });
  const g = L.items.find((it) => it.kind === "group");
  expect(g.members.length).toBe(11);
  expect(L.liftedEdges.filter((e) => e.dst === "[2]").map((e) => [e.src, e.count])).toEqual([["drain.run", 1], ["tab.ui", 3]]);
  const M = layout({ view: views[2], ...base });
  expect(M.rows.length).toBe(5);
  expect(M.cols.length).toBe(5);
  expect(M.liftedEdges.length + M.sccs.length + M.hulls.length).toBe(0);
  for (const v of views) expect(render(layout({ view: v, ...base })).svg).toBe(render(layout({ view: v, ...base, nodes: [...base.nodes].reverse() })).svg);
});

test("write sample SVGs", () => {
  writeFileSync(new URL("./open.svg", import.meta.url), svgOf(base));
  writeFileSync(new URL("./folded.svg", import.meta.url), svgOf(base, { folds: [[3], [4]] }));
});

import { tiny, tinyWithCycle, tinyWithMissing } from "./tiny.js";
test("tutorial steps on the tiny shop", () => {
  const R = tinyRowsOf(tiny);
  expect(layout({ view: steps.y1, ...R }).rows.length).toBe(3);
  const X = layout({ view: steps.x, ...R });
  const colOf = (id) => X.items.find((it) => it.id === id).col;
  expect([colOf("web.page"), colOf("api.list"), colOf("auth.check"), colOf("db.write"), colOf("db.read")]).toEqual([0, 1, 2, 2, 3]);
  expect(layout({ view: steps.cycle, ...tinyRowsOf(tinyWithCycle) }).sccs).toEqual([{ relation: "calls", members: ["api.list", "auth.check"] }]);
  expect(layout({ view: steps.missing, ...tinyRowsOf(tinyWithMissing) }).excluded).toEqual(["cache.get"]);
  const C = layout({ view: steps.byCompute, ...R, folds: [[2]] });
  expect(C.items.find((it) => it.kind === "group").members).toEqual(["auth.check", "db.read", "db.write"]);
  expect(layout({ view: steps.byZone, ...R, folds: [[2]] }).items.find((it) => it.kind === "group").members).toEqual(["db.read", "db.write"]);
});

test("y can be a relation level; folding a depth gathers unrelated boxes", () => {
  const Y = layout({ view: steps.yRel, ...tinyRowsOf(tiny), folds: [[2]] });
  expect(Y.items.find((it) => it.kind === "group").members).toEqual(["auth.check", "db.write"]);
});

test("a cell wider than wrap continues on new lines inside its row", () => {
  const nodes = Array.from({ length: 14 }, (_, i) => ({ id: "n" + String(i).padStart(2, "0"), g: 0 }));
  const L = layout({ view: { y: [{ col: "g" }], x: [], wrap: 5 }, nodes });
  expect(L.lines).toEqual([3]);
  expect(L.colWidth).toEqual([5]);
  const { geometry: G } = render(L);
  expect(G.box.get("n05").y - G.box.get("n00").y).toBe(46);
  expect(G.box.get("n05").x).toBe(G.box.get("n00").x);
});
