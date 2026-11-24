// Port attempt (2026-11-20): the declarations of lite/browser/cells.ts the runtime module holds.
// bun selfhost/rt/check.ts selfhost/rt/cells.ss.ts --home @tomlarkworthy/soundscript-runtime (d1: its cells may take prelude names)
type Gen = { next(): unknown; return(): unknown };
type Lst = { readonly listener: true; readonly events: unknown; readonly action: (x: unknown) => void };
type Handle = { readonly events: true; readonly name: string };
type Place = readonly [string, number] | null;
type HState = {
  name: string; args: readonly unknown[] | null; gen: Gen | null; no: number; done: boolean; dead: boolean;
  listeners: Set<Lst>; queue: unknown[]; draining: boolean; busy: boolean; run: object | null; order: Lst[] | null;
};
type Rt = { evalDepth: number };

export const guard = (rt: Rt) => (g: Generator<unknown>): Generator<unknown> => {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]): unknown => {
    rt.evalDepth++;
    try { return g[m](...a); } finally { rt.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
};
export const EVENTS = () => Symbol("events");
export const LISTENER = () => Symbol("listener");
export const hs = () => new WeakMap<object, HState>();
export const ls = () => new WeakMap<object, { runs: number; cell: string }>();
export const attached = () => new Set<Lst>();
export const generating = () => new Set<Handle>();
export const scheduler = () => ({ frame: (f: () => void): void => void requestAnimationFrame(f) });
export const isEvents = (hs: WeakMap<object, HState>) => (v: unknown): boolean => typeof v === "object" && v !== null && hs.has(v);
export const isListener = () => (v: unknown): boolean => typeof v === "object" && v !== null && "listener" in v;
export const on = () => (events: unknown, act: (x: unknown) => void): Lst => ({ listener: true, events, action: act });
export const running = (attached: Set<Lst>) => (of?: Iterable<object>): number => {
  if (of === undefined) return attached.size;
  const only = new Set(of);
  return [...attached].filter((l) => typeof l.events === "object" && l.events !== null && only.has(l.events)).length;
};
export const pulling = (generating: Set<Handle>, hs: WeakMap<object, HState>) => (of?: Iterable<object>): number => {
  const only = of === undefined ? null : new Set(of);
  return [...generating].filter((h) => { const s = hs.get(h); return s !== undefined && (only === null || only.has(h)) && s.gen !== null && !s.done && s.listeners.size > 0; }).length;
};
export const same = () => (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
export const stopGen = (generating: Set<Handle>, hs: WeakMap<object, HState>) => (s: HState): void => {
  const g = s.gen;
  s.gen = null; s.args = null; s.no++; s.queue.length = 0;
  for (const h of generating) if (hs.get(h) === s) generating.delete(h);
  if (g !== null) try { g.return(); } catch { }
};
export const events = (isEvents: (v: unknown) => boolean, same: (a: readonly unknown[], b: readonly unknown[]) => boolean) =>
  (prev: unknown, name: string, args: readonly unknown[], make: (...a: unknown[]) => Gen, invalidation: Promise<unknown> | null): Handle => {
    const h: Handle = isEvents(prev) && typeof prev === "object" && prev !== null && "name" in prev && prev.name === name ? { events: true, name } : { events: true, name };
    invalidation?.then(() => setTimeout(() => 0, 0));
    return h;
  };
export const fail = () => (s: HState, no: number, e: unknown): void => {
  if (no !== s.no) return;
  console.error(`events ${s.name} threw; it yields nothing more until it runs again:`, e);
  s.done = true;
};
// the sort orderOf does, given the places the host reported: a function of its inputs
export const orderKeyed = () => (list: readonly Lst[], places: readonly Place[]): { out: Lst[]; complete: boolean } => {
  const own = places[0] ?? null;
  const key = (p: Place): readonly [number, string, number] | null => (p === null ? null : [own !== null && p[0] === own[0] ? 0 : 1, p[0], p[1]]);
  const keyed = list.map((l, i) => ({ l, i, k: key(places[i + 1] ?? null) }));
  const sorted = keyed.toSorted((a, b) => {
    const ak = a.k, bk = b.k;
    if (ak === null || bk === null) return ak !== null ? -1 : bk !== null ? 1 : a.i - b.i;
    return ak[0] - bk[0] || (ak[1] < bk[1] ? -1 : ak[1] > bk[1] ? 1 : 0) || ak[2] - bk[2] || a.i - b.i;
  });
  return { out: sorted.map((x) => x.l), complete: own !== null && keyed.every((x) => x.k !== null) };
};
export const ordered = () => new Set<HState>();
export const listenerOrderChanged = (ordered: Set<HState>) => (): void => { for (const s of ordered) s.order = null; ordered.clear(); };
export const handleOfState = () => new WeakMap<HState, Handle>();
export const deliver = (orderOf: (s: HState, h: unknown) => Lst[]) => (s: HState, v: unknown): void => {
  s.queue.push(v);
  if (s.draining) return;
  s.draining = true;
  try {
    for (let x = s.queue.shift(); s.queue.length >= 0 && x !== undefined; x = s.queue.shift()) for (const l of orderOf(s, null)) if (s.listeners.has(l)) l.action(x);
  } finally { s.draining = false; }
};
export const listen = (isListener: (v: unknown) => boolean) => (l: Lst, cell: string, invalidation: Promise<unknown> | null): Lst => {
  if (!isListener(l)) throw new Error(`${cell} must return on(events, action)`);
  invalidation?.then(() => 0);
  return l;
};
export const detach = (attached: Set<Lst>) => (l: Lst): void => { attached.delete(l); };
export const release = (isListener: (v: unknown) => boolean, detach: (l: Lst) => void) => (v: Lst): void => { if (isListener(v)) detach(v); };
export const sweep = (attached: Set<Lst>, generating: Set<Handle>, release: (v: unknown) => void) => {
  let generation = 0;
  const bornAt = new Map<object, number>();
  return (values: Set<unknown>): void => {
    generation++;
    for (const x of [...attached, ...generating]) {
      if (values.has(x)) { bornAt.delete(x); continue; }
      const b = bornAt.get(x);
      if (b === undefined) { bornAt.set(x, generation); continue; }
      if (b < generation) { bornAt.delete(x); release(x); }
    }
  };
};
