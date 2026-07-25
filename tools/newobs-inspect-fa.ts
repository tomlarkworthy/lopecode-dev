// What does FileAttachment look like for a notebook VIEWED on new.observablehq.com?
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 28000));
const frame = page.frames().find((f) => f.url().includes("chat-worker"))!;
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return { error: "no __ojs_runtime" };
  const out: any = {};
  const bv = rt._builtin?._scope?.get("FileAttachment");
  out.builtinVar = bv ? { hasValue: bv._value !== undefined, type: typeof bv._value } : null;
  const FA = bv?._value;
  out.FAtype = typeof FA;
  if (typeof FA === "function") {
    let fileMap: any;
    const g = Map.prototype.get, h = Map.prototype.has;
    (Map.prototype as any).has = (Map.prototype as any).get = function (this: any) { fileMap = this; };
    try { FA(""); } catch {}
    Map.prototype.get = g; Map.prototype.has = h;
    out.captureWorks = !!fileMap;
    out.keys = fileMap ? [...fileMap.keys()].slice(0, 8) : null;
    for (const n of ["cell_options.json", "./cell_options.json"]) {
      try { const f: any = FA(n); out["call:" + n] = { name: f?.name, href: (f?.href ?? "").slice(0, 60) }; }
      catch (e: any) { out["call:" + n] = "throw: " + e.message; }
    }
  }
  // any module in the runtime with a FileAttachment module-builtin?
  const mods = new Set<any>([...rt._variables].map((v: any) => v._module));
  out.modulesWithFAbuiltin = [...mods].filter((m: any) => m?._builtins?.has?.("FileAttachment")).length;
  out.moduleCount = mods.size;
  return out;
}), null, 2));
await browser.close();
