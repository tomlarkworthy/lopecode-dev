// node:net — inert stub (fetch handles all networking on the -p path).
import { register } from "./registry.mjs";
import { EventEmitter } from "./events.mjs";

export class Socket extends EventEmitter {
  connect() { queueMicrotask(() => { const e = new Error("net.Socket unsupported in browser-native"); e.code = "ECONNREFUSED"; this.emit("error", e); }); return this; }
  write() { return false; } end() { return this; } destroy() { return this; }
  settimeout() { return this; } setNoDelay() { return this; } setKeepAlive() { return this; } ref() { return this; } unref() { return this; }
}
export class Server extends EventEmitter {
  listen(...a) { const cb = a.find((x) => typeof x === "function"); if (cb) queueMicrotask(cb); return this; }
  close(cb) { if (cb) queueMicrotask(cb); return this; } address() { return { port: 0, address: "127.0.0.1", family: "IPv4" }; } ref() { return this; } unref() { return this; }
}
export class BlockList { addAddress() {} addRange() {} addSubnet() {} check() { return false; } }
export function connect() { return new Socket(); }
export function createConnection() { return new Socket(); }
export function createServer() { return new Server(); }
export function isIP(s) { if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return 4; if (s && s.includes(":")) return 6; return 0; }
export function isIPv4(s) { return isIP(s) === 4; }
export function isIPv6(s) { return isIP(s) === 6; }

const mod = { Socket, Server, BlockList, connect, createConnection, createServer, isIP, isIPv4, isIPv6 };
register("net", mod);
export default mod;
