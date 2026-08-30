#!/usr/bin/env bun
// Add a local file to a notebook as a module's file attachment.
//
//   bun tools/lope-add-attachment.ts <notebook.html> <@user/module> <file> [--name n] [--mime m]
//
// Writes the `<script type="text/plain" id="@user/module/name" data-mime=…
// data-encoding="base64">` block IMMEDIATELY BEFORE the module block that owns
// it. That placement is not cosmetic: under a real (rate-limited) stream a module
// hoisted ahead of its attachments boots before they have arrived and the cells
// that read them silently never render -- no console error, and it always passes
// from file:// because parsing finishes first. See
// tools/lope-fix-attachment-order.ts, which repairs the same ordering corpus-wide.
//
// This is half the job. The module's own loader prologue must also declare the
// name in its `fileAttachments` Map, or `export_notebook` drops the block on the
// next round trip -- the exporter enumerates attachments per module from that Map,
// not from the document.
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { findSpan } from "./lib/notebook-blocks.ts";

const [html, moduleId, file] = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d;
};
if (!html || !moduleId || !file) {
  console.error("usage: lope-add-attachment.ts <notebook.html> <@user/module> <file> [--name n] [--mime m]");
  process.exit(2);
}
const name = arg("--name", basename(file));
const MIME: Record<string, string> = {
  gz: "application/gzip", json: "application/json", css: "text/css", js: "application/javascript",
  png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", csv: "text/csv", txt: "text/plain",
};
const mime = arg("--mime", MIME[name.split(".").pop() ?? ""] ?? "application/octet-stream");

const src = readFileSync(html, "utf8");
const id = `${moduleId}/${name}`;
// findSpan, not `includes`/a regex: a module's own source can carry a literal
// `<script id="…">`, and matching one of those phantoms either skips the insert or
// splices the attachment INSIDE another block. See tools/lib/notebook-blocks.ts.
if (findSpan(src, id)) { console.log(`already present: ${id}`); process.exit(0); }

const span = findSpan(src, moduleId);
if (!span) { console.error(`module block not found: ${moduleId}`); process.exit(1); }
const at = span.start;

const bytes = readFileSync(file);
// `id` FIRST: that is the order exporter-3 writes, and lope-preflight's block
// scanner matches /<script\s+id="…"/ -- an attachment with id in second place is
// invisible to it and reports as missing while working perfectly in the browser.
const block = `<script id="${id}" type="text/plain" data-mime="${mime}" data-encoding="base64">` +
  bytes.toString("base64") + `</script>\n`;
writeFileSync(html, src.slice(0, at) + block + src.slice(at));
console.log(`inserted ${id}  ${(bytes.length / 1024).toFixed(0)} KB raw ` +
            `-> ${(block.length / 1024).toFixed(0)} KB base64, before the ${moduleId} block`);
console.log(`remember: "${name}" must also appear in that module's fileAttachments Map`);
