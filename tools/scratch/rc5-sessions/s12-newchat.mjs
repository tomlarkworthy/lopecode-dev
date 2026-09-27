// S12: send, save, New session, send again — the second send must run (s3 hung here once).
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active, null, { timeout: 120000 });
const st = () => page.evaluate(() => { const r = document.querySelector("[data-rc5-group]"); const e = r.active;
  return { title: e.title, busy: e.busy, hasSession: !!e.session, n: e.session?.messages.length ?? null, hasLog: !!e.log,
    button: [...r.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.textContent).join("|"),
    status: [...r.querySelectorAll("div")].find(d => d.style.fontStyle === "italic")?.textContent }; });
const say = async t => { const ta = page.locator('textarea[placeholder^="Message robocoop-5"]'); await ta.fill(t); await ta.press("Enter");
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(1000); const s = await st(); if (!s.busy && s.n && s.hasLog) return s; if (i % 5 === 4) console.log("  …", JSON.stringify(s)); }
  return "TIMEOUT " + JSON.stringify(await st()); };
console.log("A", JSON.stringify(await say("Reply only OK, no tools.")));
await page.locator('label:has-text("save") input[type=checkbox]').check();
await page.locator('button[title^="New session"]').click();
await page.waitForTimeout(500);
console.log("after new", JSON.stringify(await st()));
console.log("B", JSON.stringify(await say("Reply only OK2, no tools.")));
console.log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
