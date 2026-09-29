// End-to-end check of the Lopecode notebook: boot, add a name, open the downloaded copy, add again.
// bun single-file-revolution/check-notebook.mjs
import { chromium } from "playwright";
import { mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const notebook = resolve(here, "../lopebooks/notebooks/tomlarkworthy_single-file-revolution.html");
const out = resolve(here, "out");
mkdirSync(out, { recursive: true });

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? "ok  " : "FAIL"} ${label}`); if (!ok) failed++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });

async function boot(path) {
  const page = await ctx.newPage();
  const remote = [];
  page.on("request", (r) => { if (!/^(file|data|blob):/.test(r.url())) remote.push(r.url()); });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  await page.goto("file://" + path);
  await page.waitForSelector(".sfr-row", { timeout: 60000 });
  await page.waitForTimeout(1500);
  return { page, remote, errors };
}

async function names(page, newest) {
  await page.waitForFunction((n) => document.querySelector(".sfr-list .sfr-row:last-child .sfr-name")?.textContent === n, newest, { timeout: 15000 }).catch(() => {});
  return page.$$eval(".sfr-list .sfr-row .sfr-name", (els) => els.map((e) => e.textContent));
}

async function add(page, name, url, file) {
  await page.mouse.click(420, 150);   // the desk around the window: focuses the directory
  await page.keyboard.press("a");
  await page.keyboard.type(name);
  await page.keyboard.press("Enter");
  await page.keyboard.type(url);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.keyboard.press("Enter")]);
  check(dl.suggestedFilename() === "single-file-revolution.html", `download is named ${dl.suggestedFilename()}`);
  await dl.saveAs(file);
  check(statSync(file).size > 1_000_000, `download is the whole notebook (${(statSync(file).size / 1e6).toFixed(2)} MB)`);
  return file;
}

const g0 = await boot(notebook);
check((await g0.page.title()) === "The Single File Revolution", `title: ${await g0.page.title()}`);
const n0 = await g0.page.$$eval(".sfr-list .sfr-row .sfr-name", (els) => els.map((e) => e.textContent));
const base = n0.length;
check(base >= 6 && n0.includes("Lopecode"), `boots with ${base} names (${n0.join(", ")})`);
check(await g0.page.$eval(".sfr-list .sfr-row:last-child", (e) => e.classList.contains("sfr-sel")), "newest starts selected");
await g0.page.keyboard.press("ArrowUp");
check(await g0.page.$eval(".sfr-list .sfr-row:nth-last-child(2)", (e) => e.classList.contains("sfr-sel")), "ArrowUp moves the bar");
await g0.page.screenshot({ path: resolve(out, "notebook-g0.png") });
const evil = "</script><b>x";
const f1 = await add(g0.page, evil, "example.com", resolve(out, "notebook-gen1.html"));
console.log("     gen0 remote requests:", g0.remote.length ? g0.remote : "none");
console.log("     gen0 page errors:", g0.errors.length ? g0.errors : "none");

const g1 = await boot(f1);
const n1 = await names(g1.page, evil);
check(n1.at(-1) === evil && n1.length === base + 1, `copy boots with ${base + 1} names, newest is the literal text (${JSON.stringify(n1.at(-1))})`);
check(n1.includes(n0.at(-1)), "previous newest moved into the pool");
check((await g1.page.$$(".sfr-list b")).length === 0, "no <b> element injected");
check((await g1.page.title()) === "The Single File Revolution", "copy keeps the title");
check(await g1.page.evaluate(() => __ojs_runtime.mains.has("@tomlarkworthy/robocoop-5") && __ojs_runtime.mains.has("@tomlarkworthy/annotate")), "copy still boots robocoop-5 and annotate");
const f2 = await add(g1.page, "Second Person", "https://second.example", resolve(out, "notebook-gen2.html"));

const g2 = await boot(f2);
const n2 = await names(g2.page, "Second Person");
check(n2.at(-1) === "Second Person" && n2.length === base + 2, `fork of a fork boots with ${base + 2} names (${n2.at(-1)})`);
await g2.page.screenshot({ path: resolve(out, "notebook-g2.png") });

await browser.close();
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
