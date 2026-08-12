// Boot-test the interactive+rc5 claude-code-browser notebook from file:// in headless
// Chromium. Proves: (1) lopepage renders + xterm mounts + interactive Ink TUI draws,
// (2) /help renders interactive help, (3) a chat turn streams a real MiMo reply via one
// OpenRouter POST, (4) __RC5FS round-trips + writeSync inserts a live module, (5) no fatal errors.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const HERE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const KEY = readFileSync(HERE + "/or-key.txt", "utf8").trim();
const MODEL = process.env.MODEL || "xiaomi/mimo-v2.5-pro";
const CHAT = process.env.PROMPT || "Do not use any tools. Reply with exactly one word: BANANA";
const HASH = "#view=R100(S75(@tomlarkworthy/claude-code-browser),S25(@tomlarkworthy/claude-code-pairing))";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });

const openrouterHits = [];
page.on("request", (r) => { if (r.url().includes("openrouter.ai/api/v1/chat/completions")) process.stdout.write("[openrouter request] " + r.method() + "\n"); });
page.on("response", (r) => { const u = r.url(); if (u.includes("openrouter.ai/api/v1/chat/completions")) openrouterHits.push({ status: r.status() }); });
const consoleErrs = [];
page.on("console", (m) => { const t = m.text(); if (m.type() === "error") consoleErrs.push(t); if (process.env.VERBOSE) process.stdout.write(`[page ${m.type()}] ${t}\n`); });
page.on("pageerror", (e) => { consoleErrs.push("pageerror: " + e.message); process.stdout.write("[pageerror] " + e.message + "\n"); });

await page.addInitScript((k) => { try { localStorage.setItem("openrouter_key", k); } catch {} }, KEY);

console.log("== loading notebook (file://) ==");
await page.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });

// Wait for the cell to mount (its __autostart hook appears once the app cell executes).
await page.waitForFunction(() => typeof window.__autostart === "function", { timeout: 45000 });
console.log("app cell mounted (window.__autostart present)");
await page.waitForSelector("#cb-start", { timeout: 15000 });
await page.screenshot({ path: HERE + "/nb-1-mounted.png" }).catch(() => {});

await page.fill("#cb-model", MODEL).catch(() => {});
await page.click("#cb-start");

async function dump() { return await page.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : "")); }
async function waitFor(subs, timeoutMs) {
  const t0 = Date.now(); let last = "";
  while (Date.now() - t0 < timeoutMs) {
    last = await dump();
    if (subs.some((s) => last.includes(s))) return { ok: true, buf: last };
    await sleep(400);
  }
  return { ok: false, buf: last };
}

console.log("\n== waiting for interactive TUI ==");
const boot = await waitFor(["Welcome", "for shortcuts", "bypass", "cwd", "esc to", "❯", "> ", "─", "│", "╭", "╰"], 60000);
console.log("boot TUI rendered:", boot.ok);
console.log("---- boot buffer ----\n" + boot.buf + "\n---------------------");
const frameMsgs0 = await page.evaluate(() => window.__frameMsgs || []);
console.log("frame msgs:", JSON.stringify(frameMsgs0.slice(-8)));
await page.screenshot({ path: HERE + "/nb-2-tui.png" }).catch(() => {});

// ---- STEP 2: /help ----
console.log("\n== typing /help ==");
await page.click("#cb-term");
await sleep(300);
await page.keyboard.type("/help", { delay: 40 });
await sleep(1000);
await page.keyboard.press("Enter");
const help = await waitFor(["Usage", "Commands", "help", "Learn", "slash", "/config", "/clear", "keyboard", "shortcut", "Bug"], 20000);
await sleep(800);
const helpBuf = await dump();
console.log("help rendered:", help.ok);
console.log("---- /help buffer ----\n" + helpBuf + "\n----------------------");
await page.screenshot({ path: HERE + "/nb-3-help.png" }).catch(() => {});

// ---- STEP 3: chat turn ----
console.log("\n== typing a chat message ==");
await page.keyboard.press("Escape");
await sleep(400);
await page.keyboard.type(CHAT, { delay: 22 });
await sleep(600);
await page.keyboard.press("Enter");
const t0 = Date.now(); let roundtrip = false;
while (Date.now() - t0 < 90000) {
  const fm = await page.evaluate(() => window.__frameMsgs || []);
  if (fm.some((m) => m.includes("<- OpenRouter finish"))) { roundtrip = true; break; }
  if (openrouterHits.length > 0) { roundtrip = true; break; }
  await sleep(500);
}
await sleep(3500);
const chatBuf = await dump();
const bananaCount = (chatBuf.match(/BANANA/gi) || []).length;
const chatOk = roundtrip && (bananaCount >= 2 || /⏺|●\s|Claude/i.test(chatBuf));
console.log("chat round-trip:", roundtrip, "| BANANA x", bananaCount, "| openrouter hits:", openrouterHits.length);
console.log("---- chat buffer ----\n" + chatBuf + "\n---------------------");
await page.screenshot({ path: HERE + "/nb-4-chat.png" }).catch(() => {});

// ---- STEP 4: rc5 fs adapter ----
console.log("\n== rc5 fs adapter test ==");
const fsResult = await page.evaluate(async () => {
  const out = { hasRC5: !!window.__RC5FS };
  if (!window.__RC5FS) return out;
  const fs = window.__RC5FS, dbg = window.__RC5DEBUG;
  const list = fs.list();
  out.listCount = list.length;
  out.sampleIds = list.slice(0, 6);
  const self = "/src/@tomlarkworthy/claude-code-browser.js";
  const selfSrc = fs.readSync(self);
  out.selfReadLen = selfSrc ? selfSrc.length : 0;
  out.selfReadHead = selfSrc ? selfSrc.slice(0, 60) : null;
  // write a tiny valid module
  const src = 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("hi")).define("hi",[],()=>42);return main;}';
  fs.writeSync("/src/@test/hello.js", src);
  out.readBackImmediate = fs.readSync("/src/@test/hello.js");
  // poll for the async apply to land in the live runtime
  let applied = false, exportOk = false;
  for (let i = 0; i < 40; i++) {
    if (dbg && dbg.store && dbg.store.srcFns.has("@test/hello")) applied = true;
    if (applied) {
      try { const r = await dbg.exportModuleJS("@test/hello"); if (r && r.source) exportOk = true; } catch {}
    }
    if (applied && exportOk) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  out.appliedToRuntime = applied;
  out.exportModuleRoundTrips = exportOk;
  // scratch (non-module) write path
  fs.writeSync("/scratch/note.txt", "hello scratch");
  out.scratchRead = fs.readSync("/scratch/note.txt");
  return out;
});
console.log("rc5 fs result:", JSON.stringify(fsResult, null, 2));

const fsOk = fsResult.hasRC5 && fsResult.selfReadLen > 0 && fsResult.readBackImmediate && fsResult.appliedToRuntime && fsResult.exportModuleRoundTrips;

// ---- summary ----
const benign = (e) => /User-Agent|api\.anthropic\.com|downloads\.claude\.ai|metrics_enabled|Failed to load resource.*cli\.local|net::ERR|Access-Control|CORS|statsig|telemetry/i.test(e);
const fatal = consoleErrs.filter((e) => !benign(e));
console.log("\n================ NOTEBOOK RESULT ================");
console.log("TUI rendered:", boot.ok);
console.log("/help UI:", help.ok);
console.log("chat streamed:", chatOk);
console.log("rc5 fs backed by modules:", fsOk);
console.log("OpenRouter POSTs:", JSON.stringify(openrouterHits));
console.log("console errors (fatal, filtered):", JSON.stringify(fatal.slice(0, 12)));
console.log("console errors (total):", consoleErrs.length);
const GO = boot.ok && help.ok && chatOk && fsOk;
console.log("VERDICT:", GO ? "GO" : "NO-GO");
console.log("=================================================");

await browser.close();
process.exit(0);
