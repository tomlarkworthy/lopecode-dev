// bun lite/notebook/build.ts [--force]
// Builds lite-cells-tutorial.html: bundles lite/browser/entry.ts, compiles tutorial.ojs with the
// toolchain notebook's own compile cell (tools/spec-notebook.ts), and puts the module and its
// attachments (lite.js.gz, examples/*) in place of blank-notebook in a copy of quick_start.html.
// Once built the HTML is the source of truth: --force overwrites it, edits made in the browser included.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compiler, moduleSource, splitSeed } from "../../../spec-notebook.ts";
import { blockContent, blockSpans, findSpan } from "../../../lib/notebook-blocks.ts";

// Booting the toolchain headless leaves rejections from imports it cannot resolve.
process.on("unhandledRejection", () => {});
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const NAME = "@tomlarkworthy/lite-cells-tutorial";
const HOST = "@tomlarkworthy/blank-notebook";
const BASE = join(ROOT, "lopecode/notebooks/quick_start.html");
const OUT = join(HERE, "lite-cells-tutorial.html");
if (existsSync(OUT) && !process.argv.includes("--force")) throw new Error(`${OUT} exists; pass --force to overwrite it`);

mkdirSync(join(HERE, "build"), { recursive: true });
const b = await Bun.build({ entrypoints: [join(HERE, "../browser/entry.ts")], target: "browser", format: "esm", minify: true });
if (!b.success) throw new Error(b.logs.join("\n"));
const js = await b.outputs[0].text();
if (/["']node:/.test(js)) throw new Error("bundle still refers to a node: module");
writeFileSync(join(HERE, "build/lite.js"), js);
const gz = Bun.gzipSync(new TextEncoder().encode(js), { level: 9 });

type File = { name: string; mime: string; base64: boolean; data: string };
const files: File[] = [{ name: "lite.js.gz", mime: "application/gzip", base64: true, data: Buffer.from(gz).toString("base64") }];
for (const f of readdirSync(join(HERE, "examples")).sort()) {
  const data = readFileSync(join(HERE, "examples", f), "utf8");
  if (/<\/script/i.test(data)) throw new Error(`${f} contains a closing script tag`);
  files.push({ name: f, mime: "text/plain", base64: false, data });
}

const { compile, dispose } = await compiler();
let source: string;
try {
  source = moduleSource(splitSeed(readFileSync(join(HERE, "tutorial.ojs"), "utf8")), compile);
} finally {
  dispose();
}
const prologue = `  const fileAttachments = new Map(${JSON.stringify(files.map((f) => f.name))}.map((name) => {
    const module_name = ${JSON.stringify(NAME)};
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
`;
const anchor = "  const main = runtime.module();\n";
if (!source.includes(anchor)) throw new Error("module source has no runtime.module() line");
source = source.replace(anchor, anchor + prologue);

let html = readFileSync(BASE, "utf8");
const before = blockSpans(html).map((s) => s.id);
const host = findSpan(html, HOST);
if (!host) throw new Error(`no ${HOST} block in ${BASE}`);
const attach = files.map((f) => `<script id="${NAME}/${encodeURIComponent(f.name)}" \n  type="text/plain"\n${f.base64 ? '  data-encoding="base64"\n' : ""}  data-mime="${f.mime}"\n>\n${f.data}</script>`).join("\n");
const mod = `<script id="${NAME}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${source}</script>`;
html = html.slice(0, host.start) + attach + "\n" + mod + html.slice(host.end);

const conf = JSON.parse(blockContent(html, "bootconf.json")!);
conf.mains = conf.mains.map((m: string) => (m === HOST ? NAME : m));
conf.hash = `#view=S100(${NAME})`;
conf.headless = true;
const cs = findSpan(html, "bootconf.json")!;
const raw = html.slice(cs.start, cs.end);
html = html.slice(0, cs.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(cs.end);
html = html.replace(/<title>[^<]*<\/title>/, "<title>SoundScript: Sound Dataflow Language</title>");

const after = new Set(blockSpans(html).map((s) => s.id));
const lost = before.filter((id) => id !== HOST && !after.has(id));
if (lost.length) throw new Error(`splice lost ${lost.join(", ")}`);
for (const f of files) if (!after.has(`${NAME}/${encodeURIComponent(f.name)}`)) throw new Error(`attachment ${f.name} is not a top-level block`);
writeFileSync(OUT, html);
console.log(JSON.stringify({ out: OUT, bytes: Buffer.byteLength(html), bundle: Buffer.byteLength(js), bundleGz: gz.length, files: files.map((f) => f.name), mains: conf.mains, hash: conf.hash }, null, 2));
process.exit(0);
