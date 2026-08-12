// node:url shim.
import { register } from "./registry.mjs";

export const URL = globalThis.URL;
export const URLSearchParams = globalThis.URLSearchParams;

export function fileURLToPath(u) {
  const s = typeof u === "string" ? u : u.href;
  if (!s.startsWith("file://")) return s;
  let p = decodeURIComponent(s.slice("file://".length));
  if (p[0] !== "/") p = "/" + p.replace(/^[^/]*/, ""); // strip host
  return p.replace(/^\/([A-Za-z]:)/, "$1");
}
export function pathToFileURL(p) { return new URL("file://" + (p.startsWith("/") ? p : "/" + p)); }
export function format(u) { return typeof u === "string" ? u : (u.href || String(u)); }
export function parse(s) { try { const u = new URL(s); return u; } catch { return { href: s, pathname: s, path: s, search: "", query: "", hostname: "", protocol: "" }; } }
export function resolve(from, to) { try { return new URL(to, from).href; } catch { return to; } }
export function domainToASCII(d) { return d; }
export function domainToUnicode(d) { return d; }

const mod = { URL, URLSearchParams, fileURLToPath, pathToFileURL, format, parse, resolve, domainToASCII, domainToUnicode };
register("url", mod);
export default mod;
