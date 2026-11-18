// Headless: open a notebook as verify.ts open() does (wait for mains, then the spec tests), wait for the
// tutorial's half, then report each lookup neverRuns makes. Run: bun selfhost/probe-neverruns.ts <notebook.html>
import { chromium } from "../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto(`file://${process.argv[2]}`);
await page.evaluate(async (spec) => {
  const until = async (f: () => unknown, ms: number) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 50)); return f(); };
  const rt = () => (window as any).__ojs_runtime;
  if (!(await until(() => rt()?.mains?.size, 60000))) return;
  const m = rt().mains.get(spec);
  if (!m) return;
  const tests = [...rt()._variables].filter((v: any) => v._module === m && /^test_spec_/.test(v._name));
  await Promise.race([Promise.all(tests.map((t: any) => m.value(t._name).catch(() => 0))), new Promise((r) => setTimeout(r, 60000))]);
}, "@tomlarkworthy/soundscript-spec").catch(() => {});
await page.waitForFunction((t: string) => (window as any).__ojs_runtime?.mains?.get(t)?._scope.get("half")?._value !== undefined, "@tomlarkworthy/soundscript-tutorial", { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  return {
    mains: [...rt.mains.keys()],
    tutorial: !!rt.mains.get("@tomlarkworthy/soundscript-tutorial"),
    core: !!rt.mains.get("@tomlarkworthy/soundscript"),
    soundscriptWithValue: [...rt._variables].filter((x: any) => x._name === "soundscript" && x._value).length,
    soundscriptAll: [...rt._variables].filter((x: any) => x._name === "soundscript").map((x: any) => ({ value: x._value !== undefined, reachable: x._reachable, error: String(x._error?.message ?? "") })),
  };
}), null, 1));
await browser.close();
