// Offline test of the lopefeed extractFiles + computeCid logic.
// Verifies that walking <script id data-mime> blocks and computing CIDs works.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import crypto from "node:crypto";

const _b32 = "abcdefghijklmnopqrstuvwxyz234567";
function encodeBase32(bytes) {
  let bits = 0, value = 0, out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += _b32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) out += _b32[(value << (5 - bits)) & 0x1f];
  return out;
}
function sha256(bytes) {
  return new Uint8Array(crypto.createHash("sha256").update(bytes).digest());
}
function computeCid(bytes) {
  const hash = sha256(bytes);
  const cid = new Uint8Array(4 + hash.length);
  cid[0] = 0x01; cid[1] = 0x55; cid[2] = 0x12; cid[3] = 0x20;
  cid.set(hash, 4);
  return "b" + encodeBase32(cid);
}
function decodeBase64(b64) {
  return new Uint8Array(Buffer.from(b64.replace(/\s+/g, ""), "base64"));
}

const path = process.argv[2] || "lopecode/notebooks/@tomlarkworthy_atproto-comments.html";
const html = readFileSync(path, "utf8");
const dom = new JSDOM(html);
const scripts = dom.window.document.querySelectorAll("script[data-mime][id]");

let total = 0, totalBytes = 0, byMime = {};
for (const el of scripts) {
  const id = el.getAttribute("id");
  const mime = el.getAttribute("data-mime");
  const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
  const body = el.textContent || "";
  const bytes = enc === "base64" ? decodeBase64(body) : new TextEncoder().encode(body);
  const cid = computeCid(bytes);
  total++;
  totalBytes += bytes.length;
  byMime[mime] = (byMime[mime] || 0) + 1;
  if (total <= 5) console.log(`  ${id} (${mime}, ${enc}, ${bytes.length}B) cid=${cid}`);
}
console.log(`---`);
console.log(`scripts: ${total}, total bytes: ${(totalBytes/1024).toFixed(1)}KB`);
console.log(`mimes:`, byMime);

// Check: is there a known CID we can reference? bafkreig... is the format.
// Verify deterministic: same bytes → same CID.
const test = new TextEncoder().encode("hello world");
const cid1 = computeCid(test);
const cid2 = computeCid(test);
console.log(`---`);
console.log(`'hello world' CID: ${cid1}`);
console.log(`deterministic: ${cid1 === cid2}`);
// Reference value (computed with known good lib): bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e
console.log(`expected:           bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e`);
console.log(`match: ${cid1 === "bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e"}`);
