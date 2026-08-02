#!/usr/bin/env bun
// Profile the coded-landmark detector against the frame bank, in a real browser
// but with no visible UI. Pulls the LIVE cell values out of the runtime so the
// numbers are the notebook's, not a transcription of it.
import { chromium } from "playwright";
import { resolve } from "path";
import { readFileSync } from "fs";

const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const probeFile = process.argv[2] ?? "scratch/rmbt/probe.js";
const probe = readFileSync(probeFile, "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); });
await page.goto(`file://${NB}#view=R100(S100(@tomlarkworthy/coded-landmark-tracking))`);
await page.waitForFunction(() => (globalThis as any).__ojs_runtime, null, { timeout: 60000 });

// resolve named cells of the part IV module to values
await page.waitForFunction(async () => {
  const rt = (globalThis as any).__ojs_runtime;
  const m = rt.mains?.get?.("@tomlarkworthy/coded-landmark-tracking");
  if (!m) return false;
  try { await m.value("LAYOUT"); return true; } catch { return false; }
}, null, { timeout: 60000 });

const out = await page.evaluate(async (src) => {
  const rt = (globalThis as any).__ojs_runtime;
  const m = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const get = (n: string) => m.value(n);
  const fn = new Function("get", "return (async () => {" + src + "})()");
  return await fn(get);
}, probe);

console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
await browser.close();
