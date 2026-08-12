// Minimal node:events EventEmitter.
import { register } from "./registry.mjs";

export class EventEmitter {
  constructor() { this._e = Object.create(null); this._max = 10; }
  setMaxListeners(n) { this._max = n; return this; }
  getMaxListeners() { return this._max; }
  _add(type, fn, prepend) {
    (this._e[type] || (this._e[type] = []))[prepend ? "unshift" : "push"](fn);
    if (type !== "newListener") this.emit("newListener", type, fn);
    return this;
  }
  on(type, fn) { return this._add(type, fn, false); }
  addListener(type, fn) { return this._add(type, fn, false); }
  prependListener(type, fn) { return this._add(type, fn, true); }
  once(type, fn) { const g = (...a) => { this.off(type, g); return fn(...a); }; g.listener = fn; return this._add(type, g, false); }
  prependOnceListener(type, fn) { const g = (...a) => { this.off(type, g); return fn(...a); }; g.listener = fn; return this._add(type, g, true); }
  off(type, fn) {
    const l = this._e[type]; if (!l) return this;
    const i = l.findIndex((x) => x === fn || x.listener === fn);
    if (i >= 0) l.splice(i, 1);
    return this;
  }
  removeListener(type, fn) { return this.off(type, fn); }
  removeAllListeners(type) { if (type === undefined) this._e = Object.create(null); else delete this._e[type]; return this; }
  emit(type, ...args) {
    const l = this._e[type];
    if (!l || l.length === 0) {
      if (type === "error") throw args[0] instanceof Error ? args[0] : new Error("Unhandled error");
      return false;
    }
    for (const fn of l.slice()) { try { fn.apply(this, args); } catch (e) { console.error("[EventEmitter] listener threw", e); } }
    return true;
  }
  listeners(type) { return (this._e[type] || []).slice(); }
  rawListeners(type) { return (this._e[type] || []).slice(); }
  listenerCount(type) { return (this._e[type] || []).length; }
  eventNames() { return Object.keys(this._e); }
}
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.defaultMaxListeners = 10;
EventEmitter.once = function (emitter, name) {
  return new Promise((resolve, reject) => {
    const ok = (...a) => { emitter.off("error", err); resolve(a); };
    const err = (e) => { emitter.off(name, ok); reject(e); };
    emitter.once(name, ok); emitter.once("error", err);
  });
};
EventEmitter.on = function () { throw new Error("events.on async iterator not supported"); };

export const once = EventEmitter.once;
export function setMaxListeners(n, ...emitters) { for (const e of emitters) e.setMaxListeners && e.setMaxListeners(n); }
export function getEventListeners(e, name) { return e.listeners ? e.listeners(name) : []; }

const mod = EventEmitter;
mod.setMaxListeners = setMaxListeners;
mod.getEventListeners = getEventListeners;
register("events", mod);
export default mod;
