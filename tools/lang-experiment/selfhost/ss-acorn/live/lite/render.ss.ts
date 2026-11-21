// What the renderer changes on one element, as SoundScript cells: its prop changes and the operations on one level
// of its children, from plain descriptions jsx/render.ts makes of the new element and of the DOM children it drew
// last time. render.ts applies the operations, recurses into reused children and keeps every DOM read and write.
// Under bun, runtime-ss.ts links these cells with runtime.ss.ts; in the notebook they are compiled cells of
// @tomlarkworthy/soundscript-runtime.

export type Key = string | number;
// a checked cell's prop is an attribute value or an action; render.ts passes an unchecked cell's props as they are
export type PropValue = string | number | boolean | null | undefined | ((...a: never[]) => unknown);
export type Props = { readonly [k: string]: PropValue };
// a new child: an element h made (its tag and key), or any other value, drawn as this text
export type Kid = { readonly k: "elem"; readonly tag: string; readonly key: Key | undefined } | { readonly k: "text"; readonly text: string };
// a DOM child as render.ts found it: one it drew as an element (the tag it was created for), a text node, or a node it did not make
export type Drawn = Kid | { readonly k: "other" };
// prop: set the DOM property unless it already holds the value; listen: add the one DOM listener for this prop
export type PropOp =
  | { readonly op: "listen"; readonly name: string; readonly event: string }
  | { readonly op: "handler" | "prop"; readonly name: string; readonly value: PropValue }
  | { readonly op: "attr"; readonly name: string; readonly text: string }
  | { readonly op: "unattr" | "unhandle"; readonly name: string }
  | { readonly op: "reset"; readonly name: string; readonly value: string | boolean };
// old: index into the DOM children as found; kid: index into the new children; place: insert kid's node at its index
export type ChildOp =
  | { readonly op: "remove"; readonly old: number }
  | { readonly op: "reuse" | "replace"; readonly old: number; readonly kid: number }
  | { readonly op: "text"; readonly old: number; readonly text: string }
  | { readonly op: "create" | "place"; readonly kid: number };

// a fragment (tag "") is drawn as a span with display: contents
export const drawnTag = () => (tag: string): { readonly tag: string; readonly fragment: boolean } =>
  tag === "" ? { tag: "span", fragment: true } : { tag, fragment: false };
// the DOM event of an event prop; own keys only, so a prop named "constructor" is not an event
export const eventOf = (DOM_EVENTS) => {
  const events = new Map(Object.entries(DOM_EVENTS).map(([k, v]) => [k, v[0]]));
  return (name: string): string | undefined => events.get(name);
};
// an attribute value that removes the attribute
export const removesAttribute = () => (v: PropValue): boolean => v === false || v === null || v === undefined;
// a prop the old element had and the new one has not; removing the attribute does not reset a DOM property
export const propGone = (eventOf, PROPS) => (name: string): readonly PropOp[] =>
  eventOf(name) !== undefined ? [{ op: "unhandle", name }] : PROPS.has(name) ? [{ op: "reset", name, value: name === "value" ? "" : false }] : [{ op: "unattr", name }];
// an attribute is written again only for a value that is not the one before (identity, as for an action)
export const sameAttribute = () => (was: PropValue, value: PropValue): boolean => (typeof value === "function" ? Object.is(was, value) : was === value);
// one prop of the new element; was: the old element's value under that name. A DOM property given undefined is
// reset as if removed, once: resetting it on every patch would clear what the user typed
export const propSet = (eventOf, PROPS, removesAttribute, propGone, sameAttribute) => (name: string, value: PropValue, was: PropValue, listening: Set<string>): readonly PropOp[] => {
  if (name === "key" || name === "children") return [];
  const event = eventOf(name);
  if (event !== undefined) return listening.has(name) ? [{ op: "handler", name, value }] : [{ op: "listen", name, event }, { op: "handler", name, value }];
  if (PROPS.has(name)) return value !== undefined ? [{ op: "prop", name, value }] : was === undefined ? [] : propGone(name);
  if (removesAttribute(value)) return [{ op: "unattr", name }];
  return sameAttribute(was, value) ? [] : [{ op: "attr", name, text: String(value) }];
};
// listening: the event props the node has a DOM listener for
export const propOps = (propSet, propGone) => (old: Props, now: Props, listening: Set<string>): readonly PropOp[] => {
  const still = new Set(Object.keys(now));
  const gone = Object.keys(old).filter((k) => !still.has(k) && k !== "key" && k !== "children");
  const set = Object.entries(now).flatMap(([k, v]) => propSet(k, v, old[k], listening));
  const unset = gone.flatMap((k) => propGone(k));
  return [...set, ...unset];
};

// a key and tag as one string, as the renderer compares them: key 1 and key "1" are the same key
export const slotId = () => (tag: string, key: Key): string => `${tag}:${key}`;
// the children's slot ids when every one is an element with a key, else null: they are matched by position
export const keyedIds = (slotId) => (kids: readonly Kid[]): readonly string[] | null => {
  const out: Mut<string[]> = mut([]);
  for (const c of kids) {
    if (c.k !== "elem" || c.key === undefined) return null;
    out.push(slotId(c.tag, c.key));
  }
  return out.length ? freeze(out) : null;
};
export const drawnId = (slotId) => (d: Drawn): string | null => (d.k === "elem" && d.key !== undefined ? slotId(d.tag, d.key) : null);
// for each new slot, the old child it reuses: of old children with its id, the last, each used once
export const matchKeyed = () => (oldIds: readonly (string | null)[], ids: readonly string[]): readonly (number | null)[] => {
  const byId: Mut<Map<string, number>> = mut(new Map());
  for (const [j, id] of oldIds.entries()) if (id !== null) byId.set(id, j);
  const out: Mut<(number | null)[]> = mut([]);
  for (const id of ids) {
    const j = byId.get(id);
    out.push(j ?? null);
    if (j !== undefined) byId.delete(id);
  }
  return freeze(out);
};
// the old children kept by the first pass: those whose id some new slot has (an unused duplicate too)
export const keptByKey = () => (oldIds: readonly (string | null)[], ids: readonly string[]): readonly number[] => {
  const wanted = new Set(ids);
  return oldIds.flatMap((id, j) => (id !== null && wanted.has(id) ? [j] : []));
};
// whether each new child must be inserted at its index: after i placements the DOM is the first i new children,
// then the kept old children not yet placed, in their old order; a child already first among those stays
export const mustPlace = () => (kept: readonly number[], reuse: readonly (number | null)[]): readonly boolean[] => {
  const placedAt: Mut<Map<number, number>> = mut(new Map());
  for (const [i, j] of reuse.entries()) if (j !== null) placedAt.set(j, i);
  const out: Mut<boolean[]> = mut([]);
  let p = 0;
  for (const [i, j] of reuse.entries()) {
    while (p < kept.length && (placedAt.get(kept[p] ?? -1) ?? Infinity) < i) p++;
    out.push(j === null || kept[p] !== j);
  }
  return freeze(out);
};
// keyed children: drop the old ones no slot wants, reuse or create each, insert where not in place, drop unused duplicates
export const keyedOps = (drawnId, matchKeyed, keptByKey, mustPlace) => (old: readonly Drawn[], ids: readonly string[]): readonly ChildOp[] => {
  const oldIds = old.map((d) => drawnId(d));
  const reuse = matchKeyed(oldIds, ids), kept = keptByKey(oldIds, ids), place = mustPlace(kept, reuse);
  const keptSet = new Set(kept), used = new Set(reuse);
  const out: Mut<ChildOp[]> = mut(old.flatMap((_d, j): ChildOp[] => (keptSet.has(j) ? [] : [{ op: "remove", old: j }])));
  for (const [i, j] of reuse.entries()) {
    out.push(j === null ? { op: "create", kid: i } : { op: "reuse", old: j, kid: i });
    if (place[i] === true) out.push({ op: "place", kid: i });
  }
  for (const j of kept) if (!used.has(j)) out.push({ op: "remove", old: j });
  return freeze(out);
};
// a node is patched in place for a new element of the tag it was created for (a child here, a root in mount)
export const keepsNode = () => (cur: Drawn, kid: Kid): boolean => cur.k === "elem" && kid.k === "elem" && cur.tag === kid.tag;
// one child matched by position: patch, retext, replace or append
export const childAt = (keepsNode) => (cur: Drawn | undefined, kid: Kid, i: number): readonly ChildOp[] => {
  if (cur === undefined) return [{ op: "create", kid: i }, { op: "place", kid: i }];
  if (keepsNode(cur, kid)) return [{ op: "reuse", old: i, kid: i }];
  if (cur.k === "text" && kid.k === "text") return cur.text === kid.text ? [] : [{ op: "text", old: i, text: kid.text }];
  return [{ op: "replace", old: i, kid: i }];
};
export const positionalOps = (childAt) => (old: readonly Drawn[], kids: readonly Kid[]): readonly ChildOp[] => [
  ...kids.flatMap((k, i) => childAt(old[i], k, i)),
  ...old.flatMap((_d, j): ChildOp[] => (j >= kids.length ? [{ op: "remove", old: j }] : [])),
];
export const childOps = (keyedIds, keyedOps, positionalOps) => (old: readonly Drawn[], kids: readonly Kid[]): readonly ChildOp[] => {
  const ids = keyedIds(kids);
  return ids === null ? positionalOps(old, kids) : keyedOps(old, ids);
};
