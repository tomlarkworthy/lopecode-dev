// Scenarios and the notebook-kit reference arm shared by the headless and browser display tests.
// Importing this installs happy-dom globals and headless stubs.
import { Window } from "happy-dom";
import { Runtime } from "@observablehq/runtime";
import { define as nkDefine } from "../../../vendor/notebook-kit/src/runtime/define.ts";
import { display, clear, observe } from "../../../vendor/notebook-kit/src/runtime/display.ts";
import { input } from "../../../vendor/notebook-kit/src/runtime/stdlib/generators/input.ts";
import { Mutator } from "../../../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";
import { transpileJavaScript } from "../../../vendor/notebook-kit/src/javascript/transpile.ts";
import { transpileObservable } from "../../../vendor/notebook-kit/src/javascript/observable.ts";

const win = new Window();
for (const k of ["Element", "Text", "Node", "HTMLElement", "DocumentFragment", "Event"])
  (globalThis as any)[k] = (win as any)[k];
(globalThis as any).document = win.document;
// js-toolchain's attachment loader map runs inside define(); headless there is no embedded content.
(globalThis as any).window = { lopecode: { contentSync: () => ({ status: 404, mime: "text/plain", bytes: new Uint8Array() }) } };
// lopecode's page runtime has fileAttachments; the bare package does not (same stub as tools/corepox-*.ts).
(Runtime.prototype as any).fileAttachments ??= () => () => null;
process.on("unhandledRejection", () => {});

export const nkRuntime = { display, clear, observe, input, Mutator };

export const settle = async () => {
  for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0));
};
export const snap = (root: any) =>
  [...root.childNodes].map((n: any) => (n.nodeType === 1 ? n.outerHTML : `#${n.nodeType}:${n.textContent}`));

export type Node = { id: number; mode: "js" | "ojs"; value: string };
export type Step = { n?: number; resolve?: number; act?: (roots: Map<number, any>) => void };
export type Scenario = { name: string; nodes: Node[]; steps: Step[] };

// The definition with `body` as source text, for a page that has to rebuild the function itself.
export const transpileText = (node: Node) => {
  const t: any = node.mode === "js" ? transpileJavaScript(node.value, { id: node.id } as any) : transpileObservable(node.value, { id: node.id } as any);
  return { ...t, id: node.id, display: node.mode === "js" };
};
export const transpile = (node: Node) => {
  const t = transpileText(node);
  return { ...t, body: new Function(`return (${t.body})`)() };
};

export function makeGate() {
  const pending = new Map<number, () => void>();
  return {
    gate: (k: number) => new Promise<void>((r) => pending.set(k, r)),
    resolve: (k: number) => pending.get(k)?.()
  };
}

// An arm: a fresh Runtime with `n` and `gate` inputs, and per-cell roots.
export function referenceArm(nodes: Node[]) {
  const rt = new Runtime();
  const m = rt.module();
  const g = makeGate();
  let n = 1;
  const nVar = m.variable().define("n", [], () => n);
  m.define("gate", [], () => g.gate);
  const roots = new Map<number, any>();
  for (const node of nodes) {
    const state = { root: document.createElement("div"), expanded: [], variables: [] as any[] };
    roots.set(node.id, state.root);
    nkDefine(m as any, state as any, transpile(node));
  }
  return {
    roots,
    setN: (x: number) => { n = x; nVar.define("n", [], () => n); },
    resolve: g.resolve,
    dispose: () => rt.dispose()
  };
}

export const SCENARIOS: Scenario[] = [
  { name: "expression yielding an element", nodes: [{ id: 1, mode: "js", value: 'Object.assign(document.createElement("b"), {textContent: "n=" + n})' }], steps: [{}, { n: 2 }] },
  { name: "expression yielding a text node", nodes: [{ id: 1, mode: "js", value: 'document.createTextNode("t" + n)' }], steps: [{}, { n: 2 }] },
  { name: "expression yielding an object", nodes: [{ id: 1, mode: "js", value: "({n, twice: n * 2})" }], steps: [{}, { n: 3 }] },
  { name: "display twice", nodes: [{ id: 1, mode: "js", value: 'display(n); display("second");' }], steps: [{}] },
  { name: "re-run calls display", nodes: [{ id: 1, mode: "js", value: 'display("a" + n); display("b" + n);' }], steps: [{}, { n: 2 }, { n: 3 }] },
  { name: "re-run calls no display", nodes: [{ id: 1, mode: "js", value: 'if (n < 2) display("small " + n);' }], steps: [{}, { n: 5 }, { n: 1 }] },
  {
    // An awaiting body never overlaps a newer run: the runtime chains the next computation onto the
    // pending promise. A display from a callback does outlive its run, which is what the stale check
    // (define.ts:55) exists for.
    name: "stale display from an older run's callback",
    nodes: [{ id: 1, mode: "js", value: 'const k = n; gate(k).then(() => display("late " + k)).catch(() => {}); display("now " + k);' }],
    steps: [{}, { n: 2 }, { resolve: 1 }, { resolve: 2 }]
  },
  { name: "throw, then recover", nodes: [{ id: 1, mode: "js", value: 'n === 3 ? (() => { throw new Error("boom") })() : "ok " + n' }], steps: [{}, { n: 3 }, { n: 4 }] },
  { name: "display of a fragment", nodes: [{ id: 1, mode: "js", value: 'const f = document.createDocumentFragment(); f.append(document.createElement("i"), "tail" + n); display(f);' }], steps: [{}, { n: 2 }] },
  { name: "display of a node attached elsewhere", nodes: [{ id: 1, mode: "js", value: 'const holder = document.createElement("div"); const x = document.createElement("u"); holder.append(x); display(x);' }], steps: [{}] },
  {
    name: "multi-declaration cell and a reader",
    nodes: [
      { id: 1, mode: "js", value: "const a = n, b = n * 2;" },
      { id: 2, mode: "js", value: "a + b" }
    ],
    steps: [{}, { n: 4 }]
  },
  {
    name: "view() and an input event",
    nodes: [
      { id: 1, mode: "js", value: 'const r = view(Object.assign(document.createElement("input"), {value: "v" + n}));' },
      { id: 2, mode: "js", value: 'r + "!"' }
    ],
    steps: [
      {},
      { act: (roots) => { const el = roots.get(1).querySelector("input"); el.value = "typed"; el.dispatchEvent(new Event("input")); } }
    ]
  },
  {
    name: "ojs viewof and a js reader",
    nodes: [
      { id: 1, mode: "ojs", value: 'viewof w = Object.assign(document.createElement("input"), {value: "w" + n})' },
      { id: 2, mode: "js", value: 'w + "?"' }
    ],
    steps: [{}, { n: 2 }]
  },
  {
    name: "ojs mutable and a js reader",
    nodes: [
      { id: 1, mode: "ojs", value: "mutable q = n * 10" },
      { id: 2, mode: "js", value: "q + 1" }
    ],
    steps: [{}, { n: 2 }]
  }
];

export const ATTACH = ["before first run", "after first run", "after last step", "detached mid-run, re-attached"] as const;

export async function drive(arm: any, sc: Scenario, onStep: (i: number) => void, hooks: { afterStep?: (i: number) => void } = {}) {
  for (let i = 0; i < sc.steps.length; i++) {
    const s = sc.steps[i];
    if (s.n != null) arm.setN(s.n);
    if (s.resolve != null) arm.resolve(s.resolve);
    if (s.act) s.act(arm.roots);
    await settle();
    hooks.afterStep?.(i);
    await settle();
    onStep(i);
  }
}

export async function referenceSnaps(sc: Scenario) {
  const ref = referenceArm(sc.nodes);
  const out: string[][][] = [];
  await drive(ref, sc, () => out.push(sc.nodes.map((nd) => snap(ref.roots.get(nd.id)))));
  ref.dispose();
  return out;
}

