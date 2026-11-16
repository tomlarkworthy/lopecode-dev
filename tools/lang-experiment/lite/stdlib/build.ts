// bun lite/stdlib/build.ts [--force]
// Builds lite/notebook/ss-demo.html: a copy of quick_start.html with two modules in place of
// blank-notebook. @tomlarkworthy/soundscript is the standard library (the runtime bundle as an
// attachment, re-exported as the cell `ss`). @tomlarkworthy/soundscript-demo holds the cells of
// examples/04-counter.tsx compiled by ss_toolchain, one variable per cell, plus an ojs view cell.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { blockContent, blockSpans, findSpan } from "../../../lib/notebook-blocks.ts";
import { compileModule, splitCells, type Variable } from "../toolchain/ss-toolchain.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const STD = "@tomlarkworthy/soundscript";
const DEMO = "@tomlarkworthy/soundscript-demo";
const HOST = "@tomlarkworthy/blank-notebook";
const OUT = join(HERE, "../notebook/ss-demo.html");
if (existsSync(OUT) && !process.argv.includes("--force")) throw new Error(`${OUT} exists; pass --force to overwrite it`);

const b = await Bun.build({ entrypoints: [join(HERE, "runtime.ts")], target: "browser", format: "esm", minify: true });
if (!b.success) throw new Error(b.logs.join("\n"));
const js = await b.outputs[0].text();
if (/["']node:/.test(js)) throw new Error("bundle still refers to a node: module");
const gz = Buffer.from(Bun.gzipSync(new TextEncoder().encode(js), { level: 9 })).toString("base64");

const pid = (name: string) => "_" + name.replace(/[^A-Za-z0-9_$]/g, "_");
const q = JSON.stringify;
const importLine = (mod: string, name: string) =>
  `  main.define(${q(name)}, [${q("module " + mod)}, "@variable"], (_, v) => v.import(${q(name)}, _));\n`;
const loader = (mod: string) => `  main.define(${q("module " + mod)}, async () => runtime.module((await import(${q("/" + mod + ".js?v=4")})).default));\n`;
const moduleJs = (name: string, defs: Variable[], extra = "", attachments: string[] = []) => {
  let s = defs.map((v) => `const ${pid(v.name)} = ${v.definition};\n`).join("");
  s += `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n`;
  if (attachments.length) s += `  const fileAttachments = new Map(${q(attachments)}.map((name) => {
    const module_name = ${q(name)};
    const {status, mime, bytes} = window.lopecode.contentSync(module_name + "/" + encodeURIComponent(name));
    const blob_url = URL.createObjectURL(new Blob([bytes], { type: mime}));
    return [name, {url: blob_url, mimeType: mime}]
  }));
  main.builtin("FileAttachment", runtime.fileAttachments(name => fileAttachments.get(name)));\n`;
  s += `  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n`;
  s += extra;
  s += defs.map((v) => `  $def(${q(pid(v.name))}, ${q(v.name)}, ${q(v.inputs)}, ${pid(v.name)});\n`).join("");
  return s + "  return main;\n}\n";
};

const std: Variable[] = [
  { name: "readme", inputs: ["md"], definition: "(md) => md`# SoundScript standard library\n\n\\`ss\\` is the runtime that compiled SoundScript cells call, and also exports the toolchain (\\`compileCell\\`, \\`decompileVariable\\`, \\`decompileModule\\`) and the checker (\\`checkSources\\`). A module holding SoundScript cells imports \\`ss\\`, plus the variable for each capability its cells take by parameter name:\n\n| parameter | variable |\n|---|---|\n| \\`now\\` | \\`ss_now\\` |\n| \\`random\\` | \\`ss_random\\` |\n| \\`fetch\\` | \\`ss_fetch\\` |\n| \\`log\\` | \\`ss_log\\` |\n| \\`invalidation\\` | the runtime's own \\`invalidation\\` |\n\n\\`ss_random\\` and \\`ss_now\\` are one value shared by every cell; the tutorial's runner makes one per cell. \\`pool\\` and \\`compile\\` are not provided yet.`" },
  { name: "ss", inputs: ["FileAttachment"], definition: `async (FileAttachment) => {
  const stream = (await FileAttachment("ss.js.gz").stream()).pipeThrough(new DecompressionStream("gzip"));
  const url = URL.createObjectURL(new Blob([await new Response(stream).text()], { type: "text/javascript" }));
  try { return await import(url); } finally { URL.revokeObjectURL(url); }
}` },
  { name: "ss_now", inputs: [], definition: "() => () => performance.now()" },
  { name: "ss_random", inputs: [], definition: "() => Math.random" },
  { name: "ss_log", inputs: [], definition: "() => (...a) => console.log(...a)" },
  { name: "ss_fetch", inputs: [], definition: "() => globalThis.fetch.bind(globalThis)" },
];
const counter = readFileSync(join(HERE, "../notebook/examples/04-counter.tsx"), "utf8");
const compiled = compileModule(counter, true);
const expected = splitCells(counter, true).join("\n\n") + "\n";
const demo: Variable[] = [
  { name: "intro", inputs: ["md"], definition: "(md) => md`# SoundScript in a Lopecode module\n\nSoundScript is a strict subset of TypeScript (with JSX) for notebook cells: a cell is an exported function of its inputs, values are immutable, and state changes only inside \\`action(...)\\`. Its checker and toolchain live in \\`tools/lang-experiment/lite/\\` of lopecode-dev.\n\nThe cells \\`count\\`, \\`increment\\`, \\`clear\\` and \\`app\\` below are \\`tools/lang-experiment/lite/notebook/examples/04-counter.tsx\\`, compiled one cell at a time. Each one's definition is plain JS whose first comment is \\`/*{lang:\"ss\"}*/\\`, with the types kept as comments, so \\`source\\` recovers the typed cells from the definitions. \\`view\\` is an ordinary ojs cell that renders \\`app\\`: click *add one*.\n\n**Do not edit the SoundScript cells in this notebook.** The editor does not know the language yet: it shows the compiled JS, and saving a cell turns it into a broken ojs cell.`" },
  ...compiled,
  { name: "view", inputs: ["ss", "app"], definition: "function (ss, app) { return ss.mount(app, this); }" },
  { name: "expected", inputs: [], definition: `() => ${JSON.stringify(expected)}` },
  // private runtime fields, as editor-5 reads them: there is no import for a module's own variables
  { name: "source", inputs: ["ss", "@variable"], definition: "(ss, self) => ss.decompileModule([...self._module._runtime._variables].filter((v) => v._module === self._module).map((v) => v._definition.toString()))" },
  { name: "test_roundtrip", inputs: ["source", "expected"], definition: "(source, expected) => { if (source !== expected) throw new Error(`decompiled ${source.length} chars, expected ${expected.length}`); return `${source.length} chars, identical`; }" },
  { name: "test_counter", inputs: ["@variable", "increment", "clear"], definition: "async (self, increment, clear) => { const m = self._module; const changed = async (from) => { for (let i = 0; i < 600; i++) { const v = await m.value(\"count\"); if (v !== from) return v; await new Promise((r) => requestAnimationFrame(r)); } throw new Error(`count stayed ${from} for 600 frames`); }; const v0 = await m.value(\"count\"); increment(); const v1 = await changed(v0); clear(); const v2 = await changed(v1); if (v1 !== v0 + 1 || v2 !== 0) throw new Error(`${v0} -> ${v1} -> ${v2}`); return `${v0} -> ${v1} -> ${v2}`; }" },
  { name: "test_check", inputs: ["ss", "source"], definition: "(ss, source) => { const r = ss.checkSources({ cells: source, tsx: true }); const bad = r.cells.filter((c) => c.status !== \"ok\"); if (bad.length) throw new Error(bad.map((c) => c.name + \" \" + c.status).join(\", \")); return `${r.cells.length} of ${r.cells.length} cells ok`; }" },
];
const caps = [...new Set(compiled.flatMap((v) => v.inputs).filter((i) => /^ss_/.test(i)))];
const stdJs = moduleJs(STD, std, "", ["ss.js.gz"]);
const demoJs = moduleJs(DEMO, demo, loader(STD) + ["ss", ...caps].map((n) => importLine(STD, n)).join(""));

const block = (id: string, body: string, mime = "application/javascript", b64 = false) =>
  `<script id="${id}" \n  type="text/plain"\n${b64 ? '  data-encoding="base64"\n' : ""}  data-mime="${mime}"\n>\n${body}</script>`;
for (const [n, s] of [[STD, stdJs], [DEMO, demoJs]]) if (/<\/script/i.test(s)) throw new Error(`${n} contains a closing script tag`);

let html = readFileSync(join(ROOT, "lopecode/notebooks/quick_start.html"), "utf8");
const before = blockSpans(html).map((s) => s.id);
const host = findSpan(html, HOST)!;
html = html.slice(0, host.start) + [block(`${STD}/ss.js.gz`, gz, "application/gzip", true), block(STD, stdJs), block(DEMO, demoJs)].join("\n") + html.slice(host.end);
const conf = JSON.parse(blockContent(html, "bootconf.json")!);
conf.mains = conf.mains.map((m: string) => (m === HOST ? DEMO : m));
conf.hash = `#view=R100(S60(${DEMO}),S40(${STD}))`;
conf.headless = true;
const cs = findSpan(html, "bootconf.json")!;
const raw = html.slice(cs.start, cs.end);
html = html.slice(0, cs.start) + raw.slice(0, raw.indexOf(">") + 1) + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(cs.end);
html = html.replace(/<title>[^<]*<\/title>/, "<title>SoundScript in Lopecode</title>");
const after = new Set(blockSpans(html).map((s) => s.id));
const lost = before.filter((id) => id !== HOST && !after.has(id));
if (lost.length) throw new Error(`splice lost ${lost.join(", ")}`);
writeFileSync(OUT, html);
console.log(JSON.stringify({ out: OUT, bytes: Buffer.byteLength(html), bundle: js.length, demoVariables: demo.map((v) => v.name) }));
process.exit(0);
