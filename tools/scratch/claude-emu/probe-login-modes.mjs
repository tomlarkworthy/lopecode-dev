// Does a pasted credential actually log the session in? Three modes, checked at three
// layers: what cli.js holds (credentials file + env), what goes on the wire, what the TUI says.
// A wrong-but-well-formed credential is used deliberately: the interesting question is
// whether Anthropic rejects *our* credential, not whether it rejects nothing at all.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const wire = [];
p.on("request", (r) => {
  if (!/api\.anthropic\.com\/v1\/messages/.test(r.url())) return;
  const h = r.headers();
  wire.push({ xApiKey: h["x-api-key"] || null, auth: h["authorization"] || null, beta: h["anthropic-beta"] || null });
});
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(5000);

const MODES = [
  { name: "oat token", key: "sk-ant-oat01-probeonlyprobeonly" },
  { name: "api key", key: "sk-ant-api03-probeonlyprobeonly" },
  { name: "no credential", key: "" },
];
let fails = 0;
const check = (label, ok, detail) => { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + label + (detail === undefined ? "" : "  " + detail)); };

for (const mode of MODES) {
  await p.selectOption("#cb-provider", "openrouter");
  await sleep(1500);
  await p.fill("#cb-key", mode.key);
  await p.dispatchEvent("#cb-key", "change");
  await sleep(1500);
  await p.selectOption("#cb-provider", "anthropic");
  await p.waitForFunction(() => { const h = window.__termHealth && window.__termHealth(); return h && h.renderedChars > 0; }, { timeout: 90000 }).catch(() => {});
  await sleep(9000);

  const state = await p.evaluate(() => {
    const f = document.getElementById("cb-cli-frame");
    const w = f && f.contentWindow;
    let creds = null, env = null;
    try { creds = JSON.parse(w.__vol.toJSON()["/home/user/.claude/.credentials.json"]); } catch {}
    try { env = { ANTHROPIC_API_KEY: w.process.env.ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL: w.process.env.ANTHROPIC_BASE_URL }; } catch {}
    return { creds, env };
  });
  const screenBefore = await p.evaluate(() => window.__dumpTerm());
  wire.length = 0;
  await p.click(".xterm-screen").catch(() => {});
  await p.keyboard.type("hi", { delay: 10 });
  await p.keyboard.press("Enter");
  await sleep(15000);
  const screen = await p.evaluate(() => window.__dumpTerm());
  if (process.env.DUMP) console.log("----- screen -----\n" + screen.split("\n").filter((l) => l.trim()).slice(-18).join("\n") + "\n-----");

  const tok = state.creds && state.creds.claudeAiOauth || {};
  console.log("\n=== " + mode.name);
  console.log("  credential: " + JSON.stringify({ token: String(tok.accessToken).slice(0, 18), scopes: tok.scopes }) + "  env.ANTHROPIC_API_KEY=" + JSON.stringify(state.env && state.env.ANTHROPIC_API_KEY));
  console.log("  wire: " + JSON.stringify(wire.slice(0, 1)));
  check(mode.name + " · no auth-conflict banner", !/Auth conflict/i.test(screenBefore + screen));
  check(mode.name + " · notebook MCP server is recognised", !/no MCP server configured with that name/i.test(screenBefore + screen));
  const notLoggedIn = /Not logged in/i.test(screen);
  if (mode.key) {
    check(mode.name + " · cli.js does not claim 'Not logged in'", !notLoggedIn);
    check(mode.name + " · a credential reached the wire", wire.length > 0 && !!(wire[0].auth || wire[0].xApiKey), JSON.stringify(wire[0] || null));
  }
  if (/^sk-ant-oat/.test(mode.key)) {
    check("oat · seeded as the session's claude.ai login", tok.accessToken === mode.key);
    check("oat · sent as Bearer with the oauth beta", !!wire[0] && wire[0].auth === "Bearer " + mode.key && /oauth-2025-04-20/.test(wire[0].beta || ""));
    check("oat · reached the API (rejected there, not locally)", /Retrying in \d+s|OAuth access token is invalid|OAuth token revoked|API Error/i.test(screen), JSON.stringify(screen.match(/.{0,60}(invalid|error|API Error).{0,60}/i) || null));
  } else if (mode.key) {
    check("apikey · env holds the key", state.env && state.env.ANTHROPIC_API_KEY === mode.key);
    check("apikey · marker keeps a token for the channel gate", !!tok.accessToken);
    check("apikey · marker is not counted as a login", Array.isArray(tok.scopes) && !tok.scopes.includes("user:inference"));
    check("apikey · sent as x-api-key", !!wire[0] && wire[0].xApiKey === mode.key && !wire[0].auth);
    check("apikey · reached the API (rejected there, not locally)", /Retrying in \d+s|API key is invalid|Invalid API key|API Error/i.test(screen), JSON.stringify(screen.match(/.{0,60}(invalid|error|API Error).{0,60}/i) || null));
  } else {
    check("nokey · says Not logged in", notLoggedIn);
    check("nokey · nothing credential-like on the wire", wire.every((w) => !w.auth && !w.xApiKey), JSON.stringify(wire.slice(0, 1)));
  }
  await p.keyboard.press("Escape");
}
console.log("\n" + (fails ? fails + " FAILED" : "all checks passed"));
await b.close();
process.exit(fails ? 1 : 0);
