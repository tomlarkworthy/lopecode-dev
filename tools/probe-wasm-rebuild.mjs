// The compiler moved out to @tomlarkworthy/assembly-script and is now reached
// lazily via `.value("toolchain")` past the button gate. Prove two things:
// nothing pulls it at boot, and pressing the button still compiles.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const wait = Number(process.argv[3] || 30000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(wait);

const atBoot = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mv = [...rt._variables].find((v) => v._name === 'module @tomlarkworthy/assembly-script');
  const rebuild = [...rt._variables].find((v) => v._name === 'wasmRebuild');
  return {
    assemblyScriptModuleBooted: !!mv?._value,   // must be false: booting it builds a 2.5MB attachment map
    wasmRebuildComputed: rebuild?._value !== undefined,
    wasmRebuildValue: rebuild?._value ?? null,  // null is the pre-gate value
  };
});

// press the button
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find((x) => x._name === 'viewof wasmRebuildGo');
  const el = v._value;
  const btn = el.tagName === 'BUTTON' ? el : el.querySelector('button');
  btn.click();
});
await page.waitForTimeout(60000);

const afterPress = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mv = [...rt._variables].find((v) => v._name === 'module @tomlarkworthy/assembly-script');
  const rebuild = [...rt._variables].find((v) => v._name === 'wasmRebuild');
  const r = rebuild?._value;
  return {
    assemblyScriptModuleBooted: !!mv?._value,
    error: rebuild?._error ? String(rebuild._error).slice(0, 300) : null,
    result: r && typeof r === 'object'
      ? { keys: Object.keys(r).slice(0, 10), identical: r.identical ?? null, builtBytes: r.built?.length ?? null, compileError: r.error ?? null }
      : r,
  };
});

console.log(JSON.stringify({ atBoot, afterPress }, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
