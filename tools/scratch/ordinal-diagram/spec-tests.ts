// Reads the value of every test_* cell of the seed in a booted page (PAGE env, default the spec).
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { chromeOptions } from "../../lib/playwright-chrome.js";
const names = [...readFileSync("tools/scratch/spec/ordinal-diagram.src.ojs", "utf8").matchAll(/^(test_\w+) =/gm)].map((m) => m[1]);
const b = await chromium.launch({ headless: true, ...chromeOptions(chromium, { headless: true }) });
const p = await b.newPage();
await p.goto(`file://${process.cwd()}/${process.env.PAGE || "plan/specs/ordinal-diagram.html"}#view=S100(@spec/ordinal-diagram)`);
await p.waitForFunction(() => !!(window as any).__ojs_runtime?.mains?.get("@spec/ordinal-diagram"), null, { timeout: 60000 });
const r = await p.evaluate(async (names) => {
  const rt: any = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@spec/ordinal-diagram");
  return Promise.all(names.map((n: string) => mod.value(n).then(() => [n, "pass"], (e: any) => [n, "FAIL " + String(e?.message ?? e).slice(0, 120)])));
}, names);
for (const [n, s] of r) console.log(s.padEnd(5), n);
await b.close();
