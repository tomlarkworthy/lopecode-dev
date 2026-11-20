// ../sched/step.ss.ts split into one cell per event kind and one per shared decision; step is the switch.
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
type EOpen = { readonly t: "open"; readonly hid: number; readonly key: string; readonly name: string };
type ERun = { readonly t: "run"; readonly hid: number; readonly args: readonly unknown[]; readonly make: string };
type EMade = { readonly t: "made"; readonly hid: number; readonly args: readonly unknown[]; readonly make: string };
type EListen = { readonly t: "listen"; readonly hid: number; readonly lid: number; readonly key: string; readonly cell: string; readonly aid: number; readonly name: string };
type ELinv = { readonly t: "linv"; readonly hid: number; readonly lid: number; readonly key: string };
type EGot = { readonly t: "got"; readonly hid: number; readonly no: number; readonly done: boolean; readonly value: unknown };
type EResolved = { readonly t: "resolved"; readonly hid: number; readonly no: number; readonly done: boolean; readonly value: unknown };
type ERejected = { readonly t: "rejected"; readonly hid: number; readonly no: number; readonly error: unknown };
type EPlaced = { readonly t: "placed"; readonly hid: number; readonly order: readonly number[]; readonly complete: boolean };
type ESweep = { readonly t: "sweep"; readonly heldL: readonly number[]; readonly heldH: readonly number[] };
type Ev =
  | EOpen | ERun | EMade | { readonly t: "pending"; readonly hid: number } | EListen | ELinv
  | { readonly t: "pull"; readonly hid: number; readonly no: number } | EGot | EResolved
  | { readonly t: "awaiting"; readonly hid: number }
  | { readonly t: "threw"; readonly hid: number; readonly no: number; readonly error: unknown } | ERejected
  | { readonly t: "kick"; readonly hid: number } | { readonly t: "drain"; readonly hid: number } | EPlaced
  | { readonly t: "abort"; readonly hid: number } | { readonly t: "orderChanged"; readonly placer: boolean }
  | { readonly t: "releaseL"; readonly lid: number } | { readonly t: "releaseH"; readonly hid: number }
  | { readonly t: "releaseA"; readonly aid: number } | ESweep;
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

export const wantsValues = () => (h: Hs): boolean => h.gen && !h.done && h.listeners.length > 0;
export const isStale = () => (h: Hs, no: number): boolean => no !== h.no;
export const mustRemake = (same) => (h: Hs, args: readonly unknown[], make: string): boolean => h.args === null || !same(h.args, args) || h.make !== make;
export const parksOnInvalidation = () => (h: Hs | undefined): boolean => h?.pending === true;
export const needsPlacing = () => (h: Hs, placer: boolean): boolean => h.order === null && placer && h.listeners.length >= 2;
export const nextListener = () => (h: Hs, ls: Mut<Map<number, Ls>>): { readonly lid: number | null; readonly rest: readonly number[] } => {
  let i = 0;
  for (const lid of h.rest) {
    i++;
    if (ls.has(lid) && h.listeners.includes(lid)) return { lid, rest: h.rest.slice(i) };
  }
  return { lid: null, rest: [] };
};
export const sweepVerdict = () => (held: boolean, parkedListener: boolean, born: number | undefined, generation: number): "spare" | "release" | "mark" | "keep" =>
  held ? "spare" : parkedListener ? "release" : born === undefined ? "mark" : born < generation ? "release" : "keep";

export const kick = (wantsValues) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, hid: number): void => {
  const h = hs.get(hid);
  if (h === undefined || h.busy || !wantsValues(h)) return;
  hs.set(hid, { ...h, busy: true });
  fx.push({ fx: "frame", hid, no: h.no });
};
export const stopGen = () => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, hid: number, h: Hs): void => {
  if (h.gen) fx.push({ fx: "return", hid });
  hs.set(hid, { ...h, gen: false, args: null, no: h.no + 1, queue: [] });
};
export const enqueue = () => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, hid: number, h: Hs, v: unknown): void => {
  hs.set(hid, { ...h, queue: [...h.queue, v], draining: true });
  if (!h.draining) fx.push({ fx: "then", ev: { t: "drain", hid } });
};
export const fail = (isStale) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, hid: number, no: number, error: unknown): void => {
  const h = hs.get(hid);
  if (h === undefined || isStale(h, no)) return;
  fx.push({ fx: "fail", name: h.name, error });
  hs.set(hid, { ...h, done: true });
};
export const detach = () => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, lid: number): void => {
  const l = ls.get(lid);
  if (l === undefined) return;
  const h = hs.get(l.hid);
  if (h !== undefined) hs.set(l.hid, { ...h, listeners: h.listeners.filter((x) => x !== lid), order: null });
  if (lat.get(l.key) === lid) lat.delete(l.key);
  ls.delete(lid);
  born.delete(`l${lid}`);
  fx.push({ fx: "forgetL", lid });
};
export const releaseHandle = (stopGen, detach) => (hs: Mut<Map<number, Hs>>, at: Mut<Map<string, number>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, hid: number): void => {
  const h = hs.get(hid);
  if (h === undefined) return;
  stopGen(hs, fx, hid, h);
  if (at.get(h.key) === hid) at.delete(h.key);
  for (const lid of h.listeners) detach(hs, ls, lat, born, fx, lid);
  hs.delete(hid);
  born.delete(`h${hid}`);
  fx.push({ fx: "forgetH", hid });
};
// the next live listener in this value's order is called; false when none is left
export const callNext = (nextListener) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, fx: Mut<Fx[]>, hid: number, h: Hs): boolean => {
  const n = nextListener(h, ls);
  const l = n.lid === null ? undefined : ls.get(n.lid);
  if (n.lid === null || l === undefined) return false;
  hs.set(hid, { ...h, rest: n.rest });
  fx.push({ fx: "call", lid: n.lid, value: h.cur, cell: l.cell, events: h.name });
  fx.push({ fx: "then", ev: { t: "drain", hid } });
  return true;
};
// the next queued value becomes current, in listener order or after placing; true when it is ready to call
export const takeValue = (needsPlacing) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, placer: boolean, hid: number, h: Hs): boolean => {
  if (!h.queue.length) {
    hs.set(hid, { ...h, rest: [], draining: false, cur: undefined });
    return false;
  }
  const next: Hs = { ...h, cur: h.queue[0], queue: h.queue.slice(1), rest: [] };
  if (needsPlacing(next, placer)) {
    hs.set(hid, next);
    fx.push({ fx: "place", hid, lids: next.listeners });
    return false;
  }
  hs.set(hid, { ...next, rest: next.order ?? next.listeners });
  return true;
};
export const drainOnce = (callNext, takeValue) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, fx: Mut<Fx[]>, placer: boolean, hid: number): boolean => {
  const h = hs.get(hid);
  return h !== undefined && !callNext(hs, ls, fx, hid, h) && takeValue(hs, fx, placer, hid, h);
};
export const drain = (drainOnce) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, fx: Mut<Fx[]>, placer: boolean, hid: number): void => {
  while (drainOnce(hs, ls, fx, placer, hid));
};

export const onOpen = (blank) => (hs: Mut<Map<number, Hs>>, at: Mut<Map<string, number>>, ev: EOpen): void => {
  hs.set(ev.hid, blank(ev.key, ev.name));
  at.set(ev.key, ev.hid);
};
export const onRun = (mustRemake, stopGen, detach) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, ev: ERun): void => {
  const h = hs.get(ev.hid);
  if (h === undefined) return;
  if (mustRemake(h, ev.args, ev.make)) {
    stopGen(hs, fx, ev.hid, h);
    return void fx.push({ fx: "make", hid: ev.hid });
  }
  for (const lid of h.listeners) if (ls.get(lid)?.parked === true) detach(hs, ls, lat, born, fx, lid);
  hs.set(ev.hid, { ...(hs.get(ev.hid) ?? h), pending: false });
};
export const onMade = (kick) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, ev: EMade): void => {
  const h = hs.get(ev.hid);
  if (h === undefined) return;
  hs.set(ev.hid, { ...h, gen: true, args: ev.args, make: ev.make, done: false });
  kick(hs, fx, ev.hid);
  hs.set(ev.hid, { ...(hs.get(ev.hid) ?? h), pending: false });
};
export const onPending = () => (hs: Mut<Map<number, Hs>>, hid: number): void => {
  const h = hs.get(hid);
  if (h !== undefined) hs.set(hid, { ...h, pending: true });
};
export const onListen = (blank, detach, kick) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, ev: EListen): void => {
  const old = lat.get(ev.key);
  if (old === ev.lid) return;
  if (old !== undefined) detach(hs, ls, lat, born, fx, old);
  // a released handle: no -1 so a result its stopped generator still sends never matches
  const hh: Hs = hs.get(ev.hid) ?? { ...blank("", ev.name), no: -1 };
  ls.set(ev.lid, { hid: ev.hid, key: ev.key, cell: ev.cell, aid: ev.aid, parked: false });
  lat.set(ev.key, ev.lid);
  hs.set(ev.hid, { ...hh, listeners: hh.listeners.includes(ev.lid) ? hh.listeners : [...hh.listeners, ev.lid], order: null });
  kick(hs, fx, ev.hid);
};
export const onLinv = (parksOnInvalidation, detach) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, ev: ELinv): void => {
  const l = ls.get(ev.lid);
  if (lat.get(ev.key) !== ev.lid || l === undefined) return;
  if (parksOnInvalidation(hs.get(ev.hid))) ls.set(ev.lid, { ...l, parked: true });
  else detach(hs, ls, lat, born, fx, ev.lid);
};
export const onPull = (kick, isStale, wantsValues) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, hid: number, no: number): void => {
  const h = hs.get(hid);
  if (h === undefined) return;
  hs.set(hid, { ...h, busy: false });
  if (isStale(h, no) || !wantsValues(h)) kick(hs, fx, hid);
  else fx.push({ fx: "next", hid, no });
};
export const onGot = (enqueue) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, ev: EGot): void => {
  const h = hs.get(ev.hid);
  if (h === undefined) return;
  if (ev.done) return void hs.set(ev.hid, { ...h, done: true });
  enqueue(hs, fx, ev.hid, h, ev.value);
  fx.push({ fx: "then", ev: { t: "kick", hid: ev.hid } });
};
export const onResolved = (kick, isStale, enqueue) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, ev: EResolved): void => {
  const h0 = hs.get(ev.hid);
  if (h0 === undefined) return;
  const h: Hs = { ...h0, busy: false };
  hs.set(ev.hid, h);
  if (isStale(h, ev.no)) return kick(hs, fx, ev.hid);
  if (ev.done) return void hs.set(ev.hid, { ...h, done: true });
  enqueue(hs, fx, ev.hid, h, ev.value);
  fx.push({ fx: "then", ev: { t: "pull", hid: ev.hid, no: ev.no } });
};
export const onAwaiting = () => (hs: Mut<Map<number, Hs>>, hid: number): void => {
  const h = hs.get(hid);
  if (h !== undefined) hs.set(hid, { ...h, busy: true });
};
export const onRejected = (fail) => (hs: Mut<Map<number, Hs>>, fx: Mut<Fx[]>, ev: ERejected): void => {
  const h = hs.get(ev.hid);
  if (h !== undefined) hs.set(ev.hid, { ...h, busy: false });
  fail(hs, fx, ev.hid, ev.no, ev.error);
};
export const onPlaced = (drain) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, fx: Mut<Fx[]>, placer: boolean, ev: EPlaced): void => {
  const h = hs.get(ev.hid);
  if (h === undefined) return;
  hs.set(ev.hid, { ...h, rest: ev.order, order: ev.complete ? ev.order : h.order });
  drain(hs, ls, fx, placer, ev.hid);
};
export const onAbort = () => (hs: Mut<Map<number, Hs>>, hid: number): void => {
  const h = hs.get(hid);
  if (h !== undefined) hs.set(hid, { ...h, draining: false, rest: [] });
};
export const forgetOrders = () => (hs: Mut<Map<number, Hs>>, before: Map<number, Hs>): void => {
  for (const [hid, x] of before) if (x.order !== null) hs.set(hid, { ...x, order: null });
};
export const onReleaseAction = (detach) => (hs: Mut<Map<number, Hs>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, aid: number): void => {
  for (const lid of [...lat.values()]) if (ls.get(lid)?.aid === aid) detach(hs, ls, lat, born, fx, lid);
};
export const onSweep = (sweepVerdict, detach, releaseHandle) => (hs: Mut<Map<number, Hs>>, at: Mut<Map<string, number>>, ls: Mut<Map<number, Ls>>, lat: Mut<Map<string, number>>, born: Mut<Map<string, number>>, fx: Mut<Fx[]>, generation: number, ev: ESweep): void => {
  const heldL = new Set(ev.heldL), heldH = new Set(ev.heldH);
  const all: readonly (readonly [string, number, boolean])[] = [...[...lat.values()].map((id) => [`l${id}`, id, heldL.has(id)] as const), ...[...at.values()].map((id) => [`h${id}`, id, heldH.has(id)] as const)];
  for (const [k, id, held] of all) {
    const v = sweepVerdict(held, k[0] === "l" && ls.get(id)?.parked === true, born.get(k), generation);
    if (v === "mark") born.set(k, generation);
    else if (v !== "keep") born.delete(k);
    if (v !== "release") continue;
    if (k[0] === "l") detach(hs, ls, lat, born, fx, id);
    else releaseHandle(hs, at, ls, lat, born, fx, id);
  }
};

export const step = (onOpen, onRun, onMade, onPending, onListen, onLinv, onPull, onGot, onResolved, onAwaiting, fail, onRejected, kick, drain, onPlaced, onAbort, forgetOrders, detach, releaseHandle, onReleaseAction, onSweep) => (st: Sched, ev: Ev): Out => {
  const hs = mut(new Map(st.hs)), at = mut(new Map(st.at)), ls = mut(new Map(st.ls)), lat = mut(new Map(st.lat)), born = mut(new Map(st.born));
  const fx: Mut<Fx[]> = mut([]);
  let placer = st.placer, generation = st.generation;
  switch (ev.t) {
    case "open": onOpen(hs, at, ev); break;
    case "run": onRun(hs, ls, lat, born, fx, ev); break;
    case "made": onMade(hs, fx, ev); break;
    case "pending": onPending(hs, ev.hid); break;
    case "listen": onListen(hs, ls, lat, born, fx, ev); break;
    case "linv": onLinv(hs, ls, lat, born, fx, ev); break;
    case "pull": onPull(hs, fx, ev.hid, ev.no); break;
    case "got": onGot(hs, fx, ev); break;
    case "resolved": onResolved(hs, fx, ev); break;
    case "awaiting": onAwaiting(hs, ev.hid); break;
    case "threw": fail(hs, fx, ev.hid, ev.no, ev.error); break;
    case "rejected": onRejected(hs, fx, ev); break;
    case "kick": kick(hs, fx, ev.hid); break;
    case "drain": drain(hs, ls, fx, placer, ev.hid); break;
    case "placed": onPlaced(hs, ls, fx, placer, ev); break;
    case "abort": onAbort(hs, ev.hid); break;
    case "orderChanged": placer = ev.placer; forgetOrders(hs, st.hs); break;
    case "releaseL": detach(hs, ls, lat, born, fx, ev.lid); break;
    case "releaseH": releaseHandle(hs, at, ls, lat, born, fx, ev.hid); break;
    case "releaseA": onReleaseAction(hs, ls, lat, born, fx, ev.aid); break;
    case "sweep": generation++; onSweep(hs, at, ls, lat, born, fx, generation, ev); break;
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
