// Unit tests for the decision cells of render.ss.ts, each called alone with plain values, and for the four renderer
// defects these cells and jsx/render.ts fix, drawn in happy-dom. Run: bun lite/render.test.ts
import { Window } from "happy-dom";
import * as rtCells from "./runtime.ss.ts";
import * as renderCells from "./render.ss.ts";
import type { Drawn, Kid, ChildOp } from "./render.ss.ts";
import { link } from "./link.ts";
import { h } from "./jsx/h.ts";
import { create, patch } from "./jsx/render.ts";
import { mount } from "./stdlib/runtime.ts";

const S = link({ ...rtCells, ...renderCells }, { mut: rtCells.mut(), freeze: rtCells.freeze() });
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail: unknown = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}: ${JSON.stringify(detail)}`); }
};
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);

const el = (tag: string, key?: string | number): Kid => ({ k: "elem", tag, key });
const tx = (text: string): Kid => ({ k: "text", text });
const li = (...keys: (string | number)[]) => keys.map((k) => el("li", k));
// the DOM children after the ops, as old index or "new i", from the ops alone
function simulate(old: readonly Drawn[], kids: readonly Kid[], ops: readonly ChildOp[]): string[] | null {
  const dom: string[] = old.map((_d, j) => `old ${j}`), made: string[] = [];
  for (const o of ops) {
    if (o.op === "remove") dom.splice(dom.indexOf(`old ${o.old}`), 1);
    else if (o.op === "reuse") made[o.kid] = `old ${o.old}`;
    else if (o.op === "create") made[o.kid] = `new ${o.kid}`;
    else if (o.op === "replace") dom[dom.indexOf(`old ${o.old}`)] = made[o.kid] = `new ${o.kid}`;
    else if (o.op === "place") { const at = dom.indexOf(made[o.kid]!); if (at >= 0) dom.splice(at, 1); dom.splice(o.kid, 0, made[o.kid]!); }
  }
  return dom.length === kids.length ? dom : null;
}

// children
{
  ok("keyedIds: keyed only when every child is an element with a key",
    eq(S.keyedIds(li("a", "b")), ["li:a", "li:b"]) && S.keyedIds([el("li", "a"), el("li")]) === null && S.keyedIds([el("li", "a"), tx("x")]) === null && S.keyedIds([]) === null);
  const old = li("a", "b", "c", "d"), now = li("a", "c", "d", "b"), ops = S.childOps(old, now);
  ok("keyed reorder: a child moved back is passed by the ones after it, each placed",
    eq(ops.filter((o) => o.op === "place"), [{ op: "place", kid: 1 }, { op: "place", kid: 2 }]) && eq(simulate(old, now, ops), ["old 0", "old 2", "old 3", "old 1"]), ops);
  ok("keyed: a child moved to the front is the one place op", eq(S.childOps(li("a", "b", "c"), li("c", "a", "b")).filter((o) => o.op === "place"), [{ op: "place", kid: 0 }]));
  const ins = S.childOps(li("a", "c"), li("a", "b", "c"));
  ok("keyed insert in the middle: one create, one place, nothing removed",
    eq(ins, [{ op: "reuse", old: 0, kid: 0 }, { op: "create", kid: 1 }, { op: "place", kid: 1 }, { op: "reuse", old: 1, kid: 2 }]) && eq(simulate(li("a", "c"), li("a", "b", "c"), ins), ["old 0", "new 1", "old 1"]), ins);
  ok("keyed remove: the dropped child is removed first, the rest are not moved",
    eq(S.childOps(li("a", "b", "c"), li("a", "c")), [{ op: "remove", old: 1 }, { op: "reuse", old: 0, kid: 0 }, { op: "reuse", old: 2, kid: 1 }]));
  ok("keyed: the same key on another tag is a new child", eq(S.childOps([el("li", "a")], [el("p", "a")]), [{ op: "remove", old: 0 }, { op: "create", kid: 0 }, { op: "place", kid: 0 }]));
  const dOld = li("a", "a", "b"), dNow = li("b", "a"), dOps = S.childOps(dOld, dNow);
  ok("duplicate keys: the last old duplicate is reused, a second new duplicate is created, an unused one removed",
    eq(S.matchKeyed(["li:a", "li:a"], ["li:a"]), [1]) && eq(simulate(dOld, dNow, dOps), ["old 2", "old 1"]) && eq(dOps.at(-1), { op: "remove", old: 0 }) && eq(S.matchKeyed(["li:a"], ["li:a", "li:a"]), [0, null]), dOps);
  ok("keys 1 and \"1\" are the same key", eq(S.keyedIds(li(1)), S.keyedIds(li("1"))) && eq(S.childOps(li(1), li("1")), [{ op: "reuse", old: 0, kid: 0 }]));
  const foreign: Drawn[] = [{ k: "text", text: "x" }, el("li"), { k: "other" }, el("li", "a")];
  ok("old children that are text, unkeyed or foreign are removed when the new children are keyed",
    eq(S.childOps(foreign, li("a")), [{ op: "remove", old: 0 }, { op: "remove", old: 1 }, { op: "remove", old: 2 }, { op: "reuse", old: 3, kid: 0 }]));
  ok("mixed keyed and unkeyed children are matched by position, keys ignored",
    eq(S.childOps([el("li", "a"), el("li", "b")], [el("li", "b"), el("li")]), [{ op: "reuse", old: 0, kid: 0 }, { op: "reuse", old: 1, kid: 1 }]));
  const pOld: Drawn[] = [el("div"), tx("a"), tx("b"), el("p"), { k: "other" }, el("i")];
  const pNow: Kid[] = [el("div"), tx("a"), tx("c"), el("span"), tx("z")];
  ok("by position: patch the same tag, retext text, replace the rest, append and remove at the end",
    eq(S.childOps(pOld, pNow), [{ op: "reuse", old: 0, kid: 0 }, { op: "text", old: 2, text: "c" }, { op: "replace", old: 3, kid: 3 }, { op: "replace", old: 4, kid: 4 }, { op: "remove", old: 5 }])
      && eq(S.childOps([], [tx("a")]), [{ op: "create", kid: 0 }, { op: "place", kid: 0 }]));
  ok("keepsNode: an element node of the same tag only", S.keepsNode(el("p"), el("p")) && !S.keepsNode(el("p"), el("div")) && !S.keepsNode(tx("p"), tx("p")) && !S.keepsNode({ k: "other" }, el("p")));
  ok("drawnTag: a fragment is a span drawn with display: contents", eq(S.drawnTag(""), { tag: "span", fragment: true }) && eq(S.drawnTag("div"), { tag: "div", fragment: false }));
}

// props
{
  const none = new Set<string>();
  ok("props: an attribute set, unchanged, removed by false and by absence",
    eq(S.propOps({ title: "a", id: "x", hidden: true }, { title: "b", id: "x", hidden: false }, none), [{ op: "attr", name: "title", text: "b" }, { op: "unattr", name: "hidden" }])
      && eq(S.propOps({ title: "a", class: "c" }, {}, none), [{ op: "unattr", name: "title" }, { op: "unattr", name: "class" }])
      && eq(S.propOps({}, { width: 3 }, none), [{ op: "attr", name: "width", text: "3" }]));
  ok("props: key and children are not attributes", eq(S.propOps({ key: 1 }, { key: 2, children: undefined }, none), []));
  ok("props: DOM properties are set for the shell to compare, and reset when gone",
    eq(S.propOps({}, { value: "5", checked: true }, none), [{ op: "prop", name: "value", value: "5" }, { op: "prop", name: "checked", value: true }])
      && eq(S.propOps({ value: "5", disabled: true }, {}, none), [{ op: "reset", name: "value", value: "" }, { op: "reset", name: "disabled", value: false }]));
  const f = () => {}, g = () => {};
  ok("props: an event prop listens once, then only swaps its handler, and is cleared when gone",
    eq(S.propOps({}, { onClick: f }, none), [{ op: "listen", name: "onClick", event: "click" }, { op: "handler", name: "onClick", value: f }])
      && eq(S.propOps({ onClick: f }, { onClick: g }, new Set(["onClick"])), [{ op: "handler", name: "onClick", value: g }])
      && eq(S.propOps({ onClick: f }, {}, new Set(["onClick"])), [{ op: "unhandle", name: "onClick" }]));
  ok("sameAttribute: identity, so NaN is written again and 0 and -0 are the same value",
    S.sameAttribute("a", "a") && S.sameAttribute(f, f) && !S.sameAttribute(f, g) && !S.sameAttribute(NaN, NaN) && S.sameAttribute(0, -0) && !S.sameAttribute(1, "1"));
  ok("props: a DOM property given undefined is reset once, as if removed",
    eq(S.propOps({ value: "5" }, { value: undefined }, none), [{ op: "reset", name: "value", value: "" }]) && eq(S.propOps({ value: undefined }, { value: undefined }, none), []) && eq(S.propOps({}, { value: undefined }, none), []));
}

// the defects of the renderer before these cells (selfhost/render-cells/repro-defects.ts), drawn
const win = new Window();
const doc = win.document as unknown as Document;
(globalThis as any).document = doc;
{
  const n = create(doc, h("div", { constructor: "x", title: "t" })) as any;
  ok("defect 1: a prop named like an Object.prototype member is an attribute, not an event prop",
    S.eventOf("constructor") === undefined && n.outerHTML === `<div constructor="x" title="t"></div>` && n.__listening.size === 0, n.outerHTML);
  patch(n, h("div", { title: "t" }));
  ok("defect 1: a prop named constructor is removed when gone", !n.hasAttribute("constructor"), n.outerHTML);
}
{
  const n = create(doc, h("div", { title: "a" }, "x")) as any;
  patch(n, h("span", { title: "b" }, "y"));
  const m = mount(h("span", null, "z"), n) as any;
  ok("defect 2: after patch(<div> node, <span>), mount(<span>) draws a new span instead of reusing the div",
    m !== n && m.tagName === "SPAN" && m.outerHTML === "<span>z</span>", m.outerHTML);
  const same = mount(h("div", null, "w"), n) as any;
  ok("defect 2: mount(<div>) on that node still reuses it", same === n && n.outerHTML === "<div>w</div>", n.outerHTML);
}
{
  const n = create(doc, h("input", { value: "5" })) as any;
  patch(n, h("input", { value: undefined }));
  const first = n.value;
  n.value = "typed";
  patch(n, h("input", { value: undefined }));
  ok("defect 3: an input's value given undefined is \"\", not \"undefined\", and is not reset again on the next patch", first === "" && n.value === "typed", { first, now: n.value });
}
{
  let thrown = "none", html = "";
  try { html = (create(doc, h("ul", null, h("li", { key: Symbol("k") }, "a"), h("li", { key: "b" }, "b"))) as any).outerHTML; } catch (e) { thrown = String(e); }
  ok("defect 4: a symbol key does not throw; it is keyed by its text", thrown === "none" && html === "<ul><li>a</li><li>b</li></ul>", { thrown, html });
}
await win.happyDOM.close();
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
