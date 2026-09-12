// A/B on a live Observable page: export the viewed notebook from (a) the live main module and
// (b) a fresh legacy Runtime loaded from api.observablehq.com/<notebook>.js?v=4.
// usage: bun tools/newobs-exporter-freshruntime.ts <url> [settleMs]   SAVE_DIR=… to keep the html
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://observablehq.com/@tomlarkworthy/exporter-3";
const settle = Number(process.argv[3] ?? 25000);
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const log: string[] = [];
page.on("console", (m) => m.type() !== "debug" && log.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => log.push(`[pageerror] ${String(e).slice(0, 300)}`));
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(settle);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const res = await frame.evaluate(async (arms: string[]) => {
  const rt: any = (window as any).__ojs_runtime;
  const find = (name: string) => [...rt._variables].find((v: any) => v._name === name && v._value !== undefined);
  const race = (p: Promise<any>, ms: number) => Promise.race([
    p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e: String(e?.stack ?? e).slice(0, 600) })),
    new Promise((r) => setTimeout(() => r({ ok: false, e: `HUNG ${ms}ms` }), ms)),
  ]) as Promise<any>;
  const nb = find("notebook_name")?._value;
  const getSourceModule = find("getSourceModule")?._value;
  const exportToHTML = find("exportToHTML")?._value;
  const out: any = { notebook_name: nb, have: { getSourceModule: !!getSourceModule, exportToHTML: !!exportToHTML } };
  for (const arm of arms) {
    const t0 = performance.now();
    const src = await race(getSourceModule(arm === "live" ? {} : { source: "a notebook url", notebook_url: { child: nb } }), 30000);
    if (!src.ok) { out[arm] = { stage: "getSourceModule", ...src }; continue; }
    const { notebook, module, runtime } = src.v;
    const r = await race(exportToHTML({ mains: new Map([[notebook, module]]), runtime, options: { title: notebook } }), 90000);
    const html = r.ok ? (r.v?.source ?? r.v) : null;
    out[arm] = r.ok
      ? { ms: Math.round(performance.now() - t0), size: html.length, ids: [...html.matchAll(/<script id="([^"]+)"/g)].map((m) => m[1]), html }
      : { stage: "exportToHTML", ...r };
  }
  return out;
}, (process.env.ARMS ?? "fresh,live").split(","));
for (const arm of ["fresh", "live"]) {
  const a = res[arm];
  if (a?.html && process.env.SAVE_DIR) await Bun.write(`${process.env.SAVE_DIR}/${arm}.html`, a.html);
  if (a?.html) { a.idCount = a.ids.length; a.ids = a.ids.join(" "); delete a.html; }
}
console.log(JSON.stringify(res, null, 1));
console.log("=== LOG ===\n" + log.filter((l) => !/langApiRestored|React error|preload|keepalive:|^\[log\] (notebookImport|module_def|modules|pageImport|resolve_modules|generate summary|submit_summary)/.test(l)).join("\n"));
await browser.close();
