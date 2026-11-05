import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: '/Users/tom.larkworthy/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell' }); const p = await b.newPage();
for (const n of ["open", "folded"]) { await p.goto("file://" + process.cwd() + "/tools/scratch/ordinal-diagram/" + n + ".svg"); await p.screenshot({ path: "tools/scratch/ordinal-diagram/" + n + ".png", fullPage: true }); }
await b.close();
