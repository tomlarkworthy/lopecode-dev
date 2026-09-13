// Runs one module's test_* cells in Chromium and prints each outcome. Every test is read with
// module.value(), which forces it, and raced against --timeout, so a rejection prints its stack
// instead of showing up as a timeout (lope-browser-runner --run-tests reports both as timeout).
//
// run: bun tools/merge-forks/run-suite.ts <notebook.html> --module <id> [--hash <fragment>] [--prefix test_] [--timeout 180000] [--wait 8000]
import { chromium } from "playwright";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (flag: string, fallback?: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const notebook = resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"))!);
const module = opt("--module")!;
const hash = opt("--hash", "")!.replace(/^#?/, "#");
const prefix = opt("--prefix", "test_")!;
const timeout = Number(opt("--timeout", "180000"));
const wait = Number(opt("--wait", "8000"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
const pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
await page.goto(`file://${notebook}${hash === "#" ? "" : hash}`, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction((m) => (window as any).__ojs_runtime?.mains?.get(m), module, { timeout: 60000 });
await page.waitForTimeout(wait);

const started = Date.now();
const results: [string, { state: string; value?: string; error?: string; ms: number }][] = await page.evaluate(async ({ module, prefix, timeout }) => {
  const rt = (window as any).__ojs_runtime;
  const m = rt.mains.get(module);
  const names = [...rt._variables].filter((v: any) => v._module === m && String(v._name).startsWith(prefix)).map((v: any) => v._name);
  const t0 = performance.now();
  return Promise.all(names.map(async (name: string) => {
    const outcome = await Promise.race([
      m.value(name).then((value: any) => ({ state: "ok", value: String(value) }), (e: any) => ({ state: "FAIL", error: String(e?.stack ?? e) })),
      new Promise((r) => setTimeout(() => r({ state: "PENDING" }), timeout))
    ]);
    return [name, { ...(outcome as any), ms: Math.round(performance.now() - t0) }];
  }));
}, { module, prefix, timeout });

for (const [name, r] of results) {
  console.log(`${r.state.padEnd(7)} ${name}  (${r.ms}ms)`);
  if (r.value) console.log(`        ${r.value}`);
  if (r.error) console.log(r.error.split("\n").slice(0, 40).map((l) => `        ${l}`).join("\n"));
}
const bad = results.filter(([, r]) => r.state !== "ok");
console.log(`\n${results.length - bad.length}/${results.length} ok in ${Math.round((Date.now() - started) / 1000)}s` + (pageErrors.length ? `; ${pageErrors.length} page errors: ${JSON.stringify([...new Set(pageErrors)].slice(0, 5))}` : ""));
await browser.close();
process.exit(bad.length ? 1 : 0);
