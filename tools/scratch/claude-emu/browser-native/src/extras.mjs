// Builtins that cli.js only reaches via require() (not static import).
import { register } from "./registry.mjs";

function assert(v, msg) { if (!v) throw new Error(msg || "assertion failed"); }
assert.ok = assert;
assert.equal = (a, b, m) => { if (a != b) throw new Error(m || `${a} != ${b}`); };
assert.strictEqual = (a, b, m) => { if (a !== b) throw new Error(m || `${a} !== ${b}`); };
assert.deepEqual = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m || "deepEqual failed"); };
assert.deepStrictEqual = assert.deepEqual;
assert.notEqual = (a, b, m) => { if (a == b) throw new Error(m || "notEqual failed"); };
assert.fail = (m) => { throw new Error(m || "failed"); };
assert.throws = (fn) => { try { fn(); } catch { return; } throw new Error("Missing expected exception"); };
register("assert", assert);
register("assert/strict", assert);

register("constants", { O_RDONLY: 0, O_WRONLY: 1, O_RDWR: 2, O_CREAT: 64, O_EXCL: 128, O_TRUNC: 512, O_APPEND: 1024, S_IFMT: 61440, S_IFREG: 32768, S_IFDIR: 16384, EEXIST: 17, ENOENT: 2, EACCES: 13 });

const qs = {
  parse(s) { const o = {}; new URLSearchParams(s).forEach((v, k) => { o[k] = v; }); return o; },
  stringify(o) { const p = new URLSearchParams(); for (const k in o) p.append(k, o[k]); return p.toString(); },
  escape: encodeURIComponent, unescape: decodeURIComponent,
};
register("querystring", qs);

register("perf_hooks", {
  performance: globalThis.performance,
  PerformanceObserver: class { observe() {} disconnect() {} },
  monitorEventLoopDelay: () => ({ enable() {}, disable() {}, reset() {}, percentile() { return 0; }, mean: 0, max: 0, min: 0 }),
});

register("console", globalThis.console);
register("diagnostics_channel", { channel: () => ({ publish() {}, subscribe() {}, unsubscribe() {}, hasSubscribers: false }), hasSubscribers: () => false, subscribe() {}, unsubscribe() {} });

class StringDecoder {
  constructor(enc = "utf8") { this.dec = new TextDecoder(enc === "utf8" ? "utf-8" : enc); }
  write(buf) { return this.dec.decode(buf instanceof Uint8Array ? buf : new Uint8Array(buf), { stream: true }); }
  end(buf) { return buf ? this.write(buf) : ""; }
}
register("string_decoder", { StringDecoder });
