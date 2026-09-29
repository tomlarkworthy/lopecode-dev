// Acceptance checks for single-file-revolution.html (headless Chromium).
// bun single-file-revolution/check.mjs
import { chromium } from "playwright";
import { readFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const original = resolve(here, "single-file-revolution.html");
const out = resolve(here, "out");
mkdirSync(out, { recursive: true });

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? "ok  " : "FAIL"} ${label}`); if (!ok) failed++; };
const jsonBlock = /(<script type="application\/json" id="entries">)[\s\S]*?(<\/script>)/;
const outside = (s) => s.replace(jsonBlock, "$1$2");

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });

async function open(path) {
  const page = await ctx.newPage();
  const requests = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:")) requests.push(r.url()); });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("file://" + path);
  return { page, requests, errors };
}

async function add(page, name, url, file) {
  await page.keyboard.press("a");
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
  await page.keyboard.type(url);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  check(dl.suggestedFilename() === "single-file-revolution.html", `download is named ${dl.suggestedFilename()}`);
  await dl.saveAs(file);
  return readFileSync(file, "utf8");
}

const src = readFileSync(original, "utf8");
check(statSync(original).size < 60_000, `size ${statSync(original).size} bytes < 60 KB`);

// Generation 0
const g0 = await open(original);
check((await g0.page.evaluate(() => SOURCE)) === src, "captured SOURCE is byte-identical to the file (fixed point)");
const orders = new Set();
for (let i = 0; i < 6; i++) {
  await g0.page.reload();
  const names = await g0.page.$$eval(".row .name", (els) => els.map((e) => e.textContent));
  orders.add(names.slice(0, -1).join("|"));
  await g0.page.waitForTimeout(400);
  const last = await g0.page.$eval(".row:last-child .name", (e) => e.textContent);
  check(last === "Lopecode", `reload ${i}: newest pinned last (${last})`);
}
check(orders.size > 1, `shuffle varies across reloads (${orders.size} distinct orders in 6)`);
await g0.page.screenshot({ path: resolve(out, "desktop.png") });
const evil = "</script><b>x";
const g1src = await add(g0.page, evil, "example.com", resolve(out, "gen1.html"));
check(outside(g1src) === outside(src), "gen1 differs from the original only inside the JSON block");
check(!g1src.includes("</script><b>"), "user input cannot close the script block");
check(g0.requests.length === 0 && g0.errors.length === 0, `gen0: no network (${g0.requests.length}), no errors (${g0.errors.join("; ")})`);

// Generation 1
const g1 = await open(resolve(out, "gen1.html"));
await g1.page.waitForTimeout(800);
const g1names = await g1.page.$$eval(".row .name", (els) => els.map((e) => e.textContent));
check(g1names.at(-1) === evil, `gen1 newest is the literal text ${JSON.stringify(g1names.at(-1))}`);
check(g1names.includes("Lopecode"), "previous newest moved into the pool");
check((await g1.page.$$("nav b")).length === 0, "no <b> element injected");
check((await g1.page.evaluate(() => SOURCE)) === g1src, "gen1 is a fixed point too");
const g2src = await add(g1.page, "Second Person", "https://second.example", resolve(out, "gen2.html"));
check(outside(g2src) === outside(src), "gen2 differs from the original only inside the JSON block");
check(g1.requests.length === 0 && g1.errors.length === 0, `gen1: no network, no errors (${g1.errors.join("; ")})`);

// Phone width, dark scheme, reduced motion
const phone = await browser.newContext({ viewport: { width: 360, height: 740 }, colorScheme: "dark", reducedMotion: "reduce", hasTouch: true, isMobile: true });
const p = await phone.newPage();
await p.goto("file://" + resolve(out, "gen2.html"));
check((await p.$eval(".row:last-child .name", (e) => e.textContent)) === "Second Person", "reduced motion: newest shown at once");
check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal scroll at 360px");
await p.screenshot({ path: resolve(out, "phone-dark.png") });

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
