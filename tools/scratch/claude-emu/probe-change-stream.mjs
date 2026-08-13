// A cell edited in the notebook must reach the session as a channel message, and
// notebook_events must then hand back the actual edit.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(6000);
const dump = () => p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
console.log("channels listening:", /Listening for channel messages/.test(await dump()));

// Edit a cell the way a user does — through the notebook's own define path.
const defined = await p.evaluate(async () => {
  const D = window.__CB_DEPS;
  const mod = D.createModule("@qa/change-stream", D.runtime);
  mod.variable({ fulfilled() {}, rejected() {} }).define("qa_cell", ["md"], (md) => md`# edited by the user`);
  await new Promise((r) => setTimeout(r, 500));
  return { module: mod._name, mains: D.runtime.mains ? D.runtime.mains.size : null };
});
console.log("edit made:", JSON.stringify(defined));
await sleep(9000);

const screen = await dump();
const pushed = /notebook: .*cell|notebook_change|call notebook_events/i.test(screen);
console.log("channel line on screen:", pushed);
console.log("recent screen:", screen.split("\n").filter((l) => l.includes("←") || /notebook:/.test(l)).slice(-4).join("\n") || "(none)");

const ev = await p.evaluate(async () => await window.__NBTOOLS.call("notebook_events", { limit: 10 }));
console.log("notebook_events:", JSON.stringify(ev.map((e) => ({ kind: e.kind, what: e.what, src: String(e.source || "").slice(0, 40) })), null, 1));
const tools = await p.evaluate(() => window.__NBTOOLS.list().map((t) => t.name));
console.log("tools:", JSON.stringify(tools));
await b.close(); process.exit(0);
