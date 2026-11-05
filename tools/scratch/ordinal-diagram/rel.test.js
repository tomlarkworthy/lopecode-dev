import { test, expect } from "bun:test";
import { compile, relationsOf } from "./rel.js";
import { layout, render } from "./engine.js";
import { tiny, tinyWithMissing, tinyWithCycle, tinyWithHull, tinyWithIntent, steps as newSteps, tinySchema } from "./tiny.js";
import { tablesOf, brainSchema } from "./live.js";
import { chapters } from "./chapters.js";
import { brainRowsOf, withMethods, tinyRowsOf, oldSteps as steps, oldChapters } from "./oracle.js";
import raw from "./cb4-public.json";
import { snapshot, snapshotSchema, views } from "./snapshot.js";
import { rowsOf, oldViews } from "./oracle.js";

const strip = (s) => s.replace(/^[a-z_]+:/, "");
const shape = (L) => ({
  rows: L.rows,
  at: Object.fromEntries(L.items.map((it) => [strip(it.id || it.key), `${it.row},${it.col ?? it.colMin},${it.slot ?? ""}`])),
  edges: L.liftedEdges.map((e) => [strip(e.src), strip(e.dst), e.rel, e.count].join(" ")).sort(),
  excluded: L.excluded.map(strip)
});

// The shop's tutorial levels, written against its tables.
const zone = { name: "zone", depth: "zone_order", at: "component.zone", label: "name" };
const component = { name: "component", col: "component", label: "component.name" };
const compute = { name: "compute_rank", col: "component.compute_rank", label: "component.compute" };
const calls = { depth: "calls" };

test("relations come from the keys", () => {
  expect(relationsOf(tinySchema).map((r) => r.name)).toEqual(["calls", "components.zone", "flow_steps.method", "intended", "methods.component", "zone_order"]);
});

test("the shop's tables, drawn directly, give the tutorial's layouts", () => {
  const cases = [
    [steps.y1, { y: [zone], x: [] }, tiny],
    [steps.x, { y: [zone, component], x: [calls], lines: ["calls"] }, tiny],
    [steps.byCompute, { y: [compute, component], x: [calls], lines: ["calls"] }, tiny],
    [steps.yRel, { y: [calls], x: [zone], lines: ["calls"] }, tiny],
    [steps.missing, { y: [zone, component], x: [calls], lines: ["calls"] }, tinyWithMissing],
    [steps.cycle, { y: [zone, component], x: [calls], lines: ["calls"] }, tinyWithCycle]
  ];
  for (const [old, v, data] of cases) {
    const C = compile(data, tinySchema, { boxes: ["methods"], lines: [], ...v });
    const before = layout({ view: old, ...tinyRowsOf(data) });
    const after = layout({ view: C.view, nodes: C.nodes, edges: C.edges });
    expect([old.name, shape(after)]).toEqual([old.name, shape(before)]);
  }
});

test("cb4's tables, drawn directly, give the nested Worker view", () => {
  const t = tablesOf(raw);
  const M = withMethods(t, brainRowsOf(t));
  const old = layout({ view: { y: [{ col: "role" }, { col: "service" }], x: [{ relation: "calls", by: "service" }], filter: { kind: ["worker", "method"] }, drawRelations: ["calls"], cards: true, cellSort: ["part"] }, ...M, folds: [2] });
  const C = compile(t, brainSchema, { boxes: ["workers", "methods"], lines: ["calls"], nest: ["methods.worker"], y: [{ col: "role" }, { nest: 1 }], x: [{ depth: "calls" }], cards: true });
  const L = layout({ view: C.view, nodes: C.nodes, edges: C.edges, folds: [2] });
  // A folded service is keyed by its prefix: [role, root id].
  const key = (L, f) => L.liftedEdges.map((e) => [f(e.src), f(e.dst), e.labels.join(",")].join(" ")).sort();
  const root = (s) => (s.startsWith("[") ? strip(JSON.parse(s)[1]) : strip(s));
  const service = (s) => (s.startsWith("[") ? JSON.parse(s)[1] : s);
  expect(key(L, root)).toEqual(key(old, service));
  expect(L.rows).toEqual(old.rows);
  const at = (L, f) => Object.fromEntries(L.items.map((it) => [it.id ? strip(it.id) : f(it.key), `${it.row},${it.col}`]));
  expect(at(L, root)).toEqual(at(old, service));
  expect(L.sccs.map((s) => s.members.map(strip).join("+"))).toEqual(["brain-x-fly+brain-x-loop"]);
  // The gaps are reported, not drawn: resources with no binding row, and calls to no method.
  const gaps = C.report.dangling;
  expect([...new Set(gaps.filter((g) => g.relation === "resources").map((g) => g.to))].sort()).toEqual(["containers", "workers"]);
  expect(gaps.filter((g) => g.relation === "calls").map((g) => g.to)).toEqual(["*.send"]);
});

test("a table left out of boxes lifts its lines to the nest parent", () => {
  const t = tablesOf(raw);
  const C = compile(t, brainSchema, { boxes: ["workers"], lines: ["calls"], nest: ["methods.worker"], y: [{ col: "role" }], x: [{ depth: "calls" }] });
  const pairs = new Set(C.edges.map((e) => `${strip(e.src)} ${strip(e.dst)}`));
  const old = new Set(brainRowsOf(t).edges.filter((e) => e.rel === "calls").map((e) => `${e.src} ${e.dst}`));
  expect([...pairs].filter((p) => !p.split(" ").every((x, i, a) => x === a[0])).sort()).toEqual([...old].sort());
});

test("compile is a function of the row sets, not their order", () => {
  const t = tablesOf(raw);
  const rev = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, [...v].reverse()]));
  const v = { boxes: ["workers", "methods", "secrets"], lines: ["calls"], nest: ["methods.worker", "secrets.worker"], y: [{ col: "role" }, { nest: 1 }], x: [{ depth: "calls" }], cards: true };
  const draw = (tb) => { const C = compile(tb, brainSchema, v); return render(layout({ view: C.view, nodes: C.nodes, edges: C.edges, folds: [2] })).svg; };
  expect(draw(rev)).toBe(draw(t));
});

const shapeP = (L) => ({ ...shape(L), edges: L.liftedEdges.map((e) => [strip(e.src), strip(e.dst), e.rel, e.prov || "data", e.count].join(" ")).sort(), sccs: L.sccs.map((c) => c.members.map(strip).join("+")), hulls: L.hulls.map((h) => h.hull + ":" + h.items.map(strip).join(",")) });
const drawn = (tables, schema, v, folds) => { const C = compile(tables, schema, v); return layout({ view: C.view, nodes: C.nodes, edges: C.edges, hulls: C.hulls, folds: folds ?? v.folds ?? [] }); };

test("every tutorial step drawn from tables matches the old rows", () => {
  const data = { cycle: tinyWithCycle, missing: tinyWithMissing, hull: tinyWithHull };
  for (const k of Object.keys(steps).filter((k) => k in newSteps)) {
    const d = data[k] || tiny;
    for (const folds of [[], [[1]], [[2]]]) {
      const before = layout({ view: steps[k], ...tinyRowsOf(d), folds });
      expect([k, folds, shapeP(drawn(d, tinySchema, newSteps[k], folds))]).toEqual([k, folds, shapeP(before)]);
    }
  }
});

test("every chapter drawn from tables matches the old rows", () => {
  const t = tablesOf(raw), R = brainRowsOf(t);
  // methods and calls are drawn at method level since 2026-11-03; the old rows had no method boxes.
  for (const k of ["runs", "deploys", "binds"]) {
    const before = layout({ view: oldChapters[k], ...R, folds: oldChapters[k].folds || [] });
    // The old binds lines are the resources link table's rows, lifted through bindings to the product.
    const old = shapeP(before);
    expect([k, shapeP(drawn(t, brainSchema, chapters[k]))]).toEqual([k, { ...old, edges: old.edges.map((e) => e.replace(" binds ", " resources ")) }]);
  }
});

test("a calls line between two Workers is one line, labelled with every method it carries", () => {
  const t = tablesOf(raw);
  const C = compile(t, brainSchema, { ...chapters.calls, boxes: ["workers"], connected: [], y: [{ col: "exposure" }] });
  const e = C.edges.find((e) => e.src === "workers:brain-x-loop" && e.dst === "workers:brain-x-fly");
  const want = [...new Set(t.calls.filter((c) => c.worker === "brain-x-loop" && t.methods.find((m) => m.id === c.method)?.worker === "brain-x-fly").map((c) => c.method))].sort();
  expect(e.label).toEqual(want);
  expect(C.edges.filter((e) => e.src === "workers:brain-x-loop" && e.dst === "workers:brain-x-fly").length).toBe(1);
});

test("the 2026-10-27 snapshot's views drawn from tables match the old rows", () => {
  for (const [i, v] of views.entries()) for (const folds of [[], [[2]], [[3]], [[2], [3]]]) {
    const before = layout({ view: oldViews[i], ...rowsOf(snapshot), folds });
    expect([v.name, folds, shapeP(drawn(snapshot, snapshotSchema, v, folds))]).toEqual([v.name, folds, shapeP(before)]);
  }
});

test("chapter 2 draws every method once, in its Worker's row, under who may call it", () => {
  const t = tablesOf(raw);
  const C = compile(t, brainSchema, chapters.methods);
  const L = layout({ view: C.view, nodes: C.nodes, edges: C.edges });
  expect(L.items.filter((it) => it.kind === "leaf").length).toBe(t.methods.length);
  const at = new Map(L.items.map((it) => [strip(it.id), it]));
  for (const m of t.methods) expect([m.id, L.rows[at.get(m.id).row].slice(1)]).toEqual([m.id, ["workers:" + m.worker, m.who_rank]]);
  expect(C.nodes.find((n) => n.id === "methods:ai.models").params).toBe("(search?, task?, per_page?, page?)");
});

test("chapter 3 draws a line from each caller to each method it calls in another Worker", () => {
  const t = tablesOf(raw);
  const C = compile(t, brainSchema, chapters.calls);
  const own = new Map(t.methods.map((m) => [m.id, m.worker]));
  const want = [...new Set(t.calls.filter((c) => own.has(c.method) && own.get(c.method) !== c.worker).map((c) => `workers:${c.worker} methods:${c.method}`))].sort();
  expect(C.edges.map((e) => `${e.src} ${e.dst}`).sort()).toEqual(want);
  const methodBoxes = C.nodes.filter((n) => n.kind === "methods").map((n) => n.id.slice(8)).sort();
  expect(methodBoxes).toEqual([...new Set(want.map((w) => w.split(" methods:")[1]))].sort());
  const L = layout({ view: C.view, nodes: C.nodes, edges: C.edges });
  // A method sits in its Worker's column: depth along calls is the Worker's.
  const col = new Map(L.items.map((it) => [it.id, it.col]));
  for (const n of C.nodes.filter((n) => n.kind === "methods")) expect([n.id, col.get(n.id)]).toEqual([n.id, col.get(n["#root"])]);
  expect(L.sccs.map((s) => s.members.map(strip).join("+"))).toEqual(["brain-x-fly+brain-x-loop"]);
});

// Holt's lift (WCRE 1998) in relation algebra: lifted = C ∘ R ∘ C⁻¹ minus the identity,
// where C relates each drawn box to every row it contains, itself included (contain*).
const compose = (A, B) => { const out = new Set(); for (const ab of A) { const [a, b] = ab.split(" "); for (const bc of B) { const [b2, c] = bc.split(" "); if (b === b2) out.add(`${a} ${c}`); } } return out; };
const inverse = (A) => new Set([...A].map((p) => p.split(" ").reverse().join(" ")));
test("a lifted line is the relation composed with containment, as in Holt's lift", () => {
  const cases = [
    [tiny, tinySchema, { boxes: ["components"], lines: ["calls"], nest: ["methods.component"], y: [], x: [] }, "calls", "caller", "callee", "methods", "component", "components"],
    [tablesOf(raw), brainSchema, { boxes: ["workers"], lines: ["calls"], nest: ["methods.worker"], y: [], x: [] }, "calls", "worker", "method", "methods", "worker", "workers"]
  ];
  for (const [data, schema, view, rel, from, to, child, fk, parent] of cases) {
    // A link table's from-column may already name a parent row (cb4's calls.worker), or a child row (the shop's calls.caller).
    const ref = (k) => (data[parent].some((p) => p.id === k) ? `${parent}:${k}` : `${child}:${k}`);
    const R = new Set(data[rel].map((r) => `${ref(r[from])} ${child}:${r[to]}`).filter((p) => p.split(" ").every((x) => x.startsWith(parent) || data[child].some((c) => `${child}:${c.id}` === x))));
    const C = new Set([...data[parent].map((p) => `${parent}:${p.id} ${parent}:${p.id}`), ...data[child].map((c) => `${parent}:${c[fk]} ${child}:${c.id}`)]);
    const lifted = [...compose(compose(C, R), inverse(C))].filter((p) => { const [a, b] = p.split(" "); return a !== b; }).sort();
    const C2 = compile(data, schema, view);
    expect(C2.edges.map((e) => `${e.src} ${e.dst}`).sort()).toEqual(lifted);
  }
});

test("the design doc against the calls: one convergence, divergence or absence per pair of components", () => {
  const C = compile(tinyWithIntent, tinySchema, newSteps.compare);
  const got = C.edges.map((e) => `${e.state} ${strip(e.src)}→${strip(e.dst)} ${e.prov} n=${e.n}`);
  expect(got).toEqual(["divergence api→auth data n=2", "convergence api→db data n=2", "convergence auth→db data n=1", "convergence web→api data n=2", "absence web→auth docs n=1"]);
  const L = layout({ view: C.view, nodes: C.nodes, edges: C.edges });
  expect(L.liftedEdges.map((e) => `${e.state} ${e.weight}`).sort()).toEqual(["absence 1", "convergence 1", "convergence 2", "convergence 2", "divergence 2"]);
  expect(C.report.compared.find((e) => e.state === "divergence").observed).toEqual(["api.list → auth.check", "api.save → auth.check"]);
});

test("cb4's deployer reference claims four calls from the kernel that the kernel does not publish", () => {
  const t = tablesOf(raw);
  const C = compile(t, brainSchema, chapters.claims);
  expect(C.report.compared.map((e) => `${e.state} ${strip(e.src)}→${strip(e.dst)} ${e.label.join(",")}`)).toEqual(["absence brain→brain-deployer member.deploy,member.modules,member.purge,member.remove"]);
  expect(t.workers.find((w) => w.id === "brain").role).toBe("kernel");
  expect(t.resources.filter((r) => r.worker === "brain").map((r) => r.declared)).toContain("deployer");
});

test("a fold's line weight counts base rows, not the lines it merged", () => {
  // Two calls, api.list → db.read and api.save → db.write, lift to one api → db line of n = 2. Folding to zones adds auth.check → db.read: weight 3 over 2 lines.
  const v = { boxes: ["components"], lines: ["calls"], nest: ["methods.component"], y: [{ col: "zone" }, { name: "component", col: "id" }], x: [] };
  expect(() => compile(tiny, tinySchema, { ...v, y: [{ col: "id" }] })).toThrow(/give the level a name/);
  const C = compile(tiny, tinySchema, v);
  expect(C.edges.find((e) => e.src === "components:api" && e.dst === "components:db").n).toBe(2);
  const L = layout({ view: C.view, nodes: C.nodes, edges: C.edges, folds: [1] });
  const e = L.liftedEdges.find((e) => e.src === '["edge"]' && e.dst === '["data"]');
  expect([e.count, e.weight]).toEqual([2, 3]);
  expect(e.pairs).toEqual(["api.list → db.read", "api.save → db.write", "auth.check → db.read"]);
  // api → auth folds inside the edge zone: one line, two calls.
  expect(L.internal.get('["edge"]')).toBe(2);
});

test("cb4: what a stranger reaches, and which doors no test name speaks of", () => {
  const t = tablesOf(raw);
  const reach = compile(t, brainSchema, chapters.reach);
  expect(reach.nodes.some((n) => n.id === "workers:brain-deployer")).toBe(false);
  expect(reach.edges.filter((e) => e.src === "actors:stranger").length).toBe(12);
  expect(reach.edges.find((e) => e.dst === "workers:brain-x-pds").n).toBe(21);
  const by = Object.groupBy(compile(t, brainSchema, chapters.strangers).report.compared, (e) => e.state);
  expect(by.absence.map((e) => e.dst.slice(8))).toEqual(["brain-db", "brain-x-blob", "brain-x-feed", "brain-x-issues", "brain-x-page", "brain-x-pds"]);
  expect(by.divergence.map((e) => e.dst.slice(8))).toEqual(["brain", "brain-x-bluesky"]);
  // A claim from data stays solid when it is absent.
  expect(by.absence.every((e) => e.prov === "data")).toBe(true);
});
