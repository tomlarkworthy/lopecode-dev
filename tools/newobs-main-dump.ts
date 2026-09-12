// Dump the viewed notebook's main-module variables as exporter-3 sees them: name, inputs,
// exporter-3's own classification, and the definition head.
// usage: bun tools/newobs-main-dump.ts <url> [settleMs] > out.json
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://observablehq.com/@tomlarkworthy/exporter-3";
const settle = Number(process.argv[3] ?? 25000);
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(settle);
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
const out = await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const val = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._value !== undefined)?._value;
  const main = val("main");
  const [isModuleVar, isDynamicVar, isImportBridged, isLiveImport] =
    ["isModuleVar", "isDynamicVar", "isImportBridged", "isLiveImport"].map(val);
  const modName = new Map<any, string>();
  for (const v of rt._variables) if (typeof v._name === "string" && v._name.startsWith("module ") && v._value) modName.set(v._value, v._name);
  const vars = [...rt._variables].filter((v: any) => v._module === main);
  return {
    runtimeCtor: rt.constructor?.name, count: vars.length,
    builtins: [...(main._builtins?.keys?.() ?? [])],
    vars: vars.map((v: any) => ({
      name: v._name, type: v._type,
      inputs: v._inputs.map((i: any) => i._module === main ? i._name : `${i._name}@${i._module === rt._builtin ? "builtin" : modName.get(i._module) ?? "other"}`),
      cls: [isModuleVar?.(v) && "module", isDynamicVar?.(v) && "dynamic", isImportBridged?.(v) && "bridged", isLiveImport?.(v) && "live"].filter(Boolean).join(","),
      def: String(v._definition).slice(0, 400),
    })),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
