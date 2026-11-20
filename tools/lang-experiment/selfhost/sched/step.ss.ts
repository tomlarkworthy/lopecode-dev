// The decisions of lite/browser/cells.ts as one pure function over ids: shell.ts holds the objects and performs
// the effects. Checked together with lite/runtime.ss.ts as one module (check.ts), so a cell may take same.
type Hs = {
  readonly key: string; readonly name: string; readonly args: readonly unknown[] | null; readonly make: string;
  readonly gen: boolean; readonly no: number; readonly done: boolean; readonly busy: boolean; readonly pending: boolean;
  readonly listeners: readonly number[]; readonly order: readonly number[] | null;
  readonly queue: readonly unknown[]; readonly draining: boolean; readonly cur: unknown; readonly rest: readonly number[];
};
type Ls = { readonly hid: number; readonly key: string; readonly cell: string; readonly aid: number; readonly parked: boolean };
type Sched = {
  readonly hs: Map<number, Hs>; readonly at: Map<string, number>; readonly ls: Map<number, Ls>; readonly lat: Map<string, number>;
  readonly placer: boolean; readonly generation: number; readonly born: Map<string, number>;
};
type Ev =
  | { readonly t: "open"; readonly hid: number; readonly key: string; readonly name: string }
  | { readonly t: "run"; readonly hid: number; readonly args: readonly unknown[]; readonly make: string }
  | { readonly t: "made"; readonly hid: number; readonly args: readonly unknown[]; readonly make: string }
  | { readonly t: "pending"; readonly hid: number }
  | { readonly t: "listen"; readonly hid: number; readonly lid: number; readonly key: string; readonly cell: string; readonly aid: number; readonly name: string }
  | { readonly t: "linv"; readonly hid: number; readonly lid: number; readonly key: string }
  | { readonly t: "pull"; readonly hid: number; readonly no: number }
  | { readonly t: "got"; readonly hid: number; readonly no: number; readonly done: boolean; readonly value: unknown }
  | { readonly t: "resolved"; readonly hid: number; readonly no: number; readonly done: boolean; readonly value: unknown }
  | { readonly t: "awaiting"; readonly hid: number }
  | { readonly t: "threw"; readonly hid: number; readonly no: number; readonly error: unknown }
  | { readonly t: "rejected"; readonly hid: number; readonly no: number; readonly error: unknown }
  | { readonly t: "kick"; readonly hid: number }
  | { readonly t: "drain"; readonly hid: number }
  | { readonly t: "placed"; readonly hid: number; readonly order: readonly number[]; readonly complete: boolean }
  | { readonly t: "abort"; readonly hid: number }
  | { readonly t: "orderChanged"; readonly placer: boolean }
  | { readonly t: "releaseL"; readonly lid: number }
  | { readonly t: "releaseH"; readonly hid: number }
  | { readonly t: "releaseA"; readonly aid: number }
  | { readonly t: "sweep"; readonly heldL: readonly number[]; readonly heldH: readonly number[] };
type Fx =
  | { readonly fx: "frame"; readonly hid: number; readonly no: number }
  | { readonly fx: "next"; readonly hid: number; readonly no: number }
  | { readonly fx: "return"; readonly hid: number }
  | { readonly fx: "make"; readonly hid: number }
  | { readonly fx: "call"; readonly lid: number; readonly value: unknown; readonly cell: string; readonly events: string }
  | { readonly fx: "place"; readonly hid: number; readonly lids: readonly number[] }
  | { readonly fx: "fail"; readonly name: string; readonly error: unknown }
  | { readonly fx: "then"; readonly ev: Ev }
  | { readonly fx: "forgetL"; readonly lid: number }
  | { readonly fx: "forgetH"; readonly hid: number };
type Out = { readonly state: Sched; readonly effects: readonly Fx[] };

export const init = (): Sched => ({ hs: new Map(), at: new Map(), ls: new Map(), lat: new Map(), placer: false, generation: 0, born: new Map() });
export const blank = () => (key: string, name: string): Hs => ({
  key, name, args: null, make: "", gen: false, no: 0, done: false, busy: false, pending: false,
  listeners: [], order: null, queue: [], draining: false, cur: undefined, rest: [],
});

export const step = (same: (a: readonly unknown[], b: readonly unknown[]) => boolean, blank: (key: string, name: string) => Hs) => (st: Sched, ev: Ev): Out => {
  const hs = mut(new Map(st.hs)), at = mut(new Map(st.at)), ls = mut(new Map(st.ls)), lat = mut(new Map(st.lat)), born = mut(new Map(st.born));
  const fx: Mut<Fx[]> = mut([]);
  let placer = st.placer, generation = st.generation;
  const put = (hid: number, h: Hs) => void hs.set(hid, h);
  const kick = (hid: number) => {
    const h = hs.get(hid);
    if (h === undefined || h.busy || !h.gen || h.done || !h.listeners.length) return;
    put(hid, { ...h, busy: true });
    fx.push({ fx: "frame", hid, no: h.no });
  };
  const stop = (hid: number, h: Hs) => {
    if (h.gen) fx.push({ fx: "return", hid });
    put(hid, { ...h, gen: false, args: null, no: h.no + 1, queue: [] });
  };
  const deliver = (hid: number, h: Hs, v: unknown) => {
    put(hid, { ...h, queue: [...h.queue, v], draining: true });
    if (!h.draining) fx.push({ fx: "then", ev: { t: "drain", hid } });
  };
  const pull = (hid: number, no: number) => {
    const h = hs.get(hid);
    if (h === undefined) return;
    put(hid, { ...h, busy: false });
    if (no !== h.no || !h.gen || h.done || !h.listeners.length) kick(hid);
    else fx.push({ fx: "next", hid, no });
  };
  const fail = (hid: number, no: number, error: unknown) => {
    const h = hs.get(hid);
    if (h === undefined || no !== h.no) return;
    fx.push({ fx: "fail", name: h.name, error });
    put(hid, { ...h, done: true });
  };
  const detach = (lid: number) => {
    const l = ls.get(lid);
    if (l === undefined) return;
    const h = hs.get(l.hid);
    if (h !== undefined) put(l.hid, { ...h, listeners: h.listeners.filter((x) => x !== lid), order: null });
    if (lat.get(l.key) === lid) lat.delete(l.key);
    ls.delete(lid);
    born.delete(`l${lid}`);
    fx.push({ fx: "forgetL", lid });
  };
  const releaseH = (hid: number) => {
    const h = hs.get(hid);
    if (h === undefined) return;
    stop(hid, h);
    if (at.get(h.key) === hid) at.delete(h.key);
    for (const lid of h.listeners) detach(lid);
    hs.delete(hid);
    born.delete(`h${hid}`);
    fx.push({ fx: "forgetH", hid });
  };
  const drain = (hid: number) => {
    for (;;) {
      const h = hs.get(hid);
      if (h === undefined) return;
      const first = h.rest[0];
      if (first !== undefined) {
        put(hid, { ...h, rest: h.rest.slice(1) });
        const l = ls.get(first);
        if (l === undefined || !h.listeners.includes(first)) continue;
        fx.push({ fx: "call", lid: first, value: h.cur, cell: l.cell, events: h.name });
        fx.push({ fx: "then", ev: { t: "drain", hid } });
        return;
      }
      if (!h.queue.length) return put(hid, { ...h, draining: false, cur: undefined });
      const next = { ...h, cur: h.queue[0], queue: h.queue.slice(1) };
      if (next.order === null && placer && next.listeners.length >= 2) {
        put(hid, next);
        fx.push({ fx: "place", hid, lids: next.listeners });
        return;
      }
      put(hid, { ...next, rest: next.order ?? next.listeners });
    }
  };
  const h = "hid" in ev ? hs.get(ev.hid) : undefined;
  switch (ev.t) {
    case "open":
      put(ev.hid, blank(ev.key, ev.name));
      at.set(ev.key, ev.hid);
      break;
    case "run":
      if (h === undefined) break;
      if (h.args === null || !same(h.args, ev.args) || h.make !== ev.make) {
        stop(ev.hid, h);
        fx.push({ fx: "make", hid: ev.hid });
        break;
      }
      for (const lid of h.listeners) if (ls.get(lid)?.parked === true) detach(lid);
      put(ev.hid, { ...(hs.get(ev.hid) ?? h), pending: false });
      break;
    case "made":
      if (h === undefined) break;
      put(ev.hid, { ...h, gen: true, args: ev.args, make: ev.make, done: false });
      kick(ev.hid);
      put(ev.hid, { ...(hs.get(ev.hid) ?? h), pending: false });
      break;
    case "pending":
      if (h !== undefined) put(ev.hid, { ...h, pending: true });
      break;
    case "listen": {
      const old = lat.get(ev.key);
      if (old === ev.lid) break;
      if (old !== undefined) detach(old);
      // a released handle: no -1 so a result its stopped generator still sends never matches
      const hh: Hs = hs.get(ev.hid) ?? { ...blank("", ev.name), no: -1 };
      ls.set(ev.lid, { hid: ev.hid, key: ev.key, cell: ev.cell, aid: ev.aid, parked: false });
      lat.set(ev.key, ev.lid);
      put(ev.hid, { ...hh, listeners: hh.listeners.includes(ev.lid) ? hh.listeners : [...hh.listeners, ev.lid], order: null });
      kick(ev.hid);
      break;
    }
    case "linv": {
      const l = ls.get(ev.lid);
      if (lat.get(ev.key) !== ev.lid || l === undefined) break;
      if (h?.pending === true) ls.set(ev.lid, { ...l, parked: true });
      else detach(ev.lid);
      break;
    }
    case "pull":
      pull(ev.hid, ev.no);
      break;
    case "got":
      if (h === undefined) break;
      if (ev.done) { put(ev.hid, { ...h, done: true }); break; }
      deliver(ev.hid, h, ev.value);
      fx.push({ fx: "then", ev: { t: "kick", hid: ev.hid } });
      break;
    case "resolved":
      if (h === undefined) break;
      put(ev.hid, { ...h, busy: false });
      if (ev.no !== h.no) { kick(ev.hid); break; }
      if (ev.done) { put(ev.hid, { ...h, busy: false, done: true }); break; }
      deliver(ev.hid, { ...h, busy: false }, ev.value);
      fx.push({ fx: "then", ev: { t: "pull", hid: ev.hid, no: ev.no } });
      break;
    case "awaiting":
      if (h !== undefined) put(ev.hid, { ...h, busy: true });
      break;
    case "threw":
      fail(ev.hid, ev.no, ev.error);
      break;
    case "rejected":
      if (h !== undefined) put(ev.hid, { ...h, busy: false });
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
      put(ev.hid, { ...h, rest: ev.order, order: ev.complete ? ev.order : h.order });
      drain(ev.hid);
      break;
    case "abort":
      if (h !== undefined) put(ev.hid, { ...h, draining: false, rest: [] });
      break;
    case "orderChanged":
      placer = ev.placer;
      for (const [hid, x] of st.hs) if (x.order !== null) put(hid, { ...x, order: null });
      break;
    case "releaseL":
      detach(ev.lid);
      break;
    case "releaseH":
      releaseH(ev.hid);
      break;
    case "releaseA":
      for (const lid of [...lat.values()]) if (ls.get(lid)?.aid === ev.aid) detach(lid);
      break;
    case "sweep": {
      generation++;
      const heldL = new Set(ev.heldL), heldH = new Set(ev.heldH);
      const all: readonly (readonly [string, number, boolean])[] = [...[...lat.values()].map((id) => [`l${id}`, id, heldL.has(id)] as const), ...[...at.values()].map((id) => [`h${id}`, id, heldH.has(id)] as const)];
      for (const [k, id, held] of all) {
        const release = () => (k[0] === "l" ? detach(id) : releaseH(id));
        if (held) { born.delete(k); continue; }
        if (k[0] === "l" && ls.get(id)?.parked === true) { born.delete(k); release(); continue; }
        const b = born.get(k);
        if (b === undefined) { born.set(k, generation); continue; }
        if (b < generation) { born.delete(k); release(); }
      }
      break;
    }
  }
  return { state: { hs: freeze(hs), at: freeze(at), ls: freeze(ls), lat: freeze(lat), placer, generation, born: freeze(born) }, effects: freeze(fx) };
};

export const hidAt = () => (st: Sched, key: string): number | null => st.at.get(key) ?? null;
export const candidates = () => (st: Sched): { readonly lids: readonly number[]; readonly hids: readonly number[] } => ({ lids: [...st.lat.values()], hids: [...st.at.values()] });
export const liveEvents = () => (st: Sched): number => st.at.size;
export const running = () => (st: Sched, of: readonly number[] | null): number =>
  of === null ? st.lat.size : [...st.lat.values()].filter((lid) => { const l = st.ls.get(lid); return l !== undefined && of.includes(l.hid); }).length;
export const pulling = () => (st: Sched, of: readonly number[] | null): number =>
  [...st.at.values()].filter((hid) => { const h = st.hs.get(hid); return h !== undefined && (of === null || of.includes(hid)) && h.gen && !h.done && h.listeners.length > 0; }).length;
