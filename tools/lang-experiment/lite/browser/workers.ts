// Runs a compiled island: the erased module source, the island's cells in order, the inputs and refs
// as starting values. EXEC is plain JavaScript source so the same code runs on the main thread and,
// stringified into a classic blob worker, in the pool (a module worker fails to start on file://).
import { newPool, poolStep, answeredOf, type PoolState, type PoolEvent, type PoolEffect } from "../runtime-ss.ts";

export type Job = { key: string; js?: string; names: string[]; order: { name: string; params: string[] }[]; values: Record<string, unknown>; outputs: string[] };

export const EXEC = `(function () {
  const id = (v) => v;
  const refuse = (n) => () => { throw new Error(n + " cannot be used inside a compiled island"); };
  const snapshot = (v) => (ArrayBuffer.isView(v) && !(v instanceof DataView) ? v.slice() : structuredClone(v));
  const equals = (a, b) => {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (ArrayBuffer.isView(a)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false; return true; }
    if (a instanceof Map) { if (a.size !== b.size) return false; for (const [k, v] of a) if (!b.has(k) || !equals(v, b.get(k))) return false; return true; }
    if (a instanceof Set) { if (a.size !== b.size) return false; for (const v of a) if (!b.has(v)) return false; return true; }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !equals(a[k], b[k])) return false;
    return true;
  };
  const modules = new Map();
  return function run(job) {
    if (!modules.has(job.key)) {
      if (modules.size > 16) modules.clear();
      if (!job.js) throw Object.assign(new Error("island " + job.key + " was not sent"), { missing: true });
      const f = new Function("state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "h",
        '"use strict";\\n' + job.js + "\\nreturn {" + job.names.join(", ") + "};");
      modules.set(job.key, f(refuse("state"), refuse("action"), id, id, id, snapshot, equals, refuse("h")));
    }
    const fns = modules.get(job.key);
    const vals = Object.assign({}, job.values);
    for (const c of job.order) vals[c.name] = fns[c.name](...c.params.map((p) => vals[p]));
    const out = {};
    for (const o of job.outputs) out[o] = vals[o];
    return out;
  };
})()`;

export const runHere: (job: Job) => Record<string, unknown> = new Function(`return ${EXEC}`)();

// From here to the end, the pool: the add-on module @tomlarkworthy/soundscript-workers (ts-cells.ts WORKERS_ROOTS).

const WORKER = `const run = ${EXEC};
self.onmessage = (e) => {
  const { id, job } = e.data;
  try {
    const out = run(job);
    const transfer = [...new Set(Object.values(out).filter((v) => ArrayBuffer.isView(v)).map((v) => v.buffer))];
    self.postMessage({ id, out }, transfer);
  } catch (err) {
    if (err && err.missing) self.postMessage({ id, missing: true });
    else self.postMessage({ id, error: String((err && err.message) || err) });
  }
};`;

type Queued = { job: Job; owner: { dead: boolean }; resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void };

// answered: per worker, the jobs it has resolved
export type Pool = { readonly size: number; readonly answered: readonly number[]; run(job: Job, owner: { dead: boolean }): Promise<Record<string, unknown>> };

const superseded = () => Object.assign(new Error("superseded"), { name: "SupersededError" });

// A job whose owner (a compiled function) has been replaced is dropped from the queue with a
// SupersededError, so a slider drag does not leave stale work ahead of the current value; a job
// already sent to a worker runs to the end and resolves. Each slot remembers which islands it sent
// code for; a worker that has dropped one answers `missing` and the job is sent again with its code.
// Those decisions are poolStep's (pool.ss.ts); this holds the workers and the promises, posts and settles.
// makeWorker and step are the injection points for tests; pagePool uses the browser's Worker on a blob URL.
export function makePool(size: number, makeWorker: () => Worker, step = poolStep): Pool {
  const workers: Worker[] = [];
  const jobs = new Map<number, Queued>();
  let st: PoolState = newPool(size), qids = 0, out: unknown, thrown: unknown;
  const dead = () => [...jobs].filter(([, q]) => q.owner.dead).map(([qid]) => qid);
  const feed = (ev: PoolEvent) => {
    const r = step(st, ev);
    st = r.state;
    for (const e of r.effects) perform(e);
  };
  const perform = (e: PoolEffect) => {
    const q = jobs.get(e.qid)!;
    if (e.fx === "post") {
      try { workers[e.slot]!.postMessage({ id: e.id, job: e.withCode ? q.job : { ...q.job, js: undefined } }); } catch (err) {
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
    get answered() { return [...answeredOf(st)]; },
    run: (job, owner) => new Promise((resolve, reject) => {
      const qid = ++qids;
      jobs.set(qid, { job, owner, resolve, reject });
      feed({ t: "run", qid, key: job.key, hasCode: !!job.js, dead: dead() });
    }),
  };
}

// One pool per page.
let shared: Pool | null = null;
export function pagePool(): Pool {
  if (shared) return shared;
  const size = Math.max(1, Math.min(8, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
  const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
  return (shared = makePool(size, () => new Worker(url)));
}
