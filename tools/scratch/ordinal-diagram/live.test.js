import { test, expect } from "bun:test";
import { tablesOf, parseBindings } from "./live.js";
import { brainRowsOf, withMethods, oldChapters as chapters } from "./oracle.js";
import { layout, render } from "./engine.js";
import raw from "./cb4-public.json";

const t = tablesOf(raw);
const R = brainRowsOf(t);

test("cb4 fixture: tables, deploy chain, cycle, gaps", () => {
  expect(t.workers.length).toBe(30);
  expect(layout({ view: chapters.deploys, ...R }).rows.length).toBe(3);
  expect(layout({ view: chapters.calls, ...R }).sccs.map((s) => s.members)).toEqual([["brain-x-fly", "brain-x-loop"]]);
  const mapped = new Set(t.bindings.filter((b) => b.product).map((b) => b.declared));
  expect([...new Set(t.resources.map((r) => r.declared))].filter((d) => !mapped.has(d)).sort()).toEqual(["containers", "workers"]);
  expect(t.bindings.some((b) => b.declared === "docs")).toBe(false);
  expect(t.calls.filter((c) => c.worker === "brain-deployer").map((c) => c.method)).toEqual(["blob.upload"]);
});

test("every chapter renders the same SVG whatever the row order", () => {
  for (const v of Object.values(chapters)) {
    const a = render(layout({ view: v, ...R, folds: v.folds || [] })).svg;
    const b = render(layout({ view: v, nodes: [...R.nodes].reverse(), edges: [...R.edges].reverse(), folds: v.folds || [] })).svg;
    expect(b).toBe(a);
  }
});

test("parseBindings reads the declared → binding table", () => {
  const rows = parseBindings("x\n| declared | binding |\n|---|---|\n| `rows` | `SQL`, the one D1 database of the Brain |\n| `inbox`, `xrpc` | `CORE`, the core |\n| field | holds |\n|---|---|\n| `docs` | the manifest |\n\nafter");
  expect(rows.map((r) => r.declared)).toEqual(["rows", "inbox", "xrpc"]);
});

test("view.filter keeps matching rows; view.show adds a line per column", () => {
  const v = { name: "f", y: [{ col: "role" }], x: [], filter: { kind: ["worker"], role: ["core", "kernel"] }, show: ["methods_n", "verified"] };
  const L = layout({ view: v, ...R });
  expect(L.items.map((i) => i.id).sort()).toEqual(["brain", "brain-core"]);
  const { svg, geometry } = render(L);
  expect(geometry.box.get("brain").h).toBe(26 + 26);
  expect(svg).toContain(">verified ");
});

test("signatures from lexicons; call lines carry their methods", () => {
  const sig = Object.fromEntries(t.methods.map((m) => [m.id, m.signature]));
  expect(sig["ai.models"]).toBe("ai.models(search?, task?, per_page?, page?)");
  expect(sig["ai.v1/embeddings"]).toBe("ai.v1/embeddings(usd?) {model}");
  expect(t.methods.filter((m) => m.signature.endsWith("(…)")).length).toBe(0);
  const edges = R.edges.map((e) => (e.rel === "calls" ? { ...e, label: "x.y" } : e));
  const L = layout({ view: { name: "c", y: [], x: [{ relation: "calls" }], drawRelations: ["calls"], edgeLabels: true }, nodes: R.nodes, edges });
  expect(L.liftedEdges.every((e) => e.labels.length === 1)).toBe(true);
  expect(render(L).svg).toContain("<title>x.y</title>");
});

test("methods inside their Worker: folding the service level gives the Worker view back", () => {
  const M = withMethods(t, R);
  const ids = M.nodes.map((n) => n.id);
  expect(new Set(ids).size).toBe(ids.length);
  // Worker-level calls lines, each labelled with the methods it carries, as the page draws them today.
  const owner = new Map(t.methods.map((m) => [m.id, m.worker]));
  const labelled = R.edges.flatMap((e) => e.rel !== "calls" ? [e] :
    t.calls.filter((c) => c.worker === e.src && owner.get(c.method) === e.dst).map((c) => ({ ...e, label: c.method })));
  const kinds = { kind: ["worker", "method"] };
  const before = layout({ view: { y: [{ col: "role" }], x: [{ relation: "calls" }], filter: { kind: ["worker"] }, drawRelations: ["calls"] }, nodes: R.nodes, edges: labelled });
  const after = layout({ view: { y: [{ col: "role" }, { col: "service" }], x: [{ relation: "calls", by: "service" }], filter: kinds, drawRelations: ["calls"] }, ...M, folds: [2] });
  const key = (L) => L.liftedEdges.map((e) => [e.src, e.dst, e.labels.join(",")].join(" ")).sort();
  // A folded service is a group keyed by its prefix; map it back to the Worker id.
  const unfold = (L) => L.liftedEdges.map((e) => ({ ...e, src: e.src.startsWith("[") ? JSON.parse(e.src)[1] : e.src, dst: e.dst.startsWith("[") ? JSON.parse(e.dst)[1] : e.dst }));
  expect(key({ liftedEdges: unfold(after) })).toEqual(key(before));
  const xOf = (L) => Object.fromEntries(L.items.map((it) => [it.id || JSON.parse(it.key)[1], it.col ?? it.colMin]));
  const b = xOf(before), a = xOf(after);
  for (const w of Object.keys(b)) expect([w, a[w]]).toEqual([w, b[w]]);
  expect(after.sccs.map((s) => s.members.join("+"))).toEqual(["brain-x-fly+brain-x-loop"]);
  // As cards, each folded service sits where its Worker sat: same rows, same row and column per Worker.
  const cards = layout({ view: { y: [{ col: "role" }, { col: "service" }], x: [{ relation: "calls", by: "service" }], filter: kinds, drawRelations: ["calls"], cards: true }, ...M, folds: [2] });
  expect(cards.rows).toEqual(before.rows);
  const at = (L) => Object.fromEntries(L.items.map((it) => [it.id || JSON.parse(it.key)[1], `${it.row},${it.col}`]));
  expect(at(cards)).toEqual(at(before));
  expect(key({ liftedEdges: unfold(cards) })).toEqual(key(before));
  expect(render(cards).svg).toContain(">8 methods, 1 worker<");
  // Opened: blob's methods sit in blob's row and column, and deployer → blob.upload is one line to that method.
  const open = layout({ view: { y: [{ col: "role" }, { col: "service" }], x: [{ relation: "calls", by: "service" }], filter: kinds, drawRelations: ["calls"], cellSort: ["part"] }, ...M, folds: [2, { open: ["recipe", "brain-x-blob"] }] });
  const blob = open.items.filter((it) => it.kind === "leaf" && it.node.service === "brain-x-blob");
  expect(blob[0].id).toBe("brain-x-blob");
  expect(new Set(blob.map((it) => `${it.row},${it.col}`)).size).toBe(1);
  expect(open.liftedEdges.some((e) => e.dst === "blob.upload" && e.labels.join() === "blob.upload")).toBe(true);
  const g = open.items.find((it) => it.kind === "group" && JSON.parse(it.key)[1] === "brain-x-ai");
  expect(g.kinds.map((k) => k.kind)).toEqual(["method", "worker"]);
  expect(render(open).svg).toContain('data-fold="2"');
});
