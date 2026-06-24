// Verify an OpenRouter API error (402) is SURFACED in the chat and PERSISTS (does not get wiped by re-render).
import { chromium } from "playwright";
import { fileURLToPath } from "node:url"; import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "S100(@tomlarkworthy/robocoop-4)";
const body402 = JSON.stringify({ error: { message: "This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 13882.", code: 402 } });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 900, height: 800 } });
await ctx.route("**/chat/completions", (route) => route.fulfill({ status: 402, contentType: "application/json", body: body402 }));
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0,160)));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY","sk-or-probe"); localStorage.setItem("robocoop4_model","anthropic/claude-opus-4"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil:"load", timeout:30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(6000);

const ta = page.locator('textarea[placeholder^="Message robocoop-4"]');
await ta.fill("hello agent");
await page.locator('button:has-text("Send")').click();

// wait for the error to appear, then confirm it is STILL there 1.5s later (not wiped by the finally render)
await page.waitForFunction(() => /agent error/.test(document.body.innerText), { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
const out = await page.evaluate(() => {
  const txt = document.body.innerText;
  const m = txt.match(/agent error[^\n]*/);
  return { errorShown: /agent error/.test(txt), creditsMentioned: /more credits/.test(txt), notRawJson: !/\{"error"/.test(txt), line: m && m[0] };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: join(here, "error-surface.png") });
console.log("screenshot -> tools/robocoop-4/error-surface.png");
await browser.close();
