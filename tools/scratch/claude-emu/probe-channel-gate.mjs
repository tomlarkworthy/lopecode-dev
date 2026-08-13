// Full channel chain: accept the dev-channels dialog, then push a notification.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.addInitScript(() => { window.__CB_DEBUG = true; });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(5000);
const screenOf = () => p.evaluate(() => (document.querySelector(".xterm-rows") || {}).innerText || "");
console.log("dialog on screen:", /development channels/i.test(await screenOf()));
await p.click(".xterm-screen").catch(() => {});
await p.keyboard.press("Enter");
await sleep(8000);
console.log("mcp traffic:", JSON.stringify(await p.evaluate(() => (window.__MCPLOG || []).map((e) => e.ev))));
console.log("debug (channel lines):", JSON.stringify(await p.evaluate(() => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const files = w.__vol.toJSON();
  const k = Object.keys(files).find((x) => x.includes("/debug/"));
  return k ? String(files[k]).split("\n").filter((l) => /channel/i.test(l)).slice(-8) : "no debug log";
}), null, 1));
console.log("notify enqueued:", await p.evaluate(() => window.__NBNOTIFY("the notebook says hello", { type: "probe" })));
await sleep(5000);
const scr = await screenOf();
console.log("screen tail:\n" + scr.split("\n").filter((l) => l.trim()).slice(-18).join("\n"));
await p.screenshot({ path: "nb-channel-gate.png" });
await b.close(); process.exit(0);
