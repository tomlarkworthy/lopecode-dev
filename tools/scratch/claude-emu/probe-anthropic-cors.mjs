// Does api.anthropic.com answer a browser at all? A 401 means CORS let us through
// (auth is a separate matter); "Failed to fetch" means the browser blocked it.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
for (const withHeader of [false, true]) {
  console.log("header " + (withHeader ? "SENT " : "absent") + ":", JSON.stringify(await p.evaluate(async (h) => {
    const headers = { "content-type": "application/json", "x-api-key": "sk-ant-invalid", "anthropic-version": "2023-06-01" };
    if (h) headers["anthropic-dangerous-direct-browser-access"] = "true";
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }) });
      return { status: r.status, body: (await r.text()).slice(0, 100) };
    } catch (e) { return { blocked: String(e && e.message || e) }; }
  }, withHeader)));
}
await b.close(); process.exit(0);
