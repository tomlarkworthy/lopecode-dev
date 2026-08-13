// Does file:// reject the picker outright (SecurityError) or actually open a dialog?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: false });
const p = await b.newPage();
await p.goto("file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html", { waitUntil: "load", timeout: 60000 });
// Wrap the real API so a rejection is visible even though the dialog cannot be driven.
await p.evaluate(() => {
  const real = window.showDirectoryPicker;
  window.__PICK = "not called";
  window.showDirectoryPicker = (...a) => { window.__PICK = "pending (dialog open)"; return real.apply(window, a)
    .then((h) => { window.__PICK = "ok:" + h.name; return h; }, (e) => { window.__PICK = e.name + ": " + e.message; throw e; }); };
});
await p.waitForSelector("#cb-mount", { timeout: 60000 });
await p.click("#cb-mount", { force: true });
await new Promise((r) => setTimeout(r, 5000));
console.log("picker result:", await p.evaluate(() => window.__PICK));
console.log("cell status:", await p.evaluate(() => (document.querySelector("#cb-status") || {}).textContent));
await b.close(); process.exit(0);
