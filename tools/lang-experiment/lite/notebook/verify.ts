// bun lite/notebook/verify.ts [--shot file.png]
// Opens lite-cells-tutorial.html from file:// in headless Chromium with every non-file request
// aborted, waits for the tutorial's cells, and reports error cells, the test cells, and one
// canvas press made with a real mouse.
import { chromium } from "../../../../node_modules/playwright/index.mjs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = "@tomlarkworthy/lite-cells-tutorial";
const url = `file://${join(HERE, "lite-cells-tutorial.html")}#view=S100(${NAME})`;
const shot = process.argv.includes("--shot") ? process.argv[process.argv.indexOf("--shot") + 1] : null;

import { readFileSync } from "node:fs";
// The examples the notebook shows and the fixtures oracle.ts checks are copies; they must not drift.
for (const [ex, fx] of [["07-workers.tsx", "lite-compile/accept-compile"], ["09-breakout.tsx", "lite-game/accept-breakout"]]) {
  const same = readFileSync(join(HERE, "examples", ex), "utf8") === readFileSync(join(HERE, "../../fixtures", fx, "cells.tsx"), "utf8");
  console.log(`${same ? "pass" : "FAIL"} examples/${ex} equals fixtures/${fx}/cells.tsx`);
  if (!same) process.exitCode = 1;
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
const blocked: string[] = [];
await page.route("**/*", (r) => {
  const u = r.request().url();
  if (u.startsWith("file:") || u.startsWith("blob:") || u.startsWith("data:")) return r.continue();
  blocked.push(u);
  return r.abort();
});
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
await page.goto(url);

const read = () => page.evaluate((name) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt?.mains?.get(name);
  if (!mod) return null;
  const out: Record<string, { state: string; value?: string }> = {};
  for (const v of rt._variables) {
    if (v._module !== mod || !v._name) continue;
    const state = v._error !== undefined ? "error" : v._value !== undefined ? "ok" : "pending";
    out[v._name] = { state, value: state === "error" ? String(v._error?.message ?? v._error) : typeof v._value === "string" || typeof v._value === "number" ? String(v._value) : Array.isArray(v._value) || (v._value && v._value.constructor === Object) ? JSON.stringify(v._value) : undefined };
  }
  return out;
}, NAME);

const tests = ["test_examples_check_as_expected", "test_counter_click", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_example_tests_pass", "test_breakout_subscriptions", "test_breakout_memo", "benchmark"];
let vars = null as Awaited<ReturnType<typeof read>>;
for (let i = 0; i < 120; i++) {
  vars = await read();
  if (vars && tests.every((t) => vars![t] && vars![t].state !== "pending")) break;
  await page.waitForTimeout(500);
}
if (!vars) { console.log("module never booted"); process.exit(1); }
const errorCells = Object.entries(vars).filter(([, v]) => v.state === "error");
const domErrors = await page.locator(".observablehq--error").count();
console.log(`variables ${Object.keys(vars).length}, error variables ${errorCells.length}, .observablehq--error nodes on page ${domErrors}`);
for (const [n, v] of errorCells) console.log(`  error ${n}: ${v.value}`);
let failed = errorCells.length > 0;
for (const t of tests) {
  const v = vars[t];
  console.log(`${v?.state === "ok" ? "pass" : "FAIL"} ${t}: ${v?.value ?? v?.state}`);
  if (v?.state !== "ok") failed = true;
}

// The workers lesson (the third app): the pool ran, and the iterations slider redraws the picture.
const bench = JSON.parse(vars.benchmark?.value ?? "{}");
const poolRan = bench.poolSize >= 1 && bench.same === true && bench.poolMs > 0;
console.log(`${poolRan ? "pass" : "FAIL"} worker pool from file://: ${JSON.stringify(bench)}`);
if (!poolRan) failed = true;
const workersLesson = page.locator(".lite-lesson").filter({ has: page.locator(".lite-mandel") });
const info = workersLesson.locator(".lite-readout");
await workersLesson.locator(".lite-mandel").scrollIntoViewIfNeeded();
if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-workers.png") });
const range = workersLesson.locator(".lite-app input[type=range]");
await range.evaluate((el: any) => { el.value = "200"; el.dispatchEvent(new Event("input", { bubbles: true })); });
await page.waitForFunction(() => /maxIter 200:/.test(document.querySelector(".lite-lesson .lite-readout")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
const infoText = await info.textContent();
const redrawn = /maxIter 200:/.test(infoText ?? "");
console.log(`${redrawn ? "pass" : "FAIL"} iterations slider redraws: ${infoText}`);
if (!redrawn) failed = true;
if (shot) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: shot.replace(/\.png$/, "-top.png") });
  await page.locator(".lite-vars").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot.replace(/\.png$/, "-model.png") });
}

// Breakout: play with a real mouse over the board, then pause.
const game = page.locator(".lite-lesson").filter({ has: page.getByRole("button", { name: "new game" }) });
await game.scrollIntoViewIfNeeded();
const board = game.locator(".lite-app canvas");
const status = async () => (await game.locator(".lite-app output").textContent())?.replace(/\s+/g, " ").trim();
const ballTop = () => game.locator(".lite-app div[style*='border-radius']").evaluate((el: any) => el.style.top);
const top0 = await ballTop();
await game.getByRole("button", { name: "play" }).click();
const bb = (await board.boundingBox())!;
for (let i = 0; i < 20; i++) { await page.mouse.move(bb.x + 60 + i * 10, bb.y + 200); await page.waitForTimeout(50); }
const top1 = await ballTop();
const paddleLeft = await game.locator(".lite-app div[style*='top:220px']").evaluate((el: any) => el.style.left);
await game.getByRole("button", { name: "pause" }).click();
await page.waitForTimeout(100);
const top2 = await ballTop();
await page.waitForTimeout(400);
const top3 = await ballTop();
const played = top1 !== top0 && top2 === top3 && paddleLeft !== "136px";
console.log(`${played ? "pass" : "FAIL"} breakout plays and pauses: ball top ${top0} -> ${top1}, paused ${top2} = ${top3}, paddle left ${paddleLeft}; ${await status()}`);
if (!played) failed = true;
if (shot) await page.screenshot({ path: shot.replace(/\.png$/, "-game.png") });

// Typing in a source box re-checks: width as a string rejects area.
const box = page.locator(".lite-box textarea").first();
await box.fill((await box.inputValue()).replace("() => 640", '() => "640"'));
await page.waitForTimeout(500);
const firstLesson = await page.locator(".lite-lesson").first().textContent();
const edited = /\[inject-type\] width: string is not assignable to number/.test(firstLesson ?? "");
console.log(`${edited ? "pass" : "FAIL"} editing width re-checks the first lesson`);
if (!edited) failed = true;

console.log(`page errors ${errors.length}${errors.length ? ": " + errors.slice(0, 5).join(" | ") : ""}; non-file requests aborted ${blocked.length}`);
for (const u of [...new Set(blocked)].slice(0, 10)) console.log(`  aborted ${u}`);
if (shot) await page.screenshot({ path: shot, fullPage: false });
await browser.close();
process.exit(failed || process.exitCode ? 1 : 0);
