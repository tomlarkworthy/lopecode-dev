// Build lopebooks/notebooks/Caged_Code.html: a lopecode NOTEBOOK that runs
// the real Claude Code cli.js v2.1.112 browser-native as a FULL INTERACTIVE TUI in
// an xterm.js terminal, with cli.js's filesystem backed by the notebook's own modules
// (robocoop-5 VFS via __HOSTFS -> __RC5FS).
//
// Wraps the interactive harness (browser-native/) as an Observable module inside the
// linux-claude donor notebook (which already boots lopepage-2 + claude-code-pairing).
//
// Payload construction mirrors build-single.mjs / the -p build so bytes match what works:
//   browser-native/dist/*.js  -> {file:src} JSON -> gzip -> base64   (shims.js.gz)
//   browser-native/package/cli.js (shebang neutralised) -> gzip -> b64 (cli.js.gz)
//   browser-native/vendor-xterm xterm.js/xterm.css/addon-fit.js -> gzip -> b64 (3 atts)
//   importmap (node:* -> dist filename) derived from browser-native/index.html
//
// The interactive+rc5 cell body lives in ./interactive-cell.js (node --check-able).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { execSync } from "node:child_process";

const here = "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu";
const HARNESS = here + "/browser-native";
const CELL_SRC = here + "/interactive-cell.js";
const DONOR = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/linux-claude.html";
const OUT = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";

const MODULE_ID = "@tomlarkworthy/claude-code-browser";

// ---- refresh dist from the (interactive-aware) shim sources ------------------
execSync("node build.mjs", { cwd: HARNESS, stdio: "inherit" });

// ---- payloads ---------------------------------------------------------------
const distDir = HARNESS + "/dist";
const distFiles = {};
for (const f of readdirSync(distDir)) if (f.endsWith(".js")) distFiles[f] = readFileSync(distDir + "/" + f, "utf8");

const indexHtml = readFileSync(HARNESS + "/index.html", "utf8");
const imMatch = indexHtml.match(/<script type="importmap">\s*(\{[\s\S]*?\})\s*<\/script>/);
if (!imMatch) throw new Error("no importmap in index.html");
const importMap = {};
for (const [spec, path] of Object.entries(JSON.parse(imMatch[1]).imports)) importMap[spec] = path.replace(/^\/dist\//, "");

// ---- robocoop-5 + the knowledge wiki, imported as MODULES ---------------------
// The session prompt and wiki index are cells of these modules, read at runtime. Copying
// their text into an attachment would fork it from the canonical source, so the modules
// themselves come across: closure computed with lope-reader --compute-imports, minus what
// this notebook already carries. `@user/other` is excluded — it is not a module, it is
// example code inside the prompt STRING that the import scanner picks up.
const RC5_SRC = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html";
const IMPORT_MODULES = [
  "@tomlarkworthy/markdown-wiki",
  "@tomlarkworthy/robocoop-5",
  "@tomlarkworthy/robocoop-5-context",
  "@tomlarkworthy/robocoop-5-core",
  "@tomlarkworthy/robocoop-5-engine",
  "@tomlarkworthy/robocoop-5-srctools",
  "@tomlarkworthy/robocoop-5-tools",
];
// Annotate and the two modules it needs that this notebook does not already carry
// (closure is 28 modules, 24 of them already here). Its own canonical notebook is the
// donor. d/57d79353bac56631 is already present unversioned, which is the same block.
const PAGE_TITLE = "Caged Code";
const ANNOTATE_SRC = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_annotate.html";
const ANNOTATE_MODULES = [
  "@tomlarkworthy/annotate",
  "@tomlarkworthy/editable-md",
  "@tomlarkworthy/prosemirror",
];

let cli = readFileSync(HARNESS + "/package/cli.js", "utf8");
if (!cli.startsWith("#!")) throw new Error("cli.js has no shebang; refusing to guess");
cli = "//" + cli.slice(2); // ONLY change to cli.js: 2-byte shebang neutralisation

const xtermJs = readFileSync(HARNESS + "/vendor-xterm/xterm/lib/xterm.js", "utf8");
const xtermCss = readFileSync(HARNESS + "/vendor-xterm/xterm/css/xterm.css", "utf8");
const addonFit = readFileSync(HARNESS + "/vendor-xterm/fit/lib/addon-fit.js", "utf8");

const b64 = (buf) => buf.toString("base64");
const gz = (s) => b64(gzipSync(Buffer.from(s), { level: 9 }));
const distB64 = b64(gzipSync(Buffer.from(JSON.stringify(distFiles)), { level: 9 }));
const cliB64 = gz(cli);
const xtermJsB64 = gz(xtermJs);
const xtermCssB64 = gz(xtermCss);
const addonFitB64 = gz(addonFit);

// ---- the app cell (interactive + rc5), with the importmap baked in ----------
let cellSrc = readFileSync(CELL_SRC, "utf8");
if (!cellSrc.includes("/*__IMPORT_MAP__*/")) throw new Error("cell source missing /*__IMPORT_MAP__*/ placeholder");
if (cellSrc.includes("</scr" + "ipt>")) throw new Error("cell source contains a literal close-script token");
// No key is baked in: a blank key routes to the rate-limited demo gateway.
const APP_CELL = cellSrc.split("/*__IMPORT_MAP__*/").join(JSON.stringify(importMap)).trimEnd();

// ---- engine import wiring (bring rc5 engines in as cell deps) ----------------
// Match the compiled import format other modules in the donor use.
const ENGINE_MODULES = [
  "@tomlarkworthy/runtime-sdk",
  "@tomlarkworthy/module-map",
  "@tomlarkworthy/fileattachments",
  "@tomlarkworthy/exporter-3",
  "@tomlarkworthy/file-sync",
];
const ENGINE_BINDINGS = [
  ["runtime", "@tomlarkworthy/runtime-sdk"],
  ["importShim", "@tomlarkworthy/runtime-sdk"],
  ["createModule", "@tomlarkworthy/runtime-sdk"],
  ["currentModules", "@tomlarkworthy/module-map"],
  ["all_module_files", "@tomlarkworthy/fileattachments"],
  ["exportModuleJS", "@tomlarkworthy/exporter-3"],
  ["jbApply", "@tomlarkworthy/file-sync"],
  ["probeDefine", "@tomlarkworthy/file-sync"],
];
const loaderLines = ENGINE_MODULES.map(
  (m) => `  main.define("module ${m}", async () => runtime.module((await import("/${m}.js?v=4")).default));`
).join("\n");
const bindingLines = ENGINE_BINDINGS.map(
  ([name, m]) => `  main.define(${JSON.stringify(name)}, ["module ${m}", "@variable"], (_, v) => v.import(${JSON.stringify(name)}, _));`
).join("\n");

// The app cell's real deps (all_module_files is wired above but the cell does not
// block its terminal mount on it; the 8 below are what _claudeCodeBrowser consumes).
const APP_DEPS = ["FileAttachment", "runtime", "importShim", "createModule", "currentModules", "exportModuleJS", "jbApply", "probeDefine"];

const ATTACHMENTS = ["cli.js.gz", "shims.js.gz", "xterm.js.gz", "xterm.css.gz", "addon-fit.js.gz"];

const MODULE_BLOCK = `<script id="${MODULE_ID}"
  type="text/plain"
  data-mime="application/javascript"
>
const _cb_title = function _cb_title(md){return(
md\`# Caged Code\`
)};

const _cb_app = ${APP_CELL};

const _cb_about = function _cb_about(md){return(
md\`The vanilla Claude Code binary hosted in a webpage, hardwired to a notebook environment.
This is not endorsed by Anthropic in any way. Use your existing Anthropic account through /login
with token copying, or use OpenRouter API endpoints. Defaults to our OpenRouter demo endpoint,
restricted to MiMo models only.\`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  const fileAttachments = new Map(${JSON.stringify(ATTACHMENTS)}.map((name) => {
    const module_name = "${MODULE_ID}";
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));

  // Definition order IS render order, and module-map takes the module's title from the
  // h1 of the lowest-id cell — so the title cell must come first, then the terminal, then
  // the blurb, all ahead of the import cells. Observable resolves by name, so ordering
  // these costs nothing.
  $def("_cb_title", "cb_title", ["md"], _cb_title);
  $def("_cb_app", "claude_code_browser", ${JSON.stringify(APP_DEPS)}, _cb_app);
  $def("_cb_about", "cb_about", ["md"], _cb_about);

${loaderLines}
${bindingLines}
  return main;
}</script>`;

const attBlock = (name, b64body) => `<script id="${MODULE_ID}/${name}"
  type="text/plain"
  data-encoding="base64"
  data-mime="application/gzip"
>${b64body}</script>`;

const rc5Data = readFileSync(RC5_SRC);
function blocksOf(buf) {
  const out = [];
  const open = Buffer.from("<script"), close = Buffer.from("</script>");
  let i = 0;
  while (true) {
    const st = buf.indexOf(open, i); if (st < 0) break;
    const gt = buf.indexOf(0x3e, st); if (gt < 0) break;
    const e = buf.indexOf(close, gt); if (e < 0) break;
    const end = e + close.length;
    const m = buf.slice(st, gt + 1).toString("latin1").match(/id="([^"]*)"/);
    out.push({ start: st, end, id: m ? m[1] : null });
    i = end;
  }
  return out;
}
// Each donor is the canonical notebook for the modules taken from it — copying a module
// out of whatever file happens to have a copy is how a corpus drifts.
const annData = readFileSync(ANNOTATE_SRC);
function copyModules(buf, ids, label) {
  const want = new Set(ids);
  const blocks = blocksOf(buf).filter((x) => x.id && (want.has(x.id) || ids.some((m) => x.id.startsWith(m + "/"))));
  const got = new Set(blocks.map((x) => x.id));
  for (const m of ids) if (!got.has(m)) throw new Error("module block not found in " + label + ": " + m);
  return { text: blocks.map((x) => buf.slice(x.start, x.end).toString("utf8")).join("\n") + "\n", ids: [...got] };
}
const rc5Copy = copyModules(rc5Data, IMPORT_MODULES, "robocoop-5 notebook");
const annCopy = copyModules(annData, ANNOTATE_MODULES, "annotate notebook");
const IMPORTED_BLOCKS = rc5Copy.text + annCopy.text;
const copied = [...rc5Copy.ids, ...annCopy.ids];

const NEW_BLOCKS =
  attBlock("cli.js.gz", cliB64) + "\n" +
  attBlock("shims.js.gz", distB64) + "\n" +
  attBlock("xterm.js.gz", xtermJsB64) + "\n" +
  attBlock("xterm.css.gz", xtermCssB64) + "\n" +
  attBlock("addon-fit.js.gz", addonFitB64) + "\n" +
  IMPORTED_BLOCKS +
  MODULE_BLOCK + "\n";

// ---- byte-accurate surgery on the donor ------------------------------------
let data = readFileSync(DONOR); // Buffer

function scanBlocks(buf) {
  const blocks = [];
  let i = 0;
  const open = Buffer.from("<script");
  const close = Buffer.from("</script>");
  while (true) {
    const s = buf.indexOf(open, i);
    if (s < 0) break;
    const gt = buf.indexOf(0x3e /* > */, s);
    if (gt < 0) break;
    const e = buf.indexOf(close, gt);
    if (e < 0) break;
    const end = e + close.length;
    const opening = buf.slice(s, gt + 1).toString("latin1");
    const m = opening.match(/id="([^"]*)"/);
    blocks.push({ start: s, end, id: m ? m[1] : null });
    i = end;
  }
  return blocks;
}

// --payloads: swap the payload attachments inside the EXISTING output and stop.
// A full rebuild regenerates the file from the donor, which discards the prerender
// snapshot a save-in-place put there. When only the shims/cli/xterm bytes changed,
// patch those blocks and leave every other byte of the published file alone.
// It covers this module and its payloads — the app cell included — which is everything
// this build owns. Anything else (a donor module, the layout) still needs a full build.
if (process.argv.includes("--payloads")) {
  const cur = readFileSync(OUT);
  const want = new Map([
    [MODULE_ID, MODULE_BLOCK],
    [MODULE_ID + "/cli.js.gz", attBlock("cli.js.gz", cliB64)],
    [MODULE_ID + "/shims.js.gz", attBlock("shims.js.gz", distB64)],
    [MODULE_ID + "/xterm.js.gz", attBlock("xterm.js.gz", xtermJsB64)],
    [MODULE_ID + "/xterm.css.gz", attBlock("xterm.css.gz", xtermCssB64)],
    [MODULE_ID + "/addon-fit.js.gz", attBlock("addon-fit.js.gz", addonFitB64)],
  ]);
  const found = scanBlocks(cur).filter((b) => want.has(b.id));
  const missing = [...want.keys()].filter((id) => !found.some((b) => b.id === id));
  if (missing.length) throw new Error("block(s) not in " + OUT + ": " + missing.join(", "));
  let patched = cur;
  for (const b of found.sort((x, y) => y.start - x.start)) {
    patched = Buffer.concat([patched.slice(0, b.start), Buffer.from(want.get(b.id), "utf8"), patched.slice(b.end)]);
  }
  writeFileSync(OUT, patched);
  console.log("patched in place:", OUT, "(" + found.length + " blocks,", ((patched.length - cur.length) / 1024).toFixed(1) + " KB delta)");
  process.exit(0);
}

const blocks = scanBlocks(data);
const byId = (id) => blocks.find((b) => b.id === id);

const boot = byId("bootconf.json");
if (!boot) throw new Error("bootconf.json block not found");

// Anything the user authored in the notebook exists only in the output file — this build
// regenerates that file from the donor, and once dropped a saved blog post that way.
// Carry every @user/… block across, keep the layout that referenced it, and never carry
// a pairing token: export bakes the live tab's cc= into the hash.
const BASE_MAINS = ["@tomlarkworthy/lopepage-2", "@tomlarkworthy/save-in-place", "@tomlarkworthy/claude-code-browser", "@tomlarkworthy/claude-code-pairing", "@tomlarkworthy/annotate"];
let carriedBlocks = "", carriedMains = [], carriedHash = null;
try {
  const prev = readFileSync(OUT);
  const prevBlocks = scanBlocks(prev);
  const mine = prevBlocks.filter((b) => b.id && b.id.startsWith("@user/"));
  carriedBlocks = mine.map((b) => prev.slice(b.start, b.end).toString("utf8")).join("\n");
  carriedMains = mine.map((b) => b.id).filter((id) => id.split("/").length === 2);
  // The layout and any extra mains are the user's, not the build's: a save-in-place records
  // which panes are open, and regenerating from the donor would silently revert that.
  const pb = prevBlocks.filter((b) => b.id === "bootconf.json").pop();
  if (pb) {
    const body = prev.slice(pb.start, pb.end).toString("utf8");
    const h = (body.match(/"hash"\s*:\s*"([^"]*)"/) || [])[1];
    if (h) carriedHash = h.replace(/&?cc=[A-Za-z0-9-]+/g, "").replace(/#&/, "#");
    const prevMains = JSON.parse((body.match(/"mains"\s*:\s*(\[[^\]]*\])/) || [, "[]"])[1]);
    for (const id of prevMains) if (!BASE_MAINS.includes(id) && !carriedMains.includes(id)) carriedMains.push(id);
  }
  if (mine.length) console.log("  carried from previous:", mine.map((b) => b.id).join(", "));
} catch {}

const MAINS = BASE_MAINS.concat(carriedMains);
const HASH = carriedHash || "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
const NEW_BOOTCONF = `<script id="bootconf.json"
        type="text/plain"
        data-mime="application/json"
>
{
  "mains": ${JSON.stringify(MAINS)},
  "hash": "${HASH}",
  "headless": true,
  "prerender": true
}</script>`;

// splice out the linux-emu module + its 6 attachments (contiguous span).
const linuxIds = [
  "@tomlarkworthy/linux-emu/riscvemu64-wasm.wasm",
  "@tomlarkworthy/linux-emu/riscvemu64-wasm.js",
  "@tomlarkworthy/linux-emu/tinyemu.cfg",
  "@tomlarkworthy/linux-emu/bbl64.bin",
  "@tomlarkworthy/linux-emu/kernel.bin",
  "@tomlarkworthy/linux-emu/initramfs.bin",
  "@tomlarkworthy/linux-emu",
];
const linuxBlocks = linuxIds.map((id) => { const b = byId(id); if (!b) throw new Error("missing block: " + id); return b; });
const spliceStart = Math.min(...linuxBlocks.map((b) => b.start));
const spliceEnd = Math.max(...linuxBlocks.map((b) => b.end));
const inSpan = blocks.filter((b) => b.start >= spliceStart && b.end <= spliceEnd);
if (inSpan.length !== linuxIds.length) throw new Error("splice span covers " + inSpan.length + " blocks, expected " + linuxIds.length + ": " + inSpan.map((b) => b.id).join(","));
if (boot.start < spliceEnd) throw new Error("unexpected: bootconf before linux-emu span");

let out = Buffer.concat([
  data.slice(0, spliceStart),
  Buffer.from(NEW_BLOCKS, "utf8"),
  data.slice(spliceEnd, boot.start),
  Buffer.from(carriedBlocks ? carriedBlocks + "\n" : "", "utf8"),
  Buffer.from(NEW_BOOTCONF, "utf8"),
  data.slice(boot.end),
]);

// The donor carries a prerender snapshot of whoever exported it last — 160KB of rendered
// DOM that a boot script deletes anyway, and which in practice held local absolute paths,
// a session id and an activity log. Publishable files must not ship someone's screen.
const PRE_OPEN = '<div id="lope-prerender">';
const preStart = out.indexOf(Buffer.from(PRE_OPEN));
if (preStart >= 0) {
  const text = out.toString("utf8");
  const from = text.indexOf(PRE_OPEN);
  const re = /<(\/?)div\b[^>]*>/gi;
  re.lastIndex = from;
  let depth = 0, preEnd = -1, m;
  while ((m = re.exec(text))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) { preEnd = m.index + m[0].length; break; }
  }
  if (preEnd < 0) throw new Error("unbalanced #lope-prerender div");
  out = Buffer.from(text.slice(0, from) + text.slice(preEnd), "utf8");
  console.log("  prerender stripped  :", ((preEnd - from) / 1024).toFixed(0), "KB of a previous session's DOM");
}

// The donor's <title> was the literal string "undefined", which is what the browser tab
// and every pairing message showed. Only the first one: the exporter's own template
// carries a `${ title }` placeholder further down that must stay a placeholder.
const titleTag = Buffer.from("<title>");
const tStart = out.indexOf(titleTag);
const tEnd = out.indexOf(Buffer.from("</title>"), tStart);
if (tStart < 0 || tEnd < 0) throw new Error("no <title> in the donor to set");
const titled = Buffer.concat([
  out.slice(0, tStart),
  Buffer.from("<title>" + PAGE_TITLE + "</title>", "utf8"),
  out.slice(tEnd + "</title>".length),
]);

writeFileSync(OUT, titled);

const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log("wrote", OUT);
console.log("  page title          :", PAGE_TITLE);
console.log("  dist files embedded :", Object.keys(distFiles).length);
console.log("  cli.js.gz   b64     :", mb(cliB64.length), "MB");
console.log("  shims.js.gz b64     :", mb(distB64.length), "MB");
console.log("  xterm.js.gz b64     :", mb(xtermJsB64.length), "MB");
console.log("  xterm.css.gz b64    :", mb(xtermCssB64.length), "MB");
console.log("  addon-fit.gz b64    :", mb(addonFitB64.length), "MB");
const IMPORTED_ALL = IMPORT_MODULES.length + ANNOTATE_MODULES.length;
console.log("  imported modules    :", IMPORTED_ALL, "(+", copied.length - IMPORTED_ALL, "attachments,", (IMPORTED_BLOCKS.length / 1024 / 1024).toFixed(2), "MB)");
console.log("  removed linux span  :", mb(spliceEnd - spliceStart), "MB (" + inSpan.length + " blocks)");
console.log("  donor size          :", mb(data.length), "MB");
console.log("  final HTML          :", mb(out.length), "MB");
