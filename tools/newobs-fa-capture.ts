// What does the live new-site runtime.fileAttachments look like, and does exporter-3's
// getFileAttachments find js-toolchain's attachment there?
//   CHROME_BIN=... HEADED=1 bun tools/newobs-fa-capture.ts
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: !process.env.HEADED, executablePath: process.env.CHROME_BIN,
  ignoreDefaultArgs: ["--enable-automation"], args: ["--disable-blink-features=AutomationControlled"] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();
await page.goto("https://new.observablehq.com/@tomlarkworthy/exporter-3", { waitUntil: "domcontentloaded", timeout: 120000 });
let fr: any = null;
for (let i = 0; i < 120 && !fr; i++) {
  for (const f of page.frames()) { try { if (await f.evaluate(() => !!document.querySelector(".moldbook-exporter"))) { fr = f; break; } } catch {} }
  if (!fr) { await page.mouse.wheel(0, 900); await page.waitForTimeout(1000); }
}
await fr.evaluate((src: string) => { (window as any).__PATCH = (0, eval)("(" + src + ")"); }, await Bun.file("tools/newobs-getFileAttachments-patch.js").text());
const r = await fr.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const gfa = vars.find((v: any) => v._name === "getFileAttachments" && v._value)?._value;
  const nk = vars.find((v: any) => v._name === "nkRuntime");
  const m = nk?._module;
  const fa = m?._builtins?.get("FileAttachment");
  const got = gfa && m ? gfa(m) : "no gfa/module";
  let p: any; try { p = (window as any).__PATCH(m); } catch (e: any) { p = "PATCH THREW " + e.message; }
  let fa2: any; try { fa2 = typeof fa === "function" ? fa("") : "fa is " + typeof fa; } catch (e: any) { fa2 = "threw " + e.message; }
  return {
    patchResult: p instanceof Map ? [...p].map(([k, v]: any) => [k, JSON.stringify(v).slice(0, 150)]) : String(p),
    thunkReturns: typeof fa2 + " " + String(fa2).slice(0, 200),
    gfaCount: vars.filter((v: any) => v._name === "getFileAttachments").length,
    nkCount: vars.filter((v: any) => v._name === "nkRuntime").length, faShape: fa == null ? String(fa) : { type: typeof fa, ctor: fa?.constructor?.name, own: Object.getOwnPropertyNames(fa).slice(0, 20), proto: Object.getOwnPropertyNames(Object.getPrototypeOf(fa) ?? {}).slice(0, 20), isPromise: typeof fa?.then === "function", defn: String(fa?._definition ?? "").slice(0, 200), value: typeof fa?._value }, builtinKeys: [...(m?._builtins?.keys() ?? [])],
    rtFileAttachmentsSrc: String(rt.fileAttachments).slice(0, 600),
    builtinFASrc: String(fa).slice(0, 300),
    getFileAttachmentsResult: got === undefined ? "undefined" : (got instanceof Map ? { map: [...got.keys()] } : String(got).slice(0, 200)),
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
