// node:stream/consumers
import { register } from "./registry.mjs";

async function collect(stream) {
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader(); const chunks = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); }
    return chunks;
  }
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return chunks;
}
function concat(chunks) {
  if (chunks.every((c) => typeof c === "string")) return chunks.join("");
  const bufs = chunks.map((c) => (typeof c === "string" ? new TextEncoder().encode(c) : new Uint8Array(c.buffer || c)));
  let n = 0; for (const b of bufs) n += b.length; const out = new Uint8Array(n); let o = 0; for (const b of bufs) { out.set(b, o); o += b.length; } return out;
}
export async function text(stream) { const c = await collect(stream); const merged = concat(c); return typeof merged === "string" ? merged : new TextDecoder().decode(merged); }
export async function json(stream) { return JSON.parse(await text(stream)); }
export async function buffer(stream) { const c = await collect(stream); const m = concat(c); const B = globalThis.Buffer; return B ? B.from(typeof m === "string" ? new TextEncoder().encode(m) : m) : m; }
export async function arrayBuffer(stream) { return (await buffer(stream)).buffer; }
export async function blob(stream) { return new Blob([await arrayBuffer(stream)]); }

const mod = { text, json, buffer, arrayBuffer, blob };
register("stream/consumers", mod);
export default mod;
