// node:util shim.
import { register } from "./registry.mjs";

export function promisify(fn) {
  const p = function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, ...rest) => {
        if (err) reject(err);
        else resolve(rest.length > 1 ? rest : rest[0]);
      });
    });
  };
  if (fn[promisify.custom]) return fn[promisify.custom];
  return p;
}
promisify.custom = Symbol.for("nodejs.util.promisify.custom");

export function callbackify(fn) {
  return function (...args) {
    const cb = args.pop();
    fn.apply(this, args).then((v) => cb(null, v), (e) => cb(e));
  };
}

export function inspect(obj, opts) {
  try {
    if (typeof obj === "string") return obj;
    return JSON.stringify(obj, (k, v) => (typeof v === "bigint" ? v.toString() : typeof v === "function" ? "[Function]" : v), 2) ?? String(obj);
  } catch { return String(obj); }
}
inspect.custom = Symbol.for("nodejs.util.inspect.custom");
inspect.defaultOptions = {};

export function format(fmt, ...args) {
  if (typeof fmt !== "string") return [fmt, ...args].map((a) => (typeof a === "string" ? a : inspect(a))).join(" ");
  let i = 0;
  let out = fmt.replace(/%[sdifjoOc%]/g, (m) => {
    if (m === "%%") return "%";
    if (i >= args.length) return m;
    const a = args[i++];
    if (m === "%s") return typeof a === "string" ? a : inspect(a);
    if (m === "%d" || m === "%i") return String(parseInt(a));
    if (m === "%f") return String(parseFloat(a));
    if (m === "%j") return JSON.stringify(a);
    return inspect(a);
  });
  for (; i < args.length; i++) out += " " + (typeof args[i] === "string" ? args[i] : inspect(args[i]));
  return out;
}
export function formatWithOptions(opts, ...args) { return format(...args); }

export function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  // A stubbed builtin may export `undefined` where a base class is expected;
  // tolerate it instead of throwing (would abort the whole page).
  if (superCtor == null || superCtor.prototype == null) {
    try { console.warn("[util.inherits] undefined superCtor for " + (ctor && ctor.name)); } catch {}
    return;
  }
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

export function deprecate(fn) { return fn; }

const debugEnabled = false;
export function debuglog(section) { const f = () => {}; f.enabled = debugEnabled; return f; }

export function isDeepStrictEqual(a, b) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
}

export const types = {
  isPromise: (v) => v && typeof v.then === "function",
  isDate: (v) => v instanceof Date,
  isRegExp: (v) => v instanceof RegExp,
  isArrayBuffer: (v) => v instanceof ArrayBuffer,
  isTypedArray: (v) => ArrayBuffer.isView(v) && !(v instanceof DataView),
  isUint8Array: (v) => v instanceof Uint8Array,
  isMap: (v) => v instanceof Map,
  isSet: (v) => v instanceof Set,
  isProxy: () => false,
  isAsyncFunction: (v) => v && v.constructor && v.constructor.name === "AsyncFunction",
  isNativeError: (v) => v instanceof Error,
};

export const TextEncoder = globalThis.TextEncoder;
export const TextDecoder = globalThis.TextDecoder;

export function stripVTControlCharacters(s) { return String(s).replace(/\x1B\[[0-9;]*[A-Za-z]/g, ""); }
export function toUSVString(s) { return String(s); }
export function parseArgs() { throw new Error("util.parseArgs not supported"); }
export const _extend = Object.assign;

const mod = { promisify, callbackify, inspect, format, formatWithOptions, inherits, deprecate, debuglog, isDeepStrictEqual, types, TextEncoder, TextDecoder, stripVTControlCharacters, toUSVString, parseArgs, _extend };
register("util", mod);
export default mod;
