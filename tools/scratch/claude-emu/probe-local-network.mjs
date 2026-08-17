// What does the published page ask the LOCAL network for? Chrome prompts for Local
// Network Access on any request from a public page to loopback, a private IP or a
// .local name — users see that prompt and it needs a cause, not a guess.
// URL=<url> to point elsewhere (default: the published GitHub Pages copy).
import { chromium } from "playwright";
const URL_ = process.env.URL || "https://tomlarkworthy.github.io/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LOCAL = /^(wss?|https?):\/\/(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[^/]*\.local(:|\/|$))/i;

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const local = [], failed = [], ws = [];
p.on("request", (r) => { if (LOCAL.test(r.url())) local.push(r.method() + " " + r.url()); });
p.on("requestfailed", (r) => { if (LOCAL.test(r.url())) failed.push(r.url() + " — " + (r.failure() || {}).errorText); });
p.on("websocket", (s) => { ws.push(s.url()); });
p.on("console", (m) => { if (/local network|private network|Local Network Access/i.test(m.text())) console.log("[console]", m.text().slice(0, 160)); });

console.log("loading", URL_);
await p.goto(URL_, { waitUntil: "load", timeout: 90000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 }).catch(() => console.log("(terminal never painted)"));
await sleep(20000);

console.log("\nlocal-network requests:", local.length ? local : "none");
console.log("websockets:", ws.length ? ws : "none");
console.log("failed local requests:", failed.length ? failed : "none");
await b.close();
process.exit(local.length + ws.filter((u) => LOCAL.test(u)).length ? 1 : 0);
