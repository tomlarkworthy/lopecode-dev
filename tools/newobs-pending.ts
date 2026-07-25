import { chromium } from "playwright";
const url = process.argv[2]!;
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 30000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return { error: "no runtime" };
  const vars = [...rt._variables];
  const modId = new Map<any, number>();
  let i = 0;
  for (const v of vars) if (!modId.has(v._module)) modId.set(v._module, i++);
  const st = (v: any) => v._error ? "ERR" : v._value !== undefined ? "ok" : v._reachable ? "PENDING" : "unreached";
  // every reachable, uncomputed, unerrored variable
  const pending = vars.filter((v: any) => v._reachable && v._value === undefined && !v._error);
  return {
    total: vars.length,
    pendingCount: pending.length,
    pending: pending.map((v: any) => ({
      m: modId.get(v._module),
      name: v._name,
      inputs: (v._inputs ?? []).map((d: any) => `${d._name}[${st(d)}]`),
    })),
  };
}), null, 1));
await browser.close();
