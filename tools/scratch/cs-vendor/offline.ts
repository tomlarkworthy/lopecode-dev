// Boot the codestrate with the network off: Edit, open md/js/css fragments, check Monaco + workers + fonts.
import { chromium } from "playwright";
const nb = process.argv[2]!, out = process.argv[3]!, offline = process.argv[4] !== "online";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1400, height: 900 } });
const failed: string[] = [], ext: string[] = [];
c.on("request", (r) => { if (!/^(file|blob|data|about)/.test(r.url())) ext.push(r.url()); });
c.on("requestfailed", (r) => failed.push(r.url().slice(0, 60) + " " + r.failure()?.errorText + " " + r.resourceType() + " frame=" + (r.frame()?.url?.() ?? "").slice(0, 30) + " " + (r.frame()?.parentFrame() ? "child" : "top")));
const p = await c.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[" + m.type() + "]", m.text().slice(0, 200)); });
await p.goto(`file://${nb}`);
if (offline) await c.setOffline(true);
const t0 = Date.now();
const frame = await (await p.locator("iframe").first().elementHandle())!.contentFrame();
await frame!.locator("#cauldron-edit-button").waitFor({ timeout: 60000 });
console.log("Edit button after", Date.now() - t0, "ms");
await p.waitForTimeout(2000);
await frame!.locator("#cauldron-edit-button").click();
await p.waitForTimeout(6000);
for (const id of ["intro", "counter", "style"]) {
  const item = frame!.locator(`text=${id}`).first();
  if (await item.count()) { await item.dblclick(); await p.waitForTimeout(4000); } else console.log("no tree item", id);
}
// break the JS so the TypeScript worker has to report a diagnostic
await frame!.locator(".monaco-editor").first().click().catch(() => {});
const state = await frame!.evaluate(async () => {
  const m = (window as any).monaco;
  const models = m?.editor.getModels() ?? [];
  const js = models.find((x: any) => x.getLanguageId() === "javascript");
  js?.setValue("const x = ;\n" + js.getValue());
  await new Promise((r) => setTimeout(r, 4000));
  const markers = m?.editor.getModelMarkers({}) ?? [];
  await Promise.all([document.fonts.load('24px "Material Icons"'), document.fonts.load('16px codicon')]).catch(e => console.log("fontload", e)); await document.fonts.ready;
  return {
    monaco: !!m, languages: models.map((x: any) => x.getLanguageId()),
    markers: markers.map((x: any) => x.message).slice(0, 5),
    iconsOutlined: document.fonts.check('24px "Material Icons Outlined"'),
    icons: document.fonts.check('24px "Material Icons"'),
    fontFaces: [...document.fonts].map((f: any) => f.family + ":" + f.status),
    blobInBody: document.body.outerHTML.includes("blob:"),
  };
});
console.log(JSON.stringify(state, null, 1)); console.log("workers:", p.workers().map((w) => w.url().slice(0, 40)));
await p.screenshot({ path: `${out}/offline-${offline ? "off" : "on"}.png` });
const doc = await p.evaluate(() => [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "doc" && v._module?._scope?.has("codestratePlace"))?._value);
console.log("doc has blob:", String(doc).includes("blob:"), "doc length", String(doc).length);
console.log("external requests:", ext.length, [...new Set(ext)].map((u) => u.slice(0, 100)));
console.log("failed:", failed);
await b.close();
