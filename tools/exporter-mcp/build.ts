// exporter-mcp prototype driver.
//
// Rewrites an exporter-3 lopecode HTML into the blob-free "MCP" serialization offline, so the
// design can be tested before any of it moves into a notebook module. Only three blocks change:
//
//   networking_script  ->  es-module-lexer + lope-esm-rewrite + lope-linker
//   main               ->  the same boot sequence with importShim = the linker
//   es-module-shims    ->  deleted
//
// Every module, file attachment and CSS block is copied byte-for-byte: exporter-mcp is a
// different *bootloader*, not a different content format.
//
// Usage: bun tools/exporter-mcp/build.ts <in.html> [out.html] [--csp]
//   --csp  emit a Content-Security-Policy meta that bans blob:/data: script URLs, i.e. a local
//          stand-in for the sandbox we are targeting. If the page boots with this on, the design
//          holds.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

type Block = { id: string | null; start: number; end: number; openEnd: number; text: string };

function splitBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  const closeRe = /<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = closeRe.exec(html))) {
    const closeEnd = m.index + m[0].length;
    const startIdx = html.indexOf("<script", cursor);
    if (startIdx === -1 || startIdx > m.index) { cursor = closeEnd; continue; }
    const tagEnd = html.indexOf(">", startIdx);
    const startTag = html.slice(startIdx, tagEnd + 1);
    blocks.push({
      id: startTag.match(/\sid="([^"]*)"/)?.[1] ?? null,
      start: startIdx,
      openEnd: tagEnd + 1,
      end: closeEnd,
      text: html.slice(startIdx, closeEnd),
    });
    cursor = closeEnd;
  }
  return blocks;
}

const [inPath, ...rest] = process.argv.slice(2);
if (!inPath) { console.error("usage: bun tools/exporter-mcp/build.ts <in.html> [out.html] [--csp]"); process.exit(1); }
const withSandbox = rest.includes("--sandbox");
const withCsp = rest.includes("--csp") || withSandbox;
const outPath = rest.find((a) => !a.startsWith("--")) ?? inPath.replace(/\.html$/, ".mcp.html");

const html = readFileSync(inPath, "utf8");
const blocks = splitBlocks(html);
const byId = new Map(blocks.filter((b) => b.id).map((b) => [b.id!, b] as const));

const mainBlock = byId.get("main");
const netBlock = byId.get("networking_script");
if (!mainBlock || !netBlock) throw new Error("not an exporter-3 notebook (no main / networking_script)");

// Boot inputs live in the original `main`: the CSS blocks to adopt, and the bootloader module.
const mainSrc = mainBlock.text;
const cssUrls = [...mainSrc.matchAll(/importShim\("([^"]+)",\s*\{\s*with:\s*\{\s*type:\s*'css'\s*\}\s*\}\)/g)].map((m) => m[1]);
const bootloader = mainSrc.match(/const \{default: define\} = await importShim\("([^"]+)"\)/)?.[1];
if (!bootloader) throw new Error("could not find the bootloader specifier in main");

// --- assemble the boot core ---
const lexer = readFileSync(resolve(HERE, "vendor/es-module-lexer-1.5.4.asm.js"), "utf8")
  .replace("export function parse", "function parse"); // minified: not at a line start
const rewriter = readFileSync(resolve(HERE, "lope-esm-rewrite.js"), "utf8")
  .replace(/^export function rewriteModule/m, "function rewriteModule");
const linker = readFileSync(resolve(HERE, "lope-linker.js"), "utf8");

const escape = (s: string) => s.replaceAll("</script", "<\\/script");

const bootCore = `<script id="networking_script">
// --- es-module-lexer 1.5.4 (asm.js build: no WebAssembly, no wasm-unsafe-eval) ---
${escape(lexer)}
window.__lopeParse = parse;
// --- ESM -> Function body rewriter ---
${escape(rewriter)}
window.__lopeRewrite = rewriteModule;
// --- linker ---
${escape(linker)}
</scr` + `ipt>`;

const newMain = `<script id="main">
(async () => {
  const imp = window.importShim;
  const sheets = [];
${cssUrls.map((u) => `  sheets.push((await imp(${JSON.stringify(u)}, { with: { type: 'css' } })).default);`).join("\n")}
  document.adoptedStyleSheets = sheets;

  const { Runtime } = await imp("@observablehq/runtime@6.0.0");
  const { Inspector } = await imp("@observablehq/inspector@5.0.1");
  const runtime = new Runtime({__ojs_runtime: () => runtime, __ojs_observer: () => observer});
  const observer = Inspector.into(document.body);
  const {default: define} = await imp(${JSON.stringify(bootloader)});
  runtime.bootloader = runtime.module(define, () => ({}));
})().catch((e) => console.error("boot error", e));
</scr` + `ipt>`;

// --- splice ---
// Emulates the constraint measured in a claudeusercontent.com artifact frame: createObjectURL
// hands back a `blob-request://` handle that nothing — fetch, import, <img src> — can read. Runs
// before the boot core so the linker wraps the crippled version, exactly as it would in the host.
const sandboxShim = `<script id="lope-sandbox-emulation">
(function () {
  var n = 0;
  URL.createObjectURL = function () { return "blob-request://" + (++n); };
  URL.revokeObjectURL = function () {};
})();
</scr` + `ipt>\n`;

const drop = new Set(["es-module-shims@2.6.2"]);
const edits: Array<{ start: number; end: number; text: string }> = [];
edits.push({ start: netBlock.start, end: netBlock.end, text: (withSandbox ? sandboxShim : "") + bootCore });
edits.push({ start: mainBlock.start, end: mainBlock.end, text: newMain });
for (const b of blocks) if (b.id && drop.has(b.id)) edits.push({ start: b.start, end: b.end, text: "" });
edits.sort((a, b) => a.start - b.start);

let out = "";
let cursor = 0;
for (const e of edits) {
  out += html.slice(cursor, e.start) + e.text;
  cursor = e.end;
}
out += html.slice(cursor);

if (withCsp) {
  // No blob:, no data: in script-src — only inline scripts and eval. This is the constraint the
  // whole design exists for, asserted locally so a regression cannot hide.
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: https: 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline' https:; img-src * data: blob:; connect-src *">`;
  out = out.replace("<head>", `<head>\n  ${csp}`);
}

writeFileSync(outPath, out);
const kb = (s: string) => `${Math.round(s.length / 1024)}k`;
console.log(`${inPath} (${kb(html)}) -> ${outPath} (${kb(out)})`);
console.log(`  css blocks adopted : ${cssUrls.length}`);
console.log(`  bootloader         : ${bootloader}`);
console.log(`  es-module-shims    : dropped (${kb(byId.get("es-module-shims@2.6.2")?.text ?? "")})`);
console.log(`  boot core          : ${kb(bootCore)} (lexer ${kb(lexer)} + rewriter ${kb(rewriter)} + linker ${kb(linker)})`);
console.log(`  csp lockdown       : ${withCsp ? "on (script-src 'unsafe-inline' 'unsafe-eval' only)" : "off"}`);
console.log(`  sandbox emulation  : ${withSandbox ? "on (createObjectURL returns an unreadable handle)" : "off"}`);
