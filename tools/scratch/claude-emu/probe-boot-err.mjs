import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const msgs = [];
p.on("pageerror", (e) => msgs.push("pageerror: " + String(e).slice(0, 300)));
await p.addInitScript(() => { window.__CB_DEBUG = true; });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, 25000));
console.log(msgs.slice(-10).join("\n"));
const st = await p.evaluate(() => {
  const f = document.querySelector("#cb-cli-frame");
  const w = f && f.contentWindow;
  return {
    frame: !!f,
    hasVol: !!(w && w.__vol),
    cliExit: w && w.__cliExit,
    say: w && w.__SAYLOG ? w.__SAYLOG.slice(-8) : null,
    health: window.__termHealth ? window.__termHealth().renderedChars : "none",
    mcp: (window.__MCPLOG || []).map((e) => e.ev + (e.url ? " " + e.url : "")).slice(-15),
  };
});
console.log(JSON.stringify(st, null, 1));
await b.close(); process.exit(0);
