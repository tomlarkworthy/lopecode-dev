// Is the duplicate "cell del" a real duplicate in history, or double-recording?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(9000);
const raw = await p.evaluate(async () => {
  const D = window.__CB_DEPS;
  const def = (await D.importShim("/@tomlarkworthy/local-change-history.js?v=4")).default;
  const h = await D.runtime.module(def).value("history");
  return { len: h.length, entries: h.map((e) => ({ t: e.t, op: e.op, pid: e.pid, name: e._name })) };
});
console.log("raw history:", JSON.stringify(raw, null, 1));
console.log("our events:", JSON.stringify(await p.evaluate(() => window.__nbEvents().map((e) => e.kind + " " + e.what)), null, 1));
await b.close(); process.exit(0);
