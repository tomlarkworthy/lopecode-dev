// node:http — inert stub (SDK uses globalThis.fetch). request() emits an error.
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

export class Agent { constructor(o) { this.options = o || {}; } destroy() {} }
export class IncomingMessage extends EventEmitter { constructor() { super(); this.headers = {}; this.statusCode = 0; } }
export class ClientRequest extends EventEmitter {
  constructor() { super(); queueMicrotask(() => { const e = new Error("node:http.request unsupported in browser-native; use fetch"); e.code = "ECONNREFUSED"; this.emit("error", e); }); }
  write() { return true; } end() { return this; } abort() {} destroy() {} setHeader() {} getHeader() {} setTimeout() { return this; }
}
export class Server extends EventEmitter { listen(...a) { const cb = a.find((x) => typeof x === "function"); if (cb) queueMicrotask(cb); return this; } close(cb) { if (cb) queueMicrotask(cb); return this; } address() { return { port: 0 }; } ref() {} unref() {} }
export function request() { return new ClientRequest(); }
export function get() { return new ClientRequest(); }
export function createServer() { return new Server(); }
export const globalAgent = new Agent();
export const STATUS_CODES = { 200: "OK", 400: "Bad Request", 401: "Unauthorized", 404: "Not Found", 429: "Too Many Requests", 500: "Internal Server Error" };
export const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

const mod = { Agent, IncomingMessage, ClientRequest, Server, request, get, createServer, globalAgent, STATUS_CODES, METHODS };
register("http", mod);
export default mod;
