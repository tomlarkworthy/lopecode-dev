// Runs a compiled island: the erased module source, the island's cells in order, the inputs and refs
// as starting values. EXEC is plain JavaScript source so the same code runs on the main thread and,
// stringified into a classic blob worker, in the pool (a module worker fails to start on file://).
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

type Slot = { worker: Worker; busy: boolean; has: Set<string>; current: number; answered: number };
type Queued = { job: Job; owner: { dead: boolean }; resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void; resent?: boolean };

// answered: per worker, the jobs it has resolved
export type Pool = { readonly size: number; readonly answered: readonly number[]; run(job: Job, owner: { dead: boolean }): Promise<Record<string, unknown>> };

const superseded = () => Object.assign(new Error("superseded"), { name: "SupersededError" });

// A job whose owner (a compiled function) has been replaced is dropped from the queue with a
// SupersededError, so a slider drag does not leave stale work ahead of the current value; a job
// already sent to a worker runs to the end and resolves. Each slot remembers which islands it sent
// code for; a worker that has dropped one answers `missing` and the job is sent again with its code.
// makeWorker is the injection point for tests; pagePool uses the browser's Worker on a blob URL.
export function makePool(size: number, makeWorker: () => Worker): Pool {
  const slots: Slot[] = [];
  const queue: Queued[] = [];
  const waiting = new Map<number, Queued>();
  let next = 0;
  const send = (s: Slot, id: number, q: Queued, withCode: boolean) => {
    s.worker.postMessage({ id, job: withCode ? q.job : { ...q.job, js: undefined } });
    s.has.add(q.job.key);
  };
  const pump = () => {
    for (const s of slots) {
      while (!s.busy) {
        let q: Queued | undefined;
        while ((q = queue.shift()) && q.owner.dead) q.reject(superseded());
        if (!q) return;
        const id = next++;
        s.busy = true;
        s.current = id;
        waiting.set(id, q);
        try {
          send(s, id, q, !s.has.has(q.job.key));
        } catch (err) {
          waiting.delete(id);
          s.busy = false;
          q.reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
  };
  for (let i = 0; i < size; i++) {
    const slot: Slot = { worker: makeWorker(), busy: false, has: new Set(), current: -1, answered: 0 };
    slot.worker.onerror = (e: ErrorEvent) => {
      const q = waiting.get(slot.current);
      waiting.delete(slot.current);
      slot.busy = false;
      q?.reject(new Error(`worker failed: ${e.message ?? "no message"}`));
      pump();
    };
    slot.worker.onmessage = (e: MessageEvent) => {
      const { id, out, error, missing } = e.data;
      const q = waiting.get(id);
      if (!q) return;
      let failure: Error | null = error ? new Error(error) : null;
      if (missing) {
        slot.has.delete(q.job.key);
        failure = new Error(`island ${q.job.key} was not sent`);
        if (q.job.js && !q.resent) {
          q.resent = true;
          try { send(slot, id, q, true); return; } catch (err) { failure = err instanceof Error ? err : new Error(String(err)); }
        }
      }
      waiting.delete(id);
      slot.busy = false;
      if (failure) q.reject(failure);
      else { slot.answered++; q.resolve(out); }
      pump();
    };
    slots.push(slot);
  }
  return {
    size,
    get answered() { return slots.map((s) => s.answered); },
    run: (job, owner) => new Promise((resolve, reject) => { queue.push({ job, owner, resolve, reject }); pump(); }),
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
