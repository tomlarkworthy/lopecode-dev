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
      if (!job.js) throw new Error("island " + job.key + " was not sent");
      const f = new Function("ref", "action", "mut", "freeze", "borrow", "snapshot", "equals", "h",
        '"use strict";\\n' + job.js + "\\nreturn {" + job.names.join(", ") + "};");
      modules.set(job.key, f(refuse("ref"), refuse("action"), id, id, id, snapshot, equals, refuse("h")));
    }
    const fns = modules.get(job.key);
    const vals = Object.assign({}, job.values);
    for (const c of job.order) vals[c.name] = fns[c.name](...c.params.map((p) => vals[p]));
    const out = {};
    for (const o of job.outputs) out[o] = vals[o];
    return out;
  };
})()`;

const WORKER = `const run = ${EXEC};
self.onmessage = (e) => {
  const { id, job } = e.data;
  try {
    const out = run(job);
    const transfer = [...new Set(Object.values(out).filter((v) => ArrayBuffer.isView(v)).map((v) => v.buffer))];
    self.postMessage({ id, out }, transfer);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};`;

export const runHere: (job: Job) => Record<string, unknown> = new Function(`return ${EXEC}`)();

type Slot = { worker: Worker; busy: boolean; has: Set<string>; current: number };
type Queued = { job: Job; owner: { dead: boolean }; resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void };

export type Pool = { readonly size: number; run(job: Job, owner: { dead: boolean }): Promise<Record<string, unknown>> };

// One pool per page. A job whose owner (a compiled function) has been replaced is dropped from the
// queue, so a slider drag does not leave stale work ahead of the current value.
let shared: Pool | null = null;
export function pagePool(): Pool {
  if (shared) return shared;
  const size = Math.max(1, Math.min(8, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1));
  const url = URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" }));
  const slots: Slot[] = [];
  const queue: Queued[] = [];
  const waiting = new Map<number, Queued>();
  let next = 0;
  const pump = () => {
    for (const s of slots) {
      if (s.busy) continue;
      let q: Queued | undefined;
      while ((q = queue.shift()) && q.owner.dead) q.reject(new Error("superseded"));
      if (!q) return;
      const id = next++;
      s.busy = true;
      s.current = id;
      waiting.set(id, q);
      const job = s.has.has(q.job.key) ? { ...q.job, js: undefined } : q.job;
      s.has.add(q.job.key);
      s.worker.postMessage({ id, job });
    }
  };
  for (let i = 0; i < size; i++) {
    const slot: Slot = { worker: new Worker(url), busy: false, has: new Set(), current: -1 };
    slot.worker.onerror = (e: ErrorEvent) => {
      const q = waiting.get(slot.current);
      waiting.delete(slot.current);
      slot.busy = false;
      q?.reject(new Error(`worker failed: ${e.message ?? "no message"}`));
      pump();
    };
    slot.worker.onmessage = (e: MessageEvent) => {
      const q = waiting.get(e.data.id)!;
      waiting.delete(e.data.id);
      slot.busy = false;
      if (e.data.error) q.reject(new Error(e.data.error));
      else q.resolve(e.data.out);
      pump();
    };
    slots.push(slot);
  }
  shared = {
    size,
    run: (job, owner) => new Promise((resolve, reject) => { queue.push({ job, owner, resolve, reject }); pump(); }),
  };
  return shared;
}
