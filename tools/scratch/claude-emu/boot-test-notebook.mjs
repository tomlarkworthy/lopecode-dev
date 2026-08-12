// Boot-test the interactive+rc5 claude-code-browser notebook from file:// in headless
// Chromium. Proves: (1) lopepage renders + xterm mounts + interactive Ink TUI draws,
// (2) /help renders interactive help, (3) a chat turn streams a real MiMo reply via one
// OpenRouter POST, (4) __RC5FS round-trips + writeSync inserts a live module, (5) no fatal errors.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const HERE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
// No key by default: exercise the demo-gateway path users actually get.
// KEY=direct uses or-key.txt to test the bring-your-own-key path instead.
const KEY = process.env.KEY === "direct" ? readFileSync(HERE + "/or-key.txt", "utf8").trim() : "";
const MODEL = process.env.MODEL || "xiaomi/mimo-v2.5-pro";
const CHAT = process.env.PROMPT || "Do not use any tools. Reply with exactly one word: BANANA";
// HASH matters: S100(a,b) stacks both modules as TABS, so the terminal pane can mount
// hidden — a layout the side-by-side default never exercises.
const HASH = process.env.HASH || "#view=R100(S75(@tomlarkworthy/claude-code-browser),S25(@tomlarkworthy/claude-code-pairing))";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
// SLOW=<rate> throttles the CPU, standing in for a slow machine: the paint canary
// must not condemn a healthy terminal just because frames take longer.
if (process.env.SLOW) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.SLOW) });
  console.log("CPU throttled x" + process.env.SLOW);
}

const openrouterHits = [];
page.on("request", (r) => { if (r.url().includes("openrouter.ai/api/v1/chat/completions")) process.stdout.write("[openrouter request] " + r.method() + "\n"); });
page.on("response", (r) => { const u = r.url(); if (u.includes("openrouter.ai/api/v1/chat/completions")) openrouterHits.push({ status: r.status() }); });
const consoleErrs = [];
page.on("console", (m) => { const t = m.text(); if (m.type() === "error") consoleErrs.push(t); if (process.env.VERBOSE) process.stdout.write(`[page ${m.type()}] ${t}\n`); });
page.on("pageerror", (e) => { consoleErrs.push("pageerror: " + e.message); process.stdout.write("[pageerror] " + e.message + "\n"); });

await page.addInitScript((k) => { try { localStorage.setItem("openrouter_key", k); } catch {} }, KEY);
const gatewayHits = [];
page.on("response", (r) => { if (r.url().includes("openrouter-gateway.endpointservices.workers.dev")) gatewayHits.push({ status: r.status(), url: r.url().slice(-24) }); });

console.log("== loading notebook (file://) ==");
await page.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });

// Wait for the cell to mount (its __autostart hook appears once the app cell executes).
await page.waitForFunction(() => typeof window.__autostart === "function", { timeout: 45000 });
console.log("app cell mounted (window.__autostart present)");
await page.waitForSelector("#cb-restart", { timeout: 15000 });
await page.screenshot({ path: HERE + "/nb-1-mounted.png" }).catch(() => {});

// No Start button: the cell auto-boots because addInitScript seeded the key.
// Filling the model with the same default is a no-op; a different MODEL reboots.
await page.fill("#cb-model", MODEL).catch(() => {});

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

// YOLO positive arm, captured here: STEP 4 inserts a module, which re-renders the
// cell and drops the iframe, so argv must be read while this session is still live.
const readArgv = () => page.evaluate(() => {
  let argv = null;
  try { argv = document.querySelector("#cb-cli-frame").contentWindow.__ARGV || null; } catch (e) { argv = "ERR:" + e.message; }
  return { argv, checked: !!document.querySelector("#cb-yolo")?.checked, cfg: window.__runConfig && window.__runConfig.yolo };
});
// What the user actually SEES. __dumpTerm reads the buffer, so a renderer that
// attaches without painting still "passes" it — that bug shipped twice. Measured here
// for the same reason as the YOLO arm: STEP 4 re-renders the cell and drops the term.
// The buffer fills before the DOM paints, so poll rather than sampling once — the
// guarantee is "it paints", not "it paints within one frame of being buffered".
// Wait on the engine's own report rather than a wall-clock poll of the DOM: the page
// exposes __termHealth(), which carries the renderer's paint count next to the rendered
// character count. "The renderer painted but the DOM is empty" is a wedge; "no paint
// yet" is just a machine still working.
let health = await page.waitForFunction(() => {
  const h = window.__termHealth && window.__termHealth();
  return h && (h.renderedChars > 0 || h.wedges > 0) ? h : false;
}, { timeout: 120000, polling: "raf" }).then((h) => h.jsonValue()).catch(() => null);
if (!health) health = await page.evaluate(() => (window.__termHealth ? window.__termHealth() : null));
const paintOk = !!health && health.renderedChars > 0 && health.wedges === 0;
const painted = { renderedChars: health?.renderedChars, bufferedChars: health?.bufferedChars };
console.log("term health:", JSON.stringify(health));

const FLAG = "--dangerously-skip-permissions";
const yoloOn = await readArgv();
// cli.js refuses the flag as root; our shim reports uid 1000, so this must NOT appear.
const rootRefusal = boot.buf.includes("cannot be used with root");

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
  if (openrouterHits.length > 0 || gatewayHits.some(h => h.url.includes("chat/completions"))) { roundtrip = true; break; }
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

// ---- STEP 5: YOLO toggle reaches cli.js argv (default ON, and off when unchecked) ----
console.log("\n== YOLO mode ==");
// Negative arm: untick, restart, confirm the flag is gone.
await page.uncheck("#cb-yolo").catch(() => {}); // reboots by itself now
await sleep(8000);
const yoloOff = await readArgv();
console.log("default ON  :", JSON.stringify(yoloOn));
console.log("unchecked   :", JSON.stringify(yoloOff));
console.log("root refusal in TUI:", rootRefusal);
const yoloOk = yoloOn.checked && Array.isArray(yoloOn.argv) && yoloOn.argv.includes(FLAG) && !rootRefusal
  && Array.isArray(yoloOff.argv) && !yoloOff.argv.includes(FLAG);

// ---- summary ----
const benign = (e) => /User-Agent|api\.anthropic\.com|downloads\.claude\.ai|metrics_enabled|Failed to load resource.*cli\.local|net::ERR|Access-Control|CORS|statsig|telemetry/i.test(e);
const fatal = consoleErrs.filter((e) => !benign(e));
console.log("\n================ NOTEBOOK RESULT ================");
console.log("TUI in buffer:", boot.ok);
console.log("TUI actually painted to screen:", paintOk, JSON.stringify(painted));
console.log("/help UI:", help.ok);
console.log("chat streamed:", chatOk);
console.log("rc5 fs backed by modules:", fsOk);
console.log("YOLO toggle (default on / off when unchecked):", yoloOk);
console.log("upstream:", KEY ? "openrouter.ai (key)" : "demo gateway (no key)");
console.log("OpenRouter POSTs:", JSON.stringify(openrouterHits), "| gateway hits:", JSON.stringify(gatewayHits));
console.log("console errors (fatal, filtered):", JSON.stringify(fatal.slice(0, 12)));
console.log("console errors (total):", consoleErrs.length);
const GO = boot.ok && paintOk && help.ok && chatOk && fsOk && yoloOk;
console.log("VERDICT:", GO ? "GO" : "NO-GO");
console.log("=================================================");

await browser.close();
process.exit(0);
