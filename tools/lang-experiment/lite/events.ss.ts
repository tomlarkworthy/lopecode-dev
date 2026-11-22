// How each value an events cell yields reaches its listeners, as SoundScript cells: step(delivery, event) returns
// the next Delivery and the effects to perform. browser/cells.ts holds the one Delivery value, maps handles and
// listeners to the ids used here, runs the generators and the listeners' actions, and feeds what happened back as
// events. Under bun, runtime-ss.ts links these cells with runtime.ss.ts; in the notebook they are compiled cells
// of @tomlarkworthy/soundscript-runtime.

// one events cell: its run's inputs and function text, its generator, its listeners and the value being delivered.
// epoch: which generator a result came from; busy: a pull is scheduled or awaited; pending: the cell was
// invalidated and has not run again; born: the sweep generation that marked it; toCall: listeners still to call
export type EventsRecord = {
  readonly key: string; readonly name: string; readonly args: readonly unknown[] | null; readonly make: string;
  readonly hasGenerator: boolean; readonly epoch: number; readonly done: boolean;
  readonly busy: boolean; readonly pending: boolean; readonly born: number | null;
  readonly listeners: readonly number[]; readonly order: readonly number[] | null;
  readonly queue: readonly unknown[]; readonly draining: boolean; readonly current: unknown; readonly toCall: readonly number[];
};
export type ListenerRecord = { readonly hid: number; readonly key: string; readonly cell: string; readonly aid: number; readonly parked: boolean; readonly born: number | null };
export type Delivery = {
  readonly handles: Map<number, EventsRecord>; readonly handleAt: Map<string, number>;
  readonly listeners: Map<number, ListenerRecord>; readonly listenerAt: Map<string, number>;
  readonly placer: boolean; readonly generation: number;
};
export type OpenEvent = { readonly t: "open"; readonly hid: number; readonly key: string; readonly name: string };
export type RunEvent = { readonly t: "run" | "made"; readonly hid: number; readonly args: readonly unknown[]; readonly make: string };
export type ListenEvent = { readonly t: "listen"; readonly hid: number; readonly lid: number; readonly key: string; readonly cell: string; readonly aid: number; readonly name: string };
export type ListenerInvalidated = { readonly t: "listenerInvalidated"; readonly hid: number; readonly lid: number; readonly key: string };
export type Result = { readonly t: "got" | "resolved"; readonly hid: number; readonly epoch: number; readonly done: boolean; readonly value: unknown };
export type Failure = { readonly t: "threw" | "rejected"; readonly hid: number; readonly epoch: number; readonly error: unknown };
export type PlacedEvent = { readonly t: "placed"; readonly hid: number; readonly order: readonly number[]; readonly complete: boolean };
export type SweepEvent = { readonly t: "sweep"; readonly heldListeners: readonly number[]; readonly heldHandles: readonly number[] };
export type DeliveryEvent =
  | OpenEvent | RunEvent | ListenEvent | ListenerInvalidated | Result | Failure | PlacedEvent | SweepEvent
  | { readonly t: "eventsInvalidated" | "awaiting" | "schedule" | "deliver" | "placeFailed" | "releaseEvents"; readonly hid: number }
  | { readonly t: "pull"; readonly hid: number; readonly epoch: number }
  | { readonly t: "orderChanged"; readonly placer: boolean }
  | { readonly t: "releaseListener"; readonly lid: number }
  | { readonly t: "releaseAction"; readonly aid: number };
export type Effect =
  | { readonly fx: "frame" | "next"; readonly hid: number; readonly epoch: number }
  | { readonly fx: "return" | "make" | "forgetHandle"; readonly hid: number }
  | { readonly fx: "call"; readonly lid: number; readonly value: unknown; readonly cell: string; readonly events: string }
  | { readonly fx: "place"; readonly hid: number; readonly lids: readonly number[] }
  | { readonly fx: "fail"; readonly name: string; readonly error: unknown }
  | { readonly fx: "then"; readonly ev: DeliveryEvent }
  | { readonly fx: "forgetListener"; readonly lid: number };
export type StepResult = { readonly state: Delivery; readonly effects: readonly Effect[] };
export type Verdict = "spare" | "release" | "mark" | "keep";
// the working copies of a Delivery that step makes and the handlers write
export type Handles = Mut<Map<number, EventsRecord>>;
export type Listeners = Mut<Map<number, ListenerRecord>>;
export type Keys = Mut<Map<string, number>>;
export type Effects = Mut<Effect[]>;
export type Counters = Mut<{ placer: boolean; generation: number }>;

// a value, not a function: no events cell and no listener yet
export const emptyDelivery = (): Delivery => ({ handles: new Map(), handleAt: new Map(), listeners: new Map(), listenerAt: new Map(), placer: false, generation: 0 });
export const newEventsRecord = () => (key: string, name: string): EventsRecord => ({
  key, name, args: null, make: "", hasGenerator: false, epoch: 0, done: false, busy: false, pending: false, born: null,
  listeners: [], order: null, queue: [], draining: false, current: undefined, toCall: [],
});

// two input lists of an events cell are the same run
export const same = () => (a: readonly unknown[], b: readonly unknown[]): boolean => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
export const wantsValues = () => (h: EventsRecord): boolean => h.hasGenerator && !h.done && h.listeners.length > 0;
export const isStaleResult = () => (h: EventsRecord, epoch: number): boolean => epoch !== h.epoch;
// a run with other inputs, or a function of other text (an edit), replaces the generator
export const needsNewGenerator = (same) => (h: EventsRecord, args: readonly unknown[], make: string): boolean => h.args === null || !same(h.args, args) || h.make !== make;
// an invalidated listener stays attached, parked, while its events cell is pending: it runs again after it
export const parksOnInvalidation = () => (h: EventsRecord | undefined): boolean => h?.pending === true;
export const needsPlacing = () => (h: EventsRecord, placer: boolean): boolean => h.order === null && placer && h.listeners.length >= 2;
// the first listener still to call that is still attached, and those after it
export const nextListener = () => (h: EventsRecord, listeners: Listeners): { readonly lid: number | null; readonly rest: readonly number[] } => {
  let i = 0;
  for (const lid of h.toCall) {
    i++;
    if (listeners.has(lid) && h.listeners.includes(lid)) return { lid, rest: h.toCall.slice(i) };
  }
  return { lid: null, rest: [] };
};
// one that no variable holds is marked at its first sweep and released at the next (it may be a value the runtime
// has not assigned yet); a parked one was a value, so it is released at once
export const sweepVerdict = () => (held: boolean, parked: boolean, born: number | null, generation: number): Verdict =>
  held ? "spare" : parked ? "release" : born === null ? "mark" : born < generation ? "release" : "keep";
export const nextBorn = () => (v: Verdict, born: number | null, generation: number): number | null =>
  v === "mark" ? generation : v === "keep" ? born : null;

export const schedulePull = (wantsValues) => (handles: Handles, fx: Effects, hid: number): void => {
  const h = handles.get(hid);
  if (h === undefined || h.busy || !wantsValues(h)) return;
  handles.set(hid, { ...h, busy: true });
  fx.push({ fx: "frame", hid, epoch: h.epoch });
};
export const stopGenerator = () => (handles: Handles, fx: Effects, hid: number, h: EventsRecord): void => {
  if (h.hasGenerator) fx.push({ fx: "return", hid });
  handles.set(hid, { ...h, hasGenerator: false, args: null, epoch: h.epoch + 1, queue: [] });
};
export const queueValue = () => (handles: Handles, fx: Effects, hid: number, h: EventsRecord, v: unknown): void => {
  handles.set(hid, { ...h, queue: [...h.queue, v], draining: true });
  if (!h.draining) fx.push({ fx: "then", ev: { t: "deliver", hid } });
};
export const failGenerator = (isStaleResult) => (handles: Handles, fx: Effects, hid: number, epoch: number, error: unknown): void => {
  const h = handles.get(hid);
  if (h === undefined || isStaleResult(h, epoch)) return;
  fx.push({ fx: "fail", name: h.name, error });
  handles.set(hid, { ...h, done: true });
};
export const detachListener = () => (handles: Handles, listeners: Listeners, listenerAt: Keys, fx: Effects, lid: number): void => {
  const l = listeners.get(lid);
  if (l === undefined) return;
  const h = handles.get(l.hid);
  if (h !== undefined) handles.set(l.hid, { ...h, listeners: h.listeners.filter((x) => x !== lid), order: null });
  if (listenerAt.get(l.key) === lid) listenerAt.delete(l.key);
  listeners.delete(lid);
  fx.push({ fx: "forgetListener", lid });
};
export const releaseHandle = (stopGenerator, detachListener) => (handles: Handles, handleAt: Keys, listeners: Listeners, listenerAt: Keys, fx: Effects, hid: number): void => {
  const h = handles.get(hid);
  if (h === undefined) return;
  stopGenerator(handles, fx, hid, h);
  if (handleAt.get(h.key) === hid) handleAt.delete(h.key);
  for (const lid of h.listeners) detachListener(handles, listeners, listenerAt, fx, lid);
  handles.delete(hid);
  fx.push({ fx: "forgetHandle", hid });
};
// one listener call is one effect, so the next is decided after it ran; false when no listener is left for this value
export const callNextListener = (nextListener) => (handles: Handles, listeners: Listeners, fx: Effects, hid: number, h: EventsRecord): boolean => {
  const n = nextListener(h, listeners);
  const l = n.lid === null ? undefined : listeners.get(n.lid);
  if (n.lid === null || l === undefined) return false;
  handles.set(hid, { ...h, toCall: n.rest });
  fx.push({ fx: "call", lid: n.lid, value: h.current, cell: l.cell, events: h.name });
  fx.push({ fx: "then", ev: { t: "deliver", hid } });
  return true;
};
// the next queued value becomes current; true when its listeners are in order and can be called
export const startNextValue = (needsPlacing) => (handles: Handles, fx: Effects, placer: boolean, hid: number, h: EventsRecord): boolean => {
  if (!h.queue.length) {
    handles.set(hid, { ...h, toCall: [], draining: false, current: undefined });
    return false;
  }
  const next: EventsRecord = { ...h, current: h.queue[0], queue: h.queue.slice(1), toCall: [] };
  if (needsPlacing(next, placer)) {
    handles.set(hid, next);
    fx.push({ fx: "place", hid, lids: next.listeners });
    return false;
  }
  handles.set(hid, { ...next, toCall: next.order ?? next.listeners });
  return true;
};
export const deliver = (callNextListener, startNextValue) => (handles: Handles, listeners: Listeners, fx: Effects, placer: boolean, hid: number): void => {
  for (;;) {
    const h = handles.get(hid);
    if (h === undefined) return;
    // a listener call is pending, or no value is ready to deliver
    if (callNextListener(handles, listeners, fx, hid, h)) return;
    if (!startNextValue(handles, fx, placer, hid, h)) return;
  }
};

export const onOpen = (newEventsRecord) => (handles: Handles, handleAt: Keys, ev: OpenEvent): void => {
  handles.set(ev.hid, newEventsRecord(ev.key, ev.name));
  handleAt.set(ev.key, ev.hid);
};
// the same run again ends the listeners parked on it: their cells run again after it
export const onRun = (needsNewGenerator, stopGenerator, detachListener) => (handles: Handles, listeners: Listeners, listenerAt: Keys, fx: Effects, ev: RunEvent): void => {
  const h = handles.get(ev.hid);
  if (h === undefined) return;
  if (needsNewGenerator(h, ev.args, ev.make)) {
    stopGenerator(handles, fx, ev.hid, h);
    fx.push({ fx: "make", hid: ev.hid });
    return;
  }
  for (const lid of h.listeners) if (listeners.get(lid)?.parked === true) detachListener(handles, listeners, listenerAt, fx, lid);
  handles.set(ev.hid, { ...(handles.get(ev.hid) ?? h), pending: false });
};
export const onMade = (schedulePull) => (handles: Handles, fx: Effects, ev: RunEvent): void => {
  const h = handles.get(ev.hid);
  if (h === undefined) return;
  handles.set(ev.hid, { ...h, hasGenerator: true, args: ev.args, make: ev.make, done: false });
  schedulePull(handles, fx, ev.hid);
  handles.set(ev.hid, { ...(handles.get(ev.hid) ?? h), pending: false });
};
export const onEventsInvalidated = () => (handles: Handles, hid: number): void => {
  const h = handles.get(hid);
  if (h !== undefined) handles.set(hid, { ...h, pending: true });
};
// a listener cell's run attaches its listener and ends the one its last run attached
export const onListen = (newEventsRecord, detachListener, schedulePull) => (handles: Handles, listeners: Listeners, listenerAt: Keys, fx: Effects, ev: ListenEvent): void => {
  const old = listenerAt.get(ev.key);
  if (old === ev.lid) return;
  if (old !== undefined) detachListener(handles, listeners, listenerAt, fx, old);
  // a released handle: epoch -1, so a result its stopped generator still sends is stale
  const h: EventsRecord = handles.get(ev.hid) ?? { ...newEventsRecord("", ev.name), epoch: -1 };
  listeners.set(ev.lid, { hid: ev.hid, key: ev.key, cell: ev.cell, aid: ev.aid, parked: false, born: null });
  listenerAt.set(ev.key, ev.lid);
  handles.set(ev.hid, { ...h, listeners: h.listeners.includes(ev.lid) ? h.listeners : [...h.listeners, ev.lid], order: null });
  schedulePull(handles, fx, ev.hid);
};
export const onListenerInvalidated = (parksOnInvalidation, detachListener) => (handles: Handles, listeners: Listeners, listenerAt: Keys, fx: Effects, ev: ListenerInvalidated): void => {
  const l = listeners.get(ev.lid);
  if (listenerAt.get(ev.key) !== ev.lid || l === undefined) return;
  if (parksOnInvalidation(handles.get(ev.hid))) listeners.set(ev.lid, { ...l, parked: true });
  else detachListener(handles, listeners, listenerAt, fx, ev.lid);
};
// a pull of the next value, from a frame (sync) or right after the last value (async); a stale one asks for a pull
// of the current generator
export const onPull = (schedulePull, isStaleResult, wantsValues) => (handles: Handles, fx: Effects, hid: number, epoch: number): void => {
  const h = handles.get(hid);
  if (h === undefined) return;
  handles.set(hid, { ...h, busy: false });
  if (isStaleResult(h, epoch) || !wantsValues(h)) schedulePull(handles, fx, hid);
  else fx.push({ fx: "next", hid, epoch });
};
// a sync generator's value: the next pull waits for a frame
export const onGot = (queueValue) => (handles: Handles, fx: Effects, ev: Result): void => {
  const h = handles.get(ev.hid);
  if (h === undefined) return;
  if (ev.done) {
    handles.set(ev.hid, { ...h, done: true });
    return;
  }
  queueValue(handles, fx, ev.hid, h, ev.value);
  fx.push({ fx: "then", ev: { t: "schedule", hid: ev.hid } });
};
// an async generator's value: it is pulled again at once
export const onResolved = (schedulePull, isStaleResult, queueValue) => (handles: Handles, fx: Effects, ev: Result): void => {
  const h0 = handles.get(ev.hid);
  if (h0 === undefined) return;
  const h: EventsRecord = { ...h0, busy: false };
  handles.set(ev.hid, h);
  if (isStaleResult(h, ev.epoch)) schedulePull(handles, fx, ev.hid);
  else if (ev.done) handles.set(ev.hid, { ...h, done: true });
  else {
    queueValue(handles, fx, ev.hid, h, ev.value);
    fx.push({ fx: "then", ev: { t: "pull", hid: ev.hid, epoch: ev.epoch } });
  }
};
export const onAwaiting = () => (handles: Handles, hid: number): void => {
  const h = handles.get(hid);
  if (h !== undefined) handles.set(hid, { ...h, busy: true });
};
export const onRejected = (failGenerator) => (handles: Handles, fx: Effects, ev: Failure): void => {
  const h = handles.get(ev.hid);
  if (h !== undefined) handles.set(ev.hid, { ...h, busy: false });
  failGenerator(handles, fx, ev.hid, ev.epoch, ev.error);
};
// the host's order for this value; kept for later values only when every listener was placed
export const onPlaced = (deliver) => (handles: Handles, listeners: Listeners, fx: Effects, placer: boolean, ev: PlacedEvent): void => {
  const h = handles.get(ev.hid);
  if (h === undefined) return;
  handles.set(ev.hid, { ...h, toCall: ev.order, order: ev.complete ? ev.order : h.order });
  deliver(handles, listeners, fx, placer, ev.hid);
};
export const onPlaceFailed = () => (handles: Handles, hid: number): void => {
  const h = handles.get(hid);
  if (h !== undefined) handles.set(hid, { ...h, draining: false, toCall: [] });
};
// cells were added, moved or deleted, or the host changed: every order is worked out again before the next value
export const onOrderChanged = () => (handles: Handles, counters: Counters, placer: boolean): void => {
  counters.placer = placer;
  for (const [hid, h] of [...handles]) if (h.order !== null) handles.set(hid, { ...h, order: null });
};
// an action ends the listeners that give values to it
export const onReleaseAction = (detachListener) => (handles: Handles, listeners: Listeners, listenerAt: Keys, fx: Effects, aid: number): void => {
  for (const lid of [...listenerAt.values()]) if (listeners.get(lid)?.aid === aid) detachListener(handles, listeners, listenerAt, fx, lid);
};
// detaches listeners and stops generators that no live variable holds
export const onSweep = (sweepVerdict, nextBorn, detachListener, releaseHandle) => (handles: Handles, handleAt: Keys, listeners: Listeners, listenerAt: Keys, fx: Effects, counters: Counters, ev: SweepEvent): void => {
  counters.generation += 1;
  const g = counters.generation, heldListeners = new Set(ev.heldListeners), heldHandles = new Set(ev.heldHandles);
  for (const lid of [...listenerAt.values()]) {
    const l = listeners.get(lid);
    const v = sweepVerdict(heldListeners.has(lid), l?.parked === true, l?.born ?? null, g);
    if (l !== undefined) listeners.set(lid, { ...l, born: nextBorn(v, l.born, g) });
    if (v === "release") detachListener(handles, listeners, listenerAt, fx, lid);
  }
  for (const hid of [...handleAt.values()]) {
    const h = handles.get(hid);
    const v = sweepVerdict(heldHandles.has(hid), false, h?.born ?? null, g);
    if (h !== undefined) handles.set(hid, { ...h, born: nextBorn(v, h.born, g) });
    if (v === "release") releaseHandle(handles, handleAt, listeners, listenerAt, fx, hid);
  }
};

export const dispatch = (onOpen, onRun, onMade, onEventsInvalidated, onListen, onListenerInvalidated, onPull, onGot, onResolved, onAwaiting, failGenerator, onRejected, schedulePull, deliver, onPlaced, onPlaceFailed, onOrderChanged, detachListener, releaseHandle, onReleaseAction, onSweep) =>
  (handles: Handles, handleAt: Keys, listeners: Listeners, listenerAt: Keys, fx: Effects, counters: Counters, ev: DeliveryEvent): void => {
    switch (ev.t) {
      case "open": return onOpen(handles, handleAt, ev);
      case "run": return onRun(handles, listeners, listenerAt, fx, ev);
      case "made": return onMade(handles, fx, ev);
      case "eventsInvalidated": return onEventsInvalidated(handles, ev.hid);
      case "listen": return onListen(handles, listeners, listenerAt, fx, ev);
      case "listenerInvalidated": return onListenerInvalidated(handles, listeners, listenerAt, fx, ev);
      case "pull": return onPull(handles, fx, ev.hid, ev.epoch);
      case "got": return onGot(handles, fx, ev);
      case "resolved": return onResolved(handles, fx, ev);
      case "awaiting": return onAwaiting(handles, ev.hid);
      case "threw": return failGenerator(handles, fx, ev.hid, ev.epoch, ev.error);
      case "rejected": return onRejected(handles, fx, ev);
      case "schedule": return schedulePull(handles, fx, ev.hid);
      case "deliver": return deliver(handles, listeners, fx, counters.placer, ev.hid);
      case "placed": return onPlaced(handles, listeners, fx, counters.placer, ev);
      case "placeFailed": return onPlaceFailed(handles, ev.hid);
      case "orderChanged": return onOrderChanged(handles, counters, ev.placer);
      case "releaseListener": return detachListener(handles, listeners, listenerAt, fx, ev.lid);
      case "releaseEvents": return releaseHandle(handles, handleAt, listeners, listenerAt, fx, ev.hid);
      case "releaseAction": return onReleaseAction(handles, listeners, listenerAt, fx, ev.aid);
      case "sweep": return onSweep(handles, handleAt, listeners, listenerAt, fx, counters, ev);
    }
  };
// one event applied to working copies of the state; the copies are frozen into the next state
export const step = (dispatch) => (st: Delivery, ev: DeliveryEvent): StepResult => {
  const handles = new Map(st.handles), handleAt = new Map(st.handleAt);
  const listeners = new Map(st.listeners), listenerAt = new Map(st.listenerAt);
  const counters: Counters = { placer: st.placer, generation: st.generation };
  const fx: Effects = [];
  dispatch(handles, handleAt, listeners, listenerAt, fx, counters, ev);
  const state = { handles: handles, handleAt: handleAt, listeners: listeners, listenerAt: listenerAt, placer: counters.placer, generation: counters.generation };
  return { state, effects: fx };
};

export const handleAtKey = () => (st: Delivery, key: string): number | null => st.handleAt.get(key) ?? null;
export const sweepCandidates = () => (st: Delivery): { readonly lids: readonly number[]; readonly hids: readonly number[] } => ({ lids: [...st.listenerAt.values()], hids: [...st.handleAt.values()] });
export const liveEventsCount = () => (st: Delivery): number => st.handleAt.size;
// of: count only listeners on these handles
export const runningCount = () => (st: Delivery, of: readonly number[] | null): number =>
  of === null ? st.listenerAt.size : [...st.listenerAt.values()].filter((lid) => { const l = st.listeners.get(lid); return l !== undefined && of.includes(l.hid); }).length;
// events cells whose generator is being pulled: live, not finished, with a listener attached
export const pullingCount = (wantsValues) => (st: Delivery, of: readonly number[] | null): number =>
  [...st.handleAt.values()].filter((hid) => { const h = st.handles.get(hid); return h !== undefined && (of === null || of.includes(hid)) && wantsValues(h); }).length;
