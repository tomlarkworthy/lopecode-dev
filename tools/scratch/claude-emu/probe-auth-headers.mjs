// What credential actually goes on the wire in Anthropic mode, and is the conflict banner gone?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const seen = [];
p.on("request", (r) => { if (/api\.anthropic\.com\/v1\/messages/.test(r.url())) {
  const h = r.headers();
  seen.push({ xApiKey: h["x-api-key"] ? h["x-api-key"].slice(0, 12) : null, auth: h["authorization"] ? h["authorization"].slice(0, 24) : null, beta: h["anthropic-beta"] || null, direct: h["anthropic-dangerous-direct-browser-access"] || null });
} });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(6000);
console.log("document.title:", JSON.stringify(await p.evaluate(() => document.title)));
console.log("annotate booted:", await p.evaluate(() => {
  for (const [, i] of window.__CB_DEPS.currentModules) if (i && i.name === "@tomlarkworthy/annotate") return true;
  return false;
}));
console.log("annotate menu item present:", await p.evaluate(() => !!document.querySelector('[data-a2-root],[data-a2-layer]') || /annotate/i.test(document.body.innerText)));

for (const key of ["sk-ant-api03-probeonly", "sk-ant-oat01-probeonly"]) {
  await p.fill("#cb-key", key);
  await p.selectOption("#cb-provider", "anthropic");
  await p.waitForFunction(() => { const h = window.__termHealth && window.__termHealth(); return h && h.bufferedChars > 0; }, { timeout: 60000 }).catch(() => {});
  await sleep(7000);
  const screen = await p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
  console.log(key.slice(0, 14) + " | auth conflict banner:", /Auth conflict/i.test(screen));
  seen.length = 0;
  await p.click(".xterm-screen").catch(() => {});
  await p.keyboard.type("hi", { delay: 10 });
  await p.keyboard.press("Enter");
  await sleep(12000);
  console.log(key.slice(0, 14) + " | wire:", JSON.stringify(seen.slice(0, 2)));
  await p.keyboard.press("Escape");
  await p.selectOption("#cb-provider", "openrouter");
  await sleep(4000);
}
await b.close(); process.exit(0);
