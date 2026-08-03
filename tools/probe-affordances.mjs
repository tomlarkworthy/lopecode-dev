// Before documenting a gesture, check it exists in the notebook we actually ship: what is in the
// burger menu, which import wizards are registered, what the palette knows about.
import { chromium } from 'playwright';
import { resolve } from 'path';
const target = resolve(process.argv[2] || 'scratch/tpl-blog-tutorial.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 950 } });
await p.goto(`file://${target}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(16000);
const r = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const menu = (val('lp2MenuItems') || []).map((m) => `${m.id}: ${m.label}`);
  const wizards = (val('lp2_importWizards') || []).map((w) => w.id || w.label || String(w).slice(0, 40));
  const burger = document.querySelector('#lopepage-2 [class*=burger], #lopepage-2 button');
  return {
    menu, wizards,
    hasImportHost: !!val('lp2_import_host'),
    dropJob: val('lp2_import_drop') ?? null,
    burgerFound: !!burger,
    tabs: [...document.querySelectorAll('#lopepage-2 .lm_title, .lm_title')].map((e) => e.textContent.trim()),
  };
});
console.log(JSON.stringify(r, null, 1));
// open the burger and list what a user really sees
await p.evaluate(() => { const b = document.querySelector('#lopepage-2 button'); if (b) b.click(); });
await p.waitForTimeout(900);
await p.screenshot({ path: 'tools/screenshots/affordance-menu.png' });
const seen = await p.evaluate(() => [...document.querySelectorAll('[role=menuitem], .lp2-menu-item, [class*=menu] li, [class*=menu] button')]
  .map((e) => e.textContent.trim()).filter(Boolean).slice(0, 20));
console.log('menu as rendered:', JSON.stringify(seen));
await b.close();
