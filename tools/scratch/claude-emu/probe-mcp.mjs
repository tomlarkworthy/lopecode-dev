// Why doesn't cli.js call the in-page MCP endpoint? Boot, ask the TUI itself (/mcp),
// and dump the frame's log.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const HASH = "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.addInitScript(() => { window.__CB_DEBUG = true; });
await p.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(3000);
console.log("ARGV:", JSON.stringify(await p.evaluate(() => { const f = document.querySelector("#cb-cli-frame"); return f && f.contentWindow && f.contentWindow.__ARGV; })));
console.log("frame log:", JSON.stringify(await p.evaluate(() => (window.__frameMsgs || []).slice(0, 25))));
console.log("mcp log:", JSON.stringify(await p.evaluate(() => window.__MCPLOG)));
await p.evaluate(() => window.__sendKeys("/mcp"));
await sleep(1500);
await p.evaluate(() => window.__sendKeys("\r"));
await sleep(6000);
console.log("---- screen after /mcp ----");
console.log(await p.evaluate(() => window.__dumpTerm()));
await p.evaluate(() => window.__sendKeys("\r"));   // open the failed server's detail
await sleep(4000);
console.log("---- detail ----");
console.log(await p.evaluate(() => window.__dumpTerm()));
console.log("---- cli debug log (frame vol) ----");
console.log(await p.evaluate(() => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const vol = w.__vol; if (!vol) return "no vol";
  const files = typeof vol.toJSON === "function" ? vol.toJSON() : null;
  if (!files) return "vol has no toJSON: " + Object.keys(vol).slice(0, 20).join(",");
  const key = Object.keys(files).find((k) => k.includes("/debug/"));
  if (!key) return "no debug file; paths: " + Object.keys(files).filter((k) => k.includes(".claude")).slice(0, 10).join(" ");
  const txt = String(files[key] || "");
  const hit = txt.split("\n").filter((l) => /mcp|notebook|transport|fetch|error/i.test(l));
  return (hit.length ? hit : txt.split("\n")).slice(-40).join("\n");
}));
console.log("mcp log after:", JSON.stringify(await p.evaluate(() => window.__MCPLOG)));
await b.close(); process.exit(0);
