// The decisions of the worker pool, as SoundScript cells: poolStep(state, event) returns the next PoolState and the
// effects to perform. browser/workers.ts holds the workers, the jobs and their promises, posts and settles as the
// effects say, and feeds back what happened. A job is a qid here; a message to a worker is an id. Under bun,
// runtime-ss.ts links these cells; in the notebook they are compiled cells of @tomlarkworthy/soundscript-workers.

// has: the island keys this worker was sent code for; current: the id it was last given; answered: jobs it resolved
export type SlotRec = { readonly busy: boolean; readonly has: readonly string[]; readonly current: number; readonly answered: number };
export type QRec = { readonly key: string; readonly hasCode: boolean; readonly resent: boolean };
// queue: qids not yet sent, in order; waiting: id -> qid of the jobs sent and not answered
export type PoolState = { readonly slots: readonly SlotRec[]; readonly queue: readonly number[]; readonly jobs: Map<number, QRec>; readonly waiting: Map<number, number>; readonly next: number };
// dead: the qids whose owner is dead now (the shell reads owner.dead when it feeds an event)
export type PoolEvent =
  | { readonly t: "run"; readonly qid: number; readonly key: string; readonly hasCode: boolean; readonly dead: readonly number[] }
  | { readonly t: "posted" | "postFailed"; readonly slot: number; readonly id: number; readonly resend: boolean; readonly dead: readonly number[] }
  | { readonly t: "message"; readonly slot: number; readonly id: number; readonly error: string | null; readonly missing: boolean; readonly dead: readonly number[] }
  | { readonly t: "workerError"; readonly slot: number; readonly message: string | null; readonly dead: readonly number[] };
// thrown: the error the failed post threw, which the shell holds
export type Why = { readonly k: "superseded" } | { readonly k: "thrown" } | { readonly k: "message"; readonly msg: string };
export type PoolEffect =
  | { readonly fx: "post"; readonly slot: number; readonly id: number; readonly qid: number; readonly withCode: boolean; readonly resend: boolean }
  | { readonly fx: "reject"; readonly qid: number; readonly why: Why }
  | { readonly fx: "resolve"; readonly qid: number };
export type PoolResult = { readonly state: PoolState; readonly effects: readonly PoolEffect[] };

export const newPool = () => (size: number): PoolState => ({
  slots: Array.from({ length: size }, () => ({ busy: false, has: [], current: -1, answered: 0 })), queue: [], jobs: new Map(), waiting: new Map(), next: 0,
});
// the slot at i replaced by f of it
export const withSlot = () => (slots: readonly SlotRec[], i: number, f: (s: SlotRec) => SlotRec): readonly SlotRec[] => slots.map((s, j) => (j === i ? f(s) : s));
export const addKey = () => (has: readonly string[], key: string): readonly string[] => (has.includes(key) ? has : [...has, key]);
// the queue's front jobs with a dead owner are dropped, up to the first live one
export const takeLive = () => (queue: readonly number[], dead: readonly number[]): { readonly dropped: readonly number[]; readonly qid: number | null; readonly rest: readonly number[] } => {
  const at = queue.findIndex((q) => !dead.includes(q));
  return at < 0 ? { dropped: queue, qid: null, rest: [] } : { dropped: queue.slice(0, at), qid: queue[at] ?? null, rest: queue.slice(at + 1) };
};
export const withoutJobs = () => (jobs: Map<number, QRec>, qids: readonly number[]): Map<number, QRec> => new Map([...jobs].filter(([q]) => !qids.includes(q)));

// one job to the first free slot, or nothing: a post waits for posted or postFailed, which pump again
export const pumpPool = (withSlot, takeLive, withoutJobs) => (st: PoolState, dead: readonly number[]): PoolResult => {
  const free = st.slots.findIndex((s) => !s.busy);
  if (free < 0) return { state: st, effects: [] };
  const t = takeLive(st.queue, dead);
  const rejects: readonly PoolEffect[] = t.dropped.map((qid) => ({ fx: "reject", qid, why: { k: "superseded" } }));
  const jobs = withoutJobs(st.jobs, t.dropped);
  const job = t.qid === null ? undefined : jobs.get(t.qid);
  if (t.qid === null || job === undefined) return { state: { ...st, queue: [], jobs }, effects: rejects };
  const id = st.next, slot = st.slots[free];
  const withCode = slot === undefined || !slot.has.includes(job.key);
  const next = { ...st, queue: t.rest, jobs, waiting: new Map([...st.waiting, [id, t.qid]]), next: id + 1, slots: withSlot(st.slots, free, (s) => ({ ...s, busy: true, current: id })) };
  return { state: next, effects: [...rejects, { fx: "post", slot: free, id, qid: t.qid, withCode, resend: false }] };
};
// a slot answered or failed: it is free and the job is settled with the effect given
export const settleSlot = (withSlot) => (st: PoolState, slot: number, id: number, qid: number, done: PoolEffect, answered: boolean): PoolState => {
  const waiting = new Map([...st.waiting].filter(([i]) => i !== id));
  const jobs = new Map([...st.jobs].filter(([q]) => q !== qid));
  return { ...st, waiting, jobs, slots: withSlot(st.slots, slot, (s) => ({ ...s, busy: false, answered: s.answered + (answered && done.fx === "resolve" ? 1 : 0) })) };
};
// then pump: the effects of the event first, then the pump's
export const andPump = (pumpPool) => (r: PoolResult, dead: readonly number[]): PoolResult => {
  const p = pumpPool(r.state, dead);
  return { state: p.state, effects: [...r.effects, ...p.effects] };
};

export const poolRun = () => (st: PoolState, ev: { readonly qid: number; readonly key: string; readonly hasCode: boolean }): PoolState => ({
  ...st, queue: [...st.queue, ev.qid], jobs: new Map([...st.jobs, [ev.qid, { key: ev.key, hasCode: ev.hasCode, resent: false }]]),
});
// posted: the worker now has the island's code; a resend does not pump, its slot stays busy
export const poolPosted = (withSlot, addKey) => (st: PoolState, slot: number, id: number): PoolState => {
  const qid = st.waiting.get(id);
  const job = qid === undefined ? undefined : st.jobs.get(qid);
  return job === undefined ? st : { ...st, slots: withSlot(st.slots, slot, (s) => ({ ...s, has: addKey(s.has, job.key) })) };
};
export const poolPostFailed = (settleSlot) => (st: PoolState, slot: number, id: number): PoolResult => {
  const qid = st.waiting.get(id);
  if (qid === undefined) return { state: st, effects: [] };
  const done: PoolEffect = { fx: "reject", qid, why: { k: "thrown" } };
  return { state: settleSlot(st, slot, id, qid, done, false), effects: [done] };
};
// missing: the worker dropped the island; sent again with its code once, if the job has code
export const poolMessage = (withSlot, settleSlot) => (st: PoolState, slot: number, id: number, error: string | null, missing: boolean): { readonly r: PoolResult; readonly pumps: boolean } => {
  const qid = st.waiting.get(id);
  const job = qid === undefined ? undefined : st.jobs.get(qid);
  if (qid === undefined || job === undefined) return { r: { state: st, effects: [] }, pumps: false };
  const slots = missing ? withSlot(st.slots, slot, (s) => ({ ...s, has: s.has.filter((k) => k !== job.key) })) : st.slots;
  if (missing && job.hasCode && !job.resent) {
    const jobs = new Map([...st.jobs, [qid, { ...job, resent: true }]]);
    return { r: { state: { ...st, slots, jobs }, effects: [{ fx: "post", slot, id, qid, withCode: true, resend: true }] }, pumps: false };
  }
  const msg = missing ? `island ${job.key} was not sent` : error;
  const done: PoolEffect = msg === null ? { fx: "resolve", qid } : { fx: "reject", qid, why: { k: "message", msg } };
  return { r: { state: settleSlot({ ...st, slots }, slot, id, qid, done, true), effects: [done] }, pumps: true };
};
// a worker error settles the job the slot was last given, if it still waits
export const poolWorkerError = (withSlot, settleSlot) => (st: PoolState, slot: number, message: string | null): PoolResult => {
  const s = st.slots[slot];
  const id = s === undefined ? -1 : s.current;
  const qid = st.waiting.get(id);
  if (qid === undefined) return { state: { ...st, waiting: new Map([...st.waiting].filter(([i]) => i !== id)), slots: withSlot(st.slots, slot, (x) => ({ ...x, busy: false })) }, effects: [] };
  const done: PoolEffect = { fx: "reject", qid, why: { k: "message", msg: `worker failed: ${message ?? "no message"}` } };
  return { state: settleSlot(st, slot, id, qid, done, false), effects: [done] };
};

export const poolStep = (pumpPool, andPump, poolRun, poolPosted, poolPostFailed, poolMessage, poolWorkerError) => (st: PoolState, ev: PoolEvent): PoolResult => {
  switch (ev.t) {
    case "run": return pumpPool(poolRun(st, ev), ev.dead);
    case "posted": { const posted = poolPosted(st, ev.slot, ev.id); return ev.resend ? { state: posted, effects: [] } : pumpPool(posted, ev.dead); }
    case "postFailed": return andPump(poolPostFailed(st, ev.slot, ev.id), ev.dead);
    case "message": { const m = poolMessage(st, ev.slot, ev.id, ev.error, ev.missing); return m.pumps ? andPump(m.r, ev.dead) : m.r; }
    case "workerError": return andPump(poolWorkerError(st, ev.slot, ev.message), ev.dead);
  }
};
export const answeredOf = () => (st: PoolState): readonly number[] => st.slots.map((s) => s.answered);
