// Does a real turn still complete with no ANTHROPIC_API_KEY set?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(5000);
await p.click(".xterm-screen").catch(() => {});
await p.keyboard.press("Enter");            // dev-channels dialog
await sleep(6000);
await p.keyboard.type("reply with exactly the word PONG and nothing else");
await p.keyboard.press("Enter");
await sleep(30000);
const scr = await p.evaluate(() => (document.querySelector(".xterm-rows") || {}).innerText || "");
console.log("PONG seen:", /PONG/.test(scr), "| auth conflict banner:", /Auth conflict/i.test(scr));
console.log(scr.split("\n").filter((l) => l.trim()).slice(-14).join("\n"));
await b.close(); process.exit(0);
