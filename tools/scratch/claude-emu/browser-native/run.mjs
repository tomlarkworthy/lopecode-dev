// Boot-test driver: starts the mock/static server, loads the harness in
// headless Chromium, captures console + errors, and reports whether cli.js
// issued the outbound POST /v1/messages and printed the assistant text.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8791);
const WAIT = Number(process.env.WAIT || 12000);

const srv = spawn(process.execPath, [join(here, "server.mjs")], { env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
const apiHits = [];
srv.stdout.on("data", (d) => {
  const s = d.toString();
  process.stdout.write("[srv] " + s);
  if (s.includes(">>> API")) apiHits.push(s);
});
srv.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleLines = [];
page.on("console", (m) => { const t = `[${m.type()}] ${m.text()}`; consoleLines.push(t); process.stdout.write("[page] " + t + "\n"); });
page.on("pageerror", (e) => { const t = "[pageerror] " + e.message + "\n" + (e.stack || ""); consoleLines.push(t); process.stdout.write("[page] " + t + "\n"); });

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, WAIT));

const state = await page.evaluate(() => ({
  errors: window.__errors || [],
  cliExit: window.__cliExit,
  stdout: (globalThis.__cliOut?.stdout || []).join(""),
  stderr: (globalThis.__cliOut?.stderr || []).join(""),
  fetches: window.__fetchLog || [],
  volFiles: (() => { try { return Object.keys(globalThis.__vol.toJSON()); } catch { return []; } })(),
}));
console.log("fetches:", state.fetches);
console.log("memfs files written:", state.volFiles.filter((f) => !f.includes("/.claude.json") && !f.endsWith("config.json")));
const debugLog = await page.evaluate(() => {
  try { const j = globalThis.__vol.toJSON(); const k = Object.keys(j).find((f) => f.includes("/debug/")); return k ? j[k] : null; } catch { return null; }
});
if (debugLog) console.log("\n---- cli debug log ----\n" + debugLog);

await page.screenshot({ path: join(here, "spike-result.png"), fullPage: true }).catch(() => {});

console.log("\n================ SPIKE RESULT ================");
console.log("API hits (server-observed POSTs):", apiHits.length);
console.log("cli exit code:", state.cliExit);
console.log("---- captured stdout ----\n" + state.stdout);
console.log("---- captured stderr ----\n" + state.stderr);
console.log("---- page errors (" + state.errors.length + ") ----");
for (const e of state.errors.slice(0, 8)) console.log(e.kind + ": " + e.message + "\n" + (e.stack || "").split("\n").slice(0, 6).join("\n"));

const printedReply = state.stdout.includes("browser-native") || state.stdout.includes("Hello from");
const posted = apiHits.length > 0;
console.log("\nVERDICT:", posted && printedReply ? "GO (POST issued + reply printed)" : posted ? "PARTIAL (POST issued, reply not printed)" : "NO-GO / needs more shimming");
console.log("=============================================");

await browser.close();
srv.kill();
process.exit(0);
