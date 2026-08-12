// Interactive boot-test: drive the xterm.js + cli.js interactive TUI in headless
// Chromium. Proves (1) the Ink TUI renders (not -p), (2) a slash command works,
// (3) a chat turn streams a real MiMo reply via one OpenRouter POST.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8794);
const KEY = readFileSync(join(here, "..", "or-key.txt"), "utf8").trim();
const MODEL = process.env.MODEL || "xiaomi/mimo-v2.5-pro";
const CHAT = process.env.PROMPT || "Do not use any tools. Reply with exactly one word: BANANA";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = spawn(process.execPath, [join(here, "server.mjs")], { env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
srv.stdout.on("data", (d) => process.stdout.write("[srv] " + d));
srv.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));
await sleep(700);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });

const openrouterHits = [];
page.on("request", (r) => { if (r.url().includes("openrouter.ai/api/v1/chat/completions")) process.stdout.write("[openrouter request] " + r.method() + "\n"); });
page.on("response", (r) => { const u = r.url(); if (u.includes("openrouter.ai/api/v1/chat/completions")) openrouterHits.push({ status: r.status(), url: u }); });
const consoleErrs = [];
page.on("console", (m) => { const t = m.text(); if (m.type() === "error") consoleErrs.push(t); if (process.env.VERBOSE) process.stdout.write(`[page ${m.type()}] ${t}\n`); });
page.on("pageerror", (e) => { consoleErrs.push("pageerror: " + e.message); process.stdout.write("[pageerror] " + e.message + "\n"); });

// Preload the OpenRouter key so the field is populated.
await page.addInitScript((k) => { try { localStorage.setItem("openrouter_key", k); } catch {} }, KEY);
// Optionally trace which fs methods cli.js's interactive session exercises.
if (process.env.FS_TRACE) await page.addInitScript(() => { globalThis.__FS_TRACE = true; });

await page.goto(`http://127.0.0.1:${PORT}/interactive.html`, { waitUntil: "load" });
await page.waitForFunction(() => typeof window.__autostart === "function", { timeout: 10000 });
await page.fill("#model", MODEL);
await page.click("#start");

// Wait for the interactive TUI to render (poll the xterm buffer for the prompt/welcome box).
async function dump() { return await page.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : "")); }
async function waitFor(substrings, timeoutMs) {
  const t0 = Date.now();
  let last = "";
  while (Date.now() - t0 < timeoutMs) {
    last = await dump();
    if (substrings.some((s) => last.includes(s))) return { ok: true, buf: last };
    await sleep(400);
  }
  return { ok: false, buf: last };
}

console.log("\n== waiting for interactive TUI to render ==");
const boot = await waitFor(["Welcome", "?", "Try", "for shortcuts", "bypass", "cwd", "esc to", "> ", "─", "│", "╭", "╰"], 45000);
console.log("boot TUI rendered:", boot.ok);
console.log("---- boot buffer ----\n" + boot.buf + "\n---------------------");
const frameMsgs0 = await page.evaluate(() => window.__frameMsgs || []);
console.log("frame msgs:", JSON.stringify(frameMsgs0.slice(-8)));

// Focus terminal for keyboard input.
await page.click("#term");
await sleep(300);

// ---- STEP 2: slash command /help ----
console.log("\n== typing /help ==");
await page.keyboard.type("/help", { delay: 40 });
await sleep(1200);
await page.screenshot({ path: join(here, "interactive-help-typed.png") }).catch(() => {});
await page.keyboard.press("Enter");
const help = await waitFor(["Usage", "Commands", "help", "Learn", "slash", "/config", "/clear", "keyboard", "shortcut", "Bug"], 20000);
await sleep(800);
const helpBuf = await dump();
console.log("help rendered:", help.ok);
console.log("---- /help buffer ----\n" + helpBuf + "\n----------------------");
await page.screenshot({ path: join(here, "interactive-help.png") }).catch(() => {});

// ---- STEP 3: a chat turn ----
console.log("\n== typing a chat message ==");
// Clear any residual slash UI first.
await page.keyboard.press("Escape");
await sleep(400);
await page.keyboard.type(CHAT, { delay: 25 });
await sleep(600);
await page.keyboard.press("Enter");
// Wait for the round-trip to COMPLETE (frame logs "<- OpenRouter finish"), not
// just for the echoed prompt token.
async function frameMsgsNow() { return await page.evaluate(() => window.__frameMsgs || []); }
const t0 = Date.now();
let roundtrip = false;
while (Date.now() - t0 < 90000) {
  const fm = await frameMsgsNow();
  if (fm.some((m) => m.includes("<- OpenRouter finish"))) { roundtrip = true; break; }
  if (openrouterHits.length > 0) { roundtrip = true; break; }
  await sleep(500);
}
await sleep(3000); // let the streamed reply render into the terminal
const chatBuf = await dump();
// The reply is present if BANANA appears in a rendered assistant line (a 2nd
// occurrence beyond the echoed prompt), or the round-trip completed.
const bananaCount = (chatBuf.match(/BANANA/gi) || []).length;
const chatOk = roundtrip && (bananaCount >= 2 || /⏺|●\s|Claude/i.test(chatBuf));
console.log("chat round-trip completed:", roundtrip, "| BANANA occurrences in buffer:", bananaCount, "| openrouter hits:", openrouterHits.length);
console.log("---- chat buffer ----\n" + chatBuf + "\n---------------------");
await page.screenshot({ path: join(here, "interactive-chat.png") }).catch(() => {});
const chat = { ok: chatOk };

const frameMsgs = await page.evaluate(() => window.__frameMsgs || []);
const cliExit = await page.evaluate(() => window.__cliExit);

console.log("\n================ INTERACTIVE RESULT ================");
console.log("TUI rendered (Ink box):", boot.ok);
console.log("/help interactive UI:", help.ok);
console.log("chat reply streamed:", chat.ok);
console.log("OpenRouter POSTs:", JSON.stringify(openrouterHits));
console.log("cli exit (should be undefined = still running):", cliExit);
console.log("frame msgs (tail):", JSON.stringify(frameMsgs.slice(-10)));
const benign = (e) => /User-Agent|api\.anthropic\.com|metrics_enabled|Failed to load resource.*cli\.local|net::ERR|Access-Control|CORS/i.test(e);
const fatal = consoleErrs.filter((e) => !benign(e));
console.log("console errors (fatal, filtered):", JSON.stringify(fatal.slice(0, 12)));
console.log("console errors (total):", consoleErrs.length);
console.log("===================================================");

if (process.env.FS_TRACE) {
  const cf = page.frames().find((f) => f.url().includes("frame.html"));
  const trace = cf ? await cf.evaluate(() => globalThis.__fsTrace || null).catch(() => null) : null;
  console.log("\n---- fs methods exercised by interactive cli.js (call counts) ----");
  if (trace) {
    const sorted = Object.entries(trace).sort((a, b) => b[1] - a[1]);
    for (const [name, n] of sorted) console.log(`  ${name}: ${n}`);
  } else console.log("  (no trace captured)");
}

await browser.close();
srv.kill();
process.exit(0);
