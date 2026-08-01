// Splice the annotate module + data blocks from working copies into the notebook HTML.
import { readFileSync, writeFileSync } from "node:fs";

const HTML = "lopebooks/notebooks/@tomlarkworthy_annotate.html";
const SRC = process.env.ANNOTATE_SRC ||
  "/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/02e6b42f-e62b-4023-b0c6-ec282ec9beb7/scratchpad/";

const blocks: [string, string, RegExp][] = [
  ["@tomlarkworthy/annotate", "annotate-module.js", /_a2hdr/],
  ["@tomlarkworthy/annotate-data", "annotate-data.js", /a2manifest/]
];

let html = readFileSync(HTML, "utf8");
for (const [id, file, guard] of blocks) {
  if (process.argv.includes("--module-only") && id.endsWith("-data")) continue;
  const body = readFileSync(SRC + file, "utf8").trim();
  if (/<\/script/i.test(body)) throw new Error(`${file} contains a closing script tag`);
  const re = new RegExp(`(<script[^>]*\\bid="${id.replace(/\//g, "\\/")}"[^>]*>)([\\s\\S]*?)(<\\/script>)`);
  const m = html.match(re);
  if (!m) throw new Error(`no block for ${id}`);
  if (!guard.test(m[2])) throw new Error(`block for ${id} does not look like the expected module`);
  html = html.replace(re, (_a, o, _b, c) => o + "\n" + body + "\n" + c);
  console.log(`spliced ${id} (${body.length} bytes)`);
}
writeFileSync(HTML, html);
