/**
 * Builds lopebooks/notebooks/@tomlarkworthy_cloud-brain.html from the seeds in this directory.
 *   bun tools/cloud-brain/build.ts [--out path] [--token LOPE-…]
 * While the notebook is built from seeds, the seeds are the source and the HTML is regenerated.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { blockSpans, blockContent, findSpan } from "../lib/notebook-blocks.ts";
import { compiler, moduleSource, splitSeed } from "../spec-notebook.ts";
import { carryCells, patchSpec } from "./spec-patch.ts";

const ROOT = resolve(import.meta.dir, "../..");
const HERE = import.meta.dir;
const HOST = "@tomlarkworthy/blank-notebook";
const MODULES = [
  { name: "@tomlarkworthy/xrpc-client", seed: "xrpc-client.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-shell", seed: "brain-shell.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/cloudflare-iac-fixtures", seed: "cloudflare-iac-fixtures.ojs", main: false, files: {} },
  { name: "@tomlarkworthy/cloudflare-iac", seed: "cloudflare-iac.ojs", main: true, files: { "hono.js": "text/javascript", "cel.js": "text/javascript", "quickjs.js": "text/javascript", "observable-runtime.js": "text/javascript", "acorn.js": "text/javascript", "acorn-walk.js": "text/javascript", "quickjs.wasm.b64": "text/plain" } },
  { name: "@tomlarkworthy/brain-deployer", seed: "brain-deployer.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-core", seed: "brain-core.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-kernel", seed: "brain-kernel.ojs", main: true, files: { "atcute.js": "text/javascript" } },
  { name: "@tomlarkworthy/brain-proxy", seed: "brain-proxy.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-whatsapp", seed: "brain-whatsapp.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-bluesky", seed: "brain-bluesky.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-metrics", seed: "brain-metrics.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-static", seed: "brain-static.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-blob", seed: "brain-blob.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-library", seed: "brain-library.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-feed", seed: "brain-feed.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-browser", seed: "brain-browser.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-inbox", seed: "brain-inbox.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-logs", seed: "brain-logs.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/cloud-brain", seed: "cloud-brain.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/cloud-brain-docs", seed: "cloud-brain-docs.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-secrets", seed: "brain-secrets.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-db", seed: "brain-db.ojs", main: true, files: {} },
];
// What a Worker of a Brain owns: the deployer's two, and one per service. The shell is the notebook without these.
const OWNED = ["cloudflare-iac", "brain-deployer", "brain-core", "brain-kernel", "brain-proxy", "brain-whatsapp", "brain-bluesky", "brain-metrics", "brain-static", "brain-blob", "brain-library", "brain-feed", "brain-browser", "brain-inbox", "brain-logs", "cloud-brain", "brain-db"].map((n) => "@tomlarkworthy/" + n);
// The spec is built from a seed, and the cells a reviewer writes in the page (notes, the status) are carried over from
// the previous build. Before 2026-10-07 the module was @spec/cloud-brain and was carried whole.
const SPEC = {
  name: "@tomlarkworthy/cloud-brain-specs", seed: "cloud-brain-specs.ojs", was: "@spec/cloud-brain", first: "plan/specs/cloud-brain.html",
  keep: /^(annotation_|(viewof )?specStatus$)/, before: "readiness",
  // The 17 notes written up to 2026-10-07 were deleted on that date. A copy of the notebook from before then still
  // has them, so they are named here and never carried. A note written later is carried.
  drop: new RegExp("^annotation_(" + ["a23ahpyuxt", "a24xfwjh5b", "a25m73v31h", "a25rb6dkmz", "a2dbw0gqoq", "a2fv75k8nc", "a2h9xiljyh", "a2jt29zm5d", "a2k5w4ll7i", "a2lfiuj62x", "a2llvc93z9", "a2mw1jiv7f", "a2ol0gte11", "a2rpun2hls", "a2vs1omqg3", "a2ys8x7d28", "a2zdaxjzif"].join("|") + ")(_note)?$"),
  // Notes are anchored to these ids.
  pids: { readiness: "_spec_3_0", drawTools: "_spec_15_0", design: "_spec_46_0", handover: "_spec_54_0" } as Record<string, string>,
};
const DROP_MAINS = ["@tomlarkworthy/at-login", "@tomlarkworthy/at-write", "@tomlarkworthy/grid-container", "@tomlarkworthy/debugger-2"];

// The spec and the docs cite test cells by name and link modules with mod("name"). A name that no seed defines, or a
// module that is not a main of the notebook, stops the build.
{
  const seedText = (f: string) => readFileSync(resolve(HERE, f), "utf8");
  const tests = new Map(MODULES.map((m) => [m.name.split("/")[1], new Set([...seedText(m.seed).matchAll(/^(test_[A-Za-z0-9_]+) = /gm)].map((x) => x[1]))]));
  const all = new Set([...tests.values()].flatMap((t) => [...t]));
  const mains = new Set([...MODULES.filter((m) => m.main), SPEC].map((m) => m.name.split("/")[1]));
  const wrong: string[] = [];
  for (const f of [SPEC.seed, "cloud-brain-docs.ojs", "spec-as-built-short.md"]) {
    const text = seedText(f);
    const own = f.endsWith(".ojs") ? new Set([...text.matchAll(/^(test_[A-Za-z0-9_]+) = /gm)].map((x) => x[1])) : new Set<string>();
    // "module: test_a, test_b" must be in that module. A name with no module before it must be in a module.
    const inModule = new Set<number>();
    for (const m of text.matchAll(/\b([a-z][a-z0-9-]*): (test_[A-Za-z0-9_]+(?:, test_[A-Za-z0-9_]+)*)/g)) {
      if (!tests.has(m[1])) continue;
      let at = m.index! + m[1].length + 2;
      for (const name of m[2].split(", ")) {
        inModule.add(at);
        if (!tests.get(m[1])!.has(name)) wrong.push(`${f}: ${m[1]} has no cell ${name}`);
        at += name.length + 2;
      }
    }
    for (const m of text.matchAll(/\btest_[A-Za-z0-9_]+/g)) if (!inModule.has(m.index!) && !all.has(m[0]) && !own.has(m[0]) && !m[0].endsWith("_")) wrong.push(`${f}: no module has a cell ${m[0]}`);
    for (const m of text.matchAll(/\bmod\("([^"]+)"/g)) if (!mains.has(m[1])) wrong.push(`${f}: mod("${m[1]}") is not a main of the notebook`);
  }
  if (wrong.length) throw new Error("names that the spec or the docs cite and nothing defines:\n  " + [...new Set(wrong)].join("\n  "));
}

const arg = (k: string) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : undefined; };
const out = resolve(ROOT, arg("out") || "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html");
process.on("unhandledRejection", () => {});

const block = (id: string, mime: string, body: string) =>
  `<script id="${id}" \n  type="text/plain"\n  data-mime="${mime}"\n>\n${body}</script>`;

const { compile, dispose } = await compiler();
let html = readFileSync(resolve(ROOT, "lopebooks/notebooks/quick_start.html"), "utf8");
// A cell's id is its name, or a hash of its body when it has none. Numbered by position, removing one cell
// renumbered every later one, and the page, which matches by id first, redefined each cell under its
// neighbour's name: "test_bundleSplit_round_trips is defined more than once", put back 2026-10-06 09:27:07.
function stablePids(src: string, prefix: string): string {
  const ids = [...src.matchAll(/\$def\("(_spec_\d+_\d+)", (null|"[^"]*"),/g)];
  const used = new Set<string>();
  for (const [, id, name] of ids) {
    let stem: string;
    if (name !== "null") stem = JSON.parse(name).replace(/[^A-Za-z0-9]+/g, "_");
    else {
      const from = src.indexOf(`const ${id} = `);
      const ends = [src.indexOf("\nconst _", from + 1), src.indexOf("\nexport default", from + 1)].filter((i) => i > 0);
      const body = src.slice(from, Math.min(...ends)).replaceAll(id, "");
      stem = "anon_" + createHash("sha256").update(body).digest("hex").slice(0, 10);
    }
    let pid = prefix + stem;
    for (let n = 2; used.has(pid); n++) pid = prefix + stem + "_" + n;
    used.add(pid);
    src = src.replace(new RegExp(id + "(?!\\d)", "g"), pid);
  }
  if (/_spec_\d/.test(src)) throw new Error("a cell kept a positional id");
  return src;
}

const before = blockSpans(html).map((s) => s.id);
try {
  const pieces: string[] = [];
  for (const m of MODULES) {
    let src = moduleSource(splitSeed(readFileSync(resolve(HERE, m.seed), "utf8")), compile);
    const names = Object.keys(m.files);
    if (names.length) {
      // Attachments first, then a loader map: the exporter keeps only attachments the module registers.
      for (const f of names) {
        const text = readFileSync(resolve(HERE, f), "utf8");
        if (/<\/script/i.test(text)) throw new Error(`${f} contains a closing script tag`);
        pieces.push(block(`${m.name}/${encodeURIComponent(f)}`, m.files[f as keyof typeof m.files], text));
      }
      const prologue = [
        `  const fileAttachments = new Map(${JSON.stringify(names)}.map((name) => {`,
        `    const module_name = ${JSON.stringify(m.name)};`,
        `    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));`,
        `    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));`,
        `    return [name, {url: blob_url, mimeType: mime}]`,
        `  }));`,
        `  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));`,
      ].join("\n");
      src = src.replace("  const main = runtime.module();\n", "  const main = runtime.module();\n" + prologue + "\n");
    }
    src = stablePids(src, "_" + m.name.split("/")[1].replace(/[^a-z0-9]/g, "") + "_");
    pieces.push(block(m.name, "application/javascript", src));
  }
  {
    const prefix = "_cloudbrainspecs_";
    let src = stablePids(moduleSource(splitSeed(readFileSync(resolve(HERE, SPEC.seed), "utf8")), compile), prefix);
    for (const [name, pid] of Object.entries(SPEC.pids)) src = src.replace(new RegExp(prefix + name + "(?![A-Za-z0-9_])", "g"), pid);
    const prev = existsSync(out) ? readFileSync(out, "utf8") : "";
    const sources: [string, string | null][] = [
      [`the previous build's ${SPEC.name}`, prev ? blockContent(prev, SPEC.name) : null],
      [`the previous build's ${SPEC.was}`, prev ? blockContent(prev, SPEC.was) : null],
      [SPEC.first, blockContent(readFileSync(resolve(ROOT, SPEC.first), "utf8"), SPEC.was)],
    ];
    const [where, from] = sources.find(([, text]) => text)!;
    console.error(`${SPEC.name}: notes and status carried from ${where}`);
    pieces.push(block(SPEC.name, "application/javascript", patchSpec(carryCells(src, from!, SPEC))));
  }
  const span = findSpan(html, HOST)!;
  html = html.slice(0, span.start) + pieces.join("\n") + html.slice(span.end);
} finally {
  dispose();
}

// The assistant's instructions page, before the wiki module so the module finds it at boot.
{
  const id = "@tomlarkworthy/markdown-wiki/running-a-cloud-brain.md";
  const text = readFileSync(resolve(HERE, "running-a-cloud-brain.md"), "utf8");
  if (/<\/script/i.test(text)) throw new Error("the wiki page contains a closing script tag");
  const had = findSpan(html, id);
  if (had) html = html.slice(0, had.start) + html.slice(had.end);
  const wiki = findSpan(html, "@tomlarkworthy/markdown-wiki")!;
  html = html.slice(0, wiki.start) + block(id, "text/markdown", text) + "\n" + html.slice(wiki.start);
}

const conf = JSON.parse(blockContent(html, "bootconf.json")!);
const mains = [...MODULES.filter((m) => m.main).map((m) => m.name), SPEC.name];
conf.mains = (conf.mains as string[]).filter((m) => !DROP_MAINS.includes(m)).flatMap((m) => (m === HOST ? mains : [m]));
if (!conf.mains.includes("@tomlarkworthy/tests")) conf.mains.push("@tomlarkworthy/tests");
conf.hash = "#view=C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs),S30(@tomlarkworthy/claude-code-pairing))";
const bc = findSpan(html, "bootconf.json")!;
const raw = html.slice(bc.start, bc.end);
html = html.slice(0, bc.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(bc.end);
html = html.replace(/<title>[^<]*<\/title>/, "<title>Cloud Brain</title>");

const now = new Set(blockSpans(html).map((s) => s.id));
const lost = before.filter((id) => id !== HOST && !now.has(id));
if (lost.length) throw new Error(`splice swallowed ${lost.join(", ")}; nothing written`);
// Editing is off when the page opens; the burger menu turns it on. editor-5 reads this from its options file.
{
  const re = /(<script id="@tomlarkworthy\/editor-5\/cell_options\.json"[^>]*>)([\s\S]*?)(<\/script>)/;
  const m = re.exec(html);
  if (!m) throw new Error("no editor-5 cell_options.json block");
  const opts = { ...JSON.parse(Buffer.from(m[2].trim(), "base64").toString() || "{}"), __attachMenu: false };
  html = html.replace(re, (_, open, __, close) => open + Buffer.from(JSON.stringify(opts)).toString("base64") + close);
}
writeFileSync(out, html);

// The shell: the same file without the modules a Brain's Workers serve. Made with the notebook's own shellOf.
{
  const { importNotebookModule } = await import("../notebook-import.ts");
  const tmp = resolve(HERE, ".emitted/brain-shell.module.js");
  writeFileSync(tmp, blockContent(html, "@tomlarkworthy/brain-shell")!);
  const shell = await importNotebookModule(tmp, { overrides: { location: { protocol: "file:", hostname: "" } } });
  const shellOf = await shell.value("shellOf");
  const text = shellOf(html, OWNED);
  writeFileSync(resolve(HERE, ".emitted/shell.html"), text);
  console.error(`shell: ${text.length} bytes without ${OWNED.length} modules`);
}
const token = arg("token");
console.log(JSON.stringify({ out, bytes: html.length, mains: conf.mains }, null, 1));
console.log(`file://${encodeURI(out)}${conf.hash}${token ? "&cc=" + token : ""}`);
process.exit(0);
