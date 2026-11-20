// The decisions of ../sched/step.ss.ts over a mutable view of the state, shared by the immer and in-place variants.
// The view's records are live (an immer draft or the state itself), so each helper reads a field before writing it.
// Plain TypeScript, not checked.
export type Hs = {
  key: string; name: string; args: readonly unknown[] | null; make: string;
  gen: boolean; no: number; done: boolean; busy: boolean; pending: boolean;
  listeners: readonly number[]; order: readonly number[] | null;
  queue: readonly unknown[]; draining: boolean; cur: unknown; rest: readonly number[];
};
export type Ls = { hid: number; key: string; cell: string; aid: number; parked: boolean };
export type Tab<K, V> = { get(k: K): V | undefined; set(k: K, v: V): unknown; delete(k: K): unknown; entries(): Iterable<[K, V]> };
export type View = {
  hs: Tab<number, Hs>; at: Map<string, number>; ls: Map<number, Ls>; lat: Map<string, number>; born: Map<string, number>;
  placer: boolean; generation: number;
};
export type Ev = any;
export type Fx = any;

export const blank = (key: string, name: string): Hs => ({
  key, name, args: null, make: "", gen: false, no: 0, done: false, busy: false, pending: false,
  listeners: [], order: null, queue: [], draining: false, cur: undefined, rest: [],
});
const same = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

// plain: turns a value read out of the view into one that may leave it (immer: current() of a draft)
export function apply(v: View, ev: Ev, fx: Fx[], plain: <T>(x: T) => T, patchRecord: boolean) {
  const { hs } = v; // at, ls, lat, born read through v at each use, so immer drafts only the maps a step touches
  // patchRecord: write fields of the live record; else replace the record (the in-place-replace variant)
  const patch = (hid: number, p: Partial<Hs>) => {
    const h = hs.get(hid);
    if (h === undefined) return;
    if (patchRecord) Object.assign(h, p); else hs.set(hid, { ...h, ...p });
  };
  const kick = (hid: number) => {
    const h = hs.get(hid);
    if (h === undefined || h.busy || !h.gen || h.done || !h.listeners.length) return;
    const no = h.no;
    patch(hid, { busy: true });
    fx.push({ fx: "frame", hid, no });
  };
  const stop = (hid: number, h: Hs) => {
    if (h.gen) fx.push({ fx: "return", hid });
    patch(hid, { gen: false, args: null, no: h.no + 1, queue: [] });
  };
  const deliver = (hid: number, h: Hs, val: unknown) => {
    const was = h.draining;
    patch(hid, { queue: [...h.queue, val], draining: true });
    if (!was) fx.push({ fx: "then", ev: { t: "drain", hid } });
  };
  const pull = (hid: number, no: number) => {
    const h = hs.get(hid);
    if (h === undefined) return;
    patch(hid, { busy: false });
    const g = hs.get(hid)!;
    if (no !== g.no || !g.gen || g.done || !g.listeners.length) kick(hid);
    else fx.push({ fx: "next", hid, no });
  };
  const fail = (hid: number, no: number, error: unknown) => {
    const h = hs.get(hid);
    if (h === undefined || no !== h.no) return;
    fx.push({ fx: "fail", name: h.name, error });
    patch(hid, { done: true });
  };
  const detach = (lid: number) => {
    const l = v.ls.get(lid);
    if (l === undefined) return;
    const h = hs.get(l.hid);
    if (h !== undefined) patch(l.hid, { listeners: h.listeners.filter((x) => x !== lid), order: null });
    if (v.lat.get(l.key) === lid) v.lat.delete(l.key);
    v.ls.delete(lid);
    v.born.delete(`l${lid}`);
    fx.push({ fx: "forgetL", lid });
  };
  const releaseH = (hid: number) => {
    const h = hs.get(hid);
    if (h === undefined) return;
    const key = h.key, lids = [...h.listeners];
    stop(hid, h);
    if (v.at.get(key) === hid) v.at.delete(key);
    for (const lid of lids) detach(lid);
    hs.delete(hid);
    v.born.delete(`h${hid}`);
    fx.push({ fx: "forgetH", hid });
  };
  const drain = (hid: number) => {
    for (;;) {
      const h = hs.get(hid);
      if (h === undefined) return;
      const first = h.rest[0];
      if (first !== undefined) {
        patch(hid, { rest: h.rest.slice(1) });
        const g = hs.get(hid)!;
        const l = v.ls.get(first);
        if (l === undefined || !g.listeners.includes(first)) continue;
        fx.push({ fx: "call", lid: first, value: plain(g.cur), cell: l.cell, events: g.name });
        fx.push({ fx: "then", ev: { t: "drain", hid } });
        return;
      }
      if (!h.queue.length) return patch(hid, { draining: false, cur: undefined });
      patch(hid, { cur: h.queue[0], queue: h.queue.slice(1) });
      const n = hs.get(hid)!;
      if (n.order === null && v.placer && n.listeners.length >= 2) {
        fx.push({ fx: "place", hid, lids: plain(n.listeners) });
        return;
      }
      patch(hid, { rest: n.order ?? n.listeners });
    }
  };
  const h = "hid" in ev ? hs.get(ev.hid) : undefined;
  switch (ev.t) {
    case "open":
      hs.set(ev.hid, blank(ev.key, ev.name));
      v.at.set(ev.key, ev.hid);
      break;
    case "run":
      if (h === undefined) break;
      if (h.args === null || !same(h.args, ev.args) || h.make !== ev.make) {
        stop(ev.hid, h);
        fx.push({ fx: "make", hid: ev.hid });
        break;
      }
      for (const lid of [...h.listeners]) if (v.ls.get(lid)?.parked === true) detach(lid);
      patch(ev.hid, { pending: false });
      break;
    case "made":
      if (h === undefined) break;
      patch(ev.hid, { gen: true, args: ev.args, make: ev.make, done: false });
      kick(ev.hid);
      patch(ev.hid, { pending: false });
      break;
    case "pending":
      if (h !== undefined) patch(ev.hid, { pending: true });
      break;
    case "listen": {
      const old = v.lat.get(ev.key);
      if (old === ev.lid) break;
      if (old !== undefined) detach(old);
      v.ls.set(ev.lid, { hid: ev.hid, key: ev.key, cell: ev.cell, aid: ev.aid, parked: false });
      v.lat.set(ev.key, ev.lid);
      const hh = hs.get(ev.hid);
      if (hh === undefined) hs.set(ev.hid, { ...blank("", ev.name), no: -1, listeners: [ev.lid] });
      else patch(ev.hid, { listeners: hh.listeners.includes(ev.lid) ? hh.listeners : [...hh.listeners, ev.lid], order: null });
      kick(ev.hid);
      break;
    }
    case "linv": {
      const l = v.ls.get(ev.lid);
      if (v.lat.get(ev.key) !== ev.lid || l === undefined) break;
      if (h?.pending === true) { if (patchRecord) l.parked = true; else v.ls.set(ev.lid, { ...l, parked: true }); }
      else detach(ev.lid);
      break;
    }
    case "pull":
      pull(ev.hid, ev.no);
      break;
    case "got":
      if (h === undefined) break;
      if (ev.done) { patch(ev.hid, { done: true }); break; }
      deliver(ev.hid, h, ev.value);
      fx.push({ fx: "then", ev: { t: "kick", hid: ev.hid } });
      break;
    case "resolved": {
      if (h === undefined) break;
      const no = h.no;
      patch(ev.hid, { busy: false });
      if (ev.no !== no) { kick(ev.hid); break; }
      if (ev.done) { patch(ev.hid, { done: true }); break; }
      deliver(ev.hid, hs.get(ev.hid)!, ev.value);
      fx.push({ fx: "then", ev: { t: "pull", hid: ev.hid, no: ev.no } });
      break;
    }
    case "awaiting":
      if (h !== undefined) patch(ev.hid, { busy: true });
      break;
    case "threw":
      fail(ev.hid, ev.no, ev.error);
      break;
    case "rejected":
      if (h !== undefined) patch(ev.hid, { busy: false });
      fail(ev.hid, ev.no, ev.error);
      break;
    case "kick":
      kick(ev.hid);
      break;
    case "drain":
      drain(ev.hid);
      break;
    case "placed":
      if (h === undefined) break;
      patch(ev.hid, ev.complete ? { rest: ev.order, order: ev.order } : { rest: ev.order });
      drain(ev.hid);
      break;
    case "abort":
      if (h !== undefined) patch(ev.hid, { draining: false, rest: [] });
      break;
    case "orderChanged": {
      v.placer = ev.placer;
      const ids: number[] = [];
      for (const [hid, x] of hs.entries()) if (x.order !== null) ids.push(hid);
      for (const hid of ids) patch(hid, { order: null });
      break;
    }
    case "releaseL":
      detach(ev.lid);
      break;
    case "releaseH":
      releaseH(ev.hid);
      break;
    case "releaseA":
      for (const lid of [...v.lat.values()]) if (v.ls.get(lid)?.aid === ev.aid) detach(lid);
      break;
    case "sweep": {
      const generation = ++v.generation;
      const heldL = new Set(ev.heldL), heldH = new Set(ev.heldH);
      const all = [...[...v.lat.values()].map((id) => [`l${id}`, id, heldL.has(id)] as const), ...[...v.at.values()].map((id) => [`h${id}`, id, heldH.has(id)] as const)];
      for (const [k, id, held] of all) {
        const release = () => (k[0] === "l" ? detach(id) : releaseH(id));
        if (held) { v.born.delete(k); continue; }
        if (k[0] === "l" && v.ls.get(id)?.parked === true) { v.born.delete(k); release(); continue; }
        const b = v.born.get(k);
        if (b === undefined) { v.born.set(k, generation); continue; }
        if (b < generation) { v.born.delete(k); release(); }
      }
      break;
    }
  }
}
