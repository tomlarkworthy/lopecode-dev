// What names does shellTemplate carry, i.e. what does cloneViaSandbox hand the observer factory?
import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => !!(window as any).__ojs_runtime)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no runtime frame");
})();
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".observablehq").length);
  if (n === prev) break; prev = n; await p.waitForTimeout(1000);
}
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const find = (n: string) => [...rt._variables].find((v: any) =>
    (v._name === n || v._name === n.replace(/^(viewof|mutable) /, "$1$")) && v._value !== undefined);
  const names = (n: string) => {
    const v = find(n);
    return Array.isArray(v?._value) ? v._value.map((x: any) => x?._name ?? String(x).slice(0, 20)) : `not an array: ${typeof v?._value}`;
  };
  return { shellTemplate: names("shellTemplate"), editorTemplate: names("editorTemplate") };
}), null, 1));
await b.close();
