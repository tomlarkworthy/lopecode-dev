// Boot-test the single file from file:// in headless Chromium with a REAL OpenRouter key.
// Proves: file:// works, key from the UI, real MiMo answer in the output pane, cli exit 0,
// and that the OpenRouter call happened directly from the page (no localhost server).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const HTML = "file:///Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/claude-code-browser.html";
const KEY = readFileSync("/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/or-key.txt", "utf8").trim();
const SHOT = "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/claude-code-browser-test.png";
const PROMPT = process.env.PROMPT || "Reply with exactly one word: BANANA";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
const openrouterCalls = [];
page.on("console", (m) => { const t = m.text(); if (m.type() === "error") consoleErrors.push(t); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));
page.on("request", (r) => { if (r.url().includes("openrouter.ai")) openrouterCalls.push(r.method() + " " + r.url()); });
page.on("requestfinished", async (r) => { if (r.url().includes("openrouter.ai")) { const resp = await r.response(); console.log("[openrouter] " + r.method() + " -> " + (resp && resp.status())); } });

await page.goto(HTML, { waitUntil: "load" });
await page.fill("#key", KEY);
await page.fill("#prompt", PROMPT);
await page.click("#run");

// Wait until the status shows Done/exited/timeout.
const deadline = Date.now() + 90000;
let status = "";
while (Date.now() < deadline) {
  status = await page.textContent("#status");
  if (/^(Done|cli\.js exited|Timed out|Failed)/.test(status || "")) break;
  await new Promise((r) => setTimeout(r, 300));
}

const output = (await page.textContent("#output")) || "";
await page.screenshot({ path: SHOT, fullPage: true }).catch(() => {});

console.log("\n================ BOOT-TEST RESULT ================");
console.log("URL              :", HTML);
console.log("prompt           :", JSON.stringify(PROMPT));
console.log("status line      :", status);
console.log("OpenRouter calls :", openrouterCalls.length, openrouterCalls[0] || "");
console.log("---- output pane ----\n" + output.trim());
console.log("---------------------");
const hasBanana = /BANANA/.test(output);
const exitOk = /^Done\b/.test(status || "");
const benign = (s) => /User-Agent|api\.anthropic\.com|metrics_enabled|Failed to load resource/.test(s);
const fatal = consoleErrors.filter((s) => !benign(s));
console.log("BANANA in output :", hasBanana);
console.log("cli exit 0 (Done):", exitOk);
console.log("direct OpenRouter:", openrouterCalls.length > 0);
console.log("fatal console err:", fatal.length, fatal.slice(0, 5));
console.log("screenshot       :", SHOT);
const PASS = hasBanana && exitOk && openrouterCalls.length > 0 && fatal.length === 0;
console.log("VERDICT          :", PASS ? "PASS" : "FAIL");
console.log("==================================================");
await browser.close();
process.exit(PASS ? 0 : 1);
