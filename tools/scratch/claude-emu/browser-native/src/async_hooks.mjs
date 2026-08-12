// node:async_hooks — userland AsyncLocalStorage/AsyncResource.
//
// The browser has no async_hooks. We approximate context propagation by:
//  1. A single "current store map" keyed per-ALS-instance.
//  2. run()/enterWith() set it synchronously.
//  3. We patch Promise.prototype.then/catch/finally, queueMicrotask, and the
//     timer functions to CAPTURE the active context at scheduling time and
//     RESTORE it around the callback. This covers explicitly-chained promises
//     and scheduled work.
//
// Native `await` continuations bypass a monkeypatched `then`, so context set by
// enterWith() before an await MAY be lost after it. This is the residual risk
// the spike measures; getStore() then returns undefined and callers must cope.
import { register } from "./registry.mjs";

// active context: Map<ALSInstance, store>
let active = new Map();

function snapshot() { return new Map(active); }
function withContext(ctx, fn, thisArg, args) {
  const prev = active;
  active = ctx;
  try { return fn.apply(thisArg, args); }
  finally { active = prev; }
}

// ---- patch scheduling primitives to carry context ----
const _then = Promise.prototype.then;
Promise.prototype.then = function (onF, onR) {
  const ctx = snapshot();
  return _then.call(
    this,
    typeof onF === "function" ? function (v) { return withContext(ctx, onF, this, [v]); } : onF,
    typeof onR === "function" ? function (e) { return withContext(ctx, onR, this, [e]); } : onR
  );
};

const _qm = globalThis.queueMicrotask?.bind(globalThis);
if (_qm) globalThis.queueMicrotask = function (cb) { const ctx = snapshot(); return _qm(() => withContext(ctx, cb, undefined, [])); };

// Node's timers return a Timeout object with ref()/unref()/hasRef() and a
// Symbol.toPrimitive that yields the numeric id (so clearTimeout still works).
// Browser timers return a bare number, so we wrap them.
function timerHandle(id) {
  return { ref() { return this; }, unref() { return this; }, hasRef() { return true; }, refresh() { return this; }, close() { globalThis.clearTimeout(id); }, [Symbol.toPrimitive]() { return id; } };
}
const _st = globalThis.setTimeout.bind(globalThis);
globalThis.setTimeout = function (cb, ms, ...a) { const ctx = snapshot(); const id = typeof cb === "function" ? _st(() => withContext(ctx, cb, undefined, a), ms) : _st(cb, ms); return timerHandle(id); };

const _si = globalThis.setInterval.bind(globalThis);
globalThis.setInterval = function (cb, ms, ...a) { const ctx = snapshot(); const id = typeof cb === "function" ? _si(() => withContext(ctx, cb, undefined, a), ms) : _si(cb, ms); return timerHandle(id); };

const _sim = globalThis.setImmediate;
if (!_sim) globalThis.setImmediate = function (cb, ...a) { const ctx = snapshot(); const id = _st(() => withContext(ctx, cb, undefined, a), 0); return timerHandle(id); };

let _asyncId = 1;

export class AsyncLocalStorage {
  constructor() { this._sym = Symbol("als"); }
  getStore() { return active.get(this); }
  run(store, callback, ...args) {
    const ctx = new Map(active); ctx.set(this, store);
    return withContext(ctx, callback, undefined, args);
  }
  enterWith(store) { active.set(this, store); }
  exit(callback, ...args) {
    const ctx = new Map(active); ctx.delete(this);
    return withContext(ctx, callback, undefined, args);
  }
  disable() { active.delete(this); }
  static bind(fn) { const ctx = snapshot(); return (...a) => withContext(ctx, fn, this, a); }
  static snapshot() { const ctx = snapshot(); return (fn, ...a) => withContext(ctx, fn, undefined, a); }
}

export class AsyncResource {
  constructor(type) { this.type = type; this._ctx = snapshot(); this._aid = _asyncId++; }
  runInAsyncScope(fn, thisArg, ...args) { return withContext(this._ctx, fn, thisArg, args); }
  bind(fn) { const ctx = this._ctx; return (...a) => withContext(ctx, fn, this, a); }
  emitDestroy() { return this; }
  asyncId() { return this._aid; }
  triggerAsyncId() { return 0; }
  static bind(fn) { const ctx = snapshot(); return (...a) => withContext(ctx, fn, undefined, a); }
}

export function executionAsyncId() { return _asyncId; }
export function triggerAsyncId() { return 0; }
export function executionAsyncResource() { return {}; }
export function createHook() { return { enable() { return this; }, disable() { return this; } }; }

const mod = { AsyncLocalStorage, AsyncResource, executionAsyncId, triggerAsyncId, executionAsyncResource, createHook };
register("async_hooks", mod);
export default mod;
