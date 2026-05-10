#!/usr/bin/env bun
// Inject @lezer/lr and @lezer/highlight into observablehq-lezer module as
// FileAttachments so the notebook is local-first (no CDN fetch on load).
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const HTML  = "tools/scratch/observablehq-lezer.html";
const LRJS  = "tools/scratch/lezer-libs/lezer-lr-bundled.js";
const HLJS  = "tools/scratch/lezer-libs/lezer-highlight-bundled.js";

const html = readFileSync(HTML, "utf8");
const lrGz = gzipSync(readFileSync(LRJS));
const hlGz = gzipSync(readFileSync(HLJS));

// 1. rewrite _njiwcy (lr) and _11u4iwr (lezerhighlight) to load from FileAttachment
const oldLr =
  "const _njiwcy = async function _lr() {\n" +
  "    return await import('https://cdn.jsdelivr.net/npm/@lezer/lr@1.4.2/+esm');\n" +
  "};";
const newLr =
  "const _njiwcy = async function _lr(unzip, FileAttachment) {\n" +
  "    const blob = await unzip(FileAttachment('lezer-lr-bundled.js.gz'));\n" +
  "    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));\n" +
  "    try { return await import(objectURL); }\n" +
  "    finally { URL.revokeObjectURL(objectURL); }\n" +
  "};";

const oldHl =
  "const _11u4iwr = function _lezerhighlight() {\n" +
  "    return import('https://cdn.jsdelivr.net/npm/@lezer/highlight@1.2.1/+esm');\n" +
  "};";
const newHl =
  "const _11u4iwr = async function _lezerhighlight(unzip, FileAttachment) {\n" +
  "    const blob = await unzip(FileAttachment('lezer-highlight-bundled.js.gz'));\n" +
  "    const objectURL = URL.createObjectURL(new Blob([blob], { type: 'application/javascript' }));\n" +
  "    try { return await import(objectURL); }\n" +
  "    finally { URL.revokeObjectURL(objectURL); }\n" +
  "};";

// 2. Add an `unzip` cell right before the export default define.
// Anchor: tail of the lezer module's last cell (`_5`) immediately before `export default`,
// which is unique to this module's script block.
const oldExport =
  "const _usuk4 = function _5(md){return(\n" +
  "md`// TODO Lots\n" +
  "see https://github.com/codemirror/lang-javascript/blob/main/src/javascript.ts`\n" +
  ")};\n" +
  "\n" +
  "export default function define(runtime, observer) {\n" +
  "  const main = runtime.module();";
const newExport =
  "const _usuk4 = function _5(md){return(\n" +
  "md`// TODO Lots\n" +
  "see https://github.com/codemirror/lang-javascript/blob/main/src/javascript.ts`\n" +
  ")};\n" +
  "const _unzip_lezer = function _unzip(Response, DecompressionStream){return(\n" +
  "async (attachment) => {\n" +
  "  const response = await new Response(\n" +
  "    (await attachment.stream()).pipeThrough(new DecompressionStream(\"gzip\"))\n" +
  "  );\n" +
  "  return response.blob();\n" +
  "}\n" +
  ")};\n" +
  "\n" +
  "export default function define(runtime, observer) {\n" +
  "  const main = runtime.module();\n" +
  "  const fileAttachments = new Map([\"lezer-lr-bundled.js.gz\",\"lezer-highlight-bundled.js.gz\"].map((name) => {\n" +
  "    const module_name = \"@tomlarkworthy/observablehq-lezer\";\n" +
  "    const {status, mime, bytes} = window.lopecode.contentSync(module_name + \"/\" + encodeURIComponent(name));\n" +
  "    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));\n" +
  "    return [name, {url: blob_url, mimeType: mime}]\n" +
  "  }));\n" +
  "  main.builtin(\"FileAttachment\", runtime.fileAttachments(name => fileAttachments.get(name)));";

// 3. Update the $def lines for lr and lezerhighlight, add unzip
const oldDefs =
  '  $def("_njiwcy", "lr", [], _njiwcy);  \n' +
  '  $def("_11u4iwr", "lezerhighlight", [], _11u4iwr);  ';
const newDefs =
  '  $def("_njiwcy", "lr", ["unzip","FileAttachment"], _njiwcy);  \n' +
  '  $def("_11u4iwr", "lezerhighlight", ["unzip","FileAttachment"], _11u4iwr);  \n' +
  '  $def("_unzip_lezer", "unzip", ["Response","DecompressionStream"], _unzip_lezer);  ';

// All four replacements must apply exactly once.
function replaceOnce(src: string, oldS: string, newS: string, label: string): string {
  const idx = src.indexOf(oldS);
  if (idx < 0) throw new Error(`Could not find ${label}`);
  if (src.indexOf(oldS, idx + 1) >= 0) throw new Error(`Found ${label} more than once`);
  return src.slice(0, idx) + newS + src.slice(idx + oldS.length);
}

let out = html;
out = replaceOnce(out, oldLr,     newLr,     "old _lr cell");
out = replaceOnce(out, oldHl,     newHl,     "old _lezerhighlight cell");
out = replaceOnce(out, oldExport, newExport, "export default header");
out = replaceOnce(out, oldDefs,   newDefs,   "old $def block");

// 4. Inject the two .gz attachment blocks right after the lezer module's </script>.
// Anchor: the next attachment block immediately after.
const anchor = '</script>\n<script id="@tomlarkworthy/observablejs-toolchain/acorn-walk-8.3.2.js.gz"';
const idxAnchor = out.indexOf(anchor);
if (idxAnchor < 0) throw new Error("Anchor not found");
const insertion =
  '</script>\n' +
  `<script id="@tomlarkworthy/observablehq-lezer/lezer-lr-bundled.js.gz"\n` +
  '  type="text/plain"\n' +
  '  data-encoding="base64"\n' +
  '  data-mime="application/gzip"\n' +
  '>' + lrGz.toString("base64") + '</script>\n' +
  `<script id="@tomlarkworthy/observablehq-lezer/lezer-highlight-bundled.js.gz"\n` +
  '  type="text/plain"\n' +
  '  data-encoding="base64"\n' +
  '  data-mime="application/gzip"\n' +
  '>' + hlGz.toString("base64") + '</script>\n' +
  '<script id="@tomlarkworthy/observablejs-toolchain/acorn-walk-8.3.2.js.gz"';

out = out.slice(0, idxAnchor) + insertion + out.slice(idxAnchor + anchor.length);

writeFileSync(HTML, out);
console.log(`OK. before=${html.length}  after=${out.length}  delta=+${out.length - html.length}`);
console.log(`  lr.gz=${lrGz.length}  highlight.gz=${hlGz.length}`);
