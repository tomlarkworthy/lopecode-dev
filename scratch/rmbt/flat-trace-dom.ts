import { chromium } from "playwright";
const URL = "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_flat-trace.html";
const browser = await chromium.launch({ headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(12000);
const out = await page.evaluate(() => {
  const cells = [...document.querySelectorAll("[cell]")].map((e) => ({
    cell: e.getAttribute("cell"),
    text: (e as HTMLElement).innerText.slice(0, 90).replace(/\n/g, " ⏎ "),
    tags: [...e.querySelectorAll("button,input,canvas,video")].map((n) => n.tagName + (n.getAttribute("type") || "")).join(",")
  }));
  const rt = (window as any).__ojs_runtime;
  return { count: cells.length, cells };
});
console.log(out.count, "cells with [cell]");
for (const c of out.cells) console.log(String(c.cell).padEnd(22), (c.tags || "-").padEnd(28), c.text);
await browser.close();
