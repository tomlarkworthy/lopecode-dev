#!/usr/bin/env bun
// Probe: fork a notebook to a blob: tab and report which cells died on storage access.
// Usage: bun tools/probe-fork-storage.ts <notebook.html> [--headed]
import { chromium } from "playwright";
import { resolve } from "path";

const file = process.argv[2];
const headed = process.argv.includes("--headed");
if (!file) { console.error("need a notebook path"); process.exit(2); }

const url = "file://" + resolve(file) +
  "#view=S100(@tomlarkworthy/claude-code-pairing,@tomlarkworthy/exporter-3)";

const CELLS = ["cc_ws", "fileSyncPanel", "syncEnabled", "directory", "cc_chat"];

const readErrors = async (page) => page.evaluate((cells) => {
  const rt = window.__ojs_runtime;
  if (!rt) return { __err: "no __ojs_runtime" };
  const mods = new Set();
  for (const m of rt._modules?.values?.() ?? []) mods.add(m);
  for (const m of rt.mains ?? []) mods.add(m);
  if (!mods.size) return { __err: "no modules; keys=" + Object.keys(rt).join(",") };
  const out = {};
  for (const m of mods) {
    for (const v of m._variables ?? []) {
      const n = v._name;
      if (!n || !cells.includes(n)) continue;
      const err = v._reachable === false ? "unreachable"
        : v._error ? String(v._error.message ?? v._error)
        : v._value instanceof Error ? String(v._value.message ?? v._value)
        : v._value === undefined ? "undefined/pending"
        : "ok";
      if (!(n in out) || out[n] === "unreachable" || out[n] === "undefined/pending") out[n] = err;
    }
  }
  return out;
}, CELLS);

// What the user actually sees: the Inspector renders "name = RuntimeError: ..." in the DOM.
const readDomErrors = async (page) => page.evaluate(() =>
  [...document.querySelectorAll(".observablehq--error, .observablehq--inspect")]
    .map(n => n.textContent.trim().replace(/\s+/g, " "))
    .filter(t => /RuntimeError|SecurityError|Access is denied/.test(t))
    .map(t => t.slice(0, 160)));

const browser = await chromium.launch({ headless: !headed });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on("pageerror", e => console.log("[parent pageerror]", e.message));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(8000);

console.log("origin(parent):", await page.evaluate(() => location.origin));
console.log("parent cells:", JSON.stringify(await readErrors(page)));
console.log("parent DOM errors:", JSON.stringify(await readDomErrors(page), null, 2));

// Fork to a tab: exporter-3 renders an Inputs.button labelled "Fork"
const popupP = ctx.waitForEvent("page", { timeout: 60000 });
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Fork");
  if (!b) return false;
  b.click();
  return true;
});
if (!clicked) { console.log("NO FORK BUTTON FOUND"); await browser.close(); process.exit(3); }

const popup = await popupP;
popup.on("console", m => { if (m.type() === "error") console.log("[fork console]", m.text()); });
popup.on("pageerror", e => console.log("[fork pageerror]", e.message));
await popup.waitForTimeout(12000);

console.log("origin(fork):", await popup.evaluate(() => location.origin));
console.log("url(fork):", (await popup.url()).slice(0, 60));
console.log("fork cells:", JSON.stringify(await readErrors(popup)));
console.log("fork DOM errors:", JSON.stringify(await readDomErrors(popup), null, 2));

// Functional check: are the panels actually alive in the fork, not merely error-free?
const fn = await popup.evaluate(() => {
  const out = {};
  out.ccStatusVisible = /connecting|disconnected|connected|Pair with Claude|LOPE-/i.test(document.body.innerText);
  const syncCb = [...document.querySelectorAll('input[type="checkbox"]')]
    .find(b => /Sync enabled/i.test(b.closest("label")?.textContent ?? ""));
  out.syncCheckboxRendered = !!syncCb;
  if (syncCb) {
    try { syncCb.click(); out.syncToggleThrew = false; syncCb.click(); }
    catch (e) { out.syncToggleThrew = String(e.message); }
  }
  out.pickDirButton = [...document.querySelectorAll("button")]
    .some(b => /Pick sync directory|Loading/i.test(b.textContent));
  return out;
});
console.log("fork functional:", JSON.stringify(fn, null, 2));

await browser.close();
