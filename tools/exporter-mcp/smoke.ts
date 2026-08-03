// Boot an exporter-mcp notebook in Chromium and report whether the runtime came up.
// Usage: bun tools/exporter-mcp/smoke.ts <file.html> [--headed] [--wait 15000]
import { chromium } from "playwright";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("usage: bun tools/exporter-mcp/smoke.ts <file.html>"); process.exit(1); }
const waitMs = Number(args[args.indexOf("--wait") + 1]) || 15000;

const browser = await chromium.launch({ headless: !args.includes("--headed") });
const page = await browser.newPage();

if (args.includes("--offline")) {
  // the target sandbox has no outbound network; prove the file is genuinely self-contained
  await page.route("**/*", (route) => (route.request().url().startsWith("file:") ? route.continue() : route.abort()));
}

const errors: string[] = [];
const cspViolations: string[] = [];
const logs: string[] = [];
page.on("console", (m) => {
  const t = `[${m.type()}] ${m.text()}`;
  logs.push(t);
  if (m.type() === "error") {
    errors.push(t);
    if (/Content Security Policy|Refused to/.test(m.text())) cspViolations.push(t);
  }
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(`file://${resolve(file)}`, { waitUntil: "load", timeout: 60000 });

// Wait for the runtime to exist and for cells to have been observed.
const deadline = Date.now() + waitMs;
let state: any = null;
while (Date.now() < deadline) {
  state = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime;
    if (!rt) return { runtime: false };
    const vars = [...rt._variables];
    return {
      runtime: true,
      modules: rt.mains ? [...rt.mains.keys()] : [],
      variables: vars.length,
      fulfilled: vars.filter((v: any) => v._value !== undefined).length,
      errored: vars
        .filter((v: any) => v._error)
        .map((v: any) => `${v._name}: ${String(v._error && v._error.message).slice(0, 120)}`)
        .slice(0, 15),
      linked: (window as any).__lopeModules ? (window as any).__lopeModules.size : 0,
      cells: document.querySelectorAll(".observablehq").length,
      bodyText: document.body.innerText.slice(0, 200),
    };
  });
  if (state?.runtime && state.cells > 0) break;
  await page.waitForTimeout(400);
}

// settle: keep polling until the fulfilled count stops moving (lazy cells keep arriving)
let stable = 0;
let last = -1;
while (stable < 4 && Date.now() < deadline + waitMs) {
  await page.waitForTimeout(500);
  const now = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime;
    return rt ? [...rt._variables].filter((v: any) => v._value !== undefined).length : 0;
  });
  stable = now === last ? stable + 1 : 0;
  last = now;
}
state = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  return {
    runtime: true,
    modules: rt.mains ? [...rt.mains.keys()] : [],
    variables: vars.length,
    fulfilled: vars.filter((v: any) => v._value !== undefined).length,
    errored: vars.filter((v: any) => v._error).map((v: any) => `${v._name}: ${String(v._error && v._error.message).slice(0, 120)}`).slice(0, 15),
    linked: (window as any).__lopeModules ? (window as any).__lopeModules.size : 0,
    cells: document.querySelectorAll(".observablehq").length,
    bodyText: document.body.innerText.slice(0, 200),
  };
});

console.log(JSON.stringify(state, null, 2));
console.log(`\nlinked modules : ${state?.linked ?? 0}`);
console.log(`console errors : ${errors.length}`);
for (const e of errors.slice(0, 25)) console.log(`   ${e}`);
if (cspViolations.length) console.log(`\nCSP violations : ${cspViolations.length}  <-- design failure`);

await page.screenshot({ path: file.replace(/\.html$/, ".png"), fullPage: false });
await browser.close();
process.exit(state?.runtime && state.cells > 0 && cspViolations.length === 0 ? 0 : 1);
