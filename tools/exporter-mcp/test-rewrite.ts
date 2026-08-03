// Offline gate for the exporter-mcp rewriter: take every JS payload out of a notebook,
// rewrite it, and check the result actually compiles as a Function body.
// Usage: bun tools/exporter-mcp/test-rewrite.ts <notebook.html> [...]
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parse } from "./vendor/es-module-lexer-1.5.4.asm.js";
import { rewriteModule } from "./lope-esm-rewrite.js";

type Block = { id: string | null; mime?: string; enc?: string; body: string };

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
    const attr = (n: string) => startTag.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
    blocks.push({ id: attr("id") ?? null, mime: attr("data-mime"), enc: attr("data-encoding"), body: html.slice(tagEnd + 1, m.index) });
    cursor = closeEnd;
  }
  return blocks;
}

function decode(b: Block): string {
  const t = b.body.trim();
  if (b.enc === "base64+gzip") return gunzipSync(Buffer.from(t, "base64")).toString("utf8");
  if (b.enc === "base64") {
    const raw = Buffer.from(t, "base64");
    return (raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString("utf8");
  }
  // exporter escapes closing tags inside module source
  return b.body.replaceAll("<\\/scr\\ipt", "</scr\\ipt");
}

const isJs = (b: Block) =>
  b.mime === "application/javascript" || (b.id ?? "").endsWith(".js.gz") || (b.id ?? "").endsWith(".js");

let ok = 0;
const failures: string[] = [];
for (const path of process.argv.slice(2)) {
  const blocks = splitBlocks(readFileSync(path, "utf8"));
  for (const b of blocks.filter(isJs)) {
    if (b.id === "es-module-shims@2.6.2") continue; // dropped by exporter-mcp
    let src: string;
    try { src = decode(b); } catch (e: any) { failures.push(`${b.id}: decode — ${e.message}`); continue; }
    try {
      const { body, exports } = rewriteModule(src, parse);
      // compile exactly the way the linker will
      new Function("__lope", `"use strict";return (async()=>{\n${body}\n})()`);
      ok++;
      if (process.env.VERBOSE) console.log(`  ok ${b.id} -> [${exports.join(", ")}]`);
    } catch (e: any) {
      failures.push(`${b.id} (${(src.length / 1024) | 0}k): ${e.message?.split("\n")[0]}`);
    }
  }
}

console.log(`\n${ok} payloads rewrote + compiled, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
