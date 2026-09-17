import { chromium } from "playwright"; import { resolve } from "path";
const b = await chromium.launch({ args: ["--use-angle=metal","--enable-gpu","--ignore-gpu-blocklist"] });
const p = await (await b.newContext({ viewport: { width: Number(process.argv[2] ?? 1300), height: 1000 } })).newPage();
await p.goto("file://" + resolve("lopebooks/notebooks/@tomlarkworthy_suminagashi.html") + "#view=S100(@tomlarkworthy/suminagashi)");
await p.waitForSelector(".sumi-params", { timeout: 60000 }); await p.waitForTimeout(1500);
await (await p.$(".sumi-params"))!.screenshot({ path: "tools/scratch/sumi/params.png" }); await b.close();
