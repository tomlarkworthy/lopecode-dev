import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, args: ["--disable-web-security"] });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + process.argv[2], { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(12000);
console.log(await p.evaluate(async () => {
  const rt: any = (window as any).__ojs_runtime;
  const find = (n: string) => [...rt._variables].find((v: any) => v._name === n);
  const math = await find("math")?._promise;
  const extract = await find("extract")?._promise;
  return {
    mathVersion: math?.version,
    extract: extract?.("(-1+1*(2+y+x))*-2 <= y"),
    extract2: extract?.("4x  + 6 (y + 4) 5 >= -6")
  };
}));
await b.close();
