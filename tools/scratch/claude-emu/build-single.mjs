// Build the single self-contained claude-code-browser.html.
// Place this next to browser-native/ and claude-code-browser.template.html
// (i.e. in tools/scratch/claude-emu/), then: node build-single.mjs
//
//   browser-native/dist/*.js  (esbuild shim bundle)             -> {file:src} -> gzip -> base64
//   browser-native/package/cli.js (shebang neutralised: only change) -> gzip -> base64
//   importmap (node:* -> dist filename) verbatim from browser-native/index.html
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "browser-native");
const TEMPLATE = join(here, "claude-code-browser.template.html");
const OUT = join(here, "claude-code-browser.html");

const distDir = join(HARNESS, "dist");
const distFiles = {};
for (const f of readdirSync(distDir)) if (f.endsWith(".js")) distFiles[f] = readFileSync(join(distDir, f), "utf8");

const indexHtml = readFileSync(join(HARNESS, "index.html"), "utf8");
const imMatch = indexHtml.match(/<script type="importmap">\s*(\{[\s\S]*?\})\s*<\/script>/);
if (!imMatch) throw new Error("no importmap in index.html");
const importMap = {};
for (const [spec, path] of Object.entries(JSON.parse(imMatch[1]).imports)) importMap[spec] = path.replace(/^\/dist\//, "");

let cli = readFileSync(join(HARNESS, "package", "cli.js"), "utf8");
if (!cli.startsWith("#!")) throw new Error("cli.js has no shebang; refusing to guess");
cli = "//" + cli.slice(2);

const b64 = (buf) => buf.toString("base64");
const distB64 = b64(gzipSync(Buffer.from(JSON.stringify(distFiles)), { level: 9 }));
const cliB64 = b64(gzipSync(Buffer.from(cli), { level: 9 }));

let html = readFileSync(TEMPLATE, "utf8");
if (!html.includes("/*__IMPORT_MAP__*/")) throw new Error("template missing import-map marker");
html = html.replace("/*__IMPORT_MAP__*/", JSON.stringify(importMap))
           .replace("__DIST_GZ_B64__", distB64)
           .replace("__CLI_GZ_B64__", cliB64);
writeFileSync(OUT, html);

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log("wrote", OUT);
console.log("  dist files embedded :", Object.keys(distFiles).length);
console.log("  dist gz+b64         :", mb(distB64.length), "MB");
console.log("  cli  gz+b64         :", mb(cliB64.length), "MB");
console.log("  final HTML          :", mb(Buffer.byteLength(html)), "MB");
console.log("  final HTML gz est   :", mb(gzipSync(Buffer.from(html), { level: 9 }).length), "MB");
