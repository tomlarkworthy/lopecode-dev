#!/usr/bin/env bun
// End-to-end: does claude-code-pairing actually CONNECT from a blob: fork tab?
// Usage: bun tools/probe-fork-pairing-connect.ts <notebook.html> <LOPE-TOKEN>
import { chromium } from "playwright";
import { resolve } from "path";

const [file, token] = process.argv.slice(2);
if (!file || !token) { console.error("usage: <notebook.html> <LOPE-TOKEN>"); process.exit(2); }

const url = "file://" + resolve(file) +
  `#view=S100(@tomlarkworthy/claude-code-pairing,@tomlarkworthy/exporter-3)&cc=${token}`;

const status = (page) => page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/\b(connected|connecting|disconnected)\b/i);
  return { status: m ? m[1].toLowerCase() : "(none found)", hasWsError: /RuntimeError/.test(t) };
});

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(10000);
console.log("PARENT (file://):", JSON.stringify(await status(page)));

const popupP = ctx.waitForEvent("page", { timeout: 60000 });
await page.evaluate(() => [...document.querySelectorAll("button")]
  .find(b => b.textContent.trim() === "Fork")?.click());
const popup = await popupP;
await popup.waitForTimeout(14000);

console.log("FORK   (blob:null):", JSON.stringify(await status(popup)));
console.log("fork url:", (await popup.url()).slice(0, 46));

// Did the fork's websocket actually open? Ask the cell, not the DOM.
const live = await popup.evaluate(() => {
  const errs = [...document.querySelectorAll(".observablehq--error")]
    .map(n => n.textContent).filter(t => /cc_ws|sessionStorage/.test(t));
  return { ccWsErrors: errs.length, openSockets: typeof WebSocket !== "undefined" };
});
console.log("fork cc_ws:", JSON.stringify(live));

await browser.close();
