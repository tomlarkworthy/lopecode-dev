// Final proof-read: the reader's surface is the RENDERED page, not the md``
// bodies -- 21 occurrences of "mark" hid in htl figcaptions last round.
import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1400, height: 2400 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
for (let i = 0; i < 40; i++) { await page.evaluate((k) => window.scrollTo(0, k * 1100), i); await page.waitForTimeout(250); }
await page.waitForTimeout(15000);
const text = await page.evaluate(() => {
  const root = document.querySelector("#lopepage-2")!;
  const out: string[] = [];
  for (const cell of root.querySelectorAll(".observablehq")) {
    const name = cell.getAttribute("cell") || "";
    const bits: string[] = [];
    for (const el of cell.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,figcaption,aside,blockquote,summary,td")) {
      if (el.closest("pre,code,.cm-editor,svg")) continue;
      const t = (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && !bits.includes(t)) bits.push((el.tagName[0] === "H" ? "### " : "") + t);
    }
    if (bits.length) out.push(`\n@@ ${name}\n` + bits.join("\n"));
  }
  return out.join("\n");
});
await b.close();
writeFileSync("scratch/rmbt/prose-dump.txt", text);
console.log(`${text.split(/\s+/).length} words, ${text.split("@@").length - 1} cells; page errors: ${errs.length}`);
