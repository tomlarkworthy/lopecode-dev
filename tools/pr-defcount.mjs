import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
p.on("console", (m) => { const t = m.text(); if (t.startsWith("DEFCOUNT")) console.log(t); });
p.goto("file:///tmp/pr-instrumented.html", { timeout: 0 }).catch(() => {});
await new Promise((r) => setTimeout(r, 20000));
await b.close();
process.exit(0);
