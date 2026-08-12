// node:crypto shim: sync createHash (sha1/sha256), random helpers, HMAC.
import { register } from "./registry.mjs";
import { sha1, sha256, toBytes } from "./sha.mjs";

const ALGOS = { sha1, sha256, "sha-1": sha1, "sha-256": sha256 };

function encode(bytes, enc) {
  const B = globalThis.Buffer;
  if (!enc || enc === "buffer") return B ? B.from(bytes) : bytes;
  if (enc === "hex") return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (enc === "base64" || enc === "base64url") {
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    let s = btoa(bin);
    if (enc === "base64url") s = s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return s;
  }
  if (enc === "latin1" || enc === "binary") { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return s; }
  return B ? B.from(bytes).toString(enc) : bytes;
}

class Hash {
  constructor(algo) { this.fn = ALGOS[algo.toLowerCase()]; if (!this.fn) throw new Error("Digest method not supported: " + algo); this.chunks = []; }
  update(data, enc) { this.chunks.push(toBytes(data, enc)); return this; }
  digest(enc) {
    let total = 0; for (const c of this.chunks) total += c.length;
    const all = new Uint8Array(total); let o = 0; for (const c of this.chunks) { all.set(c, o); o += c.length; }
    return encode(this.fn(all), enc);
  }
}

class Hmac {
  constructor(algo, key) {
    this.fn = ALGOS[algo.toLowerCase()]; this.block = 64;
    let k = toBytes(key); if (k.length > this.block) k = this.fn(k);
    this.ipad = new Uint8Array(this.block); this.opad = new Uint8Array(this.block);
    for (let i = 0; i < this.block; i++) { const b = k[i] || 0; this.ipad[i] = b ^ 0x36; this.opad[i] = b ^ 0x5c; }
    this.chunks = [this.ipad];
  }
  update(data, enc) { this.chunks.push(toBytes(data, enc)); return this; }
  digest(enc) {
    let total = 0; for (const c of this.chunks) total += c.length;
    const all = new Uint8Array(total); let o = 0; for (const c of this.chunks) { all.set(c, o); o += c.length; }
    const inner = this.fn(all);
    const outer = new Uint8Array(this.block + inner.length); outer.set(this.opad); outer.set(inner, this.block);
    return encode(this.fn(outer), enc);
  }
}

export function createHash(algo) { return new Hash(algo); }
export function createHmac(algo, key) { return new Hmac(algo, key); }
export function randomBytes(n, cb) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  const B = globalThis.Buffer; const out = B ? B.from(a) : a;
  if (cb) { cb(null, out); return; } return out;
}
export function randomFillSync(buf) { crypto.getRandomValues(buf); return buf; }
export function randomUUID() { return crypto.randomUUID(); }
export function randomInt(min, max) { if (max === undefined) { max = min; min = 0; } return min + Math.floor(Math.random() * (max - min)); }
export function createPrivateKey() { throw new Error("createPrivateKey not supported in browser-native"); }
export function createPublicKey() { throw new Error("createPublicKey not supported"); }
export function createHash_ () {}
export function timingSafeEqual(a, b) { a = toBytes(a); b = toBytes(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i]; return r === 0; }
export function pbkdf2Sync() { throw new Error("pbkdf2 not supported"); }
export const webcrypto = globalThis.crypto;
export const constants = {};
export function getHashes() { return ["sha1", "sha256"]; }

const mod = { createHash, createHmac, randomBytes, randomFillSync, randomUUID, randomInt, createPrivateKey, createPublicKey, timingSafeEqual, pbkdf2Sync, webcrypto, constants, getHashes };
register("crypto", mod);
export default mod;
