// bun lite/soundscript/build.ts [--force] [--out file.html] [--no-tutorial]
// Builds lopebooks/notebooks/soundscript.html from lopecode/notebooks/quick_start.html:
//  - @tomlarkworthy/soundscript (core.ojs): the language. Attachment ss.js.gz (entry.ts).
//  - @tomlarkworthy/soundscript-tutorial (tutorial.ojs): imports only from the core. Attachments:
//    the example sources. Left out with --no-tutorial (a test artefact; needs --out).
//  - @tomlarkworthy/editor-5 replaced by editor-5.fork.js, refused unless quick_start's copy still
//    equals editor-5.base.js (the copy the fork was made from).
//  - every module block not reachable from MAINS removed, checked against EXPECT_REMOVED.
// In a .ojs file, `//ss: <file> [-cell ...]` becomes that file's SoundScript cells compiled by
// ss-toolchain (minus the named cells), and `//raw: <name>` the variable RAW[module][name].
// The default output is guarded: built.sha256 records the hash of the file this script last wrote,
// and a soundscript.html whose content differs (saved from the browser) is never overwritten.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compiler, splitSeed } from "../../../spec-notebook.ts";
import { blockContent, blockSpans, findSpan } from "../../../lib/notebook-blocks.ts";
import { compileCell, contextOf, splitCells, type Variable } from "../toolchain/ss-toolchain.ts";
import { checkSources } from "../core.ts";
import { acceptedOf } from "../toolchain/ss-toolchain.ts";

process.on("unhandledRejection", () => {});
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const CORE = "@tomlarkworthy/soundscript";
const TUTORIAL = "@tomlarkworthy/soundscript-tutorial";
// sections whose cell names collide with other sections are modules of their own
const SECTIONS = [
  { name: "@tomlarkworthy/soundscript-reducer", ojs: "sections/reducer.ojs" },
  { name: "@tomlarkworthy/soundscript-model", ojs: "sections/model.ojs" },
  { name: "@tomlarkworthy/soundscript-workers", ojs: "sections/workers.ojs" },
  { name: "@tomlarkworthy/soundscript-breakout", ojs: "sections/breakout.ojs" },
];
const HOST = "@tomlarkworthy/blank-notebook";
const EDITOR = "@tomlarkworthy/editor-5";
const BASE = join(ROOT, "lopecode/notebooks/quick_start.html");
const EXAMPLES = join(HERE, "../notebook/examples");
const DEFAULT_OUT = join(ROOT, "lopebooks/notebooks/soundscript.html");
const HASH_FILE = join(HERE, "built.sha256");
const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const OUT = resolve(arg("--out") ?? DEFAULT_OUT);
const withTutorial = !process.argv.includes("--no-tutorial");
const guarded = OUT === DEFAULT_OUT;
if (!withTutorial && guarded) throw new Error("--no-tutorial builds a test artefact; pass --out");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
if (existsSync(OUT)) {
  if (!process.argv.includes("--force")) throw new Error(`${OUT} exists; pass --force to overwrite it`);
  if (guarded) {
    const recorded = existsSync(HASH_FILE) ? readFileSync(HASH_FILE, "utf8").trim() : null;
    const now = sha(readFileSync(OUT));
    if (recorded !== now) {
      console.error(`REFUSED: ${OUT} (sha256 ${now}) is not the file this script last wrote (${recorded ?? "no record"}).\nIt was probably saved from the browser. Not overwriting; merge its changes into the sources first.`);
      process.exit(2);
    }
  }
}

const MAINS = ["@tomlarkworthy/lopepage-2", ...(withTutorial ? [TUTORIAL, ...SECTIONS.map((x) => x.name)] : []), CORE, "@tomlarkworthy/claude-code-pairing", "@tomlarkworthy/save-in-place"];
const HASH = withTutorial ? `#view=S100(${TUTORIAL},${CORE})` : `#view=S100(${CORE})`;
// quick_start modules this notebook does not use, and the modules only they import.
const EXPECT_REMOVED = [
  "@tomlarkworthy/annotate", "@tomlarkworthy/at-login", "@tomlarkworthy/at-write", "@tomlarkworthy/atproto",
  "@tomlarkworthy/debugger-2", "@tomlarkworthy/editable-md", "@tomlarkworthy/escodegen", "@tomlarkworthy/grid-container",
  "@tomlarkworthy/import-wizard-file", "@tomlarkworthy/import-wizard-js", "@tomlarkworthy/import-wizard-notebook",
  "@tomlarkworthy/inputs-reference", "@tomlarkworthy/local-disk", "@tomlarkworthy/markdown-wiki", "@tomlarkworthy/prosemirror",
  "@tomlarkworthy/robocoop-5", "@tomlarkworthy/robocoop-5-context", "@tomlarkworthy/robocoop-5-core", "@tomlarkworthy/robocoop-5-engine",
  "@tomlarkworthy/robocoop-5-sessions", "@tomlarkworthy/robocoop-5-srctools", "@tomlarkworthy/robocoop-5-tools",
  "@tomlarkworthy/sticky", "@tomlarkworthy/svg-lens", "@tomlarkworthy/switchboard",
];

// attachment blocks quick_start carries that their module does not list (exporter-3 drops them on save)
const EXPECT_ORPHANS = ["@tomlarkworthy/observablejs-toolchain/acorn-walk-8.3.2.js.gz"];

const RAW: Record<string, Record<string, Variable>> = {
  // written as variables so the handle input is spelled as the compiler spells it (viewof <cell>)
  [CORE]: {
    test_ss_ref_handle: {
      name: "test_ss_ref_handle",
      inputs: ["ss_tests_on", "ss", "viewof tally", "bump", "reset"],
      definition: "async (on, ss, handle, bump, reset) => { if (on !== true) throw new Error(\"the tests are off\"); const g = ss.refValues(handle); const v0 = g.next().value; bump(); const v1 = await g.next().value; reset(); const v2 = await g.next().value; if (v1 !== v0 + 1 || v2 !== 0) throw new Error(`${v0} -> ${v1} -> ${v2}`); return `${v0} -> ${v1} -> ${v2}`; }",
    },
  },
  [TUTORIAL]: {
    test_ss_counter: {
      name: "test_ss_counter",
      inputs: ["tests_on", "ss", "viewof count", "increment", "clear"],
      definition: "async (on, ss, handle, increment, clear) => { if (on !== true) throw new Error(\"the tests are off\"); const g = ss.refValues(handle); const v0 = g.next().value; increment(); const v1 = await g.next().value; clear(); const v2 = await g.next().value; if (v1 !== v0 + 1 || v2 !== 0) throw new Error(`${v0} -> ${v1} -> ${v2}`); return `${v0} -> ${v1} -> ${v2}`; }",
    },
  },
};

const b = await Bun.build({ entrypoints: [join(HERE, "entry.ts")], target: "browser", format: "esm", minify: true });
if (!b.success) throw new Error(b.logs.join("\n"));
const js = await b.outputs[0].text();
if (/["']node:/.test(js)) throw new Error("bundle still refers to a node: module");
const gz = Bun.gzipSync(new TextEncoder().encode(js), { level: 9 });
// the bundle's sizes, for the tutorial's table; constants, so no boot work decompresses it again
RAW[TUTORIAL].ss_bytes = { name: "ss_bytes", inputs: [], definition: `() => ({ raw: ${js.length}, gz: ${gz.length} })` };

type File = { name: string; mime: string; base64: boolean; data: string };
const q = JSON.stringify;
const { compile, dispose } = await compiler();

function buildModule(name: string, ojs: string, files: File[]) {
  const consts: string[] = [], defs: string[] = [], imports: string[] = [], ssNames: string[] = [];
  const addVar = (pid: string, v: Variable) => {
    consts.push(`const ${pid} = ${v.definition};`);
    defs.push(`  $def(${q(pid)}, ${q(v.name)}, ${q(v.inputs)}, ${pid});`);
  };
  const cellsOfBlock = (src: string) => {
    const ssm = /^\/\/ss: (\S+)((?: -\S+)*)$/.exec(src);
    if (!ssm) return null;
    const file = ssm[1].startsWith("./") ? join(HERE, ssm[1]) : join(EXAMPLES, ssm[1]);
    const skip = new Set(ssm[2].split(" -").filter(Boolean));
    const tsx = file.endsWith("x");
    const texts = splitCells(readFileSync(file, "utf8"), tsx).filter((t) => ![...skip].some((s) => new RegExp(`^(?:\\s*//[^\\n]*\\n)*\\s*export\\s+(?:const|let|function)\\s+${s}\\b`).test(t)));
    return { texts, tsx, skip };
  };
  const blocks = splitSeed(readFileSync(join(HERE, ojs), "utf8"));
  // one context for the whole module: a cell's compiled form depends on the other cells (ss-toolchain Context)
  // only cells the checker accepts are memoised, judged over the module's whole source as the core does
  const allTexts = blocks.flatMap((b) => cellsOfBlock(b)?.texts ?? []);
  const ctx = contextOf(allTexts, true, allTexts.length ? acceptedOf(checkSources({ cells: allTexts.join("\n\n"), tsx: true })) : null);
  blocks.forEach((src, i) => {
    const ssm = cellsOfBlock(src), raw = /^\/\/raw: (\S+)$/.exec(src);
    if (ssm) {
      const { texts, tsx, skip } = ssm;
      const vs = texts.flatMap((t) => compileCell(t, tsx, ctx));
      for (const s of skip) if (vs.some((v) => v.name === s)) throw new Error(`${ojs}: ${s} was not left out`);
      for (const v of vs) {
        addVar("_ss_" + v.name.replace(/[^A-Za-z0-9_$]/g, "_"), v);
        ssNames.push(v.name);
      }
      return;
    }
    if (raw) {
      const v = RAW[name]?.[raw[1]];
      if (!v) throw new Error(`no raw variable ${raw[1]} for ${name}`);
      addVar("_raw_" + v.name, v);
      return;
    }
    const specs = compile(src);
    if (!specs.length) throw new Error(`${ojs} cell ${i} compiles to nothing: ${src.slice(0, 80)}`);
    specs.forEach((s: any, j: number) => {
      const stub = /throw Object\.assign\(new SyntaxError\((".*?")\), \{_sourceExpression:/.exec(String(s._definition));
      if (stub) throw new Error(`${ojs} cell ${i}: ${JSON.parse(stub[1])} :: ${src.slice(0, 80)}`);
      const vname = s._name ?? null, inputs = s._inputs ?? [];
      if (typeof vname === "string" && (vname.startsWith("module ") || inputs.includes("@variable"))) {
        imports.push(`  main.define(${q(vname)}, ${q(inputs)}, ${s._definition});`);
        return;
      }
      addVar(`_ss${i}_${j}`, { name: vname, inputs, definition: String(s._definition) } as Variable);
    });
  });
  const prologue = `  const fileAttachments = new Map(${q(files.map((f) => f.name))}.map((name) => {
    const module_name = ${q(name)};
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));`;
  const source = [
    ...consts, "",
    "export default function define(runtime, observer) {",
    "  const main = runtime.module();",
    prologue,
    "  const $def = (pid, name, deps, fn) => {",
    "    main.variable(observer(name)).define(name, deps, fn).pid = pid;",
    "  };",
    ...defs, ...imports,
    "  return main;", "}", "",
  ].join("\n");
  if (/<\/script/i.test(source)) throw new Error(`${name} source contains a closing script tag`);
  // attachments before their module (a module ahead of its attachments loses them under a slow load)
  const attach = files.map((f) => `<script id="${name}/${encodeURIComponent(f.name)}" \n  type="text/plain"\n${f.base64 ? '  data-encoding="base64"\n' : ""}  data-mime="${f.mime}"\n>\n${f.data}</script>`);
  const html = [...attach, `<script id="${name}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${source}</script>`].join("\n");
  return { html, consts: consts.length, ssNames };
}

let core, tutorial, sections: ReturnType<typeof buildModule>[] = [];
try {
  core = buildModule(CORE, "core.ojs", [{ name: "ss.js.gz", mime: "application/gzip", base64: true, data: Buffer.from(gz).toString("base64") }]);
  if (withTutorial) {
    const files: File[] = readdirSync(EXAMPLES).sort().map((f) => {
      const data = readFileSync(join(EXAMPLES, f), "utf8");
      if (/<\/script/i.test(data)) throw new Error(`${f} contains a closing script tag`);
      return { name: f, mime: "text/plain", base64: false, data };
    });
    tutorial = buildModule(TUTORIAL, "tutorial.ojs", files);
    sections = SECTIONS.map((x) => buildModule(x.name, x.ojs, []));
  }
} finally {
  dispose();
}
if (/\b(?:examples|lesson|sourceBox)\b/.test(core.html.slice(core.html.lastIndexOf('<script id="' + CORE + '"')))) throw new Error("the core module mentions tutorial cells");
if (core.html.includes(`"module ${TUTORIAL}"`)) throw new Error("the core module imports the tutorial");

let html = readFileSync(BASE, "utf8");
const base = readFileSync(join(HERE, "editor-5.base.js"), "utf8");
const fork = readFileSync(join(HERE, "editor-5.fork.js"), "utf8");
if (blockContent(html, EDITOR)?.trim() !== base.trim()) throw new Error(`${EDITOR} in quick_start.html is not editor-5.base.js; re-fork from the new copy`);
const es = findSpan(html, EDITOR)!;
const eraw = html.slice(es.start, es.end);
html = html.slice(0, es.start) + eraw.slice(0, eraw.indexOf(">") + 1) + "\n" + fork + "</script>" + html.slice(es.end);

const host = findSpan(html, HOST);
if (!host) throw new Error(`no ${HOST} block in ${BASE}`);
html = html.slice(0, host.start) + core.html + (tutorial ? "\n" + tutorial.html : "") + sections.map((x) => "\n" + x.html).join("") + html.slice(host.end);

const conf = JSON.parse(blockContent(html, "bootconf.json")!);
conf.mains = MAINS;
conf.hash = HASH;
conf.headless = true;
const cs = findSpan(html, "bootconf.json")!;
const craw = html.slice(cs.start, cs.end);
html = html.slice(0, cs.start) + craw.slice(0, craw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(cs.end);
html = html.replace(/<title>[^<]*<\/title>/, "<title>SoundScript: Sound Dataflow Language</title>");

// --- strip: keep the blocks reachable from MAINS through `main.define("module X", ...)` imports
const MODULE_ID = /^(?:@[\w.-]+\/[\w.-]+|d\/[0-9a-f]+)$/;
const spans = blockSpans(html);
const ids = spans.map((s) => s.id);
const modules = ids.filter((id) => MODULE_ID.test(id));
const depsOf = (id: string) => [...(blockContent(html, id) ?? "").matchAll(/main\.define\("module ((?:@[\w.-]+\/[\w.-]+)|d\/[0-9a-f]+)(?:@\d+)?",/g)].map((m) => m[1]);
const keep = new Set<string>();
const stack = [...MAINS, "@tomlarkworthy/bootloader", ...ids.filter((id) => !MODULE_ID.test(id) && !modules.some((m) => id.startsWith(m + "/")))];
while (stack.length) {
  const id = stack.pop()!;
  if (keep.has(id)) continue;
  keep.add(id);
  if (ids.includes(id)) stack.push(...depsOf(id));
}
for (const m of MAINS) if (!ids.includes(m)) throw new Error(`main ${m} has no block`);
const removed = modules.filter((m) => !keep.has(m)).sort();
if (q(removed) !== q([...EXPECT_REMOVED].sort())) throw new Error(`strip would remove ${q(removed)}; EXPECT_REMOVED is ${q(EXPECT_REMOVED)}`);
const owner = (id: string) => modules.find((m) => id === m || id.startsWith(m + "/"));
// an attachment block its module's FileAttachment map does not list is never read, and a save drops it
const listed = (m: string) => {
  const names = /const fileAttachments = new Map\((\[[^\]]*\])\.map/.exec(blockContent(html, m) ?? "")?.[1];
  return names ? new Set((JSON.parse(names) as string[]).map((n) => m + "/" + encodeURIComponent(n))) : null;
};
const orphans = ids.filter((id) => { const m = owner(id); return !!m && id !== m && !removed.includes(m) && listed(m) && !listed(m)!.has(id); });
if (q(orphans) !== q(EXPECT_ORPHANS)) throw new Error(`orphan attachments ${q(orphans)}; EXPECT_ORPHANS is ${q(EXPECT_ORPHANS)}`);
const sizeBefore = Buffer.byteLength(html);
for (const s of [...spans].reverse()) {
  const m = owner(s.id);
  if (m && (removed.includes(m) || orphans.includes(s.id))) {
    const end = html[s.end] === "\n" ? s.end + 1 : s.end;
    html = html.slice(0, s.start) + html.slice(end);
  }
}

const after = new Set(blockSpans(html).map((s) => s.id));
const lost = ids.filter((id) => id !== HOST && !after.has(id) && !removed.includes(owner(id) ?? "") && !orphans.includes(id));
if (lost.length) throw new Error(`splice lost ${lost.join(", ")}`);
if (!after.has(CORE + "/ss.js.gz") || (withTutorial && !after.has(TUTORIAL + "/09-breakout.tsx"))) throw new Error("an attachment is not a top-level block");
if (blockContent(html, EDITOR)?.trim() !== fork.trim()) throw new Error("the fork did not land");
writeFileSync(OUT, html);
if (guarded) writeFileSync(HASH_FILE, sha(html) + "\n");
console.log(JSON.stringify({
  out: OUT, bytes: Buffer.byteLength(html), bytesBeforeStrip: sizeBefore, removed, orphans, bundle: js.length, bundleGz: gz.length,
  coreVariables: core.consts, tutorialVariables: tutorial?.consts ?? 0, coreSoundScript: core.ssNames, tutorialSoundScript: tutorial?.ssNames ?? [], sectionVariables: sections.map((x) => x.consts), mains: conf.mains, hash: conf.hash,
}, null, 2));
process.exit(0);
