#!/usr/bin/env bun
// Spike: distil a Cloud Brain service from module source with no browser.
//   bun distil.ts bun|quickjs <module> <cell> <emitted.json>
// Loads the module and the modules it imports into an Observable runtime, computes the service cell,
// runs cloudflare-iac's own emit, and compares the parts and hash with a record emitted in a browser.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { PRELUDE, MAIN } from "./sandbox.ts";

const [mode = "bun", moduleName = "@tomlarkworthy/brain-metrics", cell = "metrics_service", record = "metrics.json"] = process.argv.slice(2);
const ROOT = resolve(import.meta.dir, "../../..");
const mods: Record<string, string> = JSON.parse(readFileSync(resolve(import.meta.dir, "mods.json"), "utf8"));
const expected = JSON.parse(readFileSync(resolve(ROOT, "tools/cloud-brain/.emitted", record), "utf8"));
const html = readFileSync(resolve(ROOT, "lopebooks/notebooks/@tomlarkworthy_cloud-brain.html"), "utf8");

// The module under distillation is the source its Worker carries, so the output can be compared byte for byte.
const sources: Record<string, string> = { ...mods, [moduleName]: expected.source.text };

const attachment = (id: string) => {
  const at = html.indexOf(`<script id="${id}"`);
  if (at < 0) throw new Error("no attachment " + id);
  const open = html.indexOf(">", at) + 1;
  return html.slice(open, html.indexOf("</script>", open));
};

const stubs: Record<string, string> = {
  "@tomlarkworthy/runtime-sdk": `export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("runtime")).define("runtime", [], () => runtime); return main; }`,
  "@tomlarkworthy/exporter-3": `export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("exportModuleJS")).define("exportModuleJS", [], () => async (name) => ({ source: __hostCall("source", name) })); return main; }`,
  "@tomlarkworthy/acorn-8-11-3": `import * as acorn from "acorn"; import * as acorn_walk from "acorn-walk";
export default function define(runtime, observer) { const main = runtime.module(); main.variable(observer("acorn")).define("acorn", [], () => acorn); main.variable(observer("acorn_walk")).define("acorn_walk", [], () => acorn_walk); return main; }`
};

const blobs = new Map<string, string>();
const rec: any = { modules: {}, content: {}, sources: {} };
const loaded: string[] = [];
const load0 = (spec: string): string => {
  loaded.push(spec);
  if (spec === "observable-runtime") return readFileSync(resolve(import.meta.dir, "runtime.bundle.js"), "utf8");
  if (spec === "acorn") return readFileSync(resolve(ROOT, "node_modules/acorn/dist/acorn.mjs"), "utf8");
  if (spec === "acorn-walk") return readFileSync(resolve(ROOT, "node_modules/acorn-walk/dist/walk.mjs"), "utf8");
  if (spec === "spike:main") return MAIN;
  if (spec.startsWith("blob:")) return blobs.get(spec)!;
  const m = /^\/(@[^/]+\/[^/.]+)\.js(\?.*)?$/.exec(spec);
  if (m) {
    if (stubs[m[1]]) return stubs[m[1]];
    if (sources[m[1]] != null) return sources[m[1]];
  }
  throw new Error("cannot load " + spec);
};

const load = (spec: string): string => { const text = load0(spec); if (!spec.startsWith("blob:") && spec !== "spike:main") rec.modules[spec] = text; return text; };

const hostCall = (name: string, arg: string): string => {
  if (name === "content") return (rec.content[arg] = attachment(decodeURIComponent(arg)));
  if (name === "register") { const url = "blob:spike/" + blobs.size; blobs.set(url, arg); return url; }
  if (name === "blobText") return blobs.get(arg)!;
  if (name === "sha256hex") return createHash("sha256").update(Buffer.from(arg, "hex")).digest("hex");
  if (name === "source") return (rec.sources[arg] = sources[arg]);
  if (name === "log") { console.error("[sandbox]", arg); return ""; }
  throw new Error("no host call " + name);
};

const compare = (out: any, ms: number) => {
  const rows = expected.parts.map((p: any) => {
    const q = out.parts.find((x: any) => x.path === p.path);
    return `${p.path.padEnd(14)} ${String(p.text.length).padStart(6)} bytes  ${q && q.text === p.text ? "identical" : q ? "DIFFERS (" + q.text.length + ")" : "MISSING"}`;
  });
  console.log(`${mode}: ${moduleName} ${cell}  ${Math.round(ms)} ms, ${out.variables} variables, ${loaded.length} modules loaded`);
  console.log(rows.join("\n"));
  console.log(`meta           ${JSON.stringify(out.meta) === JSON.stringify(expected.meta) ? "identical" : "DIFFERS"}`);
  console.log(`hash           ${out.hash.slice(0, 12)}  browser ${expected.hash.slice(0, 12)}  ${out.hash === expected.hash ? "identical" : "DIFFERS"}`);
  console.log("loaded:", loaded.filter((s) => s.startsWith("/@")).map((s) => s.slice(1).replace(/\.js.*$/, "")).join(" "));
};

if (mode === "bun") {
  (globalThis as any).__hostCall = hostCall;
  Bun.plugin({
    name: "spike",
    setup(b) {
      b.onResolve({ filter: /^(\/@|blob:|observable-runtime$|acorn$|acorn-walk$|spike:)/ }, (a) => ({ path: a.path, namespace: "spike" }));
      b.onLoad({ filter: /.*/, namespace: "spike" }, (a) => ({ contents: load(a.path), loader: "js" }));
    }
  });
  (0, eval)(PRELUDE(true));
  const t = performance.now();
  const { distil } = await import("spike:main");
  compare(JSON.parse(await distil(moduleName, cell)), performance.now() - t);
} else {
  const { getQuickJS } = await import("quickjs-emscripten");
  const QuickJS = await getQuickJS();
  const rt = QuickJS.newRuntime();
  rt.setMemoryLimit(256 * 1024 * 1024);
  rt.setMaxStackSize(4 * 1024 * 1024);
  rt.setModuleLoader((name) => load(name), (_base, name) => name);
  const vm = rt.newContext();
  vm.newFunction("__hostCall", (a, b) => vm.newString(hostCall(vm.getString(a), vm.getString(b)))).consume((f) => vm.setProp(vm.global, "__hostCall", f));
  const run = (code: string, file: string, type: "global" | "module") => {
    const r = vm.evalCode(code, file, { type });
    if (r.error) { const e = vm.dump(r.error); r.error.dispose(); throw new Error(file + ": " + JSON.stringify(e)); }
    r.value.dispose();
  };
  const t = performance.now();
  run(PRELUDE(false), "prelude.js", "global");
  run(`import { distil } from "spike:main"; distil(${JSON.stringify(moduleName)}, ${JSON.stringify(cell)}).then((v) => { globalThis.__result = v; }, (e) => { globalThis.__error = String(e && e.message) + " | input: " + String(e && e.input) + " | " + String(e && e.stack); });`, "entry.js", "module");
  let jobs = 0;
  for (;;) {
    const p = rt.executePendingJobs();
    if (p.error) { const e = vm.dump(p.error); p.error.dispose(); throw new Error("job: " + JSON.stringify(e)); }
    jobs += p.value;
    if (!p.value) break;
  }
  const read = (k: string) => vm.getProp(vm.global, k).consume((h) => vm.dump(h));
  const err = read("__error"), res = read("__result");
  if (err) throw new Error("sandbox: " + err);
  if (!res) throw new Error(`sandbox finished with no result after ${jobs} jobs`);
  const ms = performance.now() - t;
  compare(JSON.parse(res), ms);
  console.log(`jobs ${jobs}, memory ${rt.dumpMemoryUsage().split("\n").find((l) => /memory used/.test(l)) || "?"}`);
}

if (process.env.PACK) {
  const { existsSync, writeFileSync } = await import("node:fs");
  const f = resolve(import.meta.dir, "data.json");
  const d = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { modules: {}, content: {}, sources: {}, services: {} };
  Object.assign(d.modules, rec.modules); Object.assign(d.content, rec.content);
  // The service's own module is loaded from the source its Worker carries, so it is kept per service.
  delete d.modules["/" + moduleName + ".js?v=4"];
  d.services[record.replace(".json", "")] = { module: moduleName, cell, hash: expected.hash, source: expected.source.text };
  writeFileSync(f, JSON.stringify(d));
}
