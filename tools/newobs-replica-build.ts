// Build an offline replica page of a notebook as new.observablehq.com views it: every cell of the
// Observable document transpiled by vendored notebook-kit and defined with its runtime `define`,
// the same calls vendor/notebook-kit/src/vite/observable.ts emits (no Vite, so cell imports stay runtime imports).
// usage: bun tools/newobs-replica-build.ts @user/slug [outDir=tools/newobs-replica/site]
//   OVERRIDE=<json {cellName: source}> replaces named cells' source before transpiling.
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { toNotebook } from "../vendor/notebook-kit/src/lib/notebook.ts";
import { transpile } from "../vendor/notebook-kit/src/javascript/transpile.ts";

const [slug, outArg] = process.argv.slice(2);
if (!slug) throw new Error("usage: bun tools/newobs-replica-build.ts @user/slug [outDir]");
const root = resolve(import.meta.dir, "..");
const out = resolve(outArg ?? join(root, "tools/newobs-replica/site"));
const docCache = join(root, "tools/newobs-fixtures/documents", `${slug}.json`);
mkdirSync(join(docCache, ".."), { recursive: true });
mkdirSync(out, { recursive: true });
if (!existsSync(join(out, "rt/index.js"))) throw new Error(`missing ${out}/rt/index.js — bun build vendor/notebook-kit/src/runtime/index.ts first`);

let doc: any;
if (existsSync(docCache) && !process.env.REFRESH) doc = await Bun.file(docCache).json();
else {
  const r = await fetch(`https://api.observablehq.com/document/${slug}`);
  if (!r.ok) throw new Error(`document ${slug}: ${r.status}`);
  doc = await r.json();
  await Bun.write(docCache, JSON.stringify(doc));
}
// OVERRIDE=*.ojs: cells separated by `//// name` header lines.
const parseOjs = (txt: string) => Object.fromEntries(txt.split(/^\/\/\/\/ +/m).filter((s) => s.trim())
  .map((s) => { const nl = s.indexOf("\n"); return [s.slice(0, nl).trim(), s.slice(nl + 1).trim()]; }));
// Comma-separated OVERRIDE files merge left to right.
const overrides: Record<string, string> = {};
for (const f of (process.env.OVERRIDE ?? "").split(",").filter(Boolean))
  Object.assign(overrides, f.endsWith(".ojs") ? parseOjs(await Bun.file(f).text()) : await Bun.file(f).json());
// Observable documents spell 1.0-dialect cells `js`, which notebook-kit transpiles as `ojs`.
// KEEP_JS=1 keeps an explicit `js` mode (notebook-kit 2.0 dialect, multi-output via declarations)
// for locally authored fixtures; author 1.0 cells as `ojs` explicitly in those.
const nodes = doc.nodes.map((n: any) => ({ ...n, mode: n.mode === "js" && !process.env.KEEP_JS ? "ojs" : n.mode }));
const used = new Set<string>();
for (const n of nodes) {
  const name = String(n.value).match(/^\s*(?:viewof\s+|mutable\s+)?([A-Za-z_$][\w$]*)\s*=/)?.[1];
  if (name && overrides[name] != null) { n.value = overrides[name]; used.add(name); }
}
// Override names with no matching cell are appended as new cells.
let nextId = Math.max(...nodes.map((n: any) => n.id)) + 1;
for (const k of Object.keys(overrides).filter((k) => !used.has(k))) {
  nodes.push({ id: nextId++, value: overrides[k], mode: "ojs", pinned: false });
  used.add(k);
}

const notebook = toNotebook({ title: doc.title, cells: nodes });
const divs: string[] = [];
const defs: string[] = [];
let failed = 0;
for (const cell of notebook.cells) {
  divs.push(`<div id="cell-${cell.id}"></div>`);
  let t;
  try { t = transpile(cell, {}); }
  catch (e) { failed++; console.warn(`transpile failed cell ${cell.id}: ${e}`); continue; }
  // Live, the viewed notebook imports through observablehq.com/api/import, not api.observablehq.com.
  const body = t.body.replace(/import\("https:\/\/api\.observablehq\.com\/([^"]+?)\.js\?v=4"\)/g,
    (_, p) => `import(new URL(${JSON.stringify(`/api/import/${p}`)}, document.baseURI))`);
  defs.push(`
define({root: document.getElementById("cell-${cell.id}"), expanded: [], variables: []}, {
  id: ${cell.id},
  body: ${body},
  inputs: ${JSON.stringify(t.inputs)},
  outputs: ${JSON.stringify(t.outputs)},
  output: ${JSON.stringify(t.output)},
  display: ${cell.mode === "js" || cell.mode === "ts" || cell.mode === "sql"},
  assets: undefined,
  autodisplay: ${t.autodisplay},
  autoview: ${t.autoview},
  automutable: ${t.automutable}
});`);
}
const page = slug.replace(/^@/, "").replace("/", "_") + ".html";
// Live, the worker lives on <user>.static.observableusercontent.com with baseURI on observablehq.com.
const owner = slug.match(/^@([^/]+)\//)?.[1] ?? "d";
const replicaOrigin = `https://${owner}.static.observableusercontent.com`;
// FILES=<json [{name, path, mimeType}]>: register viewed-notebook attachments, as the live page does;
// a relative path is served from <outDir>/files/.
const files: { name: string; path: string; mimeType?: string }[] = process.env.FILES ? JSON.parse(process.env.FILES) : [];
const registrations = files.map((f) => `registerFile(${JSON.stringify(f.name)}, ${JSON.stringify({ path: /^https?:/.test(f.path) ? f.path : `${replicaOrigin}/__replica/files/${f.path}`, mimeType: f.mimeType })});`);
// Live, runtime-sdk's `runtime` cell sets window.__ojs_runtime; notebook-kit itself never does.
// The replica sets it from the runtime module's own export so probes can read the graph.
await Bun.write(join(out, "cells.js"), `import {define, registerFile, runtime, main} from "./rt/index.js";
window.__ojs_runtime = runtime; window.__ojs_main = main;
${registrations.join("\n")}\n${defs.join("\n")}\n`);
await Bun.write(join(out, page), `<!doctype html>
<html><head><meta charset="utf-8"><base href="https://observablehq.com/${slug}"><title>${doc.title} (replica)</title>
<link rel="stylesheet" href="${replicaOrigin}/__replica/rt/index.css"></head>
<body><main>
${divs.join("\n")}
</main><script type="module" src="${replicaOrigin}/__replica/cells.js"></script></body></html>
`);
console.log(`${page}: ${defs.length} cells defined, ${failed} failed, document v${doc.version}${used.size ? `, overrides: ${[...used].join(",")}` : ""}`);
