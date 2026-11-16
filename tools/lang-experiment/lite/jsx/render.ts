// The renderer: an unchecked shell around the checked cells. It patches a DOM node in place when the
// tag is unchanged, so a cell that describes the same <canvas> again keeps the same node (and any
// context made from it). Event props hold Actions; the renderer decodes each DOM event into data.
import type { Elem } from "./h.ts";
import { entry } from "../../prelude.runtime.ts";

const EVENTS: Record<string, [string, (e: any, node: any) => unknown[]]> = {
  onClick: ["click", () => []],
  onInput: ["input", (_e, node) => [String(node.value)]],
  onPointerDown: ["pointerdown", (e) => [ptr(e)]],
  onPointerMove: ["pointermove", (e) => [ptr(e)]],
  onPointerUp: ["pointerup", (e) => [ptr(e)]],
  onPointerCancel: ["pointercancel", (e) => [ptr(e)]],
};
const ptr = (e: any) => Object.freeze({ x: e.offsetX ?? e.clientX ?? 0, y: e.offsetY ?? e.clientY ?? 0, t: e.timeStamp ?? 0, id: e.pointerId ?? 0, buttons: e.buttons ?? 0 });
const PROPS = new Set(["value", "checked", "disabled"]);
const isElem = (x: unknown): x is Elem => !!x && typeof x === "object" && "tag" in (x as object);

export function create(doc: Document, x: unknown): Node {
  if (!isElem(x)) return doc.createTextNode(String(x));
  const node = doc.createElement(x.tag || "span") as any;
  if (!x.tag) node.setAttribute("style", "display: contents"); // a fragment
  node.__handlers = {};
  node.__elem = { tag: x.tag, props: {}, children: [] };
  patch(node, x);
  return node;
}

export function patch(node: any, x: Elem): void {
  const old: Elem = node.__elem;
  if (old === x) return; // the same value as last time: nothing below it changed
  for (const [k, v] of Object.entries(x.props)) {
    if (k === "key" || k === "children") continue;
    const ev = EVENTS[k];
    if (ev) {
      // an event handler: each action it calls is a top-level call
      if (!(k in node.__handlers)) node.addEventListener(ev[0], (e: Event) => { const f = node.__handlers[k]; if (f) entry(null, () => f(...ev[1](e, node))); });
      node.__handlers[k] = v;
    } else if (PROPS.has(k)) { if (node[k] !== v) node[k] = v; }
    else if (v === false || v === null || v === undefined) node.removeAttribute(k);
    else if (old.props[k] !== v) node.setAttribute(k, String(v));
  }
  for (const k of Object.keys(old.props)) if (!(k in x.props)) {
    if (EVENTS[k]) node.__handlers[k] = undefined;
    else if (PROPS.has(k)) node[k] = k === "value" ? "" : false; // removeAttribute does not reset a property
    else node.removeAttribute(k);
  }
  const doc = node.ownerDocument;
  const n = x.children.length;
  // Keyed children: match by key and tag, move nodes into place, drop the rest.
  if (n && x.children.every((c) => isElem(c) && c.props.key !== undefined)) {
    const byKey = new Map<unknown, any>();
    const want = new Set((x.children as Elem[]).map((c) => `${c.tag}:${c.props.key}`));
    for (const cur of [...node.childNodes] as any[]) {
      const k = cur.__elem?.props.key !== undefined ? `${cur.__elem.tag}:${cur.__elem.props.key}` : null;
      if (k && want.has(k)) byKey.set(k, cur); else node.removeChild(cur); // removed first, so the rest need not move
    }
    (x.children as Elem[]).forEach((c, i) => {
      const k = `${c.tag}:${c.props.key}`;
      let cur = byKey.get(k);
      if (cur) { byKey.delete(k); patch(cur, c); } else cur = create(doc, c);
      if (node.childNodes[i] !== cur) node.insertBefore(cur, node.childNodes[i] ?? null);
    });
    while (node.childNodes.length > n) node.removeChild(node.lastChild);
    node.__elem = x;
    return;
  }
  for (let i = 0; i < n; i++) {
    const c = x.children[i], cur = node.childNodes[i];
    if (cur && isElem(c) && cur.__elem && cur.__elem.tag === c.tag) patch(cur, c);
    else if (cur && !isElem(c) && cur.nodeType === 3) { if (cur.data !== String(c)) cur.data = String(c); }
    else if (cur) node.replaceChild(create(doc, c), cur);
    else node.appendChild(create(doc, c));
  }
  while (node.childNodes.length > n) node.removeChild(node.lastChild);
  node.__elem = x;
}
