// Which await inside compile_and_update throws variable_stale?
import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
for (let s = 0; s < 12; s++) { await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {}); await p.waitForTimeout(600); }
await frame.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".cm-editor").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}
console.log(JSON.stringify(await frame.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const out: any = { steps: [] };
  const step = async (label: string, fn: () => any) => {
    try { const v = await fn(); out.steps.push([label, "ok", typeof v === "object" ? JSON.stringify(v).slice(0, 220) : String(v).slice(0, 220)]); return v; }
    catch (e) { out.steps.push([label, "THREW", String(e).slice(0, 220)]); return undefined; }
  };
  const val = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._value !== undefined)?._value;
  const SRC = "title = md`# EDIT PROBE OK`";
  await step("globalThis.importShim", () => typeof (globalThis as any).importShim);
  await step("rt._global('importShim')", () => typeof rt._global("importShim"));
  await step("esms script tags", () => document.querySelectorAll('script[type="module-shim"],script[type="importmap-shim"]').length);
  const compiled = await step("compile(SRC)", () => val("compile")(SRC));
  await step("compiled defs", () => (compiled ?? []).map((v: any) => String(v._definition).replace(/\s+/g, " ").slice(0, 80)));
  await step("realize(defs)  [8s cap]", () => Promise.race([
    val("realize")((compiled ?? []).map((v: any) => v._definition), rt).then((f: any) => f.map((x: any) => typeof x)),
    new Promise((_, rj) => setTimeout(() => rj(new Error("HUNG >8s")), 8000)),
  ]));
  const tv = await step("title_variable", () => val("title_variable")?._name ?? null);
  const cell = await step("findCell(title_variable)", () => val("findCell")(val("title_variable")));
  await step("decompile(cell.variables)  [8s cap]", () => Promise.race([
    val("decompile")((cell as any).variables),
    new Promise((_, rj) => setTimeout(() => rj(new Error("HUNG >8s")), 8000)),
  ]));
  return out;
}), null, 1));
await b.close();
