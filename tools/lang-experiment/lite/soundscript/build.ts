// bun lite/soundscript/build.ts [--force] [--out file.html]
// Builds lopebooks/notebooks/soundscript.html: a copy of lopecode/notebooks/quick_start.html with
//  - @tomlarkworthy/soundscript in place of blank-notebook: soundscript.ojs compiled with the
//    observablejs-toolchain notebook (tools/spec-notebook.ts), where a `//ss: <example>` cell becomes
//    that example's SoundScript cells compiled by ss-toolchain and a `//raw: <name>` cell the
//    variable in RAW below; attachments ss.js.gz (entry.ts) and the nine examples;
//  - the @tomlarkworthy/editor-5 block replaced by editor-5.fork.js, refused unless quick_start's
//    copy still equals editor-5.base.js (the copy the fork was made from).
// Once built the HTML is the source of truth: --force overwrites it, edits saved from the browser included.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compiler, splitSeed } from "../../../spec-notebook.ts";
import { blockContent, blockSpans, findSpan } from "../../../lib/notebook-blocks.ts";
import { compileModule, type Variable } from "../toolchain/ss-toolchain.ts";

process.on("unhandledRejection", () => {});
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const NAME = "@tomlarkworthy/soundscript";
const HOST = "@tomlarkworthy/blank-notebook";
const EDITOR = "@tomlarkworthy/editor-5";
const BASE = join(ROOT, "lopecode/notebooks/quick_start.html");
const EXAMPLES = join(HERE, "../notebook/examples");
const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const OUT = resolve(arg("--out") ?? join(ROOT, "lopebooks/notebooks/soundscript.html"));
if (existsSync(OUT) && !process.argv.includes("--force")) throw new Error(`${OUT} exists; pass --force to overwrite it`);

const RAW: Record<string, Variable> = {
  // a ref handle has no Observable identifier, so this test is written as a variable
  test_ss_counter: {
    name: "test_ss_counter",
    inputs: ["ss", "ref count", "increment", "clear"],
    definition: "async (ss, handle, increment, clear) => { const g = ss.refValues(handle); const v0 = g.next().value; increment(); const v1 = await g.next().value; clear(); const v2 = await g.next().value; if (v1 !== v0 + 1 || v2 !== 0) throw new Error(`${v0} -> ${v1} -> ${v2}`); return `${v0} -> ${v1} -> ${v2}`; }",
  },
};

const b = await Bun.build({ entrypoints: [join(HERE, "entry.ts")], target: "browser", format: "esm", minify: true });
if (!b.success) throw new Error(b.logs.join("\n"));
const js = await b.outputs[0].text();
if (/["']node:/.test(js)) throw new Error("bundle still refers to a node: module");
const gz = Bun.gzipSync(new TextEncoder().encode(js), { level: 9 });

type File = { name: string; mime: string; base64: boolean; data: string };
const files: File[] = [{ name: "ss.js.gz", mime: "application/gzip", base64: true, data: Buffer.from(gz).toString("base64") }];
for (const f of readdirSync(EXAMPLES).sort()) {
  const data = readFileSync(join(EXAMPLES, f), "utf8");
  if (/<\/script/i.test(data)) throw new Error(`${f} contains a closing script tag`);
  files.push({ name: f, mime: "text/plain", base64: false, data });
}

const q = JSON.stringify;
const consts: string[] = [], defs: string[] = [], imports: string[] = [];
const addVar = (pid: string, v: Variable) => {
  consts.push(`const ${pid} = ${v.definition};`);
  defs.push(`  $def(${q(pid)}, ${q(v.name)}, ${q(v.inputs)}, ${pid});`);
};
const ssNames: string[] = [];
const { compile, dispose } = await compiler();
try {
  splitSeed(readFileSync(join(HERE, "soundscript.ojs"), "utf8")).forEach((src, i) => {
    const ssm = /^\/\/ss: (\S+)$/.exec(src), raw = /^\/\/raw: (\S+)$/.exec(src);
    if (ssm) {
      const file = join(EXAMPLES, ssm[1]);
      for (const v of compileModule(readFileSync(file, "utf8"), file.endsWith("x"))) {
        addVar("_ss_" + v.name.replace(/[^A-Za-z0-9_$]/g, "_"), v);
        ssNames.push(v.name);
      }
      return;
    }
    if (raw) {
      const v = RAW[raw[1]];
      if (!v) throw new Error(`no raw variable ${raw[1]}`);
      addVar("_raw_" + v.name, v);
      return;
    }
    const specs = compile(src);
    if (!specs.length) throw new Error(`cell ${i} compiles to nothing: ${src.slice(0, 80)}`);
    specs.forEach((s: any, j: number) => {
      const stub = /throw Object\.assign\(new SyntaxError\((".*?")\), \{_sourceExpression:/.exec(String(s._definition));
      if (stub) throw new Error(`cell ${i}: ${JSON.parse(stub[1])} :: ${src.slice(0, 80)}`);
      const name = s._name ?? null, inputs = s._inputs ?? [];
      if (typeof name === "string" && (name.startsWith("module ") || inputs.includes("@variable"))) {
        imports.push(`  main.define(${q(name)}, ${q(inputs)}, ${s._definition});`);
        return;
      }
      addVar(`_ss${i}_${j}`, { name, inputs, definition: String(s._definition) } as Variable);
    });
  });
} finally {
  dispose();
}
const prologue = `  const fileAttachments = new Map(${q(files.map((f) => f.name))}.map((name) => {
    const module_name = ${q(NAME)};
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));
`;
const source = [
  ...consts, "",
  "export default function define(runtime, observer) {",
  "  const main = runtime.module();",
  prologue.replace(/\n$/, ""),
  "  const $def = (pid, name, deps, fn) => {",
  "    main.variable(observer(name)).define(name, deps, fn).pid = pid;",
  "  };",
  ...defs, ...imports,
  "  return main;", "}", "",
].join("\n");
if (/<\/script/i.test(source)) throw new Error("module source contains a closing script tag");

let html = readFileSync(BASE, "utf8");
const before = blockSpans(html).map((s) => s.id);
const base = readFileSync(join(HERE, "editor-5.base.js"), "utf8");
const fork = readFileSync(join(HERE, "editor-5.fork.js"), "utf8");
if (blockContent(html, EDITOR)?.trim() !== base.trim()) throw new Error(`${EDITOR} in quick_start.html is not editor-5.base.js; re-fork from the new copy`);
const es = findSpan(html, EDITOR)!;
const eraw = html.slice(es.start, es.end);
html = html.slice(0, es.start) + eraw.slice(0, eraw.indexOf(">") + 1) + "\n" + fork + "</script>" + html.slice(es.end);

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
const craw = html.slice(cs.start, cs.end);
html = html.slice(0, cs.start) + craw.slice(0, craw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(cs.end);
html = html.replace(/<title>[^<]*<\/title>/, "<title>SoundScript: Sound Dataflow Language</title>");

const after = new Set(blockSpans(html).map((s) => s.id));
const lost = before.filter((id) => id !== HOST && !after.has(id));
if (lost.length) throw new Error(`splice lost ${lost.join(", ")}`);
for (const f of files) if (!after.has(`${NAME}/${encodeURIComponent(f.name)}`)) throw new Error(`attachment ${f.name} is not a top-level block`);
if (blockContent(html, EDITOR)?.trim() !== fork.trim()) throw new Error("the fork did not land");
writeFileSync(OUT, html);
console.log(JSON.stringify({ out: OUT, bytes: Buffer.byteLength(html), bundle: js.length, bundleGz: gz.length, variables: consts.length, soundscriptVariables: ssNames, mains: conf.mains, hash: conf.hash }, null, 2));
process.exit(0);
