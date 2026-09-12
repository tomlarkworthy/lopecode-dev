// Click exporter-3's Download button on an Observable-hosted page; report the download,
// errors, and the state of the export pipeline variables.
// usage: bun tools/newobs-exporter-click.ts <url> [settleMs] [clickWaitMs]
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://observablehq.com/@tomlarkworthy/exporter-3";
const settle = Number(process.argv[3] ?? 25000);
const wait = Number(process.argv[4] ?? 60000);
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
const page = await ctx.newPage();
const log: string[] = [];
page.on("console", (m) => log.push(`[${m.type()}] ${m.text().slice(0, 400)}`));
page.on("pageerror", (e) => log.push(`[pageerror] ${String(e.stack ?? e).slice(0, 800)}`));
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(settle);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const btn = frame.locator(".moldbook-exporter button", { hasText: "Download" }).first();
console.log("buttons:", await frame.locator(".moldbook-exporter button").allTextContents());
const dl = page.waitForEvent("download", { timeout: wait }).catch((e) => null);
const t0 = Date.now();
await btn.scrollIntoViewIfNeeded();
await btn.click();
const d = await dl;
console.log("download:", d ? `${d.suggestedFilename()} after ${Date.now() - t0}ms` : `NONE within ${wait}ms`);
if (d) {
  const p = await d.path();
  const txt = p ? await Bun.file(p).text() : "";
  console.log("download size:", txt.length, "scripts:", (txt.match(/<script id="/g) ?? []).length);
  if (process.env.SAVE) await Bun.write(process.env.SAVE, txt);
}
const state = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return "no __ojs_runtime";
  const want = new Set(["task", "task_runtime", "moduleNames", "included_modules", "module_specs", "book", "report",
    "tomlarkworthy_exporter_task", "notebook_name", "exporter_module", "moduleMap", "cellMap", "resolve_modules", "summary"]);
  const out: any[] = [];
  for (const v of rt._variables) {
    if (!want.has(v._name)) continue;
    const val = v._value;
    out.push({
      name: v._name, reachable: v._reachable, err: v._error ? String(v._error?.message ?? v._error).slice(0, 300) : null,
      value: val === undefined ? "undefined" : typeof val === "string" ? val.slice(0, 80) : val?.constructor?.name ?? typeof val,
      inputs: v._inputs.map((i: any) => i._name).join(","),
    });
  }
  return out;
});
console.log(JSON.stringify(state, null, 1));
const feedback = await frame.locator(".moldbook-exporter textarea, .moldbook-exporter .observablehq--error").allTextContents().catch(() => []);
console.log("feedback:", feedback.map((s) => s.slice(0, 500)));
console.log("=== LOG ===\n" + log.filter((l) => !l.startsWith("[debug]")).join("\n"));
await browser.close();
