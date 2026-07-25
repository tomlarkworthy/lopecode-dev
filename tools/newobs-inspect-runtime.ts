// With access-runtime re-pinned in flight, runtime-sdk sets window.__ojs_runtime, so we can
// introspect the live new.observablehq.com runtime and find out why the *next* failure
// ("Cannot read properties of undefined (reading 'json')") happens.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

await page.route("**/e1c39d41e8e944b0@939.js*", async (route) => {
  const res = await ctx.request.get(route.request().url().replace("@939.js", "@950.js"));
  await route.fulfill({
    status: res.status(),
    body: await res.body(),
    headers: { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" },
  });
});

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 30000));

const frame = page.frames().find((f) => f.url().includes("chat-worker"))!;
const out = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return { error: "no window.__ojs_runtime" };
  const vars = [...rt._variables];
  const byName = (n: string) => vars.filter((v: any) => v._name === n);
  const describe = (v: any) => ({
    name: v._name,
    value: typeof v._value,
    ctor: v._value?.constructor?.name,
    error: v._error?.message ?? v._error?.toString?.(),
  });

  const optionsFile = byName("optionsFile")[0];
  const report: any = {
    optionsFile: optionsFile ? describe(optionsFile) : null,
    editorModule: byName("editorModule").map(describe),
    thisModuleVars: byName("viewof editorModule").map(describe),
  };

  // which module owns optionsFile, and does it carry a per-notebook FileAttachment builtin?
  const m: any = optionsFile?._module;
  if (m) {
    report.module = {
      builtinKeys: [...(m._builtins?.keys?.() ?? [])],
      hasFA: !!m._builtins?.get?.("FileAttachment"),
      scopeSize: m._scope?.size,
    };
    const FA = m._builtins?.get?.("FileAttachment");
    if (FA) {
      // replicate @tomlarkworthy/fileattachments getFileAttachmentsMap
      let fileMap: any;
      const get = Map.prototype.get, has = Map.prototype.has;
      (Map.prototype as any).has = (Map.prototype as any).get = function (this: any) { fileMap = this; };
      try { FA(""); } catch {}
      Map.prototype.get = get; Map.prototype.has = has;
      report.capture = {
        captured: !!fileMap,
        keys: fileMap ? [...fileMap.keys()].slice(0, 10) : null,
      };
      try {
        report.directCall = String(FA("cell_options.json")?.name ?? "no name");
      } catch (e: any) {
        report.directCall = "throw: " + e.message;
      }
    }
  }

  // what does the editorModule variable actually hold, and is it the same module?
  const em = byName("editorModule")[0];
  report.sameModule = em && m ? em._value === m : null;
  if (em?._value) {
    const em2: any = em._value;
    report.editorModuleBuiltins = [...(em2._builtins?.keys?.() ?? [])];
  }
  return report;
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
