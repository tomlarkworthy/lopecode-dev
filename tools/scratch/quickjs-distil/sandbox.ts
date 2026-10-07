// The code that runs inside QuickJS. Shared by the local spike and the Worker.
// Runs inside the sandbox before anything else. Only what the distiller touches.
export const PRELUDE = (native: boolean) => `
globalThis.window = globalThis;
globalThis.lopecode = { contentSync: (id) => ({ status: 200, mime: "text/javascript", bytes: __hostCall("content", id) }) };
globalThis.Blob = class Blob { constructor(parts) { this.__t = parts.map((p) => (p && p.__t != null ? p.__t : String(p))).join(""); } async text() { return this.__t; } };
${native ? `URL.createObjectURL = (b) => __hostCall("register", b.__t); URL.revokeObjectURL = () => {};` : `
// Names a Worker has and QuickJS does not. The distiller only needs them to exist: a cell that names one is
// copied to the Worker as text and runs there.
for (const n of ["Request", "Response", "Headers", "URLSearchParams", "AbortController", "WebSocket", "FormData", "File", "ReadableStream", "DecompressionStream", "CompressionStream", "TransformStream", "WritableStream"]) globalThis[n] = class { constructor() { throw new Error(n + " is not available while distilling"); } };
for (const n of ["fetch", "atob", "btoa", "structuredClone", "queueMicrotask"]) globalThis[n] = () => { throw new Error(n + " is not available while distilling"); };
globalThis.URL = class URL { constructor() { throw new Error("URL is not available while distilling"); } static createObjectURL(b) { return __hostCall("register", b.__t); } static revokeObjectURL() {} };
globalThis.console = { log: (...a) => __hostCall("log", a.map(String).join(" ")), error: (...a) => __hostCall("log", a.map(String).join(" ")), warn: () => {} };
globalThis.setImmediate = (f) => { Promise.resolve().then(f); };
globalThis.setTimeout = (f) => { Promise.resolve().then(f); return 0; };
globalThis.clearTimeout = () => {};
globalThis.TextEncoder = class TextEncoder { encode(s) { const o = []; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return new Uint8Array(o); } };
globalThis.TextDecoder = class TextDecoder { decode(b) { b = b instanceof Uint8Array ? b : new Uint8Array(b || []); let s = "", i = 0; while (i < b.length) { const c = b[i++]; let p = c; if (c >= 0xf0) p = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); else if (c >= 0xe0) p = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63); else if (c >= 0xc0) p = ((c & 31) << 6) | (b[i++] & 63); s += String.fromCodePoint(p); } return s; } };
globalThis.crypto = { subtle: { digest: async (alg, data) => { const b = new Uint8Array(data.buffer || data); let h = ""; for (let i = 0; i < b.length; i++) h += (b[i] < 16 ? "0" : "") + b[i].toString(16); const hex = __hostCall("sha256hex", h); const out = new Uint8Array(hex.length / 2); for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16); return out.buffer; } } };
`}
`;

export const MAIN = `
import { Runtime } from "observable-runtime";
export const distil = async (name, cell) => {
  const runtime = new Runtime({});
  runtime.fileAttachments = (find) => (n) => { const r = find(n); if (!r) throw new Error("no attachment " + n); return { url: async () => r.url, text: async () => __hostCall("blobText", r.url) }; };
  const define = (await import("/" + name + ".js?v=4")).default;
  let ok, bad; const got = new Promise((a, b) => { ok = a; bad = b; });
  const main = runtime.module(define, (n) => (n === cell ? { fulfilled: ok, rejected: bad } : undefined));
  runtime.mains = new Map([[name, main]]);
  const service = await got;
  const e = await service.emit();
  return JSON.stringify({ parts: e.parts, meta: e.meta, hash: e.hash, variables: runtime._variables.size });
};
`;

