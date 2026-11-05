// A small made-up web shop, used by the step-by-step part of the notebook.
export const tiny = {
  zones: [
    { id: "device", name: "user device" },
    { id: "edge", name: "public edge" },
    { id: "data", name: "data store" }
  ],
  // outer_zone is in front of inner_zone, as seen from the user.
  zone_order: [
    { outer_zone: "device", inner_zone: "edge" },
    { outer_zone: "edge", inner_zone: "data" }
  ],
  components: [
    { id: "web", name: "web app", zone: "device", compute: "browser", compute_rank: 0 },
    { id: "api", name: "api", zone: "edge", compute: "container", compute_rank: 1 },
    { id: "auth", name: "auth", zone: "edge", compute: "serverless", compute_rank: 2 },
    { id: "db", name: "database", zone: "data", compute: "serverless", compute_rank: 2 }
  ],
  methods: [
    { id: "web.page", component: "web" },
    { id: "api.list", component: "api" },
    { id: "api.save", component: "api" },
    { id: "auth.check", component: "auth" },
    { id: "db.read", component: "db" },
    { id: "db.write", component: "db" }
  ],
  calls: [
    { caller: "web.page", callee: "api.list" },
    { caller: "web.page", callee: "api.save" },
    { caller: "api.list", callee: "auth.check" },
    { caller: "api.save", callee: "auth.check" },
    { caller: "api.list", callee: "db.read" },
    { caller: "api.save", callee: "db.write" },
    { caller: "auth.check", callee: "db.read" }
  ]
};

// Variants for single steps.
export const tinyWithHull = {
  ...tiny,
  flow_steps: [
    { flow: "save request", step: 1, method: "web.page" },
    { flow: "save request", step: 2, method: "api.save" },
    { flow: "save request", step: 3, method: "auth.check" },
    { flow: "save request", step: 4, method: "db.write" }
  ]
};
export const tinyWithCycle = { ...tiny, calls: [...tiny.calls, { caller: "auth.check", callee: "api.list" }] };
// What the shop's design doc says each component calls. It leaves out api → auth and claims web → auth.
export const tinyWithIntent = {
  ...tiny,
  intended: [
    { from: "web", to: "api" },
    { from: "web", to: "auth" },
    { from: "api", to: "db" },
    { from: "auth", to: "db" }
  ]
};
export const tinyWithMissing = {
  ...tiny,
  components: [...tiny.components, { id: "cache", name: "cache", zone: null, compute: null, compute_rank: null }],
  methods: [...tiny.methods, { id: "cache.get", component: "cache" }]
};


// The shop's keys, for drawing its tables directly (rel.js).
export const tinySchema = {
  tables: {
    zones: { key: "id", label: "name" },
    zone_order: { link: ["outer_zone", "inner_zone"], refs: { outer_zone: "zones", inner_zone: "zones" } },
    components: { key: "id", label: "name", refs: { zone: "zones" } },
    methods: { key: "id", refs: { component: "components" } },
    calls: { link: ["caller", "callee"], refs: { caller: "methods", callee: "methods" } },
    flow_steps: { key: ["flow", "step"], refs: { method: "methods" } },
    intended: { link: ["from", "to"], refs: { from: "components", to: "components" }, prov: "docs" }
  }
};

// The tutorial's views. A box is a methods row; a line is a calls row.
const zone = { name: "zone", depth: "zone_order", at: "component.zone", label: "name" };
const component = { name: "component", col: "component", label: "component.name" };
const compute = { name: "compute", col: "component.compute_rank", label: "component.compute" };
const calls = { depth: "calls" };
const shop = { boxes: ["methods"], lines: ["calls"] };
export const steps = {
  y1: { name: "step: y = zone", ...shop, lines: [], y: [zone], x: [], xTitle: "" },
  y2: { name: "step: y = zone, component", ...shop, lines: [], y: [zone, component], x: [], xTitle: "" },
  x: { name: "step: x = depth along calls", ...shop, y: [zone, component], x: [calls], xTitle: "depth" },
  cycle: { name: "step: a cycle", ...shop, y: [zone, component], x: [calls], xTitle: "depth" },
  fold: { name: "step: fold", ...shop, y: [zone, component], x: [calls], xTitle: "depth" },
  drag: { name: "step: drag", ...shop, y: [zone], x: [calls], xTitle: "depth" },
  missing: { name: "step: missing value", ...shop, y: [zone, component], x: [calls], xTitle: "depth" },
  hull: { name: "step: hull", ...shop, y: [zone, component], x: [calls], xTitle: "depth", hulls: [{ relation: "flow_steps.method", by: "flow" }] },
  compare: { name: "step: the design against the calls", boxes: ["components"], nest: ["methods.component"], lines: [], compare: [{ claimed: "intended", observed: "calls" }], y: [{ name: "zone", depth: "zone_order", at: "zone", label: "name" }], x: [], xTitle: "", wrap: 4 },
  yRel: { name: "step: y = depth along calls", ...shop, y: [calls], x: [zone], xTitle: "zone", yTitle: "depth" },
  byZone: { name: "by trust zone", ...shop, y: [zone, component], x: [calls], xTitle: "depth" },
  byCompute: { name: "by compute", ...shop, y: [compute, component], x: [calls], xTitle: "depth" }
};
