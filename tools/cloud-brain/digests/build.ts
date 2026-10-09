#!/usr/bin/env bun
/**
 * build.ts — a digest notebook from its seed.
 *
 *   bun tools/cloud-brain/digests/build.ts 2026-10-09 "Research digest, 9 October 2026"
 *
 * Reads digests/<day>.ojs (cells split by `// %%`), compiles it with the toolchain notebook's own
 * `compile` (through spec-notebook.ts) and writes digests/research-<day>.html: a copy of
 * quick_start.html whose blank-notebook block is the digest module, booting lopepage-2 and it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compiler, moduleSource, splitSeed } from "../../spec-notebook.ts";
import { blockSpans, findSpan } from "../../lib/notebook-blocks.ts";

const [day, title] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "") || !title) {
  console.error('usage: build.ts <YYYY-MM-DD> "<title>"');
  process.exit(2);
}
const here = import.meta.dir, HOST = "@tomlarkworthy/blank-notebook", name = `@digest/research-${day}`;
const cells = ["md`# " + title + "`", ...splitSeed(readFileSync(resolve(here, `${day}.ojs`), "utf8"))];

process.on("unhandledRejection", () => {});
const { compile, dispose } = await compiler();
const source = moduleSource(cells, compile);
dispose();

const block = (html: string, id: string, content: string, newId = id) => {
  const span = findSpan(html, id)!, raw = html.slice(span.start, span.end);
  const open = raw.slice(0, raw.indexOf(">") + 1).replace(`id="${id}"`, `id="${newId}"`);
  return html.slice(0, span.start) + open + content + "</script>" + html.slice(span.end);
};
let html = readFileSync(resolve(here, "../../../lopecode/notebooks/quick_start.html"), "utf8");
const before = blockSpans(html).length;
html = block(html, HOST, "\n" + source, name);
const conf = { mains: ["@tomlarkworthy/lopepage-2", name], hash: `#view=S100(${name})`, headless: true };
html = block(html, "bootconf.json", "\n" + JSON.stringify(conf, null, 2) + "\n");
html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`);
// Hugging Face answers 404 to a visit referred from a workers.dev address (measured 2026-10-09), so no link here sends one.
if (!html.includes('name="referrer"')) html = html.replace(/<title>/, `<meta name="referrer" content="no-referrer">\n<script>addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a && /^https?:$/.test(a.protocol) && a.origin !== location.origin) { a.target = "_blank"; a.rel = "noopener"; } }, true);</scr` + `ipt>\n<title>`);
// A digest opens for reading: editor-5 reads __attachMenu from this file and attaches editors when it is missing.
{
  const id = "@tomlarkworthy/editor-5/cell_options.json", span = findSpan(html, id);
  if (!span) throw new Error("no editor-5 cell_options.json block");
  const raw = html.slice(span.start, span.end), body = raw.slice(raw.indexOf(">") + 1, raw.lastIndexOf("</script>"));
  const opts = { ...JSON.parse(Buffer.from(body.trim(), "base64").toString("utf8")), __attachMenu: false };
  html = block(html, id, "\n" + Buffer.from(JSON.stringify(opts)).toString("base64") + "\n");
}
if (blockSpans(html).length !== before) throw new Error("a splice changed the number of blocks; nothing written");
const out = resolve(here, `research-${day}.html`);
writeFileSync(out, html);
console.log(JSON.stringify({ out, module: name, cells: cells.length, bytes: html.length }));
process.exit(0);
