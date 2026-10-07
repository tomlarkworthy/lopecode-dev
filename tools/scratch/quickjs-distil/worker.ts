// Spike: the distiller inside a Cloudflare Worker. GET /?svc=metrics distils that service once.
import { newQuickJSWASMModuleFromVariant, newVariant } from "quickjs-emscripten-core";
import baseVariant from "@jitl/quickjs-wasmfile-release-sync";
import { sha256hex } from "./sha256.ts";
// @ts-ignore
import wasmModule from "./quickjs.wasm";
import data from "./data.json";
import { PRELUDE, MAIN } from "./sandbox.ts";

const d: any = data;
let quickjs: any;

const distil = async (svc: string) => {
  const s = d.services[svc];
  if (!s) throw new Error("no service " + svc);
  quickjs ??= await newQuickJSWASMModuleFromVariant(newVariant(baseVariant as any, { wasmModule }));
  const blobs = new Map<string, string>();
  const load = (spec: string): string => {
    if (spec === "spike:main") return MAIN;
    if (spec.startsWith("blob:")) return blobs.get(spec)!;
    if (spec === "/" + s.module + ".js?v=4") return s.source;
    if (d.modules[spec] != null) return d.modules[spec];
    throw new Error("cannot load " + spec);
  };
  const hostCall = (name: string, arg: string): string => {
    if (name === "content") return d.content[arg];
    if (name === "register") { const url = "blob:spike/" + blobs.size; blobs.set(url, arg); return url; }
    if (name === "blobText") return blobs.get(arg)!;
    if (name === "sha256hex") return sha256hex(arg);
    if (name === "source") return arg === s.module ? s.source : "";
    if (name === "log") return "";
    throw new Error("no host call " + name);
  };
  const rt = quickjs.newRuntime();
  try {
    rt.setMemoryLimit(64 * 1024 * 1024);
    rt.setMaxStackSize(1024 * 1024);
    rt.setModuleLoader((name: string) => load(name), (_b: string, name: string) => name);
    const vm = rt.newContext();
    try {
      vm.newFunction("__hostCall", (a: any, b: any) => vm.newString(hostCall(vm.getString(a), vm.getString(b)))).consume((f: any) => vm.setProp(vm.global, "__hostCall", f));
      const run = (code: string, file: string, type: "global" | "module") => {
        const r = vm.evalCode(code, file, { type });
        if (r.error) { const e = vm.dump(r.error); r.error.dispose(); throw new Error(file + ": " + JSON.stringify(e)); }
        r.value.dispose();
      };
      run(PRELUDE(false), "prelude.js", "global");
      run(`import { distil } from "spike:main"; distil(${JSON.stringify(s.module)}, ${JSON.stringify(s.cell)}).then((v) => { globalThis.__result = v; }, (e) => { globalThis.__error = String(e && e.message) + " | " + String(e && e.stack); });`, "entry.js", "module");
      let jobs = 0;
      for (;;) {
        const p = rt.executePendingJobs();
        if (p.error) { const e = vm.dump(p.error); p.error.dispose(); throw new Error("job: " + JSON.stringify(e)); }
        jobs += p.value;
        if (!p.value) break;
      }
      const read = (k: string) => vm.getProp(vm.global, k).consume((h: any) => vm.dump(h));
      const err = read("__error"), res = read("__result");
      if (err) throw new Error("sandbox: " + err);
      if (!res) throw new Error("no result after " + jobs + " jobs");
      const out = JSON.parse(res);
      return { svc, hash: out.hash.slice(0, 12), expected: s.hash.slice(0, 12), identical: out.hash === s.hash, parts: out.parts.map((p: any) => p.path + " " + p.text.length), jobs };
    } finally { vm.dispose(); }
  } finally { rt.dispose(); }
};

export default {
  async fetch(request: Request) {
    const svc = new URL(request.url).searchParams.get("svc") || "";
    if (!svc) return Response.json({ services: Object.keys(d.services) });
    try {
      return Response.json(await distil(svc));
    } catch (e: any) {
      return Response.json({ svc, error: String((e && e.message) || e).slice(0, 600) }, { status: 500 });
    }
  }
};
