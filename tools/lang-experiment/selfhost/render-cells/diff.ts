// Differential test: random element trees a, b, c (b and c may share children with the tree before), each drawn with
// create(a), patch(b), patch(c) by render.ts and by shell.ts (happy-dom), compared on
// the HTML, which node of the first drawing each node is (reuse), DOM properties, which handler a click calls, and
// the count of child insertions, removals and replacements.
// Run: bun selfhost/render-cells/diff.ts [pairs=3000] [seed=1] [--with-defects] [--break]   exit 1 on any difference
// --break links mustPlace as "never move" (a negative control: it must differ)
import { Window } from "happy-dom";
import { h } from "../../lite/jsx/h.ts";
import * as R from "../../lite/jsx/render.ts";
import * as P from "./shell.ts";

const pairs = Number(process.argv[2] ?? 3000), withDefects = process.argv.includes("--with-defects"), broken = process.argv.includes("--break");
if (broken) P.useCells({ mustPlace: () => (_k: readonly number[], reuse: readonly unknown[]) => reuse.map(() => false) });
let seed = Number(process.argv[3] ?? 1);
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
const calls: string[] = [];
const handlers = ["a", "b"].map((n) => () => calls.push(n));

function props(tag: string): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (rnd() < 0.4) p.title = pick(["x", "y", 1, false, null, undefined]);
  if (rnd() < 0.2) p.hidden = pick([true, false]);
  if (rnd() < 0.3) p.onClick = pick([...handlers, undefined]);
  if (tag === "input") {
    if (rnd() < 0.6) p.value = pick(["1", "2", 3]);
    if (rnd() < 0.5) p.checked = pick([true, false]);
    if (rnd() < 0.3) p.disabled = pick([true, false]);
  }
  if (withDefects && rnd() < 0.1) p.constructor = "c";
  return p;
}
function kids(depth: number): unknown[] {
  const n = Math.floor(rnd() * 5);
  const mode = rnd();
  return Array.from({ length: n }, () => {
    if (mode < 0.5) return h("li", { ...props("li"), key: pick(["a", "b", "c", "d", "e", 1, "1"]) }, ...(depth < 2 && rnd() < 0.4 ? kids(depth + 1) : []));
    return depth < 2 && rnd() < 0.7 ? elem(depth + 1) : pick(["t", "u", 7, h("li", { key: "a" })]);
  });
}
function elem(depth: number): unknown {
  const tag = pick(["div", "p", "li", "input", ""]);
  if (tag === "") return h(null, null, ...kids(depth));
  return h(tag, props(tag), ...(tag === "input" ? [] : kids(depth)));
}
// half of the new trees share children with the old one, so the same-value shortcut runs
const variant = (a: any): any => (rnd() < 0.5 ? h("div", props("div"), ...a.children.filter(() => rnd() < 0.8), ...kids(1)) : h("div", props("div"), ...kids(0)));

const win = new Window();
const doc = win.document as unknown as Document;
type Counts = { ins: number; rm: number; rep: number };
function counting(c: Counts) {
  const N = (win as any).Node.prototype;
  const orig = { insertBefore: N.insertBefore, appendChild: N.appendChild, removeChild: N.removeChild, replaceChild: N.replaceChild };
  N.insertBefore = function (...a: any[]) { c.ins++; return orig.insertBefore.apply(this, a); };
  N.appendChild = function (...a: any[]) { c.ins++; return orig.appendChild.apply(this, a); };
  N.removeChild = function (...a: any[]) { c.rm++; return orig.removeChild.apply(this, a); };
  N.replaceChild = function (...a: any[]) { c.rep++; return orig.replaceChild.apply(this, a); };
  return () => Object.assign(N, orig);
}
function draw(arm: typeof R, a: unknown, b: unknown, c2: unknown) {
  const root = arm.create(doc, a) as any;
  const ids = new Map<Node, number>();
  const walk = (n: any, f: (n: any) => void) => { f(n); for (const c of n.childNodes) walk(c, f); };
  walk(root, (n) => ids.set(n, ids.size));
  const c: Counts = { ins: 0, rm: 0, rep: 0 };
  const restore = counting(c);
  arm.patch(root, b as any);
  arm.patch(root, c2 as any);
  restore();
  const shape: string[] = [];
  calls.length = 0;
  walk(root, (n) => {
    shape.push(`${ids.get(n) ?? "new"}:${n.nodeType === 1 ? `${n.tagName}|${n.value ?? ""}|${n.checked ?? ""}|${n.disabled ?? ""}` : n.data}`);
    if (n.nodeType === 1) { const before = calls.length; n.dispatchEvent(new (win as any).Event("click")); shape.push(`click:${calls.slice(before).join("")}`); }
  });
  return { html: root.outerHTML, shape: shape.join(" "), counts: `${c.ins}/${c.rm}/${c.rep}` };
}

let diffs = 0, keyedPairs = 0;
for (let i = 0; i < pairs; i++) {
  const a = h("div", props("div"), ...kids(0)), b = variant(a), c = variant(b);
  if ((b as any).children.some((c: any) => c?.props?.key !== undefined)) keyedPairs++;
  const r = draw(R, a, b, c), p = draw(P as any, a, b, c);
  const differ = (["html", "shape", "counts"] as const).filter((k) => r[k] !== p[k]);
  if (differ.length && ++diffs <= 3) for (const k of differ) console.log(`pair ${i} differs on ${k}\n  render.ts ${r[k]}\n  shell.ts  ${p[k]}`);
}
console.log(`${pairs} pairs (${keyedPairs} with a keyed child at the top), ${diffs} pair(s) differ${withDefects ? ", with the constructor prop" : ""}${broken ? ", mustPlace BROKEN" : ""}`);
await win.happyDOM.close();
process.exit(diffs ? 1 : 0);
