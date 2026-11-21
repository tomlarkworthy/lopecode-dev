// Renderer defects found while splitting lite/jsx/render.ts, each against the unchanged render.ts (happy-dom), and
// whether a checked cell can reach it. Run: bun selfhost/render-cells/repro-defects.ts
import { Window } from "happy-dom";
import { checkSources } from "../../lite/core.ts";
import { h } from "../../lite/jsx/h.ts";
import { create, patch } from "../../lite/jsx/render.ts";
import { mount } from "../../lite/stdlib/runtime.ts";

const win = new Window();
const doc = win.document as unknown as Document;
const checked = (cells: string) =>
  checkSources({ cells, tsx: true }).cells.map((c: any) => `${c.name}: ${c.status}${c.errors.map((e: any) => ` [${e.rule}] ${e.msg ?? e.message}`).join("")}${(c.unsupported ?? []).map((u: any) => ` [unsupported] ${u.msg}`).join("")}`).join("; ");

// 1. a prop named like an Object.prototype member is taken for an event prop (DOM_EVENTS[k] finds the prototype's)
{
  const n = create(doc, h("div", { constructor: "x", title: "t" })) as any;
  console.log(`1. h("div", { constructor: "x", title: "t" }) draws ${n.outerHTML}; constructor attribute set: ${n.hasAttribute("constructor")}`);
  console.log(`   checker: ${checked(`export const a = () => <div constructor="x" />;`)}`);
}
// 2. patch with an element of another tag keeps the old node's tag and records the new tag, so mount then reuses it
{
  const n = create(doc, h("div", { title: "a" }, "x")) as any;
  patch(n, h("span", { title: "b" }, "y"));
  console.log(`2. create(<div>) then patch(node, <span>) leaves ${n.outerHTML}; node.__elem.tag is "${n.__elem.tag}"`);
  const m = mount(h("span", null, "z"), n) as any;
  console.log(`   then mount(<span>, node) returns ${m === n ? "the same node" : "a new node"}: ${m.outerHTML}`);
}
// 3. a DOM property given undefined is assigned undefined: an input's value becomes the text "undefined"
{
  const n = create(doc, h("input", { value: "5" })) as any;
  patch(n, h("input", { value: undefined }));
  console.log(`3. <input value="5"> then <input value={undefined}>: node.value is ${JSON.stringify(n.value)} (removing the prop gives "")`);
  console.log(`   checker: ${checked(`export const on = () => true;\nexport const a = (on: boolean) => <input value={on ? "5" : undefined} />;`)}`);
}
// 4. a symbol key throws in the key's template string (only an unchecked cell can pass one)
{
  let thrown = "none";
  try { create(doc, h("ul", null, h("li", { key: Symbol("k") }))); } catch (e) { thrown = String(e); }
  console.log(`4. a child with key Symbol("k"): ${thrown}`);
  console.log(`   checker: ${checked(`export const a = () => <div><p key={Symbol("k")} /></div>;`)}`);
}
await win.happyDOM.close();
