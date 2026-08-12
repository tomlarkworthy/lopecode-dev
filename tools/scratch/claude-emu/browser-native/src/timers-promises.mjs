// node:timers/promises
import { register } from "./registry.mjs";

export function setTimeout(ms, value, opts) {
  return new Promise((resolve, reject) => {
    const id = globalThis.setTimeout(() => resolve(value), ms);
    if (opts && opts.signal) opts.signal.addEventListener("abort", () => { globalThis.clearTimeout(id); const e = new Error("The operation was aborted"); e.name = "AbortError"; reject(e); });
  });
}
export function setImmediate(value) { return new Promise((r) => globalThis.setTimeout(() => r(value), 0)); }
export async function* setInterval(ms, value) { while (true) { await setTimeout(ms); yield value; } }

const mod = { setTimeout, setImmediate, setInterval };
register("timers/promises", mod);
export default mod;
