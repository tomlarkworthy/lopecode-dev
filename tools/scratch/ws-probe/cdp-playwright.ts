// A standard client, playwright-core's connectOverCDP (the repo's own dev dependency, 1.52.0), against browser.cdp.
// Nothing of ours is between it and the socket but the address and the Authorization header.
import { chromium } from "playwright-core";
import { session, save, HOST, P } from "./lib.ts";
const name = "pw", out: any = {};
const auth = { authorization: "Bearer " + session };
out.extend = await (await fetch(`https://${HOST}/xrpc/${P}browser.extend?browser=${name}&seconds=60`, { method: "POST", headers: auth })).json();
let t = performance.now();
const browser = await chromium.connectOverCDP(`wss://${HOST}/xrpc/${P}browser.cdp?browser=${name}`, { headers: auth });
out.connectMs = Math.round(performance.now() - t);
const context = await browser.newContext();
const page = await context.newPage();
const requests: string[] = [];
page.on("request", (r) => requests.push(r.method() + " " + r.url().slice(0, 60)));
t = performance.now();
await page.goto("https://example.com/");
out.gotoMs = Math.round(performance.now() - t);
out.title = await page.title();
// A real click that navigates, awaited as a navigation.
t = performance.now();
await Promise.all([page.waitForURL(/iana\.org/, { timeout: 15000 }), page.click("a")]);
out.afterClick = page.url();
out.clickNavMs = Math.round(performance.now() - t);
// Real typing: a page with a field that counts trusted key events.
await page.setContent(`<input id=q><script>window.k=[];q.addEventListener("keydown",e=>k.push([e.key,e.isTrusted]))</scr` + `ipt>`);
await page.click("#q");
await page.keyboard.type("lope");
out.typed = await page.inputValue("#q");
out.trustedKeys = await page.evaluate("k.every(x => x[1]) && k.length");
const shot = await page.screenshot();
out.screenshotBytes = shot.length;
out.requests = requests.slice(0, 4);
await context.close();
await browser.close();
out.closeAll = (await fetch(`https://${HOST}/xrpc/${P}browser.close`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ browser: name, all: true }) })).status;
save("cdp-playwright", out);
console.log(JSON.stringify(out, null, 1));
process.exit(0);
