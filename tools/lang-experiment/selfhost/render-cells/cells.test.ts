// The decision cells of render.ss.ts called alone with plain values. Run: bun test selfhost/render-cells/cells.test.ts
import { test, expect } from "bun:test";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import { equals } from "../../prelude.runtime.ts";
import * as rtCells from "../../lite/runtime.ss.ts";
import * as cells from "./render.ss.ts";
import type { Drawn, Kid, ChildOp } from "./render.ss.ts";
const S = link({ ...rtCells, ...cells }, { mut, freeze, equals });

const el = (tag: string, key?: string | number): Kid => ({ k: "elem", tag, key });
const tx = (text: string): Kid => ({ k: "text", text });
const li = (...keys: (string | number)[]) => keys.map((k) => el("li", k));
// the DOM children after the ops, as old index or "new i", from the ops alone
function simulate(old: readonly Drawn[], kids: readonly Kid[], ops: readonly ChildOp[]): string[] {
  const dom: string[] = old.map((_d, j) => `old ${j}`), made: string[] = [];
  for (const o of ops) {
    if (o.op === "remove") dom.splice(dom.indexOf(`old ${o.old}`), 1);
    else if (o.op === "reuse") made[o.kid] = `old ${o.old}`;
    else if (o.op === "create") made[o.kid] = `new ${o.kid}`;
    else if (o.op === "replace") dom[dom.indexOf(`old ${o.old}`)] = made[o.kid] = `new ${o.kid}`;
    else if (o.op === "place") { const at = dom.indexOf(made[o.kid]!); if (at >= 0) dom.splice(at, 1); dom.splice(o.kid, 0, made[o.kid]!); }
  }
  expect(dom.length).toBe(kids.length);
  return dom;
}

test("keyedIds: keyed only when every child is an element with a key", () => {
  expect(S.keyedIds(li("a", "b"))).toEqual(["li:a", "li:b"]);
  expect(S.keyedIds([el("li", "a"), el("li")])).toBe(null);
  expect(S.keyedIds([el("li", "a"), tx("x")])).toBe(null);
  expect(S.keyedIds([])).toBe(null);
});
test("keyed reorder: a child moved back is passed by the ones after it, each placed (render.ts's algorithm)", () => {
  const old = li("a", "b", "c", "d"), now = li("a", "c", "d", "b");
  const ops = S.childOps(old, now);
  expect(ops.filter((o) => o.op === "place")).toEqual([{ op: "place", kid: 1 }, { op: "place", kid: 2 }]);
  expect(simulate(old, now, ops)).toEqual(["old 0", "old 2", "old 3", "old 1"]);
});
test("keyed: a child moved to the front is the one place op", () => {
  const old = li("a", "b", "c"), now = li("c", "a", "b");
  expect(S.childOps(old, now).filter((o) => o.op === "place")).toEqual([{ op: "place", kid: 0 }]);
});
test("keyed insert in the middle: one create, one place, nothing removed", () => {
  const old = li("a", "c"), now = li("a", "b", "c");
  const ops = S.childOps(old, now);
  expect(ops).toEqual([{ op: "reuse", old: 0, kid: 0 }, { op: "create", kid: 1 }, { op: "place", kid: 1 }, { op: "reuse", old: 1, kid: 2 }]);
  expect(simulate(old, now, ops)).toEqual(["old 0", "new 1", "old 1"]);
});
test("keyed remove: the dropped child is removed first, the rest are not moved", () => {
  const ops = S.childOps(li("a", "b", "c"), li("a", "c"));
  expect(ops).toEqual([{ op: "remove", old: 1 }, { op: "reuse", old: 0, kid: 0 }, { op: "reuse", old: 2, kid: 1 }]);
});
test("keyed: the same key on another tag is a new child", () => {
  const ops = S.childOps([el("li", "a")], [el("p", "a")]);
  expect(ops).toEqual([{ op: "remove", old: 0 }, { op: "create", kid: 0 }, { op: "place", kid: 0 }]);
});
test("duplicate keys: the last old duplicate is reused, a second new duplicate is created, an unused one removed", () => {
  expect(S.matchKeyed(["li:a", "li:a"], ["li:a"])).toEqual([1]);
  const old = li("a", "a", "b"), now = li("b", "a");
  const ops = S.childOps(old, now);
  expect(simulate(old, now, ops)).toEqual(["old 2", "old 1"]);
  expect(ops.at(-1)).toEqual({ op: "remove", old: 0 });
  expect(S.matchKeyed(["li:a"], ["li:a", "li:a"])).toEqual([0, null]);
});
test("keys 1 and \"1\" are the same key, as the renderer compares them", () => {
  expect(S.keyedIds(li(1))).toEqual(S.keyedIds(li("1")));
  expect(S.childOps(li(1), li("1"))).toEqual([{ op: "reuse", old: 0, kid: 0 }]);
});
test("old children that are text, unkeyed or foreign are removed when the new children are keyed", () => {
  const old: Drawn[] = [{ k: "text", text: "x" }, el("li"), { k: "other" }, el("li", "a")];
  expect(S.childOps(old, li("a"))).toEqual([{ op: "remove", old: 0 }, { op: "remove", old: 1 }, { op: "remove", old: 2 }, { op: "reuse", old: 3, kid: 0 }]);
});
test("mixed keyed and unkeyed children are matched by position, keys ignored", () => {
  const ops = S.childOps([el("li", "a"), el("li", "b")], [el("li", "b"), el("li")]);
  expect(ops).toEqual([{ op: "reuse", old: 0, kid: 0 }, { op: "reuse", old: 1, kid: 1 }]);
});
test("by position: patch the same tag, retext text, replace the rest, append and remove at the end", () => {
  const old: Drawn[] = [el("div"), tx("a"), tx("b"), el("p"), { k: "other" }, el("i")];
  const now: Kid[] = [el("div"), tx("a"), tx("c"), el("span"), tx("z")];
  expect(S.childOps(old, now)).toEqual([
    { op: "reuse", old: 0, kid: 0 }, { op: "text", old: 2, text: "c" }, { op: "replace", old: 3, kid: 3 }, { op: "replace", old: 4, kid: 4 }, { op: "remove", old: 5 },
  ]);
  expect(S.childOps([], [tx("a")])).toEqual([{ op: "create", kid: 0 }, { op: "place", kid: 0 }]);
});
test("props: an attribute set, unchanged, removed by false and by absence", () => {
  const none = new Set<string>();
  expect(S.propOps({ title: "a", id: "x", hidden: true }, { title: "b", id: "x", hidden: false }, none))
    .toEqual([{ op: "attr", name: "title", text: "b" }, { op: "unattr", name: "hidden" }]);
  expect(S.propOps({ title: "a", class: "c" }, {}, none)).toEqual([{ op: "unattr", name: "title" }, { op: "unattr", name: "class" }]);
  expect(S.propOps({}, { width: 3 }, none)).toEqual([{ op: "attr", name: "width", text: "3" }]);
});
test("props: key and children are not attributes", () => {
  expect(S.propOps({ key: 1 }, { key: 2, children: [] }, new Set())).toEqual([]);
});
test("props: DOM properties are set for the shell to compare, and reset when gone", () => {
  expect(S.propOps({}, { value: "5", checked: true }, new Set())).toEqual([{ op: "prop", name: "value", value: "5" }, { op: "prop", name: "checked", value: true }]);
  expect(S.propOps({ value: "5", disabled: true }, {}, new Set())).toEqual([{ op: "reset", name: "value", value: "" }, { op: "reset", name: "disabled", value: false }]);
});
test("props: an event prop listens once, then only swaps its handler, and is cleared when gone", () => {
  const f = () => {}, g = () => {};
  expect(S.propOps({}, { onClick: f }, new Set())).toEqual([{ op: "listen", name: "onClick", event: "click" }, { op: "handler", name: "onClick", value: f }]);
  expect(S.propOps({ onClick: f }, { onClick: g }, new Set(["onClick"]))).toEqual([{ op: "handler", name: "onClick", value: g }]);
  expect(S.propOps({ onClick: f }, {}, new Set(["onClick"]))).toEqual([{ op: "unhandle", name: "onClick" }]);
});
test("props: a prop named like an Object.prototype member is an attribute", () => {
  expect(S.eventOf("constructor")).toBe(undefined);
  expect(S.propOps({}, { constructor: "x" }, new Set())).toEqual([{ op: "attr", name: "constructor", text: "x" }]);
});
test("drawnTag: a fragment is a span drawn with display: contents", () => {
  expect(S.drawnTag("")).toEqual({ tag: "span", fragment: true });
  expect(S.drawnTag("div")).toEqual({ tag: "div", fragment: false });
});
