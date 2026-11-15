// bun horde/probe-page.ts <url> [expr] : opens a page headless, waits for window.__bench, prints it
import { chromium } from "../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(process.argv[2]);
const r = await page.waitForFunction(() => (window as any).__bench, null, { timeout: 600000 }).then((h) => h.jsonValue());
console.log(JSON.stringify(r));
if (process.argv[3]) console.log(await page.evaluate(process.argv[3]));
await browser.close();
