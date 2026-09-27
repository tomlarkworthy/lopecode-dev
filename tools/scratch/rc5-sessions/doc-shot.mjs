// Screenshot the "Adding a chat" md cell under the chat.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
const h = page.locator('h3:has-text("Adding a chat")');
await h.waitFor({ timeout: 120000 });
await h.scrollIntoViewIfNeeded();
await page.screenshot({ path: resolve(here, "out/doc-shot.png") });
console.log("errors", JSON.stringify(errors));
await browser.close();
