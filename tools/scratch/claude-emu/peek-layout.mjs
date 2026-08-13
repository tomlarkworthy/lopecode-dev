import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const HASH = process.env.HASH || "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
await p.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => typeof window.__autostart === "function", { timeout: 45000 }).catch(() => console.log("no autostart"));
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 2000));
const info = await p.evaluate(() => {
  const r = document.querySelector("#cb-restart"), root = window.__CB_ROOT;
  const bb = (el) => el ? el.getBoundingClientRect() : null;
  return {
    restart: !!r, restartBox: bb(r), rootConnected: !!(root && root.isConnected), rootBox: bb(root),
    provider: !!document.querySelector("#cb-provider"), url: !!document.querySelector("#cb-url"),
    panes: [...document.querySelectorAll(".lm_tab, .lp-pane, [data-module]")].slice(0, 6).map((e) => e.textContent.trim().slice(0, 40)),
  };
});
console.log(JSON.stringify(info, null, 2));
await p.screenshot({ path: "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/nb-6-layout.png", fullPage: false });
await b.close(); process.exit(0);
