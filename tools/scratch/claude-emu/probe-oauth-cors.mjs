// Can the browser redeem an OAuth code? Send a deliberately invalid one: a 4xx means
// CORS allows the exchange, a TypeError means the browser blocked it outright.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
const urls = ["https://console.anthropic.com/v1/oauth/token", "https://platform.claude.com/v1/oauth/token"];
for (const u of urls) {
  console.log(u, JSON.stringify(await p.evaluate(async (url) => {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", code: "invalid" }) });
      return { status: r.status, body: (await r.text()).slice(0, 120) };
    } catch (e) { return { blocked: String(e && e.message || e) }; }
  }, u)));
}
await b.close(); process.exit(0);
