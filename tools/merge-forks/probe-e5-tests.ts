// Races each gated editor-5 test's promise in page, so a rejection is told apart from a hang
// (--run-tests reports a throwing test as a timeout).
// run: bun tools/merge-forks/probe-e5-tests.ts [notebook.html]
import { chromium } from "playwright";
import { resolve } from "node:path";
const NOTEBOOK = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_editor-5.html");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  const original = (window as any).Runtime; let captured = false;
  Object.defineProperty(window, "Runtime", { get: () => original, set(R: any) {
    const W = function (this: any, ...a: any[]) { const rt = new R(...a); if (!captured) { (window as any).__ojs_runtime = rt; captured = true; } return rt; };
    W.prototype = R.prototype; Object.assign(W, R); return W;
  } });
});
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/editor-5)&e5_tests`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(8000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const tests = [...rt._variables].filter((v: any) => /^test_(e5_|ui_ambiguous|ui_unknown)/.test(v._name ?? ""));
  return Promise.all(tests.map(async (v: any) => {
    if (!v._reachable) { v._observer = { fulfilled() {}, rejected() {}, pending() {} }; rt._dirty.add(v); rt._computeSoon?.(); }
    const r = await Promise.race([v._promise.then((x: any) => `fulfilled: ${String(x).slice(0, 200)}`, (e: any) => `rejected: ${e?.stack ?? e}`.slice(0, 900)), new Promise((res) => setTimeout(() => res("pending after 45s"), 45000))]);
    return `${v._name} [reachable ${v._reachable}] ${r}`;
  }));
});
console.log(out.join("\n\n"));
console.log("\npage errors:", errors.slice(0, 5));
await browser.close();
