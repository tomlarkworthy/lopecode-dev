// The nodes and edges the page drew before it drew tables directly, kept as the oracle for rel.test.js.
// Not part of the page.
const WHO = ["anyone", "workers", "owner"];

// Methods as rows inside their Worker. Every node gets service = the Worker it belongs to (its own id for a
// Worker, product or the installer). A method takes its Worker's columns, except exposure, which is its own
// `who`. calls lines go from the calling Worker to the method it calls, labelled with the method.
export const withMethods = (t, rows) => {
  const node = new Map(rows.nodes.map((n) => [n.id, n]));
  const methods = t.methods.filter((m) => node.has(m.worker)).map((m) => {
    const w = node.get(m.worker);
    const k = WHO.indexOf(m.who);
    return { ...w, id: m.id, label: m.id.slice(m.id.indexOf(".") + 1), kind: "method", service: m.worker, part: 1,
      exposure: k >= 0 ? k : null, exposure_name: k >= 0 ? WHO[k] : null, methods_n: null, secrets_n: null, signature: m.signature };
  });
  const owner = new Map(t.methods.map((m) => [m.id, m.worker]));
  const seen = new Set(), calls = [];
  for (const c of t.calls) {
    const d = owner.get(c.method);
    const k = c.worker + "\u0000" + c.method;
    if (d && d !== c.worker && !seen.has(k)) { seen.add(k); calls.push({ src: c.worker, dst: c.method, rel: "calls", prov: "data", label: c.method }); }
  }
  return {
    nodes: [...rows.nodes.map((n) => ({ ...n, service: n.id, part: 0 })), ...methods],
    edges: [...rows.edges.filter((e) => e.rel !== "calls"), ...calls],
    hulls: rows.hulls
  };
};

// Boxes: Workers, the Cloudflare products they bind, and the installer. Lines: calls, binds, deploys.
export const brainRowsOf = (t) => {
  const workerIds = new Set(t.workers.map((w) => w.id));
  const used = new Set(t.resources.map((r) => r.declared));
  const products = new Map();
  for (const b of t.bindings) if (b.product && used.has(b.declared) && !workerIds.has(b.product) && !products.has(b.product)) products.set(b.product, b.href);
  const nil = { exposure: null, exposure_name: null, verified: null, deployed_day: null, methods_n: null, secrets_n: null };
  const nodes = [
    ...t.workers.map((w) => ({ id: w.id, label: w.id.replace("brain-x-", ""), kind: "worker", role: w.role, exposure: w.exposure, exposure_name: w.exposure_name, verified: w.verified, deployed_day: w.deployed_day, methods_n: w.methods_n, secrets_n: w.secrets_n, href: w.href })),
    ...[...products].map(([p, href]) => ({ id: p, label: p, kind: "cloudflare", role: "resource", ...nil, href })),
    { id: "installer", label: "installer", kind: "actor", role: "owner", ...nil, href: null }
  ];
  const owner = new Map(t.methods.map((m) => [m.id, m.worker]));
  const seen = new Set(), edges = [];
  const add = (e) => { const k = [e.src, e.dst, e.rel, e.prov].join("\u0000"); if (!seen.has(k)) { seen.add(k); edges.push(e); } };
  for (const c of t.calls) { const d = owner.get(c.method); if (d && d !== c.worker) add({ src: c.worker, dst: d, rel: "calls", prov: "data" }); }
  for (const r of t.resources) for (const b of t.bindings) if (b.declared === r.declared && b.product && b.product !== r.worker) add({ src: r.worker, dst: b.product, rel: "binds", prov: "docs" });
  for (const d of t.deploys) add({ src: d.deployer, dst: d.worker, rel: "deploys", prov: "docs" });
  return { nodes, edges, hulls: [] };
};

// zone = longest chain of zone_order rows above the component's zone (a recursive query).
// Boxes are methods, with the depth of their component's zone along zone_order. Lines are calls.
export const tinyRowsOf = (s) => {
  const comp = new Map(s.components.map((c) => [c.id, c]));
  const zoneName = new Map(s.zones.map((z) => [z.id, z.name]));
  const depth = new Map();
  const depthOf = (z) => {
    if (!depth.has(z)) depth.set(z, Math.max(0, ...s.zone_order.filter((o) => o.inner_zone === z).map((o) => depthOf(o.outer_zone) + 1)));
    return depth.get(z);
  };
  return {
    nodes: s.methods.map((m) => {
      const c = comp.get(m.component) || {};
      const known = zoneName.has(c.zone);
      return { id: m.id, label: m.id, zone: known ? depthOf(c.zone) : null, zone_name: known ? zoneName.get(c.zone) : null, component: c.id ?? null, component_name: c.name ?? null, compute: c.compute ?? null, compute_rank: c.compute_rank ?? null };
    }),
    edges: s.calls.map((c) => ({ src: c.caller, dst: c.callee, rel: "calls" })),
    hulls: (s.flow_steps || []).map((f) => ({ hull: f.flow, id: f.method }))
  };
};

const zone = { col: "zone", label: "zone_name" };
const component = { col: "component", label: "component_name" };
const compute = { col: "compute_rank", label: "compute" };
const calls = { relation: "calls" };
export const oldSteps = {
  y1: { name: "step: y = zone", y: [zone], x: [], xTitle: "", drawRelations: [] },
  y2: { name: "step: y = zone, component", y: [zone, component], x: [], xTitle: "", drawRelations: [] },
  x: { name: "step: x = depth along calls", y: [zone, component], x: [calls], xTitle: "depth" },
  cycle: { name: "step: a cycle", y: [zone, component], x: [calls], xTitle: "depth" },
  fold: { name: "step: fold", y: [zone, component], x: [calls], xTitle: "depth" },
  drag: { name: "step: drag", y: [zone], x: [calls], xTitle: "depth" },
  missing: { name: "step: missing value", y: [zone, component], x: [calls], xTitle: "depth" },
  hull: { name: "step: hull", y: [zone, component], x: [calls], xTitle: "depth" },
  yRel: { name: "step: y = depth along calls", y: [calls], x: [zone], xTitle: "zone", yTitle: "depth" },
  byZone: { name: "by trust zone", y: [zone, component], x: [calls], xTitle: "depth" },
  byCompute: { name: "by compute", y: [compute, component], x: [calls], xTitle: "depth" }
};


// Boxes are methods with their component's columns; lines are calls; hulls are flow steps.
export const rowsOf = (s) => {
  const comp = new Map(s.components.map((c) => [c.id, c]));
  return {
    nodes: s.methods.map((m) => { const c = comp.get(m.component); return { id: m.id, label: m.id, layer: c.layer, layer_name: c.layer_name, component: c.id, component_name: c.name, compute: c.compute, compute_rank: c.compute_rank }; }),
    edges: s.calls.map((c) => ({ src: c.caller, dst: c.callee, rel: "calls" })),
    hulls: s.flow_steps.map((f) => ({ hull: f.flow, id: f.method }))
  };
};

// The chapters as engine views over brainRowsOf.
const role = { col: "role" };
const exposure = { col: "exposure", label: "exposure_name" };
export const oldChapters = {
  runs: { name: "1 · what runs", kinds: ["worker"], y: [role], x: [], xTitle: "", drawRelations: [], wrap: 7 },
  deploys: { name: "2 · who deploys it", kinds: ["worker", "actor"], y: [{ relation: "deploys" }], yTitle: "step", x: [], xTitle: "", drawRelations: ["deploys"], wrap: 7, folds: [[2]] },
  calls: { name: "3 · who can call it", kinds: ["worker"], y: [exposure], x: [{ relation: "calls" }], xTitle: "call depth", drawRelations: ["calls"], wrap: 3, edgeLabels: true },
  binds: { name: "4 · what it touches", kinds: ["worker", "cloudflare"], y: [{ relation: "binds" }], yTitle: "binding depth", x: [], xTitle: "", drawRelations: ["binds"], wrap: 7, folds: [[0]] }
};

// The 2026-10-27 snapshot's views as engine views over rowsOf.
export const oldViews = [
  { name: "call graph", y: [{ col: "layer", label: "layer_name" }, { col: "component", label: "component_name" }], x: [{ relation: "calls" }], xTitle: "depth along calls" },
  { name: "compute", y: [{ col: "compute_rank", label: "compute" }, { col: "layer", label: "layer_name" }, { col: "component", label: "component_name" }], x: [{ relation: "calls" }], xTitle: "depth along calls" },
  { name: "compute × layer", y: [{ col: "compute_rank", label: "compute" }], x: [{ col: "layer", label: "layer_name" }], xTitle: "layer", drawRelations: [], hulls: false }
];
export const oldView = oldViews[0];
