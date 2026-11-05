// One view per chapter of "How Do We Understand This Slop?", over the tables of tablesOf and brainSchema.
const role = { col: "role" };
const exposure = { col: "exposure", label: "exposure_name" };
const worker = { name: "worker", nest: 1 };
export const chapters = {
  runs: { name: "1 · what runs", boxes: ["workers"], lines: [], y: [role], x: [], xTitle: "", wrap: 7 },
  methods: { name: "2 · what each answers", boxes: ["methods"], nest: ["methods.worker"], lines: [], y: [role, worker, { name: "who", col: "who_rank", label: "who" }], x: [], xTitle: "", show: ["params"], showNames: false, wrap: 3, slot: 250 },
  calls: { name: "3 · who calls what", boxes: ["workers", "methods"], nest: ["methods.worker"], connected: ["methods"], lines: ["calls"], y: [exposure, worker], x: [{ depth: "calls" }], xTitle: "call depth", wrap: 3, slot: 140 },
  deploys: { name: "4 · who deploys it", boxes: ["workers", "actors"], connected: ["actors"], lines: ["deploys"], y: [{ depth: "deploys" }], yTitle: "step", x: [], xTitle: "", wrap: 7, folds: [[2]] },
  binds: { name: "5 · what it touches", boxes: ["workers", "products"], nest: ["bindings.product"], lines: ["resources"], y: [{ depth: "resources" }], yTitle: "binding depth", x: [], xTitle: "", wrap: 7, folds: [[0]] },
  claims: { name: "6 · what the docs do not say", boxes: ["workers"], nest: ["methods.worker", "doc_methods.worker"], connected: ["workers"], lines: [], compare: [{ claimed: "said_calls", observed: "calls", scope: "claimed" }], y: [role], x: [], xTitle: "", wrap: 7 },
  reach: { name: "7 · what a stranger reaches", boxes: ["actors", "workers", "products"], nest: ["methods.worker", "paths.worker", "bindings.product"], connected: ["actors", "workers", "products"], lines: ["reach"], y: [{ depth: "reach" }], yTitle: "from a stranger", x: [], xTitle: "", show: ["holds"], showNames: false, wrap: 6 },
  strangers: { name: "8 · what the tests say about strangers", boxes: ["actors", "workers"], nest: ["methods.worker", "paths.worker", "tests.worker"], connected: ["actors", "workers"], lines: [], compare: [{ claimed: "doors", observed: "stranger_tests" }], y: [{ table: true }], x: [], xTitle: "", show: ["tests_said"], showNames: false, wrap: 7 },
};
