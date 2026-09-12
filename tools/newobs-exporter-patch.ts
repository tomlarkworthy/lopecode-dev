// In-flight test of an exporter-3 working-copy fix on a live Observable page: redefine the named
// cells from modules/@tomlarkworthy/exporter-3.js, then click Download and the `downloadable` anchor.
// usage: bun tools/newobs-exporter-patch.ts <url> [settleMs]   NO_PATCH=1 for the baseline, SAVE_DIR=… keeps html
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://observablehq.com/@tomlarkworthy/exporter-3";
const settle = Number(process.argv[3] ?? 25000);
// SRC=<file.js | export.html> reads cells from another compiled exporter-3 (an .html uses its
// @tomlarkworthy/exporter-3 block); CELLS=a,b,c picks cells by name instead of the default pid list.
const srcFile = process.env.SRC ?? "modules/@tomlarkworthy/exporter-3.js";
const raw = await Bun.file(srcFile).text();
const src = srcFile.endsWith(".html")
  ? raw.match(/<script id="@tomlarkworthy\/exporter-3"[^>]*>([\s\S]*?)<\/script>/)![1]
  : raw;
const cell = (pid: string) => {
  const start = src.indexOf(`\nconst ${pid} = `);
  if (start < 0) throw new Error(`no cell ${pid}`);
  const end = src.indexOf("\nconst ", start + 1);
  const body = src.slice(start + 1, end).replace(`const ${pid} = `, "").trim().replace(/;$/, "");
  if (!/^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(body)) throw new Error(`bad slice ${pid}`);
  return body;
};
const deps = (pid: string) => JSON.parse(src.match(new RegExp(`\\$def\\("${pid}", "[^"]+", (\\[[^\\]]*\\])`))![1]);
const pidOf = (name: string) => {
  const m = src.match(new RegExp(`\\$def\\("([^"]+)", "${name}", `));
  if (!m) throw new Error(`no $def for ${name} in ${srcFile}`);
  return m[1];
};
const patch = (process.env.CELLS
  ? process.env.CELLS.split(",").map((name) => ({ name, pid: pidOf(name) }))
  : [
    { name: "isNotebookKitModule", pid: "_1k9nbk2" },
    { name: "getSourceModule", pid: "_43zr7" },
    { name: "exportAnchor", pid: "_1w6fc3k" },
  ]).map((c) => ({ ...c, src: cell(c.pid), deps: deps(c.pid) }));

const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true })).newPage();
const log: string[] = [];
page.on("console", (m) => m.type() !== "debug" && log.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => log.push(`[pageerror] ${String(e).slice(0, 300)}`));
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(settle);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
if (!process.env.NO_PATCH) {
  console.log("patch:", await frame.evaluate((patch) => {
    const rt: any = (window as any).__ojs_runtime;
    const byName = (n: string) => [...rt._variables].find((v: any) => v._name === n);
    const mod = byName("getSourceModule")._module;
    const out: string[] = [];
    for (const c of patch) {
      const fn = (0, eval)(`(${c.src})`);
      const v = byName(c.name);
      if (v) { v.define(c.name, c.deps, fn); out.push(`redefined ${c.name}`); }
      else { mod.variable(true).define(c.name, c.deps, fn); out.push(`defined ${c.name}`); }
    }
    return out;
  }, patch));
  await page.waitForTimeout(8000);
}
const nk = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((v: any) => v._name === "isNotebookKitModule");
  const m = [...rt._variables].find((v: any) => v._name === "main" && v._value?._scope);
  return { isNotebookKitModule: v ? (typeof v._value === "function" && m ? v._value(m._value) : String(v._error ?? v._value)) : "absent" };
});
console.log(nk);
const results: any = {};
for (const [arm, loc] of [
  ["button", frame.locator(".moldbook-exporter button", { hasText: "Download" }).first()],
  ["anchor", frame.locator("a", { hasText: /^downloadable$/ }).first()],
] as const) {
  const dl = page.waitForEvent("download", { timeout: 90000 }).catch(() => null);
  const t0 = Date.now();
  await loc.scrollIntoViewIfNeeded();
  await loc.click();
  const d = await dl;
  if (!d) { results[arm] = "NO DOWNLOAD in 90s"; continue; }
  const txt = await Bun.file((await d.path())!).text();
  results[arm] = { ms: Date.now() - t0, file: d.suggestedFilename(), size: txt.length, ids: (txt.match(/<script id="/g) ?? []).length };
  if (process.env.SAVE_DIR) await Bun.write(`${process.env.SAVE_DIR}/${arm}.html`, txt);
}
console.log(JSON.stringify(results, null, 1));
console.log("=== LOG ===\n" + log.filter((l) => !/langApiRestored|React error|preload|keepalive:|doubleclick|ga-audiences|^\[log\] (notebookImport|module_def|modules|pageImport|resolve_modules|generate summary|submit_summary)/.test(l)).join("\n"));
await browser.close();
