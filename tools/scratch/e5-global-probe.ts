import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
for (let s = 0; s < 10; s++) { await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {}); await p.waitForTimeout(600); }
let prev = -1;
for (let i = 0; i < 30; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".observablehq").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const probe = (n: string) => { try { return { ok: true, type: typeof rt._global(n) }; } catch (e) { return { ok: false, threw: String(e).slice(0, 80) }; } };
  return {
    globalSource: String(rt._global).slice(0, 160),
    globalName: rt._global?.name ?? null,
    importShimOnGlobalThis: typeof (globalThis as any).importShim,
    probes: Object.fromEntries(["importShim", "document", "window", "Math", "definitelyNotAGlobal12345"].map((n) => [n, probe(n)])),
  };
}), null, 1));
await b.close();
