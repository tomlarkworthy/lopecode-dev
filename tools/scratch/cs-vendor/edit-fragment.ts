// Change the html fragment of a webstrate through the notebook's synced frame, then read it back from the server.
import { chromium } from "playwright";
const nb = process.argv[2]!, url = process.argv[3]!, text = process.argv[4]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
p.on("dialog", (d) => d.accept(url));
await p.goto(`file://${nb}`);
await p.getByRole("button", { name: /Sync with a webstrate/ }).click();
await p.getByText(/Synced live with/).waitFor({ timeout: 60000 });
const f = (await (await p.locator("iframe").first().elementHandle())!.contentFrame())!;
await f.locator("#cauldron-edit-button").waitFor({ timeout: 60000 });
console.log("before:", await f.evaluate(() => document.querySelector("code-fragment[data-type='text/html']")?.textContent));
await f.evaluate((t) => { document.querySelector("code-fragment[data-type='text/html']")!.textContent = t + "\n"; }, text);
await p.waitForTimeout(4000);
const raw = await (await c.request.get(url + "?raw")).text();
console.log("server:", /<CODE-FRAGMENT[^>]*>([\s\S]*?)<\/CODE-FRAGMENT>/i.exec(raw)?.[1]);
console.log("frame shows:", (await f.locator("body").innerText()).slice(0, 120));
await b.close();
