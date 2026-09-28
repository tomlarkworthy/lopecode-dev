import { chromium } from "playwright";
const url = process.argv[2];
const b = await chromium.launch(); const page = await b.newPage();
const logs = []; page.on("console", m => logs.push(m.type() + ": " + m.text().slice(0, 200))); page.on("pageerror", e => logs.push("pageerror " + e));
await page.route(/bsky\.network|observablehq\.com|jsdelivr|esm\.sh|unpkg/, r => r.abort());
await page.goto(url);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session, null, { timeout: 120000 }); await page.waitForTimeout(3000);
const r = await page.evaluate(async () => {
  const rt = window.__ojs_runtime; const m = rt.mains.get("@user/pdf-demo");
  const v = [...rt._variables].find(v => v._module === m && v._name === "check");
  m.variable(true).define(["check"], x => x);
  try { return JSON.stringify(await Promise.race([v._promise, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 30000))])); } catch (e) { return "ERR " + String(e?.message ?? e); }
});
console.log(r); console.log(logs.filter(l => /worker|pdf|error/i.test(l)).slice(0, 15).join("\n"));
await b.close();
