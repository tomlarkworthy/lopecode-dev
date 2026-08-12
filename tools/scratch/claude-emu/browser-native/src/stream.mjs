// node:stream — minimal EventEmitter-based streams sufficient for light use.
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

class Stream extends EventEmitter {
  pipe(dest) {
    this.on("data", (c) => dest.write(c));
    this.on("end", () => dest.end && dest.end());
    return dest;
  }
}

export class Readable extends Stream {
  constructor(opts = {}) { super(); this._reading = false; this._buf = []; this._ended = false; if (opts.read) this._read = opts.read; this.readable = true; }
  _read() {}
  push(chunk) {
    if (chunk === null) { this._ended = true; queueMicrotask(() => this.emit("end")); return false; }
    this._buf.push(chunk); queueMicrotask(() => this.emit("data", chunk)); return true;
  }
  read() { return this._buf.shift() ?? null; }
  pause() { return this; } resume() { return this; }
  setEncoding() { return this; }
  destroy(err) { if (err) this.emit("error", err); this.emit("close"); return this; }
  [Symbol.asyncIterator]() {
    const self = this; const queue = []; let done = false; let resolveNext;
    self.on("data", (c) => { if (resolveNext) { resolveNext({ value: c, done: false }); resolveNext = null; } else queue.push(c); });
    self.on("end", () => { done = true; if (resolveNext) { resolveNext({ value: undefined, done: true }); resolveNext = null; } });
    return { next() { if (queue.length) return Promise.resolve({ value: queue.shift(), done: false }); if (done) return Promise.resolve({ value: undefined, done: true }); return new Promise((r) => (resolveNext = r)); } };
  }
  static from(iterable) { const r = new Readable(); (async () => { for await (const x of iterable) r.push(x); r.push(null); })(); return r; }
}

export class Writable extends Stream {
  constructor(opts = {}) { super(); if (opts.write) this._write = opts.write; this.writable = true; }
  _write(chunk, enc, cb) { cb && cb(); }
  write(chunk, enc, cb) { if (typeof enc === "function") { cb = enc; enc = undefined; } this._write(chunk, enc, cb || (() => {})); this.emit("data", chunk); return true; }
  end(chunk, enc, cb) { if (chunk != null && typeof chunk !== "function") this.write(chunk); const c = [chunk, enc, cb].find((x) => typeof x === "function"); this.emit("finish"); this.emit("end"); this.emit("close"); if (c) c(); return this; }
  destroy(err) { if (err) this.emit("error", err); this.emit("close"); return this; }
  cork() {} uncork() {} setDefaultEncoding() { return this; }
}

export class Duplex extends Readable {
  constructor(opts = {}) { super(opts); this.writable = true; if (opts.write) this._write = opts.write; }
  _write(chunk, enc, cb) { cb && cb(); }
  write(chunk, enc, cb) { if (typeof enc === "function") { cb = enc; } this._write(chunk, enc, cb || (() => {})); return true; }
  end(chunk) { if (chunk != null) this.write(chunk); this.push(null); this.emit("finish"); return this; }
  cork() {} uncork() {} setDefaultEncoding() { return this; }
}

export class Transform extends Duplex {
  constructor(opts = {}) { super(opts); if (opts.transform) this._transform = opts.transform; if (opts.flush) this._flush = opts.flush; }
  _transform(chunk, enc, cb) { cb(null, chunk); }
  write(chunk, enc, cb) { if (typeof enc === "function") { cb = enc; } this._transform(chunk, enc, (err, out) => { if (err) this.emit("error", err); else if (out != null) this.push(out); cb && cb(); }); return true; }
  end(chunk) { if (chunk != null) this.write(chunk); if (this._flush) this._flush(() => this.push(null)); else this.push(null); return this; }
}

export class PassThrough extends Transform {
  _transform(chunk, enc, cb) { cb(null, chunk); }
}

export function pipeline(...args) { const cb = typeof args[args.length - 1] === "function" ? args.pop() : null; for (let i = 0; i < args.length - 1; i++) args[i].pipe(args[i + 1]); if (cb) { const last = args[args.length - 1]; last.on("finish", () => cb(null)); last.on("end", () => cb(null)); last.on("error", cb); } return args[args.length - 1]; }
export function finished(stream, cb) { stream.on("end", () => cb(null)); stream.on("finish", () => cb(null)); stream.on("error", cb); }

export { Stream };
const mod = { Readable, Writable, Duplex, Transform, PassThrough, pipeline, finished, Stream };
mod.Stream = Stream;
register("stream", mod);
export default mod;
