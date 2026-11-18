import { chromium } from "../../../node_modules/playwright/index.mjs";
const file = new URL("../../../lopebooks/notebooks/soundscript.html", import.meta.url).pathname;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto(`file://${file}`);
await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-breakout")?._scope.get("world")?._value, null, { timeout: 60000 });
const world = () => page.evaluate(() => { const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout"); const w = m._scope.get("world")._value; const h = m._scope.get("viewof world")._value; return { paddle: w.paddle, y: w.ball.y, handle: h.value.paddle }; });
const canvas = page.locator(".lite-game canvas").first();
await canvas.scrollIntoViewIfNeeded();
const play = (await page.locator(".lite-game button", { hasText: "play" }).first().boundingBox())!;
await page.touchscreen.tap(play.x + play.width / 2, play.y + play.height / 2);
await page.waitForTimeout(1500);
await page.evaluate(() => { (window as any).__moves = []; document.addEventListener("pointermove", (e) => (window as any).__moves.push([e.type, Math.round(e.clientX), (e.target as any).tagName]), true); });
const bb = (await canvas.boundingBox())!;
const cdp = await ctx.newCDPSession(page);
const at = (f: number, dy: number) => [{ x: bb.x + bb.width * f, y: bb.y + bb.height * 0.8 - dy, id: 1 }];
console.log("before", await world());
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0.5, 0) });
for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(0.5 - 0.04 * i, 15 * i) }); }
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
for (let i = 0; i < 5; i++) { console.log(i, await world()); await page.waitForTimeout(100); }
console.log(JSON.stringify(await page.evaluate(() => (window as any).__moves)));
await browser.close();
