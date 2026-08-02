// Which editor-5 copy does the Observable page load, and what does its variableLink do?
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
await page.goto('https://observablehq.com/@tomlarkworthy/annotate', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));
console.log(await frame.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const g = (n) => ([...rt._variables].find((v) => v._name === n && v._module === home) || {})._value;
  await g('cellEditor')();
  const mod = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module !== home)._module;
  const vl = mod._scope.get('variableLink');
  const mods = await mod.value('modules').catch((e) => 'REJECTED ' + e);
  return [
    'variableLink definition:\n' + String(vl && vl._definition).slice(0, 600),
    'modules value: ' + (mods && mods.size !== undefined ? 'Map size ' + mods.size : String(mods).slice(0, 120))
  ].join('\n');
}));
await browser.close();
