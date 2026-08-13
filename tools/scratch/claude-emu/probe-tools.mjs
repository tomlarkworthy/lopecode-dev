// Two separate questions:
//  1. does the FILE layer that Read/Write sit on work inside the frame (node:fs -> host)?
//  2. can the model actually drive Read/Write and the notebook MCP tools in a real turn?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const HASH = "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
await p.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(3000);

// ---- 1. the fs layer, straight through the frame's node:fs shim ----------------
console.log("fs shim:", JSON.stringify(await p.evaluate(async () => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const fs = w.__nodefs || (w.require && w.require("node:fs")) || null;
  if (!fs) return { error: "no fs handle exposed on the frame" };
  const out = {};
  try { out.readSrc = fs.readFileSync("/src/@tomlarkworthy/claude-code-browser.js", "utf8").length; } catch (e) { out.readSrc = "ERR " + e.message; }
  try { out.readContent = fs.readFileSync("/content/@tomlarkworthy/markdown-wiki/what-makes-a-great-lopebook.md", "utf8").length; } catch (e) { out.readContent = "ERR " + e.message; }
  try { out.listSrc = fs.readdirSync("/src/@tomlarkworthy").length; } catch (e) { out.listSrc = "ERR " + e.message; }
  try {
    fs.writeFileSync("/src/@user/fs-probe.js", 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("probe")).define("probe",[],()=>"FS_PROBE_OK");return main;}');
    out.wroteModule = true;
  } catch (e) { out.wroteModule = "ERR " + e.message; }
  try { fs.writeFileSync("/home/user/project/scratch.txt", "hello"); out.wroteScratch = fs.readFileSync("/home/user/project/scratch.txt", "utf8"); } catch (e) { out.wroteScratch = "ERR " + e.message; }
  return out;
})));
await sleep(2500);
console.log("module applied to runtime:", JSON.stringify(await p.evaluate(() => {
  const ids = []; try { for (const i of window.__CB_DEPS.currentModules.values()) if (i && i.name) ids.push(i.name); } catch {}
  return { fsProbePresent: ids.includes("@user/fs-probe"), total: ids.length };
})));

// ---- 2. a real turn: make the model use Read and an MCP tool -------------------
const ask = process.env.ASK || "Use the Read tool on /content/@tomlarkworthy/markdown-wiki/what-makes-a-great-lopebook.md and reply with its first heading. Then call the notebook MCP tool list_modules and reply with how many modules it returned. Be brief.";
await p.evaluate((t) => window.__sendKeys(t), ask);
await sleep(1200);
await p.evaluate(() => window.__sendKeys("\r"));
for (let i = 0; i < 24; i++) {
  await sleep(5000);
  const done = await p.evaluate(() => /Read|list_modules|error|Error/.test(window.__dumpTerm()));
  if (done && i > 2) break;
}
console.log("---- transcript ----");
console.log(await p.evaluate(() => window.__dumpTerm()));
console.log("after the turn:", JSON.stringify(await p.evaluate(() => {
  const ids = []; try { for (const i of window.__CB_DEPS.currentModules.values()) if (i && i.name) ids.push(i.name); } catch {}
  return { newModules: ids.filter((i) => i.startsWith("@user/")), total: ids.length,
           srcOnDisk: (window.__RC5FS.readSync("/src/@user/greeting.js") || "").length };
})));
console.log("mcp calls:", JSON.stringify(await p.evaluate(() => (window.__MCPLOG || []).map((e) => e.ev + (e.name ? ":" + e.name : "")))));
console.log("frame log:", JSON.stringify(await p.evaluate(() => (window.__frameMsgs || []).slice(-8))));
await p.screenshot({ path: "nb-7-tools.png" }).catch(() => {});
await b.close(); process.exit(0);
