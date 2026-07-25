// Probe a new.observablehq.com notebook: capture console/pageerrors across all frames.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const waitMs = Number(process.argv[3] ?? 25000);

const browser = await chromium.launch({ headless: process.env.HEADED ? false : true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const lines: string[] = [];
const seen = new Set<string>();
const push = (s: string) => {
  if (seen.has(s)) return;
  seen.add(s);
  lines.push(s);
};

ctx.on("page", (p) => p.on("console", (m) => push(`[popup:${m.type()}] ${m.text()}`)));
page.on("console", (m) => push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => push(`[pageerror] ${e.message}\n${e.stack}`));
page.on("frameattached", (f) => {
  push(`[frameattached] ${f.url()}`);
});
page.on("requestfailed", (r) => push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

console.log("=== FRAMES ===");
for (const f of page.frames()) console.log(f.name(), "|", f.url());

console.log("\n=== CONSOLE (" + lines.length + ") ===");
for (const l of lines) console.log(l);

console.log("\n=== ERROR TEXT IN DOM ===");
for (const f of page.frames()) {
  try {
    const errs = await f.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll(
        ".observablehq--error, .observablehq--inspect, [class*=error]"
      )) {
        const t = (el.textContent ?? "").trim();
        if (t) out.push(el.className + " :: " + t.slice(0, 300));
      }
      return out;
    });
    if (errs.length) console.log("--- frame", f.url().slice(0, 80));
    for (const e of errs.slice(0, 60)) console.log(e);
  } catch {}
}

await page.screenshot({ path: "tools/screenshots/newobs-probe.png", fullPage: false });
await browser.close();
