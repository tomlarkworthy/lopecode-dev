// Does a CELL edit (not just a module add) reach history — and so the session?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 });
await sleep(9000);
const rawHistory = () => p.evaluate(async () => {
  const D = window.__CB_DEPS;
  const def = (await D.importShim("/@tomlarkworthy/local-change-history.js?v=4")).default;
  const h = await D.runtime.module(def).value("history");
  return h.map((e) => ({ op: e.op, name: e._name, pid: e.pid }));
});
console.log("history at rest:", JSON.stringify(await rawHistory()));

// 1. a new cell in a new module
const v = await p.evaluate(() => {
  const D = window.__CB_DEPS;
  const m = D.createModule("@qa/edits", D.runtime);
  window.__QA_M = m;
  window.__QA_V = m.variable({ fulfilled() {}, rejected() {} }).define("motto", [], () => "first version");
  return "defined";
});
await sleep(6000);
console.log("after new cell   :", JSON.stringify(await rawHistory()));
console.log("our events       :", JSON.stringify(await p.evaluate(() => window.__nbEvents().map((e) => e.kind + " " + e.what))));

// 2. redefine that cell — a user editing it
await p.evaluate(() => { window.__QA_V.define("motto", [], () => "second version"); });
await sleep(6000);
console.log("after cell edit  :", JSON.stringify(await rawHistory()));
console.log("our events       :", JSON.stringify(await p.evaluate(() => window.__nbEvents().map((e) => e.kind + " " + e.what))));
console.log("pushes           :", JSON.stringify(await p.evaluate(() => (window.__MCPLOG || []).filter((e) => e.ev === "notify").map((e) => e.content))));
await b.close(); process.exit(0);
