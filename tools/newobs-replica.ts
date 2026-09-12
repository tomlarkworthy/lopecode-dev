// Offline replica of new.observablehq.com: load a page built by tools/newobs-replica-build.ts and
// answer its Observable imports with the bytes observablehq.com/api/import serves (cached in
// tools/newobs-fixtures/api-import, overridable from tools/newobs-replica/overrides).
// The page is served from https://<user>.static.observableusercontent.com/__replica/ via request
// routing, so isOnObservableCom() and document.baseURI match the live worker. LOCAL=1 serves it from
// http://localhost instead (a notebook-kit page off Observable).
// usage: bun tools/newobs-replica.ts <site-dir> <page.html> [dump|export|both] [settleMs]
//   OUT=<dir> writes dump.json / export.html. HEADED=1 to watch. OFFLINE=1 fails on cache miss.
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "fs";
import { dirname, join, resolve } from "path";

const [siteDir, pageName = "tomlarkworthy_exporter-3.html", mode = "both", settleArg] = process.argv.slice(2);
if (!siteDir) throw new Error("usage: bun tools/newobs-replica.ts <site-dir> <page.html> [dump|export|both] [settleMs]");
const settle = Number(settleArg ?? 20000);
const root = resolve(import.meta.dir, "..");
const site = resolve(siteDir);
const cacheDir = join(root, "tools/newobs-fixtures/api-import");
const overrideDir = join(root, "tools/newobs-replica/overrides");
const out = process.env.OUT ? resolve(process.env.OUT) : null;
if (out) mkdirSync(out, { recursive: true });

const importPath = (u: URL) => u.pathname.replace(/^\/(api\/import\/)?/, "").replace(/\.js$/, "");
async function apiImport(path: string): Promise<{ body: string; from: string }> {
  const override = join(overrideDir, `${path}.js`);
  if (existsSync(override)) return { body: await Bun.file(override).text(), from: "override" };
  const cached = join(cacheDir, `${path}.js`);
  if (existsSync(cached)) return { body: await Bun.file(cached).text(), from: "cache" };
  if (process.env.OFFLINE) throw new Error(`cache miss: ${path}`);
  const r = await fetch(`https://observablehq.com/api/import/${path}`, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`api/import ${path}: ${r.status}`);
  const body = await r.text();
  mkdirSync(dirname(cached), { recursive: true });
  await Bun.write(cached, body);
  return { body, from: "network" };
}
const js = { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" };
const typeOf = (p: string) => p.endsWith(".html") ? "text/html; charset=utf-8" : p.endsWith(".css") ? "text/css" : js["content-type"];

let server: any = null;
let pageUrl: string;
if (process.env.LOCAL) {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const p = decodeURIComponent(new URL(req.url).pathname).replace(/^\/__replica/, "");
      const f = Bun.file(join(site, p === "/" ? pageName : p));
      return (await f.exists()) ? new Response(f) : new Response("not found", { status: 404 });
    },
  });
  pageUrl = `http://localhost:${server.port}/__replica/${pageName}`;
} else {
  const html = await Bun.file(join(site, pageName)).text();
  const origin = html.match(/src="(https:\/\/[^/"]+)\/__replica\//)?.[1];
  if (!origin) throw new Error("page has no absolute __replica script src; rebuild with tools/newobs-replica-build.ts");
  pageUrl = `${origin}/__replica/${pageName}`;
}

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const log: string[] = [];
const served: string[] = [];
page.on("console", (m) => m.type() !== "debug" && log.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => log.push(`[pageerror] ${String(e.stack ?? e).slice(0, 1200)}`));
if (!process.env.LOCAL) {
  await page.route(/^https:\/\/[^/]+\.static\.observableusercontent\.com\/__replica\//, async (route) => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/__replica\//, "");
    const f = Bun.file(join(site, p));
    if (!(await f.exists())) return route.fulfill({ status: 404, body: "not found" });
    await route.fulfill({ body: Buffer.from(await f.arrayBuffer()), headers: { "content-type": typeOf(p), "access-control-allow-origin": "*" } });
  });
}
// api.observablehq.com/<x>.js?v=4 still serves the legacy compile (exporter-3 fetches the bootloader there);
// only observablehq.com/api/import serves the notebook-kit hybrid.
const legacyDir = join(root, "tools/newobs-fixtures/api-legacy");
async function apiLegacy(u: URL): Promise<{ body: string; from: string }> {
  const cached = join(legacyDir, `${u.pathname.replace(/^\//, "").replace(/\.js$/, "")}.js`);
  if (existsSync(cached)) return { body: await Bun.file(cached).text(), from: "legacy-cache" };
  if (process.env.OFFLINE) throw new Error(`cache miss: ${u.pathname}`);
  const r = await fetch(`https://api.observablehq.com${u.pathname}${u.search}`, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`api ${u.pathname}: ${r.status}`);
  const body = await r.text();
  mkdirSync(dirname(cached), { recursive: true });
  await Bun.write(cached, body);
  return { body, from: "legacy-network" };
}
await page.route(/^https:\/\/api\.observablehq\.com\/(?!document\/)/, async (route) => {
  const u = new URL(route.request().url());
  try {
    const { body, from } = await apiLegacy(u);
    served.push(`${from} ${u.pathname}`);
    await route.fulfill({ body, headers: js });
  } catch (e) {
    served.push(`FAIL ${u.pathname} ${e}`);
    await route.abort();
  }
});
await page.route(/^https:\/\/observablehq\.com\/api\/import\//, async (route) => {
  const path = importPath(new URL(route.request().url()));
  try {
    const { body, from } = await apiImport(path);
    served.push(`${from} ${path}`);
    await route.fulfill({ body, headers: js });
  } catch (e) {
    served.push(`FAIL ${path} ${e}`);
    await route.abort();
  }
});
await page.goto(pageUrl, { waitUntil: "load" });
await page.waitForTimeout(settle);

async function runEval() {
  // EVAL=<file>: the file holds an async function expression `async (rt) => …`, run in the page.
  // EVAL_AFTER=1 runs it after the export instead of before.
  const src = await Bun.file(process.env.EVAL).text();
  const res = await page.evaluate(async (src) => {
    try { return await (0, eval)(`(${src})`)((window as any).__ojs_runtime); }
    catch (e: any) { return { evalError: String(e?.stack ?? e) }; }
  }, src);
  console.log("eval:", JSON.stringify(res, null, 1));
  if (out) await Bun.write(join(out, "eval.json"), JSON.stringify(res, null, 1));
}
if (process.env.EVAL && !process.env.EVAL_AFTER) await runEval();
if (mode === "dump" || mode === "both") {
  const dump = await page.evaluate(() => {
    const rt: any = (window as any).__ojs_runtime;
    if (!rt) return { error: "no __ojs_runtime" };
    const val = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._value !== undefined)?._value;
    const main = val("main");
    const [isModuleVar, isDynamicVar, isImportBridged, isLiveImport] =
      ["isModuleVar", "isDynamicVar", "isImportBridged", "isLiveImport"].map(val);
    const modName = new Map<any, string>();
    for (const v of rt._variables) if (typeof v._name === "string" && v._name.startsWith("module ") && v._value) modName.set(v._value, v._name);
    const vars = [...rt._variables].filter((v: any) => v._module === main);
    return {
      runtimeCtor: rt.constructor?.name, count: vars.length, notebook_name: val("notebook_name"),
      builtins: [...(main?._builtins?.keys?.() ?? [])],
      vars: vars.map((v: any) => ({
        name: v._name, type: v._type,
        inputs: v._inputs.map((i: any) => i._module === main ? i._name : `${i._name}@${i._module === rt._builtin ? "builtin" : modName.get(i._module) ?? "other"}`),
        cls: [isModuleVar?.(v) && "module", isDynamicVar?.(v) && "dynamic", isImportBridged?.(v) && "bridged", isLiveImport?.(v) && "live"].filter(Boolean).join(","),
        def: String(v._definition).slice(0, 400),
      })),
    };
  });
  if (out) await Bun.write(join(out, "dump.json"), JSON.stringify(dump, null, 1));
  console.log("dump:", (dump as any).error ?? `${(dump as any).count} vars in main, notebook_name=${(dump as any).notebook_name}`);
}
if (mode === "export" || mode === "both") {
  const btn = page.locator(".moldbook-exporter button", { hasText: "Download" }).first();
  const dl = page.waitForEvent("download", { timeout: 90000 }).catch(() => null);
  const t0 = Date.now();
  await btn.click({ timeout: 10000 }).catch((e) => log.push(`[harness] click failed ${e}`));
  const d = await dl;
  if (d) {
    const txt = await Bun.file((await d.path())!).text();
    console.log(`export: ${txt.length} bytes, ${(txt.match(/<script id="/g) ?? []).length} blocks, ${Date.now() - t0}ms`);
    if (out) await Bun.write(join(out, "export.html"), txt);
  } else console.log("export: NO DOWNLOAD in 90s");
}
if (process.env.EVAL && process.env.EVAL_AFTER) await runEval();
console.log("=== IMPORTS ===\n" + served.join("\n"));
console.log("=== LOG ===\n" + log.filter((l) => !/langApiRestored|keepalive:|^\[log\] (notebookImport|module_def|modules|pageImport|resolve_modules|generate summary|submit_summary)/.test(l)).join("\n"));
await browser.close();
server?.stop();
