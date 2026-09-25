// Markdown replies render inside the transcript's shadow root; screenshot one to check theme styles carried in.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
await page.evaluate(() => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  c.active.session.messages.push({ role: "user", content: "show me markdown" },
    { role: "assistant", content: "## Heading\n\nSome `inline code`, a [link](https://example.com), and:\n\n- one\n- two\n\n```js\nconst x = 1;\n```" });
});
await page.locator('button[title^="New session"]').click();
await page.locator('select[title="Switch session"]').selectOption("1");
await page.waitForTimeout(1500);
await page.screenshot({ path: resolve(here, "out/md-shot.png"), clip: { x: 0, y: 0, width: 1050, height: 600 } });
await browser.close();
