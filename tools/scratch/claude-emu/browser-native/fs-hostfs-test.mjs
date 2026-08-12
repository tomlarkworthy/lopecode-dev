// Verify the fs shim delegates to an injected globalThis.__HOSTFS (prime + read
// + write-through) while keeping the memfs-seeded ~/.claude.json onboarding.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8798);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = spawn(process.execPath, [join(here, "server.mjs")], { env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
await sleep(600);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") process.stdout.write("[err] " + m.text() + "\n"); });
page.on("pageerror", (e) => process.stdout.write("[pageerror] " + e.message + "\n"));
await page.goto(`http://127.0.0.1:${PORT}/fs-hostfs-test.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__fsTest, { timeout: 8000 });
const r = await page.evaluate(() => window.__fsTest);
console.log("fs hostfs delegation results:\n" + JSON.stringify(r, null, 2));

const pass =
  r.readFooUtf8 === "HELLO-FROM-HOST" &&
  r.readModPrimed === "export const x = 1;" &&
  r.onboarding === true &&
  r.readBackAfterWrite === "WRITTEN" &&
  r.hostSawWrite === true &&
  r.existsFoo === true &&
  !r.error;
console.log("\nHOSTFS DELEGATION:", pass ? "PASS" : "FAIL");

await browser.close();
srv.kill();
process.exit(pass ? 0 : 1);
