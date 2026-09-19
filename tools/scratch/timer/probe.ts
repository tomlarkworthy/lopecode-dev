// bun tools/scratch/timer/probe.ts [--wait ms] [--out prefix] [--flip ms] [--eval js] [--w px] [--shots n]
import { chromium } from "playwright";
import { resolve } from "node:path";
const arg = (n: string, d?: string) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const out = arg("--out", "tools/scratch/timer/shot")!;
const wait = Number(arg("--wait", "8000"));
const shots = Number(arg("--shots", "1"));
const url = "file://" + resolve(arg("--file", "lopebooks/notebooks/@tomlarkworthy_liquid-timer.html")!) + arg("--hash", "#view=S100(@tomlarkworthy/liquid-timer)");
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const c = await b.newContext({ viewport: { width: Number(arg("--w", "900")), height: 1000 }, deviceScaleFactor: Number(arg("--dpr", "1")) });
const p = await c.newPage();
const logs: string[] = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text().slice(0, 200)); });
p.on("pageerror", (e) => logs.push("pageerror: " + String(e).slice(0, 200)));
await p.goto(url);
await p.waitForSelector("canvas", { timeout: 60000 });
const flip = arg("--flip");
if (flip) { await p.waitForTimeout(Number(flip)); await p.locator("button", { hasText: /^flip$/ }).click(); }
for (let i = 0; i < shots; i++) {
  await p.waitForTimeout(wait / shots);
  const el = await p.$("canvas");
  const stage = await el!.evaluateHandle((c) => c.parentElement!.parentElement!);
  await (stage as any).screenshot({ path: `${out}-${i}.png` });
}
const info = await p.evaluate(async () => {
  const errs = [...document.querySelectorAll(".observablehq--error")].map((e) => e.textContent!.slice(0, 300));
  let n = 0; const t0 = performance.now();
  await new Promise<void>((r) => { const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
  return { errs, fps: n / 2 };
});
console.log(JSON.stringify({ ...info, logs: logs.filter((l) => !/@import|font/.test(l)).slice(0, 10) }, null, 1));
const evalJs = arg("--eval");
if (evalJs) console.log(JSON.stringify(await p.evaluate(evalJs)));
await p.screenshot({ path: `${out}-page.png`, fullPage: false });
await b.close();
