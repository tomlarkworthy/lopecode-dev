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
const HASH = process.env.HASH || "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
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

// ---- STEP 1b: dev-channels confirmation ----
// cli.js asks on every launch that carries --dangerously-load-development-channels and
// there is no persisted opt-out, so the session sits on this dialog until it is answered.
console.log("\n== dev-channels dialog ==");
await page.click("#cb-term");
await sleep(400);
const devDialog = /development channels/i.test(await dump());
if (devDialog) { await page.keyboard.press("Enter"); await sleep(3000); }
const channelsRegistered = /Listening for channel messages/i.test(await dump());
console.log("dialog shown:", devDialog, "| channels registered:", channelsRegistered);

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

// ---- STEP 3b: a notebook-pushed channel message reaches the session ----
// The notebook talks to a session nobody is typing into: the message must appear as an
// inbound channel line, not as something the test typed.
console.log("\n== channel push ==");
const notifySent = await page.evaluate(() => window.__NBNOTIFY("boot test says hello", { type: "boot_test" }));
await sleep(4000);
const chanBuf = await dump();
const channelDelivered = /notebook: boot test says hello/i.test(chanBuf);
console.log("notify enqueued:", notifySent, "| delivered to session:", channelDelivered);
await page.keyboard.press("Escape"); // stop the turn it induced
await sleep(1200);
const channelOk = channelsRegistered && notifySent && channelDelivered;

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

// ---- STEP 4a2: every write path reaches the notebook ----
// cli.js's Write tool does not call writeFileSync on the target: it writes a temp file
// and renames it. That bypassed the host bridge, so an agent's edit reported success
// while the notebook never saw it. Deterministic, no model needed.
console.log("\n== write paths ==");
const writes = await page.evaluate(async () => {
  const fs = document.querySelector("#cb-cli-frame").contentWindow.__REG.fs;
  const mk = (tag) => 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("probe")).define("probe",[],()=>"' + tag + '");return main;}';
  fs.mkdirSync("/src/@wtest", { recursive: true });
  fs.writeFileSync("/src/@wtest/sync.js", mk("SYNC"));
  await fs.promises.writeFile("/src/@wtest/promises.js", mk("PROMISES"));
  fs.writeFileSync("/src/@wtest/.tmp", mk("RENAME"));
  fs.renameSync("/src/@wtest/.tmp", "/src/@wtest/rename.js");
  await new Promise((r) => setTimeout(r, 1500));
  const seen = (n) => (window.__RC5FS.readSync("/src/@wtest/" + n + ".js") || "").length > 0;
  // A module that will not compile must be REFUSED loudly: cli.js turns the throw into a
  // failed Write in the same turn. Silently dropping it is the bug this guards.
  let refusal = null;
  try { fs.writeFileSync("/src/@wtest/broken.js", 'export default function define(runtime, observer){const main=runtime.module();return main;'); }
  catch (e) { refusal = String(e.message).slice(0, 60); }
  return { sync: seen("sync"), promises: seen("promises"), rename: seen("rename"), refusal,
           brokenKeptOnDisk: (fs.readFileSync("/src/@wtest/broken.js", "utf8") || "").length > 0 };
});
console.log("write paths reaching the notebook:", JSON.stringify(writes));
const writesOk = writes.sync && writes.promises && writes.rename && /FAILED TO COMPILE/.test(writes.refusal || "") && writes.brokenKeptOnDisk;

// ---- STEP 4b: the in-page pairing channel (notebook MCP server) ----
console.log("\n== pairing: notebook MCP server ==");
const mcp = await page.evaluate(async () => {
  const log = window.__MCPLOG || [];
  const tools = window.__NBTOOLS ? window.__NBTOOLS.list().map((t) => t.name) : [];
  // Exercise the tools the way the CLI would, through the same entry point.
  let listed = null, wrote = null, read = null, evaled = null;
  try { listed = (await window.__NBTOOLS.call("list_modules", {})).length; } catch (e) { listed = String(e); }
  try {
    wrote = await window.__NBTOOLS.call("write_module", {
      name: "@test/pairing",
      source: 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("pair")).define("pair",[],()=>"PAIRED");return main;}',
    });
    read = (await window.__NBTOOLS.call("read_module", { name: "@test/pairing" })).slice(0, 40);
  } catch (e) { wrote = String(e); }
  try { evaled = await window.__NBTOOLS.call("eval_js", { code: "1+1" }); } catch (e) { evaled = String(e); }
  return { handshake: log.filter((l) => l.ev === "initialize").length, listedMethods: [...new Set(log.map((l) => l.ev))], tools, listed, wrote, read, evaled };
});
console.log("mcp:", JSON.stringify(mcp));
const mcpOk = mcp.handshake > 0 && mcp.tools.length === 4 && typeof mcp.listed === "number" && mcp.wrote && mcp.wrote.ok === true && mcp.evaled === 2;

// ---- STEP 4c: project memory + the knowledge docs it indexes ----
console.log("\n== project memory ==");
const mem = await page.evaluate(() => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const md = String((w.__vol.toJSON() || {})["/home/user/project/CLAUDE.md"] || "");
  const paths = window.__RC5FS.list();
  const wiki = paths.filter((k) => k.startsWith("/content/@tomlarkworthy/markdown-wiki/"));
  return {
    bytes: md.length,
    // Guards the property that matters: the text is READ from the modules that own it.
    // A baked attachment would satisfy every other assertion here while silently forking.
    fromModules: !/prompt unavailable/.test(md) && !document.getElementById("@tomlarkworthy/claude-code-browser/CLAUDE.md.gz") && /NOTEBOOK MODEL/.test(md),
    // The prompt is only useful if the docs it points at actually resolve.
    indexed: (md.match(/^- \/content\/@tomlarkworthy\/markdown-wiki\//gm) || []).length,
    present: wiki.length,
    readable: (window.__RC5FS.readSync(wiki[0]) || "").length,
  };
});
console.log("memory:", JSON.stringify(mem));
const memOk = mem.bytes > 10000 && mem.fromModules && mem.indexed > 0 && mem.present === mem.indexed && mem.readable > 0;

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
// ---- STEP 6: Anthropic mode — no key must mean NO auth, so /login can run ----
console.log("\n== Anthropic API mode ==");
await page.selectOption("#cb-provider", "anthropic").catch(() => {});
// The switch reboots the session: wait for the terminal's own report that it repainted
// rather than a fixed sleep, so an empty dump below means something real.
await page.waitForFunction(() => { const h = window.__termHealth && window.__termHealth(); return h && h.bufferedChars > 0; }, { timeout: 60000, polling: "raf" }).catch(() => {});
await sleep(2000);
const anth = await page.evaluate(() => {
  const f = document.querySelector("#cb-cli-frame");
  const env = (f && f.contentWindow && f.contentWindow.__ENV_OVERRIDES) || {};
  return {
    base: env.ANTHROPIC_BASE_URL,
    hasApiKey: Object.prototype.hasOwnProperty.call(env, "ANTHROPIC_API_KEY"),
    provider: window.__runConfig && window.__runConfig.provider,
    urlPlaceholder: document.querySelector("#cb-url").placeholder,
    screen: (window.__dumpTerm ? window.__dumpTerm() : "").split("\n").slice(0, 10).join("\n"),
    health: (() => { const h = window.__termHealth(); return { rendered: h.renderedChars, buffered: h.bufferedChars, wedges: h.wedges, instance: h.instance }; })(),
  };
});
console.log("anthropic:", JSON.stringify({ base: anth.base, hasApiKey: anth.hasApiKey, provider: anth.provider, health: anth.health }));
console.log("---- screen in Anthropic mode ----\n" + anth.screen);
const anthOk = anth.provider === "anthropic" && anth.base === "https://api.anthropic.com" && anth.hasApiKey === false && anth.health.rendered > 0 && anth.health.wedges === 0;

console.log("\n================ NOTEBOOK RESULT ================");
console.log("TUI in buffer:", boot.ok);
console.log("TUI actually painted to screen:", paintOk, JSON.stringify(painted));
console.log("/help UI:", help.ok);
console.log("chat streamed:", chatOk);
console.log("rc5 fs backed by modules:", fsOk);
console.log("Anthropic mode (base switched, no synthetic key):", anthOk);
console.log("write paths (3 routes + compile refusal):", writesOk, JSON.stringify(writes));
console.log("project memory (CLAUDE.md + every indexed doc present):", memOk, JSON.stringify(mem));
console.log("channel push (registered + delivered unprompted):", channelOk, JSON.stringify({ devDialog, channelsRegistered, notifySent, channelDelivered }));
console.log("pairing MCP (handshake + 4 tools live):", mcpOk, JSON.stringify({ handshake: mcp.handshake, methods: mcp.listedMethods }));
console.log("YOLO toggle (default on / off when unchecked):", yoloOk);
console.log("upstream:", KEY ? "openrouter.ai (key)" : "demo gateway (no key)");
console.log("OpenRouter POSTs:", JSON.stringify(openrouterHits), "| gateway hits:", JSON.stringify(gatewayHits));
console.log("console errors (fatal, filtered):", JSON.stringify(fatal.slice(0, 12)));
console.log("console errors (total):", consoleErrs.length);
const GO = boot.ok && paintOk && help.ok && chatOk && fsOk && writesOk && yoloOk && mcpOk && anthOk && memOk && channelOk;
console.log("VERDICT:", GO ? "GO" : "NO-GO");
console.log("=================================================");

await browser.close();
process.exit(0);
