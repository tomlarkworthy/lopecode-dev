// Generic inert stub for optional/guarded builtins that cli.js may dynamically
// import (http2, worker_threads, inspector, bun:*, …). Exports a permissive
// Proxy as default and named, so property access yields no-op functions.
const noop = () => {};
const handler = {
  get(_t, prop) {
    if (prop === "default") return proxy;
    if (prop === Symbol.toPrimitive || prop === Symbol.iterator) return undefined;
    if (prop === "then") return undefined; // not a thenable
    return proxy;
  },
  apply() { return proxy; },
  construct() { return {}; },
};
const proxy = new Proxy(noop, handler);
export default proxy;
export const constants = {};
export const connect = noop;
export const createServer = noop;
export const lookup = (host, opts, cb) => { const c = typeof opts === "function" ? opts : cb; queueMicrotask(() => c && c(null, "127.0.0.1", 4)); };
export const pipeline = async (...args) => { const streams = args.filter((a) => a && typeof a.pipe === "function"); for (let i = 0; i < streams.length - 1; i++) streams[i].pipe(streams[i + 1]); };
export const setDefaultResultOrder = noop;
// v8
export const getHeapStatistics = () => ({ total_heap_size: 0, used_heap_size: 0, heap_size_limit: 2 * 1024 * 1024 * 1024 });
export const getHeapSpaceStatistics = () => [];
export const getHeapSnapshot = () => { throw new Error("v8.getHeapSnapshot unsupported in browser-native"); };
// vm (namespace-imported)
export class Script { constructor(code) { this.code = code; } runInContext() { throw new Error("vm unsupported"); } runInNewContext() { throw new Error("vm unsupported"); } runInThisContext() { throw new Error("vm unsupported"); } }
export const runInContext = () => { throw new Error("vm unsupported"); };
export const runInNewContext = () => { throw new Error("vm unsupported"); };
export const runInThisContext = () => { throw new Error("vm unsupported"); };
export const createContext = (o) => o || {};
export const isContext = () => false;
