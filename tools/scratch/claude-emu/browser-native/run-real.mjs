// Real-LLM boot test: browser-native cli.js -> local static+proxy server -> translator -> OpenRouter/MiMo.
// Proves the round-trip is a genuine model call, not the mock.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8792);
const WAIT = Number(process.env.WAIT || 30000);
const UPSTREAM = process.env.UPSTREAM || "http://127.0.0.1:8787";
const PROMPT = process.env.PROMPT || "Reply with exactly one word: BANANA";

const srv = spawn(process.execPath, [join(here, "server.mjs")], { env: { ...process.env, PORT: String(PORT), UPSTREAM }, stdio: ["ignore", "pipe", "pipe"] });
const apiHits = [];
srv.stdout.on("data", (d) => { const s = d.toString(); process.stdout.write("[srv] " + s); if (s.includes(">>> API")) apiHits.push(s); });
srv.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript((prompt) => { globalThis.__ARGV = ["/usr/bin/node", "/cli.js", "-p", prompt]; }, PROMPT);
page.on("console", (m) => process.stdout.write(`[page ${m.type()}] ${m.text()}\n`));
page.on("pageerror", (e) => process.stdout.write("[pageerror] " + e.message + "\n"));

await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, WAIT));

const state = await page.evaluate(() => ({
  cliExit: window.__cliExit,
  stdout: (globalThis.__cliOut?.stdout || []).join(""),
  stderr: (globalThis.__cliOut?.stderr || []).join(""),
}));

await page.screenshot({ path: join(here, "spike-real.png"), fullPage: true }).catch(() => {});
console.log("\n================ REAL-LLM RESULT ================");
console.log("prompt:", JSON.stringify(PROMPT));
console.log("API hits (server-observed):", apiHits.length);
console.log("cli exit code:", state.cliExit);
console.log("---- stdout ----\n" + state.stdout);
console.log("---- stderr ----\n" + state.stderr.slice(0, 2000));
console.log("================================================");
await browser.close();
srv.kill();
process.exit(0);
