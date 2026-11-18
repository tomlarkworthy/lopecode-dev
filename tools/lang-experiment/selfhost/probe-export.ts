// Headless: open a notebook and list the checker module's variables that are in error, and whether
// soundscript has a value. Run: bun selfhost/probe-export.ts <notebook.html>
import { chromium } from "../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto(`file://${process.argv[2]}`);
await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript")?._scope.get("ss_language")?._value, null, { timeout: 60000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 5000));
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = [...rt._variables].find((x: any) => x._name === "parser_lib")?._module;
  const vs = [...rt._variables].filter((v: any) => v._module === mod);
  return { vars: vs.length, soundscript: vs.find((v: any) => v._name === "soundscript")?._value !== undefined, anySoundscript: [...rt._variables].filter((x: any) => x._name === "soundscript").map((x: any) => [x._value !== undefined, x._reachable, String(x._error ?? "")]),
    errors: vs.filter((v: any) => v._error).slice(0, 8).map((v: any) => `${v._name}: ${String(v._error?.message ?? v._error).slice(0, 150)}`) };
}), null, 1));
console.log("page errors", errs.slice(0, 5));
await browser.close();
