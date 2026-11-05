// Illustrative snapshot of the Cloud Brain request path. Component and method names are from
// tools/cloud-brain/rpc-performance.md (measured 2026-10-08); the call graph is a sketch, not a
// trace, and bluesky.poll -> core.route is invented to give the poset a cycle. drain2 is
// cloud-brain-dev/drain2.ts; that it runs on a Fly machine and calls kernel.xrpc is illustrative.
export const snapshot = {
  components: [
    { id: "tab", name: "open tab", layer: 0, layer_name: "client", compute: "browser", compute_rank: 0 },
    { id: "drain", name: "drain2", layer: 0, layer_name: "client", compute: "Fly machine", compute_rank: 1 },
    { id: "kernel", name: "brain-kernel", layer: 1, layer_name: "edge", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "core", name: "brain-core", layer: 2, layer_name: "core", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "inbox", name: "inbox", layer: 3, layer_name: "services", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "bluesky", name: "bluesky", layer: 3, layer_name: "services", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "secret", name: "secret", layer: 3, layer_name: "services", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "metrics", name: "metrics", layer: 3, layer_name: "services", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "library", name: "library", layer: 3, layer_name: "services", compute: "Cloudflare Worker", compute_rank: 2 },
    { id: "d1", name: "cb4-sql (D1)", layer: 4, layer_name: "storage", compute: "D1 (SQLite)", compute_rank: 3 },
    { id: "r2", name: "R2", layer: 4, layer_name: "storage", compute: "R2 (objects)", compute_rank: 4 },
    { id: "planned", name: "planned cache", layer: null, layer_name: null, compute: null, compute_rank: null }
  ],
  methods: [
    { id: "tab.ui", component: "tab" },
    { id: "drain.run", component: "drain" },
    { id: "kernel.health", component: "kernel" },
    { id: "kernel.session", component: "kernel" },
    { id: "kernel.xrpc", component: "kernel" },
    { id: "core.route", component: "core" },
    { id: "core.decide", component: "core" },
    { id: "core.charge", component: "core" },
    { id: "inbox.poll", component: "inbox" },
    { id: "bluesky.poll", component: "bluesky" },
    { id: "secret.get", component: "secret" },
    { id: "metrics.query", component: "metrics" },
    { id: "library.blobs", component: "library" },
    { id: "rows.get", component: "d1" },
    { id: "rows.append", component: "d1" },
    { id: "r2.get", component: "r2" },
    { id: "cache.get", component: "planned" }
  ],
  calls: [
    { caller: "tab.ui", callee: "kernel.xrpc" },
    { caller: "drain.run", callee: "kernel.xrpc" },
    { caller: "tab.ui", callee: "kernel.session" },
    { caller: "tab.ui", callee: "library.blobs" },
    { caller: "kernel.xrpc", callee: "rows.get" },
    { caller: "kernel.xrpc", callee: "core.route" },
    { caller: "core.route", callee: "core.decide" },
    { caller: "core.route", callee: "core.charge" },
    { caller: "core.charge", callee: "rows.append" },
    { caller: "core.charge", callee: "rows.get" },
    { caller: "core.route", callee: "inbox.poll" },
    { caller: "core.route", callee: "bluesky.poll" },
    { caller: "core.route", callee: "metrics.query" },
    { caller: "core.route", callee: "secret.get" },
    { caller: "bluesky.poll", callee: "core.route" },
    { caller: "secret.get", callee: "rows.get" },
    { caller: "metrics.query", callee: "rows.get" },
    { caller: "library.blobs", callee: "r2.get" }
  ],
  flow_steps: [
    { flow: "inbox.poll path", step: 1, method: "tab.ui" },
    { flow: "inbox.poll path", step: 2, method: "kernel.xrpc" },
    { flow: "inbox.poll path", step: 3, method: "core.route" },
    { flow: "inbox.poll path", step: 4, method: "inbox.poll" }
  ]
};

// The keys of those tables, and three views drawn from them.
export const snapshotSchema = {
  tables: {
    components: { key: "id", label: "name" },
    methods: { key: "id", refs: { component: "components" } },
    calls: { link: ["caller", "callee"], refs: { caller: "methods", callee: "methods" } },
    flow_steps: { key: ["flow", "step"], refs: { method: "methods" } }
  }
};
const layer = { name: "layer", col: "component.layer", label: "component.layer_name" };
const component = { name: "component", col: "component", label: "component.name" };
const compute = { name: "compute", col: "component.compute_rank", label: "component.compute" };
const flows = [{ relation: "flow_steps.method", by: "flow" }];
export const views = [
  { name: "call graph", boxes: ["methods"], lines: ["calls"], hulls: flows, y: [layer, component], x: [{ depth: "calls" }], xTitle: "depth along calls" },
  { name: "compute", boxes: ["methods"], lines: ["calls"], hulls: flows, y: [compute, layer, component], x: [{ depth: "calls" }], xTitle: "depth along calls" },
  { name: "compute × layer", boxes: ["methods"], lines: [], y: [compute], x: [layer], xTitle: "layer" }
];

