#!/usr/bin/env bun
// Regression: on a normal file:// origin the storage round-trip must still work after the fork fix.
import { chromium } from "playwright";
import { resolve } from "path";

const file = process.argv[2];
const url = "file://" + resolve(file) + "#view=S100(@tomlarkworthy/claude-code-pairing)";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(9000);

// syncEnabled must persist its checkbox state to localStorage
const r1 = await page.evaluate(() => {
  const cb = [...document.querySelectorAll('input[type="checkbox"]')]
    .find(b => /Sync enabled/i.test(b.closest("label")?.textContent ?? ""));
  if (!cb) return { err: "no Sync enabled checkbox" };
  const before = cb.checked;
  cb.click();
  const keys = Object.keys(window.localStorage).filter(k => /file-sync:syncEnabled/.test(k));
  return {
    before,
    after: cb.checked,
    persistedKeys: keys,
    persistedValue: keys.length ? window.localStorage.getItem(keys[0]) : null,
  };
});
console.log("syncEnabled persistence:", JSON.stringify(r1, null, 2));

// cc_ws must still write the pairing token to sessionStorage on connect
const r2 = await page.evaluate(() => {
  try {
    window.sessionStorage.setItem("lopecode_cc_token", "LOPE-9999-TEST");
    return { sessionStorageWritable: window.sessionStorage.getItem("lopecode_cc_token") };
  } catch (e) { return { sessionStorageWritable: "THREW: " + e.message }; }
});
console.log("sessionStorage on file://:", JSON.stringify(r2));

const errs = await page.evaluate(() =>
  [...document.querySelectorAll(".observablehq--error")]
    .map(n => n.textContent.trim().replace(/\s+/g, " ").slice(0, 140)));
console.log("parent DOM errors:", JSON.stringify(errs, null, 2));

await browser.close();
