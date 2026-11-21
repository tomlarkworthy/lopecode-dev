// lite/jsx/render.ts's create and patch over the decision cells of render.ss.ts: this file describes the new
// element and the DOM children as data, applies the operations the cells return, and recurses. Same exports as render.ts.
import { isElement, type Elem } from "../../lite/jsx/h.ts";
import { DOM_EVENTS, mut, freeze } from "../../lite/runtime-ss.ts";
import { equals } from "../../prelude.runtime.ts";
import { link } from "../../lite/link.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as renderCells from "./render.ss.ts";
import type { Kid, Drawn, Key, PropOp, ChildOp } from "./render.ss.ts";

const cells = { ...rtCells, ...renderCells };
const relinked = (over: Partial<typeof cells>) => link({ ...cells, ...over } as typeof cells, { mut, freeze, equals });
let S = relinked({});
// relink with some cells replaced (the negative control); {} restores them
export const useCells = (over: Partial<typeof cells>) => void (S = relinked(over));
export const cellsNow = () => S;

const asText = (x: unknown): string =>
  typeof x === "function" ? "[object Function]" : typeof x === "object" && x !== null ? (Array.isArray(x) ? "[object Array]" : "[object Object]") : String(x);
// a key the checker did not type (an unchecked cell's) is taken as its text
const keyOf = (k: unknown): Key | undefined => (k === undefined || typeof k === "string" || typeof k === "number" ? k : asText(k));
const kidOf = (c: unknown): Kid => (isElement(c) ? { k: "elem", tag: c.tag, key: keyOf(c.props.key) } : { k: "text", text: asText(c) });
const drawnOf = (n: any): Drawn =>
  n.__elem ? { k: "elem", tag: n.__elem.tag, key: keyOf(n.__elem.props.key) } : n.nodeType === 3 ? { k: "text", text: n.data } : { k: "other" };

export function create(doc: Document, x: unknown): Node {
  if (!isElement(x)) return doc.createTextNode(asText(x));
  const d = S.drawnTag(x.tag);
  const node = doc.createElement(d.tag) as any;
  if (d.fragment) node.setAttribute("style", "display: contents");
  node.__handlers = {};
  node.__listening = new Set<string>();
  node.__elem = { tag: x.tag, props: {}, children: [] };
  patch(node, x);
  return node;
}

function applyProp(node: any, o: PropOp): void {
  switch (o.op) {
    case "listen": {
      const decode = DOM_EVENTS[o.name]![1];
      node.__listening.add(o.name);
      node.addEventListener(o.event, (e: Event) => { const f = node.__handlers[o.name]; if (f) f(...decode(e, node)); });
      return;
    }
    case "handler": node.__handlers[o.name] = o.value; return;
    case "unhandle": node.__handlers[o.name] = undefined; return;
    case "prop": if (node[o.name] !== o.value) node[o.name] = o.value; return;
    case "reset": node[o.name] = o.value; return;
    case "attr": node.setAttribute(o.name, o.text); return;
    case "unattr": node.removeAttribute(o.name); return;
  }
}

function applyChildren(node: any, kids: readonly unknown[]): void {
  const before = [...node.childNodes] as any[];
  const ops: readonly ChildOp[] = S.childOps(before.map(drawnOf), kids.map(kidOf));
  const made: Node[] = [];
  for (const o of ops) {
    switch (o.op) {
      case "remove": node.removeChild(before[o.old]); break;
      case "reuse": made[o.kid] = before[o.old]; patch(before[o.old], kids[o.kid] as Elem); break;
      case "create": made[o.kid] = create(node.ownerDocument, kids[o.kid]); break;
      case "replace": node.replaceChild((made[o.kid] = create(node.ownerDocument, kids[o.kid])), before[o.old]); break;
      case "text": before[o.old].data = o.text; break;
      case "place": node.insertBefore(made[o.kid], node.childNodes[o.kid] ?? null); break;
    }
  }
}

export function patch(node: any, x: Elem): void {
  if (!isElement(x)) throw new TypeError("patch: the value is not an element made by JSX");
  const old: Elem = node.__elem;
  if (old === x) return; // the same value as last time: nothing below it changed
  for (const o of S.propOps(old.props, x.props, node.__listening) as readonly PropOp[]) applyProp(node, o);
  applyChildren(node, x.children);
  node.__elem = x;
}
