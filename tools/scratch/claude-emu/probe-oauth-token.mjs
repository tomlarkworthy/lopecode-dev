// Does api.anthropic.com accept an OAuth access token from a browser at all? Send a
// bogus one both ways; the two rejections say whether the route is even open.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
const body = { model: "claude-sonnet-4-5", max_tokens: 4, messages: [{ role: "user", content: "hi" }] };
for (const mode of ["apikey", "oauth"]) {
  const r = await p.evaluate(async ({ mode, body }) => {
    const h = { "content-type": "application/json", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
    if (mode === "apikey") h["x-api-key"] = "sk-ant-api03-bogus";
    else { h["authorization"] = "Bearer sk-ant-oat01-bogus"; h["anthropic-beta"] = "oauth-2025-04-20"; }
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: h, body: JSON.stringify(body) });
      return { status: res.status, body: (await res.text()).slice(0, 200) };
    } catch (e) { return { blocked: String(e.message || e) }; }
  }, { mode, body });
  console.log(mode + ":", JSON.stringify(r));
}
await b.close(); process.exit(0);
