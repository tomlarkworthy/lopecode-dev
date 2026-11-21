// Prototype (2026-11-21): makePool of lite/browser/workers.ts as a shell over the cells of pool.ss.ts. It holds the
// workers and each job's promise, posts and settles as poolStep says, and feeds back what happened.
import * as poolCells from "./pool.ss.ts";
import type { PoolState, PoolEvent, PoolEffect } from "./pool.ss.ts";
import { link } from "../../lite/link.ts";
import { mut, freeze } from "../../lite/runtime-ss.ts";
import type { Job, Pool } from "../../lite/browser/workers.ts";

type Queued = { job: Job; owner: { dead: boolean }; resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void };
export const linkPool = (over: Partial<typeof poolCells> = {}) => link({ ...poolCells, ...over }, { mut, freeze });
const superseded = () => Object.assign(new Error("superseded"), { name: "SupersededError" });

export function makePool(size: number, makeWorker: () => Worker, S = linkPool()): Pool {
  const workers: Worker[] = [];
  const jobs = new Map<number, Queued>();
  let st: PoolState = S.newPool(size), qids = 0, out: unknown, thrown: unknown;
  const dead = () => [...jobs].filter(([, q]) => q.owner.dead).map(([qid]) => qid);
  const feed = (ev: PoolEvent) => {
    const r = S.poolStep(st, ev);
    st = r.state;
    for (const e of r.effects) perform(e);
  };
  const perform = (e: PoolEffect) => {
    const q = jobs.get(e.qid)!;
    if (e.fx === "post") {
      try { workers[e.slot].postMessage({ id: e.id, job: e.withCode ? q.job : { ...q.job, js: undefined } }); } catch (err) {
        thrown = err;
        return feed({ t: "postFailed", slot: e.slot, id: e.id, resend: e.resend, dead: dead() });
      }
      return feed({ t: "posted", slot: e.slot, id: e.id, resend: e.resend, dead: dead() });
    }
    jobs.delete(e.qid);
    if (e.fx === "resolve") return q.resolve(out as Record<string, unknown>);
    const w = e.why;
    q.reject(w.k === "superseded" ? superseded() : w.k === "message" ? new Error(w.msg) : thrown instanceof Error ? thrown : new Error(String(thrown)));
  };
  for (let i = 0; i < size; i++) {
    const worker = makeWorker();
    worker.onerror = (e: ErrorEvent) => feed({ t: "workerError", slot: i, message: e.message ?? null, dead: dead() });
    worker.onmessage = (e: MessageEvent) => {
      const { id, error, missing } = e.data;
      out = e.data.out;
      feed({ t: "message", slot: i, id, error: error ? String(error) : null, missing: !!missing, dead: dead() });
    };
    workers.push(worker);
  }
  return {
    size,
    get answered() { return [...S.answeredOf(st)]; },
    run: (job, owner) => new Promise((resolve, reject) => {
      const qid = ++qids;
      jobs.set(qid, { job, owner, resolve, reject });
      feed({ t: "run", qid, key: job.key, hasCode: !!job.js, dead: dead() });
    }),
  };
}
