// What does "fork" actually produce, and does the terminal work inside the fork?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("main: " + String(e.message).slice(0, 160)));
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(8000);
console.log("source session healthy:", JSON.stringify(await p.evaluate(() => { const h = window.__termHealth(); return { chars: h.renderedChars, wedges: h.wedges }; })));

const forked = new Promise((res) => ctx.on("page", res));
const clicked = await p.evaluate(async () => {
  const mods = window.__CB_DEPS.currentModules;
  let ex = null;
  for (const [mod, info] of mods) if (info && info.name === "@tomlarkworthy/exporter-3") ex = mod;
  if (!ex) return "no exporter-3 module";
  const forkAnchor = await ex.value("forkAnchor");
  forkAnchor({}, "fork").click();
  return "clicked";
});
console.log("fork click:", clicked);

const fp = await Promise.race([forked, sleep(120000).then(() => null)]);
if (!fp) { console.log("NO FORK TAB OPENED"); await b.close(); process.exit(1); }
fp.on("pageerror", (e) => errs.push("fork: " + String(e.message).slice(0, 160)));
await fp.waitForLoadState("load", { timeout: 120000 }).catch(() => {});
console.log("fork url:", fp.url().slice(0, 60));
await sleep(20000);
const state = await fp.evaluate(() => ({
  blocks: document.querySelectorAll('script[type="text/plain"][id]').length,
  hasCli: !!document.getElementById("@tomlarkworthy/claude-code-browser/cli.js.gz") ||
          [...document.querySelectorAll('script[type="text/plain"][id]')].some((s) => /cli\.js/.test(s.id)),
  blockIds: [...document.querySelectorAll('script[type="text/plain"][id]')].map((s) => s.id).filter((i) => /claude-code-browser/.test(i)),
  cellMounted: !!window.__CB_ROOT,
  health: window.__termHealth ? window.__termHealth() : null,
  status: (document.querySelector("#cb-status") || {}).textContent,
}));
console.log("fork state:", JSON.stringify({ blocks: state.blocks, hasCli: state.hasCli, blockIds: state.blockIds, cellMounted: state.cellMounted, status: state.status,
  health: state.health && { chars: state.health.renderedChars, buffered: state.health.bufferedChars, wedges: state.health.wedges, instances: state.health.instances } }, null, 1));
// The fork is a different origin with different powers — check what still works there.
const dumpF = () => fp.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
console.log("channels registered in fork:", /Listening for channel messages/.test(await dumpF()));
console.log("storage in fork:", JSON.stringify(await fp.evaluate(() => {
  const out = {};
  try { localStorage.setItem("__t", "1"); out.localStorage = "ok"; } catch (e) { out.localStorage = e.name; }
  out.secureContext = window.isSecureContext;
  out.picker = typeof window.showDirectoryPicker;
  out.randomUUID = typeof crypto.randomUUID;
  return out;
})));
console.log("notify delivered in fork:", await (async () => {
  await fp.evaluate(() => window.__NBNOTIFY("fork probe hello", { type: "probe" }));
  await sleep(4000);
  return /fork probe hello/.test(await dumpF());
})());
await fp.click(".xterm-screen").catch(() => {});
await fp.keyboard.type("Reply with exactly one word: FORKED", { delay: 12 });
await fp.keyboard.press("Enter");
let replied = false;
for (let i = 0; i < 40 && !replied; i++) { await sleep(1500); replied = /FORKED/.test((await dumpF()).slice(-2500)); }
console.log("model turn works in fork:", replied);
console.log("change stream in fork:", JSON.stringify(await fp.evaluate(() => (window.__termHealth().trace || []).filter((t) => /history-watch-failed/.test(t.ev)).slice(-1))));
console.log("page errors:", JSON.stringify(errs.slice(0, 8), null, 1));
await fp.screenshot({ path: "fork-tab.png" });
await b.close(); process.exit(0);
