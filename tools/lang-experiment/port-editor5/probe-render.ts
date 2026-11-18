// Probe 2, renderer half: can a foreign DOM node (CodeMirror's view.dom) live inside a JSX-rendered slot?
// Mount an Elem, append a foreign node into an empty slot, re-render with (a) the same Elem object,
// (b) an equal but new Elem, (c) a new Elem whose slot is in a changed parent, and report survival.
import { Window } from "../lite/node_modules/happy-dom/lib/index.js";
import { h } from "../lite/jsx/h.ts";
import { create, patch } from "../lite/jsx/render.ts";
const doc = new Window().document as unknown as Document;
const panel = (label: string) => h("div", { class: "panel" }, h("span", null, label), h("div", { class: "slot" }));
const root = create(doc, panel("x = 1")) as any;
const slot = () => root.querySelector(".slot");
const mountForeign = () => { const cm = doc.createElement("div"); cm.className = "cm-editor"; slot().appendChild(cm); return cm; };
const cm1 = mountForeign();
console.log(`before any re-render: foreign node ${slot().contains(cm1) ? "present" : "absent"}`);
const first = root.__elem;
patch(root, first);
console.log(`same Elem object re-rendered: foreign node ${slot().contains(cm1) ? "survives" : "removed"}`);
patch(root, panel("x = 1"));
console.log(`equal but new Elem re-rendered: foreign node ${slot().contains(cm1) ? "survives" : "removed"}`);
const cm2 = mountForeign();
patch(root, panel("x = 2"));
console.log(`new Elem, header text changed: foreign node ${slot().contains(cm2) ? "survives" : "removed"}`);
