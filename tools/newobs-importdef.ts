import { chromium } from "playwright";
const url = process.argv[2]!;
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 30000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const out: any[] = [];
  const seen = new Set<string>();
  for (const v of vars) {
    const src = String(v._definition ?? "");
    if (!src.includes("import(")) continue;
    const key = src.slice(0, 200);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name: v._name,
      inputs: (v._inputs ?? []).map((d: any) => d._name),
      def: src.slice(0, 400),
    });
  }
  return out;
}), null, 1));
await browser.close();
