// The thing the user will actually do: open the PUBLISHED url on a phone.
import { chromium, devices } from "playwright";
const URL = "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_flat-trace.html";
const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});
const ctx = await browser.newContext({ ...devices["Pixel 7"], permissions: ["camera"] });
const page = await ctx.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
const t0 = Date.now();
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(20000);
console.log("boot from github pages:", Date.now() - t0, "ms");
// turn the camera on through the real toggle, then shoot
const toggled = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  return !!rt;
});
const state = await page.evaluate(async () => {
  const host = document.querySelector('[cell="viewof camOn"]');
  const cam = host?.querySelector('input[type=checkbox]') as HTMLInputElement | null;
  if (!cam) return { err: "no camera toggle", cells: [...document.querySelectorAll("[cell]")].length };
  cam.click();
  return { clicked: true };
});
await page.waitForTimeout(6000);
const shot = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Capture from camera"));
  if (!btn) return { err: "no capture button" };
  (btn as HTMLButtonElement).click();
  await new Promise((r) => setTimeout(r, 6000));
  const status = [...document.querySelectorAll("span")].map((s) => s.textContent || "").filter((t) => /shot/.test(t));
  const trace = document.body.innerText.match(/[^\n]*(mat did not cancel|bounding box|mat marks read|no object found)[^\n]*/g);
  return { status, trace: trace ? trace.slice(0, 3) : null };
});
console.log("camera toggle:", JSON.stringify(state));
console.log("after capture:", JSON.stringify(shot, null, 1));
await page.screenshot({ path: "tools/screenshots/flat-trace-live-phone.png" });
await browser.close();
if (errs.length) console.log("--- errors ---\n" + [...new Set(errs)].slice(0, 8).join("\n"));
