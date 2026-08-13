// Does cli.js want a server->client stream (MCP notifications), and do we refuse it?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.addInitScript(() => { window.__CB_DEBUG = true; });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(6000);
console.log("mcp traffic in order:", JSON.stringify(await p.evaluate(() => (window.__MCPLOG || []).map((e) => e.ev))));
console.log("debug log (mcp lines):", JSON.stringify(await p.evaluate(() => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const files = w.__vol.toJSON();
  const k = Object.keys(files).find((x) => x.includes("/debug/"));
  if (!k) return "no debug log";
  return String(files[k]).split("\n").filter((l) => /notification|stream|SSE|GET|405|listChanged/i.test(l)).slice(-8);
})));
await b.close(); process.exit(0);
