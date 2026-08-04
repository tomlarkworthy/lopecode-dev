// Press the rebuild button headlessly: does the compiler carried in the file
// resolve from its own attachments, compile the shipped source, and reproduce
// the shipped binary byte for byte?
//
// This is the property the 3.9MB buys. If it does not hold, the attachments
// are dead weight and the .wasm is an artifact nobody can account for.
import { chromium } from "playwright";
const URL_ = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE", m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
const t0 = Date.now();
await page.goto(URL_, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);
console.log(`boot: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const out = await page.evaluate(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const v = async (n: string) => { try { return await mod.value(n); } catch (e: any) { return { ERR: String(e && e.message || e) }; } };
  const src: any = await v("wasmSourceText");
  const before: any = await v("wasmRebuild");
  const btn: any = await v("viewof wasmRebuildGo");
  const b = btn.querySelector ? btn.querySelector("button") : null;
  if (!b) return { ERR: "no button in viewof wasmRebuildGo", btnTag: btn && btn.tagName };
  b.click();
  // asc on 20KB takes seconds; poll rather than guess
  let after: any = null;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    after = await v("wasmRebuild");
    if (after && !after.ERR) break;
  }
  return {
    sourceChars: typeof src === "string" ? src.length : src,
    beforePress: before,
    rebuild: after,
    report: (await v("wasmRebuildReport"))?.textContent?.slice(0, 400)
  };
});
await browser.close();
console.log(JSON.stringify(out, null, 2));
