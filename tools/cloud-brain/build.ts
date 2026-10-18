/**
 * Builds lopebooks/notebooks/@tomlarkworthy_cloud-brain.html from the seeds in this directory.
 *   bun tools/cloud-brain/build.ts [--out path] [--token LOPE-…]
 * While the notebook is built from seeds, the seeds are the source and the HTML is regenerated.
 * A module with `running` in place of `seed` has no seed here: it is changed as a patch in cloud-brain-dev, and its
 * source is what the Brain runs, read from getSource of BRAIN_BASE (cb4) at each build. Its seed was deleted on
 * 2026-10-14 because it was behind what ran, and a build of it would have undone the patches (Tom: "remove the stale
 * seeds from lopecode-dev so there are no accidents"). No answer, no build. Since later that day every brain-x-*
 * service but the page is `running`: the 18 other seeds were deleted while each still matched what ran. A new service
 * starts as a seed and an entry here (the page declares services from this build); after its first deploy its seed
 * is deleted and its entry becomes `running`. A page module that is no Worker's has `deployed` (since 2026-10-18,
 * i13287): its source is cloud-brain-dev/deploy/@tomlarkworthy/NAME.js after `bun sync.ts`, its seed deleted while
 * the same as what cb4 served. The owner's Workers and their modules are retired the same way (2026-10-18, on his
 * word): the kernel, the core and the database are `running`; the deployer has no getSource, so it and its modules are
 * `deployed`, from the deployer's infra.getModules as sync.ts writes it. Their text is cb4's, not a compiled seed's.
 * Beside it, in .emitted/ here: shell.html (the notebook without the modules a Brain's Workers serve) and
 * verify.html (the shell with mains cut to brain-shell, verify-shell.ts).
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { blockSpans, blockContent, findSpan } from "../lib/notebook-blocks.ts";
import { compiler, moduleSource, splitSeed } from "../spec-notebook.ts";
import { carryCells, patchSpec } from "./spec-patch.ts";
import { verifyShell, VERIFY_MAINS } from "./verify-shell.ts";

const ROOT = resolve(import.meta.dir, "../..");
const HERE = import.meta.dir;
const HOST = "@tomlarkworthy/blank-notebook";
const MODULES = [
  { name: "@tomlarkworthy/xrpc-client", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/brain-shell", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/cloudflare-iac-fixtures", seed: "cloudflare-iac-fixtures.ojs", main: false, files: {} },
  { name: "@tomlarkworthy/cloudflare-iac", seed: "cloudflare-iac.ojs", main: true, files: { "hono.js": "text/javascript", "cel.js": "text/javascript", "quickjs.js": "text/javascript", "observable-runtime.js": "text/javascript", "acorn.js": "text/javascript", "acorn-walk.js": "text/javascript", "quickjs.wasm.b64": "text/plain" } },
  { name: "@tomlarkworthy/brain-deployer", seed: "brain-deployer.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-core", running: "brain-core", main: true, files: {} },
  { name: "@tomlarkworthy/brain-kernel", running: "brain", main: true, files: { "atcute.js": "text/javascript" } },
  { name: "@tomlarkworthy/brain-proxy", running: "brain-x-proxy", main: true, files: {} },
  { name: "@tomlarkworthy/brain-whatsapp", running: "brain-x-whatsapp", main: true, files: {} },
  { name: "@tomlarkworthy/brain-bluesky", running: "brain-x-bluesky", main: true, files: {} },
  { name: "@tomlarkworthy/brain-static", running: "brain-x-static", main: true, files: {} },
  { name: "@tomlarkworthy/brain-blob", running: "brain-x-blob", main: true, files: {} },
  { name: "@tomlarkworthy/brain-library", running: "brain-x-library", main: true, files: {} },
  { name: "@tomlarkworthy/brain-feed", running: "brain-x-feed", main: true, files: {} },
  { name: "@tomlarkworthy/brain-browser", running: "brain-x-browser", main: true, files: {} },
  { name: "@tomlarkworthy/brain-inbox", running: "brain-x-inbox", main: true, files: {} },
  { name: "@tomlarkworthy/brain-logs", running: "brain-x-logs", main: true, files: {} },
  { name: "@tomlarkworthy/brain-snapshot", running: "brain-x-snapshot", main: true, files: {} },
  { name: "@tomlarkworthy/brain-knowledge", running: "brain-x-knowledge", main: true, files: {} },
  { name: "@tomlarkworthy/brain-issues", running: "brain-x-issues", main: true, files: {} },
  { name: "@tomlarkworthy/brain-container", running: "brain-x-container", main: true, files: {} },
  { name: "@tomlarkworthy/brain-ai", running: "brain-x-ai", main: true, files: {} },
  { name: "@tomlarkworthy/brain-git", running: "brain-x-git", main: true, files: {} },
  { name: "@tomlarkworthy/brain-dashboard", running: "brain-x-dashboard", main: true, files: {} },
  { name: "@tomlarkworthy/brain-topic", running: "brain-x-topic", main: true, files: {} },
  { name: "@tomlarkworthy/brain-fly", running: "brain-x-fly", main: true, files: {} },
  { name: "@tomlarkworthy/brain-usage", running: "brain-x-usage", main: true, files: {} },
  { name: "@tomlarkworthy/brain-loop", running: "brain-x-loop", main: true, files: {} },
  { name: "@tomlarkworthy/cloud-brain", seed: "cloud-brain.ojs", main: true, files: {} },
  { name: "@tomlarkworthy/cloud-brain-docs", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/brain-secrets", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/brain-feedback", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/brain-operator", deployed: true, main: true, files: {} },
  { name: "@tomlarkworthy/brain-db", running: "brain-db", main: true, files: {} },
];
// What a Worker of a Brain owns: the deployer's two, and one per service. The shell is the notebook without these.
const OWNED = ["cloudflare-iac", "brain-deployer", "brain-core", "brain-kernel", "brain-proxy", "brain-whatsapp", "brain-bluesky", "brain-static", "brain-blob", "brain-library", "brain-feed", "brain-browser", "brain-inbox", "brain-logs", "brain-snapshot", "brain-knowledge", "brain-issues", "brain-container", "brain-ai", "brain-git", "brain-dashboard", "brain-topic", "brain-fly", "brain-usage", "brain-loop", "cloud-brain", "brain-db"].map((n) => "@tomlarkworthy/" + n);
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

const BRAIN = `https://${process.env.BRAIN_BASE || "cb4"}.endpointservices.workers.dev`;
const running = new Map<string, string>();
for (const m of MODULES) {
  if (!("running" in m) || !m.running) continue;
  const r = await fetch(`${BRAIN}/xrpc/com.lopecode.brain.getSource?worker=${m.running}`, { signal: AbortSignal.timeout(30000) }).catch((e) => { throw new Error(`${m.running}: the Brain at ${BRAIN} did not answer: ${e.message}`); });
  const got: any = r.ok ? await r.json() : null;
  if (!got || got.module !== m.name || typeof got.text !== "string") throw new Error(`${m.running}: getSource answered ${r.status}, not the source of ${m.name}`);
  running.set(m.name, got.text);
  console.error(`${m.name}: what ${m.running} runs on ${BRAIN}, ${String(got.hash).slice(0, 12)}`);
}
// A page module with `deployed` is no Worker's: its source is cloud-brain-dev/deploy/, which sync.ts writes from the page
// cb4 serves. services.json is written by sync.ts alone (git-ignored): without it the committed copies may be behind.
const DEPLOY = resolve(ROOT, "cloud-brain-dev/deploy");
const deployed = new Map<string, string>();
for (const m of MODULES) {
  if (!("deployed" in m) || !m.deployed) continue;
  const file = resolve(DEPLOY, m.name + ".js");
  if (!existsSync(resolve(DEPLOY, "services.json")) || !existsSync(file)) throw new Error(`${m.name}: no ${file} from a sync. git submodule update --init cloud-brain-dev, then bun sync.ts ${BRAIN} there`);
  // sync.ts strips the newline a block ends with; a compiled seed had it.
  deployed.set(m.name, readFileSync(file, "utf8").replace(/\n?$/, "\n"));
}
const compiled = (m: (typeof MODULES)[number]) => ("running" in m && !!m.running) || ("deployed" in m && !!m.deployed);
const textOf = (m: (typeof MODULES)[number]) => ("running" in m && m.running ? running.get(m.name)! : "deployed" in m && m.deployed ? deployed.get(m.name)! : readFileSync(resolve(HERE, m.seed!), "utf8"));
const testsOf = (m: (typeof MODULES)[number]) => compiled(m)
  ? [...textOf(m).matchAll(/\$def\("[^"]*", "(test_[A-Za-z0-9_]+)"/g)].map((x) => x[1])
  : [...textOf(m).matchAll(/^(test_[A-Za-z0-9_]+) = /gm)].map((x) => x[1]);

// The spec and the docs cite test cells by name and link modules with mod("name"). A name that no seed defines, or a
// module that is not a main of the notebook, stops the build.
{
  const seedText = (f: string) => readFileSync(resolve(HERE, f), "utf8");
  const tests = new Map(MODULES.map((m) => [m.name.split("/")[1], new Set(testsOf(m))]));
  const all = new Set([...tests.values()].flatMap((t) => [...t]));
  const mains = new Set([...MODULES.filter((m) => m.main), SPEC].map((m) => m.name.split("/")[1]));
  const wrong: string[] = [];
  const docs = MODULES.find((m) => m.name === "@tomlarkworthy/cloud-brain-docs")!;
  const cited = [
    { f: SPEC.seed, text: seedText(SPEC.seed), own: new Set([...seedText(SPEC.seed).matchAll(/^(test_[A-Za-z0-9_]+) = /gm)].map((x) => x[1])) },
    { f: docs.name, text: textOf(docs), own: new Set(testsOf(docs)) },
    { f: "spec-as-built-short.md", text: seedText("spec-as-built-short.md"), own: new Set<string>() },
  ];
  for (const { f, text, own } of cited) {
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
// In a git worktree (worktree.sh) lopebooks is a link to the main checkout's: a build there names its own --out.
if (!arg("out") && statSync(resolve(ROOT, ".git")).isFile()) throw new Error("in a worktree: pass --out tools/cloud-brain/.emitted/cloud-brain.html");
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
    let src = compiled(m) ? textOf(m) : moduleSource(splitSeed(textOf(m)), compile);
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
      // A module read from what cb4 runs registers its attachments already.
      if (!compiled(m)) src = src.replace("  const main = runtime.module();\n", "  const main = runtime.module();\n" + prologue + "\n");
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
// The Operator's chat has the lower pane (brain-operator). claude-code-pairing is a main and has no pane: an
// address that names it shows it, and a cc= token pairs with or without one (plan/cloud-brain-i1842.md).
conf.hash = "#view=C100(S50(@tomlarkworthy/cloud-brain,@tomlarkworthy/cloud-brain-docs,@tomlarkworthy/cloud-brain-specs),S50(@tomlarkworthy/brain-operator))";
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
  // The page a deploy's verdict comes from: the shell, booting brain-shell alone.
  writeFileSync(resolve(HERE, ".emitted/verify.html"), verifyShell(text));
  console.error(`verify: the shell with mains ${JSON.stringify(VERIFY_MAINS)}`);
}
const token = arg("token");
console.log(JSON.stringify({ out, bytes: html.length, mains: conf.mains }, null, 1));
console.log(`file://${encodeURI(out)}${conf.hash}${token ? "&cc=" + token : ""}`);
process.exit(0);
